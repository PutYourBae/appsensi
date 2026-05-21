"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Settings as SettingsIcon,
  MessageSquare,
  AlertOctagon,
  Calculator,
  Save,
  Trash2,
} from "lucide-react";
import { useSettings } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("konfigurasi");

  const { settings, loading } = useSettings();

  const [minAbsen, setMinAbsen] = useState(10);
  const [maxAbsen, setMaxAbsen] = useState(22);
  const [saldo, setSaldo] = useState(10000000);
  const [motivasi, setMotivasi] = useState("Kalau mau hasil gede ya jangan males masuk 😏\nYang rajin hadir biasanya duitnya juga paling tebel 🔥");

  useEffect(() => {
    if (!loading && settings) {
      setMinAbsen(settings.minAbsen ?? 10);
      setMaxAbsen(settings.maxAbsen ?? 22);
      setSaldo(settings.saldo ?? 10000000);
      setMotivasi(settings.motivasi ?? "");
    }
  }, [settings, loading]);

  const handleSave = async () => {
    await setDoc(doc(db, "config", "settings"), {
      minAbsen,
      maxAbsen,
      saldo,
      motivasi
    });
    toast.success("Pengaturan berhasil disimpan!");
  };

  const handleClose = () => {
    router.back();
  };

  const tabs = [
    { id: "konfigurasi", label: "Konfigurasi", icon: Calculator },
    { id: "motivasi", label: "Kata Motivasi", icon: MessageSquare },
    { id: "bahaya", label: "Zona Bahaya", icon: AlertOctagon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)" }}>
      {/* Settings Sidebar (Left) */}
      <div className="w-1/3 max-w-[280px] h-full flex flex-col items-end py-16 pr-6" style={{ background: "rgba(17,17,24,0.5)" }}>
        <div className="w-full max-w-[200px]">
          <div className="px-3 pb-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Pengaturan
          </div>
          <div className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "text-white bg-[rgba(108,92,231,0.15)]"
                    : "text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5"
                }`}
                style={activeTab === tab.id ? { color: "#C5BFFF" } : {}}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Content (Right) */}
      <div className="flex-1 h-full overflow-y-auto py-16 pl-10 pr-20 relative">
        {/* Close Button */}
        <div className="absolute right-10 top-16 flex flex-col items-center gap-2">
          <button onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-[var(--color-text-muted)] text-[var(--color-text-muted)] hover:border-white hover:text-white hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">ESC</span>
        </div>

        <div className="max-w-2xl">
          {activeTab === "konfigurasi" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Konfigurasi Perhitungan</h2>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Batas Kehadiran</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-white mb-2 block">Minimum Absensi (Hari)</label>
                      <p className="text-xs text-[var(--color-text-muted)] mb-3">Batas minimum untuk mendapatkan jatah pendapatan.</p>
                      <input type="number" value={minAbsen} onChange={(e) => setMinAbsen(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
                        onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white mb-2 block">Maksimum Absensi (Hari)</label>
                      <p className="text-xs text-[var(--color-text-muted)] mb-3">Hari kerja aktif dalam bulan ini (100%).</p>
                      <input type="number" value={maxAbsen} onChange={(e) => setMaxAbsen(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
                        onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-[var(--color-border)]" />

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Keuangan</h3>
                  <div>
                    <label className="text-sm text-white mb-2 block">Default Saldo Pembagian (Rp)</label>
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">Saldo yang akan dibagikan secara proporsional.</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">Rp</span>
                      <input type="number" value={saldo} onChange={(e) => setSaldo(parseInt(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
                        onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 glow-accent"
                    style={{ background: "linear-gradient(135deg, #7C6FF5 0%, #6C5CE7 100%)" }}>
                    <Save size={16} />
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "motivasi" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Kata Motivasi</h2>
              
              <div className="space-y-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Masukkan kata-kata motivasi yang akan ditampilkan secara acak saat anggota berhasil melakukan absensi. Pisahkan setiap kalimat dengan baris baru (Enter).
                </p>
                <textarea
                  value={motivasi}
                  onChange={(e) => setMotivasi(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all resize-y"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
                  onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                />
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 glow-accent mt-4"
                  style={{ background: "linear-gradient(135deg, #7C6FF5 0%, #6C5CE7 100%)" }}>
                  <Save size={16} />
                  Simpan Motivasi
                </button>
              </div>
            </div>
          )}

          {activeTab === "bahaya" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Zona Bahaya</h2>
              
              <div className="rounded-2xl p-6 border" style={{ borderColor: "rgba(225,112,85,0.3)", background: "rgba(225,112,85,0.05)" }}>
                <h3 className="text-lg font-bold text-white mb-2">Reset Seluruh Sesi</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                  Tindakan ini akan menghapus semua data absensi pada sesi/bulan yang sedang aktif secara permanen. Data tidak dapat dipulihkan kembali.
                </p>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: "var(--color-red)" }}>
                  <Trash2 size={16} />
                  Reset Sesi Aktif
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
