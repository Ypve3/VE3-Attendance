import { NextRequest, NextResponse } from "next/server";
import { generateExportFiles } from "@/lib/excelExport";
import { getRequester, logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getRequester(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await generateExportFiles();
  await logAudit({ id: user.id, name: user.name }, "export.generate", `${result.xlsx} + ${result.csv}`);

  const now = new Date().toISOString();
  return NextResponse.json({
    xlsx: { filename: result.xlsx, format: "xlsx", generatedAt: now, url: `/api/attendance/exports/${result.xlsx}`, recordCount: result.recordCount },
    csv: { filename: result.csv, format: "csv", generatedAt: now, url: `/api/attendance/exports/${result.csv}`, recordCount: result.recordCount },
  });
}
