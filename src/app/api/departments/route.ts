import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, departmentsTable } from "@/db";
import { getRequester, requireAdmin, logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  return NextResponse.json(rows.map((d) => ({ id: d.id, name: d.name })));
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ name: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const [dept] = await db.insert(departmentsTable).values({ name: parsed.data.name.trim() }).returning();
    await logAudit({ id: admin.id, name: admin.name }, "department.create", dept.name);
    return NextResponse.json({ id: dept.id, name: dept.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A department with that name already exists" }, { status: 409 });
  }
}
