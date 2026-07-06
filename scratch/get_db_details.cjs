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
  const companyId = 'DMK';

  // 1. Warehouses
  const whCol = collection(db, 'companies', companyId, 'warehouses');
  const whSnap = await getDocs(whCol);
  console.log('=== Warehouses ===');
  whSnap.forEach(doc => {
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
  });

  // 2. Purchase Invoices
  const piCol = collection(db, 'companies', companyId, 'purchaseInvoices');
  const piSnap = await getDocs(piCol);
  console.log('\n=== Purchase Invoices ===');
  piSnap.forEach(doc => {
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
  });

  // 3. Products
  const prodCol = collection(db, 'companies', companyId, 'products');
  const prodSnap = await getDocs(prodCol);
  console.log('\n=== Products ===');
  prodSnap.forEach(doc => {
    const data = doc.data();
    if (data.name.includes('크릴') || data.name.includes('얼음')) {
      console.log(JSON.stringify({ id: doc.id, name: data.name, spec: data.spec, initialStock: data.initialStock }, null, 2));
    }
  });

  // 4. Inventory Settings
  const invDoc = doc(db, 'companies', companyId, 'settings', 'inventory');
  const invSnap = await getDoc(invDoc);
  console.log('\n=== Inventory Settings ===');
  if (invSnap.exists()) {
    console.log(JSON.stringify(invSnap.data(), null, 2));
  } else {
    console.log('No inventory document');
  }
}

run().catch(console.error);
