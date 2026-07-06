import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Download, Upload, Edit3, CheckCircle, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import WindowModal from './WindowModal';
import BulkEditor from './BulkEditor';
import * as XLSX from 'xlsx';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import './ExcelManager.css';

const PurchaseLedgerExcelManager = ({ onClose, purchaseInvoices = [], setPurchaseInvoices }) => {
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [step, setStep] = useState('main'); // main | mapping | preview
  const [isLoading, setIsLoading] = useState(false);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState({
    date: '', partner: '', product: '', spec: '',
    qty: '', price: '', supply: '', tax: '', total: '', payment: '', manager: ''
  });
  const [previewData, setPreviewData] = useState({ invoices: [], payments: [] });
  const fileInputRef = useRef(null);

  const MAPPING_LABELS = [
    { key: 'date', label: '날짜 / 일자', required: true },
    { key: 'partner', label: '거래처명 (매입처)', required: true },
    { key: 'product', label: '상품명 / 품목명', required: false },
    { key: 'spec', label: '규격', required: false },
    { key: 'qty', label: '수량', required: false },
    { key: 'price', label: '단가', required: false },
    { key: 'supply', label: '공급가액', required: false },
    { key: 'tax', label: '부가세', required: false },
    { key: 'total', label: '합계금액', required: false },
    { key: 'payment', label: '출금액 (지불액)', required: false },
    { key: 'manager', label: '담당자', required: false },
  ];

  const columns = [
    { field: 'date', header: '날짜', width: '120px' },
    { field: 'partner', header: '거래처', width: '150px' },
    { field: 'itemsText', header: '품목내역', width: '200px' },
    { field: 'totalQty', header: '총수량', width: '100px', type: 'number' },
    { field: 'supplyValue', header: '공급가액', width: '120px', type: 'number' },
    { field: 'tax', header: '부가세', width: '100px', type: 'number' },
    { field: 'totalAmount', header: '합계금액', width: '120px', type: 'number' },
    { field: 'paidAmount', header: '출금액', width: '120px', type: 'number' },
    { field: 'manager', header: '담당자', width: '100px' },
    { field: 'warehouse', header: '창고', width: '100px' }
  ];

  const parseExcelDate = (val) => {
    if (!val && val !== 0) return '';
    if (typeof val === 'number') {
      try {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(d)) return d.toISOString().split('T')[0];
      } catch { }
    }
    const s = String(val).trim();
    const m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    return s;
  };

  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    return parseFloat(String(val).replace(/[^0-9.\-]/g, '')) || 0;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, allRows.length); i++) {
          const nonEmpty = allRows[i].filter(c => String(c).trim() !== '').length;
          if (nonEmpty >= 3) { headerIdx = i; break; }
        }

        const headers = allRows[headerIdx].map((c, i) => String(c).trim() || `열${i + 1}`);
        const dataRows = allRows.slice(headerIdx + 1).filter(r => r.some(c => c !== '' && c !== null));

        setRawHeaders(headers);
        setRawRows(dataRows);

        const guess = (keywords) => {
          const idx = headers.findIndex(h => keywords.some(kw => h.includes(kw)));
          return idx >= 0 ? String(idx) : '';
        };
        setMapping({
          date: guess(['일자', '날짜', '일 자', 'date']),
          partner: guess(['거래처', '상호', '매입처', 'partner']),
          product: guess(['상품명', '품목명', '품 목', '상 품', 'product']),
          spec: guess(['규격', 'spec']),
          qty: guess(['수량', 'qty']),
          price: guess(['단가', 'price']),
          supply: guess(['공급가액', '공급가']),
          tax: guess(['부가세', '세액', 'tax']),
          total: guess(['합계', '금액', 'total', '합 계']),
          payment: guess(['출금', '지불', '결제', '출금액']),
          manager: guess(['담당자', '담 당', 'manager']),
        });
        setStep('mapping');
      } catch (err) {
        alert('파일 읽기 오류: ' + err.message);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBuildPreview = () => {
    const colOf = (key) => mapping[key] !== '' ? parseInt(mapping[key]) : -1;
    const invoices = [];
    const payments = [];
    let currentPartner = '';
    let currentDate = '';
    let currentManager = '';

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const getVal = (col) => col >= 0 && col < row.length ? row[col] : '';

      const rawDate = getVal(colOf('date'));
      const rawPartner = String(getVal(colOf('partner'))).trim();
      const rawProduct = String(getVal(colOf('product'))).trim();
      const rawSpec = String(getVal(colOf('spec'))).trim();
      const rawQty = parseNum(getVal(colOf('qty')));
      const rawPrice = parseNum(getVal(colOf('price')));
      const rawSupply = parseNum(getVal(colOf('supply')));
      const rawTax = parseNum(getVal(colOf('tax')));
      const rawTotal = parseNum(getVal(colOf('total')));
      const rawPayment = parseNum(getVal(colOf('payment')));
      const rawManager = String(getVal(colOf('manager'))).trim();

      if (rawDate) currentDate = parseExcelDate(rawDate);
      if (rawPartner) currentPartner = rawPartner;
      if (rawManager) currentManager = rawManager;

      if (!currentPartner || !currentDate) continue;

      if (!rawProduct && rawPayment > 0) {
        payments.push({ date: currentDate, partner: currentPartner, amount: rawPayment, manager: currentManager });
        continue;
      }

      if (!rawProduct && rawTotal === 0 && rawPayment === 0) continue;

      const lineTotal = rawTotal || (rawQty * rawPrice) || rawSupply + rawTax;
      const item = { id: Date.now() + i, name: rawProduct || '(품목없음)', spec: rawSpec, qty: rawQty, price: rawPrice, supplyValue: rawSupply, tax: rawTax, total: lineTotal };

      const last = invoices[invoices.length - 1];
      if (last && last.date === currentDate && last.partner === currentPartner) {
        last.items.push(item);
        last.totalAmount += lineTotal;
      } else {
        invoices.push({ id: Date.now() + i, date: currentDate, partner: currentPartner, manager: currentManager, warehouse: '', items: [item], totalAmount: lineTotal, paidAmount: 0 });
      }
    }

    payments.forEach(pay => {
      const targets = invoices.filter(inv => inv.partner === pay.partner);
      if (targets.length > 0) targets[targets.length - 1].paidAmount += pay.amount;
    });

    setPreviewData({ invoices, payments });
    setStep('preview');
  };

  const handleConfirmImport = () => {
    const { invoices, payments } = previewData;
    const existingKeys = new Set(purchaseInvoices.map(inv => `${inv.date}_${inv.partner}_${inv.totalAmount}`));
    const newOnes = invoices.filter(inv => !existingKeys.has(`${inv.date}_${inv.partner}_${inv.totalAmount}`));
    setPurchaseInvoices([...purchaseInvoices, ...newOnes]);
    alert(`✅ 매입전표 ${newOnes.length}건, 출금 ${payments.length}건 등록 완료!`);
    setStep('main');
    setPreviewData({ invoices: [], payments: [] });
  };

  const handleDownload = () => {
    const dataToExport = purchaseInvoices.map(inv => {
      const totalQty = inv.items?.reduce((s, it) => s + Number(it.qty || 0), 0) || 0;
      const total = inv.totalAmount || 0;
      
      let supply = 0;
      let tax = 0;
      if (inv.items && inv.items.length > 0) {
        supply = inv.items.reduce((sum, item) => sum + (item.supplyValue || 0), 0);
        tax = inv.items.reduce((sum, item) => sum + (item.tax || 0), 0);
      } else {
        supply = Math.floor(total / 1.1);
        tax = total - supply;
      }
      
      const summary = inv.items?.[0]?.name + (inv.items?.length > 1 ? ` 외 ${inv.items.length - 1}건` : '') || '';
      
      return {
        '날짜': inv.date || '',
        '거래처': inv.partner || '',
        '품목내역': summary,
        '총수량': totalQty,
        '공급가액': supply,
        '부가세': tax,
        '합계금액': total,
        '출금액': inv.paidAmount || 0,
        '담당자': inv.manager || '',
        '창고': inv.warehouse || ''
      };
    });
    exportToExcel(dataToExport, '매입원장');
  };

  if (isBulkOpen) {
    const ed = purchaseInvoices.map(inv => {
      const total = inv.totalAmount || 0;
      let supply = 0;
      let tax = 0;
      if (inv.items && inv.items.length > 0) {
        supply = inv.items.reduce((sum, item) => sum + (item.supplyValue || 0), 0);
        tax = inv.items.reduce((sum, item) => sum + (item.tax || 0), 0);
      } else {
        supply = Math.floor(total / 1.1);
        tax = total - supply;
      }
      return {
        ...inv,
        totalQty: inv.items?.reduce((s, it) => s + Number(it.qty || 0), 0) || 0,
        supplyValue: supply,
        tax: tax,
        itemsText: inv.itemsText || (inv.items?.[0]?.name + (inv.items?.length > 1 ? ` 외 ${inv.items.length - 1}건` : ''))
      };
    });
    return (
      <BulkEditor 
        type="purchase"
        title="매입원장 일괄 편집" 
        initialData={ed} 
        columns={columns} 
        onSave={(newData) => { 
          // Merge grid changes back to original invoices to avoid losing the 'items' array
          const mergedInvoices = newData.map(gridRow => {
            const original = purchaseInvoices.find(inv => inv.id === gridRow.id);
            if (original) {
              return {
                ...original,
                date: gridRow.date,
                partner: gridRow.partner,
                manager: gridRow.manager,
                warehouse: gridRow.warehouse,
                paidAmount: Number(gridRow.paidAmount) || 0,
                totalAmount: Number(gridRow.totalAmount) || 0,
              };
            }
            return gridRow;
          });
          setPurchaseInvoices(mergedInvoices); 
        }} 
        onClose={() => setIsBulkOpen(false)} 
      />
    );
  }

  if (step === 'mapping') {
    const previewRow = rawRows[0] || [];
    return (
      <WindowModal title="엑셀 컬럼 매핑 (매입)" onClose={() => setStep('main')} width="850px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileSpreadsheet size={20} color="#ef4444" />
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
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: required ? '#1e293b' : '#64748b' }}>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <select value={mapping[key]} onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))} style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${mapping[key] !== '' ? '#ef4444' : '#e2e8f0'}`, fontSize: '0.85rem', background: mapping[key] !== '' ? '#fef2f2' : '#fff' }}>
                  <option value="">(사용안함)</option>
                  {rawHeaders.map((h, i) => <option key={i} value={String(i)}>[{i}] {h} {previewRow[i] !== undefined ? `→ 예: ${String(previewRow[i]).slice(0, 15)}` : ''}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('main')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 돌아가기</button>
            <button onClick={handleBuildPreview} disabled={!mapping.date || !mapping.partner} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: mapping.date && mapping.partner ? '#ef4444' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: mapping.date && mapping.partner ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}>분석 실행 <ChevronRight size={16} /></button>
          </div>
        </div>
      </WindowModal>
    );
  }

  if (step === 'preview') {
    const { invoices, payments } = previewData;
    return (
      <WindowModal title="분석 결과 확인 및 등록 (매입)" onClose={() => setStep('mapping')} width="1100px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
            <div style={{ flex: 1, background: '#fef2f2', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>감지된 매입전표</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>{invoices.length}건</div>
            </div>
            <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>감지된 출금내역</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>{payments.length}건</div>
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '320px', overflowY: 'auto', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  {['날짜', '거래처', '품목수', '합계', '출금액', '담당자'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '7px 10px' }}>{inv.date}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{inv.partner}</td>
                    <td style={{ padding: '7px 10px', color: '#64748b' }}>{inv.items.length}건</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{inv.totalAmount.toLocaleString()}원</td>
                    <td style={{ padding: '7px 10px', color: '#10b981' }}>{inv.paidAmount > 0 ? `${inv.paidAmount.toLocaleString()}원` : '-'}</td>
                    <td style={{ padding: '7px 10px', color: '#64748b' }}>{inv.manager || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('mapping')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 다시 매핑</button>
            <button onClick={handleConfirmImport} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> {invoices.length}건 매입전표 등록 완료</button>
          </div>
        </div>
      </WindowModal>
    );
  }

  return (
    <WindowModal title="매입처원장 저장/불러오기" onClose={onClose} width="1000px">
      <div className="excel-header">
        <div className="excel-title-group">
          <FileSpreadsheet size={24} color="#ef4444" />
          <h2 className="excel-title">매입처원장 저장/불러오기</h2>
        </div>
        <p className="excel-desc">매입 내역을 엑셀(.xlsx) 파일로 내보내거나, 외부 엑셀 파일을 업로드해 자동 분석 후 매입전표를 일괄 등록합니다.</p>
      </div>

      <div className="excel-actions-grid">
        <div className="excel-card">
          <div className="card-top"><Download size={24} color="#3b82f6" /><span>엑셀 파일로 저장</span></div>
          <p>등록된 전체 매입 거래 내역(매입 일자, 매입처, 세액, 보관 창고 등)을 엑셀(.xlsx) 파일로 내보내 정산 및 백업용으로 활용합니다.</p>
          <button className="btn-excel-primary blue" onClick={handleDownload}>매입원장 다운로드 (.xlsx)</button>
        </div>
        <div className="excel-card">
          <div className="card-top"><Edit3 size={24} color="#10b981" /><span>일괄 편집 (그리드)</span></div>
          <p>다중 매입 전표 데이터를 그리드 에디터에서 스프레드시트 방식으로 동시에 편집하고 DB에 실시간으로 반영합니다.</p>
          <button className="btn-excel-primary green" onClick={() => setIsBulkOpen(true)}>일괄 편집기 열기</button>
        </div>
        <div className="excel-card" style={{ borderColor: '#f59e0b', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
          <div className="card-top"><Upload size={24} color="#d97706" /><span style={{ color: '#92400e' }}>엑셀 파일 분석 업로드</span></div>
          <p style={{ color: '#78350f', marginBottom: '12px' }}>계산서나 기존 매입 엑셀 파일을 업로드 및 매핑하여 매입 전표를 자동 생성하고 실시간 창고 재고에 입고 반영합니다.</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn-excel-primary orange" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? '⏳ 파일 읽는 중...' : '📂 파일 불러오기'}
          </button>
        </div>
      </div>

      <div className="excel-guide-footer">
        <div className="guide-title">
          <ShieldCheck size={18} color="#10b981" />
          매입원장 엑셀 데이터 안전 관리 가이드
        </div>
        <ul className="guide-list">
          <li>매입원장 엑셀 업로드 시 기존 매입 기록과 충돌하거나 중복 등록되지 않도록 업로드 전 데이터를 반드시 대조해 주세요.</li>
          <li>중요한 대규모 입고/매입 작업 전에는 '매입원장 다운로드' 기능을 활용하여 기존 원본을 다운로드(백업) 보관하세요.</li>
          <li>수량이 공란이거나 단가가 누락된 행은 시스템 데이터 무결성을 위해 매핑 과정에서 생략되거나 비정상 처리될 수 있습니다.</li>
        </ul>
      </div>
    </WindowModal>
  );
};

export default PurchaseLedgerExcelManager;
