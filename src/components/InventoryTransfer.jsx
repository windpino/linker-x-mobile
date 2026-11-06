import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeftRight, Search, Plus, X, Printer, FileText, Check, Trash2, RotateCw } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { exportToExcel } from '../utils/excelUtils';
import { addDays, DateNavButton } from '../utils/dateNavigationUtils';
import './InventoryTransfer.css';

const InventoryTransfer = ({ 
  onClose, 
  currentUser, 
  warehouses = [], 
  products = [], 
  inventory = {}, 
  onMoveStock,
  onDeleteMoveStock, 
  onUpdateMoveStock, 
  historyData = [], 
  setHistoryData,
  salesOrders = [], 
  salesInvoices = [], 
  onOpenSalesInvoice, 
  onOpenSalesOrder,
  purchaseInvoices = [], 
  onOpenPurchaseInvoice,
  initialDate, 
  initialRecord = null, 
  staffList = []
}) => {
  // ─── 탭 모드: 'register' (재고이동 등록 - 기본 모바일 양식) / 'history' (이동 이력조회) ───
  const [activeTab, setActiveTab] = useState('register');

  // ─── 이동 등록 상태 ───
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [transferDate, setTransferDate] = useState(() => {
    if (initialRecord?.date) return initialRecord.date;
    if (initialDate) {
      const dateObj = typeof initialDate === 'string' ? new Date(initialDate) : initialDate;
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    return getTodayStr();
  });

  // 메인 창고 & 기본 입고창고
  const mainWarehouseName = useMemo(() => {
    const mainWh = warehouses.find(w => w.isMain) || 
      warehouses.find(w => (w.name || '').includes('메인') || (w.name || '').includes('본사')) || 
      warehouses[0];
    return mainWh?.name || '본사창고';
  }, [warehouses]);

  const defaultToWarehouse = useMemo(() => {
    if (currentUser?.warehouse && currentUser.warehouse !== '-' && currentUser.warehouse !== mainWarehouseName) {
      return currentUser.warehouse;
    }
    const otherWh = warehouses.find(w => w.name !== mainWarehouseName && w.name !== '전체창고');
    return otherWh ? otherWh.name : (warehouses[1]?.name || '통영창고');
  }, [warehouses, currentUser, mainWarehouseName]);

  const [fromWarehouse, setFromWarehouse] = useState(mainWarehouseName);
  const [toWarehouse, setToWarehouse] = useState(defaultToWarehouse);

  useEffect(() => {
    if (mainWarehouseName && !fromWarehouse) {
      setFromWarehouse(mainWarehouseName);
    }
  }, [mainWarehouseName, fromWarehouse]);

  // 상품 검색 및 입력 상태
  const [searchCriterion, setSearchCriterion] = useState('상품명');
  const [itemSearchText, setItemSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // 이동 대상 품목 목록 (현재 전표에 담긴 품목들)
  const [transferItems, setTransferItems] = useState([]);
  const [printBoxQty, setPrintBoxQty] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // ─── 이력 조회 관련 상태 ───
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [historyEndDate, setHistoryEndDate] = useState(getTodayStr());
  const [historyFromFilter, setHistoryFromFilter] = useState('전체창고');
  const [historyToFilter, setHistoryToFilter] = useState('전체창고');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // 외부 클릭 시 검색 제안 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 창고별 재고 조회 유틸
  const getStock = (whName, prodName) => {
    const prod = products.find(p => p.name === prodName);
    const initStock = prod?.initialStock || 0;
    const invStock = inventory[whName]?.[prodName] !== undefined ? inventory[whName][prodName] : 0;
    return initStock + invStock;
  };

  // 상품 자동완성 목록
  const cleanSearch = itemSearchText.trim();
  const suggestions = useMemo(() => {
    if (!cleanSearch) return [];
    return products.filter(p => {
      return (
        p.name.includes(cleanSearch) ||
        (p.abbreviation && p.abbreviation.includes(cleanSearch)) ||
        matchesInitialSound(p.name, cleanSearch) ||
        (p.abbreviation && matchesInitialSound(p.abbreviation, cleanSearch)) ||
        (p.code && p.code.includes(cleanSearch))
      );
    }).slice(0, 30);
  }, [products, cleanSearch]);

  // 상품 추가 핸들러
  const handleAddProduct = (prod) => {
    if (!prod) return;
    setTransferItems(prev => {
      const existingIdx = prev.findIndex(item => item.name === prod.name);
      if (existingIdx >= 0) {
        // 이미 추가된 상품이면 수량 1 증가
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: Number(next[existingIdx].qty || 0) + 1
        };
        return next;
      }
      // 신규 추가
      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: prod.name,
          spec: prod.spec || '',
          unit: prod.unit || '개',
          qty: 1,
          boxPerUnits: prod.boxPerUnits || prod.boxQuantity || 20,
          checked: true // 영수증 출력 기본 선택
        }
      ];
    });
    setItemSearchText('');
    setShowSuggestions(false);
  };

  // 수량 변경
  const handleUpdateQty = (idx, newQty) => {
    const val = parseFloat(newQty);
    setTransferItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty: isNaN(val) ? 0 : val };
      return next;
    });
  };

  // 품목 삭제
  const handleRemoveItem = (idx) => {
    setTransferItems(prev => prev.filter((_, i) => i !== idx));
  };

  // 영수증 체크 토글
  const handleToggleCheck = (idx) => {
    setTransferItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], checked: !next[idx].checked };
      return next;
    });
  };

  // 전체 선택/해제 토글
  const allChecked = transferItems.length > 0 && transferItems.every(i => i.checked);
  const handleToggleAllChecks = () => {
    const targetState = !allChecked;
    setTransferItems(prev => prev.map(item => ({ ...item, checked: targetState })));
  };

  // 새전표 (초기화)
  const handleNewSlip = () => {
    if (transferItems.length > 0) {
      if (!window.confirm('입력 중인 품목이 모두 초기화됩니다. 새 전표를 작성하시겠습니까?')) {
        return;
      }
    }
    setTransferItems([]);
    setItemSearchText('');
  };

  // 재고이동 실행 및 저장
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSaveTransfer = async () => {
    if (transferItems.length === 0) {
      alert('이동할 상품을 1개 이상 추가해주세요.');
      return;
    }
    if (!fromWarehouse || !toWarehouse) {
      alert('출고창고와 입고창고를 선택해주세요.');
      return;
    }
    if (fromWarehouse === toWarehouse) {
      alert('출고창고와 입고창고가 동일합니다. 서로 다른 창고를 선택해주세요.');
      return;
    }

    const invalidItem = transferItems.find(it => Number(it.qty || 0) <= 0);
    if (invalidItem) {
      alert(`[${invalidItem.name}]의 이동 수량이 0이거나 올바르지 않습니다.`);
      return;
    }

    if (!window.confirm(`총 ${transferItems.length}건의 상품을\n[${fromWarehouse}] ➔ [${toWarehouse}] 로 이동하시겠습니까?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      for (const item of transferItems) {
        await onMoveStock(
          fromWarehouse,
          toWarehouse,
          item.name,
          Number(item.qty),
          false,
          transferDate,
          null,
          currentUser?.name || (staffList.length > 0 ? staffList[0].name : '관리자')
        );
      }
      alert(`재고이동이 정상적으로 완료되었습니다.`);
      setTransferItems([]);
    } catch (e) {
      console.error(e);
      alert('재고이동 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 총 건수 및 총 수량 계산
  const totalCount = transferItems.length;
  const totalQuantity = transferItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  // 이력 필터링 결과
  const filteredHistory = useMemo(() => {
    return (historyData || []).filter(h => {
      if (h.date < historyStartDate || h.date > historyEndDate) return false;
      if (historyFromFilter !== '전체창고' && h.from !== historyFromFilter) return false;
      if (historyToFilter !== '전체창고' && h.to !== historyToFilter) return false;
      if (historySearchTerm.trim()) {
        const q = historySearchTerm.trim();
        const matches = (h.item || '').includes(q) || (h.operator || '').includes(q) || (h.memo || '').includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [historyData, historyStartDate, historyEndDate, historyFromFilter, historyToFilter, historySearchTerm]);

  return (
    <WindowModal title="재고이동" onClose={onClose} width="100%">
      <div className="inv-transfer-mobile-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* 상단 탭 전환 바 ([이동등록] / [이력조회]) */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: '0.84rem',
              fontWeight: activeTab === 'register' ? 800 : 600,
              color: activeTab === 'register' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'register' ? '2px solid #2563eb' : 'none',
              background: activeTab === 'register' ? '#ffffff' : 'transparent',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            📦 재고 이동등록
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: '0.84rem',
              fontWeight: activeTab === 'history' ? 800 : 600,
              color: activeTab === 'history' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'history' ? '2px solid #2563eb' : 'none',
              background: activeTab === 'history' ? '#ffffff' : 'transparent',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            📋 이동 내역조회 ({filteredHistory.length})
          </button>
        </div>

        {activeTab === 'register' ? (
          <>
            {/* 상단 폼 헤더: 이동일자, 출고창고, 입고창고 */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0
            }}>
              {/* 1. 이동일자 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '65px', fontSize: '0.86rem', fontWeight: 800, color: '#16a34a' }}>
                  이동일자:
                </span>
                <input 
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    outline: 'none'
                  }}
                />
              </div>

              {/* 2. 출고창고 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '65px', fontSize: '0.86rem', fontWeight: 800, color: '#16a34a' }}>
                  출고창고:
                </span>
                <select
                  value={fromWarehouse}
                  onChange={e => setFromWarehouse(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {warehouses.filter(w => w.name !== '전체창고').map((w, idx) => (
                    <option key={w.id || idx} value={w.name}>
                      [{idx + 1}] {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. 입고창고 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '65px', fontSize: '0.86rem', fontWeight: 800, color: '#16a34a' }}>
                  입고창고:
                </span>
                <select
                  value={toWarehouse}
                  onChange={e => setToWarehouse(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {warehouses.filter(w => w.name !== '전체창고').map((w, idx) => (
                    <option key={w.id || idx} value={w.name}>
                      [{idx + 1}] {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. 상품명 검색 입력 영역 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} ref={searchContainerRef}>
                <select
                  value={searchCriterion}
                  onChange={e => setSearchCriterion(e.target.value)}
                  style={{
                    width: '82px',
                    padding: '7px 6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    outline: 'none'
                  }}
                >
                  <option value="상품명">상품명</option>
                  <option value="초성">초성</option>
                  <option value="코드">코드</option>
                </select>

                <div style={{ position: 'relative', flex: 1 }}>
                  <input 
                    ref={searchInputRef}
                    type="text"
                    value={itemSearchText}
                    placeholder="상품 입력 (초성 가능)"
                    onChange={e => {
                      setItemSearchText(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    style={{
                      width: '100%',
                      padding: '7px 28px 7px 10px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      border: '2px solid #f97316', // 주황색 테두리 (스크린샷 매칭)
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {itemSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemSearchText('');
                        setShowSuggestions(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}

                  {/* 자동완성 제안 팝업 */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      maxHeight: '230px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}>
                      {suggestions.map((p, i) => {
                        const curStock = getStock(fromWarehouse, p.name);
                        return (
                          <div
                            key={p.id || i}
                            onMouseDown={() => handleAddProduct(p)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.84rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</span>
                              {p.spec && <span style={{ fontSize: '0.74rem', color: '#64748b' }}>규격: {p.spec}</span>}
                            </div>
                            <span style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: curStock > 0 ? '#16a34a' : '#ef4444',
                              backgroundColor: curStock > 0 ? '#dcfce7' : '#fee2e2',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              현재고: {curStock}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (suggestions.length === 1) {
                      handleAddProduct(suggestions[0]);
                    } else {
                      setShowSuggestions(true);
                    }
                  }}
                  style={{
                    padding: '7px 10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155'
                  }}
                >
                  <Search size={16} />
                </button>
              </div>
            </div>

            {/* 컬럼 헤더 (순번 | 상품명 | 수량 | 영수증선택) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '7px 12px',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#334155',
              flexShrink: 0
            }}>
              <div style={{ width: '40px', textAlign: 'center' }}>순번</div>
              <div style={{ flex: 1, paddingLeft: '6px' }}>상품명</div>
              <div style={{ width: '65px', textAlign: 'right', paddingRight: '8px' }}>수량</div>
              <div 
                onClick={handleToggleAllChecks}
                style={{
                  width: '60px',
                  textAlign: 'center',
                  color: '#16a34a',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: '0.74rem',
                  lineHeight: 1.1
                }}
                title="클릭하여 전체 선택/해제"
              >
                영수증<br/>선택
              </div>
              <div style={{ width: '32px', textAlign: 'center' }}>삭제</div>
            </div>

            {/* 품목 목록 (스크롤) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: '#ffffff'
            }}>
              {transferItems.length === 0 ? (
                <div style={{
                  padding: '70px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.88rem'
                }}>
                  위 검색창에서 이동할 상품을 검색하여 추가하세요.
                </div>
              ) : (
                transferItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    {/* 순번 */}
                    <div style={{ width: '40px', textAlign: 'center', fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>
                      {idx + 1}
                    </div>

                    {/* 상품명 */}
                    <div style={{ flex: 1, minWidth: 0, paddingLeft: '6px' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      {item.spec && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {item.spec}
                        </div>
                      )}
                    </div>

                    {/* 수량 입력 */}
                    <div style={{ width: '65px', textAlign: 'right', paddingRight: '4px' }}>
                      <input 
                        type="number"
                        step="any"
                        value={item.qty}
                        onChange={e => handleUpdateQty(idx, e.target.value)}
                        style={{
                          width: '58px',
                          padding: '4px',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* 영수증 선택 체크박스 */}
                    <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCheck(idx)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* 삭제 버튼 */}
                    <div style={{ width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '3px'
                        }}
                        title="항목 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 하단 고정 통계 바 ([총 건수] N / [총 수량] M.0) */}
            <div style={{
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderTop: '1px solid #334155',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#4ade80' }}>
                  [총 건수]
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
                  {totalCount}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#4ade80' }}>
                  [총 수량]
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
                  {totalQuantity.toFixed(1)}
                </span>
              </div>
            </div>

            {/* 하단 액션 버튼 바: [새전표] [영수증] [v 박스 수량 인쇄] + [재고이동 저장] */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* 새전표 */}
                <button
                  type="button"
                  onClick={handleNewSlip}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={14} /> 새전표
                </button>

                {/* 영수증 */}
                <button
                  type="button"
                  onClick={() => {
                    const checkedItems = transferItems.filter(i => i.checked);
                    if (checkedItems.length === 0) {
                      alert('영수증으로 출력할 선택된 품목이 없습니다.');
                      return;
                    }
                    setIsReceiptModalOpen(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} /> 영수증
                </button>

                {/* 박스 수량 인쇄 체크박스 */}
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input 
                    type="checkbox"
                    checked={printBoxQty}
                    onChange={e => setPrintBoxQty(e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  박스 수량 인쇄
                </label>
              </div>

              {/* 이동 저장 버튼 */}
              <button
                type="button"
                disabled={isSubmitting || transferItems.length === 0}
                onClick={handleSaveTransfer}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  backgroundColor: transferItems.length === 0 ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: transferItems.length === 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                {isSubmitting ? '처리 중...' : '💾 이동 저장'}
              </button>
            </div>
          </>
        ) : (
          /* 내역조회 탭 */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 이력 필터 */}
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>조회기간:</span>
                <input 
                  type="date"
                  value={historyStartDate}
                  onChange={e => setHistoryStartDate(e.target.value)}
                  style={{ flex: 1, padding: '5px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                <span>~</span>
                <input 
                  type="date"
                  value={historyEndDate}
                  onChange={e => setHistoryEndDate(e.target.value)}
                  style={{ flex: 1, padding: '5px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={historyFromFilter}
                  onChange={e => setHistoryFromFilter(e.target.value)}
                  style={{ flex: 1, padding: '5px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="전체창고">출고: 전체창고</option>
                  {warehouses.map((w, idx) => <option key={idx} value={w.name}>{w.name}</option>)}
                </select>
                <select
                  value={historyToFilter}
                  onChange={e => setHistoryToFilter(e.target.value)}
                  style={{ flex: 1, padding: '5px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="전체창고">입고: 전체창고</option>
                  {warehouses.map((w, idx) => <option key={idx} value={w.name}>{w.name}</option>)}
                </select>
                <input 
                  type="text"
                  placeholder="품목/담당자 검색"
                  value={historySearchTerm}
                  onChange={e => setHistorySearchTerm(e.target.value)}
                  style={{ flex: 1.2, padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* 이력 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {filteredHistory.length === 0 ? (
                <div style={{ padding: '50px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                  해당 기간 내의 재고이동 이력이 없습니다.
                </div>
              ) : (
                filteredHistory.map((item, idx) => (
                  <div key={item.id || idx} style={{
                    padding: '9px 12px',
                    marginBottom: '6px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>{item.item}</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563eb' }}>{item.qty}개</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748b' }}>
                      <span>{item.date} {item.processedAt ? `· ${item.processedAt}` : ''}</span>
                      <span>담당: {item.operator || '관리자'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#059669', background: '#f0fdf4', padding: '3px 8px', borderRadius: '4px' }}>
                      <span>출고: {item.from}</span>
                      <span>➔</span>
                      <span>입고: {item.to}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 영수증 모달 */}
      {isReceiptModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 영수증 상단 헤더 */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>🧾 재고이동 영수증</span>
              <button 
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 영수증 내용 (프린트 타겟) */}
            <div id="receipt-print-area" style={{ padding: '16px', backgroundColor: '#ffffff', color: '#0f172a' }}>
              <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px dashed #000000', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>재고이동 전표</h3>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                  일자: {transferDate}
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', marginBottom: '12px', lineHeight: '1.5' }}>
                <div><strong>출고창고:</strong> {fromWarehouse}</div>
                <div><strong>입고창고:</strong> {toWarehouse}</div>
                <div><strong>담당자:</strong> {currentUser?.name || '관리자'}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0' }}>품목명</th>
                    <th style={{ textAlign: 'right', padding: '4px 0' }}>수량</th>
                    {printBoxQty && <th style={{ textAlign: 'right', padding: '4px 0' }}>박스</th>}
                  </tr>
                </thead>
                <tbody>
                  {transferItems.filter(i => i.checked).map((it, idx) => {
                    const boxCount = it.boxPerUnits > 0 ? (it.qty / it.boxPerUnits).toFixed(1) : '-';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px dotted #cbd5e1' }}>
                        <td style={{ padding: '4px 0', fontWeight: 600 }}>{it.name}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700 }}>{it.qty}</td>
                        {printBoxQty && <td style={{ textAlign: 'right', padding: '4px 0' }}>{boxCount}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>선택 건수:</strong>
                  <strong>{transferItems.filter(i => i.checked).length} 건</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.94rem' }}>
                  <strong>총 수량:</strong>
                  <strong style={{ color: '#2563eb' }}>
                    {transferItems.filter(i => i.checked).reduce((s, it) => s + Number(it.qty || 0), 0).toFixed(1)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 영수증 하단 버튼 */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={16} /> 인쇄하기
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                style={{
                  padding: '9px 14px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </WindowModal>
  );
};

export default InventoryTransfer;
