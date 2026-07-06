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
  const prodCol = collection(db, 'companies', companyId, 'products');
  const prodSnap = await getDocs(prodCol);
  console.log(`Products count: ${prodSnap.size}`);
  prodSnap.forEach(d => {
    const data = d.data();
    if (data.name.includes('벽돌') || data.name.includes('크릴') || data.name.includes('빙')) {
      console.log('Product Matching Name:', JSON.stringify(data, null, 2));
    }
  });
}

run().catch(console.error);
