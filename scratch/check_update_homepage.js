import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// 1. Load .env
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

// 2. Init Firebase
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

async function run() {
  const docRef = doc(db, 'settings', 'homepage_content');
  const snap = await getDoc(docRef);
  
  const defaultData = {
    hero: {
      badge: "비즈니스 패러다임 시프트 - AI ERP",
      title: "사장님의 사라지는 재고를 완벽히 해결하겠습니다.",
      subtitle: "전통적인 ERP의 낡고 둔한 방식을 버리십시오. 링커엑스는 누구나 즉시 시작할 수 있는 제로 러닝커브 화면과 지능형 AI가 실시간으로 재고와 자금을 알아서 조율하는 차세대 신경망 플랫폼입니다.",
      ctaText: "무료 도입 데모 즉시 체험",
      secondaryCtaText: "대리점 개방 신청"
    }
  };

  if (snap.exists()) {
    const data = snap.data();
    console.log("Current Firestore homepage_content:", JSON.stringify(data, null, 2));
    
    if (data.hero) {
      const oldTitle = data.hero.title;
      const newTitle = "사장님의 사라지는 재고를 완벽히 해결하겠습니다.";
      console.log(`Updating title from "${oldTitle}" to "${newTitle}"`);
      data.hero.title = newTitle;
      await setDoc(docRef, data);
      console.log("Successfully updated settings/homepage_content in Firestore!");
    } else {
      data.hero = defaultData.hero;
      await setDoc(docRef, data);
      console.log("Successfully initialized settings/homepage_content.hero in Firestore!");
    }
  } else {
    console.log("homepage_content document does not exist. Creating default document in Firestore...");
    await setDoc(docRef, defaultData);
    console.log("Successfully created settings/homepage_content with default values in Firestore!");
  }
}

run().catch(console.error);
