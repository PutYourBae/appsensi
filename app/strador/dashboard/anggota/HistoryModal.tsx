import { X, Clock, Calendar, CheckCircle2, XCircle, Activity } from "lucide-react";
import { useMemberHistory } from "@/lib/firestore";
import { useEffect, useState } from "react";

export function HistoryModal({ 
  member, 
  onClose 
}: { 
  member: { id: string, name: string, discord_id: string }; 
  onClose: () => void;
}) {
  const { history, loading } = useMemberHistory(member.discord_id);
  
  // Format total hours and minutes
  const formatDuration = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins} Menit`;
    return `${hours} Jam ${mins} Menit`;
  };

  // Format time strictly to HH:mm
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-[#5865F2]" size={24} />
              Riwayat Bermain
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 flex items-center gap-2">
              <span className="text-white font-medium">{member.name}</span>
              <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
              <span className="font-mono text-[#5865F2]">{member.discord_id}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-t-[#5865F2] border-r-[#5865F2] border-b-transparent border-l-transparent animate-spin"></div>
              <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat data dari Discord...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
                <Activity size={24} className="text-[var(--color-text-muted)]" />
              </div>
              <h4 className="text-white font-medium mb-1">Belum Ada Riwayat</h4>
              <p className="text-[var(--color-text-muted)] text-sm max-w-xs">Anggota ini belum memiliki catatan bermain yang terekam oleh bot.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((session) => (
                <div key={session.id} className="rounded-xl p-5 border transition-all hover:bg-white/[0.02]"
                  style={{ background: "var(--color-bg-tertiary)", borderColor: "var(--color-border-subtle)" }}>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(88,101,242,0.1)", color: "#5865F2" }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">
                          {new Date(session.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h4>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          Total Waktu: <span className="text-white font-medium">{formatDuration(session.total_minutes_valid)}</span>
                        </p>
                      </div>
                    </div>
                    <div>
                      {session.status === "HADIR" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(0,184,148,0.15)] text-[var(--color-green)] border border-[rgba(0,184,148,0.2)]">
                          <CheckCircle2 size={14} /> Hadir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(225,112,85,0.15)] text-[var(--color-red)] border border-[rgba(225,112,85,0.2)]">
                          <XCircle size={14} /> Belum Cukup
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Segments/Login Log */}
                  <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                    <h5 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Rincian Log In/Out</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {session.segments.map((seg, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#5865F2]"></div>
                          <div className="flex-1 text-sm">
                            <span className="text-[var(--color-text-secondary)]">{formatTime(seg.start)}</span>
                            <span className="text-[var(--color-text-muted)] mx-2">→</span>
                            <span className="text-[var(--color-text-secondary)]">{formatTime(seg.end)}</span>
                          </div>
                          <span className="text-xs font-medium text-white">{seg.duration} mnt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
