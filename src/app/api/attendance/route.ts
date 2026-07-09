import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@/db";
import { getRequester } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? undefined;

  const base = db
    .select({
      id: attendanceTable.id,
      employeeId: attendanceTable.employeeId,
      employeeName: employeesTable.name,
      status: attendanceTable.status,
      method: attendanceTable.method,
      matchConfidence: attendanceTable.matchConfidence,
      checkInTime: attendanceTable.checkInTime,
      date: attendanceTable.date,
    })
    .from(attendanceTable)
    .innerJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id));

  const records = date
    ? await base.where(eq(attendanceTable.date, date)).orderBy(desc(attendanceTable.checkInTime))
    : await base.orderBy(desc(attendanceTable.checkInTime));

  return NextResponse.json(
    records.map((r) => ({ ...r, checkInTime: r.checkInTime.toISOString(), matchConfidence: r.matchConfidence ?? null }))
  );
}
