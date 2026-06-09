import { X, FileText, Activity } from "lucide-react";
import { useEditLogs } from "@/lib/firestore";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

export function AuditLogModal({ onClose }: { onClose: () => void }) {
  const { editLogs, loading } = useEditLogs();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="text-[#00b894]" size={24} />
              Riwayat Perubahan Absensi
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Catatan aktivitas perubahan absensi secara manual oleh Admin.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[var(--color-bg-primary)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-t-[#00b894] border-r-[#00b894] border-b-transparent border-l-transparent animate-spin"></div>
              <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat riwayat...</p>
            </div>
          ) : editLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
                <Activity size={24} className="text-[var(--color-text-muted)]" />
              </div>
              <h4 className="text-white font-medium mb-1">Belum Ada Riwayat</h4>
              <p className="text-[var(--color-text-muted)] text-sm max-w-xs">Belum ada Admin yang melakukan perubahan absensi secara manual.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {editLogs.map((log) => (
                <div key={log.id} className="rounded-xl p-5 border transition-all hover:bg-white/[0.02]"
                  style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00b894]"></span>
                      {log.adminEmail}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]" title={new Date(log.timestamp).toLocaleString()}>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-tertiary)] p-3 rounded-lg mt-3 border border-[var(--color-border-subtle)]">
                    {log.changes}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
