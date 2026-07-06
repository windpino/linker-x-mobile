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

const companyId = 'windpino_ldmo';

async function run() {
  const collections = ['purchaseInvoices', 'salesInvoices', 'salesOrders', 'inventoryTransferHistory'];
  for (const colName of collections) {
    const colRef = collection(db, 'companies', companyId, colName);
    const snap = await getDocs(colRef);
    console.log(`=== ${colName} (${snap.size}) ===`);
    snap.docs.forEach(doc => {
      const data = doc.data();
      const str = JSON.stringify(data);
      if (str.includes('동명크릴 메인창고')) {
        console.log(`  Found in Doc [${doc.id}]:`, JSON.stringify({
          id: data.id,
          date: data.date,
          partner: data.partner,
          warehouse: data.warehouse,
          outWarehouse: data.outWarehouse,
          inWarehouse: data.inWarehouse,
          items: data.items?.map(i => ({ name: i.name, qty: i.qty, loaded: i.loaded }))
        }));
      }
    });
  }
}

run().catch(console.error);
