"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { api, type MonthlySummaryRow } from "@/lib/api";
import { Card, Badge } from "@/components/ui/card";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<MonthlySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMonthlySummary(month).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monthly Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-employee attendance summary — working days are Mon–Fri.</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-left text-gray-500">
              <tr>
                <th className="h-10 px-4">Employee</th>
                <th className="h-10 px-4">Department</th>
                <th className="h-10 px-4">Present</th>
                <th className="h-10 px-4">Late</th>
                <th className="h-10 px-4">Absent</th>
                <th className="h-10 px-4 w-52">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="h-24 text-center text-gray-400">Loading…</td></tr>
              ) : rows.length > 0 ? (
                rows.map((r) => {
                  const pct = r.workingDays > 0 ? Math.round((r.presentDays / r.workingDays) * 100) : 0;
                  return (
                    <tr key={r.employeeId} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="p-4 font-medium">{r.employeeName}</td>
                      <td className="p-4">
                        {r.departmentName ? <Badge variant="secondary">{r.departmentName}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="p-4 font-semibold text-green-600">
                        {r.presentDays}<span className="text-gray-400 font-normal">/{r.workingDays}</span>
                      </td>
                      <td className="p-4 text-amber-600 font-medium">{r.lateDays}</td>
                      <td className="p-4 text-orange-500 font-medium">{r.absentDays}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#4a85d1] to-brand transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                      <p>No data for this month.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
