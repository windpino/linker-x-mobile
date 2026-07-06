import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
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
const companyId = "windpino_ldmo"; // 실제 라이브 회사 ID ('windpino_ldmo')

async function reset() {
  console.log("🧹 Initializing Inventory and Transfer History Clean-up...");

  // 1. inventoryTransferHistory 컬렉션의 모든 문서를 읽어서 일괄 삭제
  console.log("- Fetching all inventory transfer history records...");
  const transferCol = collection(db, "companies", companyId, "inventoryTransferHistory");
  const transferSnap = await getDocs(transferCol);
  
  if (transferSnap.size > 0) {
    console.log(`- Deleting ${transferSnap.size} history records...`);
    await Promise.all(transferSnap.docs.map(doc => deleteDoc(doc.ref)));
    console.log("  * All inventory transfer history deleted.");
  } else {
    console.log("  * No transfer history records found.");
  }

  // 2. 모든 품목(products) 목록을 가져옴
  console.log("- Fetching all product definitions...");
  const productsCol = collection(db, "companies", companyId, "products");
  const productsSnap = await getDocs(productsCol);
  const products = productsSnap.docs.map(doc => doc.data());
  console.log(`  * Found ${products.length} products in database.`);

  // 3. 모든 창고(warehouses) 목록을 가져옴
  console.log("- Fetching all warehouse definitions...");
  const warehousesCol = collection(db, "companies", companyId, "warehouses");
  const warehousesSnap = await getDocs(warehousesCol);
  const warehouses = warehousesSnap.docs.map(doc => doc.data());
  console.log(`  * Found ${warehouses.length} warehouses in database.`);

  // 4. 모든 창고의 모든 품목 재고 수량을 0으로 초기화하는 객체 빌드
  const cleanInventory = {};
  
  // 창고 목록이 비어있을 경우를 대비한 하드코딩 백업
  const warehouseNames = warehouses.length > 0 
    ? warehouses.map(w => w.name) 
    : ["동명크릴 메인창고", "통영"];

  warehouseNames.forEach(whName => {
    cleanInventory[whName] = {};
    products.forEach(p => {
      cleanInventory[whName][p.name] = 0; // 모두 0개로 설정
    });
  });

  // 5. settings/inventory 문서를 비워진 재고 모델로 덮어쓰기
  console.log("- Overwriting settings/inventory with 0-initialized values...");
  await setDoc(doc(db, "companies", companyId, "settings", "inventory"), { value: cleanInventory });
  console.log("  * settings/inventory successfully reset.");

  console.log("🏆 Inventory Reset SUCCESSFUL! All warehouses set to 0 and history cleared.");
  console.log("Cleaned Inventory State Preview:");
  console.log(JSON.stringify(cleanInventory, null, 2));
}

reset().catch(err => {
  console.error("❌ Reset Failed:", err);
});
