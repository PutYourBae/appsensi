# PRD — Aplikasi Absensi & Pembagian Pendapatan
### Product Requirements Document v1.0
**Prepared by:** Senior Fullstack Developer & System Architect
**Status:** Draft Final
**Last Updated:** 2026

---

## DAFTAR ISI

1. [Executive Summary](#1-executive-summary)
2. [App Flow Lengkap](#2-app-flow-lengkap)
3. [User Flow](#3-user-flow)
4. [Admin Flow](#4-admin-flow)
5. [Core Features](#5-core-features)
6. [Struktur Halaman](#6-struktur-halaman)
7. [Firebase Database Schema](#7-firebase-database-schema)
8. [Firestore Collections](#8-firestore-collections)
9. [Logic Persentase Kehadiran](#9-logic-persentase-kehadiran)
10. [Logic Pembagian Pendapatan](#10-logic-pembagian-pendapatan)
11. [Logic Pembulatan Pendapatan](#11-logic-pembulatan-pendapatan)
12. [Logic Reset Absensi](#12-logic-reset-absensi)
13. [Logic Edit Absensi](#13-logic-edit-absensi)
14. [Struktur Folder Project](#14-struktur-folder-project)
15. [Tech Stack Recommendation](#15-tech-stack-recommendation)
16. [UI/UX Recommendation](#16-uiux-recommendation)
17. [Deployment Flow](#17-deployment-flow)
18. [Security Best Practices](#18-security-best-practices)
19. [Roadmap Development](#19-roadmap-development)
20. [Future Feature Recommendation](#20-future-feature-recommendation)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Nama Aplikasi
**StradOR** *(Attendance & Revenue Distribution System)*

### 1.2 Visi Produk
Aplikasi web modern berbasis Next.js + Firebase yang memungkinkan tim/komunitas untuk:
- Mengelola absensi harian secara kolektif
- Memonitor kehadiran tiap anggota secara real-time
- Menghitung dan mendistribusikan pendapatan secara proporsional berdasarkan persentase kehadiran

### 1.3 Target Pengguna
| Role | Deskripsi |
|------|-----------|
| **User (Anggota)** | Melakukan absensi mandiri via halaman publik |
| **Admin** | Mengelola anggota, absensi, pengaturan, dan distribusi pendapatan |

### 1.4 Problem Statement
Banyak tim/kelompok kerja informal (freelancer collective, komunitas, warung, UMKM) yang:
- Tidak punya sistem absensi yang proper
- Pembagian pendapatan dilakukan manual dan rentan konflik
- Tidak ada transparansi data kehadiran vs pendapatan

### 1.5 Solution Statement
Aplikasi ini memberikan sistem absensi digital yang simpel di sisi user, dan powerful di sisi admin, dengan kalkulasi pendapatan proporsional yang otomatis dan transparan.

---

## 2. APP FLOW LENGKAP

```
┌─────────────────────────────────────────────────────────────┐
│                     ENTRY POINT                             │
│                  https://domain.com/                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│   USER SIDE     │               │   ADMIN SIDE    │
│   Route: /      │               │  Route:/strador │
└────────┬────────┘               └────────┬────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│ Pilih Anggota   │               │  Login Firebase │
│ (Multi Select)  │               │  Auth           │
└────────┬────────┘               └────────┬────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────────────────┐
│ Klik ABSEN      │               │  Admin Dashboard            │
│ → Save to DB    │               │  Tab: Absensi | Anggota |   │
└────────┬────────┘               │       Pendapatan | Settings │
         │                        └─────────────────────────────┘
         ▼
┌─────────────────┐
│ Success Message │
│ + Motivasi      │
│ Gen-Z Random    │
└─────────────────┘
```

---

## 3. USER FLOW

### 3.1 Halaman Absensi (`/`)

```
STEP 1: User buka halaman utama
         ↓
STEP 2: Melihat daftar nama anggota (dropdown/chip selector)
         ↓
STEP 3: Pilih satu atau lebih nama anggota
         ↓
STEP 4: (Opsional) Tambah anggota baru via tombol "+"
         ↓
STEP 5: Klik tombol ABSEN
         ↓
STEP 6: Sistem cek → Apakah anggota sudah absen hari ini?
         ├─ Sudah → Skip (tidak duplikat)
         └─ Belum → Simpan ke Firestore
                      {memberId, date, timestamp, sessionId}
         ↓
STEP 7: Tampilkan Success Message + Kata Motivasi Random
         ↓
STEP 8: List "Yang sudah absen hari ini" di-update realtime
```

### 3.2 Validasi Absensi
- Tidak bisa absen untuk hari yang akan datang
- Jika anggota sudah absen hari ini → ditampilkan sebagai "Sudah Absen" (disabled)
- Timestamp dicatat otomatis oleh server (Firestore serverTimestamp)

### 3.3 Motivasi Gen-Z (Local Array)
```javascript
const motivasiList = [
  "Kalau mau hasil gede ya jangan males masuk 😏",
  "Yang rajin hadir biasanya duitnya juga paling tebel 🔥",
  "Absen dulu baru sok capek 😎",
  "Konsisten itu bukan bakat, itu pilihan. Pilih bijak 💀",
  "Yang sering absen, lihat aja nanti pas pembagian 👀",
  "Hadir = respek ke tim. Gak hadir = ya tau sendiri 🙄",
  "Bukan soal mau, tapi soal harus. Kamu udah hadir, itu cukup 🫡",
  "Orang sukses dateng duluan, bukan nungguin mood 🚀",
  "Gajimu ngikut kehadiranmu. Simple math 📊",
  "Ngeluh capek? Hadir dulu, capeknya baru valid 💪"
];
```

---

## 4. ADMIN FLOW

### 4.1 Login Admin (`/strador`)

```
STEP 1: Admin buka /strador
         ↓
STEP 2: Redirect ke halaman login (jika belum auth)
         ↓
STEP 3: Login via Firebase Authentication (Email/Password)
         ↓
STEP 4: Verifikasi role admin di Firestore
         ↓
STEP 5: Masuk ke Admin Dashboard
```

### 4.2 Dashboard Admin — Tab Navigation

```
┌─────────────────────────────────────────────────────┐
│  [📊 Absensi] [👥 Anggota] [💰 Pendapatan] [⚙️ Settings] │
└─────────────────────────────────────────────────────┘
```

### 4.3 Flow Tab Absensi

```
STEP 1: Lihat spreadsheet absensi bulan aktif
STEP 2: Filter bulan/tahun (prev/next navigation)
STEP 3: Klik cell untuk edit (hanya hari lalu, bukan future)
STEP 4: Toggle hadir/tidak hadir
STEP 5: Simpan → Log edit tersimpan otomatis
STEP 6: Statistik (total hadir, %, pendapatan) update realtime
```

### 4.4 Flow Tab Anggota

```
STEP 1: Lihat daftar semua anggota
STEP 2: Tambah anggota → Input nama → Save
STEP 3: Edit nama → Inline edit → Save
STEP 4: Hapus anggota → Konfirmasi dialog → Delete
```

### 4.5 Flow Tab Pendapatan

```
STEP 1: Admin input Saldo Pembagian (Rp)
STEP 2: Set Minimum Absensi & Maksimum Absensi
STEP 3: Sistem kalkulasi otomatis pendapatan per anggota
STEP 4: Tampil kolom: Nama | Hadir | % | Pendapatan | Pembulatan
STEP 5: Export Excel/PDF (opsional)
```

---

## 5. CORE FEATURES

### 5.1 Feature Matrix

| Feature | User | Admin | Priority |
|---------|------|-------|----------|
| Multi-select absensi | ✅ | ✅ | P0 |
| Success message + motivasi | ✅ | — | P0 |
| Daily attendance list realtime | ✅ | ✅ | P0 |
| Spreadsheet management | — | ✅ | P0 |
| Edit absensi historis | — | ✅ | P0 |
| Log perubahan | — | ✅ | P0 |
| Kalkulasi pendapatan proporsional | — | ✅ | P0 |
| Pembulatan ke ribuan | — | ✅ | P0 |
| Reset absensi (sesi) | — | ✅ | P0 |
| Manajemen anggota (CRUD) | — | ✅ | P0 |
| Tab Settings | — | ✅ | P1 |
| Export Excel | — | ✅ | P2 |
| Export PDF | — | ✅ | P2 |
| Grafik kehadiran | — | ✅ | P2 |
| Search & filter | — | ✅ | P2 |
| PWA support | ✅ | ✅ | P3 |

---

## 6. STRUKTUR HALAMAN

### 6.1 User Side

```
/ (Root)
├── Header: Nama Aplikasi + Bulan Aktif
├── Section: Pilih Anggota
│   ├── Searchable Chip Selector (multi-select)
│   └── Tombol "+ Anggota Baru"
├── Section: CTA
│   └── Tombol "ABSEN" (besar, prominent)
└── Section: Sudah Absen Hari Ini
    └── List: [Nama] — [HH:MM WIB]
```

### 6.2 Admin Side

```
/strador
├── /strador/login         → Halaman login
├── /strador               → Redirect ke /strador/dashboard
└── /strador/dashboard
    ├── Sidebar Navigation
    │   ├── 📊 Absensi
    │   ├── 👥 Anggota
    │   ├── 💰 Pendapatan
    │   └── ⚙️ Settings
    ├── Tab: Absensi
    │   ├── Month Picker (prev/next)
    │   ├── Spreadsheet Table
    │   │   ├── No | Nama | Tgl 1..31 | Total | % | Pendapatan | Pembulatan
    │   │   └── Cell edit (historis only)
    │   ├── Tombol "Reset Absensi"
    │   └── Log Edit Panel (collapsible)
    ├── Tab: Anggota
    │   ├── Daftar Anggota (card/table)
    │   └── CRUD: Tambah | Edit | Hapus
    ├── Tab: Pendapatan
    │   ├── Input: Saldo Pembagian
    │   ├── Tabel Distribusi
    │   └── Export Excel/PDF
    └── Tab: Settings
        ├── Minimum Absensi
        ├── Maksimum Absensi
        ├── Saldo Pembagian
        ├── Pengaturan Bulan Absensi
        ├── Pengaturan Motivasi
        └── Reset Sesi
```

---

## 7. FIREBASE DATABASE SCHEMA

### 7.1 Firebase Authentication
```
Auth Provider: Email/Password
Admin User:
  - email: admin@domain.com
  - uid: (auto-generated)
  - customClaims: { role: "admin" }
```

### 7.2 Firebase Services yang Digunakan

| Service | Fungsi |
|---------|--------|
| **Firebase Auth** | Login admin |
| **Firestore** | Database utama (realtime, NoSQL) |
| **Firebase Hosting** (opsional) | Static hosting alternatif |

### 7.3 Environment Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_SERVICE_ACCOUNT=  (server-side only, jangan di-expose)
```

---

## 8. FIRESTORE COLLECTIONS

### 8.1 Collection: `members`
Menyimpan data seluruh anggota.

```
members/
  {memberId}/
    name: string          // "Budi Santoso"
    createdAt: timestamp
    updatedAt: timestamp
    isActive: boolean     // true = aktif, false = sudah dihapus (soft delete)
    createdBy: string     // uid admin
```

### 8.2 Collection: `attendance`
Menyimpan data absensi per hari.

```
attendance/
  {year-month}/            // "2026-05"
    days/
      {date}/              // "2026-05-22"
        records/
          {memberId}/
            memberId: string
            memberName: string
            date: string            // "2026-05-22"
            timestamp: timestamp    // serverTimestamp
            recordedBy: string      // "user" | uid admin
```

### 8.3 Collection: `sessions`
Sesi absensi (untuk reset per sesi).

```
sessions/
  {sessionId}/
    name: string           // "Sesi Mei 2026"
    month: string          // "2026-05"
    startDate: timestamp
    endDate: timestamp | null
    isActive: boolean
    createdBy: string
    resetAt: timestamp | null
    resetBy: string | null
```

### 8.4 Collection: `settings`
Konfigurasi global aplikasi.

```
settings/
  global/
    minAttendance: number    // default: 10
    maxAttendance: number    // default: 20
    saldoPembagian: number   // default: 0
    activeMonth: string      // "2026-05"
    activeSessionId: string
    motivasiCustom: string[] // array kata motivasi custom (opsional)
    updatedAt: timestamp
    updatedBy: string
```

### 8.5 Collection: `editLogs`
Log setiap perubahan absensi oleh admin.

```
editLogs/
  {logId}/
    adminUid: string
    adminEmail: string
    memberId: string
    memberName: string
    date: string            // "2026-05-15"
    action: "add" | "remove"
    beforeState: boolean    // false = tidak hadir
    afterState: boolean     // true = hadir
    editedAt: timestamp
    sessionId: string
```

### 8.6 Collection: `admins`
Daftar admin yang memiliki akses.

```
admins/
  {uid}/
    email: string
    name: string
    role: "superadmin" | "admin"
    createdAt: timestamp
```

### 8.7 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    // Members: bisa dibaca siapa saja (untuk dropdown user),
    // hanya admin yang bisa tulis
    match /members/{memberId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Attendance: bisa ditulis siapa saja (absensi user),
    // bisa dibaca siapa saja (daily list)
    // hanya admin yang bisa menghapus
    match /attendance/{year_month}/days/{date}/records/{memberId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if isAdmin();
    }

    // Settings: hanya admin
    match /settings/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Sessions: hanya admin
    match /sessions/{sessionId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }

    // Edit Logs: hanya admin bisa baca/tulis
    match /editLogs/{logId} {
      allow read, write: if isAdmin();
    }

    // Admins collection: hanya superadmin yang bisa manage
    match /admins/{uid} {
      allow read: if isAdmin();
      allow write: if isAdmin() &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'superadmin';
    }
  }
}
```

---

## 9. LOGIC PERSENTASE KEHADIRAN

### 9.1 Formula Dasar

```
Persentase = (Jumlah Hadir / Maksimum Absensi) × 100
```

### 9.2 Contoh Kalkulasi

| Anggota | Hadir | Max Absensi | Persentase |
|---------|-------|-------------|------------|
| Budi    | 20    | 20          | 100%       |
| Joko    | 15    | 20          | 75%        |
| Andi    | 10    | 20          | 50%        |
| Sari    | 8     | 20          | 40%        |
| Dian    | 20    | 20          | 100%       |

### 9.3 Edge Cases Persentase

| Kondisi | Handling |
|---------|----------|
| Hadir > Max Absensi | Persentase dikunci di 100% (capped) |
| Hadir = 0 | Persentase = 0% |
| Max Absensi = 0 | Error: tampilkan peringatan ke admin, set default 1 |
| Anggota baru ditambah di tengah sesi | Hadir dihitung dari total masuk, bukan dari awal sesi |

### 9.4 Implementasi (TypeScript)

```typescript
function hitungPersentase(
  jumlahHadir: number,
  maxAbsensi: number
): number {
  if (maxAbsensi === 0) return 0;
  const persen = (jumlahHadir / maxAbsensi) * 100;
  return Math.min(100, Math.round(persen * 100) / 100); // Round 2 desimal, cap 100%
}
```

---

## 10. LOGIC PEMBAGIAN PENDAPATAN

### 10.1 Konsep Utama

Pembagian **PROPORSIONAL** — bukan merata (equal split).

Anggota yang lebih sering hadir mendapat porsi lebih besar dari total saldo yang dibagikan.

### 10.2 Formula Sistem Proporsional

```
1. Filter: Kecualikan anggota dengan hadir < minAttendance
2. Hitung Total Poin Eligible:
   totalPoin = Σ (persentase kehadiran setiap anggota eligible)
3. Hitung Porsi Per Anggota:
   porsi[i] = (persentase[i] / totalPoin) × saldoPembagian
```

### 10.3 Simulasi Perhitungan Lengkap

**Konfigurasi:**
- Saldo Pembagian: Rp 10.000.000
- Minimum Absensi: 10 hari
- Maksimum Absensi: 20 hari

**Data Anggota:**

| Anggota | Hadir | % Kehadiran | Eligible? |
|---------|-------|-------------|-----------|
| Budi    | 20    | 100%        | ✅ Ya     |
| Joko    | 15    | 75%         | ✅ Ya     |
| Andi    | 10    | 50%         | ✅ Ya     |
| Sari    | 8     | 40%         | ❌ Tidak  |
| Dian    | 20    | 100%        | ✅ Ya     |

**Langkah Kalkulasi:**

```
STEP 1: Filter eligible
  Eligible: Budi (100%), Joko (75%), Andi (50%), Dian (100%)
  Excluded: Sari (40% < 50% min threshold)

STEP 2: Total poin eligible
  totalPoin = 100 + 75 + 50 + 100 = 325

STEP 3: Porsi per anggota
  Budi  = (100 / 325) × 10.000.000 = Rp 3.076.923,08
  Joko  = (75  / 325) × 10.000.000 = Rp 2.307.692,31
  Andi  = (50  / 325) × 10.000.000 = Rp 1.538.461,54
  Dian  = (100 / 325) × 10.000.000 = Rp 3.076.923,08
  Sari  = Rp 0 (di bawah minimum)

STEP 4: Verifikasi total
  3.076.923 + 2.307.692 + 1.538.462 + 3.076.923 = 10.000.000 ✅
```

### 10.4 Mengapa Proporsional, Bukan Merata?

> Anggota yang hadir 100% mendapat lebih banyak karena kontribusi mereka lebih besar. Jika Sari tidak eligible, "jatah"-nya tidak hangus, melainkan otomatis terdistribusi ke anggota yang eligible secara proporsional.

### 10.5 Edge Cases Pembagian

| Kondisi | Handling |
|---------|----------|
| Semua anggota di bawah minimum | Saldo tidak dibagikan, admin diperingatkan |
| Hanya 1 anggota eligible | 1 orang mendapat 100% saldo |
| Saldo = 0 | Semua pendapatan = Rp 0 |
| Semua hadir 100% | Dibagi merata (proporsional = sama) |
| Anggota baru, hadir 0 | Otomatis excluded (hadir 0 < min) |

### 10.6 Implementasi (TypeScript)

```typescript
interface Member {
  id: string;
  name: string;
  hadir: number;
}

interface Settings {
  minAttendance: number;
  maxAttendance: number;
  saldoPembagian: number;
}

interface IncomeResult {
  memberId: string;
  memberName: string;
  hadir: number;
  persentase: number;
  eligible: boolean;
  pendapatan: number;
  pembulatan: number;
}

function hitungPembagianPendapatan(
  members: Member[],
  settings: Settings
): IncomeResult[] {
  const { minAttendance, maxAttendance, saldoPembagian } = settings;

  // Hitung persentase dan eligibility
  const withPersentase = members.map(m => ({
    ...m,
    persentase: maxAttendance > 0
      ? Math.min(100, (m.hadir / maxAttendance) * 100)
      : 0,
    eligible: m.hadir >= minAttendance
  }));

  // Filter eligible
  const eligible = withPersentase.filter(m => m.eligible);

  // Hitung total poin
  const totalPoin = eligible.reduce((sum, m) => sum + m.persentase, 0);

  // Hitung pendapatan
  return withPersentase.map(m => {
    const pendapatan = totalPoin > 0 && m.eligible
      ? (m.persentase / totalPoin) * saldoPembagian
      : 0;

    return {
      memberId: m.id,
      memberName: m.name,
      hadir: m.hadir,
      persentase: m.persentase,
      eligible: m.eligible,
      pendapatan: pendapatan,
      pembulatan: bulatkanRibuan(pendapatan)
    };
  });
}
```

---

## 11. LOGIC PEMBULATAN PENDAPATAN

### 11.1 Aturan Pembulatan

> Pembulatan **ke bawah** ke kelipatan **Rp 1.000** terdekat.

### 11.2 Formula

```
Pembulatan = Math.floor(pendapatan / 1000) × 1000
```

### 11.3 Contoh

| Pendapatan Asli | Pembulatan | Selisih |
|-----------------|------------|---------|
| Rp 3.076.923    | Rp 3.076.000 | Rp 923 |
| Rp 2.307.692    | Rp 2.307.000 | Rp 692 |
| Rp 1.538.461    | Rp 1.538.000 | Rp 461 |
| Rp 198.876      | Rp 198.000   | Rp 876 |
| Rp 500.000      | Rp 500.000   | Rp 0   |

### 11.4 Catatan Selisih Pembulatan

Selisih kumulatif dari pembulatan ditampilkan di UI sebagai informasi. Admin bisa memutuskan apakah sisa pembulatan dikembalikan ke kas atau dirollover ke sesi berikutnya.

### 11.5 Implementasi

```typescript
function bulatkanRibuan(nominal: number): number {
  return Math.floor(nominal / 1000) * 1000;
}

// Menghitung total selisih pembulatan
function selisihPembulatan(results: IncomeResult[]): number {
  return results.reduce((sum, r) => {
    return sum + (r.pendapatan - r.pembulatan);
  }, 0);
}
```

---

## 12. LOGIC RESET ABSENSI

### 12.1 Flow Reset

```
Admin klik "Reset Absensi"
         ↓
Muncul Konfirmasi Dialog:
"Apakah benar Anda ingin melakukan reset absensi untuk sesi ini?"
[Reset] [Tidak]
         ↓ (Klik Reset)
Sistem membuat sesi baru
         ↓
Semua data attendance bulan aktif dihapus
         ↓
Statistik direset ke 0
         ↓
Pendapatan direset ke 0
         ↓
Log reset tersimpan (siapa, kapan)
         ↓
Admin kembali ke spreadsheet kosong
```

### 12.2 Scope Reset

> Reset hanya menghapus data **sesi aktif** (bulan yang sedang berjalan). Data historis bulan-bulan sebelumnya **TIDAK terhapus**.

### 12.3 Reset Log Schema

```typescript
interface ResetLog {
  resetBy: string;        // uid admin
  resetByEmail: string;
  resetAt: Timestamp;
  sessionId: string;
  month: string;          // "2026-05"
  totalRecordsDeleted: number;
}
```

### 12.4 Implementasi Firebase

```typescript
async function resetAbsensi(
  adminUid: string,
  adminEmail: string,
  activeMonth: string,
  sessionId: string
) {
  const batch = writeBatch(db);

  // 1. Ambil semua record bulan aktif
  const attendanceRef = collection(
    db, `attendance/${activeMonth}/days`
  );
  // ... delete semua dokumen dalam batch

  // 2. Update session status
  const sessionRef = doc(db, 'sessions', sessionId);
  batch.update(sessionRef, {
    isActive: false,
    resetAt: serverTimestamp(),
    resetBy: adminUid
  });

  // 3. Buat session baru
  const newSessionRef = doc(collection(db, 'sessions'));
  batch.set(newSessionRef, {
    month: activeMonth,
    isActive: true,
    startDate: serverTimestamp(),
    createdBy: adminUid
  });

  // 4. Update settings dengan session baru
  const settingsRef = doc(db, 'settings', 'global');
  batch.update(settingsRef, {
    activeSessionId: newSessionRef.id
  });

  await batch.commit();
}
```

---

## 13. LOGIC EDIT ABSENSI

### 13.1 Aturan Edit

| Kondisi | Dapat Diedit? |
|---------|--------------|
| Hari ini | ✅ Ya |
| Hari kemarin dan sebelumnya (bulan aktif) | ✅ Ya |
| Hari besok dan masa depan | ❌ Tidak |
| Bulan sebelumnya (historis) | ❌ Tidak (view only) |

### 13.2 Validasi Tanggal

```typescript
function canEditDate(targetDate: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return targetDate <= today;
}
```

### 13.3 Log Edit — Skema Lengkap

Setiap edit menyimpan:

```typescript
interface EditLog {
  logId: string;          // auto-generated
  adminUid: string;
  adminEmail: string;
  adminName: string;
  memberId: string;
  memberName: string;
  date: string;           // "2026-05-15" (hari yang diedit)
  editedAt: Timestamp;    // kapan edit dilakukan
  action: "ADD" | "REMOVE";
  beforeState: boolean;   // kondisi sebelum
  afterState: boolean;    // kondisi sesudah
  sessionId: string;
  note?: string;          // catatan opsional admin
}
```

### 13.4 Tampilan Log Edit di UI

Tabel log menampilkan:

```
| Admin      | Anggota  | Tanggal Edit  | Hari yg Diedit | Aksi    |
|------------|----------|---------------|----------------|---------|
| admin@app  | Budi     | 22 Mei 10:30  | 20 Mei 2026    | ➕ Add  |
| admin@app  | Sari     | 21 Mei 09:00  | 19 Mei 2026    | ➖ Remove|
```

---

## 14. STRUKTUR FOLDER PROJECT

```
strador-app/
├── .env.local                    # Environment variables (jangan di-commit)
├── .env.example                  # Template env (wajib di-commit)
├── .gitignore
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   ├── favicon.ico
│   ├── manifest.json             # PWA manifest
│   └── icons/
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # User side: /
│   │   ├── globals.css
│   │   └── strador/
│   │       ├── page.tsx          # Redirect → /strador/dashboard atau login
│   │       ├── login/
│   │       │   └── page.tsx      # Halaman login admin
│   │       └── dashboard/
│   │           ├── layout.tsx    # Dashboard layout (sidebar)
│   │           ├── page.tsx      # Default → Tab Absensi
│   │           ├── absensi/
│   │           │   └── page.tsx
│   │           ├── anggota/
│   │           │   └── page.tsx
│   │           ├── pendapatan/
│   │           │   └── page.tsx
│   │           └── settings/
│   │               └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                   # Shadcn UI components
│   │   ├── user/
│   │   │   ├── MemberSelector.tsx
│   │   │   ├── AbsenButton.tsx
│   │   │   ├── SuccessModal.tsx
│   │   │   └── DailyAttendanceList.tsx
│   │   └── admin/
│   │       ├── AttendanceSpreadsheet.tsx
│   │       ├── EditCellModal.tsx
│   │       ├── ResetConfirmDialog.tsx
│   │       ├── DeleteMemberDialog.tsx
│   │       ├── IncomeTable.tsx
│   │       ├── EditLogPanel.tsx
│   │       └── MonthNavigator.tsx
│   │
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts         # Firebase initialization
│   │   │   ├── auth.ts           # Auth helpers
│   │   │   ├── members.ts        # Member CRUD
│   │   │   ├── attendance.ts     # Attendance operations
│   │   │   ├── settings.ts       # Settings CRUD
│   │   │   └── editLogs.ts       # Log operations
│   │   ├── calculations/
│   │   │   ├── attendance.ts     # Persentase logic
│   │   │   ├── income.ts         # Pembagian pendapatan
│   │   │   └── rounding.ts       # Pembulatan
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── currency.ts
│   │       ├── motivasi.ts       # Motivasi gen-z array
│   │       └── export.ts         # Excel/PDF export
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useMembers.ts
│   │   ├── useAttendance.ts
│   │   ├── useSettings.ts
│   │   └── useIncomeCalculation.ts
│   │
│   ├── store/                    # Zustand global state
│   │   ├── authStore.ts
│   │   ├── attendanceStore.ts
│   │   └── settingsStore.ts
│   │
│   └── types/
│       ├── member.ts
│       ├── attendance.ts
│       ├── settings.ts
│       └── income.ts
│
├── firestore.rules               # Firestore security rules
└── firebase.json                 # Firebase config
```

---

## 15. TECH STACK RECOMMENDATION

### 15.1 Perbandingan Stack

| Aspek | React (CRA) | Next.js | Verdict |
|-------|-------------|---------|---------|
| SSR/SSG | ❌ | ✅ | Next.js wins |
| Routing | Manual | File-based | Next.js wins |
| Performance | Baik | Lebih baik | Next.js wins |
| SEO | Butuh config | Built-in | Next.js wins |
| Deployment Vercel | Bisa | Native | Next.js wins |
| Learning curve | Rendah | Sedang | React wins |
| Firebase compat | ✅ | ✅ | Sama |

### 15.2 Stack Final yang Direkomendasikan

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND                                           │
│  ├── Next.js 15 (App Router)                        │
│  ├── TypeScript                                     │
│  ├── TailwindCSS v4                                 │
│  └── Shadcn UI                                      │
│                                                     │
│  BACKEND / DATABASE                                 │
│  ├── Firebase Firestore (NoSQL realtime DB)         │
│  ├── Firebase Authentication                        │
│  └── Firebase Security Rules                        │
│                                                     │
│  STATE MANAGEMENT                                   │
│  └── Zustand (lightweight, simple)                  │
│                                                     │
│  DEPLOYMENT                                         │
│  ├── GitHub (source control)                        │
│  └── Vercel (hosting + CI/CD)                       │
│                                                     │
│  UTILITIES                                          │
│  ├── date-fns (date manipulation)                   │
│  ├── xlsx (Excel export)                            │
│  ├── jsPDF (PDF export)                             │
│  └── react-hot-toast (notifications)               │
└─────────────────────────────────────────────────────┘
```

### 15.3 Alasan Pemilihan Stack

**Next.js:**
- Native support Vercel deployment (zero config)
- App Router untuk layout bersama (admin sidebar)
- Server Components untuk SSR data awal (lebih cepat)
- API Routes untuk operasi sensitif (jika dibutuhkan)

**Firebase:**
- Realtime listener → list absensi hari ini update otomatis
- Free tier sangat cukup untuk MVP (Spark plan)
- Security Rules powerful tanpa backend custom
- Auth built-in, tidak perlu JWT manual

**TailwindCSS + Shadcn:**
- Dark mode native (class-based)
- Shadcn = komponen accessible, bisa dikustomisasi penuh
- Tidak ada vendor lock-in

**Zustand:**
- Lebih ringan dari Redux
- Cocok untuk state global sederhana (auth, settings)

---

## 16. UI/UX RECOMMENDATION

### 16.1 Design Philosophy

**Prinsip:** *"Powerful untuk admin, invisible untuk user."*

User tidak perlu berpikir. Admin tidak perlu bertanya.

### 16.2 Color Palette (Dark Mode)

```css
:root {
  --bg-primary:    #0A0A0F;  /* Background utama, near-black */
  --bg-secondary:  #111118;  /* Card, sidebar */
  --bg-tertiary:   #1A1A24;  /* Input, table row */
  --border:        #2A2A3A;  /* Border halus */
  --accent:        #6C5CE7;  /* Ungu gelap — tombol utama */
  --accent-hover:  #5A4BCD;
  --green:         #00B894;  /* Hadir / success */
  --red:           #E17055;  /* Tidak hadir / danger */
  --text-primary:  #F0F0F5;
  --text-secondary:#8888A0;
  --text-muted:    #555565;
}
```

### 16.3 Typography

```
Font Utama:   "Geist" (by Vercel) — clean, modern, techy
Font Mono:    "Geist Mono" — untuk angka di spreadsheet
Ukuran:       sm: 12px | base: 14px | lg: 16px | xl: 20px | 2xl: 24px
```

### 16.4 Komponen Utama

**Tombol ABSEN (User Side):**
- Ukuran besar (full width mobile)
- Warna accent dengan glow effect
- Animasi pulse saat siap klik
- Loading state saat submit

**Spreadsheet Table (Admin Side):**
- Cell hadir: background hijau muted + ikon ✅
- Cell tidak hadir: tanda `-` warna muted
- Cell future (hari belum tiba): background gelap, locked
- Hover state: cell highlight tipis
- Edit cell: click → mini toggle

**Success Modal (User Side):**
- Overlay blur background
- Animasi konfeti kecil (CSS only)
- Teks motivasi dengan font besar dan bold
- Auto-close 3 detik atau klik dismiss

### 16.5 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | Single column, bottom nav |
| Tablet (640–1024px) | Sidebar collapsed, icon only |
| Desktop (> 1024px) | Sidebar expanded, full dashboard |

### 16.6 Microinteractions

- Tombol ABSEN: scale up saat hover, press effect saat click
- Row anggota: slide in saat ditambahkan ke daily list
- Cell edit: smooth transition antara view/edit mode
- Notifikasi: slide dari pojok kanan atas

---

## 17. DEPLOYMENT FLOW

### 17.1 Setup Firebase

```bash
# 1. Buat project di console.firebase.google.com
# 2. Enable Firestore Database
# 3. Enable Authentication (Email/Password)
# 4. Copy config ke .env.local

# 5. Install Firebase CLI
npm install -g firebase-tools
firebase login

# 6. Init project
firebase init
# → Pilih: Firestore
# → Pilih project yang sudah dibuat

# 7. Deploy rules
firebase deploy --only firestore:rules
```

### 17.2 Setup GitHub

```bash
# 1. Buat repo baru di GitHub
# 2. Init dan push
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/strador-app.git
git push -u origin main

# 3. WAJIB: Pastikan .env.local ada di .gitignore
echo ".env.local" >> .gitignore
```

### 17.3 Setup Vercel

```bash
# 1. Buka vercel.com → Import GitHub repo

# 2. Konfigurasi Environment Variables di Vercel Dashboard:
#    Settings → Environment Variables
#    Tambahkan semua dari .env.example

# 3. Deploy
# Vercel otomatis deploy saat push ke main branch

# 4. Custom domain (opsional)
# Settings → Domains → Add
```

### 17.4 CI/CD Pipeline

```
Push ke main branch
      ↓
GitHub → Trigger Vercel Webhook
      ↓
Vercel: Build Next.js
      ↓
Run: next build
      ↓
Deploy ke Production URL
      ↓
Preview URL tersedia untuk setiap PR
```

### 17.5 Branch Strategy

```
main          → Production (deploy otomatis ke Vercel)
develop       → Staging
feature/*     → Fitur baru
fix/*         → Bug fixes
```

---

## 18. SECURITY BEST PRACTICES

### 18.1 Firebase Security

| Aspek | Implementasi |
|-------|-------------|
| Auth admin | Firebase Auth dengan email/password |
| Rules Firestore | Pisahkan akses user vs admin |
| API Key | Gunakan .env, jangan hardcode |
| Admin SDK | Hanya di server-side (API routes), jangan di client |
| Rate limiting | Gunakan Firebase App Check untuk mencegah abuse |

### 18.2 Next.js Security

```typescript
// Middleware untuk proteksi route /strador
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Cek auth token di cookie
  const token = request.cookies.get('auth-token');

  if (request.nextUrl.pathname.startsWith('/strador/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/strador/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/strador/dashboard/:path*']
};
```

### 18.3 Data Security

- Jangan simpan password di Firestore
- Jangan expose Firebase Admin SDK key di client
- Gunakan `serverTimestamp()` — jangan trust client timestamp untuk data kritis
- Validate input di client DAN di rules
- Soft delete member (isActive: false) — jangan hard delete langsung

### 18.4 Environment Variables

```env
# Client-safe (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Server-only (JANGAN tambah NEXT_PUBLIC_)
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

---

## 19. ROADMAP DEVELOPMENT

### 19.1 Phase 1 — MVP (2–3 Minggu)

```
Week 1:
  ✅ Setup project (Next.js + Firebase + Tailwind)
  ✅ Firestore schema & security rules
  ✅ Authentication admin
  ✅ User side: halaman absensi + multi-select
  ✅ Daily attendance list realtime

Week 2:
  ✅ Admin dashboard layout (sidebar + tabs)
  ✅ Tab Absensi: spreadsheet view
  ✅ Manajemen anggota (CRUD)
  ✅ Logic persentase kehadiran

Week 3:
  ✅ Logic pembagian pendapatan proporsional
  ✅ Tab Pendapatan + pembulatan
  ✅ Tab Settings
  ✅ Reset absensi + konfirmasi dialog
  ✅ Edit absensi + log
  ✅ Success message + motivasi gen-z
  ✅ Deploy ke Vercel
```

### 19.2 Phase 2 — Enhancement (2–4 Minggu)

```
  📊 Grafik kehadiran (Recharts)
  📤 Export Excel (xlsx)
  📄 Export PDF (jsPDF)
  🔍 Search anggota
  📅 Filter bulan di spreadsheet
  📱 PWA support (manifest + service worker)
  🔔 Toast notifications
  ✏️  Log edit yang lebih detail
```

### 19.3 Phase 3 — Advanced (Optional)

```
  👥 Multi admin + role management
  📊 Analytics dashboard (grafik tren)
  💾 Auto backup ke Google Sheets
  🌐 Offline mode (IndexedDB + sync)
  📱 Push notifications
  🔒 Two-factor authentication
  📋 Template sesi absensi
```

---

## 20. FUTURE FEATURE RECOMMENDATION

### 20.1 Short Term (1–3 Bulan)

| Feature | Value | Effort |
|---------|-------|--------|
| Export Excel | High | Low |
| Grafik kehadiran | High | Medium |
| PWA (install to homescreen) | High | Low |
| Search anggota | Medium | Low |

### 20.2 Medium Term (3–6 Bulan)

| Feature | Value | Effort |
|---------|-------|--------|
| Multi-sesi dalam 1 bulan | High | Medium |
| Riwayat lengkap (all-time stats) | High | Medium |
| Notifikasi reminder absensi | Medium | Medium |
| Import anggota via CSV | Medium | Low |

### 20.3 Long Term (6–12 Bulan)

| Feature | Value | Effort |
|---------|-------|--------|
| Mobile app (React Native / Expo) | Very High | High |
| Integrasi WhatsApp notifikasi | High | Medium |
| Multi-workspace (banyak tim) | High | High |
| Laporan keuangan bulanan | High | Medium |
| QR Code absensi | Medium | Medium |

---

## APPENDIX A — Estimasi Biaya Firebase (Free Tier)

| Resource | Free Limit | Estimasi Pemakaian |
|----------|------------|-------------------|
| Firestore reads | 50.000/hari | ~5.000/hari (50 anggota) |
| Firestore writes | 20.000/hari | ~500/hari |
| Firestore storage | 1 GB | < 10 MB |
| Auth users | 10.000 | < 10 admin |

> **Kesimpulan:** Aplikasi ini akan berjalan **gratis sepenuhnya** di Firebase Spark (free) plan untuk skala tim hingga ratusan anggota.

---

## APPENDIX B — Checklist Pre-Launch

```
□ .env.local tidak di-commit ke GitHub
□ Firestore security rules sudah di-deploy
□ Admin pertama sudah dibuat di Firebase Auth
□ Environment variables sudah diset di Vercel
□ Custom domain terhubung (opsional)
□ Test absensi di mobile device
□ Test login admin
□ Test edit absensi (validasi tanggal)
□ Test reset absensi
□ Test kalkulasi pendapatan dengan data sampel
□ Test export Excel/PDF (jika diimplementasi)
□ Lighthouse score > 80 (performance, accessibility)
```

---

*Dokumen ini adalah living document. Update sesuai perkembangan product.*

**© 2026 — StradOR App PRD v1.0**
