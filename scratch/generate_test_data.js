import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";

// 1. .env 파일의 환경 변수 로딩
const envPath = path.resolve(process.cwd(), ".env");
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

// 2. Firebase SDK 초기화
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
const companyId = "default";

// 3. 테스트 품목 리스트 정의
const testProducts = [
  { id: 1001, name: "싱싱오징어", spec: "1kg/팩", category: "수산물", abbreviation: "오징어", purchasePrice: 10000, salesPrice: 13000, taxType: "과세", initialStock: 0 },
  { id: 1002, name: "활광어", spec: "1.5kg/미", category: "수산물", abbreviation: "광어", purchasePrice: 20000, salesPrice: 26000, taxType: "과세", initialStock: 0 },
  { id: 1003, name: "남해전복", spec: "10미/팩", category: "수산물", abbreviation: "전복", purchasePrice: 35000, salesPrice: 45000, taxType: "면세", initialStock: 0 },
  { id: 1004, name: "제주갈치", spec: "3지/마리", category: "수산물", abbreviation: "갈치", purchasePrice: 15000, salesPrice: 20000, taxType: "과세", initialStock: 0 }
];

// 4. 테스트 거래처 리스트 정의
const testPartners = [
  { id: 2001, name: "한려수산", ceo: "이순신", type: "매입처", businessNo: "123-45-67890", tel: "055-645-1234", address: "경남 통영시 항남동 1-1", manager: "이순신", companyId },
  { id: 2002, name: "다모아마트", ceo: "김유신", type: "매출처", businessNo: "987-65-43210", tel: "02-123-4567", address: "서울시 마포구 신수동 100", manager: "홍길동", companyId },
  { id: 2003, name: "삼익백화점", ceo: "을지문덕", type: "매출처", businessNo: "456-78-90123", tel: "02-987-6543", address: "서울시 서초구 반포동 500", manager: "임꺽정", companyId },
  { id: 2004, name: "태평양식자재", ceo: "강감찬", type: "매출처", businessNo: "111-22-33333", tel: "031-456-7890", address: "경기도 수원시 팔달구 인계동", manager: "강감찬", companyId }
];

async function generate() {
  console.log("🚀 Starting ERP Test Scenario Data Generation...");

  // --- [Step 1] 품목 및 거래처 등록 ---
  console.log("📦 Registering test products and partners...");
  for (const p of testProducts) {
    await setDoc(doc(db, "companies", companyId, "products", String(p.id)), p);
  }
  for (const pt of testPartners) {
    await setDoc(doc(db, "companies", companyId, "partners", String(pt.id)), pt);
  }

  // 실시간 재고 모델 시뮬레이터 객체
  const simulatedInventory = {
    "동명크릴 메인창고": {},
    "통영": {}
  };
  
  // 모든 품목 초기 재고 0으로 설정
  testProducts.forEach(p => {
    simulatedInventory["동명크릴 메인창고"][p.name] = 0;
    simulatedInventory["통영"][p.name] = 0;
  });

  const transferHistory = [];
  const purchaseInvoices = [];
  const salesInvoices = [];
  const salesOrders = [];

  // --- [Step 2] 매입 시나리오 적재 (실시간 재고 가산) ---
  console.log("📥 Simulating purchases...");
  
  // 사전 대량 기초 재고 매입 (대량 매출 시뮬레이션 시 마이너스 재고가 되지 않도록 넉넉하게 적재)
  const bulkPurchaseId = 3001;
  const bulkItems = testProducts.map(p => ({
    productId: p.id,
    name: p.name,
    spec: p.spec,
    qty: 5000,
    price: p.purchasePrice,
    taxType: p.taxType,
    supplyValue: p.taxType === "면세" ? 5000 * p.purchasePrice : Math.floor((5000 * p.purchasePrice) / 1.1),
    tax: p.taxType === "면세" ? 0 : 5000 * p.purchasePrice - Math.floor((5000 * p.purchasePrice) / 1.1),
    total: 5000 * p.purchasePrice
  }));
  
  const bulkInvoice = {
    id: bulkPurchaseId,
    date: "2026-05-25",
    partner: "한려수산",
    warehouse: "동명크릴 메인창고",
    manager: "이순신",
    items: bulkItems,
    receivedAmount: 0,
    payments: { cash: 0, account: 0, card: 0, bill: 0 },
    discount: 0,
    memo: "대량 기초 재고 매입 (시뮬레이션용)",
    companyId,
    creator: "이순신",
    createdAt: new Date().toISOString()
  };
  purchaseInvoices.push(bulkInvoice);
  
  // 재고 가산 및 매입 입고 이력 추가
  bulkItems.forEach(item => {
    simulatedInventory["동명크릴 메인창고"][item.name] = (simulatedInventory["동명크릴 메인창고"][item.name] || 0) + item.qty;
    
    const entryId = Date.now() + Math.random();
    transferHistory.push({
      id: entryId,
      date: "2026-05-25",
      from: "매입입고",
      to: "동명크릴 메인창고",
      item: item.name,
      spec: item.spec,
      qty: item.qty,
      processedAt: "10:00:00",
      operator: "이순신",
      memo: "[매입] 한려수산",
      purchaseInvoiceId: String(bulkPurchaseId),
      companyId
    });
  });

  // 일반 매입 시나리오
  const piId1 = 3002;
  const piItems1 = [
    { productId: 1001, name: "싱싱오징어", spec: "1kg/팩", qty: 200, price: 10000, taxType: "과세", supplyValue: 1818181, tax: 181819, total: 2000000 },
    { productId: 1003, name: "남해전복", spec: "10미/팩", qty: 100, price: 35000, taxType: "면세", supplyValue: 3500000, tax: 0, total: 3500000 }
  ];
  const purchaseInvoice1 = {
    id: piId1,
    date: "2026-05-29",
    partner: "한려수산",
    warehouse: "동명크릴 메인창고",
    manager: "이순신",
    items: piItems1,
    receivedAmount: 0,
    payments: { cash: 0, account: 0, card: 0, bill: 0 },
    discount: 0,
    memo: "싱싱 수산물 매입",
    companyId,
    creator: "이순신",
    createdAt: new Date().toISOString()
  };
  purchaseInvoices.push(purchaseInvoice1);
  
  piItems1.forEach(item => {
    simulatedInventory["동명크릴 메인창고"][item.name] = (simulatedInventory["동명크릴 메인창고"][item.name] || 0) + item.qty;
    
    const entryId = Date.now() + Math.random();
    transferHistory.push({
      id: entryId,
      date: "2026-05-29",
      from: "매입입고",
      to: "동명크릴 메인창고",
      item: item.name,
      spec: item.spec,
      qty: item.qty,
      processedAt: "11:15:30",
      operator: "이순신",
      memo: "[매입] 한려수산",
      purchaseInvoiceId: String(piId1),
      companyId
    });
  });

  // --- [Step 3] 수동 창고 이동 시나리오 ---
  console.log("🚚 Simulating manual warehouse transfers...");
  const moveId1 = Date.now() + Math.random();
  const moveEntry1 = {
    id: moveId1,
    date: "2026-05-30",
    from: "동명크릴 메인창고",
    to: "통영",
    item: "제주갈치",
    spec: "3지/마리",
    qty: 50,
    processedAt: "14:30:20",
    operator: "시스템",
    memo: "수동이동",
    companyId
  };
  transferHistory.push(moveEntry1);
  simulatedInventory["동명크릴 메인창고"]["제주갈치"] -= 50;
  simulatedInventory["통영"]["제주갈치"] += 50;

  // --- [Step 4] 주문서 상차 완료 시뮬레이션 ---
  console.log("🛒 Simulating sales order and load transfer...");
  const soId1 = 4001;
  const soItems1 = [
    { productId: 1001, name: "싱싱오징어", spec: "1kg/팩", qty: 40, price: 13000, taxType: "과세", supplyValue: 472727, tax: 47273, total: 520000, loaded: true },
    { productId: 1003, name: "남해전복", spec: "10미/팩", qty: 20, price: 45000, taxType: "면세", supplyValue: 900000, tax: 0, total: 900000, loaded: true }
  ];
  
  const salesOrder1 = {
    id: soId1,
    date: "2026-05-31",
    partner: "다모아마트",
    outWarehouse: "동명크릴 메인창고",
    inWarehouse: "통영",
    manager: "홍길동",
    itemsText: "싱싱오징어40 남해전복20",
    items: soItems1,
    memo: "상차 및 이동 테스트 주문건",
    companyId,
    creator: "홍길동",
    createdAt: new Date().toISOString()
  };
  salesOrders.push(salesOrder1);

  // 상차 완료로 인한 창고이동 처리
  soItems1.forEach(item => {
    simulatedInventory["동명크릴 메인창고"][item.name] -= item.qty;
    simulatedInventory["통영"][item.name] += item.qty;
    
    const entryId = Date.now() + Math.random();
    transferHistory.push({
      id: entryId,
      date: "2026-05-31",
      from: "동명크릴 메인창고",
      to: "통영",
      item: item.name,
      spec: item.spec,
      qty: item.qty,
      processedAt: "09:30:00",
      operator: "홍길동",
      memo: "상차(자동이동)",
      salesOrderId: String(soId1),
      companyId
    });
  });

  // --- [Step 5] 매출 시나리오 적재 (창고 재고 차감) ---
  console.log("📤 Simulating sales...");
  const siId1 = 5001;
  const siItems1 = [
    { productId: 1001, name: "싱싱오징어", spec: "1kg/팩", qty: 30, price: 13000, taxType: "과세", supplyValue: 354545, tax: 35455, total: 390000 },
    { productId: 1003, name: "남해전복", spec: "10미/팩", qty: 15, price: 45000, taxType: "면세", supplyValue: 675000, tax: 0, total: 675000 }
  ];
  const salesInvoice1 = {
    id: siId1,
    date: "2026-05-31",
    partner: "다모아마트",
    warehouse: "통영",
    manager: "홍길동",
    items: siItems1,
    receivedAmount: 1065000,
    payments: { cash: 1065000, account: 0, card: 0, bill: 0 },
    discount: 0,
    memo: "현금 결제 완료",
    companyId,
    creator: "홍길동",
    createdAt: new Date().toISOString()
  };
  salesInvoices.push(salesInvoice1);

  // 매출 출고 이력 및 재고 차감
  siItems1.forEach(item => {
    simulatedInventory["통영"][item.name] -= item.qty;
    
    const entryId = Date.now() + Math.random();
    transferHistory.push({
      id: entryId,
      date: "2026-05-31",
      from: "통영",
      to: "매출출고",
      item: item.name,
      spec: item.spec,
      qty: item.qty,
      processedAt: "15:20:40",
      operator: "홍길동",
      memo: "[매출] 다모아마트",
      salesInvoiceId: String(siId1),
      companyId
    });
  });

  // --- [Step 6] 방대한 200건 대량 매출 데이터 적재 시뮬레이션 ---
  console.log("⚡ Generating massive sales simulation data (200 records)...");
  
  const targetPartners = ["다모아마트", "동네슈퍼", "삼익백화점", "태평양식자재"];
  
  for (let i = 1; i <= 200; i++) {
    const invId = 10000 + i;
    
    // 최근 60일 내 날짜 분산 생성
    const dateOffset = Math.floor(Math.random() * 60);
    const d = new Date();
    d.setDate(d.getDate() - dateOffset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    
    const partner = targetPartners[Math.floor(Math.random() * targetPartners.length)];
    const product = testProducts[Math.floor(Math.random() * testProducts.length)];
    const qty = Math.floor(Math.random() * 15) + 1; // 1~15개
    const price = product.salesPrice;
    const total = qty * price;
    const supplyValue = product.taxType === "면세" ? total : Math.floor(total / 1.1);
    const tax = product.taxType === "면세" ? 0 : total - supplyValue;
    
    const items = [{
      productId: product.id,
      name: product.name,
      spec: product.spec,
      qty,
      price,
      taxType: product.taxType,
      supplyValue,
      tax,
      total
    }];
    
    const invoice = {
      id: invId,
      date: dateStr,
      partner,
      warehouse: "동명크릴 메인창고",
      manager: "시스템",
      items,
      receivedAmount: total,
      payments: { cash: total, account: 0, card: 0, bill: 0 },
      discount: 0,
      memo: `대량 시뮬레이션 매출 #${i}`,
      companyId,
      creator: "시스템",
      createdAt: d.toISOString()
    };
    
    salesInvoices.push(invoice);
    
    // 재고 차감 및 출고 이력 추가
    simulatedInventory["동명크릴 메인창고"][product.name] -= qty;
    
    const entryId = Date.now() + Math.random() + i;
    transferHistory.push({
      id: entryId,
      date: dateStr,
      from: "동명크릴 메인창고",
      to: "매출출고",
      item: product.name,
      spec: product.spec,
      qty,
      processedAt: "18:00:00",
      operator: "시스템",
      memo: `[매출] ${partner}`,
      salesInvoiceId: String(invId),
      companyId
    });
  }

  // --- [Step 7] Firestore Batch & Concurrent Upload ---
  console.log("💾 Uploading data to Firestore...");
  
  // 7-1. 매입 전표 일괄 적재
  console.log(`- Uploading ${purchaseInvoices.length} purchase invoices...`);
  for (const pi of purchaseInvoices) {
    await setDoc(doc(db, "companies", companyId, "purchaseInvoices", String(pi.id)), pi);
  }

  // 7-2. 주문서 일괄 적재
  console.log(`- Uploading ${salesOrders.length} sales orders...`);
  for (const so of salesOrders) {
    await setDoc(doc(db, "companies", companyId, "salesOrders", String(so.id)), so);
  }

  // 7-3. 매출 전표 분할 적재 (200개이므로 50개씩 나눠 처리)
  console.log(`- Uploading ${salesInvoices.length} sales invoices (in chunks)...`);
  const invoiceChunks = chunkArray(salesInvoices, 50);
  for (let i = 0; i < invoiceChunks.length; i++) {
    const chunk = invoiceChunks[i];
    console.log(`  * Chunk ${i + 1}/${invoiceChunks.length}...`);
    await Promise.all(chunk.map(inv => 
      setDoc(doc(db, "companies", companyId, "salesInvoices", String(inv.id)), inv)
    ));
  }

  // 7-4. 재고 이동 이력 분할 적재 (약 400개이므로 50개씩 청크 분할)
  console.log(`- Uploading ${transferHistory.length} inventory transfer history records (in chunks)...`);
  const transferChunks = chunkArray(transferHistory, 50);
  for (let i = 0; i < transferChunks.length; i++) {
    const chunk = transferChunks[i];
    console.log(`  * Chunk ${i + 1}/${transferChunks.length}...`);
    await Promise.all(chunk.map(entry => 
      setDoc(doc(db, "companies", companyId, "inventoryTransferHistory", String(entry.id)), entry)
    ));
  }

  // 7-5. 최종 시뮬레이션된 완벽 정합성 재고 데이터(settings/inventory) 등록
  console.log("- Syncing final simulated inventory settings...");
  await setDoc(doc(db, "companies", companyId, "settings", "inventory"), { value: simulatedInventory });

  console.log("✅ ERP Simulation & Massive Test Data Generation SUCCESSFUL!");
  console.log("\n📦 --- Simulated Final Inventory Summary ---");
  console.log(JSON.stringify(simulatedInventory, null, 2));
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

generate().catch(err => {
  console.error("❌ Data Generation Failed:", err);
});
