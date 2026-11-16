// Comprehensive Concurrency & Idempotency Stress Test Matrix (20 Iterations)
// Fully isolated in-memory test engine (zero production writes)

import fs from 'fs';

class MockFirestoreEngine {
  constructor() {
    this.storage = new Map();
    this.opLog = new Map();
  }

  getDoc(path) {
    const val = this.storage.get(path);
    return val ? JSON.parse(JSON.stringify(val)) : null;
  }

  setDoc(path, val) {
    this.storage.set(path, JSON.parse(JSON.stringify(val)));
  }

  async runTransaction(fn) {
    let retries = 10;
    while (retries > 0) {
      retries--;
      const snapshot = new Map();
      const writes = [];
      const tx = {
        get: (p) => {
          const v = this.getDoc(p);
          snapshot.set(p, JSON.stringify(v));
          return v;
        },
        set: (p, v) => writes.push({ p, v })
      };

      try {
        const res = await fn(tx);
        // Contention check
        let conflict = false;
        for (const [p, expected] of snapshot.entries()) {
          if (JSON.stringify(this.getDoc(p)) !== expected) {
            conflict = true;
            break;
          }
        }
        if (conflict) {
          await new Promise(r => setTimeout(r, Math.random() * 15));
          continue;
        }
        for (const w of writes) this.setDoc(w.p, w.v);
        return { success: true, res };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'MAX_CONTENTION' };
  }
}

async function runMatrix() {
  const ITERATIONS = 20;
  const results = {
    test1_current_lost_update: { runs: ITERATIONS, reproduced: 0, passed: 0 },
    test2_batch_toggle_overwrite: { runs: ITERATIONS, reproduced: 0, passed: 0 },
    test3_proposed_concurrency: { runs: ITERATIONS, passed: 0, failed: 0 },
    test4_duplicate_op_id: { runs: ITERATIONS, blocked: 0, doubleDeducted: 0 },
    test5_revert_idempotency: { runs: ITERATIONS, safe: 0, ghostStockCreated: 0 }
  };

  const invPath = 'companies/default/settings/inventory';
  const opLogPrefix = 'companies/default/operations/';

  for (let i = 0; i < ITERATIONS; i++) {
    // -------------------------------------------------------------
    // 1. Current Logic Concurrency Race
    // -------------------------------------------------------------
    const db1 = new MockFirestoreEngine();
    db1.setDoc(invPath, { value: { '본사': { 'ItemA': 100 }, '차량1': { 'ItemA': 0 }, '차량2': { 'ItemA': 0 } } });
    
    // Simulate 2 workers concurrently reading and writing back with delay
    await Promise.all([
      (async () => {
        const inv = db1.getDoc(invPath).value;
        inv['본사']['ItemA'] -= 10;
        inv['차량1']['ItemA'] += 10;
        await new Promise(r => setTimeout(r, 10 + Math.random() * 10));
        db1.setDoc(invPath, { value: inv });
      })(),
      (async () => {
        const inv = db1.getDoc(invPath).value;
        inv['본사']['ItemA'] -= 10;
        inv['차량2']['ItemA'] += 10;
        await new Promise(r => setTimeout(r, 10 + Math.random() * 10));
        db1.setDoc(invPath, { value: inv });
      })()
    ]);

    const final1 = db1.getDoc(invPath).value;
    if (final1['본사']['ItemA'] === 90) {
      results.test1_current_lost_update.reproduced++;
    } else if (final1['본사']['ItemA'] === 80) {
      results.test1_current_lost_update.passed++;
    }

    // -------------------------------------------------------------
    // 2. Batch Toggle Overwrite
    // -------------------------------------------------------------
    const db2 = new MockFirestoreEngine();
    db2.setDoc(invPath, { value: { '본사': { 'ItemA': 100 }, '차량': { 'ItemA': 0 } } });
    const staleSnapshot = db2.getDoc(invPath).value;
    
    await Promise.all([1, 2, 3, 4, 5].map(async () => {
      const inv = JSON.parse(JSON.stringify(staleSnapshot));
      inv['본사']['ItemA'] -= 10;
      inv['차량']['ItemA'] += 10;
      await new Promise(r => setTimeout(r, 5 + Math.random() * 10));
      db2.setDoc(invPath, { value: inv });
    }));

    const final2 = db2.getDoc(invPath).value;
    if (final2['본사']['ItemA'] === 90) {
      results.test2_batch_toggle_overwrite.reproduced++;
    } else if (final2['본사']['ItemA'] === 50) {
      results.test2_batch_toggle_overwrite.passed++;
    }

    // -------------------------------------------------------------
    // 3. Proposed Transaction + OpID
    // -------------------------------------------------------------
    const db3 = new MockFirestoreEngine();
    db3.setDoc(invPath, { value: { '본사': { 'ItemA': 100 }, '차량1': { 'ItemA': 0 }, '차량2': { 'ItemA': 0 } } });

    const moveAtomic = async (opId, from, to, qty) => {
      return await db3.runTransaction(async (tx) => {
        if (tx.get(`${opLogPrefix}${opId}`)) return { duplicate: true };
        const doc = tx.get(invPath);
        const inv = JSON.parse(JSON.stringify(doc.value));
        inv[from]['ItemA'] -= qty;
        inv[to]['ItemA'] += qty;
        tx.set(invPath, { value: inv });
        tx.set(`${opLogPrefix}${opId}`, { status: 'CONFIRMED', qty });
        return { duplicate: false };
      });
    };

    await Promise.all([
      moveAtomic(`OP_T3_${i}_1`, '본사', '차량1', 10),
      moveAtomic(`OP_T3_${i}_2`, '본사', '차량2', 10)
    ]);

    const final3 = db3.getDoc(invPath).value;
    if (final3['본사']['ItemA'] === 80 && final3['차량1']['ItemA'] === 10 && final3['차량2']['ItemA'] === 10) {
      results.test3_proposed_concurrency.passed++;
    } else {
      results.test3_proposed_concurrency.failed++;
    }

    // -------------------------------------------------------------
    // 4. Duplicate OpId (Double tap / Retry)
    // -------------------------------------------------------------
    const dupRes = await moveAtomic(`OP_T3_${i}_1`, '본사', '차량1', 10);
    const postDupInv = db3.getDoc(invPath).value;
    if (postDupInv['본사']['ItemA'] === 80 && dupRes.res.duplicate === true) {
      results.test4_duplicate_op_id.blocked++;
    } else {
      results.test4_duplicate_op_id.doubleDeducted++;
    }

    // -------------------------------------------------------------
    // 5. Revert Idempotency & Ghost Stock Guard
    // -------------------------------------------------------------
    const revertAtomic = async (revId, targetOpId) => {
      return await db3.runTransaction(async (tx) => {
        if (tx.get(`${opLogPrefix}${revId}`)) return { duplicate: true };
        const targetOp = tx.get(`${opLogPrefix}${targetOpId}`);
        if (!targetOp || targetOp.status !== 'CONFIRMED' || targetOp.isCancelled) {
          throw new Error('INVALID_OR_ALREADY_CANCELLED');
        }
        const doc = tx.get(invPath);
        const inv = JSON.parse(JSON.stringify(doc.value));
        inv['본사']['ItemA'] += targetOp.qty;
        inv['차량1']['ItemA'] -= targetOp.qty;
        targetOp.isCancelled = true;
        tx.set(`${opLogPrefix}${targetOpId}`, targetOp);
        tx.set(invPath, { value: inv });
        tx.set(`${opLogPrefix}${revId}`, { status: 'CONFIRMED' });
        return { success: true };
      });
    };

    // 1st Revert: Valid
    const rev1Res = await revertAtomic(`REV_${i}_1`, `OP_T3_${i}_1`);
    // 2nd Revert: Duplicate attempt on same targetOp
    const rev2Res = await revertAtomic(`REV_${i}_2`, `OP_T3_${i}_1`);
    const duplicateRevertBlocked = rev2Res.success === false && rev2Res.error === 'INVALID_OR_ALREADY_CANCELLED';

    const final5 = db3.getDoc(invPath).value;
    if (final5['본사']['ItemA'] === 90 && final5['차량1']['ItemA'] === 0 && duplicateRevertBlocked) {
      results.test5_revert_idempotency.safe++;
    } else if (final5['본사']['ItemA'] === 100 && final5['차량1']['ItemA'] === 0 && duplicateRevertBlocked) {
      results.test5_revert_idempotency.safe++;
    } else {
      results.test5_revert_idempotency.ghostStockCreated++;
    }
  }

  console.log(JSON.stringify(results, null, 2));
  return results;
}

runMatrix().then(res => {
  fs.writeFileSync('scratch/matrix_results.json', JSON.stringify(res, null, 2));
  console.log('Matrix testing completed successfully.');
}).catch(console.error);
