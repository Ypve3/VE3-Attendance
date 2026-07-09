"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { AlertCircle, Loader2, RefreshCw, ScanFace, UserX, Clock, CheckCircle2, KeyRound } from "lucide-react";
import { api, type FaceProfile, type AttendanceRecord, type Employee } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Card, CardContent, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";
const MATCH_THRESHOLD = 0.5;
const today = new Date().toISOString().split("T")[0];

type ScanStatus =
  | "loading-models"
  | "no-profiles"
  | "starting-camera"
  | "scanning"
  | "match-found"
  | "checking-in"
  | "success"
  | "duplicate"
  | "camera-error";

interface MatchResult {
  employeeId: number;
  employeeName: string;
  confidence: number;
}

export default function FaceCheckin() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef(false);
  const faceapiRef = useRef<typeof import("@vladmandic/face-api") | null>(null);

  const [status, setStatus] = useState<ScanStatus>("loading-models");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);

  // PIN fallback state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pinEmployeeId, setPinEmployeeId] = useState<number | "">("");
  const [pin, setPin] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const checkedInToday = useMemo(() => new Set(todayRecords.map((r) => r.employeeId)), [todayRecords]);

  const refreshRecords = useCallback(async () => {
    setTodayRecords(await api.listAttendance(today));
  }, []);

  const loadModels = useCallback(async () => {
    const faceapi = (faceapiRef.current ??= await import("@vladmandic/face-api"));
    setModelLoadProgress(10);
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    setModelLoadProgress(45);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
    setModelLoadProgress(75);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    setModelLoadProgress(100);
    setModelsLoaded(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, e] = await Promise.all([api.listFaceProfiles(), api.listEmployees()]);
        if (!mounted) return;
        setProfiles(p);
        setEmployees(e);
        await refreshRecords();
        await loadModels();
      } catch {
        if (mounted) setStatus("camera-error");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshRecords, loadModels]);

  const startCamera = useCallback(async () => {
    setStatus("starting-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("scanning");
    } catch {
      setStatus("camera-error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;
    if (profiles.length === 0) {
      setStatus("no-profiles");
      return;
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded, profiles]);

  useEffect(() => {
    if (status !== "scanning" || profiles.length === 0) return;
    const faceapi = faceapiRef.current;
    if (!faceapi) return;

    const labeledDescriptors = profiles.map(
      (p) => new faceapi.LabeledFaceDescriptors(String(p.employeeId), [new Float32Array(p.descriptor)])
    );
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);

    const detect = async () => {
      if (!videoRef.current || cooldownRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (canvasRef.current) {
          const dims = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
          faceapi.matchDimensions(canvasRef.current, dims);
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(0, 0, dims.width, dims.height);
          if (detection) {
            const resized = faceapi.resizeResults(detection, dims);
            faceapi.draw.drawDetections(canvasRef.current, [resized]);
          }
        }

        if (!detection) return;
        const best = faceMatcher.findBestMatch(detection.descriptor);
        if (best.label === "unknown") return;

        const employeeId = parseInt(best.label);
        const confidence = Math.round((1 - best.distance) * 100);
        const profile = profiles.find((p) => p.employeeId === employeeId);
        if (!profile) return;

        if (checkedInToday.has(employeeId)) {
          setMatchResult({ employeeId, employeeName: profile.employeeName, confidence });
          setStatus("duplicate");
          cooldownRef.current = true;
          setTimeout(() => {
            cooldownRef.current = false;
            setStatus("scanning");
            setMatchResult(null);
          }, 3000);
          return;
        }

        setMatchResult({ employeeId, employeeName: profile.employeeName, confidence });
        setStatus("match-found");
        cooldownRef.current = true;

        setTimeout(async () => {
          setStatus("checking-in");
          try {
            await api.checkIn({ employeeId, matchConfidence: confidence / 100, method: "face" });
            setStatus("success");
            await refreshRecords();
          } catch {
            setStatus("duplicate");
          } finally {
            setTimeout(() => {
              cooldownRef.current = false;
              setStatus("scanning");
              setMatchResult(null);
            }, 3000);
          }
        }, 1000);
      } catch {
        // silent
      }
    };

    scanIntervalRef.current = setInterval(detect, 400);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [status, profiles, checkedInToday, refreshRecords]);

  const handleRestart = () => {
    stopCamera();
    setStatus("loading-models");
    setModelsLoaded(false);
    setModelLoadProgress(0);
    setMatchResult(null);
    cooldownRef.current = false;
    loadModels().catch(() => setStatus("camera-error"));
  };

  const handlePinCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinEmployeeId || !pin) return;
    setPinSubmitting(true);
    try {
      const rec = await api.checkIn({ employeeId: Number(pinEmployeeId), method: "pin", pin });
      toast({ title: `Marked ${rec.status}`, description: `${rec.employeeName} checked in via PIN.` });
      setPin("");
      setPinEmployeeId("");
      await refreshRecords();
    } catch (err: any) {
      toast({ title: "PIN Check-in Failed", description: err.message, variant: "destructive" });
    } finally {
      setPinSubmitting(false);
    }
  };

  const pinCapableEmployees = employees.filter((e) => e.hasPin && !checkedInToday.has(e.id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Face Recognition</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Look at the camera — attendance is marked automatically when your face is recognised
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-gray-900 aspect-video flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  ["scanning", "match-found", "checking-in", "success", "duplicate"].includes(status)
                    ? "opacity-100"
                    : "opacity-30"
                }`}
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />

              {status === "loading-models" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-gray-900/80">
                  <ScanFace className="w-12 h-12 opacity-50 animate-pulse" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Loading AI models…</p>
                    <p className="text-xs text-gray-400 mt-1">This takes a few seconds on first load</p>
                  </div>
                  <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${modelLoadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{modelLoadProgress}%</p>
                </div>
              )}

              {status === "starting-camera" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-gray-900/80">
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <p className="text-sm text-gray-300">Starting camera…</p>
                </div>
              )}

              {status === "no-profiles" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-gray-900/90">
                  <UserX className="w-10 h-10 text-orange-400" />
                  <div className="text-center px-6">
                    <p className="text-sm font-semibold text-orange-300">No faces registered</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Go to the Employees page and register faces for your team members first.
                    </p>
                  </div>
                </div>
              )}

              {status === "camera-error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-gray-900/90">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <div className="text-center px-6">
                    <p className="text-sm font-semibold text-red-300">Camera error</p>
                    <p className="text-xs text-gray-400 mt-1">Please allow camera permissions and try again.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleRestart} className="mt-1 text-white border-white/30 bg-transparent hover:bg-white/10">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry
                  </Button>
                </div>
              )}

              {(status === "match-found" || status === "checking-in") && matchResult && (
                <div className="absolute bottom-0 inset-x-0 bg-green-600/90 px-5 py-3 flex items-center gap-3 animate-fade-up">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {matchResult.employeeName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{matchResult.employeeName}</p>
                    <p className="text-green-200 text-xs">{matchResult.confidence}% match</p>
                  </div>
                  {status === "checking-in" ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                  )}
                </div>
              )}

              {status === "success" && matchResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-600/80 gap-3 animate-fade-up">
                  <CheckCircle2 className="w-14 h-14 text-white" />
                  <div className="text-center">
                    <p className="text-white text-xl font-bold">{matchResult.employeeName}</p>
                    <p className="text-green-200 text-sm mt-0.5">
                      Checked in at {format(new Date(), "h:mm a")} · {matchResult.confidence}% confidence
                    </p>
                  </div>
                </div>
              )}

              {status === "duplicate" && matchResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-orange-600/80 gap-3 animate-fade-up">
                  <AlertCircle className="w-12 h-12 text-white" />
                  <div className="text-center">
                    <p className="text-white font-bold">{matchResult.employeeName}</p>
                    <p className="text-orange-200 text-sm mt-0.5">Already checked in today</p>
                  </div>
                </div>
              )}

              {status === "scanning" && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-xs font-medium">Scanning</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {status === "scanning" ? "Position your face in front of the camera" : " "}
              </p>
              {profiles.length > 0 && (
                <span className="text-xs text-gray-400">{profiles.length} faces registered</span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800">PIN Fallback</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">Camera not cooperating? Check in with your PIN instead.</p>
              <form onSubmit={handlePinCheckIn} className="space-y-2.5">
                <select
                  value={pinEmployeeId}
                  onChange={(e) => setPinEmployeeId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                >
                  <option value="">Select your name…</option>
                  {pinCapableEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
                <Button className="w-full" type="submit" disabled={!pinEmployeeId || pin.length < 4 || pinSubmitting}>
                  {pinSubmitting ? "Checking in…" : "Check in with PIN"}
                </Button>
              </form>
              {pinCapableEmployees.length === 0 && (
                <p className="text-[11px] text-gray-400 mt-2">
                  No employees with a PIN are pending check-in. PINs are set on the Employees page.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800">Today's Check-ins</h3>
                {todayRecords.length > 0 && (
                  <Badge className="ml-auto text-[10px] bg-brand/10 text-brand border-transparent">{todayRecords.length}</Badge>
                )}
              </div>
              {todayRecords.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No check-ins yet today</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {todayRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-brand/10 text-brand">
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
        </div>
      </div>
    </div>
  );
}
