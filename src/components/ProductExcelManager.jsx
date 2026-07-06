import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Download, Upload, Edit3, CheckCircle, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import WindowModal from './WindowModal';
import BulkEditor from './BulkEditor';
import * as XLSX from 'xlsx';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import './ExcelManager.css';

const ProductExcelManager = ({ onClose, products = [], setProducts, categories = [], setCategories, currentUser }) => {
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [step, setStep] = useState('main'); // main | mapping | preview
  const [isLoading, setIsLoading] = useState(false);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState({
    categoryLarge: '', categoryMedium: '', categorySmall: '',
    name: '', abbreviation: '', singleBarcode: '', boxBarcode: '',
    spec: '', innerQty: '', taxType: '', purchasePrice: '', salesPrice: '',
    optimalStock: '', memo: ''
  });
  const [previewProducts, setPreviewProducts] = useState([]);
  const fileInputRef = useRef(null);

  const MAPPING_LABELS = [
    { key: 'name', label: '상품명', required: true },
    { key: 'categoryLarge', label: '대분류', required: false },
    { key: 'categoryMedium', label: '중분류', required: false },
    { key: 'categorySmall', label: '소분류', required: false },
    { key: 'abbreviation', label: '약칭', required: false },
    { key: 'spec', label: '규격', required: false },
    { key: 'purchasePrice', label: '매입가', required: false },
    { key: 'salesPrice', label: '매출가', required: false },
    { key: 'singleBarcode', label: '낱개바코드', required: false },
    { key: 'innerQty', label: '내품수량', required: false },
    { key: 'memo', label: '상품설명', required: false },
  ];

  const columns = [
    { field: 'categoryLarge', header: '대분류', width: '100px' },
    { field: 'categoryMedium', header: '중분류', width: '100px' },
    { field: 'categorySmall', header: '소분류', width: '100px' },
    { field: 'singleBarcode', header: '낱개바코드', width: '130px' },
    { field: 'boxBarcode', header: '박스바코드', width: '130px' },
    { field: 'name', header: '품목명', width: '200px' },
    { field: 'abbreviation', header: '상품약칭', width: '100px' },
    { field: 'spec', header: '규격', width: '100px' },
    { field: 'innerQty', header: '내품수량', width: '80px', type: 'number' },
    { field: 'taxType', header: '과세구분', width: '80px' },
    { field: 'purchasePrice', header: '매입가', width: '100px', type: 'number' },
    { field: 'salesPrice', header: '매출가', width: '100px', type: 'number' },
    { field: 'optimalStock', header: '적정재고', width: '100px', type: 'number' },
    { field: 'memo', header: '상품설명', width: '200px' }
  ];

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
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, allRows.length); i++) {
          const nonEmpty = allRows[i].filter(c => String(c).trim() !== '').length;
          if (nonEmpty >= 3) { headerIdx = i; break; }
        }

        const headers = allRows[headerIdx].map((c, i) => String(c).trim() || `열${i + 1}`);
        const dataRows = allRows.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

        setRawHeaders(headers);
        setRawRows(dataRows);

        const guess = (keywords) => {
          const idx = headers.findIndex(h => keywords.some(kw => h.includes(kw)));
          return idx >= 0 ? String(idx) : '';
        };

        setMapping({
          name: guess(['상품명', '품명', '이름', 'name', 'item']),
          categoryLarge: guess(['대분류', '카테고리', '분류']),
          categoryMedium: guess(['중분류']),
          categorySmall: guess(['소분류']),
          abbreviation: guess(['약칭', '명칭']),
          spec: guess(['규격', 'spec', 'size']),
          singleBarcode: guess(['낱개', '바코드', 'barcode']),
          boxBarcode: guess(['박스바코드', 'box']),
          innerQty: guess(['내품', '입수', 'qty']),
          taxType: guess(['과세', '면세', 'tax']),
          purchasePrice: guess(['매입가', '구매가', 'purchase']),
          salesPrice: guess(['매출가', '판매가', 'sales']),
          optimalStock: guess(['적정재고', '재고']),
          memo: guess(['메모', '비고', 'memo']),
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
    const items = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const getVal = (col) => col >= 0 && col < row.length ? String(row[col]).trim() : '';

      const name = getVal(colOf('name'));
      if (!name) continue;

      items.push({
        id: Date.now() + i,
        name,
        categoryLarge: getVal(colOf('categoryLarge')),
        categoryMedium: getVal(colOf('categoryMedium')),
        categorySmall: getVal(colOf('categorySmall')),
        category: getVal(colOf('categorySmall')) || getVal(colOf('categoryMedium')) || getVal(colOf('categoryLarge')) || '기타',
        abbreviation: getVal(colOf('abbreviation')),
        spec: getVal(colOf('spec')),
        singleBarcode: getVal(colOf('singleBarcode')),
        boxBarcode: getVal(colOf('boxBarcode')),
        innerQty: parseNum(getVal(colOf('innerQty'))) || 1,
        taxType: getVal(colOf('taxType')) || '과세',
        purchasePrice: parseNum(getVal(colOf('purchasePrice'))),
        salesPrice: parseNum(getVal(colOf('salesPrice'))),
        optimalStock: parseNum(getVal(colOf('optimalStock'))),
        memo: getVal(colOf('memo')),
      });
    }

    setPreviewProducts(items);
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    const existingNames = new Set(products.map(p => p.name));
    const newOnes = previewProducts.filter(p => !existingNames.has(p.name));
    
    setIsLoading(true);
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      newOnes.forEach(productData => {
        const productId = String(productData.id || Date.now() + Math.random());
        const finalData = {
          ...productData,
          companyId,
          updatedAt: new Date().toISOString()
        };
        batch.set(doc(db, 'companies', companyId, 'products', productId), finalData);
      });
      await batch.commit();

      setProducts([...products, ...newOnes]);
      alert(`✅ 품목 ${newOnes.length}건이 파이어베이스에 성공적으로 등록되었습니다! (중복 ${previewProducts.length - newOnes.length}건 제외)`);
      setStep('main');
    } catch (err) {
      console.error('Import products error:', err);
      alert('품목 가져오기 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const columnMap = {
      categoryLarge: '대분류',
      categoryMedium: '중분류',
      categorySmall: '소분류',
      name: '상품명',
      abbreviation: '약칭',
      spec: '규격',
      purchasePrice: '매입가',
      salesPrice: '매출가',
      singleBarcode: '낱개바코드',
      boxBarcode: '박스바코드',
      innerQty: '내품수량',
      taxType: '과세구분',
      optimalStock: '적정재고',
      memo: '상품설명'
    };
    const formattedData = formatDataForExcel(products, columnMap);
    exportToExcel(formattedData, '품목목록');
  };

  if (isBulkOpen) {
    return (
      <BulkEditor 
        type="product"
        title="품목 일괄 편집" 
        initialData={products} 
        columns={columns} 
        onSave={async (d) => { 
          setIsLoading(true);
          try {
            const companyId = currentUser?.companyId || 'default';
            const batch = writeBatch(db);
            d.forEach(productData => {
              const productId = String(productData.id || Date.now() + Math.random());
              const finalData = {
                ...productData,
                companyId,
                updatedAt: new Date().toISOString()
              };
              batch.set(doc(db, 'companies', companyId, 'products', productId), finalData);
            });
            await batch.commit();

            // Sync with Products
            setProducts(d); 
            
            // Sync new categories with master list
            if (setCategories && categories) {
              const currentCatNames = new Set(categories.map(c => c.name));
              const newCats = [...new Set(d.map(p => p.category))].filter(name => name && !currentCatNames.has(name));
              
              if (newCats.length > 0) {
                const newCatEntries = newCats.map(name => ({
                  id: Date.now() + Math.random(),
                  name,
                  memo: '품목 일괄 편집을 통해 자동 등록됨'
                }));
                
                // Write new categories to Firestore too!
                const catBatch = writeBatch(db);
                newCatEntries.forEach(cat => {
                  const catId = String(cat.id);
                  catBatch.set(doc(db, 'companies', companyId, 'categories', catId), {
                    ...cat,
                    companyId
                  });
                });
                await catBatch.commit();
                
                setCategories(prev => [...prev, ...newCatEntries]);
              }
            }
            alert('✅ 품목 일괄 편집 사항이 파이어베이스에 성공적으로 저장되었습니다.');
            setIsBulkOpen(false);
          } catch (err) {
            console.error('Bulk save products error:', err);
            alert('일괄 편집 저장 중 오류가 발생했습니다: ' + err.message);
          } finally {
            setIsLoading(false);
          }
        }} 
        categories={categories}
        onClose={() => setIsBulkOpen(false)} 
      />
    );
  }

  if (step === 'mapping') {
    const previewRow = rawRows[0] || [];
    return (
      <WindowModal title="엑셀 컬럼 매핑 (품목)" onClose={() => setStep('main')} width="850px">
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
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: required ? '#1e293b' : '#64748b' }}>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <select value={mapping[key]} onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))} style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${mapping[key] !== '' ? '#3b82f6' : '#e2e8f0'}`, fontSize: '0.85rem', background: mapping[key] !== '' ? '#eff6ff' : '#fff' }}>
                  <option value="">(사용안함)</option>
                  {rawHeaders.map((h, i) => <option key={i} value={String(i)}>[{i}] {h} {previewRow[i] !== undefined ? `→ ${String(previewRow[i]).slice(0, 10)}` : ''}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('main')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 돌아가기</button>
            <button onClick={handleBuildPreview} disabled={!mapping.name} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: mapping.name ? '#3b82f6' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>분석 실행 <ChevronRight size={16} /></button>
          </div>
        </div>
      </WindowModal>
    );
  }

  if (step === 'preview') {
    return (
      <WindowModal title="품목 분석 결과" onClose={() => setStep('mapping')} width="900px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>업로드 준비 완료</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>{previewProducts.length}건</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '400px', overflowY: 'auto', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  {['대분류', '중분류', '소분류', '상품명', '규격', '매입가', '매출가'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewProducts.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px' }}>{p.categoryLarge}</td>
                    <td style={{ padding: '7px 10px' }}>{p.categoryMedium}</td>
                    <td style={{ padding: '7px 10px' }}>{p.categorySmall}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '7px 10px' }}>{p.spec}</td>
                    <td style={{ padding: '7px 10px' }}>{p.purchasePrice.toLocaleString()}</td>
                    <td style={{ padding: '7px 10px' }}>{p.salesPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('mapping')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 다시 매핑</button>
            <button onClick={handleConfirmImport} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> 품목 {previewProducts.length}건 일괄 등록</button>
          </div>
        </div>
      </WindowModal>
    );
  }

  return (
    <WindowModal title="엑셀파일로 품목저장/불러오기" onClose={onClose} width="1000px">
      <div className="excel-header">
        <div className="excel-title-group">
          <FileSpreadsheet size={24} color="#3b82f6" />
          <h2 className="excel-title">품목 저장/불러오기</h2>
        </div>
        <p className="excel-desc">품목 목록을 엑셀(.xlsx) 파일로 내보내거나, 외부 엑셀 파일을 업로드하여 일괄 등록합니다.</p>
      </div>

      <div className="excel-actions-grid">
        <div className="excel-card">
          <div className="card-top"><Download size={24} color="#3b82f6" /><span>엑셀 파일로 저장</span></div>
          <p>운영 중인 전체 품목 목록(카테고리, 바코드, 단가, 규격 등)을 엑셀 파일(.xlsx)로 내보내어 재고 파악용으로 활용합니다.</p>
          <button className="btn-excel-primary blue" onClick={handleDownload}>품목 목록 다운로드 (.xlsx)</button>
        </div>
        <div className="excel-card">
          <div className="card-top"><Edit3 size={24} color="#10b981" /><span>일괄 편집 (그리드)</span></div>
          <p>품목명, 단가, 안전재고 등 다양한 속성을 스마트 에디터 그리드에서 마우스 드래그와 더블클릭으로 편리하게 일괄 수정합니다.</p>
          <button className="btn-excel-primary green" onClick={() => setIsBulkOpen(true)}>일괄 편집기 열기</button>
        </div>
        <div className="excel-card" style={{ borderColor: '#f59e0b', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
          <div className="card-top"><Upload size={24} color="#d97706" /><span style={{ color: '#92400e' }}>엑셀 파일 분석 업로드</span></div>
          <p style={{ color: '#78350f', marginBottom: '12px' }}>대량의 상품 리스트 엑셀 파일을 업로드하여, 규격과 분류 속성을 똑똑하게 매핑하고 일괄 자동 등록합니다.</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn-excel-primary orange" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? '⏳ 파일 읽는 중...' : '📂 파일 불러오기'}
          </button>
        </div>
      </div>

      <div className="excel-guide-footer">
        <div className="guide-title">
          <ShieldCheck size={18} color="#10b981" />
          품목 엑셀 데이터 안전 관리 가이드
        </div>
        <ul className="guide-list">
          <li>품목 업로드 시 동일한 바코드나 품목명이 존재할 경우 단가 및 규격 등 기존 품목 데이터가 덮어씌워지거나 오류가 발생할 수 있습니다.</li>
          <li>품목 리스트의 큰 변화나 중요 변경 사항이 있을 때는 업로드 전 '품목 목록 다운로드'를 통해 백업 파일을 먼저 안전하게 저장하세요.</li>
          <li>카테고리명(대/중/소)이 일치하지 않을 경우 시스템 내에서 카테고리 매칭 오류나 공란 처리가 발생할 수 있으니 템플릿 규격을 유지해 주세요.</li>
        </ul>
      </div>
    </WindowModal>
  );
};

export default ProductExcelManager;
