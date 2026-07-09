import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, exportsTable } from "@/db";
import { getRequester } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(exportsTable).orderBy(desc(exportsTable.generatedAt));
  return NextResponse.json(
    rows.map((e) => ({
      filename: e.filename,
      format: e.format,
      generatedAt: e.generatedAt.toISOString(),
      url: `/api/attendance/exports/${e.filename}`,
      recordCount: e.recordCount,
    }))
  );
}
