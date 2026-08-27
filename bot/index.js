require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } = require('firebase/firestore');
const { format, differenceInMinutes } = require('date-fns');

const http = require('http');

// --- FORMAT HELPERS ---
function formatTime(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ASCII progress bar (filled / empty)
function makeBar(minutes, max = 60, len = 10) {
  const filled = Math.min(Math.round((minutes / max) * len), len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}


// --- CRASH HANDLERS ---
process.on('uncaughtException', err => console.error('[FATAL] Uncaught Exception:', err));
process.on('unhandledRejection', err => console.error('[FATAL] Unhandled Rejection:', err));

// --- WEB SERVER (Render health check + keep-alive) ---
const server = http.createServer((req, res) => {
  console.log(`[HTTP] Ping received: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord Bot is running 24/7!\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bot] Web server listening on 0.0.0.0:${PORT} (Render).`);
});

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DISCORD CONFIG ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Cache memory for active sessions: { discordId: Date }
const activeSessions = new Map();

function isPlayingTargetGame(presence) {
  if (!presence || !presence.activities) return false;

  for (const activity of presence.activities) {
    const actName = (activity.name || "").toLowerCase();
    const actState = (activity.state || "").toLowerCase();
    const actDetails = (activity.details || "").toLowerCase();

    // Mendeteksi server baru (Cerita Roleplay / CR Roleplay)
    const keywords = ["cerita roleplay", "cr roleplay"];
    if (keywords.some(kw => actName.includes(kw) || actState.includes(kw) || actDetails.includes(kw))) {
      return true;
    }
  }
  return false;
}

// --- TIMEZONE HELPERS (Mencegah Bug Waktu di Server Railway UTC) ---
const WIB_OFFSET = 7 * 60 * 60 * 1000;

function toWIB(date) {
  return new Date(date.getTime() + WIB_OFFSET);
}

function getShiftDateString(date) {
  const wibDate = toWIB(date);
  if (wibDate.getUTCHours() < 12) {
    wibDate.setUTCDate(wibDate.getUTCDate() - 1);
  }
  const yyyy = wibDate.getUTCFullYear();
  const mm = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wibDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getShiftMonthString(date) {
  const wibDate = toWIB(date);
  if (wibDate.getUTCHours() < 12) {
    wibDate.setUTCDate(wibDate.getUTCDate() - 1);
  }
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${monthNames[wibDate.getUTCMonth()]}-${wibDate.getUTCFullYear()}`;
}

function getShiftDay(date) {
  const wibDate = toWIB(date);
  if (wibDate.getUTCHours() < 12) {
    wibDate.setUTCDate(wibDate.getUTCDate() - 1);
  }
  return wibDate.getUTCDate();
}

// Helper: Check overlap within our valid window (21:00 to 00:00 WIB)
function getValidOverlap(joinDate, dropDate) {
  const joinWIB = toWIB(joinDate);
  const dropWIB = toWIB(dropDate);

  let windowStartWIB = new Date(joinWIB.getTime());
  windowStartWIB.setUTCHours(21, 0, 0, 0);

  let windowEndWIB = new Date(joinWIB.getTime());
  windowEndWIB.setUTCHours(0, 0, 0, 0);

  // jam 21:00-23:59 WIB = masih sore/malam (jam >= 21)
  // Shift berakhir tepat jam 00:00 WIB (tengah malam) → selalu tambah 1 hari
  if (joinWIB.getUTCHours() < 12) {
    windowStartWIB.setUTCDate(windowStartWIB.getUTCDate() - 1);
  } else {
    windowEndWIB.setUTCDate(windowEndWIB.getUTCDate() + 1);
  }

  const validStart = joinWIB > windowStartWIB ? joinWIB : windowStartWIB;
  const validEnd = dropWIB < windowEndWIB ? dropWIB : windowEndWIB;

  if (validStart >= validEnd) return null;

  return {
    start: new Date(validStart.getTime() - WIB_OFFSET),
    end: new Date(validEnd.getTime() - WIB_OFFSET),
    duration: Math.round((validEnd - validStart) / 60000)
  };
}

client.once('clientReady', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}!`);
  console.log(`[Bot] Scanning current members for active sessions...`);

  try {
    for (const guild of client.guilds.cache.values()) {
      const members = await guild.members.fetch();
      members.forEach(member => {
        if (isPlayingTargetGame(member.presence)) {
          activeSessions.set(member.user.id, new Date());
          console.log(`[INIT] Found ${member.user.username} already playing. Tracking from now.`);
        }
      });
    }
  } catch (err) {
    console.error("[ERROR] Failed to scan initial members:", err);
  }

  console.log(`[Bot] Waiting for Presence Updates...`);
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  const discordId = newPresence.userId;
  const now = new Date();

  const wasPlaying = isPlayingTargetGame(oldPresence);
  const isPlaying = isPlayingTargetGame(newPresence);

  // EVENT: JOIN
  if (!wasPlaying && isPlaying) {
    if (!activeSessions.has(discordId)) {
      console.log(`[JOIN] ${newPresence.user?.username || discordId} started playing FiveM at ${now.toISOString()}`);
      activeSessions.set(discordId, now);
    }
  }

  // EVENT: DROP
  if (wasPlaying && !isPlaying) {
    const startTime = activeSessions.get(discordId);
    if (!startTime) return; // Might happen if bot restarted while they were playing

    console.log(`[DROP] ${newPresence.user?.username || discordId} stopped playing FiveM at ${now.toISOString()}`);
    activeSessions.delete(discordId);

    const overlap = getValidOverlap(startTime, now);
    if (overlap) {
      console.log(`[ABSENSI] ${newPresence.user?.username || discordId} played ${overlap.duration} valid minutes.`);

      // Use the helper to get strictly formatted WIB shift date
      const dateString = getShiftDateString(startTime);

      const docId = `${discordId}_${dateString}`;
      const docRef = doc(db, 'daily_sessions', docId);

      try {
        const snap = await getDoc(docRef);
        let data = snap.exists() ? snap.data() : {
          discord_id: discordId,
          name: newPresence.user?.username || "Unknown",
          date: dateString,
          total_minutes_valid: 0,
          status: "TIDAK HADIR",
          segments: []
        };

        data.total_minutes_valid += overlap.duration;
        data.segments.push({
          start: startTime.toISOString(),
          end: now.toISOString(),
          duration: overlap.duration
        });

        if (data.total_minutes_valid >= 60) {
          if (data.status !== "HADIR") {
            data.status = "HADIR";

            // --- SYNC TO WEB DASHBOARD ---
            try {
              const membersRef = collection(db, "members");
              const q = query(membersRef, where("discord_id", "==", discordId));
              const querySnapshot = await getDocs(q);

              if (!querySnapshot.empty) {
                const memberDoc = querySnapshot.docs[0];
                const memberId = memberDoc.id;

                const monthStr = getShiftMonthString(startTime);
                const day = getShiftDay(startTime);

                const attRef = doc(db, "attendance", monthStr);

                // Use setDoc with merge: true to avoid overwriting other members
                await setDoc(attRef, {
                  [memberId]: {
                    [day]: true
                  }
                }, { merge: true });

                console.log(`[SYNC] Synced attendance for ${memberDoc.data().name} (${memberId}) to web dashboard.`);
              } else {
                console.log(`[SYNC] Discord ID ${discordId} not found in web members.`);
              }
            } catch (syncErr) {
              console.error("[SYNC ERROR]", syncErr.message);
            }
          }
        }

        await setDoc(docRef, data);
        console.log(`[ABSENSI] Saved ${overlap.duration} mins for ${discordId}. Total: ${data.total_minutes_valid}`);
      } catch (e) {
        console.error(`[ERROR] Firebase Error for ${discordId}:`, e.message);
      }
    } else {
      console.log(`[ABSENSI] Ignored ${newPresence.user?.username || discordId} because playtime was outside 22:00-01:00 window.`);
    }
  }
});

// EVENT: MESSAGE (Untuk Command !cekabsen)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === '!cekabsen') {
    const discordId = message.author.id;
    let currentValidMins = 0;

    // Cek apakah sedang bermain sekarang
    if (activeSessions.has(discordId)) {
      const overlap = getValidOverlap(activeSessions.get(discordId), new Date());
      currentValidMins = overlap ? overlap.duration : 0;
    }

    // Ambil data yang sudah disave di database hari ini (Pakai WIB)
    const now = new Date();
    const dateString = getShiftDateString(now);
    const docId = `${discordId}_${dateString}`;

    let dbMins = 0;
    try {
      const snap = await getDoc(doc(db, 'daily_sessions', docId));
      if (snap.exists()) {
        dbMins = snap.data().total_minutes_valid || 0;
      }
    } catch (e) {
      console.error("[DB ERROR] cekabsen", e.message);
    }

    const total = dbMins + currentValidMins;

    if (total >= 60) {
      const overEmbed = new EmbedBuilder()
        .setColor(0x22C55E)
        .setTitle('✅  Absensi Terkonfirmasi!')
        .setDescription(
          `Keren, <@${discordId}>! Kamu telah memenuhi syarat absensi shift malam ini.\n\n` +
          `\`${makeBar(total)}\ ` + '`' + ` **${formatTime(total)}** / 1h 0m\n\n` +
          `> 📋 Status: **HADIR** · Sudah tercatat di Web Dashboard ✔️`
        )
        .setFooter({ text: '🌙 Shift Malam  ·  21:00 – 00:00 WIB' })
        .setTimestamp();
      return message.reply({ embeds: [overEmbed] });
    } else {
      const remaining = 60 - total;
      const pct = Math.round((total / 60) * 100);
      const notYetEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🕒  Absensi Belum Terpenuhi')
        .setDescription(
          `Hai <@${discordId}>! Terus bermain untuk memenuhi syarat absensi.\n\n` +
          `\`${makeBar(total)}\ ` + '`' + ` **${formatTime(total)}** / 1h 0m  *(${pct}%)*\n\n` +
          `> ⚡ Kurang **${formatTime(remaining)}** lagi sebelum jam **00:00 WIB**!`
        )
        .setFooter({ text: '🌙 Shift Malam  ·  21:00 – 00:00 WIB' })
        .setTimestamp();
      return message.reply({ embeds: [notYetEmbed] });
    }
  }

  // --- COMMAND: !myid ---
  if (message.content.toLowerCase() === '!myid') {
    const user = message.author;
    const myidEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🪪  Discord ID Kamu')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Username', value: `\`${user.username}\``, inline: true },
        { name: '🆔 Discord ID', value: `\`${user.id}\``, inline: true }
      )
      .setDescription('> Salin **Discord ID** di atas dan berikan kepada Admin untuk didaftarkan di Web Absensi!')
      .setFooter({ text: 'Shade of Triads · Web Attendance System' })
      .setTimestamp();
    return message.reply({ embeds: [myidEmbed] });
  }

  if (message.content.toLowerCase() === '!totalabsen') {
    const now = new Date();
    const dateString = getShiftDateString(now);
    const wibNow = toWIB(now);
    const day = wibNow.getUTCDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[wibNow.getUTCMonth()];
    const year = wibNow.getUTCFullYear();
    const timeStr = `${String(wibNow.getUTCHours()).padStart(2, '0')}:${String(wibNow.getUTCMinutes()).padStart(2, '0')}`;

    try {
      // 1. Tarik pemetaan Discord ID ke Nama & Callsign Web (dari koleksi 'members')
      const membersSnap = await getDocs(collection(db, "members"));
      const webInfo = new Map(); // discord_id → { name, callsign }
      membersSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.discord_id) {
          webInfo.set(d.discord_id, {
            name: d.name || "Unknown",
            callsign: d.callsign || d.nickname || d.name || "?"
          });
        }
      });

      // 2. Tarik data sesi harian
      const q = query(collection(db, 'daily_sessions'), where('date', '==', dateString));
      const snapshot = await getDocs(q);

      const memberStats = new Map();

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const info = webInfo.get(data.discord_id);
        memberStats.set(data.discord_id, {
          name: info ? info.name : "Unregistered",
          callsign: info ? info.callsign : (data.name || "?"),
          total: data.total_minutes_valid || 0
        });
      });

      // Tambahkan menit yang sedang berjalan di memori agar Real-Time
      for (const [id, startTime] of activeSessions.entries()) {
        const overlap = getValidOverlap(startTime, new Date());
        const currentValidMins = overlap ? overlap.duration : 0;

        if (currentValidMins > 0) {
          if (memberStats.has(id)) {
            memberStats.get(id).total += currentValidMins;
          } else {
            const info = webInfo.get(id);
            let fallbackCallsign = "?";
            if (!info) {
              try {
                const u = await client.users.fetch(id);
                if (u) fallbackCallsign = u.username;
              } catch (e) { }
            }
            memberStats.set(id, {
              name: info ? info.name : "Unregistered",
              callsign: info ? info.callsign : fallbackCallsign,
              total: currentValidMins
            });
          }
        }
      }

      let attended = [];
      let notAttended = [];

      for (const [id, data] of memberStats.entries()) {
        if (data.name === 'Unregistered') continue; // Abaikan member yang belum terdaftar di web
        if (data.total >= 60) attended.push(data);
        else if (data.total > 0) notAttended.push(data);
      }

      attended.sort((a, b) => b.total - a.total);
      notAttended.sort((a, b) => b.total - a.total);

      const totalParticipants = attended.length + notAttended.length;

      // ── Build Attended Field ──────────────────────────────────────────
      let attendedValue;
      if (attended.length === 0) {
        attendedValue = '*Belum ada yang hadir malam ini…*';
      } else {
        attendedValue = attended.map((m, i) =>
          `\`${i + 1}.\` **${m.name}** \`${m.callsign}\` — **${formatTime(m.total)}**`
        ).join('\n');
      }

      // ── Build Not Attending Field ─────────────────────────────────────
      let notAttValue;
      if (notAttended.length === 0) {
        notAttValue = '*Semua member sudah hadir! 🎉*';
      } else {
        notAttValue = notAttended.map((m, i) => {
          const bar = makeBar(m.total);
          const pct = Math.round((m.total / 60) * 100);
          const rem = 60 - m.total;
          return `\`${i + 1}.\` **${m.name}** \`${m.callsign}\`\n` +
            `\`${bar}\` ${formatTime(m.total)} *(${pct}% · kurang ${formatTime(rem)})*`;
        }).join('\n\n');
      }

      // ── Attendance rate bar ───────────────────────────────────────────
      const attRate = totalParticipants > 0
        ? Math.round((attended.length / totalParticipants) * 100) : 0;
      const summaryBar = makeBar(attRate, 100, 12);

      // ── Truncate field values to Discord's 1024-char limit ───────────
      const FIELD_LIMIT = 1024;
      function truncateField(value, suffix = '\n*…dan lainnya (terlalu panjang untuk ditampilkan)*') {
        if (value.length <= FIELD_LIMIT) return value;
        const cut = value.lastIndexOf('\n', FIELD_LIMIT - suffix.length);
        return (cut > 0 ? value.slice(0, cut) : value.slice(0, FIELD_LIMIT - suffix.length)) + suffix;
      }
      attendedValue = truncateField(attendedValue);
      notAttValue   = truncateField(notAttValue);

      // ── Build the Embed ───────────────────────────────────────────────
      const recapEmbed = new EmbedBuilder()
        .setColor(0x7C3AED)
        .setTitle(`🌙  SHIFT MALAM — ATTENDANCE RECAP`)
        .setDescription(
          `> 📅 **${day} ${monthName} ${year}**  ·  🕘 Shift: **21:00 – 00:00 WIB**\n` +
          `> ⏱️ Minimum playtime: **1h 0m**\n` +
          `> \`${summaryBar}\` **${attRate}% hadir** (${attended.length}/${totalParticipants} member)`
        )
        .addFields(
          {
            name: `✅  Hadir — ${attended.length} Anggota`,
            value: attendedValue || '\u200b'
          },
          {
            name: `❌  Tidak Hadir — ${notAttended.length} Anggota`,
            value: notAttValue || '\u200b'
          }
        )
        .setFooter({
          text: `Hadir: ${attended.length} · Tidak hadir: ${notAttended.length} · Total: ${totalParticipants} · Hari ini pukul ${timeStr}`
        })
        .setTimestamp();

      return message.reply({ embeds: [recapEmbed] });
    } catch (e) {
      console.error("[TOTALABSEN ERROR]", e.message);
      console.error("[TOTALABSEN ERROR] Stack:", e.stack);
      const errEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌  Terjadi Kesalahan')
        .setDescription(`Gagal mengambil data absensi. Coba lagi beberapa saat.\n\`\`\`${e.message}\`\`\``)
        .setTimestamp();
      return message.reply({ embeds: [errEmbed] });
    }
  }
});

// --- PATROLI REAL-TIME (Berjalan Setiap 5 Menit) ---
setInterval(async () => {
  const now = new Date();
  for (const [discordId, startTime] of activeSessions.entries()) {
    const overlap = getValidOverlap(startTime, now);

    if (overlap && overlap.duration >= 5) { // Minimal update setiap 5 menit
      const dateString = getShiftDateString(startTime);
      const docId = `${discordId}_${dateString}`;
      const docRef = doc(db, 'daily_sessions', docId);

      try {
        const snap = await getDoc(docRef);
        let data = snap.exists() ? snap.data() : {
          discord_id: discordId,
          name: "Seseorang",
          date: dateString,
          total_minutes_valid: 0,
          status: "TIDAK HADIR",
          segments: []
        };

        // Coba perbarui nama dari cache jika memungkinkan
        try {
          const user = await client.users.fetch(discordId);
          if (user) data.name = user.username;
        } catch (e) { }

        data.total_minutes_valid += overlap.duration;
        data.segments.push({
          start: startTime.toISOString(),
          end: now.toISOString(),
          duration: overlap.duration
        });

        let justReached90 = false;
        if (data.total_minutes_valid >= 60) {
          if (data.status !== "HADIR") {
            data.status = "HADIR";
            justReached90 = true;
          }
        }

        await setDoc(docRef, data);

        // Sangat Penting: Reset waktu mulai untuk orang ini agar tidak dihitung ganda!
        activeSessions.set(discordId, now);

        // Sinkronisasi ke Web Dashboard secara Real-Time jika baru saja menembus 90 menit
        if (justReached90) {
          try {
            const membersRef = collection(db, "members");
            const q = query(membersRef, where("discord_id", "==", discordId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const memberDoc = querySnapshot.docs[0];
              const memberId = memberDoc.id;

              const monthStr = getShiftMonthString(startTime);
              const day = getShiftDay(startTime);

              const attRef = doc(db, "attendance", monthStr);
              await setDoc(attRef, {
                [memberId]: {
                  [day]: true
                }
              }, { merge: true });

              console.log(`[PATROLI] Real-Time Sync! Absen untuk ${memberDoc.data().name} berhasil tercentang tanpa harus keluar game.`);
            }
          } catch (syncErr) {
            console.error("[PATROLI SYNC ERROR]", syncErr.message);
          }
        }
      } catch (e) {
        console.error(`[PATROLI ERROR] Firebase Error for ${discordId}:`, e.message);
      }
    }
  }
}, 5 * 60 * 1000);

// Login using .env token
if (!process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error("CRITICAL ERROR: DISCORD_BOT_TOKEN is not set in .env!");
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error("CRITICAL ERROR: Failed to login. Check your token.", err);
});
