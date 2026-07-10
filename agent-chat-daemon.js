import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, 
  query, where, getDocs, setDoc, getDoc 
} from 'firebase/firestore';

// Firebase Config
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

console.log("🤖 LinkerX AI Agent Daemon starting...");
console.log("📡 Listening to companies/DMK/agentChats in real-time...");

// Helper to query Gemini API
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await res.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    return `Gemini API 응답 오류: ${JSON.stringify(data)}`;
  } catch (err) {
    return `Gemini API 호출 에러: ${err.message}`;
  }
}

// Core ERP command handlers
async function getSalesToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  const snap = await getDocs(collection(db, "companies", "DMK", "salesInvoices"));
  let total = 0;
  snap.forEach(d => {
    const inv = d.data();
    if (inv.date === todayStr) total += Number(inv.totalAmount) || 0;
  });
  return `📊 [실시간 매출 집계]\n금일(${todayStr}) 매출 총액은 **${total.toLocaleString()}원**입니다.`;
}

async function getInventoryAlerts() {
  const productsSnap = await getDocs(collection(db, "companies", "DMK", "products"));
  const invSnap = await getDoc(doc(db, "companies", "DMK", "settings", "inventory"));
  const inventory = invSnap.exists() ? (invSnap.data().value || {}) : {};

  let lowStock = [];
  productsSnap.forEach(d => {
    const p = d.data();
    const baseStock = Number(p.initialStock) || 0;
    let currentStock = baseStock;
    Object.values(inventory).forEach(whStocks => {
      currentStock += Number(whStocks[p.name]) || 0;
    });

    if (currentStock < (Number(p.optimalStock) || 0)) {
      lowStock.push({ name: p.name, current: currentStock, optimal: p.optimalStock });
    }
  });

  if (lowStock.length === 0) {
    return `📦 [실시간 재고 현황]\n현재 모든 품목의 재고가 적정 수준을 유지하고 있습니다.`;
  }

  let text = `⚠️ [재고 부족 경보 - 총 ${lowStock.length}개]\n`;
  lowStock.forEach((item, idx) => {
    text += `${idx + 1}. **${item.name}**: 현재고 ${item.current.toLocaleString()}개 / 안전재고 ${item.optimal.toLocaleString()}개\n`;
  });
  return text;
}

async function getReceivablesTop() {
  const snap = await getDocs(collection(db, "companies", "DMK", "partners"));
  let list = [];
  snap.forEach(d => {
    const p = d.data();
    if ((p.type === "매출처" || p.type === "혼합") && (Number(p.receivables) || 0) > 0) {
      list.push({ name: p.name, amount: Number(p.receivables) });
    }
  });

  list.sort((a, b) => b.amount - a.amount);
  if (list.length === 0) {
    return `💵 [미수금 잔액 보고]\n현재 연체되거나 정산되지 않은 거래처 미수금 잔액이 없습니다!`;
  }

  let text = `💵 [미수금 최고 잔액 거래처 탑 5]\n`;
  list.slice(0, 5).forEach((item, idx) => {
    text += `${idx + 1}. **${item.name}**: ${item.amount.toLocaleString()}원\n`;
  });
  return text;
}

async function handleMessage(msgText, docId) {
  const clean = msgText.trim().replace(/\s+/g, " ");
  
  // 1. Check for apikey setup command
  if (clean.startsWith("!apikey ")) {
    const key = clean.split(" ")[1];
    if (!key) return;
    await setDoc(doc(db, "companies", "DMK", "settings", "apiKeys"), { geminiKey: key });
    await respondToUser("🔑 Gemini API 키가 성공적으로 설정되었습니다. 이제 일반 AI 비서 대화가 가능합니다.", docId);
    return;
  }

  // 2. Check for core ERP commands
  if (clean === "!매출" || clean === "오늘 매출" || clean === "매출 현황") {
    const res = await getSalesToday();
    await respondToUser(res, docId);
    return;
  }
  if (clean === "!재고" || clean === "재고 현황" || clean === "재고 부족") {
    const res = await getInventoryAlerts();
    await respondToUser(res, docId);
    return;
  }
  if (clean === "!미수금" || clean === "미수금 현황" || clean === "외상") {
    const res = await getReceivablesTop();
    await respondToUser(res, docId);
    return;
  }

  // 3. Fallback: Check if Gemini API key exists
  const keySnap = await getDoc(doc(db, "companies", "DMK", "settings", "apiKeys"));
  if (keySnap.exists() && keySnap.data().geminiKey) {
    const key = keySnap.data().geminiKey;
    const erpSummary = `현재 동명식품 ERP 데이터 요약조회 명령어로 !매출, !재고, !미수금이 있습니다.`;
    const prompt = `너는 동명식품 물류 ERP의 인텔리전트 AI 비서 'IBG-데브'이다. 아래 질문에 친절하게 답변해라.
    
    질문: ${clean}
    
    *참고: ${erpSummary}`;
    
    const reply = await callGemini(prompt, key);
    await respondToUser(reply, docId);
  } else {
    // Return help instructions
    const helpMsg = `🤖 [IBG-데브 비서 안내]\n` +
      `동명식품 ERP 명령창에 오신 것을 환영합니다.\n\n` +
      `📌 **사용 가능한 단축 명령어**:\n` +
      `- \`오늘 매출\` 또는 \`!매출\` : 오늘자 총 매출 금액 요약\n` +
      `- \`재고 현황\` 또는 \`!재고\` : 안전재고 부족 품목 경고\n` +
      `- \`미수금 현황\` 또는 \`!미수금\` : 거래처별 외상 매출 잔액 탑5\n\n` +
      `💬 **일반 대화 및 똑똑한 AI 비서 분석**을 활성화하려면 아래 명령어로 API 키를 등록하세요:\n` +
      `\`!apikey 발급받은_Gemini_API_키\``;
    await respondToUser(helpMsg, docId);
  }
}

async function respondToUser(replyText, requestDocId) {
  // Mark request as processed
  await setDoc(doc(db, "companies", "DMK", "agentChats", requestDocId), {
    status: "processed"
  }, { merge: true });

  // Add response document
  const responseId = `msg_rep_${Date.now()}`;
  await setDoc(doc(db, "companies", "DMK", "agentChats", responseId), {
    id: responseId,
    timestamp: new Date().toISOString(),
    sender: "IBG-Dev",
    senderName: "IBG-데브 (AI)",
    text: replyText,
    status: "processed"
  });
}

// Listen to Firestore agentChats collection
onSnapshot(
  query(collection(db, "companies", "DMK", "agentChats"), where("status", "==", "pending")),
  (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        if (data.sender === "User") {
          console.log(`💬 User message: "${data.text}"`);
          await handleMessage(data.text, change.doc.id);
        }
      }
    });
  }
);
