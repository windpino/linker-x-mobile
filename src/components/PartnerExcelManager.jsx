import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Download, Upload, Edit3, CheckCircle, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import WindowModal from './WindowModal';
import BulkEditor from './BulkEditor';
import * as XLSX from 'xlsx';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import './ExcelManager.css';

const PartnerExcelManager = ({ onClose, partners = [], setPartners, staffList = [], setStaffList, currentUser }) => {
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [step, setStep] = useState('main'); // main | mapping | preview
  const [isLoading, setIsLoading] = useState(false);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState({
    type: '', name: '', barcode: '', abbreviation: '', ceo: '', businessNo: '',
    address: '', phone: '', mobile: '', fax: '', email: '', manager: '',
    bankAccount: '', creditLimit: '', receivables: '', loginId: '', password: '', memo: ''
  });
  const [previewPartners, setPreviewPartners] = useState([]);
  const fileInputRef = useRef(null);

  const MAPPING_LABELS = [
    { key: 'name', label: '상호명/거래처명', required: true },
    { key: 'type', label: '구분 (매출처/매입처)', required: false },
    { key: 'abbreviation', label: '약칭', required: false },
    { key: 'ceo', label: '대표자', required: false },
    { key: 'businessNo', label: '사업자번호', required: false },
    { key: 'address', label: '주소', required: false },
    { key: 'phone', label: '전화번호', required: false },
    { key: 'mobile', label: '휴대전화', required: false },
    { key: 'email', label: '이메일', required: false },
    { key: 'manager', label: '담당자', required: false },
    { key: 'receivables', label: '누적 미수금', required: false },
    { key: 'memo', label: '메모', required: false },
  ];

  const columns = [
    { field: 'type', header: '구분', width: '80px' },
    { field: 'name', header: '상호명', width: '150px' },
    { field: 'abbreviation', header: '약칭', width: '100px' },
    { field: 'barcode', header: '바코드', width: '120px' },
    { field: 'ceo', header: '대표자', width: '100px' },
    { field: 'businessNo', header: '사업자번호', width: '120px' },
    { field: 'address', header: '주소', width: '250px' },
    { field: 'phone', header: '일반전화', width: '120px' },
    { field: 'mobile', header: '휴대전화', width: '120px' },
    { field: 'fax', header: '팩스', width: '120px' },
    { field: 'email', header: '이메일', width: '150px' },
    { field: 'manager', header: '담당자', width: '100px' },
    { field: 'warehouse', header: '담당창고', width: '100px' },
    { field: 'bankAccount', header: '은행/계좌', width: '150px' },
    { field: 'creditLimit', header: '여신한도', width: '100px', type: 'number' },
    { field: 'receivables', header: '누적 미수금', width: '100px', type: 'number' },
    { field: 'receivableBase', header: '기초미수', width: '100px', type: 'number' },
    { field: 'grade', header: '등급', width: '80px' },
    { field: 'loginId', header: '아이디', width: '100px' },
    { field: 'password', header: '비밀번호', width: '100px' },
    { field: 'hideOrderInfo', header: '주문정보숨김', width: '100px', type: 'boolean' },
    { field: 'memo', header: '메모', width: '200px' }
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
          name: guess(['상호', '거래처', '회사', 'name', '고객']),
          type: guess(['구분', '유형', 'type']),
          abbreviation: guess(['약칭', '명칭']),
          ceo: guess(['대표', 'ceo']),
          businessNo: guess(['사업자', '번호', 'biz']),
          address: guess(['주소', 'address']),
          phone: guess(['전화', 'phone']),
          mobile: guess(['휴대', '핸드폰', 'mobile']),
          email: guess(['이메일', 'email']),
          manager: guess(['담당', 'manager']),
          receivables: guess(['미수', '잔액', 'balance']),
          memo: guess(['메모', '비고', 'memo']),
          barcode: guess(['바코드', 'barcode']),
          bankAccount: guess(['계좌', '통장', 'bank']),
          creditLimit: guess(['한도', 'limit']),
          loginId: guess(['아이디', 'id', 'login']),
          password: guess(['비번', '패스워드', 'pw']),
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
        type: getVal(colOf('type')) || '매출처',
        abbreviation: getVal(colOf('abbreviation')),
        ceo: getVal(colOf('ceo')),
        businessNo: getVal(colOf('businessNo')),
        address: getVal(colOf('address')),
        phone: getVal(colOf('phone')),
        mobile: getVal(colOf('mobile')),
        email: getVal(colOf('email')),
        manager: getVal(colOf('manager')),
        receivables: parseNum(getVal(colOf('receivables'))),
        memo: getVal(colOf('memo')),
        barcode: getVal(colOf('barcode')),
        bankAccount: getVal(colOf('bankAccount')),
        creditLimit: parseNum(getVal(colOf('creditLimit'))),
        loginId: getVal(colOf('loginId')),
        password: getVal(colOf('password')),
      });
    }

    setPreviewPartners(items);
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    const existingNames = new Set(partners.map(p => p.name));
    const newOnes = previewPartners.filter(p => !existingNames.has(p.name));
    
    setIsLoading(true);
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      newOnes.forEach(partnerData => {
        const docId = partnerData.loginId ? `${companyId}_${partnerData.loginId}` : 
                      partnerData.email ? `${companyId}_${partnerData.email}` : 
                      String(partnerData.id || Date.now() + Math.random());
        const finalData = {
          ...partnerData,
          companyId,
          manager: partnerData.manager || '-',
          updatedAt: new Date().toISOString()
        };
        batch.set(doc(db, 'companies', companyId, 'partners', docId), finalData);
      });
      await batch.commit();

      setPartners([...partners, ...newOnes]);
      alert(`✅ 거래처 ${newOnes.length}곳이 파이어베이스에 성공적으로 등록되었습니다! (중복 ${previewPartners.length - newOnes.length}곳 제외)`);
      setStep('main');
    } catch (err) {
      console.error('Import partners error:', err);
      alert('거래처 가져오기 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const columnMap = {
      type: '구분',
      name: '상호명',
      abbreviation: '약칭',
      ceo: '대표자',
      businessNo: '사업자번호',
      address: '주소',
      phone: '일반전화',
      mobile: '휴대전화',
      email: '이메일',
      manager: '담당자',
      receivables: '누적 미수금',
      memo: '메모'
    };
    const formattedData = formatDataForExcel(partners, columnMap);
    exportToExcel(formattedData, '거래처목록');
  };

  if (isBulkOpen) {
    return (
      <BulkEditor 
        type="partner"
        title="거래처 일괄 편집" 
        initialData={partners} 
        columns={columns} 
        onSave={async (d) => { 
          setIsLoading(true);
          try {
            const companyId = currentUser?.companyId || 'default';
            const batch = writeBatch(db);
            d.forEach(partnerData => {
              const docId = partnerData.loginId ? `${companyId}_${partnerData.loginId}` : 
                            partnerData.email ? `${companyId}_${partnerData.email}` : 
                            String(partnerData.id || Date.now() + Math.random());
              const finalData = {
                ...partnerData,
                companyId,
                manager: partnerData.manager || '-',
                updatedAt: new Date().toISOString()
              };
              batch.set(doc(db, 'companies', companyId, 'partners', docId), finalData);
            });
            await batch.commit();

            // Sync with Partners
            setPartners(d); 
            
            // Sync new managers with StaffList
            if (setStaffList && staffList) {
              const currentStaffNames = new Set(staffList.map(s => s.name));
              const newManagers = [...new Set(d.map(p => p.manager))].filter(name => name && name !== '-' && !currentStaffNames.has(name));
              
              if (newManagers.length > 0) {
                const newStaffEntries = newManagers.map(name => ({
                  id: Date.now() + Math.random(),
                  name,
                  jobTitle: '자동등록담당자',
                  phone: '',
                  email: '',
                  memo: '거래처 일괄 편집을 통해 자동 등록됨'
                }));
                
                // Write new staff to Firestore too!
                const staffBatch = writeBatch(db);
                newStaffEntries.forEach(staff => {
                  const staffCompositeId = `${companyId}_${staff.name}`;
                  staffBatch.set(doc(db, 'companies', companyId, 'staffList', staffCompositeId), {
                    ...staff,
                    companyId
                  });
                });
                await staffBatch.commit();
                
                setStaffList(prev => [...prev, ...newStaffEntries]);
              }
            }
            alert('변경하신 사항을 저장하였습니다');
            setIsBulkOpen(false);
          } catch (err) {
            console.error('Bulk save partners error:', err);
            alert('일괄 편집 저장 중 오류가 발생했습니다: ' + err.message);
          } finally {
            setIsLoading(false);
          }
        }} 
        onClose={() => setIsBulkOpen(false)} 
      />
    );
  }

  if (step === 'mapping') {
    const previewRow = rawRows[0] || [];
    return (
      <WindowModal title="엑셀 컬럼 매핑 (거래처)" onClose={() => setStep('main')} width="850px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileSpreadsheet size={20} color="#10b981" />
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
                <select value={mapping[key]} onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))} style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${mapping[key] !== '' ? '#10b981' : '#e2e8f0'}`, fontSize: '0.85rem', background: mapping[key] !== '' ? '#f0fdf4' : '#fff' }}>
                  <option value="">(사용안함)</option>
                  {rawHeaders.map((h, i) => <option key={i} value={String(i)}>[{i}] {h} {previewRow[i] !== undefined ? `→ ${String(previewRow[i]).slice(0, 10)}` : ''}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('main')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 돌아가기</button>
            <button onClick={handleBuildPreview} disabled={!mapping.name} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: mapping.name ? '#10b981' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>분석 실행 <ChevronRight size={16} /></button>
          </div>
        </div>
      </WindowModal>
    );
  }

  if (step === 'preview') {
    return (
      <WindowModal title="거래처 분석 결과" onClose={() => setStep('mapping')} width="900px">
        <div style={{ padding: '16px 20px' }}>
          <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>업로드 준비 완료</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>{previewPartners.length}곳</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '400px', overflowY: 'auto', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  {['구분', '상호명', '대표자', '사업자번호', '미수금', '담당자'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewPartners.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px' }}>{p.type}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '7px 10px' }}>{p.ceo}</td>
                    <td style={{ padding: '7px 10px' }}>{p.businessNo}</td>
                    <td style={{ padding: '7px 10px' }}>{p.receivables.toLocaleString()}</td>
                    <td style={{ padding: '7px 10px' }}>{p.manager}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button onClick={() => setStep('mapping')} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>← 다시 매핑</button>
            <button onClick={handleConfirmImport} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> 거래처 {previewPartners.length}곳 일괄 등록</button>
          </div>
        </div>
      </WindowModal>
    );
  }

  return (
    <WindowModal title="엑셀파일로 거래처저장/불러오기" onClose={onClose} width="1000px">
      <div className="excel-header">
        <div className="excel-title-group">
          <FileSpreadsheet size={24} color="#10b981" />
          <h2 className="excel-title">거래처 저장/불러오기</h2>
        </div>
        <p className="excel-desc">거래처 목록을 엑셀(.xlsx) 파일로 내보내거나, 외부 엑셀 파일을 업로드하여 일괄 등록합니다.</p>
      </div>

      <div className="excel-actions-grid">
        <div className="excel-card">
          <div className="card-top"><Download size={24} color="#3b82f6" /><span>엑셀 파일로 저장</span></div>
          <p>등록된 전체 거래처 목록(구분, 상호명, 대표자, 연락처, 로그인 계정 등)을 엑셀 파일(.xlsx)로 일괄 다운로드합니다.</p>
          <button className="btn-excel-primary blue" onClick={handleDownload}>거래처 목록 다운로드 (.xlsx)</button>
        </div>
        <div className="excel-card">
          <div className="card-top"><Edit3 size={24} color="#10b981" /><span>일괄 편집 (그리드)</span></div>
          <p>웹 브라우저 상에서 스프레드시트 편집기를 사용하여 거래처 기본 정보와 거래 조건을 신속하게 일괄 수정/등록합니다.</p>
          <button className="btn-excel-primary green" onClick={() => setIsBulkOpen(true)}>일괄 편집기 열기</button>
        </div>
        <div className="excel-card" style={{ borderColor: '#f59e0b', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
          <div className="card-top"><Upload size={24} color="#d97706" /><span style={{ color: '#92400e' }}>엑셀 파일 분석 업로드</span></div>
          <p style={{ color: '#78350f', marginBottom: '12px' }}>보유 중인 거래처 엑셀 파일의 열(상호, 대표자, 연락처 등)을 매핑하여 대량의 거래처를 중복 없이 즉시 등록합니다.</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn-excel-primary orange" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? '⏳ 파일 읽는 중...' : '📂 파일 불러오기'}
          </button>
        </div>
      </div>

      <div className="excel-guide-footer">
        <div className="guide-title">
          <ShieldCheck size={18} color="#10b981" />
          거래처 엑셀 데이터 안전 관리 가이드
        </div>
        <ul className="guide-list">
          <li>거래처 데이터 업로드 시 동일한 상호명이 기존 DB에 있으면 자동으로 데이터가 덮어씌워지거나 오류가 발생할 수 있습니다.</li>
          <li>중요한 데이터 작업을 하시기 전에 반드시 '엑셀 파일로 저장' 기능을 통해 기존 거래처 목록 원본을 백업해 주세요.</li>
          <li>임의로 수정된 엑셀 템플릿 헤더(열 이름)나 빈 칸이 많은 데이터는 맵핑 및 업로드 과정에서 정상 반영되지 않을 수 있습니다.</li>
        </ul>
      </div>
    </WindowModal>
  );
};

export default PartnerExcelManager;
