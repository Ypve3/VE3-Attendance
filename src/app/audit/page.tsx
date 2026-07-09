"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { History } from "lucide-react";
import { api, type AuditLog } from "@/lib/api";
import { Card, Badge } from "@/components/ui/card";

const ACTION_COLORS: Record<string, "default" | "secondary" | "success" | "warning"> = {
  "auth.login": "secondary",
  "user.create": "success",
  "user.delete": "warning",
  "employee.create": "success",
  "employee.delete": "warning",
  "employee.biometric_delete": "warning",
  "attendance.delete": "warning",
  "regularization.approved": "success",
  "regularization.rejected": "warning",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listAudit()
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Who did what, and when — the most recent 500 events.</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-left text-gray-500">
            <tr>
              <th className="h-10 px-4">When</th>
              <th className="h-10 px-4">Who</th>
              <th className="h-10 px-4">Action</th>
              <th className="h-10 px-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                  <td className="p-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, h:mm:ss a")}
                  </td>
                  <td className="p-3.5 font-medium">{log.actorName ?? "system"}</td>
                  <td className="p-3.5">
                    <Badge variant={ACTION_COLORS[log.action] ?? "secondary"} className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-gray-500 text-xs">{log.details ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="h-28 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <History className="h-7 w-7 mb-2 opacity-40" />
                    <p className="text-sm">No audit events yet.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
