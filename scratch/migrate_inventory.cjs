const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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
  const invDocRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  
  const snap = await getDoc(invDocRef);
  if (!snap.exists()) {
    console.log('Inventory doc not found!');
    return;
  }
  
  const currentData = snap.data();
  console.log('=== Original Inventory Data ===');
  console.log(JSON.stringify(currentData, null, 2));

  const value = { ...currentData.value };
  
  const sourceWH = '동명크릴 메인창고';
  const targetWH = '메인창고';
  
  if (!value[targetWH]) {
    value[targetWH] = {};
  }
  
  // Merge '동명크릴 메인창고' into '메인창고'
  if (value[sourceWH]) {
    console.log(`Merging ${sourceWH} into ${targetWH}...`);
    const sourceStocks = value[sourceWH];
    const targetStocks = { ...value[targetWH] };
    
    Object.keys(sourceStocks).forEach(item => {
      const sourceQty = Number(sourceStocks[item]) || 0;
      const targetQty = Number(targetStocks[item]) || 0;
      targetStocks[item] = targetQty + sourceQty;
    });
    
    value[targetWH] = targetStocks;
    delete value[sourceWH];
    console.log(`Successfully merged and removed ${sourceWH}.`);
  } else {
    console.log(`Source warehouse ${sourceWH} not found in inventory.`);
  }
  
  // Fix 특A크릴7(동원) in 메인창고 to 0 (revert the deleted invoice mismatch)
  if (value[targetWH] && value[targetWH]['특A크릴7(동원)'] === -500) {
    console.log("Fixing '특A크릴7(동원)' in 메인창고 from -500 to 0.");
    value[targetWH]['특A크릴7(동원)'] = 0;
  }
  
  const updatedData = { value };
  console.log('=== Updated Inventory Data ===');
  console.log(JSON.stringify(updatedData, null, 2));
  
  await setDoc(invDocRef, updatedData);
  console.log('Successfully updated Firestore!');
}

run().catch(console.error);
