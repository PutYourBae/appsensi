require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } = require('firebase/firestore');
const { format, differenceInMinutes } = require('date-fns');

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
    
    // Hanya mendeteksi jika di statusnya secara eksplisit tertulis "cerita kita"
    // Mengecek di Name, State (biasanya nama server), atau Details
    if (actName.includes("cerita kita") || actState.includes("cerita kita") || actDetails.includes("cerita kita")) {
      return true; 
    }
  }
  return false;
}

// Helper: Check if a time is within our valid window (22:00 to 01:00)
function calculateValidMinutes(joinDate, dropDate) {
  let windowStart = new Date(joinDate);
  windowStart.setHours(22, 0, 0, 0);
  
  let windowEnd = new Date(joinDate);
  windowEnd.setHours(1, 0, 0, 0);
  
  // If joinDate is between 00:00 and 01:00, it belongs to the *previous* day's evening window
  if (joinDate.getHours() < 12) {
    windowStart.setDate(windowStart.getDate() - 1);
  } else {
    windowEnd.setDate(windowEnd.getDate() + 1);
  }

  // Find the overlap between [joinDate, dropDate] and [windowStart, windowEnd]
  const validStart = joinDate > windowStart ? joinDate : windowStart;
  const validEnd = dropDate < windowEnd ? dropDate : windowEnd;

  if (validStart >= validEnd) return 0; // No valid overlap

  return differenceInMinutes(validEnd, validStart);
}

client.once('ready', async () => {
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

    const validMins = calculateValidMinutes(startTime, now);
    if (validMins > 0) {
      console.log(`[ABSENSI] ${newPresence.user?.username || discordId} played ${validMins} valid minutes.`);
      
      // Use the windowStart's date as the "Attendance Date" (e.g. 2026-06-09)
      let sessionDate = new Date(startTime);
      if (sessionDate.getHours() < 12) {
        sessionDate.setDate(sessionDate.getDate() - 1);
      }
      const dateString = format(sessionDate, 'yyyy-MM-dd');
      
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
        
        data.total_minutes_valid += validMins;
        data.segments.push({
          start: startTime.toISOString(),
          end: now.toISOString(),
          duration: validMins
        });
        
        if (data.total_minutes_valid >= 90) {
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
                
                // Define months array in Indonesian format as used in Web (e.g. Jun-2026)
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
                const monthStr = `${monthNames[sessionDate.getMonth()]}-${sessionDate.getFullYear()}`;
                const day = sessionDate.getDate();
                
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
        console.log(`[ABSENSI] Saved ${validMins} mins for ${discordId}. Total: ${data.total_minutes_valid}`);
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
      currentValidMins = calculateValidMinutes(activeSessions.get(discordId), new Date());
    }
    
    // Ambil data yang sudah disave di database hari ini
    const now = new Date();
    let sessionDate = new Date(now);
    if (sessionDate.getHours() < 12) {
      sessionDate.setDate(sessionDate.getDate() - 1);
    }
    const dateString = format(sessionDate, 'yyyy-MM-dd');
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
    
    if (total >= 90) {
      return message.reply(`✅ Halo <@${discordId}>! Kamu sudah mengumpulkan **${total} menit** bermain untuk shift malam ini. Status kamu **HADIR** di Web!`);
    } else {
      const remaining = 90 - total;
      return message.reply(`🕒 Halo <@${discordId}>! Kamu baru mengumpulkan **${total} menit** malam ini.\nKurang **${remaining} menit** lagi untuk dihitung Hadir (sebelum jam 01:00).`);
    }
  }
});

// Login using .env token
if (!process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error("CRITICAL ERROR: DISCORD_BOT_TOKEN is not set in .env!");
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error("CRITICAL ERROR: Failed to login. Check your token.", err);
});
