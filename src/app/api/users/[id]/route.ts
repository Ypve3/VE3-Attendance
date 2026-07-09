import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@/db";
import { requireAdmin, logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (id === admin.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await logAudit({ id: admin.id, name: admin.name }, "user.delete", `${deleted.name} <${deleted.email}>`);
  return new NextResponse(null, { status: 204 });
}
