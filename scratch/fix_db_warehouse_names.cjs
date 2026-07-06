const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

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
  const oldWH = '동명크릴 메인창고';
  const newWH = '메인창고';
  
  const collections = ['salesOrders', 'salesInvoices', 'purchaseInvoices', 'inventoryTransferHistory'];
  
  for (const colName of collections) {
    console.log(`Checking collection: ${colName}...`);
    const colRef = collection(db, 'companies', companyId, colName);
    const snap = await getDocs(colRef);
    
    let updatedCount = 0;
    
    for (const document of snap.docs) {
      const data = document.data();
      const docRef = doc(db, 'companies', companyId, colName, document.id);
      
      let needsUpdate = false;
      const updateData = {};
      
      // Check top-level warehouse fields
      if (data.warehouse === oldWH) {
        updateData.warehouse = newWH;
        needsUpdate = true;
      }
      if (data.inWarehouse === oldWH) {
        updateData.inWarehouse = newWH;
        needsUpdate = true;
      }
      if (data.outWarehouse === oldWH) {
        updateData.outWarehouse = newWH;
        needsUpdate = true;
      }
      if (data.from === oldWH) {
        updateData.from = newWH;
        needsUpdate = true;
      }
      if (data.to === oldWH) {
        updateData.to = newWH;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await updateDoc(docRef, updateData);
        updatedCount++;
        console.log(`  Updated document ${document.id}:`, updateData);
      }
    }
    
    console.log(`Finished ${colName}. Updated ${updatedCount} documents.`);
  }
  
  console.log('Database warehouse name cleanup completed!');
}

run().catch(console.error);
