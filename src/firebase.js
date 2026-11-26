import { initializeApp } from "firebase/app";
import { 
  connectFirestoreEmulator,
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const getCleanEnv = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/['"\s\r\n]/g, '').trim();
};

const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && getCleanEnv(import.meta.env?.VITE_FIREBASE_API_KEY)) || "AIzaSyAqx7nPiQ0mJGqnAGv28dO07C3-GQuqkpk",
  authDomain: (typeof import.meta !== 'undefined' && getCleanEnv(import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN)) || "link-x-6606e.firebaseapp.com",
  projectId: "link-x-6606e",
  storageBucket: (typeof import.meta !== 'undefined' && getCleanEnv(import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET)) || "link-x-6606e.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && getCleanEnv(import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID)) || "236294239528",
  appId: (typeof import.meta !== 'undefined' && getCleanEnv(import.meta.env?.VITE_FIREBASE_APP_ID)) || "1:236294239528:web:8f735c42d36d6d1c434c1d",
  measurementId: (typeof import.meta !== 'undefined' && getCleanEnv(import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID)) || "G-G8626RZH6X"
};

const isExplicitProd = typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_PRODUCTION_APPROVED === 'true';
const isProdAuthVerification = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PROD_AUTH_VERIFICATION === 'true';
const isVercelOrRemote = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';
const isViteProdBuild = typeof import.meta !== 'undefined' && import.meta.env?.PROD === true;

// Remote / Vercel 배포 환경 또는 VITE_AUTH_PRODUCTION_APPROVED=true 이거나 프로덕션 빌드일 때는 무조건 파이어베이스 운영 메인(link-x-6606e)에 직접 연결
const isProdApproved = isExplicitProd || isVercelOrRemote || (isViteProdBuild && !isProdAuthVerification);

const useAuthEmulator = !isProdApproved && !isProdAuthVerification;
const useFirestoreEmulator = !isProdApproved;

if (useAuthEmulator && useFirestoreEmulator) {
  Object.assign(firebaseConfig, { 
    projectId: 'demo-linker-auth', 
    apiKey: 'demo-key', 
    authDomain: 'demo-linker-auth.firebaseapp.com', 
    appId: 'demo-app', 
    measurementId: undefined 
  });
}

const app = initializeApp(firebaseConfig);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.warn("Firestore persistentLocalCache initialization fallback:", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);

if (useAuthEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
} else if (isProdAuthVerification) {
  if (auth.emulatorConfig) {
    throw new Error("안전 위반: 운영 인증 검증 모드에서 127.0.0.1:9099 에뮬레이터가 감지되었습니다.");
  }
}

if (useFirestoreEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const authTargetMode = isProdApproved
  ? 'production'
  : isProdAuthVerification
    ? 'production-auth-only'
    : 'emulator';

export default app;
