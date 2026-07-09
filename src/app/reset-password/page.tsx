"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) setError("This reset link is missing a token. Please request a new one from the login page.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eaf1fb] via-white to-[#eaf1fb] px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-brand/10 p-8 animate-scale-in">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4a85d1] to-[#2d5a94] flex items-center justify-center text-white font-black text-xs">
            VE3
          </div>
            <span className="font-bold text-gray-900">StaffX</span>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Password updated</h1>
            <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
            <button
              onClick={() => router.push("/")}
              className="mt-2 w-full text-white text-sm font-semibold py-2.5 rounded-xl bg-gradient-to-b from-[#4a85d1] to-brand shadow-lg shadow-brand/30 hover:shadow-xl transition-all"
            >
              Go to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-brand" />
              <h1 className="text-lg font-bold text-gray-900">Reset your password</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl animate-fade-up">{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting || !token}
                className="w-full text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 bg-gradient-to-b from-[#4a85d1] to-brand shadow-lg shadow-brand/30 hover:shadow-xl transition-all active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
