import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export default app;
