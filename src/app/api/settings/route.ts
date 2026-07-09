import { NextRequest, NextResponse } from "next/server";
import { db, settingsTable } from "@/db";
import { requireAdmin, getRequester, logAudit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(settingsTable);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  if (!out.late_cutoff) out.late_cutoff = "09:30";
  return NextResponse.json(out);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const values = (await req.json()) as Record<string, string>;
  const allowed = ["late_cutoff"];
  for (const key of allowed) {
    if (values[key] !== undefined) {
      if (key === "late_cutoff" && !/^\d{1,2}:\d{2}$/.test(values[key])) {
        return NextResponse.json({ error: "late_cutoff must be in HH:MM format" }, { status: 400 });
      }
      await setSetting(key, values[key]);
    }
  }
  await logAudit({ id: admin.id, name: admin.name }, "settings.update", JSON.stringify(values));

  const rows = await db.select().from(settingsTable);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return NextResponse.json(out);
}
