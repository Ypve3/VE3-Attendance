import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const [deleted] = await db.delete(attendanceTable).where(eq(attendanceTable.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, deleted.employeeId));
  await logAudit({ id: user.id, name: user.name }, "attendance.delete", `${emp?.name ?? "?"} on ${deleted.date}`);
  return new NextResponse(null, { status: 204 });
}
