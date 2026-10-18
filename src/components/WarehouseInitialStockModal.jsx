import React, { useState, useMemo } from 'react';
import { Search, Save, Warehouse } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { getProductWarehouseInitialStock } from '../utils/productStockUtils';
import { db } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';

const WarehouseInitialStockModal = ({
  products = [],
  setProducts,
  warehouses = [],
  categories = [],
  currentUser,
  onClose,
  onSaveAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('전체');
  const [localBatchStocks, setLocalBatchStocks] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCat === '전체' || p.categoryLarge === selectedCat || p.categoryMedium === selectedCat;
      const matchSearch = !searchTerm || matchesInitialSound(p.name, searchTerm) || (p.abbreviation && matchesInitialSound(p.abbreviation, searchTerm));
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, searchTerm]);

  const handleCellChange = (prodId, whName, val) => {
    const clean = val.replace(/[^0-9]/g, '');
    const num = clean === '' ? 0 : parseInt(clean, 10);
    setLocalBatchStocks(prev => ({
      ...prev,
      [prodId]: {
        ...(prev[prodId] || {}),
        [whName]: num
      }
    }));
  };

  const getCellValue = (p, whName) => {
    if (localBatchStocks[p.id]?.[whName] !== undefined) {
      return localBatchStocks[p.id][whName];
    }
    return getProductWarehouseInitialStock(p, whName, warehouses);
  };

  const getRowTotal = (p) => {
    return (warehouses || []).reduce((sum, w) => {
      const val = getCellValue(p, w.name);
      return sum + (Number(val) || 0);
    }, 0);
  };

  const editedCount = Object.keys(localBatchStocks).length;

  const handleSave = async () => {
    if (editedCount === 0) {
      alert('변경된 기초 재고가 없습니다.');
      return;
    }
    setIsSaving(true);
    try {
      if (onSaveAll) {
        await onSaveAll(localBatchStocks);
      } else {
        const companyId = currentUser?.companyId || 'default';
        const batch = writeBatch(db);
        const updatedMap = new Map();

        Object.keys(localBatchStocks).forEach(id => {
          const prod = products.find(p => String(p.id) === String(id));
          if (!prod) return;

          const currentWhStock = { ...(prod.warehouseInitialStock || {}) };
          if (Object.keys(currentWhStock).length === 0 && (prod.initialStock || prod.warehouse)) {
            const mainWh = warehouses[0]?.name || '본사창고';
            const defaultWh = prod.warehouse || mainWh;
            currentWhStock[defaultWh] = Number(prod.initialStock) || 0;
          }

          const newWhChanges = localBatchStocks[id];
          Object.entries(newWhChanges).forEach(([wh, val]) => {
            currentWhStock[wh] = Number(val) || 0;
          });

          const totalInitial = Object.values(currentWhStock).reduce((sum, v) => sum + (Number(v) || 0), 0);

          const updatedProd = {
            ...prod,
            warehouseInitialStock: currentWhStock,
            initialStock: totalInitial,
            companyId,
            updatedAt: new Date().toISOString()
          };

          updatedMap.set(String(id), updatedProd);
          batch.set(doc(db, 'companies', companyId, 'products', String(id)), updatedProd, { merge: true });
        });

        await batch.commit();

        const nextProducts = products.map(p => updatedMap.get(String(p.id)) || p);
        if (setProducts) setProducts(nextProducts);
        await saveBundle(companyId, 'products', nextProducts);
        alert('기초 재고가 성공적으로 저장되었습니다.');
      }
      onClose();
    } catch (e) {
      console.error('Error saving warehouse initial stocks:', e);
      alert('기초 재고 저장 중 오류가 발생했습니다: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WindowModal title="창고별 기초재고 일괄설정" onClose={onClose} width="98%" maxWidth="960px">
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', height: '80vh', boxSizing: 'border-box' }}>
        {/* 상단 검색 및 필터 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>분류:</span>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
            >
              <option value="전체">전체 카테고리</option>
              {categories.filter(c => c.level === 1 || !c.parentId).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="품목명/초성 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '5px 8px 5px 28px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          {editedCount > 0 && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              ✓ {editedCount}개 수정 중
            </div>
          )}
        </div>

        {/* 테이블 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 5, borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#334155', minWidth: '130px' }}>품목명</th>
                <th style={{ padding: '8px 6px', fontSize: '0.75rem', color: '#334155', width: '70px' }}>규격</th>
                {(warehouses || []).map(w => (
                  <th key={w.id || w.name} style={{ padding: '8px 6px', fontSize: '0.75rem', color: '#1e40af', textAlign: 'center', width: '90px' }}>
                    {w.name}
                  </th>
                ))}
                <th style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#0f172a', textAlign: 'right', width: '85px' }}>합계</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3 + (warehouses || []).length} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    검색 조건에 일치하는 품목이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const isRowEdited = localBatchStocks[p.id] !== undefined;
                  const rowTotal = getRowTotal(p);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isRowEdited ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '6px 6px', fontSize: '0.72rem', color: '#64748b' }}>
                        {p.spec || '-'}
                      </td>
                      {(warehouses || []).map(w => {
                        const cellVal = getCellValue(p, w.name);
                        const isCellEdited = localBatchStocks[p.id]?.[w.name] !== undefined;
                        return (
                          <td key={w.name} style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={cellVal}
                              onChange={(e) => handleCellChange(p.id, w.name, e.target.value)}
                              style={{
                                width: '65px',
                                height: '28px',
                                textAlign: 'right',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                border: isCellEdited ? '2px solid #10b981' : '1px solid #cbd5e1',
                                backgroundColor: isCellEdited ? '#ecfdf5' : '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.8rem'
                              }}
                            />
                          </td>
                        );
                      })}
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#1d4ed8', fontSize: '0.85rem' }}>
                        {rowTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 모달 하단 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            총 <strong>{filtered.length}</strong>개 품목
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-outline" onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>닫기</button>
            <button
              type="button"
              className="btn-primary"
              disabled={isSaving || editedCount === 0}
              onClick={handleSave}
              style={{
                padding: '6px 18px',
                fontWeight: 700,
                fontSize: '0.82rem',
                opacity: (isSaving || editedCount === 0) ? 0.6 : 1,
                cursor: (isSaving || editedCount === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Save size={14} />
              {isSaving ? '저장 중...' : `창고별 기초재고 일괄 저장 (${editedCount}건)`}
            </button>
          </div>
        </div>
      </div>
    </WindowModal>
  );
};

export const BatchWarehouseInitialStockModal = WarehouseInitialStockModal;
export default WarehouseInitialStockModal;
