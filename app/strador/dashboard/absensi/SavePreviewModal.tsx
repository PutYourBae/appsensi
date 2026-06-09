import { X, Save, ArrowRight, AlertCircle } from "lucide-react";

export interface ChangeRecord {
  memberId: string;
  memberName: string;
  day: number;
  oldStatus: boolean;
  newStatus: boolean;
}

interface SavePreviewModalProps {
  changes: ChangeRecord[];
  monthStr: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function SavePreviewModal({ changes, monthStr, onConfirm, onCancel, saving }: SavePreviewModalProps) {
  // monthStr is already a display string like "Juni-2026", just clean the dash
  const monthName = monthStr.replace("-", " ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-[var(--color-accent)]" size={24} />
              Konfirmasi Perubahan
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Anda akan menyimpan perubahan absensi untuk bulan {monthName}.
            </p>
          </div>
          <button onClick={onCancel} disabled={saving} className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Changes List */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[50vh] bg-[var(--color-bg-primary)]">
          <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Preview Detail Perubahan:</h4>
          
          {changes.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm italic">Tidak ada perubahan yang terdeteksi.</p>
          ) : (
            <div className="space-y-2">
              {changes.map((change, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                  <div>
                    <span className="font-semibold text-white">{change.memberName}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2 bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full">Tgl {change.day}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={change.oldStatus ? "text-[#00b894]" : "text-[var(--color-red)]"}>
                      {change.oldStatus ? "Hadir" : "Alpha"}
                    </span>
                    <ArrowRight size={14} className="text-[var(--color-text-muted)] mx-1" />
                    <span className={change.newStatus ? "text-[#00b894]" : "text-[var(--color-red)]"}>
                      {change.newStatus ? "Hadir" : "Alpha"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-[var(--color-border)] flex gap-3">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ border: "1px solid var(--color-border)" }}>
            Batal
          </button>
          <button onClick={onConfirm} disabled={saving || changes.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-accent)", boxShadow: "0 4px 12px rgba(108, 92, 231, 0.2)" }}>
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? "Menyimpan..." : "Simpan Sekarang"}
          </button>
        </div>

      </div>
    </div>
  );
}
