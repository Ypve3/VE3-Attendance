import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, visitorsTable } from "@/db";
import { getRequester, logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const [deleted] = await db.delete(visitorsTable).where(eq(visitorsTable.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Visitor record not found" }, { status: 404 });

  await logAudit({ id: user.id, name: user.name }, "visitor.delete", `${deleted.name} on ${deleted.visitDate}`);
  return new NextResponse(null, { status: 204 });
}
