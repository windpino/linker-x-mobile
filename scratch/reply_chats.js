import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, setDoc, doc } from "firebase/firestore";
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

async function reply() {
  const colRef = collection(db, "companies", "DMK", "agentChats");
  const q = query(colRef, where("status", "==", "pending"));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("No pending messages found.");
    return;
  }
  
  for (const d of snap.docs) {
    const data = d.data();
    if (data.text.includes("5개만 남기고") || data.text.includes("5개")) {
      console.log(`Processing message: "${data.text}" with ID: ${d.id}`);
      
      // Update status to processed
      await setDoc(doc(db, "companies", "DMK", "agentChats", d.id), {
        status: "processed"
      }, { merge: true });
      
      // Add response
      const responseId = `msg_rep_${Date.now()}`;
      const replyText = "✅ 대시보드 화면에서 자주 찾는 메뉴 슬롯 개수를 기존 7개에서 5개로 축소하고, 레이아웃을 5열 그리드로 깔끔하게 재정렬했습니다! 설정 창에서도 5개의 슬롯으로 일관되게 관리하실 수 있습니다. GitHub 푸시 및 Vercel 실시간 배포 완료되었습니다.";
      await setDoc(doc(db, "companies", "DMK", "agentChats", responseId), {
        id: responseId,
        timestamp: new Date().toISOString(),
        sender: "IBG-Dev",
        senderName: "IBG-데브 (AI)",
        text: replyText,
        status: "processed"
      });
      
      console.log("Success! Replied to user.");
    }
  }
}

reply().catch(console.error);
