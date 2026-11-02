import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Package, Search, AlertTriangle, CheckCircle2, RefreshCw, X, ChevronRight, Info, Layers, ClipboardCheck, ArrowUpDown, Filter } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { DateNavButton, addDays } from '../utils/dateNavigationUtils';
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
  onUpdatePhysicalCount,
  historyData = []
}) => {
  // Filters state
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouse || warehouses[0]?.name || '');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [showCategories, setShowCategories] = useState(false); // Default hidden as requested
  const [categoryLarge, setCategoryLarge] = useState('전체');
  const [categoryMedium, setCategoryMedium] = useState('전체');
  const [categorySmall, setCategorySmall] = useState('전체');
  const [filterType, setFilterType] = useState('mismatch'); // 'mismatch' by default
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [onlyWithMovements, setOnlyWithMovements] = useState(false);
  
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

  // Helper to get book stock for a product in a warehouse at a given endDate
  const getBookStockForDate = useCallback((productName, warehouseName, targetEndDate) => {
    const currentBase = (inventory[warehouseName]?.[productName] || 0);
    let adjustment = 0;
    if (historyData && historyData.length > 0) {
      historyData.forEach(item => {
        if (item.item === productName && item.date > targetEndDate) {
          if (item.to === warehouseName) {
            adjustment -= item.qty;
          }
          if (item.from === warehouseName) {
            adjustment += item.qty;
          }
        }
      });
    }
    const product = products.find(p => p.name === productName);
    const initial = product?.initialStock || 0;
    return initial + currentBase + adjustment;
  }, [inventory, historyData, products]);

  // Deduplicate products by name to prevent duplicate rows and double-counting adjustments
  const uniqueProducts = useMemo(() => {
    const seenNames = new Set();
    const unique = [];
    (products || []).forEach(p => {
      if (!p || !p.name) return;
      const normalizedName = p.name.trim();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        unique.push(p);
      }
    });
    return unique;
  }, [products]);

  // Base products matching categories, search, and movements
  const baseProducts = useMemo(() => {
    return uniqueProducts.filter(p => {
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

      // 3. Movement Filter (Only active products in range)
      if (onlyWithMovements) {
        const hasMovement = (historyData || []).some(item => 
          item.item === p.name &&
          item.date >= startDate &&
          item.date <= endDate &&
          (item.from === selectedWarehouse || item.to === selectedWarehouse)
        );
        if (!hasMovement) return false;
      }

      return true;
    });
  }, [uniqueProducts, categoryLarge, categoryMedium, categorySmall, searchTerm, onlyWithMovements, historyData, startDate, endDate, selectedWarehouse]);

  // Compute metrics from baseProducts
  const metrics = useMemo(() => {
    let totalItems = baseProducts.length;
    let matchedItems = 0;
    let mismatchedItems = 0;
    let pendingAdjustmentsCount = 0;
    let totalAdjustmentQty = 0;

    baseProducts.forEach(p => {
      const bookStock = getBookStockForDate(p.name, selectedWarehouse, endDate);
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
  }, [baseProducts, getBookStockForDate, selectedWarehouse, endDate, editedCounts]);

  // Filter products based on selected status filterType
  const filteredProducts = useMemo(() => {
    return baseProducts.filter(p => {
      const bookStock = getBookStockForDate(p.name, selectedWarehouse, endDate);
      const physicalStock = editedCounts[p.name] !== undefined ? (editedCounts[p.name] === '' ? 0 : editedCounts[p.name]) : bookStock;
      const discrepancy = physicalStock - bookStock;

      if (filterType === 'mismatch') return discrepancy !== 0;
      if (filterType === 'match') return discrepancy === 0;
      if (filterType === 'pending') return editedCounts[p.name] !== undefined && discrepancy !== 0;
      return true; // 'all'
    });
  }, [baseProducts, getBookStockForDate, selectedWarehouse, endDate, editedCounts, filterType]);

  // Generate list of items to be adjusted
  const adjustmentsList = useMemo(() => {
    const list = [];
    const processedNames = new Set();
    uniqueProducts.forEach(p => {
      const prodName = p.name.trim();
      if (processedNames.has(prodName)) return;

      const bookStock = getBookStockForDate(p.name, selectedWarehouse, endDate);
      const physicalStock = editedCounts[p.name] !== undefined ? (editedCounts[p.name] === '' ? 0 : editedCounts[p.name]) : bookStock;
      const diff = physicalStock - bookStock;

      if (diff !== 0 && editedCounts[p.name] !== undefined) {
        processedNames.add(prodName);
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
  }, [uniqueProducts, getBookStockForDate, selectedWarehouse, endDate, editedCounts, reasons, remarks]);

  const handleSubmitAdjustments = () => {
    if (adjustmentsList.length === 0) {
      alert('조정할 내역이 없습니다.');
      return;
    }
    
    // Call parent handler to update Firestore and local state
    onSaveAdjustments({
      warehouse: selectedWarehouse,
      date: endDate,
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
      <div className="mismatch-modal-wrapper">
        {/* 4 Compact Filter Pill Buttons (2x2 Grid on Mobile) */}
        <div className="mismatch-stats-bar">
          <button
            type="button"
            className={`stat-pill-btn ${filterType === 'all' ? 'active blue' : ''}`}
            onClick={() => setFilterType('all')}
            title="조사 대상 전체 품목 보기"
          >
            <Layers size={14} className="pill-icon blue" />
            <span className="pill-label">조사대상</span>
            <span className="pill-count blue">{metrics.totalItems}개</span>
          </button>

          <button
            type="button"
            className={`stat-pill-btn ${filterType === 'match' ? 'active green' : ''}`}
            onClick={() => setFilterType('match')}
            title="장부재고와 실사재고가 일치하는 품목 보기"
          >
            <CheckCircle2 size={14} className="pill-icon green" />
            <span className="pill-label">일치</span>
            <span className="pill-count green">{metrics.matchedItems}개</span>
          </button>

          <button
            type="button"
            className={`stat-pill-btn ${filterType === 'mismatch' ? 'active orange' : ''}`}
            onClick={() => setFilterType('mismatch')}
            title="장부재고와 실사재고가 다른 불일치 품목 보기"
          >
            <AlertTriangle size={14} className="pill-icon orange" />
            <span className="pill-label">불일치</span>
            <span className="pill-count orange">{metrics.mismatchedItems}개</span>
          </button>

          <button
            type="button"
            className={`stat-pill-btn ${filterType === 'pending' ? 'active purple' : ''}`}
            onClick={() => setFilterType('pending')}
            title="실사 수량이 입력되어 조정 예정인 품목 보기"
          >
            <ClipboardCheck size={14} className="pill-icon purple" />
            <span className="pill-label">조정예정</span>
            <span className="pill-count purple">
              {metrics.pendingAdjustmentsCount}건
              {metrics.totalAdjustmentQty > 0 ? ` (${metrics.totalAdjustmentQty.toLocaleString()}개)` : ''}
            </span>
          </button>
        </div>

        {/* Filters Panel */}
        <div className="mismatch-filter-panel">
          {/* Warehouse & Status Select Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="filter-group">
              <label>대상 창고</label>
              <select 
                value={selectedWarehouse} 
                onChange={e => setSelectedWarehouse(e.target.value)} 
                className="select-v3 wh-select"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>재고 상태</label>
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)} 
                className="select-v3 status-select"
              >
                <option value="mismatch">불일치 품목만</option>
                <option value="all">조사대상 전체</option>
                <option value="match">일치 품목만</option>
                <option value="pending">조정 예정 건만</option>
              </select>
            </div>
          </div>

          {/* Date Range Row */}
          <div className="filter-group date-group">
            <label>조회 기간</label>
            <div className="date-range-box">
              <DateNavButton
                direction="prev"
                title="하루 전"
                onClick={() => {
                  const prevStart = addDays(startDate, -1);
                  const prevEnd = (startDate === endDate) ? prevStart : addDays(endDate, -1);
                  setStartDate(prevStart);
                  setEndDate(prevEnd);
                }}
              />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="mismatch-date-input"
              />
              <span className="date-sep">~</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="mismatch-date-input"
              />
              <DateNavButton
                direction="next"
                title="하루 뒤"
                onClick={() => {
                  const nextStart = addDays(startDate, 1);
                  const nextEnd = (startDate === endDate) ? nextStart : addDays(endDate, 1);
                  setStartDate(nextStart);
                  setEndDate(nextEnd);
                }}
              />
            </div>
          </div>

          {/* Category Toggle & Movement Checkbox Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn-category-toggle ${showCategories ? 'active' : ''}`}
              onClick={() => setShowCategories(!showCategories)}
              title="카테고리(대/중/소분류) 필터 열기 또는 닫기"
            >
              <Filter size={13} />
              <span>카테고리 {showCategories ? '접기 ▲' : '선택 ▼'}</span>
              {(categoryLarge !== '전체' || categoryMedium !== '전체' || categorySmall !== '전체') && (
                <span className="cat-active-dot" title="카테고리 필터 적용 중" />
              )}
            </button>

            <label className="checkbox-label" htmlFor="onlyWithMovementsCheck">
              <input 
                type="checkbox" 
                id="onlyWithMovementsCheck"
                checked={onlyWithMovements} 
                onChange={e => setOnlyWithMovements(e.target.checked)} 
              />
              <span>해당 기간 내 이동 품목만</span>
            </label>
          </div>

          {/* Collapsible Category Row (Hidden by default) */}
          {showCategories && (
            <div className="filter-category-row">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', width: '100%' }}>
                <div className="filter-group">
                  <label>대분류</label>
                  <select 
                    value={categoryLarge} 
                    onChange={e => {
                      setCategoryLarge(e.target.value);
                      setCategoryMedium('전체');
                      setCategorySmall('전체');
                    }} 
                    className="select-v3"
                  >
                    <option value="전체">전체</option>
                    {categories.filter(c => c.level === 1 || !c.parentId).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>중분류</label>
                  <select 
                    value={categoryMedium} 
                    onChange={e => {
                      setCategoryMedium(e.target.value);
                      setCategorySmall('전체');
                    }} 
                    disabled={categoryLarge === '전체'}
                    className="select-v3"
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

                <div className="filter-group">
                  <label>소분류</label>
                  <select 
                    value={categorySmall} 
                    onChange={e => setCategorySmall(e.target.value)} 
                    disabled={categoryMedium === '전체'}
                    className="select-v3"
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
              </div>

              {(categoryLarge !== '전체' || categoryMedium !== '전체' || categorySmall !== '전체') && (
                <button
                  type="button"
                  className="btn-reset-cat"
                  onClick={() => {
                    setCategoryLarge('전체');
                    setCategoryMedium('전체');
                    setCategorySmall('전체');
                  }}
                >
                  카테고리 초기화
                </button>
              )}
            </div>
          )}

          {/* Large Expanded Search Bar */}
          <div className="filter-search-row">
            <div className="search-input-wrapper-large">
              <Search size={16} className="large-search-icon" />
              <input 
                type="text" 
                placeholder="품목 검색 (품목명, 단축명, 바코드 / 초성 지원)..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="large-search-input"
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="btn-clear-search" 
                  onClick={() => setSearchTerm('')}
                  title="검색어 지우기"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Product List Cards (Mobile Card View) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Info size={20} style={{ display: 'block', margin: '0 auto 6px', color: '#cbd5e1' }} />
              조회 조건에 맞는 품목이 없습니다.
            </div>
          ) : (
            filteredProducts.map(p => {
              const bookStock = getBookStockForDate(p.name, selectedWarehouse, endDate);
              const hasEdit = editedCounts[p.name] !== undefined;
              const physicalValue = hasEdit ? editedCounts[p.name] : bookStock;
              const discrepancy = physicalValue === '' ? -bookStock : (physicalValue - bookStock);

              return (
                <div 
                  key={p.id} 
                  style={{
                    backgroundColor: hasEdit ? '#f5f3ff' : '#fff',
                    border: hasEdit ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {/* Title & Category */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', wordBreak: 'break-word' }}>
                        {p.name}
                        {p.abbreviation && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>({p.abbreviation})</span>}
                        {p.spec && <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginLeft: '6px' }}>{p.spec}</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                        {p.categoryLarge || '-'} {p.categoryMedium && `> ${p.categoryMedium}`}
                      </div>
                    </div>

                    {hasEdit && (
                      <button 
                        type="button" 
                        onClick={() => handleResetCount(p.name)} 
                        style={{ padding: '3px 7px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
                      >
                        <RefreshCw size={10} /> 초기화
                      </button>
                    )}
                  </div>

                  {/* Stock Comparison Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.5fr 0.9fr', gap: '6px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>장부재고</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: bookStock < 0 ? '#ef4444' : '#1e293b' }}>
                        {bookStock.toLocaleString()}
                      </div>
                    </div>

                    {/* Physical Count Input with - / + / = */}
                    <div className="input-adjust-group">
                      <button 
                        type="button"
                        className="btn-adj-minus"
                        onClick={() => handleQuickAdjust(p.name, physicalValue === '' ? 0 : physicalValue, -1)}
                      >-</button>
                      <input 
                        type="number"
                        className="input-qty-field"
                        value={physicalValue}
                        onChange={e => handleCountChange(p.name, e.target.value)}
                        placeholder={bookStock}
                      />
                      <button 
                        type="button"
                        className="btn-adj-plus"
                        onClick={() => handleQuickAdjust(p.name, physicalValue === '' ? 0 : physicalValue, 1)}
                      >+</button>
                      <button 
                        type="button" 
                        className="btn-match-equal"
                        onClick={() => handleCountChange(p.name, bookStock)}
                        title="장부재고와 맞춤"
                      >
                        =
                      </button>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>불일치</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                        {discrepancy === 0 ? (
                          <span className="diff-zero">0</span>
                        ) : discrepancy > 0 ? (
                          <span className="diff-plus">+{discrepancy.toLocaleString()}</span>
                        ) : (
                          <span className="diff-minus">{discrepancy.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reasons & Remarks Inputs if Edited */}
                  {hasEdit && discrepancy !== 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px' }}>
                      <select 
                        className="select-v3-small"
                        value={reasons[p.name] || '실사조정'} 
                        onChange={e => setReasons(prev => ({ ...prev, [p.name]: e.target.value }))}
                      >
                        <option value="실사조정">실사조정</option>
                        <option value="파손">파손</option>
                        <option value="분실">분실</option>
                        <option value="폐기">폐기</option>
                        <option value="기타">기타</option>
                      </select>

                      <input 
                        type="text" 
                        placeholder="특이사항 입력" 
                        className="input-v3-small"
                        value={remarks[p.name] || ''} 
                        onChange={e => setRemarks(prev => ({ ...prev, [p.name]: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="mismatch-footer">
          {adjustmentsList.length > 0 && (
            <div className="footer-info">
              <span className="alert-badge animate-pulse">
                <AlertTriangle size={13} style={{ marginRight: '4px' }} />
                반영 대기 중인 재고 조정이 {adjustmentsList.length}건 있습니다.
              </span>
            </div>
          )}
          <div className="footer-buttons">
            <button type="button" className="btn-secondary-v3" onClick={onClose}>
              닫기
            </button>
            <button 
              type="button" 
              className="btn-primary-v3" 
              disabled={adjustmentsList.length === 0}
              onClick={() => setShowConfirmModal(true)}
            >
              조정 반영 ({adjustmentsList.length}건)
            </button>
          </div>
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
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                  <strong>{selectedWarehouse}</strong> 창고에 아래 {adjustmentsList.length}건의 실사 재고 조정을 반영하시겠습니까?
                  반영 시 현재고 상태가 업데이트되며 입출고 내역에 실사 조정 이력이 생성됩니다.
                </p>

                <div className="confirm-list-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="confirm-list-table">
                    <thead>
                      <tr>
                        <th>품목명</th>
                        <th style={{ textAlign: 'right' }}>장부</th>
                        <th style={{ textAlign: 'right' }}>실사</th>
                        <th style={{ textAlign: 'right' }}>조정</th>
                        <th>구분</th>
                        <th>사유</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentsList.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td style={{ textAlign: 'right', color: item.bookStock < 0 ? '#ef4444' : 'inherit' }}>{item.bookStock.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{item.physicalStock.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {item.type === 'gain' ? `+${item.qty.toLocaleString()}` : `-${item.qty.toLocaleString()}`}
                          </td>
                          <td>
                            <span className={`type-badge ${item.type === 'gain' ? 'gain' : 'loss'}`}>
                              {item.type === 'gain' ? '증가' : '감소'}
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
