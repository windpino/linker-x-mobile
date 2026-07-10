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

async function getStaffInfo(clean) {
  try {
    const snap = await getDocs(collection(db, "companies", "DMK", "staffList"));
    const staff = [];
    snap.forEach(d => {
      staff.push(d.data());
    });

    const matched = staff.find(s => s.name && clean.includes(s.name));
    if (matched) {
      return `👤 [직원 정보 조회]\n` +
        `- **이름**: ${matched.name}\n` +
        `- **역할/직책**: ${matched.role || "지정 없음"}\n` +
        `- **연락처**: ${matched.phone || "등록 없음"}\n` +
        `- **이메일**: ${matched.email || "등록 없음"}\n` +
        `- **소속**: ${matched.department || "지정 없음"}`;
    }

    let text = `👥 [전체 직원 현황 - 총 ${staff.length}명]\n`;
    staff.slice(0, 10).forEach((s, idx) => {
      text += `${idx + 1}. **${s.name}** (${s.role || "사원"}) - ${s.phone || "연락처 없음"}\n`;
    });
    if (staff.length > 10) {
      text += `...외 ${staff.length - 10}명의 직원이 더 등록되어 있습니다.`;
    }
    return text;
  } catch (err) {
    return `직원 정보 조회 에러: ${err.message}`;
  }
}

async function getWarehouseInfo(clean) {
  try {
    const snap = await getDocs(collection(db, "companies", "DMK", "warehouses"));
    const list = [];
    snap.forEach(d => {
      list.push(d.data());
    });

    let text = `🏢 [창고 현황 - 총 ${list.length}개소]\n`;
    list.forEach((w, idx) => {
      text += `${idx + 1}. **${w.name}**\n` +
        `   - 위치/주소: ${w.location || "기록 없음"}\n` +
        `   - 담당자: ${w.manager || "미지정"}\n`;
    });
    return text;
  } catch (err) {
    return `창고 정보 조회 에러: ${err.message}`;
  }
}

async function getPartnerInfo(clean) {
  try {
    const snap = await getDocs(collection(db, "companies", "DMK", "partners"));
    const list = [];
    snap.forEach(d => {
      list.push(d.data());
    });

    const matched = list.find(p => p.name && clean.includes(p.name));
    if (matched) {
      return `🤝 [거래처 상세 정보]\n` +
        `- **거래처명**: ${matched.name}\n` +
        `- **구분**: ${matched.type || "미지정"}\n` +
        `- **담당자**: ${matched.manager || "미지정"}\n` +
        `- **연락처**: ${matched.phone || "기록 없음"}\n` +
        `- **주소**: ${matched.address || "기록 없음"}\n` +
        `- **미수금**: ${(Number(matched.receivables) || 0).toLocaleString()}원\n` +
        `- **미지급금**: ${(Number(matched.payables) || 0).toLocaleString()}원`;
    }

    let text = `🤝 [전체 거래처 현황 - 총 ${list.length}개소]\n`;
    list.slice(0, 8).forEach((p, idx) => {
      text += `${idx + 1}. **${p.name}** (${p.type || "일반"}) - 미수금: ${(Number(p.receivables) || 0).toLocaleString()}원\n`;
    });
    if (list.length > 8) {
      text += `...외 ${list.length - 8}개의 거래처가 더 등록되어 있습니다.`;
    }
    return text;
  } catch (err) {
    return `거래처 정보 조회 에러: ${err.message}`;
  }
}

async function getProductInfo(clean) {
  try {
    const snap = await getDocs(collection(db, "companies", "DMK", "products"));
    const list = [];
    snap.forEach(d => {
      list.push(d.data());
    });

    const matched = list.find(p => p.name && clean.includes(p.name));
    if (matched) {
      return `📦 [품목 상세 정보]\n` +
        `- **품목명**: ${matched.name}\n` +
        `- **카테고리**: ${matched.category || "일반"}\n` +
        `- **기본 단가**: ${(Number(matched.basePrice) || 0).toLocaleString()}원\n` +
        `- **초기 재고**: ${(Number(matched.initialStock) || 0).toLocaleString()}개\n` +
        `- **적정 재고**: ${(Number(matched.optimalStock) || 0).toLocaleString()}개`;
    }

    let text = `📦 [전체 품목 현황 - 총 ${list.length}가지]\n`;
    list.slice(0, 10).forEach((p, idx) => {
      text += `${idx + 1}. **${p.name}** (${p.category || "일반"}) - 단가: ${(Number(p.basePrice) || 0).toLocaleString()}원\n`;
    });
    if (list.length > 10) {
      text += `...외 ${list.length - 10}개의 품목이 더 등록되어 있습니다.`;
    }
    return text;
  } catch (err) {
    return `품목 정보 조회 에러: ${err.message}`;
  }
}

async function getSmartFallbackResponse(clean) {
  try {
    const staffSnap = await getDocs(collection(db, "companies", "DMK", "staffList"));
    const warehouseSnap = await getDocs(collection(db, "companies", "DMK", "warehouses"));
    const productSnap = await getDocs(collection(db, "companies", "DMK", "products"));
    const partnerSnap = await getDocs(collection(db, "companies", "DMK", "partners"));

    return `🤖 [IBG-데브 실시간 AI 비서]\n` +
      `안녕하세요! 동명식품 ERP 데이터에 직접 연결되어 작동 중인 스마트 에이전트입니다.\n\n` +
      `현재 **API 키 없이 작동하도록 설정되어 있습니다.** 실시간 데이터 조회를 위해 다음 명령어나 질문을 입력해 보세요:\n\n` +
      `📊 **시스템 통계**:\n` +
      `- 등록 창고: ${warehouseSnap.size}개소\n` +
      `- 활성 직원: ${staffSnap.size}명\n` +
      `- 등록 품목: ${productSnap.size}종\n` +
      `- 거래처: ${partnerSnap.size}개사\n\n` +
      `💡 **입력할 수 있는 질문 예시**:\n` +
      `- \`오늘 매출\` 또는 \`!매출\`\n` +
      `- \`재고 현황\` 또는 \`!재고\`\n` +
      `- \`미수금 현황\` 또는 \`!미수금\`\n` +
      `- \`직원 정보\` 또는 \`직원 누구 있어?\` (특정 이름 포함 시 상세조회)\n` +
      `- \`창고 현황\` 또는 \`창고 목록\`\n` +
      `- \`거래처 목록\` 또는 특정 거래처명 정보 (예: 특정 회사명)\n` +
      `- \`품목 목록\` 또는 특정 제품명 정보`;
  } catch (err) {
    return `통계 조회 에러: ${err.message}`;
  }
}

async function handleMessage(msgText, docId) {
  const clean = msgText.trim().replace(/\s+/g, " ");
  
  // 0. Ignore developer/coding commands so the development agent can process them
  const devKeywords = [
    "수정", "변경", "추가", "삭제", "만들어", "코드", "화면", "디자인", "배열", 
    "정렬", "레이아웃", "버튼", "메뉴", "설정", "조정", "크기", "여백", "박스",
    "위젯", "닫고", "열고", "보여주고", "없에", "없애", "숨겨", "가려", "표시해", 
    "구현", "작동", "설치", "로컬", "서버", "빌드", "배포", "적용", "파일", 
    "메인", "모바일", "데스크탑"
  ];
  
  const hasDevKeyword = devKeywords.some(keyword => clean.includes(keyword));
  if (hasDevKeyword) {
    console.log(`🛠️ Dev command detected: "${clean}". Leaving it pending for coding agent.`);
    return;
  }
  
  // 1. Check for apikey setup command
  if (clean.startsWith("!apikey ")) {
    const key = clean.split(" ")[1];
    if (!key) return;
    await setDoc(doc(db, "companies", "DMK", "settings", "apiKeys"), { geminiKey: key });
    await respondToUser("🔑 Gemini API 키가 성공적으로 설정되었습니다. 이제 일반 AI 비서 대화가 가능합니다.", docId);
    return;
  }

  // 2. Check for core ERP commands
  if (clean === "!매출" || clean === "오늘 매출" || clean === "매출 현황" || clean.includes("매출")) {
    const res = await getSalesToday();
    await respondToUser(res, docId);
    return;
  }
  if (clean === "!재고" || clean === "재고 현황" || clean === "재고 부족" || clean.includes("재고")) {
    const res = await getInventoryAlerts();
    await respondToUser(res, docId);
    return;
  }
  if (clean === "!미수금" || clean === "미수금 현황" || clean === "외상" || clean.includes("미수금") || clean.includes("외상")) {
    const res = await getReceivablesTop();
    await respondToUser(res, docId);
    return;
  }
  if (clean.includes("직원") || clean.includes("사원") || clean.includes("인원") || clean.includes("멤버") || clean.includes("대리") || clean.includes("과장") || clean.includes("부장") || clean.includes("차장") || clean.includes("주임")) {
    const res = await getStaffInfo(clean);
    await respondToUser(res, docId);
    return;
  }
  if (clean.includes("창고") || clean.includes("웨어하우스") || clean.includes("보관소")) {
    const res = await getWarehouseInfo(clean);
    await respondToUser(res, docId);
    return;
  }
  if (clean.includes("거래처") || clean.includes("파트너") || clean.includes("상사") || clean.includes("식품") || clean.includes("유통") || clean.includes("물류")) {
    const res = await getPartnerInfo(clean);
    await respondToUser(res, docId);
    return;
  }
  if (clean.includes("품목") || clean.includes("제품") || clean.includes("상품") || clean.includes("물건") || clean.includes("간장") || clean.includes("고추장") || clean.includes("된장") || clean.includes("쌈장") || clean.includes("소금") || clean.includes("설탕")) {
    const res = await getProductInfo(clean);
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
    // Generate smart mock response without API key
    const reply = await getSmartFallbackResponse(clean);
    await respondToUser(reply, docId);
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
