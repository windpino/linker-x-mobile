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
    <WindowModal title="재고 불일치 현황 및 실사 조정" onClose={onClose} width="95%">
      <div className="mismatch-modal-wrapper">
        {/* Header Summary Stats */}
        <div className="mismatch-summary-cards">
          <div className="summary-card">
            <div className="card-icon blue"><Layers size={20} /></div>
            <div className="card-info">
              <span className="card-label">조사 대상 품목</span>
              <span className="card-value">{metrics.totalItems}개</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon green"><CheckCircle2 size={20} /></div>
            <div className="card-info">
              <span className="card-label">일치 품목</span>
              <span className="card-value">{metrics.matchedItems}개</span>
            </div>
          </div>
          <div className="summary-card warning">
            <div className="card-icon orange"><AlertTriangle size={20} /></div>
            <div className="card-info">
              <span className="card-label">불일치 품목</span>
              <span className="card-value text-orange">{metrics.mismatchedItems}개</span>
            </div>
          </div>
          <div className="summary-card primary">
            <div className="card-icon purple"><ClipboardCheck size={20} /></div>
            <div className="card-info">
              <span className="card-label">조정 예정 건수</span>
              <span className="card-value text-purple">{metrics.pendingAdjustmentsCount}건 ({metrics.totalAdjustmentQty.toLocaleString()}개)</span>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="mismatch-filter-panel">
          <div className="filter-grid">
            <div className="filter-item">
              <label>대상 창고</label>
              <select 
                value={selectedWarehouse} 
                onChange={e => setSelectedWarehouse(e.target.value)} 
                className="select-v3"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
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
                <option value="전체">대분류 전체</option>
                {categories.filter(c => c.level === 1 || !c.parentId).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
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
                <option value="전체">중분류 전체</option>
                {categories.filter(c => {
                  const large = categories.find(l => l.name === categoryLarge);
                  return large && c.parentId === large.id && c.level === 2;
                }).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>소분류</label>
              <select 
                value={categorySmall} 
                onChange={e => setCategorySmall(e.target.value)} 
                disabled={categoryMedium === '전체'}
                className="select-v3"
              >
                <option value="전체">소분류 전체</option>
                {categories.filter(c => {
                  const medium = categories.find(m => m.name === categoryMedium);
                  return medium && c.parentId === medium.id && c.level === 3;
                }).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>재고 상태</label>
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)} 
                className="select-v3"
              >
                <option value="all">전체 품목</option>
                <option value="mismatch">불일치 품목만</option>
              </select>
            </div>

            <div className="filter-item" style={{ gridColumn: 'span 2' }}>
              <label>품목 검색</label>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="품목명, 단축명, 바코드 입력..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="input-v3 search-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="mismatch-table-container">
          <table className="mismatch-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>분류</th>
                <th>품목명</th>
                <th style={{ width: '120px' }}>규격</th>
                <th style={{ width: '100px', textAlign: 'right' }}>장부 재고</th>
                <th style={{ width: '220px', textAlign: 'center' }}>실사 재고 입력</th>
                <th style={{ width: '100px', textAlign: 'right' }}>불일치 수량</th>
                <th style={{ width: '130px' }}>조정 사유</th>
                <th>비고</th>
                <th style={{ width: '70px', textAlign: 'center' }}>초기화</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-data-cell">
                    <Info size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    조회 조건에 맞는 품목이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const bookStock = (p.initialStock || 0) + (inventory[selectedWarehouse]?.[p.name] || 0);
                  const hasEdit = editedCounts[p.name] !== undefined;
                  const physicalValue = hasEdit ? editedCounts[p.name] : bookStock;
                  const discrepancy = physicalValue === '' ? -bookStock : (physicalValue - bookStock);

                  return (
                    <tr key={p.id} className={hasEdit ? 'row-edited' : ''}>
                      <td className="category-cell">
                        <span className="cat-badge">{p.categoryLarge || '-'}</span>
                        {p.categoryMedium && <ChevronRight size={10} className="cat-arrow" />}
                        {p.categoryMedium && <span className="cat-sub">{p.categoryMedium}</span>}
                      </td>
                      <td className="product-name-cell">
                        <span className="prod-name">{p.name}</span>
                        {p.abbreviation && <span className="prod-abbr">({p.abbreviation})</span>}
                      </td>
                      <td>{p.spec || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: bookStock < 0 ? '#ef4444' : 'inherit' }} className="book-stock-cell">
                        {bookStock.toLocaleString()}
                      </td>
                      <td>
                        <div className="input-adjust-group">
                          <button 
                            type="button" 
                            className="btn-adj-minus"
                            onClick={() => handleQuickAdjust(p.name, physicalValue === '' ? 0 : physicalValue, -1)}
                          >
                            -
                          </button>
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
                          >
                            +
                          </button>
                          <button 
                            type="button" 
                            className="btn-match-equal"
                            onClick={() => handleCountChange(p.name, bookStock)}
                            title="장부재고와 맞춤"
                          >
                            =
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="discrepancy-cell">
                        {discrepancy === 0 ? (
                          <span className="diff-zero">0</span>
                        ) : discrepancy > 0 ? (
                          <span className="diff-plus">+{discrepancy.toLocaleString()}</span>
                        ) : (
                          <span className="diff-minus">{discrepancy.toLocaleString()}</span>
                        )}
                      </td>
                      <td>
                        <select 
                          className="select-v3-small"
                          disabled={!hasEdit || discrepancy === 0}
                          value={reasons[p.name] || '실사조정'}
                          onChange={e => setReasons(prev => ({ ...prev, [p.name]: e.target.value }))}
                        >
                          <option value="실사조정">실사조정</option>
                          <option value="파손">파손</option>
                          <option value="분실">분실</option>
                          <option value="폐기">폐기</option>
                          <option value="기타">기타</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="특이사항 입력"
                          className="input-v3-small"
                          disabled={!hasEdit || discrepancy === 0}
                          value={remarks[p.name] || ''}
                          onChange={e => setRemarks(prev => ({ ...prev, [p.name]: e.target.value }))}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {hasEdit && (
                          <button 
                            type="button" 
                            className="btn-reset-row"
                            onClick={() => handleResetCount(p.name)}
                            title="입력 취소"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="mismatch-footer">
          <div className="footer-info">
            {adjustmentsList.length > 0 && (
              <span className="alert-badge animate-pulse">
                <AlertTriangle size={14} style={{ marginRight: '4px' }} />
                반영 대기 중인 재고 조정이 {adjustmentsList.length}건 있습니다.
              </span>
            )}
          </div>
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
