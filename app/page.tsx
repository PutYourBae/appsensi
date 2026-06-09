"use client";

import { useState, useEffect } from "react";
import { format, getDaysInMonth, isWeekend } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, Plus, Clock } from "lucide-react";
import { getInitials, getAvatarColor } from "@/lib/mock-data";
import { useMembers, useSettings } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";

export default function UserPage() {
  const { members, loading: loadingMembers } = useMembers();
  const { settings } = useSettings();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [motivasi, setMotivasi] = useState("");
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Real-time: siapa yang sudah absen HARI INI
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const monthStr = format(new Date(), "MMMM-yyyy", { locale: id });
  const dayNum = new Date().getDate();

  const [todayAttendees, setTodayAttendees] = useState<{ id: string; name: string; time: string }[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<Record<string, Record<number, unknown>>>({});
  const [showDailySummary, setShowDailySummary] = useState(false);

  useEffect(() => {
    // Listen to the attendance document for this month
    const docRef = doc(db, "attendance", monthStr);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) { setTodayAttendees([]); return; }
      const data = snap.data();
      // Find all members who have hadir=true on today's day
      const todayList: { id: string; name: string; time: string }[] = [];
      Object.entries(data).forEach(([memberId, days]) => {
        const dayData = (days as Record<string, unknown>)[dayNum];
        if (dayData === true || (typeof dayData === "object" && dayData !== null && (dayData as Record<string, unknown>).hadir === true)) {
          const member = members.find(m => m.id === memberId);
          const timeStr = typeof dayData === "object" && dayData !== null
            ? ((dayData as Record<string, unknown>).time as string) || "--:--"
            : "--:--";
          todayList.push({ id: memberId, name: member?.name || memberId, time: timeStr });
        }
      });
      // Sort most recent first based on time string
      todayList.sort((a, b) => b.time.localeCompare(a.time));
      setTodayAttendees(todayList);
      // Also capture full month data for daily summary
      setMonthAttendance(data as Record<string, Record<number, unknown>>);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr, dayNum, members.length]);

  const pendingMembers = members.filter(m => m.status === "pending");
  const activeMembers = members.filter(m => m.status === "aktif");

  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });
  const alreadyAbsenIds = todayAttendees.map((a) => a.id);

  const toggleMember = (memberId: string) => {
    if (alreadyAbsenIds.includes(memberId)) return;
    setSelectedIds((prev) =>
      prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId]
    );
  };

  const handleAbsen = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);

    const now = format(new Date(), "HH:mm");
    const docRef = doc(db, "attendance", monthStr);

    // Fetch current doc first to merge (not overwrite)
    const snap = await getDoc(docRef);
    const existing = snap.exists() ? snap.data() : {};

    // Build update: mark each selected member as hadir on today's day
    const update: Record<string, unknown> = { ...existing };
    for (const memberId of selectedIds) {
      if (alreadyAbsenIds.includes(memberId)) continue; // skip duplicates
      update[memberId] = {
        ...(existing[memberId] as Record<string, unknown> || {}),
        [dayNum]: { hadir: true, time: now, date: todayStr },
      };
    }

    await setDoc(docRef, update);
    setSelectedIds([]);

    const mList = settings?.motivasi ? settings.motivasi.split("\n").filter(Boolean) : ["Hadir itu keren! 🚀"];
    const rand = mList[Math.floor(Math.random() * mList.length)];
    setMotivasi(rand);
    setShowSuccess(true);
    setLoading(false);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleAddMember = async () => {
    if (!newName.trim()) return;
    const newId = `SOT-${String(members.length + 1).padStart(3, "0")}`;
    const newMember = {
      id: newId,
      name: newName.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      status: "pending",
    };
    await setDoc(doc(db, "members", newId), newMember);
    setNewName("");
    setShowAddForm(false);
    toast.success("Pendaftaran berhasil! Tunggu persetujuan admin.");
  };

  if (loadingMembers) return null;

  // Build daily summary for the current month
  const now2 = new Date();
  const TOTAL_DAYS = getDaysInMonth(now2);
  const TODAY_DAY = now2.getDate();
  const weekendsSet = new Set<number>();
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    if (isWeekend(new Date(now2.getFullYear(), now2.getMonth(), d))) weekendsSet.add(d);
  }
  const dailySummary = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1)
    .filter((day) => day <= TODAY_DAY)
    .map((day) => {
      const count = activeMembers.filter((m) => {
        const cell = monthAttendance[m.id]?.[day];
        return cell === true || (typeof cell === "object" && cell !== null && (cell as Record<string, unknown>).hadir === true);
      }).length;
      const total = activeMembers.length;
      const status = count > 15 ? "mantap" : count === 15 ? "aman" : "bahaya";
      return { day, count, total, status };
    });

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-16 px-4"
      style={{ background: "radial-gradient(ellipse at top, #1A1030 0%, #0A0A0F 60%)" }}>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowSuccess(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          {/* Confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="absolute confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 40}%`,
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                  background: ["#6C5CE7","#00B894","#FDCB6E","#E17055","#74B9FF","#FD79A8"][Math.floor(Math.random()*6)],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1.2 + Math.random() * 0.8}s`,
                }} />
            ))}
          </div>
          <div className="relative z-10 glass rounded-2xl p-10 max-w-md w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-3">Absensi Berhasil!</h2>
            <p className="text-lg text-[var(--color-text-secondary)] italic leading-relaxed">
              &quot;{motivasi}&quot;
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-6">
              Klik di mana saja untuk tutup
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-2xl mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "rgba(108,92,231,0.15)", color: "#8B7FE8", border: "1px solid rgba(108,92,231,0.3)" }}>
          <Clock size={12} />
          {today}
        </div>
        <h1 className="text-5xl font-black text-white leading-tight tracking-tight">
          Siapa yang hadir<br />
          <span className="text-gradient">hari ini?</span> 👋
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-4 text-base">
          Pilih anggota yang hadir, lalu tekan Absen.
        </p>
      </div>

      {/* Member Chip Selector */}
      <div className="w-full max-w-2xl">
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {activeMembers.map((member) => {
            const isAbsen = alreadyAbsenIds.includes(member.id);
            const isSelected = selectedIds.includes(member.id);
            return (
              <button key={member.id} onClick={() => toggleMember(member.id)}
                disabled={isAbsen}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                  ${isAbsen
                    ? "opacity-40 cursor-not-allowed"
                    : isSelected
                    ? "glow-accent scale-105"
                    : "hover:scale-105 hover:border-[var(--color-accent)]"
                  }`}
                style={{
                  background: isSelected ? "rgba(108,92,231,0.25)" : "rgba(26,26,36,0.8)",
                  border: `1px solid ${isSelected ? "#6C5CE7" : "#2A2A3A"}`,
                  color: isSelected ? "#C5BFFF" : isAbsen ? "#555565" : "#8888A0",
                }}>
                {isSelected && <CheckCircle2 size={14} className="text-[var(--color-accent)]" />}
                {isAbsen && <CheckCircle2 size={14} className="text-[var(--color-green)]" />}
                {member.name}
              </button>
            );
          })}
        </div>

        {/* ABSEN Button */}
        <button onClick={handleAbsen} disabled={selectedIds.length === 0 || loading}
          className={`w-full py-5 rounded-2xl text-xl font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3
            ${selectedIds.length > 0 && !loading
              ? "glow-accent hover:scale-[1.02] active:scale-[0.98]"
              : "opacity-40 cursor-not-allowed"
            }`}
          style={{
            background: selectedIds.length > 0 && !loading
              ? "linear-gradient(135deg, #7C6FF5 0%, #6C5CE7 50%, #5A4BCD 100%)"
              : "#2A2A3A",
            color: "#fff",
          }}>
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              ABSEN
              <span className="text-2xl">🫰</span>
              {selectedIds.length > 0 && (
                <span className="text-sm font-normal opacity-70">
                  ({selectedIds.length} dipilih)
                </span>
              )}
            </>
          )}
        </button>

        {/* Add New Member */}
        <div className="mt-4 text-center">
          {!showAddForm ? (
            <button onClick={() => setShowAddForm(true)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1.5 mx-auto">
              <Plus size={14} />
              Tambah anggota baru
            </button>
          ) : (
            <div className="flex gap-2 mt-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama anggota..."
                className="flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
              />
              <button onClick={() => { setShowAddForm(false); setNewName(""); }}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:border-[var(--color-red)] hover:text-[var(--color-red)] transition-all">
                Batal
              </button>
              <button onClick={handleAddMember}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: "var(--color-accent)" }}>
                Simpan
              </button>
            </div>
          )}
        </div>

        {/* Pending Members Section */}
        {pendingMembers.length > 0 && (
          <div className="mt-6 p-4 rounded-xl" style={{ background: "rgba(253,203,110,0.05)", border: "1px dashed rgba(253,203,110,0.3)" }}>
            <p className="text-xs font-medium text-[var(--color-yellow)] uppercase tracking-wider mb-2 text-center">Menunggu Persetujuan Admin</p>
            <div className="flex flex-wrap justify-center gap-2">
              {pendingMembers.map(pm => (
                <span key={pm.id} className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2.5 py-1 rounded-md">
                  {pm.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Daily Summary Widget */}
        <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: "rgba(26,26,36,0.7)", border: "1px solid #2A2A3A" }}>
          <button
            onClick={() => setShowDailySummary((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00B894]" />
                <span className="w-2 h-2 rounded-full bg-[#FDCB6E]" />
                <span className="w-2 h-2 rounded-full bg-[#E17055]" />
              </div>
              <span className="text-sm font-semibold text-white">Status Kehadiran Bulan Ini</span>
            </div>
            <span className="text-[var(--color-text-muted)] text-xs">{showDailySummary ? "▲" : "▼"}</span>
          </button>

          {showDailySummary && (
            <div className="border-t border-[#2A2A3A] p-3">
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00B894]" />
                  <span className="text-[10px] text-[var(--color-text-muted)]">Mantap (15+)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FDCB6E]" />
                  <span className="text-[10px] text-[var(--color-text-muted)]">Aman (=15)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E17055]" />
                  <span className="text-[10px] text-[var(--color-text-muted)]">Bahaya (&lt;15)</span>
                </div>
              </div>
              {dailySummary.length === 0 ? (
                <p className="text-center text-xs text-[var(--color-text-muted)] py-4">Belum ada data hari ini</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {dailySummary.map(({ day, count, total, status }) => {
                    const color = status === "mantap" ? "#00B894" : status === "aman" ? "#FDCB6E" : "#E17055";
                    const bg = status === "mantap" ? "rgba(0,184,148,0.1)" : status === "aman" ? "rgba(253,203,110,0.1)" : "rgba(225,112,85,0.1)";
                    const dateObj = new Date(now2.getFullYear(), now2.getMonth(), day);
                    const dayName = format(dateObj, "EEE", { locale: id });
                    return (
                      <div key={day} className="rounded-xl p-2.5 flex flex-col gap-1"
                        style={{ background: bg, border: `1px solid ${color}25` }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-medium" style={{ color: "var(--color-text-muted)" }}>{dayName}</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        </div>
                        <span className="text-xl font-black text-white">{day}</span>
                        <span className="text-xs font-bold" style={{ color }}>{count}<span className="text-[9px] font-normal text-[var(--color-text-muted)]" >/{total}</span></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-[var(--color-border)]" />

        {/* Today's Attendees */}
        <div>
          <div className="flex items-center gap-2 mb-4 text-sm text-[var(--color-text-secondary)]">
            <Clock size={14} />
            <span>Yang sudah absen hari ini</span>
            <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(0,184,148,0.15)", color: "#00B894" }}>
              {todayAttendees.length} orang
            </span>
          </div>

          <div className="space-y-2">
            {todayAttendees.length === 0 && (
              <p className="text-center text-[var(--color-text-muted)] text-sm py-6">
                Belum ada yang absen hari ini
              </p>
            )}
            {todayAttendees.map((a, i) => (
              <div key={a.id + i}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all hover:border-[var(--color-border)]"
                style={{ background: "rgba(26,26,36,0.6)", border: "1px solid #1E1E2E" }}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${getAvatarColor(a.id)}`}>
                  {getInitials(a.name)}
                </div>
                <span className="font-medium text-white flex-1">{a.name}</span>
                <span className="text-xs text-[var(--color-text-muted)] font-mono mr-2">
                  {a.time} WIB
                </span>
                <CheckCircle2 size={16} className="text-[var(--color-green)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
