"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ShieldCheck, User as UserIcon, UserCog, Mail, Lock } from "lucide-react";
import { api, type AppUser } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setUsers(await api.listUsers());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createUser({ name, email, password, role });
      toast({ title: "User created", description: `${name} can now sign in.` });
      setName(""); setEmail(""); setPassword(""); setRole("user");
      setIsAddOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, userName: string) => {
    if (!confirm(`Remove ${userName}'s access?`)) return;
    try {
      await api.deleteUser(id);
      toast({ title: "User removed", description: `${userName} can no longer sign in.` });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create accounts and control who can sign in.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add User
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-left text-gray-500">
            <tr>
              <th className="h-10 px-4">Name</th>
              <th className="h-10 px-4">Email</th>
              <th className="h-10 px-4">Role</th>
              <th className="h-10 px-4">Created</th>
              <th className="h-10 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-gray-500">{u.email}</td>
                <td className="p-4">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? <ShieldCheck className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                    {u.role}
                  </Badge>
                </td>
                <td className="p-4 text-gray-400">{u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(u.id, u.name)} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="h-1.5 bg-gradient-to-r from-[#4a85d1] via-brand to-[#2d5a94]" />
            <form onSubmit={handleAdd}>
              <div className="px-6 pt-6 pb-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center flex-shrink-0">
                  <UserCog className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Add New User</h2>
                  <p className="text-sm text-gray-500 mt-0.5">They can sign in immediately with these credentials.</p>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-3.5">
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    className="pl-10 rounded-xl bg-gray-50 focus:bg-white h-11"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 rounded-xl bg-gray-50 focus:bg-white h-11"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Temporary password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 rounded-xl bg-gray-50 focus:bg-white h-11"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Role</label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                    {(["user", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          role === r ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {r === "admin" ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />Creating…</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-1" />Create User</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
