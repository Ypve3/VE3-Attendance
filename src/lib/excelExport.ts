import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { desc, eq } from "drizzle-orm";
import { db, attendanceTable, employeesTable, exportsTable } from "@/db";
import { notifyWebhook } from "./webhook";

export function getExportsDir(): string {
  const dir = path.resolve(process.cwd(), "exports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function fetchRows() {
  return db
    .select({
      employeeName: employeesTable.name,
      status: attendanceTable.status,
      method: attendanceTable.method,
      checkInTime: attendanceTable.checkInTime,
      date: attendanceTable.date,
    })
    .from(attendanceTable)
    .innerJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .orderBy(desc(attendanceTable.checkInTime));
}

function timestampSlug() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
}

export async function generateExportFiles(opts?: { notify?: boolean }): Promise<{
  xlsx: string;
  csv: string;
  recordCount: number;
}> {
  const exportsDir = getExportsDir();
  const records = await fetchRows();
  const slug = timestampSlug();

  const rows = records.map((r) => ({
    "Employee Name": r.employeeName,
    "Attendance Status": r.status,
    "Method": r.method,
    "Check-in Time": new Date(r.checkInTime).toLocaleString(),
    Date: r.date,
  }));

  // XLSX
  const xlsxName = `attendance_${slug}.xlsx`;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 12 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
  const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  fs.writeFileSync(path.join(exportsDir, xlsxName), xlsxBuffer);

  // CSV
  const csvName = `attendance_${slug}.csv`;
  const headers = ["Employee Name", "Attendance Status", "Method", "Check-in Time", "Date"];
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [r["Employee Name"], r["Attendance Status"], r["Method"], r["Check-in Time"], r["Date"]]
        .map((v) => escape(String(v)))
        .join(",")
    ),
  ];
  fs.writeFileSync(path.join(exportsDir, csvName), "\uFEFF" + csvLines.join("\n"), "utf8");

  await db.insert(exportsTable).values([
    { filename: xlsxName, format: "xlsx", recordCount: records.length },
    { filename: csvName, format: "csv", recordCount: records.length },
  ]);

  if (opts?.notify) {
    await notifyWebhook(
      `📊 StaffX export generated: ${xlsxName} + ${csvName} (${records.length} records)`
    );
  }

  return { xlsx: xlsxName, csv: csvName, recordCount: records.length };
}
