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
  const whCol = collection(db, 'companies', companyId, 'warehouses');
  const whSnap = await getDocs(whCol);
  console.log('=== windpino_ldmo Warehouses ===');
  whSnap.forEach(doc => {
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }));
  });
}

run().catch(console.error);
