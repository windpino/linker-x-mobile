import { doc, runTransaction, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

/**
 * LINKER-X Server-Authoritative Stock Transaction Service
 * 
 * Provides idempotent, concurrency-safe inventory operations using Firestore runTransaction
 * and durable Operation IDs. Prevents Lost Updates, Batch Stale Overwrites, and Ghost Stock.
 */

/**
 * 1. Atomic Stock Movement with Operation ID Idempotency
 */
export async function moveStockAtomic({
  db,
  companyId = 'default',
  from,
  to,
  productName,
  qty,
  isAuto = false,
  customDate = null,
  relatedOrderId = null,
  operator = '시스템',
  operationId = null,
  spec = ''
}) {
  if (!db) throw new Error('[stockTransaction] db instance is required');
  if (!from || !to || !productName || qty === undefined || qty === null) {
    throw new Error('[stockTransaction] from, to, productName, qty are required');
  }

  const opId = String(operationId || `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const operationRef = doc(db, 'companies', companyId, 'operations', opId);
  const inventoryRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  const historyRef = doc(db, 'companies', companyId, 'inventoryTransferHistory', opId);

  return await runTransaction(db, async (transaction) => {
    // 1) 멱등성 검사: 동일 Operation ID가 이미 성공적으로 처리되었는지 확인
    const opSnap = await transaction.get(operationRef);
    if (opSnap.exists() && opSnap.data()?.status === 'CONFIRMED') {
      return {
        success: true,
        alreadyProcessed: true,
        operationId: opId,
        message: 'Duplicate operation detected. Skipped redundant deduction.'
      };
    }

    // 2) 서버 권위적 재고 스냅샷 조회
    const invSnap = await transaction.get(inventoryRef);
    const currentInv = invSnap.exists() ? (invSnap.data()?.value || {}) : {};
    
    // 3) 원자적 재고 가감 계산
    const nextInv = JSON.parse(JSON.stringify(currentInv));
    if (!nextInv[from]) nextInv[from] = {};
    if (!nextInv[to]) nextInv[to] = {};

    const fromVal = Number(nextInv[from][productName] || 0);
    const toVal = Number(nextInv[to][productName] || 0);
    const moveQty = Number(qty);

    nextInv[from][productName] = fromVal - moveQty;
    nextInv[to][productName] = toVal + moveQty;

    // 4) 이력 데이터 생성
    const moveDate = customDate || new Date().toISOString().split('T')[0];
    const moveTime = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const historyEntry = {
      id: opId,
      operationId: opId,
      date: moveDate,
      from,
      to,
      item: productName,
      spec: spec || '',
      qty: moveQty,
      processedAt: moveTime,
      operator: operator || '시스템',
      memo: isAuto ? '상차(자동이동)' : '수동이동',
      salesOrderId: relatedOrderId ? String(relatedOrderId) : null,
      companyId,
      status: 'CONFIRMED',
      createdAt: Date.now()
    };

    // 5) 원자적 쓰기 (재고 + 이력 + Operation ID)
    transaction.set(inventoryRef, { value: nextInv }, { merge: true });
    transaction.set(historyRef, historyEntry);
    transaction.set(operationRef, {
      operationId: opId,
      status: 'CONFIRMED',
      type: 'MOVE_STOCK',
      from,
      to,
      item: productName,
      qty: moveQty,
      salesOrderId: relatedOrderId ? String(relatedOrderId) : null,
      historyId: opId,
      timestamp: Date.now()
    });

    return {
      success: true,
      alreadyProcessed: false,
      operationId: opId,
      nextInv,
      historyEntry
    };
  });
}

/**
 * 2. Atomic Batch Stock Movement (일괄 상차 원자적 처리)
 * 단일 트랜잭션 내에서 모든 품목의 재고 차감 및 Operation ID 기록을 완결하여 Stale Closure 방지
 */
export async function batchMoveStockAtomic({
  db,
  companyId = 'default',
  moves = [],
  operator = '시스템'
}) {
  if (!db) throw new Error('[stockTransaction] db instance is required');
  if (!Array.isArray(moves) || moves.length === 0) {
    return { success: true, processedCount: 0, nextInv: null };
  }

  const inventoryRef = doc(db, 'companies', companyId, 'settings', 'inventory');

  return await runTransaction(db, async (transaction) => {
    // 1) 각 이동 항목의 Operation ID 상태 일괄 조회
    const validMoves = [];
    let alreadyProcessedCount = 0;

    for (const move of moves) {
      const opId = String(move.operationId || `batch_item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      const opRef = doc(db, 'companies', companyId, 'operations', opId);
      const opSnap = await transaction.get(opRef);

      if (opSnap.exists() && opSnap.data()?.status === 'CONFIRMED') {
        alreadyProcessedCount++;
      } else {
        validMoves.push({ ...move, resolvedOpId: opId, opRef });
      }
    }

    if (validMoves.length === 0) {
      return {
        success: true,
        processedCount: 0,
        alreadyProcessedCount,
        message: 'All items were already processed.'
      };
    }

    // 2) 최신 재고 스냅샷 단 1회 조회
    const invSnap = await transaction.get(inventoryRef);
    const currentInv = invSnap.exists() ? (invSnap.data()?.value || {}) : {};
    const nextInv = JSON.parse(JSON.stringify(currentInv));

    const newEntries = [];
    const moveDate = new Date().toISOString().split('T')[0];
    const moveTime = new Date().toLocaleTimeString('ko-KR', { hour12: false });

    // 3) 누적 가감 계산
    for (const item of validMoves) {
      const { from, to, productName, qty, isAuto = true, customDate, relatedOrderId, spec, resolvedOpId, opRef } = item;
      if (!nextInv[from]) nextInv[from] = {};
      if (!nextInv[to]) nextInv[to] = {};

      const moveQty = Number(qty);
      nextInv[from][productName] = Number(nextInv[from][productName] || 0) - moveQty;
      nextInv[to][productName] = Number(nextInv[to][productName] || 0) + moveQty;

      const historyRef = doc(db, 'companies', companyId, 'inventoryTransferHistory', resolvedOpId);
      const entry = {
        id: resolvedOpId,
        operationId: resolvedOpId,
        date: customDate || moveDate,
        from,
        to,
        item: productName,
        spec: spec || '',
        qty: moveQty,
        processedAt: moveTime,
        operator: operator || '시스템',
        memo: isAuto ? '상차(자동이동)' : '수동이동',
        salesOrderId: relatedOrderId ? String(relatedOrderId) : null,
        companyId,
        status: 'CONFIRMED',
        createdAt: Date.now()
      };

      newEntries.push(entry);
      transaction.set(historyRef, entry);
      transaction.set(opRef, {
        operationId: resolvedOpId,
        status: 'CONFIRMED',
        type: 'BATCH_MOVE',
        from,
        to,
        item: productName,
        qty: moveQty,
        salesOrderId: relatedOrderId ? String(relatedOrderId) : null,
        timestamp: Date.now()
      });
    }

    // 4) 최종 재고 1회 원자적 커밋
    transaction.set(inventoryRef, { value: nextInv }, { merge: true });

    return {
      success: true,
      processedCount: validMoves.length,
      alreadyProcessedCount,
      nextInv,
      newEntries
    };
  });
}

/**
 * 3. Safe Loading Revert with Verification (상차 취소 안전 트랜잭션)
 * 원본 상차 이력 또는 Operation ID 존재 여부를 먼저 검증하여 유령 재고 생성 원천 차단
 */
export async function revertAutoMoveStockAtomic({
  db,
  companyId = 'default',
  from,
  to,
  productName,
  qty,
  relatedOrderId = null,
  operationId = null,
  operator = '시스템'
}) {
  if (!db) throw new Error('[stockTransaction] db instance is required');

  const cancelOpId = String(operationId || `cancel_${relatedOrderId || Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const cancelOpRef = doc(db, 'companies', companyId, 'operations', cancelOpId);
  const inventoryRef = doc(db, 'companies', companyId, 'settings', 'inventory');

  return await runTransaction(db, async (transaction) => {
    // 1) 멱등성 검증: 이미 취소 처리가 완료되었는지 확인
    const cancelOpSnap = await transaction.get(cancelOpRef);
    if (cancelOpSnap.exists() && cancelOpSnap.data()?.status === 'CONFIRMED') {
      return {
        success: true,
        alreadyProcessed: true,
        operationId: cancelOpId,
        message: 'Already cancelled operation.'
      };
    }

    // 2) 원본 상차 작업 존재 확인 (유령 재고 방지 가드)
    let originalOpRef = null;
    let originalOpData = null;

    if (relatedOrderId) {
      originalOpRef = doc(db, 'companies', companyId, 'operations', String(relatedOrderId));
      const origSnap = await transaction.get(originalOpRef);
      if (origSnap.exists()) {
        originalOpData = origSnap.data();
      }
    }

    // 원본 작업이 없거나 이미 취소된 상태인 경우 거부
    if (relatedOrderId && (!originalOpData || originalOpData.status !== 'CONFIRMED')) {
      const err = new Error(`INVALID_OR_ALREADY_CANCELLED: No active operation found for ID ${relatedOrderId}`);
      err.code = 'INVALID_OR_ALREADY_CANCELLED';
      throw err;
    }

    // 3) 최신 재고 조회 및 역방향 환원
    const invSnap = await transaction.get(inventoryRef);
    const currentInv = invSnap.exists() ? (invSnap.data()?.value || {}) : {};
    const nextInv = JSON.parse(JSON.stringify(currentInv));

    if (!nextInv[from]) nextInv[from] = {};
    if (!nextInv[to]) nextInv[to] = {};

    const moveQty = Number(qty);
    nextInv[from][productName] = Number(nextInv[from][productName] || 0) + moveQty;
    nextInv[to][productName] = Number(nextInv[to][productName] || 0) - moveQty;

    // 4) 재고 환원 및 상태 갱신
    transaction.set(inventoryRef, { value: nextInv }, { merge: true });
    transaction.set(cancelOpRef, {
      operationId: cancelOpId,
      status: 'CONFIRMED',
      type: 'REVERT_STOCK',
      targetOrderId: relatedOrderId ? String(relatedOrderId) : null,
      from,
      to,
      item: productName,
      qty: moveQty,
      operator,
      timestamp: Date.now()
    });

    if (originalOpRef) {
      transaction.set(originalOpRef, {
        status: 'CANCELLED',
        cancelledBy: cancelOpId,
        cancelledAt: Date.now()
      }, { merge: true });
    }

    return {
      success: true,
      alreadyProcessed: false,
      operationId: cancelOpId,
      cancelledHistoryId: relatedOrderId,
      nextInv
    };
  });
}

/**
 * 4. Legacy (Unpatched) Actual Code Logic (비교 테스트용 기존 로직)
 */
export async function legacyMoveStock({
  db,
  companyId = 'default',
  from,
  to,
  productName,
  qty,
  currentInventory = {}
}) {
  const nextInv = JSON.parse(JSON.stringify(currentInventory));
  if (!nextInv[from]) nextInv[from] = {};
  if (!nextInv[to]) nextInv[to] = {};

  const moveQty = Number(qty);
  nextInv[from][productName] = Number(nextInv[from][productName] || 0) - moveQty;
  nextInv[to][productName] = Number(nextInv[to][productName] || 0) + moveQty;

  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  await setDoc(invRef, { value: nextInv });
  return { success: true, nextInv };
}

export async function legacyRevertAutoMoveStock({
  db,
  companyId = 'default',
  from,
  to,
  productName,
  qty,
  currentInventory = {}
}) {
  const nextInv = JSON.parse(JSON.stringify(currentInventory));
  if (!nextInv[from]) nextInv[from] = {};
  if (!nextInv[to]) nextInv[to] = {};

  const moveQty = Number(qty);
  nextInv[from][productName] = Number(nextInv[from][productName] || 0) + moveQty;
  nextInv[to][productName] = Number(nextInv[to][productName] || 0) - moveQty;

  // 기존 버그: 이력 존재 여부 확인 전에 setDoc이 무조건 먼저 실행됨
  const invRef = doc(db, 'companies', companyId, 'settings', 'inventory');
  await setDoc(invRef, { value: nextInv });
  return { success: true, nextInv };
}
