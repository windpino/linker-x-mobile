import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where } from 'firebase/firestore';

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

const companyId = 'DMK';
console.log(`Listening for pending developer commands in companies/${companyId}/devCommands...`);

const q = query(collection(db, 'companies', companyId, 'devCommands'), where('status', '==', 'pending'));
onSnapshot(q, (snap) => {
  snap.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      const path = change.doc.ref.path;
      console.log(`[PENDING_DEV_COMMAND] PATH: ${path} | COMMAND: ${data.command}`);
    }
  });
}, (err) => {
  console.error("Firestore listen error:", err);
});
