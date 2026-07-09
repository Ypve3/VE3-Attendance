import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, employeesTable, departmentsTable } from "@/db";
import { getRequester } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: employeesTable.id,
      name: employeesTable.name,
      departmentName: departmentsTable.name,
      faceDescriptor: employeesTable.faceDescriptor,
    })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .orderBy(employeesTable.name);

  const profiles = rows
    .filter((e) => e.faceDescriptor != null)
    .map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      departmentName: e.departmentName ?? null,
      descriptor: e.faceDescriptor as number[],
    }));

  return NextResponse.json(profiles);
}
