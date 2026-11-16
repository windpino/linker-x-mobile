// Official Google Cloud Firestore Emulator Concurrency Test Suite
// Executes against real Firestore Emulator (127.0.0.1:8080)
// Uses exact logic from Linker-X App.jsx & OrderList.jsx

import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  connectFirestoreEmulator, 
  doc, 
  getDoc, 
  setDoc,
  runTransaction
} from "firebase/firestore";
import fs from 'fs';

console.log('================================================================');
console.log('LINKER-X REAL FIRESTORE EMULATOR TEST SUITE');
console.log('Target: Google Cloud Firestore Emulator (127.0.0.1:8080)');
console.log('Project: emulator-test-isolated (Completely isolated from prod)');
console.log('================================================================\n');

const dummyConfig = {
  apiKey: "AIzaSyDUMMY-EMULATOR-KEY",
  authDomain: "emulator-test-isolated.firebaseapp.com",
  projectId: "emulator-test-isolated",
  storageBucket: "emulator-test-isolated.appspot.com",
  appId: "1:999999999:web:dummy"
};

const app = initializeApp(dummyConfig, "REAL_EMULATOR_SUITE");
const db = initializeFirestore(app, {});

// Connect to local official Firestore emulator
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const companyId = 'test_emulator_company';
const invDocRef = doc(db, 'companies', companyId, 'settings', 'inventory');
const opColPath = (opId) => doc(db, 'companies', companyId, 'operations', opId);

// Helper to reset inventory in emulator
async function resetInventory(initialStock = 100) {
  await setDoc(invDocRef, {
    value: {
      '본사창고': { 'ProductA': initialStock },
      '차량1': { 'ProductA': 0 },
      '차량2': { 'ProductA': 0 }
    }
  });
}

// ----------------------------------------------------------------------
// 1. CURRENT UNPATCHED CODE LOGIC (From App.jsx onMoveStock)
// ----------------------------------------------------------------------
async function currentOnMoveStock(from, to, productName, qty, delayMs = 15) {
  // Exact logic of App.jsx lines 1641-1650:
  // Reads document snapshot into memory
  const snap = await getDoc(invDocRef);
  const currentInv = snap.exists() ? snap.data().value : {};
  const nextInv = JSON.parse(JSON.stringify(currentInv));

  if (!nextInv[from]) nextInv[from] = {};
  if (!nextInv[to]) nextInv[to] = {};

  nextInv[from][productName] = (nextInv[from][productName] || 0) - Number(qty);
  nextInv[to][productName] = (nextInv[to][productName] || 0) + Number(qty);

  // Artificial network/processing latency
  if (delayMs > 0) {
    await new Promise(r => setTimeout(r, delayMs));
  }

  // Monolithic overwrite with setDoc
  await setDoc(invDocRef, { value: nextInv });
}

// ----------------------------------------------------------------------
// 2. CURRENT UNPATCHED CODE LOGIC (From App.jsx onRevertAutoMoveStock)
// ----------------------------------------------------------------------
async function currentOnRevertAutoMoveStock(from, to, productName, qty, hasMatch = true) {
  // Exact logic of App.jsx lines 1856-1864:
  // First alters inventory regardless of history match
  const snap = await getDoc(invDocRef);
  const currentInv = snap.exists() ? snap.data().value : {};
  const nextInv = JSON.parse(JSON.stringify(currentInv));

  if (!nextInv[from]) nextInv[from] = {};
  if (!nextInv[to]) nextInv[to] = {};

  nextInv[from][productName] = (nextInv[from][productName] || 0) + Number(qty);
  nextInv[to][productName] = (nextInv[to][productName] || 0) - Number(qty);

  await setDoc(invDocRef, { value: nextInv });

  // History search happens AFTER setDoc (unprotected)
  return hasMatch;
}

// ----------------------------------------------------------------------
// 3. PROPOSED FIX CODE (runTransaction + Operation ID)
// ----------------------------------------------------------------------
async function proposedAtomicMoveStock(opId, from, to, productName, qty) {
  return await runTransaction(db, async (tx) => {
    const opRef = opColPath(opId);
    const opSnap = await tx.get(opRef);
    if (opSnap.exists() && opSnap.data().status === 'CONFIRMED') {
      return { duplicate: true };
    }

    const invSnap = await tx.get(invDocRef);
    const invData = invSnap.exists() ? invSnap.data().value : {};
    const inv = JSON.parse(JSON.stringify(invData));

    if (!inv[from]) inv[from] = {};
    if (!inv[to]) inv[to] = {};

    const avail = inv[from][productName] || 0;
    if (avail < qty) {
      throw new Error(`INSUFFICIENT_STOCK: ${productName} (Avail: ${avail}, Req: ${qty})`);
    }

    inv[from][productName] = avail - Number(qty);
    inv[to][productName] = (inv[to][productName] || 0) + Number(qty);

    tx.set(invDocRef, { value: inv });
    tx.set(opRef, {
      opId,
      from,
      to,
      productName,
      qty: Number(qty),
      status: 'CONFIRMED',
      timestamp: Date.now()
    });

    return { duplicate: false };
  });
}

// ----------------------------------------------------------------------
// 4. PROPOSED FIX CODE (runTransaction + Operation ID Revert)
// ----------------------------------------------------------------------
async function proposedAtomicRevertStock(revertOpId, targetOpId) {
  return await runTransaction(db, async (tx) => {
    const revRef = opColPath(revertOpId);
    const revSnap = await tx.get(revRef);
    if (revSnap.exists() && revSnap.data().status === 'CONFIRMED') {
      return { alreadyReverted: true };
    }

    const targetRef = opColPath(targetOpId);
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists() || targetSnap.data().status !== 'CONFIRMED' || targetSnap.data().isCancelled) {
      throw new Error('INVALID_OR_ALREADY_CANCELLED');
    }

    const targetData = targetSnap.data();
    const invSnap = await tx.get(invDocRef);
    const inv = JSON.parse(JSON.stringify(invSnap.exists() ? invSnap.data().value : {}));

    inv[targetData.from][targetData.productName] += targetData.qty;
    inv[targetData.to][targetData.productName] -= targetData.qty;

    tx.update(targetRef, { isCancelled: true });
    tx.set(invDocRef, { value: inv });
    tx.set(revRef, {
      revertOpId,
      targetOpId,
      status: 'CONFIRMED',
      timestamp: Date.now()
    });

    return { success: true };
  });
}

// ----------------------------------------------------------------------
// EXECUTION MATRIX (20 runs each)
// ----------------------------------------------------------------------
async function runAllTests() {
  const RUNS = 20;
  const metrics = {
    test1_current_concurrent_load: { runs: RUNS, reproduced_lost_update: 0, passed: 0 },
    test2_current_batch_toggle: { runs: RUNS, reproduced_batch_loss: 0, passed: 0 },
    test3_current_revert_ghost_stock: { runs: RUNS, ghost_stock_created: 0, safe: 0 },
    test4_proposed_concurrent_load: { runs: RUNS, passed: 0, failed: 0 },
    test5_proposed_duplicate_opid: { runs: RUNS, blocked: 0, double_deducted: 0 },
    test6_proposed_revert_safety: { runs: RUNS, safe: 0, ghost_stock_created: 0 }
  };

  console.log(`Starting real Firestore Emulator tests (${RUNS} runs per scenario)...\n`);

  // --- SCENARIO 1: Current Concurrent Load (2 workers, 10 units each) ---
  console.log('>>> [SCENARIO 1] Current unpatched onMoveStock: Concurrent Loading');
  for (let i = 0; i < RUNS; i++) {
    await resetInventory(100);
    // Two simultaneous calls with delay
    await Promise.all([
      currentOnMoveStock('본사창고', '차량1', 'ProductA', 10, 20),
      currentOnMoveStock('본사창고', '차량2', 'ProductA', 10, 20)
    ]);
    const snap = await getDoc(invDocRef);
    const inv = snap.data().value;
    const finalStock = inv['본사창고']['ProductA'];
    if (finalStock === 90) {
      metrics.test1_current_concurrent_load.reproduced_lost_update++;
    } else if (finalStock === 80) {
      metrics.test1_current_concurrent_load.passed++;
    }
  }
  console.log(`Scenario 1 Result: ${metrics.test1_current_concurrent_load.reproduced_lost_update}/${RUNS} Lost Update Bugs Reproduced.`);

  // --- SCENARIO 2: Current Batch Toggle Overwrite ---
  console.log('>>> [SCENARIO 2] Current unpatched handleBatchToggleProduct: Overlapping Load');
  for (let i = 0; i < RUNS; i++) {
    await resetInventory(100);
    // OrderList.jsx handleBatchToggleProduct reads closed snapshot once and calls onMoveStock in loop
    const snap = await getDoc(invDocRef);
    const staleSnapshot = snap.data().value;

    await Promise.all([1, 2, 3, 4, 5].map(async () => {
      const nextInv = JSON.parse(JSON.stringify(staleSnapshot));
      nextInv['본사창고']['ProductA'] -= 10;
      nextInv['차량1']['ProductA'] = (nextInv['차량1']['ProductA'] || 0) + 10;
      await new Promise(r => setTimeout(r, 10 + Math.random() * 10));
      await setDoc(invDocRef, { value: nextInv });
    }));

    const afterSnap = await getDoc(invDocRef);
    const finalStock = afterSnap.data().value['본사창고']['ProductA'];
    if (finalStock === 90) {
      metrics.test2_current_batch_toggle.reproduced_batch_loss++;
    } else if (finalStock === 50) {
      metrics.test2_current_batch_toggle.passed++;
    }
  }
  console.log(`Scenario 2 Result: ${metrics.test2_current_batch_toggle.reproduced_batch_loss}/${RUNS} Batch Overwrite Bugs Reproduced.`);

  // --- SCENARIO 3: Current Revert Without Match (Ghost stock) ---
  console.log('>>> [SCENARIO 3] Current unpatched onRevertAutoMoveStock: Revert without History Match');
  for (let i = 0; i < RUNS; i++) {
    await resetInventory(100);
    // 1st revert without match
    await currentOnRevertAutoMoveStock('본사창고', '차량1', 'ProductA', 10, false);
    // 2nd duplicate revert
    await currentOnRevertAutoMoveStock('본사창고', '차량1', 'ProductA', 10, false);
    const snap = await getDoc(invDocRef);
    const finalStock = snap.data().value['본사창고']['ProductA'];
    if (finalStock === 120) {
      // Stock inflated from 100 to 120 because setDoc ran before checking match!
      metrics.test3_current_revert_ghost_stock.ghost_stock_created++;
    } else {
      metrics.test3_current_revert_ghost_stock.safe++;
    }
  }
  console.log(`Scenario 3 Result: ${metrics.test3_current_revert_ghost_stock.ghost_stock_created}/${RUNS} Ghost Stock Inflatation Bugs Reproduced.`);

  // --- SCENARIO 4: Proposed Atomic MoveStock with Concurrency ---
  console.log('>>> [SCENARIO 4] Proposed runTransaction + OpID: Concurrent Loading');
  for (let i = 0; i < RUNS; i++) {
    await resetInventory(100);
    const p1 = proposedAtomicMoveStock(`OP_RUN_${i}_W1`, '본사창고', '차량1', 'ProductA', 10);
    const p2 = proposedAtomicMoveStock(`OP_RUN_${i}_W2`, '본사창고', '차량2', 'ProductA', 10);
    await Promise.all([p1, p2]);
    const snap = await getDoc(invDocRef);
    const inv = snap.data().value;
    if (inv['본사창고']['ProductA'] === 80 && inv['차량1']['ProductA'] === 10 && inv['차량2']['ProductA'] === 10) {
      metrics.test4_proposed_concurrent_load.passed++;
    } else {
      metrics.test4_proposed_concurrent_load.failed++;
    }
  }
  console.log(`Scenario 4 Result: ${metrics.test4_proposed_concurrent_load.passed}/${RUNS} Passed Atomically.`);

  // --- SCENARIO 5: Proposed Duplicate OpId (Double-tap / network retry) ---
  console.log('>>> [SCENARIO 5] Proposed runTransaction + OpID: Duplicate Request Idempotency');
  for (let i = 0; i < RUNS; i++) {
    await resetInventory(100);
    const opId = `OP_DUP_RUN_${i}`;
    await proposedAtomicMoveStock(opId, '본사창고', '차량1', 'ProductA', 10);
    // Duplicate identical request
    const dupRes = await proposedAtomicMoveStock(opId, '본사창고', '차량1', 'ProductA', 10);
    const snap = await getDoc(invDocRef);
    const inv = snap.data().value;
    if (inv['본사창고']['ProductA'] === 90 && dupRes.duplicate === true) {
      metrics.test5_proposed_duplicate_opid.blocked++;
    } else {
      metrics.test5_proposed_duplicate_opid.double_deducted++;
    }
  }
  console.log(`Scenario 5 Result: ${metrics.test5_proposed_duplicate_opid.blocked}/${RUNS} Blocked Successfully.`);

  // --- SCENARIO 6: Proposed Revert Idempotency & Ghost Stock Guard ---
  console.log('>>> [SCENARIO 6] Proposed runTransaction + OpID: Revert Safety');
  for (let i = 0; i < RUNS; i++) {
    await resetInventory(100);
    const loadOpId = `OP_LOAD_RUN_${i}`;
    await proposedAtomicMoveStock(loadOpId, '본사창고', '차량1', 'ProductA', 10); // stock becomes 90

    // 1st Revert: valid
    await proposedAtomicRevertStock(`REV_1_RUN_${i}`, loadOpId); // stock becomes 100

    // 2nd Revert: duplicate attempt on already-cancelled load
    let dupBlocked = false;
    try {
      await proposedAtomicRevertStock(`REV_2_RUN_${i}`, loadOpId);
    } catch (e) {
      if (e.message === 'INVALID_OR_ALREADY_CANCELLED') dupBlocked = true;
    }

    // 3rd Revert: non-existent operation
    let nonExistentBlocked = false;
    try {
      await proposedAtomicRevertStock(`REV_3_RUN_${i}`, 'NON_EXISTENT_OP');
    } catch (e) {
      if (e.message === 'INVALID_OR_ALREADY_CANCELLED') nonExistentBlocked = true;
    }

    const snap = await getDoc(invDocRef);
    const inv = snap.data().value;
    if (inv['본사창고']['ProductA'] === 100 && inv['차량1']['ProductA'] === 0 && dupBlocked && nonExistentBlocked) {
      metrics.test6_proposed_revert_safety.safe++;
    } else {
      metrics.test6_proposed_revert_safety.ghost_stock_created++;
    }
  }
  console.log(`Scenario 6 Result: ${metrics.test6_proposed_revert_safety.safe}/${RUNS} Revert Tests Passed Safely.`);

  console.log('\n================================================================');
  console.log('REAL FIRESTORE EMULATOR TEST MATRIX COMPLETE');
  console.log('================================================================');
  console.log(JSON.stringify(metrics, null, 2));

  fs.writeFileSync('scratch/real_emulator_results.json', JSON.stringify(metrics, null, 2));
}

runAllTests().then(() => {
  console.log('\nAll Real Emulator tests exited with code 0.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
