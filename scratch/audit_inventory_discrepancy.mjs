import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  doc, 
  getDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';

/**
 * LINKER-X Read-Only Inventory Discrepancy Diagnostic Tool
 * 
 * Compares current inventory snapshot against the cumulative sum of all recorded transfer histories.
 * STRICTLY READ-ONLY: Never modifies, resets, or writes to any Firestore collection.
 */

export async function runInventoryAudit({
  db,
  companyId = 'default'
}) {
  console.log(`\n🔍 [LINKER-X 감사] 회사(${companyId}) 재고 스냅샷 vs 이동 이력 읽기 전용 정합성 진단 시작...`);

  // 1. 현재 재고 스냅샷 조회 (settings/inventory)
  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  const invSnap = await getDoc(invRef);
  const currentSnapshot = invSnap.exists() ? (invSnap.data()?.value || {}) : {};

  // 2. 이동 이력 전체 조회 (inventoryTransferHistory)
  const historyRef = collection(db, 'companies', companyId, 'inventoryTransferHistory');
  const historySnap = await getDocs(historyRef);

  const historyEntries = [];
  historySnap.forEach(d => {
    historyEntries.push({ id: d.id, ...d.data() });
  });

  console.log(`  - 현재 재고 스냅샷 창고 수: ${Object.keys(currentSnapshot).length}개`);
  console.log(`  - 누적 이동 이력 건수: ${historyEntries.length}건`);

  // 3. 이동 이력 누적 계산
  const calculatedStock = {};
  for (const entry of historyEntries) {
    const { from, to, item, qty } = entry;
    const numQty = Number(qty || 0);
    if (!item || isNaN(numQty)) continue;

    if (from) {
      if (!calculatedStock[from]) calculatedStock[from] = {};
      calculatedStock[from][item] = (calculatedStock[from][item] || 0) - numQty;
    }
    if (to) {
      if (!calculatedStock[to]) calculatedStock[to] = {};
      calculatedStock[to][item] = (calculatedStock[to][item] || 0) + numQty;
    }
  }

  // 4. 모든 창고 및 품목에 대한 불일치(Discrepancy) 대조
  const allWarehouses = new Set([
    ...Object.keys(currentSnapshot),
    ...Object.keys(calculatedStock)
  ]);

  const report = {
    auditedAt: new Date().toISOString(),
    companyId,
    totalHistoryCount: historyEntries.length,
    warehousesAudited: allWarehouses.size,
    discrepancies: [],
    matches: []
  };

  for (const wh of allWarehouses) {
    const snapWh = currentSnapshot[wh] || {};
    const calcWh = calculatedStock[wh] || {};
    const allItems = new Set([...Object.keys(snapWh), ...Object.keys(calcWh)]);

    for (const item of allItems) {
      const snapVal = Number(snapWh[item] || 0);
      const calcVal = Number(calcWh[item] || 0);
      const delta = snapVal - calcVal;

      const itemResult = {
        warehouse: wh,
        product: item,
        snapshotStock: snapVal,
        calculatedFromHistory: calcVal,
        delta,
        status: delta === 0 ? 'BALANCED' : 'MISMATCH'
      };

      if (delta === 0) {
        report.matches.push(itemResult);
      } else {
        if (delta > 0) {
          itemResult.probableCause = 'UNVERIFIED_REVERT_OR_GHOST_STOCK_INFLATION (스냅샷이 이력 누적보다 큼)';
        } else {
          itemResult.probableCause = 'LOST_UPDATE_OR_DOUBLE_DEDUCTION (스냅샷이 이력 누적보다 작음)';
        }
        report.discrepancies.push(itemResult);
      }
    }
  }

  console.log(`\n📊 [진단 결과 요약]`);
  console.log(`  - 정합성 일치 항목: ${report.matches.length}개`);
  console.log(`  - 불일치 이상 항목: ${report.discrepancies.length}개`);

  if (report.discrepancies.length > 0) {
    console.log(`\n⚠️  [발견된 불일치 상세 (상위 5건)]`);
    report.discrepancies.slice(0, 5).forEach((d, idx) => {
      console.log(`  [#${idx + 1}] 창고: ${d.warehouse} | 품목: ${d.product} | 스냅샷: ${d.snapshotStock} | 이력합산: ${d.calculatedFromHistory} | 오차: ${d.delta} (${d.probableCause})`);
    });
  } else {
    console.log(`  ✅ 모든 재고 스냅샷이 이동 이력과 100% 일치합니다.`);
  }

  return report;
}

// CLI로 직접 실행 시 (예: node scratch/audit_inventory_discrepancy.mjs)
if (process.argv[1]?.endsWith('audit_inventory_discrepancy.mjs')) {
  const EMULATOR_HOST = '127.0.0.1';
  const EMULATOR_PORT = 8080;
  const DUMMY_PROJECT_ID = 'emulator-test-isolated';

  const app = initializeApp({ projectId: DUMMY_PROJECT_ID, apiKey: 'fake-api-key' });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORT);

  runInventoryAudit({ db, companyId: 'test_company' })
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
