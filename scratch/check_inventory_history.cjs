const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAqx7nPiQ0mJGqnAGv28dO07C3-GQuqkpk",
  authDomain: "link-x-6606e.firebaseapp.com",
  projectId: "link-x-6606e",
  storageBucket: "link-x-6606e.firebasestorage.app",
  messagingSenderId: "236294239528",
  appId: "1:236294239528:web:8f735c42d36d6d1c434c1d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const companyId = 'default';
  
  // 1. Get Inventory Settings (Current Real-time Stock)
  const inventoryDocRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  const inventorySnap = await getDoc(inventoryDocRef);
  if (inventorySnap.exists()) {
    console.log('--- Current Inventory in Firestore ---');
    console.log(JSON.stringify(inventorySnap.data().value || inventorySnap.data(), null, 2));
  } else {
    console.log('No inventory document found!');
  }

  // 2. Get Transfer History (History collection)
  const historyColRef = collection(db, 'companies', companyId, 'inventoryTransferHistory');
  const historySnap = await getDocs(historyColRef);
  console.log('\n--- Inventory Transfer History in Firestore ---');
  console.log(`Total history records: ${historySnap.size}`);
  
  const records = [];
  historySnap.forEach(doc => {
    records.push({ id: doc.id, ...doc.data() });
  });
  
  // Print records
  console.log(JSON.stringify(records.slice(0, 20), null, 2));
}

run().catch(console.error);
