"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@gtamabar.com");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/strador/dashboard");
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 30% 20%, #1A0F40 0%, #0A0A0F 50%, #0F0A1A 100%)" }}>

      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6C5CE7, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #5A4BCD, transparent)" }} />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: "#111118", border: "1px solid #2A2A3A", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-1">
              <span className="text-gradient">GTA Mabar</span>
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] tracking-widest uppercase font-medium">
              Admin Console
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
              style={{ background: "rgba(225,112,85,0.1)", border: "1px solid rgba(225,112,85,0.3)", color: "#E17055" }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              Email atau password tidak sesuai
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block tracking-wide uppercase">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gtamabar.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-[var(--color-text-muted)] outline-none transition-all"
                  style={{
                    background: "#1A1A24",
                    border: `1px solid ${error ? "rgba(225,112,85,0.4)" : "#2A2A3A"}`,
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#6C5CE7"}
                  onBlur={(e) => e.target.style.borderColor = error ? "rgba(225,112,85,0.4)" : "#2A2A3A"}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-[var(--color-text-muted)] outline-none transition-all"
                  style={{
                    background: "#1A1A24",
                    border: `1px solid ${error ? "rgba(225,112,85,0.5)" : "#2A2A3A"}`,
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#6C5CE7"}
                  onBlur={(e) => e.target.style.borderColor = error ? "rgba(225,112,85,0.5)" : "#2A2A3A"}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2.5 mt-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #7C6FF5 0%, #6C5CE7 100%)",
                boxShadow: loading || !email || !password ? "none" : "0 4px 20px rgba(108,92,231,0.4)",
              }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Masuk sebagai Admin
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-5">
            Hubungi superadmin jika tidak bisa masuk
          </p>
        </div>

        {/* Bottom link */}
        <p className="text-center mt-4 text-xs text-[var(--color-text-muted)]">
          <Link href="/" className="hover:text-[var(--color-accent)] transition-colors">
            ← Kembali ke halaman absensi
          </Link>
        </p>
      </div>
    </div>
  );
}
