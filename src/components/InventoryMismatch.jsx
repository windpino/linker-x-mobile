import React, { useState, useMemo, useEffect } from 'react';
import { Package, Search, AlertTriangle, CheckCircle2, RefreshCw, X, ChevronRight, Info, Layers, ClipboardCheck, ArrowUpDown } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import './InventoryMismatch.css';

const InventoryMismatch = ({
  onClose,
  products = [],
  categories = [],
  warehouses = [],
  inventory = {},
  currentUser,
  onSaveAdjustments,
  initialWarehouse,
  initialSearchTerm,
  physicalInventory = {},
  onUpdatePhysicalCount
}) => {
  // Filters state
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouse || warehouses[0]?.name || '');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [categoryLarge, setCategoryLarge] = useState('전체');
  const [categoryMedium, setCategoryMedium] = useState('전체');
  const [categorySmall, setCategorySmall] = useState('전체');
  const [filterType, setFilterType] = useState('mismatch'); // 'mismatch' by default
  
  // Track manual edits: { [productName]: physicalQty }
  const [editedCounts, setEditedCounts] = useState({});
  // Track reasons: { [productName]: reason }
  const [reasons, setReasons] = useState({});
  // Track remarks: { [productName]: remark }
  const [remarks, setRemarks] = useState({});

  // Show confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load presets if provided
  useEffect(() => {
    if (initialWarehouse) {
      setSelectedWarehouse(initialWarehouse);
    }
  }, [initialWarehouse]);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Load draft physical counts from Firestore when selectedWarehouse or physicalInventory changes
  useEffect(() => {
    const warehousePhys = physicalInventory[selectedWarehouse] || {};
    const newEdited = {};
    Object.keys(warehousePhys).forEach(prodName => {
      newEdited[prodName] = warehousePhys[prodName];
    });
    setEditedCounts(newEdited);
    setReasons({});
    setRemarks({});
  }, [selectedWarehouse, physicalInventory]);

  // Handle physical stock input change
  const handleCountChange = (productName, val) => {
    if (val === '') {
      // If cleared, default back to empty string or 0
      setEditedCounts(prev => ({ ...prev, [productName]: '' }));
      onUpdatePhysicalCount && onUpdatePhysicalCount(selectedWarehouse, productName, undefined);
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    setEditedCounts(prev => ({ ...prev, [productName]: num }));
    onUpdatePhysicalCount && onUpdatePhysicalCount(selectedWarehouse, productName, num);
  };

  // Reset edited count back to book stock
  const handleResetCount = (productName) => {
    setEditedCounts(prev => {
      const next = { ...prev };
      delete next[productName];
      return next;
    });
    setReasons(prev => {
      const next = { ...prev };
      delete next[productName];
      return next;
    });
    setRemarks(prev => {
      const next = { ...prev };
      delete next[productName];
      return next;
    });
    onUpdatePhysicalCount && onUpdatePhysicalCount(selectedWarehouse, productName, undefined);
  };

  // Quick adjustment (+1, -1) helper
  const handleQuickAdjust = (productName, currentVal, delta) => {
    const newVal = Math.max(0, currentVal + delta);
    setEditedCounts(prev => ({ ...prev, [productName]: newVal }));
    onUpdatePhysicalCount && onUpdatePhysicalCount(selectedWarehouse, productName, newVal);
  };

  // Filter products based on selected dropdowns & search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Category Filter
      const matchesLarge = categoryLarge === '전체' || p.categoryLarge === categoryLarge;
      const matchesMedium = categoryMedium === '전체' || p.categoryMedium === categoryMedium;
      const matchesSmall = categorySmall === '전체' || p.categorySmall === categorySmall;

      // 2. Search Term Filter
      const matchesSearch = !searchTerm || 
        matchesInitialSound(p.name, searchTerm) ||
        (p.abbreviation && matchesInitialSound(p.abbreviation, searchTerm)) ||
        (p.singleBarcode && p.singleBarcode.includes(searchTerm));

      if (!(matchesLarge && matchesMedium && matchesSmall && matchesSearch)) return false;

      // Calculate book stock and physical stock for this row (including initialStock)
      const bookStock = (p.initialStock || 0) + (inventory[selectedWarehouse]?.[p.name] || 0);
      const physicalStock = editedCounts[p.name] !== undefined ? (editedCounts[p.name] === '' ? 0 : editedCounts[p.name]) : bookStock;
      const discrepancy = physicalStock - bookStock;

      // 3. Mismatch Status Filter
      if (filterType === 'mismatch' && !searchTerm) {
        return discrepancy !== 0;
      }

      return true;
    });
  }, [products, inventory, selectedWarehouse, categoryLarge, categoryMedium, categorySmall, searchTerm, editedCounts, filterType]);

  // Compute metrics
  const metrics = useMemo(() => {
    let totalItems = filteredProducts.length;
    let matchedItems = 0;
    let mismatchedItems = 0;
    let pendingAdjustmentsCount = 0;
    let totalAdjustmentQty = 0;

    filteredProducts.forEach(p => {
      const bookStock = (p.initialStock || 0) + (inventory[selectedWarehouse]?.[p.name] || 0);
      const physicalStock = editedCounts[p.name] !== undefined ? (editedCounts[p.name] === '' ? 0 : editedCounts[p.name]) : bookStock;
      const diff = physicalStock - bookStock;

      if (diff === 0) {
        matchedItems++;
      } else {
        mismatchedItems++;
        if (editedCounts[p.name] !== undefined) {
          pendingAdjustmentsCount++;
          totalAdjustmentQty += Math.abs(diff);
        }
      }
    });

    return {
      totalItems,
      matchedItems,
      mismatchedItems,
      pendingAdjustmentsCount,
      totalAdjustmentQty
    };
  }, [filteredProducts, inventory, selectedWarehouse, editedCounts]);

  // Generate list of items to be adjusted
  const adjustmentsList = useMemo(() => {
    const list = [];
    products.forEach(p => {
      const bookStock = (p.initialStock || 0) + (inventory[selectedWarehouse]?.[p.name] || 0);
      const physicalStock = editedCounts[p.name] !== undefined ? (editedCounts[p.name] === '' ? 0 : editedCounts[p.name]) : bookStock;
      const diff = physicalStock - bookStock;

      if (diff !== 0 && editedCounts[p.name] !== undefined) {
        list.push({
          productId: p.id,
          productName: p.name,
          spec: p.spec || '-',
          category: p.category || '-',
          bookStock,
          physicalStock,
          qty: Math.abs(diff),
          type: diff < 0 ? 'loss' : 'gain',
          reason: reasons[p.name] || '실사조정',
          description: remarks[p.name] || ''
        });
      }
    });
    return list;
  }, [products, inventory, selectedWarehouse, editedCounts, reasons, remarks]);

  const handleSubmitAdjustments = () => {
    if (adjustmentsList.length === 0) {
      alert('조정할 내역이 없습니다.');
      return;
    }
    
    // Call parent handler to update Firestore and local state
    onSaveAdjustments({
      warehouse: selectedWarehouse,
      date: new Date().toISOString().split('T')[0],
      adjustments: adjustmentsList,
      operator: currentUser?.name || '시스템'
    });

    // Reset local states
    setEditedCounts({});
    setReasons({});
    setRemarks({});
    setShowConfirmModal(false);
    
    alert('재고 불일치 조정이 정상적으로 반영되었습니다.');
  };

  return (
    <WindowModal title="재고 불일치 현황 및 실사 조정" onClose={onClose} width="95%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header Summary Stats (2x2 Grid on Mobile) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>조사 대상</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{metrics.totalItems}개</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>일치 품목</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>{metrics.matchedItems}개</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>불일치 품목</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#d97706' }}>{metrics.mismatchedItems}개</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e0e7ff', borderLeft: '3px solid #6366f1', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClipboardCheck size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>조정 예정</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4f46e5' }}>{metrics.pendingAdjustmentsCount}건</div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Target Warehouse */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>대상 창고</label>
            <select 
              value={selectedWarehouse} 
              onChange={e => setSelectedWarehouse(e.target.value)} 
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, outline: 'none', backgroundColor: '#fff' }}
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Large & Medium Category 2-Col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>대분류</label>
              <select 
                value={categoryLarge} 
                onChange={e => {
                  setCategoryLarge(e.target.value);
                  setCategoryMedium('전체');
                  setCategorySmall('전체');
                }} 
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none' }}
              >
                <option value="전체">전체</option>
                {categories.filter(c => c.level === 1 || !c.parentId).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>중분류</label>
              <select 
                value={categoryMedium} 
                onChange={e => {
                  setCategoryMedium(e.target.value);
                  setCategorySmall('전체');
                }} 
                disabled={categoryLarge === '전체'}
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', backgroundColor: categoryLarge === '전체' ? '#f1f5f9' : '#fff' }}
              >
                <option value="전체">전체</option>
                {categories.filter(c => {
                  const large = categories.find(l => l.name === categoryLarge);
                  return large && c.parentId === large.id && c.level === 2;
                }).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Small Category & Stock Filter 2-Col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>소분류</label>
              <select 
                value={categorySmall} 
                onChange={e => setCategorySmall(e.target.value)} 
                disabled={categoryMedium === '전체'}
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', outline: 'none', backgroundColor: categoryMedium === '전체' ? '#f1f5f9' : '#fff' }}
              >
                <option value="전체">전체</option>
                {categories.filter(c => {
                  const medium = categories.find(m => m.name === categoryMedium);
                  return medium && c.parentId === medium.id && c.level === 3;
                }).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>재고 상태</label>
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)} 
                style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, outline: 'none', color: filterType === 'mismatch' ? '#d97706' : '#1e293b' }}
              >
                <option value="mismatch">불일치 품목만</option>
                <option value="all">전체 품목</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="품목명, 단축명 검색..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Product List Cards (Mobile Card View) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Info size={20} style={{ display: 'block', margin: '0 auto 6px', color: '#cbd5e1' }} />
              조회 조건에 맞는 품목이 없습니다.
            </div>
          ) : (
            filteredProducts.map(p => {
              const bookStock = (p.initialStock || 0) + (inventory[selectedWarehouse]?.[p.name] || 0);
              const hasEdit = editedCounts[p.name] !== undefined;
              const physicalValue = hasEdit ? editedCounts[p.name] : bookStock;
              const discrepancy = physicalValue === '' ? -bookStock : (physicalValue - bookStock);

              return (
                <div 
                  key={p.id} 
                  style={{
                    backgroundColor: hasEdit ? '#eff6ff' : '#fff',
                    border: hasEdit ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {/* Title & Category */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                        {p.name}
                        {p.spec && <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginLeft: '6px' }}>({p.spec})</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                        {p.categoryLarge || '-'} {p.categoryMedium && `> ${p.categoryMedium}`}
                      </div>
                    </div>

                    {hasEdit && (
                      <button 
                        type="button" 
                        onClick={() => handleResetCount(p.name)} 
                        style={{ padding: '3px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        <RefreshCw size={10} /> 초기화
                      </button>
                    )}
                  </div>

                  {/* Stock Comparison Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '6px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>장부재고</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: bookStock < 0 ? '#ef4444' : '#1e293b' }}>
                        {bookStock.toLocaleString()}
                      </div>
                    </div>

                    {/* Physical Count Input with +/- */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <button 
                        type="button"
                        onClick={() => handleQuickAdjust(p.name, physicalValue === '' ? 0 : physicalValue, -1)}
                        style={{ width: '24px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
                      >-</button>
                      <input 
                        type="number"
                        min="0"
                        value={physicalValue}
                        onChange={e => handleCountChange(p.name, e.target.value)}
                        style={{ width: '48px', height: '28px', border: '1.5px solid #3b82f6', borderRadius: '4px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', outline: 'none' }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleQuickAdjust(p.name, physicalValue === '' ? 0 : physicalValue, 1)}
                        style={{ width: '24px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
                      >+</button>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>불일치</div>
                      <div style={{
                        fontSize: '0.85rem', fontWeight: 800,
                        color: discrepancy === 0 ? '#10b981' : discrepancy > 0 ? '#2563eb' : '#ef4444'
                      }}>
                        {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                      </div>
                    </div>
                  </div>

                  {/* Reasons & Remarks Inputs if Edited */}
                  {hasEdit && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <select 
                        value={reasons[p.name] || '실사차이'} 
                        onChange={e => handleReasonChange(p.name, e.target.value)}
                        style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor: '#fff' }}
                      >
                        <option value="실사차이">실사차이</option>
                        <option value="파손손실">파손손실</option>
                        <option value="도난분실">도난분실</option>
                        <option value="입고오류">입고오류</option>
                        <option value="기타">기타</option>
                      </select>

                      <input 
                        type="text" 
                        placeholder="비고 메모..." 
                        value={remarks[p.name] || ''} 
                        onChange={e => handleRemarkChange(p.name, e.target.value)}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
          >
            닫기
          </button>
          
          <button 
            type="button" 
            onClick={handleApplyAdjustmentsClick} 
            disabled={metrics.pendingAdjustmentsCount === 0}
            style={{
              padding: '8px 18px',
              backgroundColor: metrics.pendingAdjustmentsCount > 0 ? '#3b82f6' : '#cbd5e1',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '0.82rem', fontWeight: 800,
              cursor: metrics.pendingAdjustmentsCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: metrics.pendingAdjustmentsCount > 0 ? '0 2px 6px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            조정 반영 ({metrics.pendingAdjustmentsCount}건)
          </button>
        </div>

        {/* Adjustments Confirmation Overlay Modal */}
        {showConfirmModal && (
          <div className="confirm-modal-backdrop">
            <div className="confirm-modal-content">
              <div className="confirm-modal-header">
                <h3><ClipboardCheck size={18} style={{ color: '#6366f1', verticalAlign: 'middle', marginRight: '6px' }} /> 재고 조정 내용 확인</h3>
                <button className="btn-close-modal" onClick={() => setShowConfirmModal(false)}><X size={18} /></button>
              </div>
              <div className="confirm-modal-body">
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>
                  <strong>{selectedWarehouse}</strong> 창고에 아래 {adjustmentsList.length}건의 실사 재고 조정을 반영하시겠습니까?
                  반영 시 현재고 상태가 업데이트되며 입출고 내역에 실사 조정 이력이 생성됩니다.
                </p>

                <div className="confirm-list-table-wrapper">
                  <table className="confirm-list-table">
                    <thead>
                      <tr>
                        <th>품목명</th>
                        <th>규격</th>
                        <th style={{ textAlign: 'right' }}>장부 재고</th>
                        <th style={{ textAlign: 'right' }}>실사 재고</th>
                        <th style={{ textAlign: 'right' }}>조정 수량</th>
                        <th>구분</th>
                        <th>사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentsList.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td>{item.spec}</td>
                          <td style={{ textAlign: 'right', color: item.bookStock < 0 ? '#ef4444' : 'inherit' }}>{item.bookStock.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{item.physicalStock.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {item.type === 'gain' ? `+${item.qty.toLocaleString()}` : `-${item.qty.toLocaleString()}`}
                          </td>
                          <td>
                            <span className={`type-badge ${item.type === 'gain' ? 'gain' : 'loss'}`}>
                              {item.type === 'gain' ? '재고 증가' : '재고 감소'}
                            </span>
                          </td>
                          <td>{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="confirm-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowConfirmModal(false)}>취소</button>
                <button type="button" className="btn-primary" onClick={handleSubmitAdjustments}>확인 및 반영</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WindowModal>
  );
};

export default InventoryMismatch;
