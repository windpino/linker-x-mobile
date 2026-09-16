import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, Search, RefreshCw, Save, CheckCircle2, AlertTriangle, 
  ArrowUpDown, Plus, Minus, X, Layers, FileSpreadsheet, Package
} from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import './PhysicalInventoryInput.css';

const PhysicalInventoryInput = ({
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
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouse || warehouses[0]?.name || '');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [categoryLarge, setCategoryLarge] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'entered', 'empty', 'diff'

  // Search triggered state
  const [hasSearched, setHasSearched] = useState(Boolean(initialSearchTerm));
  const [appliedWarehouse, setAppliedWarehouse] = useState(initialWarehouse || warehouses[0]?.name || '');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState(initialSearchTerm || '');
  const [appliedCategoryLarge, setAppliedCategoryLarge] = useState('전체');
  
  const [editedCounts, setEditedCounts] = useState({});
  const [reasons, setReasons] = useState({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (initialWarehouse) {
      setSelectedWarehouse(initialWarehouse);
      setAppliedWarehouse(initialWarehouse);
    }
  }, [initialWarehouse]);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setAppliedSearchTerm(initialSearchTerm);
      setHasSearched(true);
    }
  }, [initialSearchTerm]);

  useEffect(() => {
    const warehousePhys = physicalInventory[appliedWarehouse] || {};
    const newEdited = {};
    Object.keys(warehousePhys).forEach(prodName => {
      newEdited[prodName] = warehousePhys[prodName];
    });
    setEditedCounts(newEdited);
  }, [appliedWarehouse, physicalInventory]);

  const getBookStock = useCallback((productName, warehouseName) => {
    const currentBase = (inventory[warehouseName]?.[productName] || 0);
    const product = products.find(p => p.name === productName);
    const initial = product?.initialStock || 0;
    return initial + currentBase;
  }, [inventory, products]);

  const handleSearch = () => {
    setHasSearched(true);
    setAppliedWarehouse(selectedWarehouse);
    setAppliedSearchTerm(searchTerm.trim());
    setAppliedCategoryLarge(categoryLarge);
  };

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

  const filteredProducts = useMemo(() => {
    if (!hasSearched) return [];

    return uniqueProducts.filter(p => {
      if (appliedCategoryLarge !== '전체' && p.categoryLarge !== appliedCategoryLarge) return false;

      if (appliedSearchTerm) {
        const matches = matchesInitialSound(p.name, appliedSearchTerm) ||
          (p.abbreviation && matchesInitialSound(p.abbreviation, appliedSearchTerm)) ||
          (p.singleBarcode && p.singleBarcode.includes(appliedSearchTerm));
        if (!matches) return false;
      }

      const bookStock = getBookStock(p.name, appliedWarehouse);
      const isEntered = editedCounts[p.name] !== undefined && editedCounts[p.name] !== '';
      const physicalStock = isEntered ? Number(editedCounts[p.name]) : bookStock;
      const diff = physicalStock - bookStock;

      if (statusFilter === 'entered' && !isEntered) return false;
      if (statusFilter === 'empty' && isEntered) return false;
      if (statusFilter === 'diff' && diff === 0) return false;

      return true;
    });
  }, [uniqueProducts, hasSearched, appliedCategoryLarge, appliedSearchTerm, appliedWarehouse, getBookStock, editedCounts, statusFilter]);

  const handleCountChange = (productName, val) => {
    if (val === '') {
      setEditedCounts(prev => {
        const next = { ...prev };
        delete next[productName];
        return next;
      });
      onUpdatePhysicalCount && onUpdatePhysicalCount(appliedWarehouse, productName, undefined);
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    setEditedCounts(prev => ({ ...prev, [productName]: num }));
    onUpdatePhysicalCount && onUpdatePhysicalCount(appliedWarehouse, productName, num);
  };

  const handleQuickAdjust = (productName, delta) => {
    const bookStock = getBookStock(productName, appliedWarehouse);
    const current = editedCounts[productName] !== undefined && editedCounts[productName] !== '' 
      ? Number(editedCounts[productName]) 
      : bookStock;
    const nextVal = Math.max(0, current + delta);
    handleCountChange(productName, nextVal);
  };

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
    onUpdatePhysicalCount && onUpdatePhysicalCount(appliedWarehouse, productName, undefined);
  };

  const handleFillAllWithBookStock = () => {
    if (!hasSearched || filteredProducts.length === 0) {
      alert('검색된 품목이 없습니다. 먼저 품목을 검색해 주세요.');
      return;
    }
    if (!window.confirm('현재 표시된 모든 품목의 실재고를 전산재고와 동일하게 채우시겠습니까?')) return;
    const newCounts = { ...editedCounts };
    filteredProducts.forEach(p => {
      const bookStock = getBookStock(p.name, appliedWarehouse);
      newCounts[p.name] = bookStock;
      onUpdatePhysicalCount && onUpdatePhysicalCount(appliedWarehouse, p.name, bookStock);
    });
    setEditedCounts(newCounts);
    showSaveToast('전산재고 수량으로 실재고가 채워졌습니다.');
  };

  const handleClearAllCounts = () => {
    if (!hasSearched || filteredProducts.length === 0) {
      alert('검색된 품목이 없습니다. 먼저 품목을 검색해 주세요.');
      return;
    }
    if (!window.confirm('현재 표시된 품목의 실재고 입력값을 모두 초기화하시겠습니까?')) return;
    const newCounts = { ...editedCounts };
    filteredProducts.forEach(p => {
      delete newCounts[p.name];
      onUpdatePhysicalCount && onUpdatePhysicalCount(appliedWarehouse, p.name, undefined);
    });
    setEditedCounts(newCounts);
    showSaveToast('실재고 입력값이 초기화되었습니다.');
  };

  const showSaveToast = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 3000);
  };

  const handleApplyAdjustmentsToBook = () => {
    const adjustments = [];
    filteredProducts.forEach(p => {
      const bookStock = getBookStock(p.name, appliedWarehouse);
      const isEntered = editedCounts[p.name] !== undefined && editedCounts[p.name] !== '';
      if (isEntered) {
        const physicalStock = Number(editedCounts[p.name]);
        const diff = physicalStock - bookStock;
        adjustments.push({
          productName: p.name,
          categoryLarge: p.categoryLarge || '',
          categoryMedium: p.categoryMedium || '',
          spec: p.spec || '',
          barcode: p.singleBarcode || '',
          bookStock,
          physicalStock,
          diff,
          unitPrice: Number(p.purchasePrice || p.price || 0),
          reason: reasons[p.name] || '실사 재고 조정 반영',
          remark: ''
        });
      }
    });

    if (adjustments.length === 0) {
      alert('입력된 실재고 품목이 없습니다.');
      return;
    }

    if (onSaveAdjustments) {
      onSaveAdjustments(appliedWarehouse, adjustments);
      setShowConfirmModal(false);
      showSaveToast(`총 ${adjustments.length}개 품목의 전산재고가 실재고로 반영되었습니다.`);
    }
  };

  const summary = useMemo(() => {
    let totalItems = filteredProducts.length;
    let enteredItems = 0;
    let totalBookQty = 0;
    let totalPhysicalQty = 0;
    let diffQty = 0;
    let diffAmount = 0;
    let diffItemsCount = 0;

    filteredProducts.forEach(p => {
      const bookStock = getBookStock(p.name, appliedWarehouse);
      const isEntered = editedCounts[p.name] !== undefined && editedCounts[p.name] !== '';
      const physicalStock = isEntered ? Number(editedCounts[p.name]) : bookStock;
      const diff = physicalStock - bookStock;
      const unitPrice = Number(p.purchasePrice || p.price || 0);

      if (isEntered) enteredItems++;
      if (diff !== 0) diffItemsCount++;

      totalBookQty += bookStock;
      totalPhysicalQty += physicalStock;
      diffQty += diff;
      diffAmount += diff * unitPrice;
    });

    return {
      totalItems,
      enteredItems,
      unenteredItems: totalItems - enteredItems,
      totalBookQty,
      totalPhysicalQty,
      diffQty,
      diffAmount,
      diffItemsCount
    };
  }, [filteredProducts, editedCounts, getBookStock, appliedWarehouse]);

  return (
    <WindowModal title="실재고 입력" onClose={onClose} width="98vw" height="92vh" contentPadding="0">
      <div className="mobile-phys-inv-container">
        
        {saveSuccessMsg && (
          <div className="mobile-save-toast">
            <CheckCircle2 size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 1. Header Filters */}
        <div className="mobile-phys-inv-controls">
          <div className="mobile-controls-row">
            <select 
              value={selectedWarehouse} 
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="mobile-wh-select"
            >
              {warehouses.map(w => (
                <option key={w.id || w.name} value={w.name}>{w.name}</option>
              ))}
            </select>

            <select 
              value={categoryLarge} 
              onChange={(e) => setCategoryLarge(e.target.value)}
              className="mobile-cat-select"
            >
              <option value="전체">전체 카테고리</option>
              {categories.filter(c => String(c.level) === '1' || !c.parentId).map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="mobile-search-row">
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={16} className="mobile-search-icon" />
              <input 
                type="text" 
                placeholder="품목명, 바코드, 약칭..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="mobile-search-input"
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')}
                  className="mobile-search-clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button 
              type="button"
              onClick={handleSearch}
              className="mobile-btn-search"
            >
              검색
            </button>
          </div>

          <div className="mobile-tabs-row">
            {[
              { id: 'all', label: `전체 (${hasSearched ? summary.totalItems : 0})` },
              { id: 'entered', label: `입력 (${hasSearched ? summary.enteredItems : 0})` },
              { id: 'empty', label: `미입력 (${hasSearched ? summary.unenteredItems : 0})` },
              { id: 'diff', label: `차이 (${hasSearched ? summary.diffItemsCount : 0})` }
            ].map(tab => (
              <button 
                key={tab.id}
                type="button"
                className={`mobile-tab-btn ${statusFilter === tab.id ? 'active' : ''} ${tab.id === 'diff' ? 'tab-diff' : ''}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Summary stats */}
        <div className="mobile-phys-summary">
          <div className="mobile-summary-item">
            <span className="ms-lbl">입력완료</span>
            <span className="ms-val blue">{hasSearched ? `${summary.enteredItems}/${summary.totalItems}` : '-'}</span>
          </div>
          <div className="mobile-summary-item">
            <span className="ms-lbl">전산합계</span>
            <span className="ms-val">{hasSearched ? summary.totalBookQty.toLocaleString() : '-'}</span>
          </div>
          <div className="mobile-summary-item">
            <span className="ms-lbl">실사합계</span>
            <span className="ms-val purple">{hasSearched ? summary.totalPhysicalQty.toLocaleString() : '-'}</span>
          </div>
          <div className={`mobile-summary-item ${hasSearched && summary.diffQty !== 0 ? 'alert' : ''}`}>
            <span className="ms-lbl">차이수량</span>
            <span className={`ms-val ${!hasSearched ? '' : summary.diffQty > 0 ? 'blue' : summary.diffQty < 0 ? 'red' : ''}`}>
              {!hasSearched ? '-' : summary.diffQty > 0 ? `+${summary.diffQty}` : summary.diffQty}
            </span>
          </div>
        </div>

        {/* 3. Items list */}
        <div className="mobile-phys-list">
          {!hasSearched ? (
            <div className="mobile-empty-list" style={{ padding: '50px 16px' }}>
              <Search size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem', marginBottom: '4px' }}>
                조건을 설정한 후 [검색] 버튼을 눌러주세요.
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                창고, 카테고리 또는 검색어를 입력하고 검색하시면 해당 품목이 나타납니다.
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mobile-empty-list">조회된 품목이 없습니다.</div>
          ) : (
            filteredProducts.map((p, idx) => {
              const bookStock = getBookStock(p.name, appliedWarehouse);
              const isEntered = editedCounts[p.name] !== undefined && editedCounts[p.name] !== '';
              const physicalVal = isEntered ? editedCounts[p.name] : '';
              const physicalStock = isEntered ? Number(editedCounts[p.name]) : bookStock;
              const diff = isEntered ? (physicalStock - bookStock) : 0;
              const unitPrice = Number(p.purchasePrice || p.price || 0);

              return (
                <div 
                  key={p.id || p.name} 
                  className={`mobile-item-card ${isEntered && diff !== 0 ? 'card-mismatch' : isEntered ? 'card-matched' : ''}`}
                >
                  <div className="card-top">
                    <div className="card-name-box">
                      <span className="card-item-name">{p.name}</span>
                      {p.spec && <span className="card-item-spec">({p.spec})</span>}
                    </div>
                    {isEntered && (
                      <button 
                        type="button"
                        className="btn-card-reset"
                        onClick={() => handleResetCount(p.name)}
                        title="입력 취소"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="card-body-row">
                    <div className="stock-info-col">
                      <span className="stock-lbl">장부(전산)재고:</span>
                      <span className="stock-book-val">{bookStock.toLocaleString()}개</span>
                    </div>

                    <div className="stock-input-col">
                      <button 
                        type="button" 
                        className="btn-m-step"
                        onClick={() => handleQuickAdjust(p.name, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number"
                        min="0"
                        placeholder={String(bookStock)}
                        value={physicalVal}
                        onChange={(e) => handleCountChange(p.name, e.target.value)}
                        className={`input-m-phys ${isEntered ? 'entered' : ''}`}
                      />
                      <button 
                        type="button" 
                        className="btn-m-step"
                        onClick={() => handleQuickAdjust(p.name, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="card-footer-row">
                    <div className="diff-indicator">
                      {!isEntered ? (
                        <span className="diff-tag gray">미입력</span>
                      ) : diff === 0 ? (
                        <span className="diff-tag green">일치 (0)</span>
                      ) : diff > 0 ? (
                        <span className="diff-tag blue">+{diff}개 (초과)</span>
                      ) : (
                        <span className="diff-tag red">{diff}개 (부족)</span>
                      )}
                    </div>
                    {unitPrice > 0 && isEntered && diff !== 0 && (
                      <div className="diff-amount-tag">
                        차이금액: {(diff * unitPrice).toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Bottom action buttons */}
        <div className="mobile-phys-footer">
          <div className="mobile-footer-quick">
            <button 
              type="button" 
              className="btn-m-tool"
              onClick={handleFillAllWithBookStock}
              disabled={!hasSearched || filteredProducts.length === 0}
              style={{ opacity: (!hasSearched || filteredProducts.length === 0) ? 0.5 : 1 }}
            >
              <ClipboardCheck size={14} /> 자동채우기
            </button>
            <button 
              type="button" 
              className="btn-m-tool"
              onClick={handleClearAllCounts}
              disabled={!hasSearched || filteredProducts.length === 0}
              style={{ opacity: (!hasSearched || filteredProducts.length === 0) ? 0.5 : 1 }}
            >
              <RefreshCw size={14} /> 초기화
            </button>
          </div>

          <button 
            type="button" 
            className="btn-m-apply"
            onClick={() => setShowConfirmModal(true)}
            disabled={!hasSearched || summary.enteredItems === 0}
            style={{ opacity: (!hasSearched || summary.enteredItems === 0) ? 0.5 : 1 }}
          >
            <Save size={16} /> 전산재고에 실재고 반영 ({summary.enteredItems}건)
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="mobile-modal-overlay">
            <div className="mobile-confirm-card">
              <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px 0' }}>실재고 전산 반영 확인</h3>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 14px 0' }}>
                <b>[{appliedWarehouse}]</b> 창고의 실재고 {summary.enteredItems}건을 전산재고에 최종 반영하시겠습니까?
              </p>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '14px', textAlign: 'left' }}>
                <div>차이 발생: <b>{summary.diffItemsCount}건</b></div>
                <div>총 차이수량: <b>{summary.diffQty > 0 ? `+${summary.diffQty}` : summary.diffQty}개</b></div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700 }}
                  onClick={() => setShowConfirmModal(false)}
                >
                  취소
                </button>
                <button 
                  type="button"
                  style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700 }}
                  onClick={handleApplyAdjustmentsToBook}
                >
                  반영하기
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </WindowModal>
  );
};

export default PhysicalInventoryInput;
