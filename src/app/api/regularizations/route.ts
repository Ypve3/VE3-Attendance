import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db, regularizationsTable, employeesTable, attendanceTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: regularizationsTable.id,
      employeeId: regularizationsTable.employeeId,
      employeeName: employeesTable.name,
      date: regularizationsTable.date,
      reason: regularizationsTable.reason,
      status: regularizationsTable.status,
      requestedByName: regularizationsTable.requestedByName,
      reviewedByName: regularizationsTable.reviewedByName,
      createdAt: regularizationsTable.createdAt,
    })
    .from(regularizationsTable)
    .innerJoin(employeesTable, eq(regularizationsTable.employeeId, employeesTable.id))
    .orderBy(desc(regularizationsTable.createdAt));

  return NextResponse.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

const CreateBody = z.object({
  employeeId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  // Don't allow a request for a day that already has attendance
  const existing = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, parsed.data.employeeId), eq(attendanceTable.date, parsed.data.date)));
  if (existing.length > 0) {
    return NextResponse.json({ error: "Attendance already exists for that day" }, { status: 409 });
  }

  const [row] = await db
    .insert(regularizationsTable)
    .values({
      employeeId: parsed.data.employeeId,
      date: parsed.data.date,
      reason: parsed.data.reason.trim(),
      requestedById: user.id,
      requestedByName: user.name,
    })
    .returning();

  await logAudit({ id: user.id, name: user.name }, "regularization.request", `employee #${row.employeeId} for ${row.date}`);

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, row.employeeId));
  return NextResponse.json(
    { ...row, employeeName: emp?.name ?? "", createdAt: row.createdAt.toISOString() },
    { status: 201 }
  );
}
