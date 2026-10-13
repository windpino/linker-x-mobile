import React, { useState } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';

export const PRODUCT_COLUMNS_BY_CATEGORY = [
  {
    category: '기본정보',
    columns: [
      { id: 'photo', label: '상품 사진' },
      { id: 'categoryLarge', label: '대분류' },
      { id: 'categoryMedium', label: '중분류' },
      { id: 'categorySmall', label: '소분류' },
      { id: 'name', label: '상품명' },
      { id: 'abbreviation', label: '상품약칭' },
      { id: 'manufacturer', label: '제조사' },
      { id: 'spec', label: '규격' },
      { id: 'innerQty', label: '내품수량' },
      { id: 'barcode', label: '바코드' },
    ]
  },
  {
    category: '재고 및 창고',
    columns: [
      { id: 'warehouse', label: '기본 보관창고' },
      { id: 'optimalStock', label: '적정재고량' },
      { id: 'initialStock', label: '기초재고수량' },
    ]
  },
  {
    category: '가격 및 판매',
    columns: [
      { id: 'salesPrice', label: '매출가 (낱/박)' },
      { id: 'purchasePrice', label: '매입가' },
      { id: 'showInMall', label: '온라인몰 노출' },
    ]
  },
  {
    category: '기타정보',
    columns: [
      { id: 'memo', label: '상품 설명' },
    ]
  }
];

export const DEFAULT_PRODUCT_COLUMNS = {
  photo: true,
  categoryLarge: true,
  categoryMedium: true,
  categorySmall: true,
  name: true,
  abbreviation: true,
  manufacturer: true,
  spec: true,
  innerQty: true,
  warehouse: true,
  showInMall: true,
  optimalStock: true,
  initialStock: true,
  salesPrice: true,
  purchasePrice: true,
  barcode: true,
  memo: true,
  management: true
};

const ProductSettingsModal = ({ onClose, initialVisibleColumns, onSave }) => {
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns || DEFAULT_PRODUCT_COLUMNS);

  const toggleColumn = (colId) => {
    setVisibleColumns(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const handleReset = () => {
    setVisibleColumns(DEFAULT_PRODUCT_COLUMNS);
  };

  const handleSave = () => {
    onSave(visibleColumns);
    onClose();
  };

  return (
    <div className="window-overlay" style={{ zIndex: 9999 }}>
      <div className="window-container sm" style={{ width: '480px', maxWidth: '95vw' }}>
        <div className="window-titlebar" style={{ backgroundColor: 'white', color: '#1e293b', borderBottom: '1px solid #e2e8f0', height: '50px' }}>
          <div className="window-title" style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} />
            표시 항목 설정
          </div>
          <div className="window-controls">
            <button className="window-btn" onClick={onClose} style={{ color: '#64748b' }}><X size={20} /></button>
          </div>
        </div>
        
        <div className="window-content-area">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            품목 목록에 표시할 항목을 선택하세요.
          </p>
          
          <div style={{ maxHeight: '420px', overflowY: 'auto', marginBottom: '24px' }}>
            {PRODUCT_COLUMNS_BY_CATEGORY.map(({ category, columns }) => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #eff6ff' }}>
                  {category}
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {columns.map(col => {
                    const isChecked = Boolean(visibleColumns[col.id]);
                    return (
                      <label 
                        key={col.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 10px', 
                          border: isChecked ? '1px solid #bfdbfe' : '1px solid #f1f5f9', 
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isChecked ? '#f8fafc' : 'transparent',
                          transition: 'all 0.15s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleColumn(col.id)}
                          style={{ width: '15px', height: '15px', accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.82rem', color: isChecked ? '#1e293b' : '#64748b', fontWeight: isChecked ? 600 : 400 }}>
                          {col.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={handleReset} 
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', fontSize: '0.8rem', color: '#64748b' }}
            >
              <RotateCcw size={13} /> 기본값 복원
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn-outline" 
                onClick={onClose} 
                style={{ padding: '7px 16px', fontSize: '0.82rem' }}
              >
                취소
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSave} 
                style={{ padding: '7px 22px', fontSize: '0.82rem' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSettingsModal;
