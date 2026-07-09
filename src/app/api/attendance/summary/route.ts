import { NextRequest, NextResponse } from "next/server";
import { and, gte, lte, eq } from "drizzle-orm";
import { db, attendanceTable, employeesTable, departmentsTable } from "@/db";
import { getRequester } from "@/lib/audit";

/** Working days = Mon-Fri within the month, capped at today for the current month. */
function workingDaysIn(year: number, month: number): number {
  const now = new Date();
  const last = new Date(year, month, 0).getDate();
  const cap =
    year === now.getFullYear() && month === now.getMonth() + 1 ? Math.min(last, now.getDate()) : last;
  let count = 0;
  for (let d = 1; d <= cap; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthParam = req.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: "month=YYYY-MM is required" }, { status: 400 });
  }
  const [year, month] = monthParam.split("-").map(Number);
  const first = `${monthParam}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const last = `${monthParam}-${String(lastDay).padStart(2, "0")}`;

  const employees = await db
    .select({ id: employeesTable.id, name: employeesTable.name, departmentName: departmentsTable.name })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .orderBy(employeesTable.name);

  const rows = await db
    .select({ employeeId: attendanceTable.employeeId, status: attendanceTable.status })
    .from(attendanceTable)
    .where(and(gte(attendanceTable.date, first), lte(attendanceTable.date, last)));

  const workingDays = workingDaysIn(year, month);
  const byEmployee = new Map<number, { present: number; late: number }>();
  for (const r of rows) {
    const agg = byEmployee.get(r.employeeId) ?? { present: 0, late: 0 };
    agg.present++;
    if (r.status === "Late") agg.late++;
    byEmployee.set(r.employeeId, agg);
  }

  return NextResponse.json(
    employees.map((e) => {
      const agg = byEmployee.get(e.id) ?? { present: 0, late: 0 };
      return {
        employeeId: e.id,
        employeeName: e.name,
        departmentName: e.departmentName ?? null,
        presentDays: agg.present,
        lateDays: agg.late,
        workingDays,
        absentDays: Math.max(0, workingDays - agg.present),
      };
    })
  );
}
