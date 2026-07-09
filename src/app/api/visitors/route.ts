import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, visitorsTable } from "@/db";
import { getRequester } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const records = date
    ? await db.select().from(visitorsTable).where(eq(visitorsTable.visitDate, date)).orderBy(desc(visitorsTable.checkInTime))
    : await db.select().from(visitorsTable).orderBy(desc(visitorsTable.checkInTime));

  return NextResponse.json(records.map((v) => ({ ...v, checkInTime: v.checkInTime.toISOString() })));
}
