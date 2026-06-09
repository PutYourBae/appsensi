import { X, FileText, Activity, ArrowRight, CheckCircle2, XCircle, Calendar, User } from "lucide-react";
import { useEditLogs } from "@/lib/firestore";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Parse "- Robert Lim (Tgl 9): Alpha → Hadir" into structured data
function parseChangeLine(line: string) {
  const match = line.match(/^-?\s*(.+?)\s+\(Tgl\s+(\d+)\):\s*(.+?)\s*[→➔]\s*(.+)$/);
  if (!match) return null;
  return {
    name: match[1].trim(),
    day: parseInt(match[2]),
    from: match[3].trim(),
    to: match[4].trim(),
  };
}

function parseChanges(changesText: string) {
  const lines = changesText.split("\n").map(l => l.trim()).filter(Boolean);
  const records = lines.map(parseChangeLine).filter(Boolean);
  return records;
}

function StatusBadge({ status }: { status: string }) {
  const isHadir = status.toLowerCase() === "hadir";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
      style={
        isHadir
          ? { background: "rgba(0,184,148,0.15)", color: "#00b894", border: "1px solid rgba(0,184,148,0.3)" }
          : { background: "rgba(225,112,85,0.15)", color: "#e17055", border: "1px solid rgba(225,112,85,0.3)" }
      }
    >
      {isHadir ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {status}
    </span>
  );
}

export function AuditLogModal({ onClose }: { onClose: () => void }) {
  const { editLogs, loading } = useEditLogs();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,184,148,0.12)", border: "1px solid rgba(0,184,148,0.25)" }}>
              <FileText className="text-[#00b894]" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Riwayat Perubahan Absensi</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Catatan setiap edit manual yang dilakukan Admin</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4" style={{ background: "var(--color-bg-primary)" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-t-[#00b894] border-r-[#00b894] border-b-transparent border-l-transparent animate-spin" />
              <p className="text-[var(--color-text-muted)] text-sm">Memuat riwayat...</p>
            </div>
          ) : editLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
                <Activity size={24} className="text-[var(--color-text-muted)]" />
              </div>
              <h4 className="text-white font-semibold mb-1">Belum Ada Riwayat</h4>
              <p className="text-[var(--color-text-muted)] text-sm max-w-xs">Belum ada Admin yang melakukan perubahan absensi secara manual.</p>
            </div>
          ) : (
            editLogs.map((log) => {
              const parsedChanges = parseChanges(log.changes);
              const isDetailed = parsedChanges.length > 0;
              const timestamp = new Date(log.timestamp);

              return (
                <div
                  key={log.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid var(--color-border-subtle)", background: "var(--color-bg-secondary)" }}
                >
                  {/* Log Header */}
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--color-border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #6c5ce7, #a29bfe)" }}>
                        <User size={13} />
                      </div>
                      <span className="text-sm font-semibold text-white">{log.adminEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Calendar size={12} />
                      <span title={format(timestamp, "dd MMMM yyyy, HH:mm", { locale: localeId })}>
                        {format(timestamp, "dd MMM yyyy · HH:mm", { locale: localeId })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-muted)" }}>
                        {formatDistanceToNow(timestamp, { addSuffix: true, locale: localeId })}
                      </span>
                    </div>
                  </div>

                  {/* Changes Body */}
                  <div className="px-5 py-4">
                    {isDetailed ? (
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                          {parsedChanges.length} Perubahan:
                        </p>
                        {parsedChanges.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
                            style={{ background: "var(--color-bg-tertiary)", border: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            {/* Member + Day */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: "rgba(108,92,231,0.15)", color: "#a29bfe" }}
                              >
                                {c!.day}
                              </div>
                              <span className="font-semibold text-white text-sm truncate">{c!.name}</span>
                            </div>

                            {/* Before → After */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={c!.from} />
                              <ArrowRight size={14} className="text-[var(--color-text-muted)]" />
                              <StatusBadge status={c!.to} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] italic">{log.changes}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
