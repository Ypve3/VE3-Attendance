import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, attendanceTable, employeesTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";
import { statusForCheckIn } from "@/lib/settings";

const CheckInBody = z.object({
  employeeId: z.number(),
  matchConfidence: z.number().optional(),
  method: z.enum(["manual", "face", "pin"]).optional(),
  pin: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CheckInBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const method = parsed.data.method ?? "manual";

  // PIN fallback: verify against stored hash
  if (method === "pin") {
    if (!employee.pinHash) return NextResponse.json({ error: "No PIN set for this employee" }, { status: 400 });
    if (!parsed.data.pin || !(await bcrypt.compare(parsed.data.pin, employee.pinHash))) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const existing = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, employee.id), eq(attendanceTable.date, today)));
  if (existing.length > 0) return NextResponse.json({ error: "Already checked in today" }, { status: 409 });

  const status = await statusForCheckIn(now);

  const [record] = await db
    .insert(attendanceTable)
    .values({
      employeeId: employee.id,
      status,
      method,
      matchConfidence: parsed.data.matchConfidence ?? null,
      date: today,
    })
    .returning();

  if (method === "manual") {
    await logAudit({ id: user.id, name: user.name }, "attendance.manual_checkin", `${employee.name} (${status})`);
  }

  return NextResponse.json(
    {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: employee.name,
      status: record.status,
      method: record.method,
      matchConfidence: record.matchConfidence ?? null,
      checkInTime: record.checkInTime.toISOString(),
      date: record.date,
    },
    { status: 201 }
  );
}
