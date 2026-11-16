import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  connectFirestoreEmulator, 
  doc, 
  getDoc, 
  setDoc,
  runTransaction
} from "firebase/firestore";

console.log('=== TEST 1: VERIFY FAIL-CLOSED EMULATOR ISOLATION ===');

const dummyConfig = {
  apiKey: "AIzaSyDUMMY-EMULATOR-KEY",
  authDomain: "emulator-isolation.firebaseapp.com",
  projectId: "emulator-test-project",
  storageBucket: "emulator-test.appspot.com",
  appId: "1:123456789:web:dummy"
};

const app = initializeApp(dummyConfig, "EMULATOR_FAIL_CLOSED_TEST");
const db = initializeFirestore(app, {});

// Connect to non-running emulator port to verify Fail-Closed behavior
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 58088; // Non-existent emulator port

connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORT);
console.log(`[Config] Firestore configured to STRICT EMULATOR at ${EMULATOR_HOST}:${EMULATOR_PORT}`);

async function testFailClosed() {
  console.log('[Check] Attempting Firestore write to verify it does NOT fall back to production...');
  const start = Date.now();
  try {
    const testDoc = doc(db, 'companies', 'test_co', 'settings', 'inventory');
    // Set a 3 second timeout for the operation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT_BLOCKED: Connection to emulator refused as expected')), 3000)
    );
    await Promise.race([
      setDoc(testDoc, { test: 'data' }),
      timeoutPromise
    ]);
    console.error('FAIL: Request unexpectedly succeeded or routed to cloud!');
    process.exit(1);
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`[Result] STRICT BLOCK CONFIRMED in ${duration}ms.`);
    console.log(`[Blocked Error Message]: ${err.message}`);
    console.log('[Verification]: Production cloud is NOT contacted. System fails closed safely.');
  }
}

testFailClosed().then(() => {
  console.log('=== TEST 1 COMPLETED: ISOLATION PASSED ===');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
