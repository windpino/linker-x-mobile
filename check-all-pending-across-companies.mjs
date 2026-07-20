import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
const companies = ['DMK', 'jinmi', 'pino75_496h', 'windpino_ldmo'];

async function run() {
  for (const cid of companies) {
    const q1 = query(collection(db, 'companies', cid, 'devCommands'), where('status', '==', 'pending'));
    const snap1 = await getDocs(q1);
    snap1.forEach(d => {
      console.log(`[FOUND PENDING] COMPANY: ${cid} | TYPE: devCommands | PATH: ${d.ref.path} | COMMAND: ${d.data().command}`);
    });

    const q2 = query(collection(db, 'companies', cid, 'agentCommands'), where('status', '==', 'pending'));
    const snap2 = await getDocs(q2);
    snap2.forEach(d => {
      console.log(`[FOUND PENDING] COMPANY: ${cid} | TYPE: agentCommands | PATH: ${d.ref.path} | COMMAND: ${d.data().text || d.data().command}`);
    });
  }
  console.log("Check complete.");
}

run().catch(console.error);
