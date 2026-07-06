import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load .env
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const config = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join("=").trim();
    if (key.startsWith("VITE_FIREBASE_")) {
      const configKey = key.replace("VITE_FIREBASE_", "")
        .toLowerCase()
        .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      config[configKey] = value;
    }
  }
});

console.log("Firebase config loaded:", config);

const app = initializeApp(config);
const db = getFirestore(app);

try {
  console.log("Fetching 'companies' collection...");
  const querySnapshot = await getDocs(collection(db, "companies"));
  console.log(`Total companies found: ${querySnapshot.size}`);
  querySnapshot.forEach((doc) => {
    console.log(`Company ID: ${doc.id}, Name: ${doc.data().name}, Email: ${doc.data().email}`);
  });
} catch (error) {
  console.error("Error fetching companies:", error);
}

process.exit(0);
