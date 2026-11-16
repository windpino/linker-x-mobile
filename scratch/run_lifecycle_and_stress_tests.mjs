import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  moveStockAtomic, 
  revertAutoMoveStockAtomic,
  recordSalesInvoiceStockAtomic,
  revertSalesInvoiceStockAtomic
} from '../src/utils/stockTransactionService.js';
import { runInventoryAudit } from './audit_inventory_discrepancy.mjs';
import fs from 'fs';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const DUMMY_PROJECT_ID = 'emulator-test-isolated';

console.log('='.repeat(80));
console.log('🔄 [LINKER-X] 업무 규칙 반영: 마이너스 재고 & 전체 라이프사이클 스트레스 검증');
console.log('='.repeat(80));

const app = initializeApp({ projectId: DUMMY_PROJECT_ID, apiKey: 'fake-api-key' });
const db = getFirestore(app);
connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORT);
console.log(`✅ [격리 확인] 공식 Firestore 에뮬레이터(${EMULATOR_HOST}:${EMULATOR_PORT}) 연결 완료`);
console.log(`🔒 [운영 차단] 프로젝트 ID: ${DUMMY_PROJECT_ID} (운영 Firebase 절대 접속 차단)\n`);

async function resetInventory(companyId, initialInv) {
  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  await setDoc(invRef, { value: initialInv });
}

async function getInventory(companyId) {
  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  const snap = await getDoc(invRef);
  return snap.exists() ? snap.data().value : {};
}

const suiteResults = {
  metadata: {
    executedAt: new Date().toISOString(),
    emulatorHost: `${EMULATOR_HOST}:${EMULATOR_PORT}`,
    projectId: DUMMY_PROJECT_ID
  },
  lifecycle: [],
  negativeStockRapidClick: [],
  multiUserContention: [],
  networkRetryIdempotency: []
};

async function runAllTests() {
  const ITERATIONS = 20;

  // ============================================================================
  // [1] 실제 업무 라이프사이클 전 단계 검증 (초기 0개 기준: 상차->취소->재상차->납품->취소)
  // ============================================================================
  console.log(`================================================================================`);
  console.log(`[TEST 1] 실제 업무 라이프사이클 순차 검증 (초기 재고 0 기준, ${ITERATIONS}회 반복)`);
  console.log(`순서: 상차(2) ➔ 취소 ➔ 재상차(2) ➔ 납품완료(전표) ➔ 납품취소 ➔ 전표수정(3) ➔ 전표취소`);
  console.log(`================================================================================\n`);

  for (let i = 1; i <= ITERATIONS; i++) {
    const compId = `lifecycle_test_${i}_${Date.now()}`;
    // 초기 재고: 본사 0, 차량 0, 매출출고 0
    await resetInventory(compId, { '본사창고': { '테스트품목': 0 }, '차량': { '테스트품목': 0 }, '매출출고': { '테스트품목': 0 } });

    // Step 1: 상차 2개 (본사창고 0 -> -2, 차량 0 -> +2)
    const loadOp1 = `op_load_order1_${i}`;
    await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 2, isAuto: true, operationId: loadOp1, relatedOrderId: loadOp1 });
    let inv = await getInventory(compId);
    const step1Ok = inv['본사창고']?.['테스트품목'] === -2 && inv['차량']?.['테스트품목'] === 2;

    // Step 2: 상차 취소 (본사창고 -2 -> 0, 차량 +2 -> 0)
    await revertAutoMoveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 2, relatedOrderId: loadOp1, operationId: `cancel_load1_${i}` });
    inv = await getInventory(compId);
    const step2Ok = inv['본사창고']?.['테스트품목'] === 0 && inv['차량']?.['테스트품목'] === 0;

    // Step 3: 재상차 2개 (본사창고 0 -> -2, 차량 0 -> +2)
    const loadOp2 = `op_load_order2_${i}`;
    await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 2, isAuto: true, operationId: loadOp2, relatedOrderId: loadOp2 });
    inv = await getInventory(compId);
    const step3Ok = inv['본사창고']?.['테스트품목'] === -2 && inv['차량']?.['테스트품목'] === 2;

    // Step 4: 납품 완료 / 전표 생성 (차량 2 -> 0, 매출출고 0 -> 2, 본사창고는 여전히 -2 유지)
    const invId = `invoice_100_${i}`;
    await recordSalesInvoiceStockAtomic({
      db,
      companyId: compId,
      invoiceId: invId,
      items: [{ name: '테스트품목', qty: 2 }],
      warehouse: '차량',
      partner: '행복마트'
    });
    inv = await getInventory(compId);
    const step4Ok = inv['본사창고']?.['테스트품목'] === -2 && inv['차량']?.['테스트품목'] === 0 && inv['매출출고']?.['테스트품목'] === 2;

    // Step 5: 납품 취소 / 전표 삭제 (매출출고 2 -> 0, 차량 0 -> +2, 본사창고는 여전히 -2)
    await revertSalesInvoiceStockAtomic({
      db,
      companyId: compId,
      invoiceId: invId,
      items: [{ name: '테스트품목', qty: 2 }],
      warehouse: '차량'
    });
    inv = await getInventory(compId);
    const step5Ok = inv['본사창고']?.['테스트품목'] === -2 && inv['차량']?.['테스트품목'] === 2 && inv['매출출고']?.['테스트품목'] === 0;

    // Step 6: 재납품 & 전표 수정 3개 (차량 2 -> -1, 매출출고 0 -> 3, 본사창고 -2 유지)
    const invId2 = `invoice_200_${i}`;
    await recordSalesInvoiceStockAtomic({
      db,
      companyId: compId,
      invoiceId: invId2,
      items: [{ name: '테스트품목', qty: 3 }],
      warehouse: '차량',
      partner: '행복마트'
    });
    inv = await getInventory(compId);
    const step6Ok = inv['본사창고']?.['테스트품목'] === -2 && inv['차량']?.['테스트품목'] === -1 && inv['매출출고']?.['테스트품목'] === 3;

    // Step 7: 최종 전표 취소 (매출출고 3 -> 0, 차량 -1 -> +2, 본사창고 -2)
    await revertSalesInvoiceStockAtomic({
      db,
      companyId: compId,
      invoiceId: invId2,
      items: [{ name: '테스트품목', qty: 3 }],
      warehouse: '차량'
    });
    inv = await getInventory(compId);
    const step7Ok = inv['본사창고']?.['테스트품목'] === -2 && inv['차량']?.['테스트품목'] === 2 && inv['매출출고']?.['테스트품목'] === 0;

    const allPassed = step1Ok && step2Ok && step3Ok && step4Ok && step5Ok && step6Ok && step7Ok;
    const runResult = {
      run: i,
      step1_상차: { 본사: -2, 차량: 2, pass: step1Ok },
      step2_취소: { 본사: 0, 차량: 0, pass: step2Ok },
      step3_재상차: { 본사: -2, 차량: 2, pass: step3Ok },
      step4_납품: { 본사: -2, 차량: 0, 매출출고: 2, pass: step4Ok },
      step5_납품취소: { 본사: -2, 차량: 2, 매출출고: 0, pass: step5Ok },
      step6_전표수정: { 본사: -2, 차량: -1, 매출출고: 3, pass: step6Ok },
      step7_전표취소: { 본사: -2, 차량: 2, 매출출고: 0, pass: step7Ok },
      status: allPassed ? 'PASS' : 'FAIL'
    };
    suiteResults.lifecycle.push(runResult);
    console.log(`  회차 ${String(i).padStart(2, '0')}: [상차->취소->재상차->납품->취소->수정->취소] 전 단계 수량 일치: ${runResult.status}`);
  }

  // ============================================================================
  // [2] 마이너스 재고 상태에서의 빠른 연속 클릭 (더블탭) 방어 (20회)
  // ============================================================================
  console.log(`\n================================================================================`);
  console.log(`[TEST 2] 마이너스 재고 상태에서 빠른 연속 클릭 (더블탭) 멱등성 검증 (${ITERATIONS}회 반복)`);
  console.log(`조건: 본사창고 이미 -5개 상태에서 동일 OpID로 3개 상차 2회 연속 광클릭`);
  console.log(`================================================================================\n`);

  for (let i = 1; i <= ITERATIONS; i++) {
    const compId = `rapid_click_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': -5 }, '차량': { '테스트품목': 0 } });

    const sharedOpId = `rapid_tap_${i}`;
    const [res1, res2] = await Promise.all([
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 3, isAuto: true, operationId: sharedOpId }),
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 3, isAuto: true, operationId: sharedOpId })
    ]);

    const finalInv = await getInventory(compId);
    const finalWh = finalInv['본사창고']?.['테스트품목'];
    const finalCar = finalInv['차량']?.['테스트품목'];
    
    // 정상: -5에서 3개만 차감되어 -8, 차량은 +3이어야 함 (중복 차감 시 -11)
    const isSuccess = finalWh === -8 && finalCar === 3 && (res1.alreadyProcessed || res2.alreadyProcessed);

    const runInfo = {
      run: i,
      initial: -5,
      expected: -8,
      actualWh: finalWh,
      actualCar: finalCar,
      status: isSuccess ? 'PASS' : 'FAIL',
      details: `본사: ${finalWh} (기대: -8), 차량: ${finalCar} (기대: 3)`
    };
    suiteResults.negativeStockRapidClick.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 -5 -> 최종 본사 ${finalWh}, 차량 ${finalCar} | ${runInfo.status}`);
  }

  // ============================================================================
  // [3] 다중 사용자 동시 상차 경합 테스트 (20회)
  // ============================================================================
  console.log(`\n================================================================================`);
  console.log(`[TEST 3] 동시 다중 사용자 경합 테스트 (${ITERATIONS}회 반복)`);
  console.log(`조건: 3명의 사용자가 본사창고(초기 0)에서 각 차량으로 5개씩 동시 상차 (총 15개 차감)`);
  console.log(`================================================================================\n`);

  for (let i = 1; i <= ITERATIONS; i++) {
    const compId = `contention_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 0 }, '차량1': { '테스트품목': 0 }, '차량2': { '테스트품목': 0 }, '차량3': { '테스트품목': 0 } });

    await Promise.all([
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량1', productName: '테스트품목', qty: 5, isAuto: true, operationId: `op_u1_${i}` }),
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량2', productName: '테스트품목', qty: 5, isAuto: true, operationId: `op_u2_${i}` }),
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량3', productName: '테스트품목', qty: 5, isAuto: true, operationId: `op_u3_${i}` })
    ]);

    const finalInv = await getInventory(compId);
    const finalWh = finalInv['본사창고']?.['테스트품목'];
    const car1 = finalInv['차량1']?.['테스트품목'];
    const car2 = finalInv['차량2']?.['테스트품목'];
    const car3 = finalInv['차량3']?.['테스트품목'];

    const isSuccess = finalWh === -15 && car1 === 5 && car2 === 5 && car3 === 5;
    const runInfo = {
      run: i,
      initial: 0,
      expected: -15,
      actualWh: finalWh,
      cars: { car1, car2, car3 },
      status: isSuccess ? 'PASS' : 'FAIL',
      details: `본사: ${finalWh}, 차량1: ${car1}, 차량2: ${car2}, 차량3: ${car3}`
    };
    suiteResults.multiUserContention.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 0 -> 최종 본사 ${finalWh} [기대: -15], 차량(5,5,5) | ${runInfo.status}`);
  }

  // ============================================================================
  // [4] 통신 중단 및 재시도(Network Retry) 멱등성 검증 (20회)
  // ============================================================================
  console.log(`\n================================================================================`);
  console.log(`[TEST 4] 통신 지연/재시도(Network Retry) 멱등성 검증 (${ITERATIONS}회 반복)`);
  console.log(`조건: 1차 전송 성공 후 클라이언트가 응답 유실로 착각하여 동일 OpID 재전송`);
  console.log(`================================================================================\n`);

  for (let i = 1; i <= ITERATIONS; i++) {
    const compId = `retry_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 10 }, '차량': { '테스트품목': 0 } });

    const retryOpId = `retry_op_${i}`;
    // 1차 요청
    const firstRes = await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 4, isAuto: true, operationId: retryOpId });
    // 가상의 네트워크 재접속 후 재시도
    const retryRes = await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 4, isAuto: true, operationId: retryOpId });

    const finalInv = await getInventory(compId);
    const finalWh = finalInv['본사창고']?.['테스트품목'];
    const finalCar = finalInv['차량']?.['테스트품목'];

    const isSuccess = finalWh === 6 && finalCar === 4 && retryRes.alreadyProcessed === true;
    const runInfo = {
      run: i,
      initial: 10,
      expected: 6,
      actualWh: finalWh,
      actualCar: finalCar,
      retryAlreadyProcessed: retryRes.alreadyProcessed,
      status: isSuccess ? 'PASS' : 'FAIL',
      details: `본사: ${finalWh}, 차량: ${finalCar}, 재시도 차단: ${retryRes.alreadyProcessed}`
    };
    suiteResults.networkRetryIdempotency.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 10 -> 최종 본사 ${finalWh} [기대: 6], 재시도 차단: ${retryRes.alreadyProcessed} | ${runInfo.status}`);
  }

  // ============================================================================
  // [5] 읽기 전용 감사 도구 실행 (데이터 정합성 검증)
  // ============================================================================
  console.log(`\n================================================================================`);
  console.log(`[TEST 5] 읽기 전용 진단 도구(runInventoryAudit) 실행 검증`);
  console.log(`================================================================================`);
  const auditCompId = `audit_verify_${Date.now()}`;
  await resetInventory(auditCompId, { '본사창고': { '품목A': 0 }, '차량': { '품목A': 0 }, '매출출고': { '품목A': 0 } });
  
  // 1) 상차 10개
  await moveStockAtomic({ db, companyId: auditCompId, from: '본사창고', to: '차량', productName: '품목A', qty: 10, isAuto: true, operationId: `audit_load_1` });
  // 2) 전표 6개 납품
  await recordSalesInvoiceStockAtomic({ db, companyId: auditCompId, invoiceId: 'audit_inv_1', items: [{ name: '품목A', qty: 6 }], warehouse: '차량', partner: '감사처' });

  // 읽기 전용 진단 실행
  const auditReport = await runInventoryAudit({ db, companyId: auditCompId });
  suiteResults.auditReport = auditReport;

  fs.writeFileSync('scratch/lifecycle_stress_results.json', JSON.stringify(suiteResults, null, 2));
  console.log(`\n================================================================================`);
  console.log(`📊 [전체 완료] 모든 업무 규칙 및 스트레스 테스트 완료. 결과가 scratch/lifecycle_stress_results.json 에 저장되었습니다.`);
  console.log(`================================================================================\n`);
}

runAllTests().catch(err => {
  console.error('❌ Suite execution failed:', err);
  process.exit(1);
});
