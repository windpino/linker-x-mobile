import React, { useState, useRef } from 'react';
import { 
  Save, Upload, Trash2, ShieldCheck, Download, FileJson, 
  AlertTriangle 
} from 'lucide-react';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';
import './DataManager.css';

const DataManager = ({ onClose, onSaveAll, onRestoreAll, onDeleteAll, currentUser }) => {
  const fileInputRef = useRef(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!window.confirm(`정말 [${catLabel}] 데이터를 시스템 및 DB에서 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
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
      for (const col of collections) {
        const snap = await getDocs(collection(db, 'companies', companyId, col));
        const docs = snap.docs;
        const CHUNK_SIZE = 400;
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
          const chunk = docs.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        try {
          await saveBundle(companyId, col, []);
          localStorage.removeItem(`${col}_${companyId}`);
        } catch (e) {}
      }
      alert(`[${catLabel}] 데이터가 성공적으로 삭제되었습니다. 변경 사항을 반영하기 위해 화면을 새로고침합니다.`);
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
        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px 0' }}>
          전체 초기화 대신 특정 영역의 데이터만 영구 삭제하고 초기 상태로 되돌립니다. 삭제 전 반드시 위에서 백업(전체 데이터 저장)을 진행해 주세요.
        </p>

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
