const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');

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
  // 1. Fetch current inventory
  const inventoryDocRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  const inventorySnap = await getDoc(inventoryDocRef);
  if (!inventorySnap.exists()) {
    console.log('No inventory document found!');
    return;
  }
  
  const currentData = inventorySnap.data();
  const value = { ...currentData.value };
  
  // 2. Fetch all products to ensure all products are mapped
  const productsCol = collection(db, 'companies', companyId, 'products');
  const productsSnap = await getDocs(productsCol);
  const productNames = productsSnap.docs.map(doc => doc.data().name);
  
  console.log(`Found ${productNames.length} products in database.`);
  
  const targets = ['통영창고', '메인창고'];
  
  targets.forEach(wh => {
    if (!value[wh]) {
      value[wh] = {};
    }
    
    // Set all existing keys in this warehouse to 0
    Object.keys(value[wh]).forEach(prodName => {
      value[wh][prodName] = 0;
    });
    
    // Also ensure all product definitions have 0 in this warehouse
    productNames.forEach(prodName => {
      value[wh][prodName] = 0;
    });
  });
  
  const updatedData = { value };
  console.log('=== Updated Inventory Preview ===');
  console.log(JSON.stringify(updatedData, null, 2));
  
  await setDoc(inventoryDocRef, updatedData);
  console.log('Successfully zeroed out stock for 통영창고 and 메인창고 in Firestore!');
}

run().catch(console.error);
