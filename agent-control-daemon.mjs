import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAqx7nPiQ0mJGqnAGv28dO5C3-GQuqkpk",
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
console.log(`🤖 Agent Control Daemon listening on companies/${companyId}...`);

const qDev = query(collection(db, 'companies', companyId, 'devCommands'), where('status', '==', 'pending'));
const qAgent = query(collection(db, 'companies', companyId, 'agentCommands'), where('status', '==', 'pending'));

let triggered = false;

function triggerWakeup(path, type, command) {
  if (triggered) return;
  triggered = true;
  console.log(`[PENDING_COMMAND] PATH: ${path} | TYPE: ${type} | COMMAND: ${command}`);
  process.exit(0);
}

const unsubDev = onSnapshot(qDev, (snap) => {
  if (!snap.empty) {
    const doc = snap.docs[0];
    triggerWakeup(doc.ref.path, 'dev', doc.data().command);
  }
}, (err) => {
  console.error("Firestore devCommands listen error:", err);
});

const unsubAgent = onSnapshot(qAgent, (snap) => {
  if (!snap.empty) {
    const doc = snap.docs[0];
    triggerWakeup(doc.ref.path, 'chat', doc.data().text || doc.data().command);
  }
}, (err) => {
  console.error("Firestore agentCommands listen error:", err);
});
