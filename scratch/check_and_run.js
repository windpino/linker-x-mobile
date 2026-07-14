import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const envPath = path.resolve("f:/Project/INEVITGEN/IBG_Dev", ".env");
const envConfig = fs.readFileSync(envPath, "utf-8");
const env = {};
envConfig.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPending() {
  const colRef = collection(db, "companies", "DMK", "agentChats");
  const q = query(colRef, where("status", "==", "pending"));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("STATUS: NO_PENDING_COMMANDS");
    return;
  }
  
  console.log(`STATUS: PENDING_COMMANDS_FOUND (Count: ${snap.size})`);
  
  for (const d of snap.docs) {
    const data = d.data();
    console.log(`- ID: ${d.id} | USER: ${data.senderName || data.sender} | TEXT: "${data.text}"`);
    
    // 1. Update status to 'processing'
    await setDoc(doc(db, "companies", "DMK", "agentChats", d.id), {
      status: "processing"
    }, { merge: true });
    
    // 2. Add 'processing' feedback message
    const responseId = `msg_rep_${Date.now()}`;
    const progressText = `🛠️ **[코드 수정 진행 중]**\n\n지시사항: "${data.text}"\n\nAI 에이전트가 이 명령을 감지하여 코드를 수정하고 빌드를 검증하고 있습니다. 잠시만 기다려주세요! 완료 시 알려드리겠습니다.`;
    await setDoc(doc(db, "companies", "DMK", "agentChats", responseId), {
      id: responseId,
      timestamp: new Date().toISOString(),
      sender: "IBG-Dev",
      senderName: "IBG-데브 (AI)",
      text: progressText,
      status: "processed"
    });
  }
}

checkPending().catch(console.error);
