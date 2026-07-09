"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Search, CheckCircle2, UserCheck, Users, Clock, TrendingUp, AlarmClock, Radio } from "lucide-react";
import { api, type Employee, type AttendanceRecord, type AttendanceStats } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, Badge } from "@/components/ui/card";

const today = new Date().toISOString().split("T")[0];
const POLL_MS = 5000;

export default function Home() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e, r] = await Promise.all([api.getStats(), api.listEmployees(), api.listAttendance(today)]);
      setStats(s);
      setEmployees(e);
      setTodayRecords(r);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live dashboard: poll every 5s
  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const checkedInIds = new Set(todayRecords.map((r) => r.employeeId));
  const attendanceRate =
    stats && stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0;
  const absentEmployees = employees.filter((e) => !checkedInIds.has(e.id));
  const recentCheckIns = todayRecords.slice(0, 6);
  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.departmentName && e.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCheckIn = async () => {
    if (!selectedId) return;
    const employee = employees.find((e) => e.id === selectedId);
    if (!employee) return;
    setCheckingIn(true);
    try {
      const rec = await api.checkIn({ employeeId: selectedId });
      toast({ title: `Marked ${rec.status}`, description: `${employee.name} checked in at ${format(new Date(rec.checkInTime), "h:mm a")}.` });
      setSelectedId(null);
      setSearchTerm("");
      await load();
    } catch (err: any) {
      toast({ title: "Check-in Failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today's Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Radio className="w-3.5 h-3.5 text-green-500 animate-pulse" />
          Live — refreshes every 5s
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Checked in</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">{stats?.presentToday ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-brand/10">
              <UserCheck className="w-5 h-5 text-brand" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Late</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">{stats?.lateToday ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50">
              <AlarmClock className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Absent</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">{stats?.absentToday ?? 0}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-50">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rate</p>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{attendanceRate}%</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#4a85d1] to-brand transition-all duration-700" style={{ width: `${attendanceRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Mark Attendance</h2>
              <p className="text-sm text-gray-400 mt-0.5">Search and select an employee to check in manually</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or department…"
                className="pl-9 bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const isSelected = selectedId === employee.id;
                  const isCheckedIn = checkedInIds.has(employee.id);
                  return (
                    <button
                      key={employee.id}
                      disabled={isCheckedIn || checkingIn}
                      onClick={() => setSelectedId(isSelected ? null : employee.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-brand bg-brand/5 shadow-sm shadow-brand/10"
                          : isCheckedIn
                          ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                          : "border-gray-100 bg-white hover:border-brand/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {employee.photo ? (
                          <img src={employee.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCheckedIn ? "bg-green-100 text-green-600" : "bg-brand/10 text-brand"
                            }`}
                          >
                            {employee.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{employee.name}</p>
                          <p className="text-xs text-gray-400">{employee.departmentName || "—"}</p>
                        </div>
                      </div>
                      {isCheckedIn && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">No employees found</div>
              )}
            </div>

            <Button className="w-full" disabled={!selectedId || checkingIn} onClick={handleCheckIn}>
              {checkingIn ? "Marking…" : "Mark Attendance"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800">Recent Check-ins</h3>
              </div>
              {recentCheckIns.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No check-ins yet today</p>
              ) : (
                <div className="space-y-2.5">
                  {recentCheckIns.map((r) => (
                    <div key={r.id} className="flex items-center justify-between animate-fade-up">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-brand/10 text-brand flex-shrink-0">
                          {r.employeeName.charAt(0)}
                        </div>
                        <p className="text-xs font-medium text-gray-700 truncate">{r.employeeName}</p>
                        {r.status === "Late" && <Badge variant="warning" className="text-[9px] px-1.5 py-0">Late</Badge>}
                      </div>
                      <p className="text-[10px] font-mono text-gray-400 flex-shrink-0 ml-2">
                        {format(new Date(r.checkInTime), "h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Not In Yet</h3>
                {absentEmployees.length > 0 && (
                  <Badge variant="warning">{absentEmployees.length}</Badge>
                )}
              </div>
              {absentEmployees.length === 0 ? (
                <div className="flex flex-col items-center py-4 gap-1.5">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <p className="text-xs text-gray-400">Everyone is in!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {absentEmployees.map((e) => (
                    <div key={e.id} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                      <p className="text-xs text-gray-600 truncate">{e.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
