import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, auditLogsTable } from "@/db";
import { requireAdmin } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(500);
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      actorName: r.actorName,
      action: r.action,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
