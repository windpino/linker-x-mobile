import React, { useState, useRef } from 'react';
import { 
  Save, Upload, Trash2, ShieldCheck, Download, FileJson, 
  AlertTriangle, Calendar 
} from 'lucide-react';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';
import './DataManager.css';

const DataManager = ({ onClose, onSaveAll, onRestoreAll, onDeleteAll, currentUser }) => {
  const fileInputRef = useRef(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 기간별 부분삭제 관련 상태
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfYear = `${new Date().getFullYear()}-01-01`;
  const [deleteMode, setDeleteMode] = useState('all'); // 'all' | 'period'
  const [deleteStartDate, setDeleteStartDate] = useState(firstDayOfYear);
  const [deleteEndDate, setDeleteEndDate] = useState(todayStr);

  // 관리자 여부 확인
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'super_admin' || 
                  currentUser?.userId === 'admin' || 
                  currentUser?.userId === 'madmin' || 
                  currentUser?.userId === 'sadmin' ||
                  currentUser?.jobTitle === '대표' ||
                  currentUser?.jobTitle === '관리자';

  const handleDeleteCategory = async (catKey, catLabel) => {
    if (!isAdmin) {
      alert(`${catLabel} 삭제는 관리자 권한이 필요합니다.`);
      return;
    }
    const isPeriod = deleteMode === 'period';
    if (isPeriod && (!deleteStartDate || !deleteEndDate)) {
      alert('삭제할 기간(시작일과 종료일)을 올바르게 선택해 주세요.');
      return;
    }
    if (isPeriod && (catKey === 'partner' || catKey === 'product')) {
      if (!window.confirm(`[${catLabel}] 기본 마스터 정보는 날짜 구분이 없어 기간 지정이 아닌 '전체 삭제'로 진행됩니다.\n계속 진행하시겠습니까?`)) {
        return;
      }
    }

    const effectivePeriod = isPeriod && catKey !== 'partner' && catKey !== 'product';
    const periodText = effectivePeriod ? `${deleteStartDate} ~ ${deleteEndDate}` : '전체 기간';

    if (!window.confirm(`정말 [${catLabel}] (${periodText}) 데이터를 시스템 및 DB에서 영구 삭제하시겠습니까?\n\n※ 전표 삭제 시 현재 최종재고(실시간 재고)는 변동 없이 보존됩니다.\n※ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    const keyword = catLabel.replace(/\s+/g, '');
    const entered = window.prompt(`정말 삭제하시려면 '${keyword}삭제'를 정확히 입력해 주세요.`);
    if (entered !== `${keyword}삭제`) {
      alert('입력값이 일치하지 않아 취소되었습니다.');
      return;
    }

    setIsDeleting(true);
    try {
      const companyId = currentUser?.companyId || 'default';
      const colMap = {
        partner: ['partners'],
        product: ['products'],
        salesLedger: ['salesInvoices'],
        purchaseLedger: ['purchaseInvoices'],
        orders: ['salesOrders', 'purchaseOrders'],
        schedules: ['schedules', 'actionLogs']
      };
      const collections = colMap[catKey] || [catKey];
      let totalDeletedCount = 0;

      for (const col of collections) {
        const snap = await getDocs(collection(db, 'companies', companyId, col));
        const allDocs = snap.docs;
        
        let docsToDelete = allDocs;
        if (effectivePeriod) {
          docsToDelete = allDocs.filter(d => {
            const data = d.data();
            const dateVal = data.date || data.orderDate || (data.start ? data.start.slice(0, 10) : '') || (data.createdAt ? data.createdAt.slice(0, 10) : '');
            return dateVal && dateVal >= deleteStartDate && dateVal <= deleteEndDate;
          });
        }

        if (docsToDelete.length === 0) continue;

        totalDeletedCount += docsToDelete.length;
        const CHUNK_SIZE = 400;
        for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
          const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }

        try {
          if (effectivePeriod) {
            const deletedIds = new Set(docsToDelete.map(d => d.id));
            const remainingDocs = allDocs
              .filter(d => !deletedIds.has(d.id))
              .map(d => ({ ...d.data(), id: d.id }));
            await saveBundle(companyId, col, remainingDocs);
            localStorage.setItem(`${col}_${companyId}`, JSON.stringify(remainingDocs));
          } else {
            await saveBundle(companyId, col, []);
            localStorage.removeItem(`${col}_${companyId}`);
          }
        } catch (e) {
          console.warn('Bundle update error during category delete:', e);
        }
      }

      alert(`[${catLabel}] (${periodText}) 데이터 ${totalDeletedCount}건이 성공적으로 삭제되었습니다.\n(최종재고는 변동 없이 보존되었습니다.)\n\n화면을 새로고침합니다.`);
      window.location.reload();
    } catch (err) {
      console.error(`Delete ${catLabel} error:`, err);
      alert(`${catLabel} 삭제 중 오류가 발생했습니다: ` + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    onSaveAll();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onRestoreAll(data);
        } catch (err) {
          alert('올바른 데이터 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <WindowModal title="데이터 전체 저장/불러오기/삭제" onClose={onClose} width="1100px">
      <div className="data-header">
        <div className="data-title-section">
          <div className="data-icon-bg"><FileJson size={24} color="#8b5cf6" /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="data-title">데이터 전체 저장/불러오기/삭제</h2>
              {isAdmin ? (
                <span style={{ 
                  fontSize: '0.72rem', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: '#dcfce7', 
                  color: '#15803d', 
                  fontWeight: 700 
                }}>
                  관리자 인증됨
                </span>
              ) : (
                <span style={{ 
                  fontSize: '0.72rem', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: '#fee2e2', 
                  color: '#b91c1c', 
                  fontWeight: 700 
                }}>
                  일반 직원 모드
                </span>
              )}
            </div>
            <p className="data-desc">시스템의 전체 데이터를 백업하거나 복원하고, 필요시 카테고리별/전체 데이터를 안전하게 삭제합니다.</p>
          </div>
        </div>
      </div>

      <div className="data-grid">
        {/* Save Card */}
        <div className="data-card">
          <div className="card-icon blue"><Download size={32} /></div>
          <h3 className="card-title">전체 데이터 저장 (백업)</h3>
          <p className="card-desc">
            시스템 내의 모든 회원, 상품, 원장, 일정 및 거래 내역 전체를 안전한 단일 JSON 파일로 즉시 백업합니다.
          </p>
          <button className="btn-data blue" onClick={handleDownload}>
            <Save size={18} /> 데이터 백업하기
          </button>
        </div>

        {/* Restore Card */}
        <div className="data-card">
          <div className="card-icon green"><Upload size={32} /></div>
          <h3 className="card-title">전체 데이터 불러오기 (복구)</h3>
          <p className="card-desc">
            이전에 안전하게 백업된 JSON 데이터를 업로드하여 시스템의 모든 상태를 손쉽게 원클릭으로 완벽히 복원합니다.
          </p>
          <div className="warning-box yellow">
            <AlertTriangle size={14} />
            <span>주의: 현재 입력된 모든 데이터가 백업 파일 내용으로 덮어씌워집니다.</span>
          </div>
          <button className="btn-data-outline" onClick={() => fileInputRef.current.click()}>
            <Upload size={18} /> 백업 파일 선택
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
        </div>

        {/* Delete Card */}
        <div className="data-card">
          <div className="card-icon red"><Trash2 size={32} /></div>
          <h3 className="card-title">모든 데이터 삭제 (초기화)</h3>
          <p className="card-desc">
            DB 내 모든 정보를 안전하고 흔적 없이 완전히 영구 삭제하고 초기화하여 깨끗한 초기 상태로 되돌립니다.
          </p>
          <div className="warning-box red">
            <AlertTriangle size={14} />
            <span>경고: 삭제된 데이터는 절대 복구할 수 없습니다. 신중히 결정하세요.</span>
          </div>
          <button className="btn-data red" onClick={onDeleteAll}>
            <Trash2 size={18} /> 전체 초기화 진행
          </button>
        </div>
      </div>

      {/* 데이터별 개별 삭제 섹션 */}
      <div style={{
        margin: '0 32px 24px 32px',
        padding: '20px',
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #fee2e2',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#991b1b' }}>데이터별 개별 삭제 (카테고리별)</h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            전체 초기화 없이 원하는 데이터만 안전하게 선별 삭제
          </span>
        </div>
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 14px 0' }}>
          전체 초기화 대신 특정 영역의 데이터만 영구 삭제하고 초기 상태로 되돌립니다. 삭제 전 반드시 위에서 백업(전체 데이터 저장)을 진행해 주세요.
        </p>

        {/* 기간 선택 컨트롤 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: '#fff',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>삭제 대상 기간:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', fontWeight: deleteMode === 'all' ? 700 : 500, color: deleteMode === 'all' ? '#dc2626' : '#64748b' }}>
              <input 
                type="radio" 
                name="mobileDataManagerDeleteMode" 
                checked={deleteMode === 'all'} 
                onChange={() => setDeleteMode('all')} 
              />
              전체 기간
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', fontWeight: deleteMode === 'period' ? 700 : 500, color: deleteMode === 'period' ? '#dc2626' : '#64748b' }}>
              <input 
                type="radio" 
                name="mobileDataManagerDeleteMode" 
                checked={deleteMode === 'period'} 
                onChange={() => setDeleteMode('period')} 
              />
              기간 지정 삭제
            </label>
          </div>

          {deleteMode === 'period' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#64748b" />
              <input 
                type="date" 
                value={deleteStartDate} 
                onChange={(e) => setDeleteStartDate(e.target.value)} 
                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>~</span>
              <input 
                type="date" 
                value={deleteEndDate} 
                onChange={(e) => setDeleteEndDate(e.target.value)} 
                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>
          )}

          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🛡️ 전표 삭제 시 실시간 최종재고(현재고)는 변동되지 않고 안전하게 보존됩니다.</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={() => handleDeleteCategory('partner', '거래처')}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Trash2 size={14} /> 거래처 데이터 삭제
          </button>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={() => handleDeleteCategory('product', '품목')}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Trash2 size={14} /> 품목 데이터 삭제
          </button>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={() => handleDeleteCategory('salesLedger', '매출처원장')}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Trash2 size={14} /> 매출원장/전표 삭제
          </button>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={() => handleDeleteCategory('purchaseLedger', '매입처원장')}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Trash2 size={14} /> 매입원장/전표 삭제
          </button>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={() => handleDeleteCategory('orders', '수주 및 발주')}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Trash2 size={14} /> 수주/발주 데이터 삭제
          </button>
          <button 
            type="button"
            disabled={isDeleting}
            onClick={() => handleDeleteCategory('schedules', '일정 및 로그')}
            style={{
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
              color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Trash2 size={14} /> 일정/로그 데이터 삭제
          </button>
        </div>
      </div>

      <div className="data-guide-footer">
        <div className="guide-title">
          <ShieldCheck size={18} color="#10b981" />
          데이터 안전 관리 가이드
        </div>
        <ul className="guide-list">
          <li>데이터 손실 방지를 위해 정기적으로 '전체 데이터 저장'을 진행해주세요.</li>
          <li>백업 파일은 보안을 위해 안전한 저장소(USB, 외장하드, 클라우드 등)에 보관하는 것이 좋습니다.</li>
          <li>불러오기 기능은 데이터 구조가 다른 파일(예: 엑셀, 텍스트)을 지원하지 않습니다. 반드시 이 프로그램에서 저장한 .json 파일을 사용하세요.</li>
        </ul>
      </div>
    </WindowModal>
  );
};

export default DataManager;
