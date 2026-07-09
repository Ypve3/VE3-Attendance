"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, Trash2, Building2, Save } from "lucide-react";
import { api, type Department } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, Badge } from "@/components/ui/card";

export default function SettingsPage() {
  const { toast } = useToast();
  const [lateCutoff, setLateCutoff] = useState("09:30");
  const [savingCutoff, setSavingCutoff] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [settings, depts] = await Promise.all([api.getSettings(), api.listDepartments()]);
    setLateCutoff(settings.late_cutoff ?? "09:30");
    setDepartments(depts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveCutoff = async () => {
    if (!/^\d{1,2}:\d{2}$/.test(lateCutoff)) {
      toast({ title: "Invalid format", description: "Use HH:MM, e.g. 09:30", variant: "destructive" });
      return;
    }
    setSavingCutoff(true);
    try {
      await api.updateSettings({ late_cutoff: lateCutoff });
      toast({ title: "Settings Saved", description: `Check-ins after ${lateCutoff} will be marked Late.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingCutoff(false);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    setAddingDept(true);
    try {
      await api.createDepartment(newDept.trim());
      toast({ title: "Department Added", description: `${newDept} has been created.` });
      setNewDept("");
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingDept(false);
    }
  };

  const handleDeleteDept = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Employees in this department will be unassigned, not removed.`)) return;
    try {
      await api.deleteDepartment(id);
      toast({ title: "Department Deleted", description: `${name} has been removed.` });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">System-wide configuration — admin only.</p>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-800">Late Cutoff Time</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Check-ins after this time are automatically marked <Badge variant="warning" className="mx-1">Late</Badge> instead of Present.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="time"
              value={lateCutoff}
              onChange={(e) => setLateCutoff(e.target.value)}
              className="w-40"
            />
            <Button onClick={handleSaveCutoff} disabled={savingCutoff}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingCutoff ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-800">Departments</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Manage the department dropdown used on the Employees page.</p>

          <form onSubmit={handleAddDept} className="flex items-center gap-2 mb-4">
            <Input placeholder="New department name" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            <Button type="submit" disabled={!newDept.trim() || addingDept}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </form>

          <div className="space-y-1.5">
            {departments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No departments yet.</p>
            ) : (
              departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{d.name}</span>
                  <button onClick={() => handleDeleteDept(d.id, d.name)} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
