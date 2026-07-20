import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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

async function run() {
  const companyId = "windpino_ldmo";
  console.log(`Fetching recent commands for company: ${companyId}`);
  const q = query(
    collection(db, 'companies', companyId, 'devCommands'),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  snap.forEach(d => {
    console.log(`Document: ${d.id} | Status: ${d.data().status} | Command: ${d.data().command} | CreatedAt: ${d.data().createdAt}`);
  });
  process.exit(0);
}

run().catch(console.error);
