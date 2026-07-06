const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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
  const compCol = collection(db, 'companies');
  const compSnap = await getDocs(compCol);
  console.log('Available companies in Firestore:', compSnap.docs.map(doc => doc.id));
  
  for (const compDoc of compSnap.docs) {
    const companyId = compDoc.id;
    console.log(`\n=== Company: ${companyId} ===`);
    
    // Get inventory
    const invSnap = await getDoc(doc(db, 'companies', companyId, 'settings', 'inventory'));
    if (invSnap.exists()) {
      const invData = invSnap.data().value || invSnap.data();
      console.log('Inventory Preview:');
      console.log(JSON.stringify(invData, null, 2));
    }
    
    // Get transfer history count
    const histCol = collection(db, 'companies', companyId, 'inventoryTransferHistory');
    const histSnap = await getDocs(histCol);
    console.log(`Inventory transfer history record count: ${histSnap.size}`);
    if (histSnap.size > 0) {
      const list = [];
      histSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      console.log('First 5 records:', JSON.stringify(list.slice(0, 5), null, 2));
    }
  }
}

run().catch(console.error);
