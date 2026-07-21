const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
require('dotenv').config({ path: './.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanDiscordIds() {
  console.log("Mencari spasi nyasar di Discord ID...");
  let count = 0;
  
  const membersSnap = await getDocs(collection(db, "members"));
  
  for (const docSnap of membersSnap.docs) {
    const data = docSnap.data();
    if (data.discord_id && data.discord_id !== data.discord_id.trim()) {
      const cleanId = data.discord_id.trim();
      console.log(`Members [${data.name}] -> Mengubah "${data.discord_id}" menjadi "${cleanId}"`);
      await updateDoc(doc(db, "members", docSnap.id), {
        discord_id: cleanId
      });
      count++;
    }
  }
  
  console.log(`Selesai! Berhasil membersihkan ${count} data Discord ID.`);
  process.exit(0);
}

cleanDiscordIds();
