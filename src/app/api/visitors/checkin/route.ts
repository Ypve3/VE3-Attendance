import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, visitorsTable } from "@/db";
import { getRequester } from "@/lib/audit";

const VisitorCheckInBody = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  companyName: z.string().optional(),
  hostName: z.string().optional(),
  signature: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = VisitorCheckInBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  const [record] = await db
    .insert(visitorsTable)
    .values({
      name: parsed.data.name.trim(),
      purpose: parsed.data.purpose?.trim() || null,
      companyName: parsed.data.companyName?.trim() || null,
      hostName: parsed.data.hostName?.trim() || null,
      signature: parsed.data.signature || null,
      visitDate: today,
    })
    .returning();

  return NextResponse.json({ ...record, checkInTime: record.checkInTime.toISOString() }, { status: 201 });
}
