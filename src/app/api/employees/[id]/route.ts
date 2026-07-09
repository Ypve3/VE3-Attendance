import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [deleted] = await db.delete(employeesTable).where(eq(employeesTable.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  await logAudit({ id: user.id, name: user.name }, "employee.delete", deleted.name);
  return new NextResponse(null, { status: 204 });
}
