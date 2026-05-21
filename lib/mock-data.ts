export type MemberStatus = "aktif" | "nonaktif" | "pending";

export interface Member {
  id: string;
  name: string;
  createdAt: string;
  status: MemberStatus;
}

// Mock Members
export const mockMembers: Member[] = [
  { id: "SOT-001", name: "Budi Santoso", createdAt: "2026-01-05", status: "aktif" },
  { id: "SOT-002", name: "Siti Aminah", createdAt: "2026-01-05", status: "aktif" },
  { id: "SOT-003", name: "Rudi Hermawan", createdAt: "2026-01-10", status: "aktif" },
  { id: "SOT-004", name: "Dewi Lestari", createdAt: "2026-01-10", status: "aktif" },
  { id: "SOT-005", name: "Agus Pratama", createdAt: "2026-01-15", status: "aktif" },
  { id: "SOT-006", name: "Nina Wulandari", createdAt: "2026-02-01", status: "aktif" },
  { id: "SOT-007", name: "Fajar Sidik", createdAt: "2026-02-01", status: "aktif" },
  { id: "SOT-008", name: "Tari Permata", createdAt: "2026-02-10", status: "aktif" },
  { id: "SOT-009", name: "Dian Sastro", createdAt: "2026-03-01", status: "aktif" },
  { id: "SOT-010", name: "Reza Rahadian", createdAt: "2026-03-15", status: "aktif" },
  { id: "SOT-011", name: "Ahmad Dani", createdAt: "2026-05-20", status: "pending" },
  { id: "SOT-012", name: "Siska Saraswati", createdAt: "2026-05-21", status: "pending" },
];

// Attendance data for May 2026 (1 = hadir, 0 = tidak hadir, null = future/weekend)
export const mockAttendance: Record<string, Record<number, boolean>> = {
  "SOT-001": { 1:true, 2:true, 3:false, 4:true, 5:true, 6:false, 7:false, 8:true, 9:true, 10:true, 11:true, 12:false, 13:false, 14:true, 15:true, 16:true, 17:false, 18:true, 19:true, 20:true, 21:true, 22:true },
  "SOT-002": { 1:true, 2:true, 3:true, 4:false, 5:true, 6:false, 7:false, 8:true, 9:true, 10:false, 11:true, 12:false, 13:false, 14:true, 15:true, 16:true, 17:true, 18:true, 19:false, 20:true, 21:true, 22:true },
  "SOT-003": { 1:true, 2:false, 3:true, 4:true, 5:false, 6:false, 7:false, 8:false, 9:true, 10:true, 11:false, 12:false, 13:false, 14:true, 15:false, 16:true, 17:true, 18:false, 19:true, 20:false, 21:true, 22:false },
  "SOT-004": { 1:true, 2:true, 3:true, 4:true, 5:true, 6:false, 7:false, 8:true, 9:true, 10:true, 11:true, 12:false, 13:false, 14:true, 15:true, 16:true, 17:true, 18:true, 19:true, 20:true, 21:true, 22:true },
  "SOT-005": { 1:false, 2:false, 3:true, 4:false, 5:false, 6:false, 7:false, 8:false, 9:false, 10:true, 11:false, 12:false, 13:false, 14:false, 15:true, 16:false, 17:false, 18:false, 19:false, 20:false, 21:false, 22:false },
  "SOT-006": { 1:true, 2:true, 3:false, 4:true, 5:true, 6:false, 7:false, 8:true, 9:false, 10:true, 11:true, 12:false, 13:false, 14:true, 15:true, 16:false, 17:true, 18:true, 19:true, 20:true, 21:false, 22:true },
  "SOT-007": { 1:true, 2:true, 3:true, 4:true, 5:false, 6:false, 7:false, 8:true, 9:true, 10:true, 11:false, 12:false, 13:false, 14:true, 15:true, 16:true, 17:false, 18:true, 19:true, 20:false, 21:true, 22:true },
  "SOT-008": { 1:false, 2:true, 3:true, 4:false, 5:true, 6:false, 7:false, 8:true, 9:true, 10:true, 11:true, 12:false, 13:false, 14:false, 15:true, 16:true, 17:true, 18:true, 19:true, 20:true, 21:true, 22:true },
  "SOT-009": { 1:true, 2:true, 3:true, 4:true, 5:true, 6:false, 7:false, 8:true, 9:true, 10:true, 11:true, 12:false, 13:false, 14:true, 15:true, 16:true, 17:true, 18:true, 19:true, 20:true, 21:true, 22:true },
  "SOT-010": { 1:true, 2:false, 3:true, 4:true, 5:true, 6:false, 7:false, 8:true, 9:false, 10:true, 11:true, 12:false, 13:false, 14:true, 15:true, 16:false, 17:true, 18:true, 19:false, 20:true, 21:true, 22:false },
};

// Already attended today
export const mockTodayAttendees = [
  { id: "SOT-008", name: "Tari Permata", time: "08:14" },
  { id: "SOT-007", name: "Fajar Sidik", time: "08:05" },
  { id: "SOT-009", name: "Dian Sastro", time: "07:59" },
];

// Settings
export const mockSettings = {
  minAttendance: 10,
  maxAttendance: 22,
  saldoPembagian: 10000000,
  activeMonth: "2026-05",
};

// Motivasi Gen-Z
export const motivasiList = [
  "Kalau mau hasil gede ya jangan males masuk 😏",
  "Yang rajin hadir biasanya duitnya juga paling tebel 🔥",
  "Absen dulu baru sok capek 😎",
  "Konsisten itu bukan bakat, itu pilihan. Pilih bijak 💀",
  "Yang sering absen, lihat aja nanti pas pembagian 👀",
  "Hadir = respek ke tim. Gak hadir = ya tau sendiri 🙄",
  "Bukan soal mau, tapi soal harus. Kamu udah hadir, itu cukup 🫡",
  "Orang sukses dateng duluan, bukan nungguin mood 🚀",
  "Gajimu ngikut kehadiranmu. Simple math 📊",
  "Ngeluh capek? Hadir dulu, capeknya baru valid 💪",
];

// Edit logs
export const mockEditLogs = [
  { id: "log-001", adminEmail: "admin@strador.com", memberName: "Budi Santoso", editedAt: "22 Mei 2026, 10:30", targetDate: "20 Mei 2026", action: "ADD" as const },
  { id: "log-002", adminEmail: "admin@strador.com", memberName: "Siti Aminah", editedAt: "21 Mei 2026, 09:00", targetDate: "19 Mei 2026", action: "REMOVE" as const },
  { id: "log-003", adminEmail: "admin@strador.com", memberName: "Rudi Hermawan", editedAt: "20 Mei 2026, 14:15", targetDate: "18 Mei 2026", action: "ADD" as const },
  { id: "log-004", adminEmail: "admin@strador.com", memberName: "Dewi Lestari", editedAt: "19 Mei 2026, 11:45", targetDate: "17 Mei 2026", action: "ADD" as const },
];

// Helper: count attendance for a member
export function countAttendance(memberId: string): number {
  const data = mockAttendance[memberId] || {};
  return Object.values(data).filter(Boolean).length;
}

// Helper: calculate income distribution
export function calculateIncome(members: typeof mockMembers, settings: typeof mockSettings) {
  const { minAttendance, maxAttendance, saldoPembagian } = settings;

  const withStats = members.map(m => {
    const hadir = countAttendance(m.id);
    const persentase = maxAttendance > 0 ? Math.min(100, (hadir / maxAttendance) * 100) : 0;
    const eligible = hadir >= minAttendance;
    return { ...m, hadir, persentase, eligible };
  });

  const eligibleMembers = withStats.filter(m => m.eligible);
  const totalPoin = eligibleMembers.reduce((sum, m) => sum + m.persentase, 0);

  return withStats.map(m => {
    const pendapatan = totalPoin > 0 && m.eligible
      ? (m.persentase / totalPoin) * saldoPembagian
      : 0;
    const pembulatan = Math.floor(pendapatan / 1000) * 1000;
    return { ...m, pendapatan, pembulatan };
  });
}

// Format currency IDR
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("IDR", "Rp");
}

// Get initials from name
export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// Avatar color based on id
export const avatarColors = [
  "bg-purple-600", "bg-blue-600", "bg-green-600", "bg-rose-600",
  "bg-orange-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
  "bg-cyan-600", "bg-amber-600",
];
export function getAvatarColor(id: string): string {
  const idx = parseInt(id.replace("SOT-", "")) - 1;
  return avatarColors[idx % avatarColors.length];
}
