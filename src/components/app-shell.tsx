"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserCheck,
  ScanFace,
  UsersRound,
  ClipboardList,
  Users,
  LayoutDashboard,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  BarChart3,
  History,
  CalendarClock,
  Settings,
} from "lucide-react";
import { api } from "@/lib/api";

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const baseNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Face Check-in", href: "/face", icon: ScanFace },
  { name: "Visitors", href: "/visitors", icon: UsersRound },
  { name: "Records", href: "/records", icon: ClipboardList },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Regularize", href: "/regularizations", icon: CalendarClock },
];

const adminNavigation = [
  { name: "User Management", href: "/users", icon: ShieldCheck },
  { name: "Audit Log", href: "/audit", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

function Login({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const user = await api.login(email, password);
      localStorage.setItem("attendance_user", JSON.stringify(user));
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    setError("");
    try {
      await api.forgotPassword(email);
      setInfo("If that account exists, a reset link has been generated. Ask your administrator to share it.");
    } catch {
      setInfo("If that account exists, a reset link has been generated.");
    }
  };

  const features = [
    { icon: ScanFace, text: "Face-recognition check-in with PIN fallback" },
    { icon: UsersRound, text: "Visitor management with digital signatures" },
    { icon: BarChart3, text: "Monthly attendance reports for payroll" },
    { icon: ShieldCheck, text: "Full audit trail on every action" },
  ];

  return (
    <div className="min-h-screen w-full flex overflow-hidden">
      {/* LEFT — VE3 branding, full height, animated */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#1f4d85] via-[#3e77bf] to-[#4a85d1] overflow-hidden">
        {/* animated floating blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] rounded-full bg-white/10 animate-blob-float" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-white/5 animate-blob-float-slow" />
        <div className="absolute top-[35%] right-[10%] w-[220px] h-[220px] rounded-full bg-white/10 animate-blob-float-reverse" />

        {/* subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16 text-white">
          <div className="animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-10 border border-white/20">
              <span className="font-black text-lg tracking-tight">SX</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Attendance,
              <br />
              reimagined.
            </h1>
            <p className="text-white/70 mt-4 text-base max-w-md leading-relaxed">
              Face recognition check-ins, visitor management, monthly reporting and full audit trails — built for VE3 Global by StaffX.
            </p>
          </div>

          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "150ms" }}>
            {features.map((f, i) => (
              <div
                key={f.text}
                className="flex items-center gap-3 animate-fade-up"
                style={{ animationDelay: `${250 + i * 100}ms` }}
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-white/80">{f.text}</p>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs animate-fade-up" style={{ animationDelay: "700ms" }}>
            © {new Date().getFullYear()} VE3 Global
          </p>
        </div>
      </div>

      {/* RIGHT — login form, full height */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 sm:px-12 relative">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-xs">SX</div>
              <span className="font-bold text-gray-900">StaffX</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your StaffX account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@ve3.global"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all bg-gray-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl animate-fade-up">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-brand bg-brand/5 border border-brand/15 px-3.5 py-2.5 rounded-xl animate-fade-up">
                {info}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="relative overflow-hidden group w-full text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 bg-gradient-to-b from-[#4a85d1] to-brand shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={handleForgot}
              className="w-full text-center text-xs text-gray-400 hover:text-brand transition-colors"
            >
              Forgot password?
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    const raw = localStorage.getItem("attendance_user");
    try {
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
  }, []);

  // Reset-password page must be reachable while logged out
  if (pathname === "/reset-password") return <>{children}</>;

  if (user === undefined) return null;
  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  const handleLogout = () => {
    localStorage.removeItem("attendance_user");
    setUser(null);
  };

  const navigation = user.role === "admin" ? [...baseNavigation, ...adminNavigation] : baseNavigation;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#f4f8fd]">
      <aside className="w-60 bg-white/80 backdrop-blur border-r border-gray-100 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#4a85d1] to-[#2d5a94] shadow-md shadow-brand/30">
            <span className="text-white font-black text-[11px] tracking-tight">SX</span>
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900 leading-none">StaffX</p>
            <p className="text-[10px] text-gray-400 mt-0.5">by VE3 Global</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-white bg-gradient-to-r from-brand to-[#2d5a94] shadow-sm shadow-brand/30"
                    : "text-gray-500 hover:bg-brand/5 hover:text-gray-800"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-1 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-gray-400" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#4a85d1] to-[#2d5a94]">
              <span className="text-white font-black text-[9px]">VE3</span>
            </div>
            <span className="font-bold text-sm text-gray-900">StaffX</span>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <nav className="md:hidden bg-white border-b border-gray-100 flex overflow-x-auto sticky top-[57px] z-40">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 ${
                  isActive ? "border-brand text-brand" : "border-transparent text-gray-500"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="max-w-6xl mx-auto animate-fade-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
