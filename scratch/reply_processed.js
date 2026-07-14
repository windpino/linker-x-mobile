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
    const replyText = `✅ **[모바일 UI 및 레이아웃 사용성 전면 개선 배포 완료]**\n\n대표님께서 모바일 앱 AI 명령창에 남겨주신 세 가지 지시사항들을 완벽히 반영하여 패치 및 배포했습니다!\n\n🛠️ **업데이트 내역**:\n1️⃣ **달력 테두리 제거 및 모바일 화면 꽉 채움**:\n- 모바일 달력 모달창 내부의 여백(padding)을 완전히 없애 달력 칸들이 기기 화면 좌우 끝까지 꽉 차도록 확장했습니다.\n- 달력의 외곽 테두리와 내부 선들을 투명/제거하여 막힘없이 깔끔한 캘린더 뷰를 제공합니다.\n- 모바일 달력에서 불필요한 **[설정 톱니바퀴]** 및 **[위젯 잠금(열쇠 모양)]** 제어 단추를 모두 제거하였습니다.\n\n2️⃣ **자주 찾는 메뉴 설정 창 가로 스크롤 제거 (세로 정렬 및 줄바꿈)**:\n- 기존 자주 찾는 메뉴 설정 화면에서 5개 슬롯이 가로로 배열되어 모바일에서 가로 스크롤바가 나타나던 문제를 해결했습니다.\n- 모바일 화면에서는 **5개 슬롯이 한 줄에 하나씩 깔끔하게 세로로 정렬되며**, 텍스트 줄바꿈 처리를 완벽하게 적용했습니다.\n\n3️⃣ **수주 등록 화면 날짜 잘림 수정**:\n- 간편수주 등록 화면의 좌측 상단 날짜 입력 칸이 모바일 기기(Galaxy S21 등)에서 끝부분이 잘리던 현상을 수정했습니다.\n- 입력 필드 너비를 충분히(125px) 넓혀서 연-월-일 날짜 정보 전체가 온전히 표시되도록 가시성을 개선했습니다.\n\n💡 **적용 확인**: 브라우저 창을 새로고침 하신 후, 변경된 월간 달력 화면, 자주 찾는 메뉴 설정 창, 수주 등록 화면을 직접 확인해 보세요!`;
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
