const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Since we don't have the exact config here, we can read it from src/firebase.js or .env
const fs = require('fs');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, 'companies', 'default', 'settings', 'inventory');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log('Inventory in Firestore:', JSON.stringify(snap.data(), null, 2));
  } else {
    console.log('No inventory document found in Firestore!');
  }
}

run().catch(console.error);
