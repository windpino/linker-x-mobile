const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAqx7nPiQ0mJGqnAGv28dO07C3-GQuqkpk",
  authDomain: "link-x-6606e.firebaseapp.com",
  projectId: "link-x-6606e",
  storageBucket: "link-x-6606e.firebasestorage.app",
  messagingSenderId: "236294239528",
  appId: "1:236294239528:web:8f735c42d36d6d1c434c1d",
  measurementId: "G-G8626RZH6X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const companyId = 'DMK';
  const q = query(collection(db, 'companies', companyId, 'devCommands'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("[NO_PENDING_COMMANDS]");
  } else {
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      console.log(`[PENDING_COMMAND] ID: ${docSnap.id} | COMMAND: ${data.command}`);
    }
  }
}

check().catch(console.error);
