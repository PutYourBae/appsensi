"use client";

import { useState } from "react";
import { getInitials, getAvatarColor } from "@/lib/mock-data";
import { useMembers, Member } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Search, Plus, Pencil, Trash2, AlertCircle, X, Check } from "lucide-react";

export default function AnggotaPage() {
  const { members, loading } = useMembers();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  // Prioritize pending members at the top
  const sortedMembers = [...members].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return 0;
  });

  const filteredMembers = sortedMembers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!formData.name) return;
    const newId = `SOT-${String(members.length + 1).padStart(3, "0")}`;
    const newMember: Member = { id: newId, name: formData.name, createdAt: new Date().toISOString().split("T")[0], status: "aktif" };
    await setDoc(doc(db, "members", newId), newMember);
    setShowAddForm(false);
    setFormData({ name: "" });
  };

  const handleEdit = async (id: string) => {
    if (!formData.name) return;
    await updateDoc(doc(db, "members", id), { name: formData.name });
    setShowEditForm(null);
    setFormData({ name: "" });
  };

  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, "members", id), { status: "nonaktif" });
    setShowDeleteConfirm(null);
  };

  const handleApprove = async (id: string, createdAt: string) => {
    await updateDoc(doc(db, "members", id), { status: "aktif" });

    // Auto attend on registration day
    const day = new Date(createdAt).getDate();
    const monthId = "Mei-2026"; // Harusnya dinamis berdasarkan createdAt, tapi ini contoh
    const attendanceRef = doc(db, "attendance", monthId);
    await setDoc(attendanceRef, { [id]: { [day]: true } }, { merge: true });
  };

  const handleReject = async (id: string) => {
    await deleteDoc(doc(db, "members", id));
  };

  if (loading) return null;

  return (
    <div className="p-6 min-h-full flex flex-col gap-6">
      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative z-10 rounded-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: "#16161F", border: "1px solid #2A2A3A", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(225,112,85,0.15)" }}>
              <Trash2 size={20} className="text-[var(--color-red)]" />
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-2">Hapus Anggota?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
              Anggota yang dihapus tidak akan muncul lagi di daftar absensi, tapi datanya tetap tersimpan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:text-white"
                style={{ background: "#1A1A24", border: "1px solid #2A2A3A" }}>
                Batal
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--color-red)" }}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddForm || showEditForm) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddForm(false); setShowEditForm(null); }} />
          <div className="relative z-10 rounded-2xl w-full max-w-md mx-4 overflow-hidden"
            style={{ background: "#16161F", border: "1px solid #2A2A3A", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{showAddForm ? "Tambah Anggota Baru" : "Edit Anggota"}</h3>
              <button onClick={() => { setShowAddForm(false); setShowEditForm(null); }} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block tracking-wide uppercase">Nama Lengkap</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[var(--color-text-muted)] outline-none transition-all"
                  style={{ background: "#1A1A24", border: "1px solid #2A2A3A" }}
                  onFocus={(e) => e.target.style.borderColor = "#6C5CE7"}
                  onBlur={(e) => e.target.style.borderColor = "#2A2A3A"}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-[rgba(26,26,36,0.3)] border-t border-[var(--color-border)] flex justify-end gap-3">
              <button onClick={() => { setShowAddForm(false); setShowEditForm(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-white transition-all">
                Batal
              </button>
              <button onClick={() => showAddForm ? handleAdd() : handleEdit(showEditForm!)}
                disabled={!formData.name}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--color-accent)" }}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Anggota Tim</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">Kelola data anggota yang terdaftar di sistem.</p>
        </div>
        <button onClick={() => { setFormData({ name: "" }); setShowAddForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 glow-accent"
          style={{ background: "linear-gradient(135deg, #7C6FF5 0%, #6C5CE7 100%)" }}>
          <Plus size={16} />
          Tambah Anggota
        </button>
      </div>

      {/* Content */}
      <div className="rounded-2xl flex flex-col flex-1"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau ID anggota..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-[var(--color-text-muted)] outline-none transition-all"
              style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)" }}
              onFocus={(e) => (e.target.style.borderColor = "#6C5CE7")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">
            Total: <span className="text-white">{members.filter(m => m.status === "aktif").length}</span> Anggota Aktif
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(26,26,36,0.5)" }}>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Anggota</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">ID Member</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Tanggal Bergabung</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-t transition-colors hover:bg-white/[0.02]" 
                  style={{ 
                    borderColor: "var(--color-border-subtle)",
                    background: member.status === "pending" ? "rgba(253,203,110,0.03)" : "transparent"
                  }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${getAvatarColor(member.id)} ${member.status === "nonaktif" ? "opacity-40 grayscale" : ""}`}>
                        {getInitials(member.name)}
                      </div>
                      <span className={`font-semibold ${member.status === "aktif" ? "text-white" : member.status === "pending" ? "text-[var(--color-yellow)]" : "text-[var(--color-text-muted)] line-through"}`}>
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)] font-mono">{member.id}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                    {new Date(member.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    {member.status === "aktif" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ background: "rgba(0,184,148,0.1)", color: "var(--color-green)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
                        Aktif
                      </span>
                    ) : member.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ background: "rgba(253,203,110,0.1)", color: "var(--color-yellow)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-yellow)] animate-pulse" />
                        Menunggu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ background: "rgba(225,112,85,0.1)", color: "var(--color-red)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-red)]" />
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {member.status === "pending" ? (
                        <>
                          <button onClick={() => handleApprove(member.id, member.createdAt)}
                            className="p-2 rounded-lg text-[var(--color-green)] hover:text-white hover:bg-[var(--color-green)] transition-all">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleReject(member.id)}
                            className="p-2 rounded-lg text-[var(--color-red)] hover:text-white hover:bg-[var(--color-red)] transition-all">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setFormData({ name: member.name }); setShowEditForm(member.id); }}
                            disabled={member.status !== "aktif"}
                            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(member.id)}
                            disabled={member.status !== "aktif"}
                            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-muted)] transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: "var(--color-bg-tertiary)" }}>
                      <AlertCircle size={20} className="text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-[var(--color-text-secondary)] font-medium">Tidak ada anggota yang ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
