"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, CalendarClock, Check, X, ChevronDown, MessageSquare, UserRound } from "lucide-react";
import { api, type Regularization, type Employee } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";

export default function RegularizationsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Regularization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("attendance_user");
    if (raw) {
      try { setIsAdmin(JSON.parse(raw).role === "admin"); } catch {}
    }
  }, []);

  const load = async () => {
    const [r, e] = await Promise.all([api.listRegularizations(), api.listEmployees()]);
    setRequests(r);
    setEmployees(e);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !date || reason.trim().length < 3) return;
    setSaving(true);
    try {
      await api.createRegularization({ employeeId: Number(employeeId), date, reason: reason.trim() });
      toast({ title: "Request Submitted", description: "An admin will review it." });
      setEmployeeId(""); setDate(""); setReason("");
      setIsAddOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: number, decision: "approved" | "rejected") => {
    try {
      await api.reviewRegularization(id, decision);
      toast({
        title: decision === "approved" ? "Approved" : "Rejected",
        description: decision === "approved" ? "Attendance record created for that day." : "The request has been rejected.",
      });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  const statusBadge = (s: string) =>
    s === "approved" ? <Badge variant="success">Approved</Badge>
    : s === "rejected" ? <Badge variant="warning">Rejected</Badge>
    : <Badge variant="secondary">Pending</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance Regularization</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Forgot to check in? Submit a request — approved requests create the attendance record automatically.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-left text-gray-500">
              <tr>
                <th className="h-10 px-4">Employee</th>
                <th className="h-10 px-4">Date</th>
                <th className="h-10 px-4">Reason</th>
                <th className="h-10 px-4">Requested By</th>
                <th className="h-10 px-4">Status</th>
                {isAdmin && <th className="h-10 px-4 text-right">Review</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                  >
                    <td className="p-4 font-medium">{r.employeeName}</td>
                    <td className="p-4 font-mono text-xs">{format(new Date(r.date), "MMM d, yyyy")}</td>
                    <td className="p-4 text-gray-500 max-w-xs truncate">{r.reason}</td>
                    <td className="p-4 text-gray-400 text-xs">{r.requestedByName ?? "—"}</td>
                    <td className="p-4">
                      {statusBadge(r.status)}
                      {r.reviewedByName && (
                        <p className="text-[10px] text-gray-400 mt-1">by {r.reviewedByName}</p>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReview(r.id, "approved")}
                              className="p-1.5 rounded-md text-green-600 bg-green-50 hover:bg-green-100"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReview(r.id, "rejected")}
                              className="p-1.5 rounded-md text-red-500 bg-red-50 hover:bg-red-100"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="h-28 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <CalendarClock className="h-7 w-7 mb-2 opacity-40" />
                      <p className="text-sm">No regularization requests.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="h-1.5 bg-gradient-to-r from-[#4a85d1] via-brand to-[#2d5a94]" />
            <form onSubmit={handleAdd}>
              <div className="px-6 pt-6 pb-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Regularization Request</h2>
                  <p className="text-sm text-gray-500 mt-0.5">For a day where check-in was missed.</p>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-3.5">
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : "")}
                    required
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white pl-10 pr-9 text-sm outline-none appearance-none transition-colors focus:border-brand focus:ring-4 focus:ring-brand/10"
                  >
                    <option value="">Select employee…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <input
                  type="date"
                  value={date}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-4 text-sm outline-none transition-colors focus:border-brand focus:ring-4 focus:ring-brand/10"
                />

                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <textarea
                    placeholder="Reason (e.g. Forgot to scan, was in the office all day)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    minLength={3}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white pl-10 pr-4 py-3 text-sm outline-none transition-colors focus:border-brand focus:ring-4 focus:ring-brand/10 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!employeeId || !date || reason.trim().length < 3 || saving}>
                  {saving ? "Submitting…" : (<><Plus className="w-4 h-4 mr-1" />Submit Request</>)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
