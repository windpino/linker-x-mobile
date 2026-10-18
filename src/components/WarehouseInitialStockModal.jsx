import React, { useMemo } from 'react';
import BulkEditor from './BulkEditor';
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
  const columns = useMemo(() => {
    return [
      { field: 'categoryLarge', header: '대분류', type: 'string', width: 110, align: 'center', readOnly: true },
      { field: 'code', header: '품목코드', type: 'string', width: 110, align: 'center', readOnly: true },
      { field: 'name', header: '품목명', type: 'string', width: 220, align: 'left', readOnly: true },
      { field: 'spec', header: '규격', type: 'string', width: 100, align: 'center', readOnly: true },
      ...(warehouses || []).map(w => {
        const whName = typeof w === 'string' ? w : w.name;
        return {
          field: `wh_${whName}`,
          header: whName,
          type: 'number',
          width: 110,
          align: 'right'
        };
      }),
      { field: 'totalInitialStock', header: '총 기초재고', type: 'number', width: 120, align: 'right', readOnly: true }
    ];
  }, [warehouses]);

  const data = useMemo(() => {
    return (products || []).map(p => {
      const row = {
        ...p,
        id: p.id,
        code: p.code || '',
        name: p.name || '',
        spec: p.spec || '',
        categoryLarge: p.categoryLarge || '',
        categoryMedium: p.categoryMedium || '',
        categorySmall: p.categorySmall || ''
      };
      let total = 0;
      (warehouses || []).forEach(w => {
        const whName = typeof w === 'string' ? w : w.name;
        const stock = getProductWarehouseInitialStock(p, whName, warehouses);
        row[`wh_${whName}`] = Number(stock) || 0;
        total += (Number(stock) || 0);
      });
      row.totalInitialStock = total;
      return row;
    });
  }, [products, warehouses]);

  const handleSave = async (updatedRows) => {
    if (onSaveAll) {
      const batchStockMap = {};
      updatedRows.forEach(row => {
        const whStock = {};
        (warehouses || []).forEach(w => {
          const whName = typeof w === 'string' ? w : w.name;
          whStock[whName] = Number(row[`wh_${whName}`]) || 0;
        });
        batchStockMap[row.id] = whStock;
      });
      await onSaveAll(batchStockMap);
      return;
    }

    const companyId = currentUser?.companyId || 'default';
    const batch = writeBatch(db);
    const updatedMap = new Map();

    updatedRows.forEach(row => {
      const currentWhStock = {};
      (warehouses || []).forEach(w => {
        const whName = typeof w === 'string' ? w : w.name;
        currentWhStock[whName] = Number(row[`wh_${whName}`]) || 0;
      });
      const totalInitial = Object.values(currentWhStock).reduce((sum, v) => sum + (Number(v) || 0), 0);

      const orig = (products || []).find(p => String(p.id) === String(row.id)) || row;
      const updatedProd = {
        ...orig,
        warehouseInitialStock: currentWhStock,
        initialStock: totalInitial,
        companyId,
        updatedAt: new Date().toISOString()
      };
      updatedMap.set(String(row.id), updatedProd);
      batch.set(doc(db, 'companies', companyId, 'products', String(row.id)), updatedProd, { merge: true });
    });

    await batch.commit();

    const nextProducts = (products || []).map(p => updatedMap.get(String(p.id)) || p);
    if (setProducts) setProducts(nextProducts);
    await saveBundle(companyId, 'products', nextProducts);
  };

  return (
    <BulkEditor
      type="warehouse_initial_stock"
      title="창고별 기초재고 일괄설정"
      columns={columns}
      data={data}
      categories={categories}
      warehouses={warehouses}
      onSave={handleSave}
      onClose={onClose}
      disableRowAddDelete={true}
    />
  );
};

export const BatchWarehouseInitialStockModal = WarehouseInitialStockModal;
export default WarehouseInitialStockModal;
