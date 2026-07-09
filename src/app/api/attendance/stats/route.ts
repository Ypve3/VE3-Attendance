import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@/db";
import { getRequester } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const allEmployees = await db.select().from(employeesTable);
  const todayRows = await db.select().from(attendanceTable).where(eq(attendanceTable.date, today));

  const total = allEmployees.length;
  const checkedIn = todayRows.length;
  const late = todayRows.filter((r) => r.status === "Late").length;

  return NextResponse.json({
    totalEmployees: total,
    presentToday: checkedIn,
    lateToday: late,
    absentToday: Math.max(0, total - checkedIn),
    date: today,
    faceRegistered: allEmployees.filter((e) => e.faceDescriptor != null).length,
  });
}
