const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore');
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

async function migrateMonth() {
  const oldRef = doc(db, "attendance", "Jun-2026");
  const newRef = doc(db, "attendance", "Juni-2026");
  
  const oldSnap = await getDoc(oldRef);
  if (oldSnap.exists()) {
    const data = oldSnap.data();
    await setDoc(newRef, data, { merge: true });
    await deleteDoc(oldRef);
    console.log("Berhasil memindahkan data dari Jun-2026 ke Juni-2026");
  } else {
    console.log("Data Jun-2026 tidak ditemukan");
  }
  process.exit(0);
}
migrateMonth();
