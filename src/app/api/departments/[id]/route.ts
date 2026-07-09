import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, departmentsTable } from "@/db";
import { requireAdmin, logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  const [deleted] = await db.delete(departmentsTable).where(eq(departmentsTable.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  await logAudit({ id: admin.id, name: admin.name }, "department.delete", deleted.name);
  return new NextResponse(null, { status: 204 });
}
