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

async function replyProcessed() {
  const colRef = collection(db, "companies", "DMK", "agentChats");
  const q = query(colRef, where("status", "==", "processing"));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("No processing messages found.");
    return;
  }
  
  for (const d of snap.docs) {
    console.log(`Finalizing message: "${d.data().text}" with ID: ${d.id}`);
    
    // 1. Mark the user message as 'processed'
    await setDoc(doc(db, "companies", "DMK", "agentChats", d.id), {
      status: "processed"
    }, { merge: true });
    
    const responseId = `msg_rep_${Date.now()}`;
    const replyText = `✅ **[모바일 웹 브라우저 화면 끌어당김 새로고침 방지(Pull-to-refresh) 적용 완료]**\n\n대표님께서 모바일 앱 AI 명령창에 남겨주신 지시사항("웹브라우저처럼 위에서 아래로 당기면 새로고침이 되는데 이렇게 작동 되지 않도록 해줘 위에서 아래로 끌어 당겨도 어떤 반응도 일어나지 않도록 해줘")을 완벽히 반영하여 배포를 완료했습니다!\n\n🛠  **조치 내역**:\n- **새로고침 방지(Pull-to-refresh 비활성화) 스타일 적용**: 모바일 웹 브라우저에서 화면을 위에서 아래로 스와이프할 때 강제 새로고침(Pull-to-refresh) 동작이 발생하는 현상을 방지하기 위해, 웹앱 전체의 최상위 부모 엘리먼트(\`html, body\`)에 CSS \`overscroll-behavior-y: none\` 스타일 속성을 적용했습니다.\n- **동작 반응 방지**: 이제 모바일 Chrome, Safari 등의 웹 브라우저에서 상단을 아래로 세게 끌어당겨도 새로고침 동작이 무시되며, 오버스크롤 리바운드 애니메이션 등 불필요한 반응이 일절 일어나지 않도록 제어했습니다.\n\n💡 **적용 확인**: 브라우저 창을 완전히 새로고침(혹은 모바일 브라우저 탭을 완전히 닫았다가 재접속) 하신 후, 화면의 빈 곳을 터치하여 위에서 아래로 쓸어내려 보며 새로고침이 완전히 차단되었는지 직접 확인해 보세요!`;
    await setDoc(doc(db, "companies", "DMK", "agentChats", responseId), {
      id: responseId,
      timestamp: new Date().toISOString(),
      sender: "IBG-Dev",
      senderName: "IBG-데브 (AI)",
      text: replyText,
      status: "processed"
    });
    
    console.log("Success! Posted completion message.");
  }
}

replyProcessed().catch(console.error);
