"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, Calendar as CalendarIcon, Filter, X, FileSpreadsheet, RefreshCw, Download, Search } from "lucide-react";
import { api, type AttendanceRecord, type ExportFile } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, Badge } from "@/components/ui/card";

export default function RecordsPage() {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [exports, setExports] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const [r, ex] = await Promise.all([api.listAttendance(dateFilter || undefined), api.listExports()]);
    setRecords(r);
    setExports(ex);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this attendance record?")) return;
    try {
      await api.deleteAttendance(id);
      toast({ title: "Record Deleted", description: "The attendance record has been removed." });
      await load();
    } catch {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generateExport();
      toast({ title: "Exports Generated", description: `${data.xlsx.filename} and ${data.csv.filename} are ready.` });
      await load();
    } catch {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  const visible = records.filter((r) =>
    r.employeeName.toLowerCase().includes(nameFilter.toLowerCase())
  );

  const dayGroups = Object.entries(
    records.reduce<Record<string, number>>((acc, r) => {
      acc[r.date] = (acc[r.date] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="space-y-8">
      {!dateFilter && dayGroups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayGroups.slice(0, 14).map(([date, count]) => (
            <button
              key={date}
              onClick={() => setDateFilter(date)}
              className="flex-shrink-0 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-left hover:border-brand/40 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-semibold text-gray-800">{format(new Date(date), "MMM d, yyyy")}</p>
              <p className="text-[11px] text-brand font-medium">{count} check-in{count !== 1 ? "s" : ""}</p>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance Records</h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage daily check-ins.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-44">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Filter by name…" className="pl-9" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
            </div>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input type="date" className="pl-10 w-44" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>
            {dateFilter && (
              <Button variant="ghost" size="icon" onClick={() => setDateFilter("")} title="Clear date filter">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-left text-gray-500">
                <tr>
                  <th className="h-10 px-4">Date</th>
                  <th className="h-10 px-4">Employee</th>
                  <th className="h-10 px-4">Time</th>
                  <th className="h-10 px-4">Status</th>
                  <th className="h-10 px-4">Method</th>
                  <th className="h-10 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length > 0 ? (
                  visible.map((record) => (
                    <tr key={record.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="p-4 font-mono text-xs">{format(new Date(record.date), "MMM d, yyyy")}</td>
                      <td className="p-4 font-medium">{record.employeeName}</td>
                      <td className="p-4 font-mono text-xs text-gray-500">{format(new Date(record.checkInTime), "h:mm a")}</td>
                      <td className="p-4">
                        {record.status === "Late" ? (
                          <Badge variant="warning">Late</Badge>
                        ) : (
                          <Badge variant="success">Present</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize">{record.method}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="h-32 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <Filter className="h-8 w-8 mb-2 opacity-50" />
                        <p>No attendance records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Exports</h2>
            <p className="text-gray-500 text-sm mt-1">Excel + CSV, generated every 2 hours automatically or on demand.</p>
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            {generating ? "Generating..." : "Generate Export"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exports.length > 0 ? (
            exports.map((file) => (
              <Card key={file.filename}>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-mono text-xs truncate flex-1">{file.filename}</p>
                    <Badge variant={file.format === "csv" ? "secondary" : "default"} className="ml-2 uppercase text-[9px]">
                      {file.format}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{format(new Date(file.generatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs font-medium bg-gray-100 px-2.5 py-1 rounded-md">{file.recordCount} rows</div>
                    <a href={file.url} download>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1.5" />
                        Download
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-10 text-center border rounded-2xl border-dashed">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No exports yet — generate one above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
