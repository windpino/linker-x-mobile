/**
 * productStockUtils.js
 * Linker-X Product Warehouse Initial Stock Helpers
 */

/**
 * Returns the initial stock of a product for a specific warehouse.
 * Supports warehouseInitialStock mapping: { [warehouseName]: number }
 * with seamless fallback to legacy product.initialStock.
 */
export const getProductWarehouseInitialStock = (product, warehouseName, warehouses = []) => {
  if (!product || !warehouseName || warehouseName === '전체 창고') return 0;

  // 1. If explicit warehouseInitialStock is set for this warehouse
  if (product.warehouseInitialStock && product.warehouseInitialStock[warehouseName] !== undefined) {
    const val = Number(product.warehouseInitialStock[warehouseName]);
    return isNaN(val) ? 0 : val;
  }

  // 2. Legacy fallback:
  // If warehouseInitialStock is completely unset or has no keys
  const isMainWarehouse = (whName) => whName === warehouses[0]?.name || whName === '본사창고';
  if (!product.warehouseInitialStock || Object.keys(product.warehouseInitialStock).length === 0) {
    if (product.warehouse) {
      if (product.warehouse === warehouseName) return Number(product.initialStock) || 0;
    } else if (isMainWarehouse(warehouseName)) {
      return Number(product.initialStock) || 0;
    }
  }

  return 0;
};

/**
 * Returns the total initial stock of a product across all warehouses.
 */
export const getProductTotalInitialStock = (product, warehouses = []) => {
  if (!product) return 0;
  if (product.warehouseInitialStock && Object.keys(product.warehouseInitialStock).length > 0) {
    return Object.values(product.warehouseInitialStock).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }
  return Number(product.initialStock) || 0;
};
