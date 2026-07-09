import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, employeesTable, departmentsTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

const ImportBody = z.object({
  rows: z.array(z.object({ name: z.string(), department: z.string().optional() })).max(1000),
});

export async function POST(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ImportBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  let created = 0;
  let skipped = 0;

  for (const row of parsed.data.rows) {
    const name = row.name?.trim();
    if (!name) { skipped++; continue; }

    let departmentId: number | null = null;
    const deptName = row.department?.trim();
    if (deptName) {
      const [existing] = await db.select().from(departmentsTable).where(eq(departmentsTable.name, deptName));
      if (existing) {
        departmentId = existing.id;
      } else {
        const [dept] = await db.insert(departmentsTable).values({ name: deptName }).returning();
        departmentId = dept.id;
      }
    }

    await db.insert(employeesTable).values({ name, departmentId });
    created++;
  }

  await logAudit({ id: user.id, name: user.name }, "employee.bulk_import", `${created} created, ${skipped} skipped`);
  return NextResponse.json({ created, skipped });
}
