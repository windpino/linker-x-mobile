import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

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

console.log("🟢 [Online] Antigravity Remote Coding Daemon Active");

let triggered = false;

function triggerWakeup(path, type, command, docId, cid) {
  if (triggered) return;
  triggered = true;
  console.log("\n========================================================");
  console.log("🚨 [PENDING_COMMAND_RECEIVED] 미스링 원격 개발 명령 도착!");
  console.log(`DOC_PATH: ${path}`);
  console.log(`COMPANY_ID: ${cid}`);
  console.log(`DOC_ID: ${docId}`);
  console.log(`COMMAND: ${command}`);
  console.log("========================================================\n");
  process.exit(0);
}

async function start() {
  const snap = await getDocs(collection(db, 'companies'));
  const companyIds = ['no1dmkr'];
  snap.forEach(d => {
    if (!companyIds.includes(d.id)) companyIds.push(d.id);
  });
  console.log(`📡 Monitoring Companies: ${companyIds.join(', ')}`);

  // 1. Check existing pending commands immediately on startup
  for (const cid of companyIds) {
    try {
      const qDev = query(collection(db, 'companies', cid, 'devCommands'), where('status', '==', 'pending'));
      const sDev = await getDocs(qDev);
      if (!sDev.empty) {
        const d = sDev.docs[0];
        triggerWakeup(d.ref.path, 'dev', d.data().command || d.data().text, d.id, cid);
        return;
      }

      const qAgent = query(collection(db, 'companies', cid, 'agentCommands'), where('status', '==', 'pending'));
      const sAgent = await getDocs(qAgent);
      if (!sAgent.empty) {
        const d = sAgent.docs[0];
        triggerWakeup(d.ref.path, 'chat', d.data().text || d.data().command, d.id, cid);
        return;
      }
    } catch (e) {
      console.warn(`Initial check error on ${cid}:`, e.message);
    }
  }

  // 2. Real-time Listeners
  for (const cid of companyIds) {
    try {
      const qDev = query(collection(db, 'companies', cid, 'devCommands'), where('status', '==', 'pending'));
      onSnapshot(qDev, (s) => {
        if (!s.empty) {
          const d = s.docs[0];
          triggerWakeup(d.ref.path, 'dev', d.data().command || d.data().text, d.id, cid);
        }
      }, () => {});

      const qAgent = query(collection(db, 'companies', cid, 'agentCommands'), where('status', '==', 'pending'));
      onSnapshot(qAgent, (s) => {
        if (!s.empty) {
          const d = s.docs[0];
          triggerWakeup(d.ref.path, 'chat', d.data().text || d.data().command, d.id, cid);
        }
      }, () => {});
    } catch (err) {
      console.warn(`Listener error on ${cid}:`, err.message);
    }
  }

  // 3. Fallback Periodic Polling (Guards against gRPC/WebSocket stream idle timeout)
  setInterval(async () => {
    if (triggered) return;
    try {
      for (const cid of companyIds) {
        const qDev = query(collection(db, 'companies', cid, 'devCommands'), where('status', '==', 'pending'));
        const sDev = await getDocs(qDev);
        if (!sDev.empty) {
          const d = sDev.docs[0];
          triggerWakeup(d.ref.path, 'dev', d.data().command || d.data().text, d.id, cid);
          return;
        }

        const qAgent = query(collection(db, 'companies', cid, 'agentCommands'), where('status', '==', 'pending'));
        const sAgent = await getDocs(qAgent);
        if (!sAgent.empty) {
          const d = sAgent.docs[0];
          triggerWakeup(d.ref.path, 'chat', d.data().text || d.data().command, d.id, cid);
          return;
        }
      }
    } catch {}
  }, 2000);

  console.log("⚡ [Online] Dual Real-time & Fail-Safe Polling Engine Ready.");
}

start().catch(console.error);
