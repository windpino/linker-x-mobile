import React, { useState, useRef, useCallback } from 'react';
import { Settings, Plus, Download, Printer } from 'lucide-react';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { playMenuClickSound } from '../utils/audio';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';

const ScheduleTypeManagement = ({ onClose, scheduleTypes = [], onUpdateTypes, currentUser, isMaster = false }) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3b82f6'); // 기본 파란색

  const [colWidths, setColWidths] = useState({
    no: 80,
    name: 350,
    color: 250,
    creator: 200,
    control: 150
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 40;

  const onResizeMouseDown = useCallback((e, colKey) => {
    e.preventDefault();
    resizingCol.current = colKey;
    resizeStartX.current = e.clientX;
    resizeStartW.current = colWidths[colKey];

    const onMove = (mv) => {
      const delta = mv.clientX - resizeStartX.current;
      const newW = Math.max(MIN_COL_W, resizeStartW.current + delta);
      setColWidths(prev => ({ ...prev, [resizingCol.current]: newW }));
    };

    const onUp = () => {
      resizingCol.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [colWidths]);

  const handleAddType = async () => {
    playMenuClickSound();
    const trimmedName = newTypeName.trim();
    if (!trimmedName) return;

    const exists = scheduleTypes.some(t => (typeof t === 'object' ? t.name : t) === trimmedName);
    if (exists) {
      alert('이미 존재하는 유형입니다.');
      return;
    }

    const companyId = currentUser?.companyId || 'default';
    const userId = isMaster ? 'master' : (currentUser?.userId || 'unknown');

    const newTypeObj = {
      name: trimmedName,
      color: newTypeColor,
      userId: userId
    };

    try {
      if (isMaster) {
        await setDoc(doc(db, 'master_schedule_types', trimmedName), newTypeObj);
      } else {
        await setDoc(doc(db, 'companies', companyId, 'schedule_types', trimmedName), newTypeObj);
      }

      if (onUpdateTypes) {
        onUpdateTypes(prev => {
          const next = Array.isArray(prev) ? [...prev, newTypeObj] : [newTypeObj];
          return next;
        });
      }
      setNewTypeName('');
      setNewTypeColor('#3b82f6');
    } catch (err) {
      console.error("Error adding schedule type:", err);
      alert('일정 유형 추가에 실패했습니다.');
    }
  };

  const handleRemoveType = async (typeToRemove) => {
    playMenuClickSound();
    if (scheduleTypes.length <= 1) {
      alert('최소 하나 이상의 유형이 필요합니다.');
      return;
    }

    const typeName = typeof typeToRemove === 'object' ? typeToRemove.name : typeToRemove;

    if (!window.confirm(`"${typeName}" 유형을 정말 삭제하시겠습니까?\n(해당 유형의 일정들이 삭제되는 것은 아니나, 표시되지 않거나 기본유형으로 보일 수 있습니다)`)) {
      return;
    }

    const companyId = currentUser?.companyId || 'default';

    try {
      if (isMaster) {
        await deleteDoc(doc(db, 'master_schedule_types', typeName));
      } else {
        await deleteDoc(doc(db, 'companies', companyId, 'schedule_types', typeName));
      }

      if (onUpdateTypes) {
        onUpdateTypes(prev => prev.filter(t => (typeof t === 'object' ? t.name : t) !== typeName));
      }
    } catch (err) {
      console.error("Error removing schedule type:", err);
      alert('일정 유형 삭제에 실패했습니다.');
    }
  };

  return (
    <WindowModal title="일정 유형 설정" onClose={onClose} width="1150px">
      <div className="account-header">
        <div className="acc-title-section">
          <h2 className="acc-title">
            <Settings color="#3b82f6" size={24} />
            일정 유형 설정
          </h2>
        </div>
        <div className="acc-actions">
          <button className="btn-outline"><Printer size={16} /> 인쇄</button>
          <button className="btn-outline"><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="purchase-modal-body">
        {/* 새 유형 추가 영역 (원장의 필터 영역 레이아웃 재적용) */}
        <div className="sales-ledger-filter" style={{ marginBottom: '20px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>신규 일정 유형명</label>
              <input
                type="text"
                placeholder="유형명을 입력하세요 (예: 미팅, 출장)"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                style={{ height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddType();
                }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0, flex: 3, minWidth: '300px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>유형 색상 선택</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '38px' }}>
                {['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#64748b'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTypeColor(color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: newTypeColor === color ? '2.5px solid #0f172a' : '1.5px solid #cbd5e1',
                      cursor: 'pointer',
                      padding: 0,
                      transform: newTypeColor === color ? 'scale(1.15)' : 'none',
                      transition: 'all 0.15s'
                    }}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  value={newTypeColor}
                  onChange={(e) => setNewTypeColor(e.target.value)}
                  style={{
                    width: '28px',
                    height: '28px',
                    border: 'none',
                    padding: 0,
                    background: 'none',
                    cursor: 'pointer',
                    verticalAlign: 'middle',
                    marginLeft: '8px'
                  }}
                  title="사용자 지정 색상"
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleAddType}
              style={{
                height: '38px',
                padding: '0 20px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              <Plus size={16} />
              유형 등록
            </button>
          </div>
        </div>

        {/* 기존 유형 목록 테이블 영역 (원장 테이블 레이아웃 재적용) */}
        <div className="invoice-table-container" style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <table className="invoice-table ledger-table" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  { key: 'no', label: '번호', width: colWidths.no, align: 'center' },
                  { key: 'name', label: '유형명', width: colWidths.name, align: 'left' },
                  { key: 'color', label: '색상값 (미리보기)', width: colWidths.color, align: 'center' },
                  { key: 'creator', label: '등록자', width: colWidths.creator, align: 'center' },
                  { key: 'control', label: '관리', width: colWidths.control, align: 'center' }
                ].map(col => (
                  <th 
                    key={col.key} 
                    style={{ 
                      width: col.width + 'px', 
                      position: 'relative', 
                      userSelect: 'none', 
                      textAlign: col.align === 'center' ? 'center' : 'left',
                      padding: '12px 10px',
                      borderBottom: '2px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.85rem',
                      color: '#475569',
                      fontWeight: 700
                    }}
                  >
                    {col.label}
                    <span
                      onMouseDown={(e) => onResizeMouseDown(e, col.key)}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0,
                        width: '6px', cursor: 'col-resize',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2,
                      }}
                      title={`${col.label} 너비 조절`}
                    >
                      <span style={{
                        display: 'block', width: '0px', height: '100%',
                        borderLeft: '1px dotted #cbd5e1',
                      }} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px 0', color: '#94a3b8', textAlign: 'center' }}>
                    등록된 일정 유형이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                scheduleTypes.map((typeObj, index) => {
                  const name = typeof typeObj === 'object' ? typeObj.name : typeObj;
                  const color = typeof typeObj === 'object' ? typeObj.color : '#64748b';
                  const creator = typeof typeObj === 'object' ? (typeObj.userId === 'system' ? '기본설정' : typeObj.userId) : '기본설정';

                  return (
                    <tr key={name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'center', color: '#64748b', padding: '12px 10px' }}>{index + 1}</td>
                      <td style={{ fontWeight: 600, color: '#334155', padding: '12px 10px' }}>{name}</td>
                      <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, border: '1px solid rgba(0,0,0,0.1)', display: 'inline-block' }}></span>
                          <code style={{ fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{color}</code>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#475569', padding: '12px 10px' }}>{creator}</td>
                      <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                        <button
                          onClick={() => handleRemoveType(typeObj)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default ScheduleTypeManagement;
