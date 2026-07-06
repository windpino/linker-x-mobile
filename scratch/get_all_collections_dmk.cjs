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

const collections = [
  'staffList', 'schedules', 'products', 'categories', 'partners',
  'accounts', 'purchaseInvoices', 'purchaseOrders', 'salesInvoices',
  'salesOrders', 'warehouses', 'expenses', 'inventoryAdjustments',
  'inventoryTransferHistory', 'specialPrices'
];

async function run() {
  const companyId = 'DMK';
  for (const colName of collections) {
    const colRef = collection(db, 'companies', companyId, colName);
    const snap = await getDocs(colRef);
    console.log(`Collection: ${colName} -> ${snap.size} documents`);
    if (snap.size > 0 && (colName === 'warehouses' || colName === 'products')) {
      console.log(`  First 3 docs of ${colName}:`);
      snap.docs.slice(0, 3).forEach(doc => {
        console.log(`    - [${doc.id}]:`, JSON.stringify(doc.data()));
      });
    }
  }
}

run().catch(console.error);
