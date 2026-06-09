"use client";

import { useState, useEffect } from "react";
import { getInitials, getAvatarColor } from "@/lib/mock-data";
import { useMembers, useAttendance, AttendanceMonth, logEdit, useEditLogs, isCellHadir } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Download,
  Save,
  Search,
  RotateCcw,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, getDaysInMonth, isWeekend, isSameMonth, isAfter } from "date-fns";
import { id } from "date-fns/locale";
import { MonthSelector } from "@/components/MonthSelector";
import { exportAttendanceCSV, exportAllMonthsXLSX, MonthAttendanceData } from "@/lib/utils/export";
import { AuditLogModal } from "./AuditLogModal";
import { SavePreviewModal, ChangeRecord } from "./SavePreviewModal";

// Dynamic date logic will be inside the component

export default function AbsensiPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStr = format(currentDate, "MMMM-yyyy", { locale: id });
  
  const { members } = useMembers();
  const { attendance: remoteAttendance, loading: loadingAtt } = useAttendance(monthStr);
  const { editLogs } = useEditLogs(30);
  const [attendance, setAttendance] = useState<AttendanceMonth>({});
  const [search, setSearch] = useState("");

  const [showReset, setShowReset] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showPreview, setShowPreview] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeRecord[]>([]);

  useEffect(() => {
    if (!hasChanges && !loadingAtt) {
      setAttendance(remoteAttendance);
    }
  }, [remoteAttendance, hasChanges, loadingAtt]);

  const handleMonthChange = (date: Date) => {
    if (hasChanges) {
      toast.error("Simpan perubahan terlebih dahulu!");
      return;
    }
    setCurrentDate(date);
  };

  const TOTAL_DAYS = getDaysInMonth(currentDate);
  const now = new Date();
  const isCurrentMonth = isSameMonth(currentDate, now);
  const TODAY_DAY = isCurrentMonth ? now.getDate() : isAfter(now, currentDate) ? TOTAL_DAYS : 0;
  
  const weekends = new Set<number>();
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
    if (isWeekend(date)) weekends.add(d);
  }

  const filteredMembers = members.filter((m) => m.status === "aktif").filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCell = (memberId: string, day: number) => {
    if (day > TODAY_DAY) return;
    const current = attendance[memberId]?.[day];
    const currentlyHadir = isCellHadir(current);
    setAttendance((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [day]: !currentlyHadir, // admin always writes boolean
      },
    }));
    setHasChanges(true);
  };

  const countHadir = (memberId: string) =>
    Object.values(attendance[memberId] || {}).filter(isCellHadir).length;

  const totalHadir = filteredMembers.reduce((s, m) => s + countHadir(m.id), 0);
  const maxPossible = filteredMembers.length * 16; // ~16 working days so far
  const persen = maxPossible > 0 ? ((totalHadir / maxPossible) * 100).toFixed(1) : "0.0";

  // Daily summary: count how many active members were present on each day
  const allActiveMembers = members.filter((m) => m.status === "aktif");
  const dailySummary = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1)
    .filter((day) => day <= TODAY_DAY)
    .map((day) => {
      const count = allActiveMembers.filter((m) => isCellHadir(attendance[m.id]?.[day])).length;
      const total = allActiveMembers.length;
      const status = count > 15 ? "mantap" : count === 15 ? "aman" : "bahaya";
      return { day, count, total, status };
    });

  const handlePreviewSave = () => {
    const changes: ChangeRecord[] = [];
    members.forEach(m => {
      for (let day = 1; day <= TOTAL_DAYS; day++) {
        const oldVal = isCellHadir(remoteAttendance[m.id]?.[day]);
        const newVal = isCellHadir(attendance[m.id]?.[day]);
        if (oldVal !== newVal) {
          changes.push({
            memberId: m.id,
            memberName: m.name,
            day,
            oldStatus: oldVal,
            newStatus: newVal
          });
        }
      }
    });
    setPendingChanges(changes);
    setShowPreview(true);
  };

  const handleConfirmSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const currentMonthDoc = doc(db, "attendance", monthStr);
      await setDoc(currentMonthDoc, attendance);
      
      const logLines = pendingChanges.map(c => 
        `- ${c.memberName} (Tgl ${c.day}): ${c.oldStatus ? "Hadir" : "Alpha"} ➔ ${c.newStatus ? "Hadir" : "Alpha"}`
      );
      const detailMsg = logLines.length > 0 
        ? `Perubahan Absensi Manual:\n${logLines.join("\n")}`
        : `Absensi untuk bulan ${monthStr} diperbarui`;

      await logEdit("admin@gtamabar.com", detailMsg);
      
      setHasChanges(false);
      setShowPreview(false);
      toast.success("Absensi berhasil disimpan");
    } catch (e) {
      toast.error("Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 min-h-full flex flex-col gap-5">
      {/* Reset Confirm Modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReset(false)} />
          <div className="relative z-10 rounded-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: "#16161F", border: "1px solid #2A2A3A", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(225,112,85,0.15)" }}>
              <RotateCcw size={20} className="text-[var(--color-red)]" />
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-2">Reset Seluruh Absensi?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
              Semua data absensi dari <b className="text-white">seluruh bulan</b> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:text-white"
                style={{ background: "#1A1A24", border: "1px solid #2A2A3A" }}>
                Batal
              </button>
              <button onClick={async () => {
                setSaving(true);
                try {
                  const { getDocs, collection, deleteDoc } = await import("firebase/firestore");
                  const snap = await getDocs(collection(db, "attendance"));
                  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                  
                  setAttendance({});
                  setShowReset(false);
                  setHasChanges(false);
                  toast.success("Seluruh data absensi berhasil dihapus");
                } catch {
                  toast.error("Gagal mereset absensi");
                } finally {
                  setSaving(false);
                }
              }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--color-red)" }}>
                Reset Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditLog && (
        <AuditLogModal onClose={() => setShowAuditLog(false)} />
      )}

      {/* Save Preview Modal */}
      {showPreview && (
        <SavePreviewModal 
          changes={pendingChanges}
          monthStr={monthStr}
          saving={saving}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowPreview(false)}
        />
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Total Kehadiran</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white font-mono">
              {totalHadir.toLocaleString("id")}
            </span>
            <span className="text-[var(--color-text-muted)] text-lg font-mono">/ {maxPossible.toLocaleString("id")}</span>
          </div>
        </div>
        <div className="h-12 w-px bg-[var(--color-border)]" />
        <div className="flex-1">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Persentase</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono" style={{ color: "var(--color-green)" }}>
              {persen}%
            </span>
            <span className="text-[var(--color-green)] text-lg">↗</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(225,112,85,0.1)", color: "var(--color-red)", border: "1px solid rgba(225,112,85,0.2)" }}>
            <RotateCcw size={14} />
            Reset
          </button>
          
          <button onClick={() => setShowAuditLog(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(0,184,148,0.1)", color: "#00b894", border: "1px solid rgba(0,184,148,0.2)" }}>
            <FileText size={14} />
            Riwayat Edit
          </button>
          
          <button
            onClick={() => {
              const activeMembers = members.filter((m) => m.status === "aktif");
              const exportRows = activeMembers.map((m) => ({
                name: m.name,
                id: m.id,
                days: attendance[m.id] || {},
                total: countHadir(m.id),
                persen: `${((countHadir(m.id) / TOTAL_DAYS) * 100).toFixed(0)}%`,
                totalDays: TOTAL_DAYS,
              }));
              exportAttendanceCSV(
                exportRows,
                `Absensi_GTA_Mabar_${monthStr}`,
                format(currentDate, "MMMM yyyy", { locale: id })
              );
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
            <Download size={14} />
            Export Bulan Ini
          </button>
          <button
            disabled={exportingAll}
            onClick={async () => {
              setExportingAll(true);
              try {
                const { getDocs, collection } = await import("firebase/firestore");
                const snap = await getDocs(collection(db, "attendance"));
                const year = new Date().getFullYear();
                const activeMembers = members.filter((m) => m.status === "aktif");

                // Build list of months Jan → current month
                const nowDate = new Date();
                const monthsData: MonthAttendanceData[] = [];

                for (let m = 0; m <= nowDate.getMonth(); m++) {
                  const monthDate = new Date(year, m, 1);
                  const label = format(monthDate, "MMMM-yyyy", { locale: id });
                  const docSnap = snap.docs.find((d) => d.id === label);
                  const rawData = docSnap ? docSnap.data() : {};
                  const { getDaysInMonth: gDIM } = await import("date-fns");
                  monthsData.push({
                    monthLabel: label,
                    totalDays: gDIM(monthDate),
                    members: activeMembers,
                    attendance: rawData as Record<string, Record<number, unknown>>,
                  });
                }

                exportAllMonthsXLSX(monthsData, year);
                toast.success(`Export ${monthsData.length} bulan berhasil!`);
              } catch {
                toast.error("Gagal export. Coba lagi.");
              } finally {
                setExportingAll(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: exportingAll ? "var(--color-bg-tertiary)" : "rgba(108,92,231,0.15)", color: exportingAll ? "var(--color-text-muted)" : "#A29BFE", border: "1px solid rgba(108,92,231,0.3)" }}>
            {exportingAll ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {exportingAll ? "Mengekspor..." : `Export ${new Date().getFullYear()}`}
          </button>
          <button onClick={handlePreviewSave}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${hasChanges ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"}`}
            style={{ background: hasChanges ? "var(--color-accent)" : "var(--color-bg-tertiary)", color: "white", border: "1px solid transparent" }}>
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Daily Summary Toggle Panel */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        <button
          onClick={() => setShowSummary((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B894]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FDCB6E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E17055]" />
            </div>
            <span className="text-sm font-semibold text-white">Ringkasan Kehadiran Per Tanggal</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-muted)" }}>
              {dailySummary.length} hari kerja
            </span>
          </div>
          <span className="text-[var(--color-text-muted)] text-sm">{showSummary ? "▲ Tutup" : "▼ Buka"}</span>
        </button>

        {showSummary && (
          <div className="border-t border-[var(--color-border)]">
            {/* Legend */}
            <div className="px-5 py-3 flex items-center gap-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00B894]" />
                <span className="text-xs text-[var(--color-text-muted)]">Mantap (15+)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FDCB6E]" />
                <span className="text-xs text-[var(--color-text-muted)]">Aman (= 15)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E17055]" />
                <span className="text-xs text-[var(--color-text-muted)]">Bahaya (&lt; 15)</span>
              </div>
            </div>

            {/* Day grid */}
            {dailySummary.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">Belum ada data hari ini</div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {dailySummary.map(({ day, count, total, status }) => {
                  const color = status === "mantap" ? "#00B894" : status === "aman" ? "#FDCB6E" : "#E17055";
                  const bg = status === "mantap" ? "rgba(0,184,148,0.1)" : status === "aman" ? "rgba(253,203,110,0.1)" : "rgba(225,112,85,0.1)";
                  const label = status === "mantap" ? "Mantap" : status === "aman" ? "Aman" : "Bahaya";
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayName = format(dateObj, "EEE", { locale: id });
                  return (
                    <div key={day}
                      className="rounded-xl p-3 flex flex-col gap-1.5 transition-all hover:scale-[1.02]"
                      style={{ background: bg, border: `1px solid ${color}30` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{dayName}</span>
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      </div>
                      <span className="text-2xl font-black text-white">{day}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold" style={{ color }}>{count}</span>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>/ {total}</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spreadsheet */}
      <div className="rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        {/* Search & Month Navigator */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-[var(--color-text-muted)] outline-none transition-all"
              style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>
          <MonthSelector currentDate={currentDate} onChange={handleMonthChange} />
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "rgba(26,26,36,0.5)" }}>
                <th className="sticky left-0 z-10 text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-48"
                  style={{ background: "var(--color-bg-secondary)" }}>
                  Name / ID
                </th>
                {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => (
                  <th key={d}
                    className="text-center py-3 text-xs font-semibold w-8"
                    style={{
                      color: weekends.has(d) ? "var(--color-red)" : d > TODAY_DAY ? "var(--color-text-muted)" : "var(--color-text-muted)",
                      opacity: d > TODAY_DAY ? 0.4 : 1,
                    }}>
                    {d}
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, ri) => {
                const hadir = countHadir(member.id);
                const pct = ((hadir / 22) * 100).toFixed(0);
                return (
                  <tr key={member.id}
                    className="border-t transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: "var(--color-border-subtle)" }}>
                    {/* Name cell */}
                    <td className="sticky left-0 z-10 px-4 py-2.5"
                      style={{ background: ri % 2 === 0 ? "var(--color-bg-secondary)" : "#13131B" }}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(member.id)}`}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm leading-none">{member.name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{member.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => {
                      const isFuture = d > TODAY_DAY;
                      const isWeekend = weekends.has(d);
                      const isHadir = isCellHadir(attendance[member.id]?.[d]);
                      const canEdit = !isFuture;

                      return (
                        <td key={d} className="text-center py-1.5 px-0.5">
                          <button
                            onClick={() => toggleCell(member.id, d)}
                            disabled={!canEdit}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-xs font-bold transition-all
                              ${isFuture
                                ? "cursor-default opacity-25"
                                : isHadir
                                ? "hover:opacity-80 active:scale-90"
                                : "hover:bg-white/5 active:scale-90"
                              }`}
                            style={isHadir
                              ? { background: "rgba(0,184,148,0.2)", color: "var(--color-green)" }
                              : isWeekend
                              ? { color: "var(--color-text-muted)" }
                              : {}
                            }>
                            {isHadir ? (
                              <span className="text-base leading-none">✓</span>
                            ) : isWeekend ? (
                              <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
                            ) : isFuture ? (
                              <span className="text-[10px] text-[var(--color-text-muted)]">·</span>
                            ) : (
                              <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    <td className="text-center px-3 py-2.5">
                      <span className="font-bold font-mono text-white text-sm px-2 py-0.5 rounded-md"
                        style={{ background: hadir >= 10 ? "rgba(0,184,148,0.15)" : "rgba(225,112,85,0.15)", color: hadir >= 10 ? "var(--color-green)" : "var(--color-red)" }}>
                        {hadir}
                      </span>
                    </td>
                    <td className="text-center px-3 py-2.5 text-sm font-mono text-[var(--color-text-secondary)]">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
