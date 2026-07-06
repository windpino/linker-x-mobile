import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

const targetCompanies = ["DMK", "jinmi", "windpino_ldmo", "default"];

async function scan() {
  console.log("🔍 Scanning data counts for each company...");
  
  for (const cid of targetCompanies) {
    console.log(`\n------------------------------`);
    console.log(`🏢 Company ID: [${cid}]`);
    try {
      const prodCol = collection(db, "companies", cid, "products");
      const prodSnap = await getDocs(prodCol);
      console.log(`- Products count: ${prodSnap.size}`);

      const partnerCol = collection(db, "companies", cid, "partners");
      const partnerSnap = await getDocs(partnerCol);
      console.log(`- Partners count: ${partnerSnap.size}`);

      const whCol = collection(db, "companies", cid, "warehouses");
      const whSnap = await getDocs(whCol);
      console.log(`- Warehouses count: ${whSnap.size}`);

      const transferCol = collection(db, "companies", cid, "inventoryTransferHistory");
      const transferSnap = await getDocs(transferCol);
      console.log(`- Transfer history count: ${transferSnap.size}`);

      const settingsCol = collection(db, "companies", cid, "settings");
      const settingsSnap = await getDocs(settingsCol);
      console.log(`- Settings docs count: ${settingsSnap.size}`);
      settingsSnap.forEach(doc => {
        if (doc.id === "inventory") {
          console.log(`  * Found 'inventory' settings doc!`);
        }
      });
    } catch (err) {
      console.error(`- Failed to scan ${cid}:`, err.message);
    }
  }
}

scan().catch(err => {
  console.error("❌ Scan Failed:", err);
});
