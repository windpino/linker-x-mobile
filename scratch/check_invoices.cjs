const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
  const companyId = 'windpino_ldmo';
  
  // 1. Purchase Invoices
  const piCol = collection(db, 'companies', companyId, 'purchaseInvoices');
  const piSnap = await getDocs(piCol);
  console.log(`Purchase Invoices count: ${piSnap.size}`);
  piSnap.forEach(d => {
    console.log('Purchase Invoice:', JSON.stringify(d.data(), null, 2));
  });

  // 2. Sales Invoices
  const siCol = collection(db, 'companies', companyId, 'salesInvoices');
  const siSnap = await getDocs(siCol);
  console.log(`Sales Invoices count: ${siSnap.size}`);
  siSnap.forEach(d => {
    console.log('Sales Invoice:', JSON.stringify(d.data(), null, 2));
  });

  // 3. Sales Orders
  const soCol = collection(db, 'companies', companyId, 'salesOrders');
  const soSnap = await getDocs(soCol);
  console.log(`Sales Orders count: ${soSnap.size}`);
  soSnap.forEach(d => {
    console.log('Sales Order:', JSON.stringify(d.data(), null, 2));
  });
}

run().catch(console.error);
