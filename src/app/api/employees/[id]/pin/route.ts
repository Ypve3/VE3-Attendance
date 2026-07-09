import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, employeesTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const parsed = z.object({ pin: z.string().regex(/^\d{4,6}$/) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });

  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  const [updated] = await db.update(employeesTable).set({ pinHash }).where(eq(employeesTable.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  await logAudit({ id: user.id, name: user.name }, "employee.pin_set", updated.name);
  return NextResponse.json({ ok: true });
}
