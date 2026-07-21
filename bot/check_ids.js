const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
require('dotenv').config();

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

async function checkMembers() {
  const membersSnap = await getDocs(collection(db, "members"));
  let count = 0;
  for (const docSnap of membersSnap.docs) {
    const data = docSnap.data();
    if (data.discord_id) {
      const cleanId = data.discord_id.trim();
      if (cleanId !== data.discord_id) {
        console.log(`FIXING: ${data.name} (Spasi berlebih ditemukan)`);
        await updateDoc(doc(db, "members", docSnap.id), { discord_id: cleanId });
        count++;
      }
      
      if (!/^\d+$/.test(cleanId)) {
        console.log(`WARNING: ${data.name} memasukkan ID yang bukan angka: "${cleanId}" (Kemungkinan ini Username, bukan Discord ID!)`);
      }
    }
  }
  console.log(`Selesai! Diperbaiki: ${count}`);
  process.exit(0);
}
checkMembers();
