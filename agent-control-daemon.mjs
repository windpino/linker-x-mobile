import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';

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

console.log("🤖 Agent Control Daemon starting...");

let triggered = false;

function triggerWakeup(path, type, command) {
  if (triggered) return;
  triggered = true;
  console.log(`[PENDING_COMMAND] PATH: ${path} | TYPE: ${type} | COMMAND: ${command}`);
  process.exit(0);
}

async function start() {
  console.log("Fetching list of companies...");
  const snap = await getDocs(collection(db, 'companies'));
  const companyIds = [];
  snap.forEach(d => companyIds.push(d.id));
  console.log(`Available companies: ${companyIds.join(', ')}`);

  for (const cid of companyIds) {
    console.log(`Setting up real-time listener for company: ${cid}`);
    
    const qDev = query(collection(db, 'companies', cid, 'devCommands'), where('status', '==', 'pending'));
    onSnapshot(qDev, (s) => {
      if (!s.empty) {
        const doc = s.docs[0];
        triggerWakeup(doc.ref.path, 'dev', doc.data().command);
      }
    }, (err) => {
      console.error(`Error listening to ${cid} devCommands:`, err);
    });

    const qAgent = query(collection(db, 'companies', cid, 'agentCommands'), where('status', '==', 'pending'));
    onSnapshot(qAgent, (s) => {
      if (!s.empty) {
        const doc = s.docs[0];
        triggerWakeup(doc.ref.path, 'chat', doc.data().text || doc.data().command);
      }
    }, (err) => {
      console.error(`Error listening to ${cid} agentCommands:`, err);
    });
  }
  
  console.log("🤖 Listening on all companies in real-time...");
}

start().catch(console.error);
