"use client";

import { useState } from "react";
import { formatRupiah, getInitials } from "@/lib/mock-data";
import { useMembers, useSettings, useAllAttendance, isCellHadir } from "@/lib/firestore";
import {
  Wallet,
  FileText,
  FileDown,
  ShieldCheck,
  PiggyBank,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { exportToExcel, exportToPDF } from "@/lib/utils/export";
import { MonthSelector } from "@/components/MonthSelector";

export default function PendapatanPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStr = format(currentDate, "MMMM-yyyy", { locale: id });
  
  const { members, loading: loadingMembers } = useMembers();
  const { settings, loading: loadingSettings } = useSettings();
  const { summary: allAttendance, loading: loadingAtt } = useAllAttendance();

  const [inputSaldo, setInputSaldo] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (loadingMembers || loadingSettings || loadingAtt) {
    return <div className="p-6">Loading...</div>;
  }

  const currentSaldo = inputSaldo !== null ? parseInt(inputSaldo) || 0 : (settings?.saldo || 0);
  const activeMembers = members.filter(m => m.status === "aktif");

  const rawResults = activeMembers.map(m => {
    // Use cumulative hadir across ALL months
    const hadir = allAttendance[m.id] || 0;
    const maxAbsen = settings?.maxAbsen || 22;
    const minAbsen = settings?.minAbsen || 10;
    
    const persentase = maxAbsen > 0 ? Math.min(100, (hadir / maxAbsen) * 100) : 0;
    const eligible = hadir >= minAbsen;
    
    return { memberId: m.id, memberName: m.name, hadir, persentase, eligible };
  });

  const totalPoin = rawResults.filter(r => r.eligible).reduce((sum, r) => sum + r.persentase, 0);

  const incomeResults = rawResults.map(r => {
    const pendapatan = totalPoin > 0 && r.eligible ? (r.persentase / totalPoin) * currentSaldo : 0;
    const pembulatan = Math.floor(pendapatan / 1000) * 1000;
    return { ...r, pendapatan, pembulatan };
  });

  const totalDibagi = incomeResults.reduce((sum, r) => sum + r.pembulatan, 0);
  const eligibleCount = incomeResults.filter((r) => r.eligible).length;
  const sisaPembulatan = currentSaldo - totalDibagi;

  return (
    <div className="p-6 min-h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h2 className="text-2xl font-black text-white">Distribusi Pendapatan</h2>
            <MonthSelector currentDate={currentDate} onChange={setCurrentDate} />
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm">Kalkulasi dan pembagian hasil periode {format(currentDate, "MMMM yyyy", { locale: id })}.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              await exportToPDF(incomeResults, `Pendapatan_GTA_Mabar_${monthStr}`, `Laporan Pendapatan GTA Mabar - ${format(currentDate, "MMMM yyyy", { locale: id })}`, currentSaldo, totalDibagi);
              setPdfLoading(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 border border-[var(--color-border)] text-white disabled:opacity-50"
            style={{ background: "transparent" }}>
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {pdfLoading ? "Memproses..." : "Export PDF"}
          </button>
          <button 
            onClick={() => exportToExcel(incomeResults, `Pendapatan_GTA_Mabar_${monthStr}`, currentSaldo, totalDibagi)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 glow-accent text-white"
            style={{ background: "linear-gradient(135deg, #7C6FF5 0%, #6C5CE7 100%)" }}>
            <FileDown size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Input Saldo */}
        <div className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
          <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Total Saldo Pembagian</div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[var(--color-text-muted)]">Rp</span>
            <input
              value={inputSaldo !== null ? inputSaldo : (settings?.saldo || 0).toString()}
              onChange={(e) => setInputSaldo(e.target.value.replace(/\D/g, ""))}
              onBlur={(e) => setInputSaldo(parseInt(e.target.value || "0").toString())}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl font-mono text-xl text-white font-bold outline-none transition-all"
              style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
            />
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Tekan Enter untuk menghitung ulang</p>
        </div>

        <div className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Total Dibagi</div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(108,92,231,0.15)] text-[var(--color-accent)]">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <span className="text-lg text-[var(--color-text-muted)] font-mono font-medium mr-1">Rp</span>
            <span className="text-3xl font-black text-white font-mono">{totalDibagi.toLocaleString("id")}</span>
          </div>
        </div>

        <div className="rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Eligible Members</div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(0,184,148,0.15)] text-[var(--color-green)]">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{eligibleCount}</span>
            <span className="text-[var(--color-text-muted)] font-mono text-sm">/ {activeMembers.length} Total</span>
          </div>
        </div>

        <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
          {/* Subtle gradient effect for yellow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-yellow-muted),_transparent_70%)] opacity-30 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Sisa Pembulatan</div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(253,203,110,0.15)] text-[var(--color-yellow)]">
              <PiggyBank size={16} />
            </div>
          </div>
          <div className="relative z-10">
            <span className="text-lg text-[var(--color-yellow)] font-mono font-medium mr-1 opacity-70">Rp</span>
            <span className="text-3xl font-black text-[var(--color-yellow)] font-mono">{sisaPembulatan.toLocaleString("id")}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl flex flex-col flex-1 overflow-hidden"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Detail Alokasi</h3>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-red)]" />
            Di bawah ambang batas (Hadir &lt; {settings?.minAbsen || 10})
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(26,26,36,0.5)" }}>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-16">No</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Nama</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Hadir</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">%</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Pendapatan</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Pembulatan</th>
              </tr>
            </thead>
            <tbody>
              {incomeResults.map((r, i) => (
                <tr key={r.memberId} className="border-t transition-colors hover:bg-white/[0.02]" 
                  style={{ 
                    borderColor: "var(--color-border-subtle)",
                    background: !r.eligible ? "rgba(225,112,85,0.03)" : "transparent"
                  }}>
                  <td className="px-6 py-4 text-[var(--color-text-muted)] font-mono">{i + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`font-bold ${!r.eligible ? "text-[var(--color-red)]" : "text-white"}`}>{r.memberName}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{r.memberId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-mono text-sm ${!r.eligible ? "bg-[rgba(225,112,85,0.15)] text-[var(--color-red)]" : "bg-[rgba(0,184,148,0.15)] text-[var(--color-green)]"}`}>
                      {r.hadir}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-[var(--color-text-secondary)] font-mono">{r.persentase.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right">
                    {!r.eligible ? (
                      <span className="text-[var(--color-text-muted)] line-through decoration-[var(--color-border)] opacity-50 font-mono">
                        {formatRupiah(r.pendapatan)}
                      </span>
                    ) : (
                      <span className="text-white font-mono">{formatRupiah(r.pendapatan)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!r.eligible ? (
                      <div className="flex items-center justify-end gap-2 text-[var(--color-red)] font-mono">
                        <span>Rp 0</span>
                        <AlertTriangle size={14} />
                      </div>
                    ) : (
                      <span className="text-white font-bold font-mono">{formatRupiah(r.pembulatan)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* Footer */}
              <tr className="border-t-2" style={{ borderColor: "var(--color-border)", background: "rgba(26,26,36,0.3)" }}>
                <td colSpan={2} className="px-6 py-4 text-right text-[var(--color-text-secondary)] font-medium">Total Keseluruhan:</td>
                <td className="px-6 py-4 text-center font-bold text-white font-mono">{incomeResults.reduce((s, r) => s + r.hadir, 0)}</td>
                <td className="px-6 py-4 text-right font-bold text-white font-mono">100%</td>
                <td className="px-6 py-4 text-right font-bold text-white font-mono">{formatRupiah(currentSaldo)}</td>
                <td className="px-6 py-4 text-right font-black text-[var(--color-accent)] font-mono">{formatRupiah(totalDibagi)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
