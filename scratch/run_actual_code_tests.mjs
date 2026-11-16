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
  batchMoveStockAtomic, 
  revertAutoMoveStockAtomic,
  legacyMoveStock,
  legacyRevertAutoMoveStock 
} from '../src/utils/stockTransactionService.js';
import fs from 'fs';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const DUMMY_PROJECT_ID = 'emulator-test-isolated';

console.log('='.repeat(80));
console.log('🔗 [LINKER-X] 실제 상차·재고 코드 공식 에뮬레이터 전후 비교 검증 (160회)');
console.log('='.repeat(80));

// 1. Firebase 앱 초기화 및 에뮬레이터 연결
const app = initializeApp({
  projectId: DUMMY_PROJECT_ID,
  apiKey: 'fake-api-key-for-emulator'
});
const db = getFirestore(app);
connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORT);
console.log(`✅ [격리 확인] 공식 Firestore 에뮬레이터(${EMULATOR_HOST}:${EMULATOR_PORT}) 연결 완료`);
console.log(`🔒 [운영 차단] 프로젝트 ID: ${DUMMY_PROJECT_ID} (운영 Firebase 'link-x-6606e' 완전 격리)\n`);

const ITERATIONS_PER_SCENARIO = 20;

async function resetInventory(companyId, initialInv) {
  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  await setDoc(invRef, { value: initialInv });
}

async function getInventory(companyId) {
  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  const snap = await getDoc(invRef);
  return snap.exists() ? snap.data().value : {};
}

const testResults = {
  metadata: {
    executedAt: new Date().toISOString(),
    emulatorHost: `${EMULATOR_HOST}:${EMULATOR_PORT}`,
    projectId: DUMMY_PROJECT_ID,
    totalRuns: ITERATIONS_PER_SCENARIO * 8
  },
  unpatched: {
    concurrent: [],
    batch: [],
    duplicate: [],
    cancel: []
  },
  patched: {
    concurrent: [],
    batch: [],
    duplicate: [],
    cancel: []
  }
};

async function runTestSuite() {
  console.log(`\n================================================================================`);
  console.log(`[PART 1] 수정 전(기존 소스코드) 로직 검증: 4개 시나리오 x 20회 = 80회`);
  console.log(`================================================================================\n`);

  // 1-1. 기존 동시 상차 (분실 갱신 버그 재현)
  console.log(`--- [1-1] 수정 전 동시 상차 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `unpatch_concurrent_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량1': { '테스트품목': 0 }, '차량2': { '테스트품목': 0 } });
    
    // 동시에 동일한 과거 스냅샷을 읽음
    const staleSnap = await getInventory(compId);
    
    await Promise.all([
      legacyMoveStock({ db, companyId: compId, from: '본사창고', to: '차량1', productName: '테스트품목', qty: 10, currentInventory: staleSnap }),
      legacyMoveStock({ db, companyId: compId, from: '본사창고', to: '차량2', productName: '테스트품목', qty: 10, currentInventory: staleSnap })
    ]);

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isLostUpdate = finalStock === 90; // 정상이라면 80이어야 함

    const runInfo = {
      run: i,
      initial: 100,
      expected: 80,
      actual: finalStock,
      status: isLostUpdate ? 'BUG_REPRODUCED (LOST_UPDATE)' : 'UNEXPECTED',
      details: `본사창고: ${finalStock} (10 차감 유실)`
    };
    testResults.unpatched.concurrent.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 80] | ${runInfo.status}`);
  }

  // 1-2. 기존 일괄 상차 (반복문 덮어쓰기 누락 재현)
  console.log(`\n--- [1-2] 수정 전 일괄 상차 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `unpatch_batch_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량': { '테스트품목': 0 } });
    
    // 일괄 5건 (각 10개) 처리 시 동일한 닫힌 스냅샷 참조
    const staleSnap = await getInventory(compId);
    for (let k = 0; k < 5; k++) {
      await legacyMoveStock({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, currentInventory: staleSnap });
    }

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isOverwrite = finalStock === 90; // 정상이라면 50이어야 함

    const runInfo = {
      run: i,
      initial: 100,
      expected: 50,
      actual: finalStock,
      status: isOverwrite ? 'BUG_REPRODUCED (BATCH_OVERWRITE)' : 'UNEXPECTED',
      details: `본사창고: ${finalStock} (40 차감 유실)`
    };
    testResults.unpatched.batch.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 50] | ${runInfo.status}`);
  }

  // 1-3. 기존 중복 요청 (동일 작업 중복 차감 재현)
  console.log(`\n--- [1-3] 수정 전 중복 요청 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `unpatch_dup_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량': { '테스트품목': 0 } });

    // 1회차 요청
    let inv1 = await getInventory(compId);
    await legacyMoveStock({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, currentInventory: inv1 });

    // 네트워크 재전송 또는 버튼 더블클릭 (동일 요청 재전송)
    let inv2 = await getInventory(compId);
    await legacyMoveStock({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, currentInventory: inv2 });

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isDuplicateDeducted = finalStock === 80; // 멱등성이 없다면 2번 깎여 80이 됨

    const runInfo = {
      run: i,
      initial: 100,
      expected: 90,
      actual: finalStock,
      status: isDuplicateDeducted ? 'BUG_REPRODUCED (DUPLICATE_DEDUCTION)' : 'UNEXPECTED',
      details: `본사창고: ${finalStock} (중복 요청이 2회 모두 차감됨)`
    };
    testResults.unpatched.duplicate.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 90 (1회만 차감)] | ${runInfo.status}`);
  }

  // 1-4. 기존 상차 취소 (유령 재고 생성 재현)
  console.log(`\n--- [1-4] 수정 전 상차 취소 유령 재고 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `unpatch_cancel_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량': { '테스트품목': 0 } });

    // 원본 상차 이력이 전혀 없는데 취소 요청이 들어옴 (허위/중복 취소)
    const currentInv = await getInventory(compId);
    await legacyRevertAutoMoveStock({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 20, currentInventory: currentInv });

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isGhostStock = finalStock === 120; // 100에서 존재하지 않는 이력 취소로 120으로 부풀려짐

    const runInfo = {
      run: i,
      initial: 100,
      expected: 100,
      actual: finalStock,
      status: isGhostStock ? 'BUG_REPRODUCED (GHOST_STOCK_INFLATION)' : 'UNEXPECTED',
      details: `본사창고: ${finalStock} (이력 부재에도 20개 유령 재고 가산)`
    };
    testResults.unpatched.cancel.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 100 (거부되어야 함)] | ${runInfo.status}`);
  }


  console.log(`\n================================================================================`);
  console.log(`[PART 2] 수정 후(원자적 트랜잭션 + OpID) 로직 검증: 4개 시나리오 x 20회 = 80회`);
  console.log(`================================================================================\n`);

  // 2-1. 개선 후 동시 상차 (runTransaction 원자적 처리)
  console.log(`--- [2-1] 수정 후 원자적 동시 상차 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `patch_concurrent_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량1': { '테스트품목': 0 }, '차량2': { '테스트품목': 0 } });

    await Promise.all([
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량1', productName: '테스트품목', qty: 10, isAuto: true, operationId: `op_c1_${i}` }),
      moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량2', productName: '테스트품목', qty: 10, isAuto: true, operationId: `op_c2_${i}` })
    ]);

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isSuccess = finalStock === 80 && finalInv['차량1']?.['테스트품목'] === 10 && finalInv['차량2']?.['테스트품목'] === 10;

    const runInfo = {
      run: i,
      initial: 100,
      expected: 80,
      actual: finalStock,
      status: isSuccess ? 'PASS' : 'FAIL',
      details: `본사: ${finalStock}, 차량1: ${finalInv['차량1']?.['테스트품목']}, 차량2: ${finalInv['차량2']?.['테스트품목']}`
    };
    testResults.patched.concurrent.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 80] | ${runInfo.status}`);
  }

  // 2-2. 개선 후 일괄 상차 (batchMoveStockAtomic 단일 트랜잭션)
  console.log(`\n--- [2-2] 수정 후 원자적 일괄 상차 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `patch_batch_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량': { '테스트품목': 0 } });

    const moves = [
      { from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: `batch_${i}_1` },
      { from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: `batch_${i}_2` },
      { from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: `batch_${i}_3` },
      { from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: `batch_${i}_4` },
      { from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: `batch_${i}_5` }
    ];

    const result = await batchMoveStockAtomic({ db, companyId: compId, moves });
    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isSuccess = finalStock === 50 && result.processedCount === 5;

    const runInfo = {
      run: i,
      initial: 100,
      expected: 50,
      actual: finalStock,
      status: isSuccess ? 'PASS' : 'FAIL',
      details: `본사: ${finalStock}, 차량: ${finalInv['차량']?.['테스트품목']}, 처리건수: ${result.processedCount}`
    };
    testResults.patched.batch.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 50] | ${runInfo.status}`);
  }

  // 2-3. 개선 후 중복 요청 멱등성 (동일 Operation ID 중복 전송 방어)
  console.log(`\n--- [2-3] 수정 후 중복 요청 멱등성 검증 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `patch_dup_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량': { '테스트품목': 0 } });

    const sharedOpId = `fixed_op_id_${i}`;
    // 1회차 요청 (성공)
    const res1 = await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: sharedOpId });
    // 2회차 요청 (중복 전송)
    const res2 = await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: sharedOpId });

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isIdempotent = finalStock === 90 && res2.alreadyProcessed === true;

    const runInfo = {
      run: i,
      initial: 100,
      expected: 90,
      actual: finalStock,
      status: isIdempotent ? 'PASS (IDEMPOTENT_PROTECTED)' : 'FAIL',
      details: `본사: ${finalStock}, 2회차 감지결과: alreadyProcessed=${res2.alreadyProcessed}`
    };
    testResults.patched.duplicate.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 90] | ${runInfo.status}`);
  }

  // 2-4. 개선 후 상차 취소 안전성 (유효 취소 복구 + 허위/중복 취소 원천 차단)
  console.log(`\n--- [2-4] 수정 후 상차 취소 안전성 (20회) ---`);
  for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
    const compId = `patch_cancel_${i}_${Date.now()}`;
    await resetInventory(compId, { '본사창고': { '테스트품목': 100 }, '차량': { '테스트품목': 0 } });

    const validOpId = `valid_load_order_${i}`;
    // 1단계: 정상 상차 10개 진행 (100 -> 90)
    await moveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, isAuto: true, operationId: validOpId, relatedOrderId: validOpId });

    // 2단계: 정상 상차 취소 1회 실행 (90 -> 100 원복)
    const cancel1 = await revertAutoMoveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, relatedOrderId: validOpId, operationId: `cancel_1_${i}` });

    // 3단계: 동일 상차건에 대한 중복 취소 시도 (거부되어야 함)
    let duplicateRejected = false;
    try {
      await revertAutoMoveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 10, relatedOrderId: validOpId, operationId: `cancel_2_${i}` });
    } catch (e) {
      if (e.code === 'INVALID_OR_ALREADY_CANCELLED') {
        duplicateRejected = true;
      }
    }

    // 4단계: 존재하지 않는 허위 주문번호 취소 시도 (거부되어야 함)
    let fakeRejected = false;
    try {
      await revertAutoMoveStockAtomic({ db, companyId: compId, from: '본사창고', to: '차량', productName: '테스트품목', qty: 20, relatedOrderId: `non_existent_${i}`, operationId: `cancel_fake_${i}` });
    } catch (e) {
      if (e.code === 'INVALID_OR_ALREADY_CANCELLED') {
        fakeRejected = true;
      }
    }

    const finalInv = await getInventory(compId);
    const finalStock = finalInv['본사창고']?.['테스트품목'];
    const isSafe = finalStock === 100 && duplicateRejected && fakeRejected;

    const runInfo = {
      run: i,
      initial: 100,
      expected: 100,
      actual: finalStock,
      status: isSafe ? 'PASS (GHOST_STOCK_PREVENTED)' : 'FAIL',
      details: `최종재고: ${finalStock}, 중복취소차단: ${duplicateRejected}, 허위취소차단: ${fakeRejected}`
    };
    testResults.patched.cancel.push(runInfo);
    console.log(`  회차 ${String(i).padStart(2, '0')}: 초기 100 -> 최종 ${finalStock} [기대: 100] | ${runInfo.status}`);
  }

  // 결과 파일 저장
  fs.writeFileSync('scratch/actual_code_test_results.json', JSON.stringify(testResults, null, 2));
  console.log(`\n================================================================================`);
  console.log(`📊 [검증 완료] 160회 전체 테스트 완료. 결과가 scratch/actual_code_test_results.json 에 저장되었습니다.`);
  console.log(`================================================================================\n`);
}

runTestSuite().catch(err => {
  console.error('❌ Test suite execution failed:', err);
  process.exit(1);
});
