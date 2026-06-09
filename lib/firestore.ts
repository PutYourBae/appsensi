import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, query, orderBy, addDoc, limit, where } from "firebase/firestore";
import { MemberStatus } from "./mock-data";

export type Member = {
  id: string;
  name: string;
  createdAt: string;
  status: MemberStatus;
  discord_id?: string;
};

export type AttendanceMonth = {
  [memberId: string]: {
    [day: number]: boolean;
  };
};

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "members"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ ...d.data() } as Member));
      // Sort by status pending first, then by ID
      data.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return a.id.localeCompare(b.id);
      });
      setMembers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { members, loading };
}

export function useAttendance(monthId: string) {
  const [attendance, setAttendance] = useState<AttendanceMonth>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!monthId) return;
    const docRef = doc(db, "attendance", monthId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setAttendance(snap.data() as AttendanceMonth);
      } else {
        setAttendance({});
      }
      setLoading(false);
    });
    return unsub;
  }, [monthId]);

  return { attendance, loading };
}

// Normalize a day cell — supports both boolean (admin-set) and
// object {hadir:true, time, date} (user-submitted) formats
export function isCellHadir(cell: unknown): boolean {
  if (cell === true) return true;
  if (cell && typeof cell === "object" && (cell as Record<string, unknown>).hadir === true) return true;
  return false;
}

// Aggregate total hadir per member across ALL attendance months
export function useAllAttendance() {
  const [summary, setSummary] = useState<Record<string, number>>({}); // memberId → total hadir
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { getDocs, collection: fsCollection } = await import("firebase/firestore");
        const snap = await getDocs(fsCollection(db, "attendance"));
        const agg: Record<string, number> = {};
        snap.docs.forEach((monthDoc) => {
          const data = monthDoc.data();
          Object.entries(data).forEach(([memberId, days]) => {
            if (typeof days !== "object" || days === null) return;
            Object.values(days as Record<string, unknown>).forEach((cell) => {
              if (isCellHadir(cell)) {
                agg[memberId] = (agg[memberId] || 0) + 1;
              }
            });
          });
        });
        if (!cancelled) { setSummary(agg); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { summary, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState({ minAbsen: 10, maxAbsen: 22, saldo: 10000000, motivasi: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "config", "settings");
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as { minAbsen: number; maxAbsen: number; saldo: number; motivasi: string });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { settings, loading };
}

export async function seedDatabase() {
  const { mockMembers, mockAttendance } = await import("./mock-data");
  
  // Seed Members
  for (const m of mockMembers) {
    await setDoc(doc(db, "members", m.id), m);
  }

  // Seed Attendance (Mar, Apr, Mei, Jun)
  const months = ["Mar-2026", "Apr-2026", "Mei-2026", "Jun-2026"];
  for (const month of months) {
    if (month === "Mei-2026") {
      await setDoc(doc(db, "attendance", month), mockAttendance);
    } else {
      await setDoc(doc(db, "attendance", month), {});
    }
  }

  // Seed Settings
  await setDoc(doc(db, "config", "settings"), {
    minAbsen: 10,
    maxAbsen: 22,
    saldo: 10000000,
    motivasi: "Kalau mau hasil gede ya jangan males masuk 😏\nYang rajin hadir biasanya duitnya juga paling tebel 🔥"
  });
}

export type EditLog = {
  id: string;
  adminEmail: string;
  changes: string;
  timestamp: string;
};

export function useEditLogs(maxLogs = 50) {
  const [editLogs, setEditLogs] = useState<EditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "editLogs"), orderBy("timestamp", "desc"), limit(maxLogs));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EditLog));
      setEditLogs(data);
      setLoading(false);
    });
    return unsub;
  }, [maxLogs]);

  return { editLogs, loading };
}

export async function logEdit(adminEmail: string, changes: string) {
  await addDoc(collection(db, "editLogs"), {
    adminEmail,
    changes,
    timestamp: new Date().toISOString()
  });
}

// --- HISTORY & SESSIONS ---

export type DailySession = {
  id: string;
  discord_id: string;
  name: string;
  date: string; // e.g. "2026-06-09"
  total_minutes_valid: number;
  status: string; // "HADIR" | "TIDAK HADIR"
  segments: {
    start: string;
    end: string;
    duration: number;
  }[];
};

export function useMemberHistory(discordId: string | null) {
  const [history, setHistory] = useState<DailySession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!discordId) {
      setHistory([]);
      return;
    }
    
    setLoading(true);
    const q = query(
      collection(db, "daily_sessions"),
      where("discord_id", "==", discordId)
    );
    
    // We do not use orderBy("date", "desc") because it requires a composite index
    // if not already created. We will fetch and sort locally to be safe.
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailySession));
      // Sort descending by date
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(data);
      setLoading(false);
    });
    
    return unsub;
  }, [discordId]);

  return { history, loading };
}

