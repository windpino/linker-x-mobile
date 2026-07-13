import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load .env
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

console.log("🔊 Antigravity real-time Firestore chat listener started...");

const colRef = collection(db, "companies", "DMK", "agentChats");
const q = query(colRef, where("status", "==", "pending"));

const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const docId = change.doc.id;
      const data = change.doc.data();
      
      // Only notify if it's from the user
      if (data.sender !== "IBG-Dev") {
        console.log(`\n🚨 [NEW_USER_CHAT_RECEIVED]`);
        console.log(`- ID: ${docId}`);
        console.log(`- User: ${data.senderName || data.sender}`);
        console.log(`- Text: "${data.text}"`);
        console.log(`----------------------------------------\n`);
        
        // Unsubscribe and exit to complete the task and wake up the AI agent instantly
        unsubscribe();
        process.exit(0);
      }
    }
  });
});
