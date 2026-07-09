"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  PenLine, CheckCircle2, Trash2, RotateCcw, UserPlus, ClipboardList, Building2, Target, User, ChevronRight, Loader2,
} from "lucide-react";
import { api, type Visitor } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, Badge } from "@/components/ui/card";

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x / dpr, pos.y / dpr);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x / dpr, pos.y / dpr);
      ctx.stroke();
      setIsEmpty(false);
      onChange(canvas.toDataURL("image/png"));
    };
    const onEnd = () => { isDrawingRef.current = false; };

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("mouseleave", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [getPos, onChange]);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Signature <span className="text-gray-400 text-xs font-normal">(optional)</span>
        </label>
        {!isEmpty && (
          <button type="button" onClick={clear} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      <div className={`relative rounded-2xl border-2 overflow-hidden transition-colors ${isEmpty ? "border-dashed border-gray-200" : "border-brand"}`}>
        <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none bg-white" style={{ height: "160px", display: "block" }} />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1.5">
            <PenLine className="w-6 h-6 text-gray-300" />
            <p className="text-xs text-gray-400">Sign here (optional)</p>
          </div>
        )}
      </div>
    </div>
  );
}

type PageMode = "checkin" | "success" | "records";

export default function VisitorsPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<PageMode>("checkin");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [host, setHost] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [lastVisitor, setLastVisitor] = useState<{ name: string; time: string } | null>(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadVisitors = useCallback(async () => {
    setVisitors(await api.listVisitors(filterDate || undefined));
  }, [filterDate]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const resetForm = () => {
    setName("");
    setCompany("");
    setPurpose("");
    setHost("");
    setSignature(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter the visitor's name.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const record = await api.visitorCheckIn({
        name: name.trim(),
        companyName: company.trim() || undefined,
        purpose: purpose.trim() || undefined,
        hostName: host.trim() || undefined,
        signature: signature ?? undefined,
      });
      setLastVisitor({ name: record.name, time: format(new Date(record.checkInTime), "h:mm a") });
      setMode("success");
      await loadVisitors();
    } catch {
      toast({ title: "Error", description: "Failed to record visit. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, visitorName: string) => {
    if (!confirm(`Remove the visit record for ${visitorName}?`)) return;
    try {
      await api.deleteVisitor(id);
      toast({ title: "Record Deleted", description: `Visit by ${visitorName} has been removed.` });
      await loadVisitors();
    } catch {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Visitor Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register visitors — signature is optional</p>
        </div>
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 self-start sm:self-auto">
          <button
            onClick={() => setMode("checkin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode !== "records" ? "bg-white text-brand shadow-sm" : "text-gray-500"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Check-in
          </button>
          <button
            onClick={() => setMode("records")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "records" ? "bg-white text-brand shadow-sm" : "text-gray-500"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Visitor Log
          </button>
        </div>
      </div>

      {mode === "checkin" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-gray-800 mb-5">Visitor Details</h2>
              <form id="visitor-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input placeholder="Enter visitor's full name" className="pl-9 bg-gray-50" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Company / Organisation</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input placeholder="Where are you from?" className="pl-9 bg-gray-50" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Visiting</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input placeholder="Who are you here to meet?" className="pl-9 bg-gray-50" value={host} onChange={(e) => setHost(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Purpose of Visit</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input placeholder="e.g. Meeting, Interview, Delivery…" className="pl-9 bg-gray-50" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col h-full">
              <SignaturePad onChange={setSignature} />
              <div className="mt-auto pt-6">
                <button
                  type="submit"
                  form="visitor-form"
                  disabled={submitting || !name.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 bg-gradient-to-b from-[#4a85d1] to-brand shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all active:scale-[0.99]"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Checking in…</>
                  ) : (
                    <><ChevronRight className="w-4 h-4" />Complete Check-in</>
                  )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">Only the name is required</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "success" && lastVisitor && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-brand/10 animate-pulse-ring">
            <CheckCircle2 className="w-10 h-10 text-brand" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {lastVisitor.name}!</h2>
          <p className="text-gray-500 mt-2">
            Checked in at <span className="font-medium">{lastVisitor.time}</span>
          </p>
          <div className="flex gap-3 mt-8">
            <Button onClick={() => { resetForm(); setMode("checkin"); }} className="px-8">
              Next Visitor
            </Button>
            <Button variant="outline" onClick={() => setMode("records")}>View Visitor Log</Button>
          </div>
        </div>
      )}

      {mode === "records" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filter by date:</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 outline-none focus:border-brand"
              />
              {filterDate && (
                <button onClick={() => setFilterDate("")} className="text-xs text-gray-400 hover:text-gray-600">
                  Show all
                </button>
              )}
            </div>
            <Badge className="bg-brand/10 text-brand border-transparent">
              {visitors.length} record{visitors.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 text-left text-gray-500">
                  <tr>
                    <th className="h-10 px-4">Visitor</th>
                    <th className="h-10 px-4">Purpose</th>
                    <th className="h-10 px-4">Host</th>
                    <th className="h-10 px-4">Date & Time</th>
                    <th className="h-10 px-4">Signature</th>
                    <th className="h-10 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.length > 0 ? (
                    visitors.map((v) => (
                      <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="p-4">
                          <p className="font-medium">{v.name}</p>
                          {v.companyName && <p className="text-xs text-gray-400">{v.companyName}</p>}
                        </td>
                        <td className="p-4">{v.purpose || <span className="text-gray-300">—</span>}</td>
                        <td className="p-4">{v.hostName || <span className="text-gray-300">—</span>}</td>
                        <td className="p-4">
                          <p>{format(new Date(v.checkInTime), "h:mm a")}</p>
                          <p className="text-xs text-gray-400">{format(new Date(v.checkInTime), "MMM d, yyyy")}</p>
                        </td>
                        <td className="p-4">
                          {v.signature ? (
                            <img src={v.signature} alt="Signature" className="h-8 max-w-[120px] object-contain rounded border border-gray-100 bg-white" />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDelete(v.id, v.name)} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="h-28 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <ClipboardList className="h-7 w-7 mb-2 opacity-40" />
                          <p className="text-sm">No visitor records found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
