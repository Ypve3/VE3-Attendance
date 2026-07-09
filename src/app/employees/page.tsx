"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Search, Plus, Trash2, Users, Camera, CheckCircle2, Loader2, ScanFace, Upload, KeyRound, ShieldOff,
  UserPlus, ChevronDown, Copy, Sparkles, Building2,
} from "lucide-react";
import { api, type Employee, type Department } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Badge } from "@/components/ui/card";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";

export default function EmployeesPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [revealedPin, setRevealedPin] = useState<{ name: string; pin: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // PIN modal
  const [pinEmployee, setPinEmployee] = useState<{ id: number; name: string } | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  // Face registration modal
  const [faceModalEmployee, setFaceModalEmployee] = useState<{ id: number; name: string } | null>(null);
  const [faceStatus, setFaceStatus] = useState<
    "idle" | "loading-models" | "starting" | "ready" | "capturing" | "captured" | "saving"
  >("idle");
  const [consentGiven, setConsentGiven] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<typeof import("@vladmandic/face-api") | null>(null);

  const load = async () => {
    const [e, d] = await Promise.all([api.listEmployees(), api.listDepartments()]);
    setEmployees(e);
    setDepartments(d);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.departmentName && e.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (!faceModalEmployee) return;
    setFaceStatus("loading-models");
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    setConsentGiven(false);
    (async () => {
      const faceapi = (faceapiRef.current ??= await import("@vladmandic/face-api"));
      if (!modelsLoaded) {
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          setModelsLoaded(true);
        } catch {
          toast({ title: "Error", description: "Failed to load face models.", variant: "destructive" });
          setFaceModalEmployee(null);
          return;
        }
      }
      setFaceStatus("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setFaceStatus("ready");
      } catch {
        toast({ title: "Camera Error", description: "Could not access camera.", variant: "destructive" });
        setFaceModalEmployee(null);
      }
    })();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceModalEmployee]);

  const captureSnapshot = (): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const vw = video.videoWidth || 480;
    const vh = video.videoHeight || 360;
    const side = Math.min(vw, vh);
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    const faceapi = faceapiRef.current;
    if (!faceapi) return;
    setFaceStatus("capturing");
    try {
      const samples: Float32Array[] = [];
      for (let i = 0; i < 3; i++) {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        if (!detection) {
          toast({ title: "No Face Detected", description: "Hold still, ensure good lighting, and try again.", variant: "destructive" });
          setFaceStatus("ready");
          return;
        }
        samples.push(detection.descriptor);
        await new Promise((r) => setTimeout(r, 250));
      }
      const avg = new Array(samples[0].length).fill(0);
      for (const s of samples) for (let i = 0; i < s.length; i++) avg[i] += s[i] / samples.length;
      setCapturedDescriptor(avg);
      setCapturedPhoto(captureSnapshot());
      setFaceStatus("captured");
    } catch {
      toast({ title: "Capture Failed", description: "Try again.", variant: "destructive" });
      setFaceStatus("ready");
    }
  };

  const handleSaveFace = async () => {
    if (!faceModalEmployee || !capturedDescriptor || !consentGiven) return;
    setFaceStatus("saving");
    try {
      await api.registerFace(faceModalEmployee.id, capturedDescriptor, capturedPhoto ?? "");
      toast({ title: "Face Registered", description: `${faceModalEmployee.name}'s face and photo have been saved.` });
      await load();
      closeFaceModal();
    } catch {
      toast({ title: "Error", description: "Failed to save face data.", variant: "destructive" });
      setFaceStatus("captured");
    }
  };

  const closeFaceModal = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setFaceModalEmployee(null);
    setFaceStatus("idle");
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await api.createEmployee({
        name: newName.trim(),
        departmentId: newDepartmentId === "" ? null : Number(newDepartmentId),
      });
      setIsAddOpen(false);
      setRevealedPin({ name: created.name, pin: created.generatedPin });
      setNewName("");
      setNewDepartmentId("");
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove ${name} from the system? Their attendance records will be deleted.`)) return;
    try {
      await api.deleteEmployee(id);
      toast({ title: "Employee Removed", description: `${name} has been removed.` });
      await load();
    } catch {
      toast({ title: "Error", description: "Failed to remove employee.", variant: "destructive" });
    }
  };

  const handleDeleteBiometric = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}'s biometric data (face template + photo)? They will need to re-register to use face check-in.`)) return;
    try {
      await api.deleteFace(id);
      toast({ title: "Biometric Data Deleted", description: `${name}'s face data has been permanently removed.` });
      await load();
    } catch {
      toast({ title: "Error", description: "Failed to delete biometric data.", variant: "destructive" });
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinEmployee || !/^\d{4,6}$/.test(pinValue)) return;
    setPinSaving(true);
    try {
      await api.setPin(pinEmployee.id, pinValue);
      toast({ title: "PIN Set", description: `${pinEmployee.name} can now check in with a PIN.` });
      setPinEmployee(null);
      setPinValue("");
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPinSaving(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) throw new Error("File is empty");

      // Expect "name,department" — header row optional
      const startIdx = /name/i.test(lines[0]) ? 1 : 0;
      const rows = lines.slice(startIdx).map((line) => {
        const [name, department] = line.split(",").map((s) => s?.trim().replace(/^"|"$/g, ""));
        return { name: name ?? "", department: department || undefined };
      });

      const result = await api.importEmployees(rows);
      toast({ title: "Import Complete", description: `${result.created} employees created, ${result.skipped} rows skipped.` });
      await load();
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employees, faces, PINs and departments</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-52">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Search…" className="pl-9 bg-gray-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Import CSV
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 -mt-4">
        CSV format: <code className="bg-gray-100 px-1 rounded">name,department</code> — one employee per line, header row optional.
      </p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-left text-gray-500">
              <tr>
                <th className="h-10 px-4">Employee</th>
                <th className="h-10 px-4">Department</th>
                <th className="h-10 px-4">Face</th>
                <th className="h-10 px-4">PIN</th>
                <th className="h-10 px-4">Added On</th>
                <th className="h-10 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        {employee.photo ? (
                          <img src={employee.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-brand/10 text-brand">
                            {employee.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {employee.departmentName ? (
                        <Badge variant="secondary">{employee.departmentName}</Badge>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      {employee.hasFace ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">Registered</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setFaceModalEmployee({ id: employee.id, name: employee.name })}
                          className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md text-brand bg-brand/10 hover:text-white hover:bg-brand transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Register
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setPinEmployee({ id: employee.id, name: employee.name })}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                          employee.hasPin
                            ? "text-green-600 bg-green-50 hover:bg-green-100"
                            : "text-gray-500 bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {employee.hasPin ? "Update PIN" : "Set PIN"}
                      </button>
                    </td>
                    <td className="p-4 text-gray-400">{format(new Date(employee.createdAt), "MMM d, yyyy")}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {employee.hasFace && (
                          <>
                            <button
                              onClick={() => setFaceModalEmployee({ id: employee.id, name: employee.name })}
                              className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                              title="Re-register face"
                            >
                              <Camera className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBiometric(employee.id, employee.name)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                              title="Delete biometric data"
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(employee.id, employee.name)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50"
                          title="Remove employee"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="h-28 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-7 w-7 mb-2 opacity-40" />
                      <p className="text-sm">No employees found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add employee modal */}
      {isAddOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-scale-in">
      <div className="h-1.5 bg-gradient-to-r from-[#4a85d1] via-brand to-[#2d5a94]" />
      <form onSubmit={handleAddEmployee}>
        <div className="px-6 pt-6 pb-5 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Add New Employee</h2>
            <p className="text-sm text-gray-500 mt-0.5">A 6-digit PIN is generated automatically as a check-in fallback.</p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Full Name</label>
            <Input
              placeholder="e.g. Jane Doe"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
              className="rounded-xl bg-gray-50 focus:bg-white h-11 px-4"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Department</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={newDepartmentId}
                onChange={(e) => setNewDepartmentId(e.target.value ? Number(e.target.value) : "")}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white pl-10 pr-9 text-sm outline-none appearance-none transition-colors focus:border-brand focus:ring-4 focus:ring-brand/10"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Admins can manage departments in Settings.</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={!newName.trim() || saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Adding…</>
            ) : (
              <><Plus className="w-4 h-4 mr-1.5" />Add Employee</>
            )}
          </Button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* PIN reveal modal — shown once right after an employee is created */}
      {revealedPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-green-500 to-emerald-500" />
            <div className="px-6 pt-6 pb-5 flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0 animate-icon-float">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{revealedPin.name} was added</h2>
                <p className="text-sm text-gray-500 mt-0.5">Share this PIN with them — it won't be shown again.</p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-center justify-between rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 to-transparent px-5 py-4">
                <span className="font-mono text-3xl font-bold tracking-[0.3em] text-brand">{revealedPin.pin}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedPin.pin);
                    toast({ title: "Copied", description: "PIN copied to clipboard." });
                  }}
                  className="p-2 rounded-xl text-brand bg-white border border-brand/20 hover:bg-brand/5 transition-colors flex-shrink-0"
                  title="Copy PIN"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2.5">
                They can update this PIN any time from the Employees table, or use Face Check-in instead once registered.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end">
              <Button onClick={() => setRevealedPin(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* PIN modal */}
      {pinEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="h-1.5 bg-gradient-to-r from-[#4a85d1] via-brand to-[#2d5a94]" />
            <form onSubmit={handleSetPin}>
              <div className="px-6 pt-6 pb-5 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Set PIN — {pinEmployee.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">4–6 digits, used when the camera can't recognise a face.</p>
                </div>
              </div>
              <div className="px-6 pb-6">
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="e.g. 4821"
                  maxLength={6}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  className="rounded-xl bg-gray-50 focus:bg-white h-11 px-4 text-center text-lg tracking-[0.3em] font-mono"
                />
              </div>
              <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setPinEmployee(null); setPinValue(""); }}>Cancel</Button>
                <Button type="submit" disabled={!/^\d{4,6}$/.test(pinValue) || pinSaving}>
                  {pinSaving ? "Saving…" : "Save PIN"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face registration modal with biometric consent */}
      {faceModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Register Face — {faceModalEmployee.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Look straight at the camera, then click Capture</p>
            </div>

            <div className="relative bg-gray-900 aspect-video flex items-center justify-center overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {(faceStatus === "loading-models" || faceStatus === "starting") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <p className="text-sm text-gray-300">
                    {faceStatus === "loading-models" ? "Loading AI models…" : "Starting camera…"}
                  </p>
                </div>
              )}
              {faceStatus === "captured" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-600/80 gap-2">
                  {capturedPhoto && (
                    <img src={capturedPhoto} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg" />
                  )}
                  <CheckCircle2 className="w-8 h-8 text-white" />
                  <p className="text-white font-semibold text-sm">Face captured (3-sample average)</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 accent-[#3e77bf]"
                />
                <span>
                  The employee consents to VE3 Global storing, via StaffX, a mathematical face template and photo thumbnail for
                  attendance purposes only. This data can be viewed and permanently deleted at any time from this page.
                </span>
              </label>
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={closeFaceModal} disabled={faceStatus === "saving"}>Cancel</Button>
                {faceStatus === "captured" || faceStatus === "saving" ? (
                  <Button onClick={handleSaveFace} disabled={faceStatus === "saving" || !consentGiven} title={!consentGiven ? "Consent is required" : ""}>
                    {faceStatus === "saving" ? (
                      <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</>
                    ) : (
                      "Save Face"
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleCapture} disabled={faceStatus !== "ready" && faceStatus !== "capturing"}>
                    {faceStatus === "capturing" ? (
                      <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Detecting…</>
                    ) : (
                      <><ScanFace className="w-4 h-4 mr-1.5" />Capture Face</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
