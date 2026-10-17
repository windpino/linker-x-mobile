import React, { useState, useRef } from 'react';
import { ArrowLeftRight, Download, Upload, Edit3, CheckCircle, ChevronRight, ShieldCheck, Trash2, FileSpreadsheet } from 'lucide-react';
import WindowModal from './WindowModal';
import BulkEditor from './BulkEditor';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';
import './ExcelManager.css';

const InventoryTransferExcelManager = ({ 
  onClose, 
  inventoryTransferHistory = [], 
  setInventoryTransferHistory, 
  warehouses = [], 
  products = [], 
  currentUser 
}) => {
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [step, setStep] = useState('main'); // main | mapping | preview
  const [isLoading, setIsLoading] = useState(false);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState({
    date: '', from: '', to: '', item: '', spec: '', qty: '', operator: '', memo: ''
  });
  const [previewTransfers, setPreviewTransfers] = useState([]);
  const fileInputRef = useRef(null);

  // 기간별 부분삭제 관련 상태
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfYear = `${new Date().getFullYear()}-01-01`;
  const [deleteMode, setDeleteMode] = useState('all'); // 'all' | 'period'
  const [deleteStartDate, setDeleteStartDate] = useState(firstDayOfYear);
  const [deleteEndDate, setDeleteEndDate] = useState(todayStr);

  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'super_admin' || 
                  currentUser?.userId === 'admin' || 
                  currentUser?.jobTitle === '대표' ||
                  currentUser?.jobTitle === '관리자' ||
                  currentUser?.permissions?.ALL === true;

  const validTransfers = inventoryTransferHistory.filter(item => 
    !item.isPhysicalAdjustment && !item.isAdjustment && !item.adjustmentId
  );

  // 1. 엑셀 파일 다운로드
  const handleDownload = () => {
    if (validTransfers.length === 0) {
      alert('내보낼 재고이동 내역이 없습니다.');
      return;
    }

    const dataToExport = validTransfers.map((item, idx) => ({
      'No': idx + 1,
      '이동일자': item.date || (item.createdAt ? item.createdAt.slice(0, 10) : ''),
      '출고창고': item.from || '',
      '입고창고': item.to || '',
      '품목명': item.item || item.productName || '',
      '규격': item.spec || '',
      '이동수량': Number(item.qty) || 0,
      '처리자': item.operator || item.user || '',
      '처리시각': item.processedAt || (item.time || ''),
      '비고': item.memo || ''
    }));

    exportToExcel(dataToExport, `재고이동내역_${todayStr}`);
  };

  // 2. 엑셀 파일 업로드 및 자동 컬럼 매핑
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!data || data.length < 2) {
          alert('엑셀 파일에 유효한 데이터가 없습니다. (헤더 + 1행 이상의 데이터 필요)');
          setIsLoading(false);
          return;
        }

        const headers = data[0].map(h => String(h || '').trim());
        const rows = data.slice(1).filter(r => r.some(c => c !== ''));

        setRawHeaders(headers);
        setRawRows(rows);

        // 컬럼 자동 감지 및 스마트 매핑
        const findCol = (keywords) => {
          const idx = headers.findIndex(h => keywords.some(kw => h.toLowerCase().includes(kw.toLowerCase())));
          return idx >= 0 ? String(idx) : '';
        };

        setMapping({
          date: findCol(['이동일자', '일자', '날짜', '이동일', '전표일자', 'date']),
          from: findCol(['출고창고', '출발창고', '출고', '출발', '보내는창고', '출고지', 'from']),
          to: findCol(['입고창고', '도착창고', '입고', '도착', '받는창고', '입고지', 'to']),
          item: findCol(['품목명', '상품명', '품목', '품명', '물품명', 'item', 'product']),
          spec: findCol(['규격', '규격/모델', '모델', 'spec']),
          qty: findCol(['이동수량', '수량', '개수', 'qty', 'quantity']),
          operator: findCol(['처리자', '담당자', '작업자', '등록자', 'operator', 'user']),
          memo: findCol(['비고', '메모', '사유', '특이사항', 'memo'])
        });

        setStep('mapping');
      } catch (err) {
        console.error('Excel parse error:', err);
        alert('엑셀 파일을 읽는 도중 오류가 발생했습니다: ' + err.message);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. 분석 및 미리보기 빌드
  const handleBuildPreview = () => {
    if (!mapping.item || !mapping.qty) {
      alert('품목명과 수량은 필수 매핑 항목입니다.');
      return;
    }

    const companyId = currentUser?.companyId || 'default';
    const parsed = [];

    rawRows.forEach((row, i) => {
      const getVal = (idxStr) => (idxStr !== '' && row[Number(idxStr)] !== undefined ? String(row[Number(idxStr)]).trim() : '');
      const itemName = getVal(mapping.item);
      const qtyNum = Number(getVal(mapping.qty).replace(/[^0-9.-]/g, '')) || 0;

      if (!itemName || qtyNum === 0) return;

      let dateVal = getVal(mapping.date);
      if (!dateVal || dateVal.length < 8) dateVal = todayStr;
      else dateVal = dateVal.replace(/[./]/g, '-').slice(0, 10);

      const fromVal = getVal(mapping.from) || '본사창고';
      const toVal = getVal(mapping.to) || '메인창고';
      const specVal = getVal(mapping.spec);
      const operatorVal = getVal(mapping.operator) || currentUser?.name || '관리자';
      const memoVal = getVal(mapping.memo);

      parsed.push({
        id: `mov_imp_${Date.now()}_${i}`,
        date: dateVal,
        from: fromVal,
        to: toVal,
        item: itemName,
        spec: specVal,
        qty: qtyNum,
        operator: operatorVal,
        memo: memoVal,
        processedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
        createdAt: new Date().toISOString(),
        companyId
      });
    });

    if (parsed.length === 0) {
      alert('유효한 재고이동 데이터가 파싱되지 않았습니다. 컬럼 매핑을 다시 확인해 주세요.');
      return;
    }

    setPreviewTransfers(parsed);
    setStep('preview');
  };

  // 4. 업로드 일괄 등록 확정
  const handleConfirmImport = async () => {
    if (previewTransfers.length === 0) return;

    setIsLoading(true);
    try {
      const companyId = currentUser?.companyId || 'default';
      const CHUNK_SIZE = 400;

      for (let i = 0; i < previewTransfers.length; i += CHUNK_SIZE) {
        const chunk = previewTransfers.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(t => {
          batch.set(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(t.id)), t);
        });
        await batch.commit();
      }

      const nextTransfers = [...previewTransfers, ...inventoryTransferHistory];
      setInventoryTransferHistory(nextTransfers);

      try {
        await saveBundle(companyId, 'inventoryTransferHistory', nextTransfers);
        localStorage.setItem(`inventoryTransferHistory_${companyId}`, JSON.stringify(nextTransfers));
      } catch (e) {}

      alert(`✅ 재고이동 내역 ${previewTransfers.length}건이 성공적으로 등록되었습니다.`);
      setStep('main');
    } catch (err) {
      console.error('Import transfer history error:', err);
      alert('재고이동 내역 등록 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. 재고이동 데이터 전체/기간별 영구 삭제
  const handleDeleteTransfers = async () => {
    if (!isAdmin) {
      alert('재고이동 데이터 삭제는 관리자 권한이 필요합니다.');
      return;
    }
    if (validTransfers.length === 0) {
      alert('삭제할 재고이동 데이터가 없습니다.');
      return;
    }

    const isPeriod = deleteMode === 'period';
    if (isPeriod && (!deleteStartDate || !deleteEndDate)) {
      alert('삭제할 기간(시작일과 종료일)을 선택해 주세요.');
      return;
    }

    const targetTransfers = isPeriod
      ? validTransfers.filter(t => {
          const d = t.date || (t.createdAt ? t.createdAt.slice(0, 10) : '');
          return d && d >= deleteStartDate && d <= deleteEndDate;
        })
      : validTransfers;

    if (targetTransfers.length === 0) {
      alert(`선택하신 기간(${deleteStartDate} ~ ${deleteEndDate})에 해당하는 재고이동 내역이 없습니다.`);
      return;
    }

    const periodText = isPeriod ? `${deleteStartDate} ~ ${deleteEndDate}` : '전체 기간';
    if (!window.confirm(`현재 등록된 재고이동 내역 중 [${periodText}] 데이터 (${targetTransfers.length}건)를 시스템 및 DB에서 영구 삭제하시겠습니까?\n\n※ 재고이동 내역 삭제 시 실시간 재고(현재고)는 변동되지 않으며 과거 이동 장부만 정리됩니다.\n※ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    const entered = window.prompt(`정말 삭제하시려면 아래에 '재고이동삭제'를 정확히 입력해 주세요.`);
    if (entered !== '재고이동삭제') {
      alert('입력값이 일치하지 않아 취소되었습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const companyId = currentUser?.companyId || 'default';
      const CHUNK_SIZE = 400;

      for (let i = 0; i < targetTransfers.length; i += CHUNK_SIZE) {
        const chunk = targetTransfers.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(t => {
          const docId = String(t.id || t._docId);
          batch.delete(doc(db, 'companies', companyId, 'inventoryTransferHistory', docId));
        });
        await batch.commit();
      }

      const targetIdSet = new Set(targetTransfers.map(t => String(t.id || t._docId)));
      const remaining = inventoryTransferHistory.filter(t => !targetIdSet.has(String(t.id || t._docId)));
      setInventoryTransferHistory(remaining);

      try {
        await saveBundle(companyId, 'inventoryTransferHistory', remaining);
        localStorage.setItem(`inventoryTransferHistory_${companyId}`, JSON.stringify(remaining));
      } catch (e) {}

      alert(`✅ 재고이동 내역 ${targetTransfers.length}건이 성공적으로 삭제되었습니다.`);
    } catch (err) {
      console.error('Delete transfer history error:', err);
      alert('재고이동 내역 삭제 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 일괄 편집기(그리드) 컬럼 정의
  const gridColumns = [
    { field: 'date', header: '이동일자', type: 'string', width: 110, align: 'center' },
    { field: 'from', header: '출고창고', type: 'string', width: 130, align: 'center' },
    { field: 'to', header: '입고창고', type: 'string', width: 130, align: 'center' },
    { field: 'item', header: '품목명', type: 'string', width: 220, align: 'left' },
    { field: 'spec', header: '규격', type: 'string', width: 120, align: 'center' },
    { field: 'qty', header: '이동수량', type: 'number', width: 100, align: 'right' },
    { field: 'operator', header: '처리자', type: 'string', width: 110, align: 'center' },
    { field: 'memo', header: '비고', type: 'string', width: 200, align: 'left' },
  ];

  const MAPPING_LABELS = [
    { key: 'date', label: '이동일자', required: false },
    { key: 'from', label: '출고창고', required: false },
    { key: 'to', label: '입고창고', required: false },
    { key: 'item', label: '품목명', required: true },
    { key: 'spec', label: '규격', required: false },
    { key: 'qty', label: '이동수량', required: true },
    { key: 'operator', label: '처리자(담당자)', required: false },
    { key: 'memo', label: '비고(메모)', required: false },
  ];

  // 일괄 편집기 화면
  if (isBulkOpen) {
    const gridData = validTransfers.map((item, idx) => ({
      ...item,
      id: item.id || `mov_${idx}`
    }));

    return (
      <BulkEditor 
        type="transfer"
        title="재고이동 내역 일괄 편집" 
        initialData={gridData} 
        columns={gridColumns} 
        onSave={async (newData) => { 
          setIsLoading(true);
          try {
            const companyId = currentUser?.companyId || 'default';
            const batch = writeBatch(db);

            newData.forEach(t => {
              const docId = String(t.id);
              batch.set(doc(db, 'companies', companyId, 'inventoryTransferHistory', docId), t, { merge: true });
            });
            await batch.commit();

            setInventoryTransferHistory(newData);
            try {
              await saveBundle(companyId, 'inventoryTransferHistory', newData);
              localStorage.setItem(`inventoryTransferHistory_${companyId}`, JSON.stringify(newData));
            } catch (e) {}

            alert('✅ 재고이동 내역 일괄 수정사항이 성공적으로 저장되었습니다.');
            setIsBulkOpen(false);
          } catch (err) {
            console.error('Bulk save transfers error:', err);
            alert('일괄 편집 저장 중 오류가 발생했습니다: ' + err.message);
          } finally {
            setIsLoading(false);
          }
        }} 
        warehouses={warehouses}
        onClose={() => setIsBulkOpen(false)} 
      />
    );
  }

  // 엑셀 매핑 화면
  if (step === 'mapping') {
    const previewRow = rawRows[0] || [];
    return (
      <WindowModal title="엑셀 컬럼 매핑 (재고이동)" onClose={() => setStep('main')} width="850px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileSpreadsheet size={20} color="#3b82f6" />
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{fileName}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>감지된 컬럼 {rawHeaders.length}개 · 데이터 {rawRows.length}행</div>
            </div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.78rem', color: '#475569', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <strong>감지된 헤더:</strong> {rawHeaders.map((h, i) => <span key={i} style={{ marginRight: '12px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{i}: {h}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {MAPPING_LABELS.map(({ key, label, required }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: required ? '#1e293b' : '#64748b' }}>
                  {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <select 
                  value={mapping[key]} 
                  onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))} 
                  style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${mapping[key] !== '' ? '#3b82f6' : '#e2e8f0'}`, fontSize: '0.85rem', background: mapping[key] !== '' ? '#eff6ff' : '#fff' }}
                >
                  <option value="">(사용안함)</option>
                  {rawHeaders.map((h, i) => (
                    <option key={i} value={String(i)}>
                      [{i}] {h} {previewRow[i] !== undefined ? `→ ${String(previewRow[i]).slice(0, 10)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('main')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 돌아가기</button>
            <button 
              onClick={handleBuildPreview} 
              disabled={!mapping.item || !mapping.qty} 
              style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: (mapping.item && mapping.qty) ? '#3b82f6' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              분석 실행 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </WindowModal>
    );
  }

  // 분석 미리보기 화면
  if (step === 'preview') {
    return (
      <WindowModal title="재고이동 내역 분석 결과" onClose={() => setStep('mapping')} width="900px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>업로드 준비 완료</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>{previewTransfers.length}건</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '400px', overflowY: 'auto', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  {['이동일자', '출고창고', '입고창고', '품목명', '규격', '수량', '처리자', '비고'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === '수량' ? 'right' : 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewTransfers.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px' }}>{t.date}</td>
                    <td style={{ padding: '7px 10px' }}>{t.from}</td>
                    <td style={{ padding: '7px 10px' }}>{t.to}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{t.item}</td>
                    <td style={{ padding: '7px 10px' }}>{t.spec || '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{t.qty.toLocaleString()}</td>
                    <td style={{ padding: '7px 10px' }}>{t.operator || '-'}</td>
                    <td style={{ padding: '7px 10px' }}>{t.memo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('mapping')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 다시 매핑</button>
            <button onClick={handleConfirmImport} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> 재고이동 {previewTransfers.length}건 일괄 등록
            </button>
          </div>
        </div>
      </WindowModal>
    );
  }

  // 메인 카드 화면 (품목관리와 동일한 형태)
  return (
    <WindowModal title="엑셀파일로 재고이동 내역 저장/불러오기/삭제" onClose={onClose} width="1120px">
      <div className="excel-header">
        <div className="excel-title-group">
          <ArrowLeftRight size={24} color="#3b82f6" />
          <h2 className="excel-title">재고이동 내역 저장/불러오기/삭제</h2>
        </div>
        <p className="excel-desc">
          재고이동 내역을 엑셀(.xlsx) 파일로 내보내거나, 외부 엑셀 파일을 업로드하여 일괄 등록 및 필요시 전체 데이터를 일괄 삭제합니다.
        </p>
      </div>

      <div className="excel-actions-grid">
        {/* 카드 1: 엑셀 파일로 저장 */}
        <div className="excel-card">
          <div className="card-top">
            <Download size={24} color="#3b82f6" />
            <span>엑셀 파일로 저장</span>
          </div>
          <p>
            등록된 전체 재고이동 내역(일자, 출고창고, 입고창고, 품목명, 규격, 수량, 처리자, 비고 등)을 엑셀 파일(.xlsx)로 내보내어 관리 및 백업용으로 활용합니다.
          </p>
          <button className="btn-excel-primary blue" onClick={handleDownload}>
            재고이동 내역 다운로드 (.xlsx)
          </button>
        </div>

        {/* 카드 2: 일괄 편집 (그리드) */}
        <div className="excel-card">
          <div className="card-top">
            <Edit3 size={24} color="#10b981" />
            <span>일괄 편집 (그리드)</span>
          </div>
          <p>
            재고이동 일자, 출고창고, 입고창고, 품목명, 규격, 수량, 처리자, 비고 등을 스마트 에디터 그리드에서 마우스 드래그와 더블클릭으로 편리하게 일괄 수정합니다.
          </p>
          <button className="btn-excel-primary green" onClick={() => setIsBulkOpen(true)}>
            일괄 편집기 열기
          </button>
        </div>

        {/* 카드 3: 엑셀 파일 분석 업로드 */}
        <div className="excel-card" style={{ borderColor: '#f59e0b', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
          <div className="card-top">
            <Upload size={24} color="#d97706" />
            <span style={{ color: '#92400e' }}>엑셀 파일 분석 업로드</span>
          </div>
          <p style={{ color: '#78350f', marginBottom: '12px' }}>
            대량의 재고이동 내역 엑셀 파일을 업로드하여, 일자, 출고/입고창고, 품목, 수량 속성을 똑똑하게 매핑하고 일괄 자동 등록합니다.
          </p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn-excel-primary orange" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? '⏳ 파일 읽는 중...' : '📂 파일 불러오기'}
          </button>
        </div>

        {/* 카드 4: 재고이동 데이터 삭제 */}
        <div className="excel-card" style={{ borderColor: '#ef4444', background: 'linear-gradient(135deg, #fff5f5, #fee2e2)' }}>
          <div className="card-top">
            <Trash2 size={24} color="#dc2626" />
            <span style={{ color: '#991b1b' }}>재고이동 데이터 삭제</span>
          </div>
          <p style={{ color: '#7f1d1d', marginBottom: '8px' }}>
            등록된 재고이동 내역({validTransfers?.length || 0}건)을 기간별 또는 전체로 안전하게 영구 일괄 삭제합니다. (관리자 전용)
          </p>

          {/* 기간 선택 영역 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            padding: '8px 10px',
            marginBottom: '10px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: deleteMode === 'period' ? '6px' : '0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: deleteMode === 'all' ? 700 : 500, color: '#991b1b' }}>
                <input 
                  type="radio" 
                  name="transferDeleteMode" 
                  checked={deleteMode === 'all'} 
                  onChange={() => setDeleteMode('all')} 
                />
                전체 기간
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: deleteMode === 'period' ? 700 : 500, color: '#991b1b' }}>
                <input 
                  type="radio" 
                  name="transferDeleteMode" 
                  checked={deleteMode === 'period'} 
                  onChange={() => setDeleteMode('period')} 
                />
                기간 지정 삭제
              </label>
            </div>

            {deleteMode === 'period' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <input 
                  type="date" 
                  value={deleteStartDate} 
                  onChange={(e) => setDeleteStartDate(e.target.value)} 
                  style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '120px' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>~</span>
                <input 
                  type="date" 
                  value={deleteEndDate} 
                  onChange={(e) => setDeleteEndDate(e.target.value)} 
                  style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '120px' }}
                />
              </div>
            )}
            
            <div style={{ fontSize: '0.73rem', color: '#047857', marginTop: '6px', fontWeight: 600 }}>
              ※ 재고이동 내역 삭제 시 실시간 재고(현재고)는 변동되지 않습니다.
            </div>
          </div>

          <button className="btn-excel-primary red" onClick={handleDeleteTransfers} disabled={isLoading}>
            {isLoading ? '⏳ 삭제 진행 중...' : `🗑️ ${deleteMode === 'all' ? '전체' : '선택 기간'} 재고이동 데이터 삭제`}
          </button>
        </div>
      </div>

      <div className="excel-guide-footer">
        <div className="guide-title">
          <ShieldCheck size={18} color="#10b981" />
          재고이동 엑셀 데이터 안전 관리 가이드
        </div>
        <ul className="guide-list">
          <li>재고이동 엑셀 업로드 시 출고창고, 입고창고 및 품목명이 시스템에 등록된 창고명 및 품목명과 일치해야 정상 처리됩니다.</li>
          <li>기존 등록된 재고이동 내역의 큰 변화나 중요 변경 사항이 있을 때는 업로드 전 '재고이동 내역 다운로드'를 통해 백업 파일을 먼저 안전하게 저장하세요.</li>
          <li>'재고이동 데이터 삭제'는 되돌릴 수 없으므로 반드시 작업 전 백업 파일을 다운로드해 두시기 바랍니다.</li>
          <li>재고이동 내역 삭제 시 실시간 재고(현재고)는 변동되지 않으며, 과거 이동 기록 장부만 정리됩니다.</li>
        </ul>
      </div>
    </WindowModal>
  );
};

export default InventoryTransferExcelManager;
