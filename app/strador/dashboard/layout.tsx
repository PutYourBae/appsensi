"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
  CalendarDays,
  Users,
  Wallet,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useMembers, seedDatabase } from "@/lib/firestore";

const navItems = [
  { icon: CalendarDays, label: "Absensi", href: "/strador/dashboard/absensi" },
  { icon: Users, label: "Anggota", href: "/strador/dashboard/anggota" },
  { icon: Wallet, label: "Pendapatan", href: "/strador/dashboard/pendapatan" },
  { icon: Settings, label: "Settings", href: "/strador/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/strador/login");
      } else {
        setLoadingAuth(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Realtime pending count
  const { members, loading: loadingMembers } = useMembers();
  const pendingCount = members.filter((m) => m.status === "pending").length;

  const [seeding, setSeeding] = useState(false);
  const handleSeed = async () => {
    setSeeding(true);
    await seedDatabase();
    setSeeding(false);
  };

  if (loadingAuth || loadingMembers) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--color-bg-primary)" }}>
        <div className="w-10 h-10 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Seed prompt if DB is totally empty
  if (members.length === 0) {
    return (
      <div className="flex h-screen flex-col gap-4 items-center justify-center" style={{ background: "var(--color-bg-primary)" }}>
        <h2 className="text-xl font-bold text-white">Database Masih Kosong</h2>
        <p className="text-[var(--color-text-secondary)]">Klik tombol di bawah untuk menyalin data *mock* (SOT-001 dst) ke Firebase.</p>
        <button onClick={handleSeed} disabled={seeding}
          className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-bold transition-all hover:opacity-90 disabled:opacity-50">
          {seeding ? "Menyalin Data..." : "Migrasi Mock Data ke Firebase"}
        </button>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg-primary)" }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-[var(--color-border)]"
        style={{ background: "var(--color-bg-secondary)" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white">
              <span className="text-xl font-black text-black">G</span>
            </div>
            <div>
              <p className="font-black text-white text-base leading-none tracking-tight">GTA Mabar</p>
              <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ icon: Icon, label, href }) => {
            const isSettings = href.includes("settings");
            const active = pathname === href || pathname.startsWith(href);
            return (
              <Link key={href} href={isSettings ? pathname : href}
                onClick={isSettings ? (e) => {
                  e.preventDefault();
                  // Settings opens as overlay — handled inside page
                  router.push(href);
                } : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
                  ${active
                    ? "text-white"
                    : "text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5"
                  }`}
                style={active ? { background: "rgba(108,92,231,0.15)", color: "#C5BFFF" } : {}}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: "var(--color-accent)" }} />
                )}
                <Icon size={16} className={active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] group-hover:text-white"} />
                <span className="flex-1">{label}</span>
                {label === "Anggota" && pendingCount > 0 && (
                  <span className="ml-auto bg-[var(--color-yellow)] text-[var(--color-bg-primary)] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-[var(--color-border)] pt-3">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-muted)] transition-all">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--color-border)] flex-shrink-0"
          style={{ background: "var(--color-bg-secondary)" }}>
          <div className="flex items-center gap-2">
            {/* Navigasi bulan dipindahkan ke dalam halaman masing-masing */}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowBellDropdown(!showBellDropdown)} 
                className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white transition-all relative">
                <Bell size={16} />
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-red)] border-2 border-[var(--color-bg-secondary)]" />
                )}
              </button>
              
              {showBellDropdown && pendingCount > 0 && (
                <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl z-50 shadow-2xl animate-in fade-in slide-in-from-top-2" 
                  style={{ background: "#16161F", border: "1px solid #2A2A3A" }}>
                  <p className="text-sm font-bold text-white mb-1.5">Notifikasi Baru</p>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Terdapat <span className="text-[var(--color-yellow)] font-bold">{pendingCount} anggota baru</span> yang mendaftar dan sedang menunggu persetujuan Anda di tab Anggota.
                  </p>
                </div>
              )}
            </div>
            <button className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white transition-all">
              <HelpCircle size={16} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
