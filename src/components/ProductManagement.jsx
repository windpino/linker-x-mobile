import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Package, Printer, Download, Search, Plus, Edit2, Trash2, Tag, Grid, Settings, Check, Save } from 'lucide-react';
import WindowModal from './WindowModal';
import ProductRegistration from './ProductRegistration';
import ProductCategoryModal from './ProductCategoryModal';
import { exportToExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import './Product.css';

const DEFAULT_COLUMNS = {
  photo: true,
  categoryLarge: true,
  categoryMedium: true,
  categorySmall: true,
  name: true,
  abbreviation: true,
  spec: true,
  innerQty: true,
  showInMall: true,
  optimalStock: true,
  initialStock: true,
  salesPrice: true,
  purchasePrice: true,
  barcode: true,
  memo: true,
  management: true
};

const ProductManagement = ({ onClose, products, setProducts, categories, setCategories, onOpenBulk, currentUser }) => {
  const [colWidths, setColWidths] = useState({
    photo: 80,
    categoryLarge: 100,
    categoryMedium: 100,
    categorySmall: 100,
    name: 200,
    spec: 100,
    innerQty: 90,
    showInMall: 100,
    optimalStock: 100,
    initialStock: 100,
    salesPrice: 140,
    purchasePrice: 120,
    barcode: 150,
    memo: 200,
    management: 100
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 40;

  const onResizeMouseDown = useCallback((e, colKey) => {
    e.preventDefault();
    resizingCol.current = colKey;
    resizeStartX.current = e.clientX;
    resizeStartW.current = colWidths[colKey] || 100;

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
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedLargeId, setSelectedLargeId] = useState('전체');
  const [selectedMediumId, setSelectedMediumId] = useState('전체');
  const [selectedSmallId, setSelectedSmallId] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [editedStocks, setEditedStocks] = useState({});

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLargeId, selectedMediumId, selectedSmallId]);
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('product_mgmt_columns');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge: keep saved preferences but ensure new default keys are included
      return { ...DEFAULT_COLUMNS, ...parsed };
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem('product_mgmt_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const toggleColumn = (col) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const handleInlineUpdate = async (id, field, value) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;
      
      const companyId = currentUser?.companyId || 'default';
      const updatedProduct = { ...product, [field]: value, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'companies', companyId, 'products', String(id)), updatedProduct, { merge: true });
    } catch (err) {
      console.error('Product inline update error:', err);
      alert('품목 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleStockChange = (productId, field, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    const numValue = Math.max(0, parseInt(cleanValue, 10) || 0);
    setEditedStocks(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: numValue
      }
    }));
  };

  const handleSaveEditedStocks = async () => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (Object.keys(editedStocks).length === 0) {
      alert('변경 사항이 없습니다.');
      return;
    }
    
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      
      Object.entries(editedStocks).forEach(([id, changes]) => {
        const product = products.find(p => p.id === Number(id));
        if (!product) return;
        
        const updatedProduct = { 
          ...product, 
          ...changes, 
          updatedAt: new Date().toISOString() 
        };
        batch.set(doc(db, 'companies', companyId, 'products', String(id)), updatedProduct, { merge: true });
      });
      
      await batch.commit();
      setEditedStocks({});
      alert('재고 수량 변경사항이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('Error saving edited stocks:', err);
      alert('재고 수량 저장 중 오류가 발생했습니다.');
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsRegistrationOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsRegistrationOpen(true);
  };

  const handleSaveProduct = async (productData) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const productId = editingProduct ? String(editingProduct.id) : String(Date.now());
      const finalData = { ...productData, id: Number(productId), companyId, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'companies', companyId, 'products', productId), finalData);
      alert(editingProduct ? '품목 정보가 수정되었습니다.' : '신규 품목이 등록되었습니다.');
      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Product save error:', err);
      alert('품목 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      await deleteDoc(doc(db, 'companies', companyId, 'products', String(id)));
    } catch (err) {
      console.error('Product delete error:', err);
      alert('품목 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleExcelExport = () => {
    const dataToExport = products.map(p => ({
      '카테고리': p.category,
      '상품명': p.name,
      '줄임말': p.abbreviation,
      '규격': p.spec,
      '내품수량': p.innerQty,
      '몰노출': p.showInMall ? 'Y' : 'N',
      '적정재고': p.optimalStock,
      '기초재고': p.initialStock || 0,
      '매출가': p.salesPrice,
      '매입가': p.purchasePrice,
      '낱개바코드': p.singleBarcode,
      '박스바코드': p.boxBarcode,
      '매출가(낱개)': p.salesPriceSingle || p.salesPrice || 0,
      '매출가(박스)': p.salesPriceBox || 0
    }));
    exportToExcel(dataToExport, '품목리스트');
  };

  // Precompute allowed descendant category names to avoid O(N * M) tree traversal in the filter loop
  const allowedCategoryNames = useMemo(() => {
    let activeCatId = null;
    if (selectedSmallId !== '전체') {
      activeCatId = selectedSmallId;
    } else if (selectedMediumId !== '전체') {
      activeCatId = selectedMediumId;
    } else if (selectedLargeId !== '전체') {
      activeCatId = selectedLargeId;
    }
    
    if (!activeCatId) return null;
    
    const allowedNames = new Set();
    const visited = new Set();
    
    const getDescendants = (parentId) => {
      const parentIdStr = String(parentId);
      if (visited.has(parentIdStr)) return;
      visited.add(parentIdStr);
      
      categories.forEach(c => {
        if (c.parentId && String(c.parentId) === parentIdStr) {
          allowedNames.add(c.name.trim().toLowerCase());
          getDescendants(c.id);
        }
      });
    };
    
    const activeCat = categories.find(c => String(c.id) === String(activeCatId));
    if (activeCat) {
      allowedNames.add(activeCat.name.trim().toLowerCase());
      getDescendants(activeCat.id);
      return allowedNames;
    }
    return null;
  }, [selectedLargeId, selectedMediumId, selectedSmallId, categories]);

  // Memoize filtered products list
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    return products.filter(p => {
      const matchesSearch = !term ||
        p.name.toLowerCase().includes(term) ||
        (p.abbreviation && p.abbreviation.toLowerCase().includes(term)) ||
        (p.categoryLarge && p.categoryLarge.toLowerCase().includes(term)) ||
        (p.categoryMedium && p.categoryMedium.toLowerCase().includes(term)) ||
        (p.categorySmall && p.categorySmall.toLowerCase().includes(term)) ||
        (p.singleBarcode && p.singleBarcode.toLowerCase().includes(term)) ||
        (p.boxBarcode && p.boxBarcode.toLowerCase().includes(term));
      
      if (!matchesSearch) return false;
      
      if (allowedCategoryNames) {
        const pLarge = (p.categoryLarge || '').trim().toLowerCase();
        const pMedium = (p.categoryMedium || '').trim().toLowerCase();
        const pSmall = (p.categorySmall || '').trim().toLowerCase();
        const pCat = (p.category || '').trim().toLowerCase();
        
        const hasMatchingPathPart = pCat.split('>').some(part => allowedCategoryNames.has(part.trim().toLowerCase()));
        
        return allowedCategoryNames.has(pLarge) || 
               allowedCategoryNames.has(pMedium) || 
               allowedCategoryNames.has(pSmall) || 
               allowedCategoryNames.has(pCat) || 
               hasMatchingPathPart;
      }
      
      return true;
    });
  }, [products, searchTerm, allowedCategoryNames]);

  // Slice to paginate products for 60fps DOM rendering performance
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Determine pagination buttons
  const pageNumbers = useMemo(() => {
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const allInMallChecked = filteredProducts.length > 0 && filteredProducts.every(p => p.showInMall !== false);

  const handleToggleAllMallExposure = async (checked) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      filteredProducts.forEach(p => {
        const ref = doc(db, 'companies', companyId, 'products', String(p.id));
        batch.update(ref, { showInMall: checked, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    } catch (err) {
      console.error('Bulk mall exposure update error:', err);
      alert('일괄 노출 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <WindowModal title="품목 등록/관리" onClose={onClose} width="1100px" contentPadding="0" noScroll>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(85vh - 40px)' }}>
          <div style={{ padding: 'clamp(12px, 2vw, 24px)', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <div className="product-header" style={{ marginBottom: '16px' }}>
              <div className="prod-title-section">
                <h2 className="prod-title">
                  <Package color="#3b82f6" size={24} strokeWidth={2} />
                  품목 등록/관리
                </h2>
                <p className="prod-desc">상품의 상세 정보를 등록하고 관리합니다.</p>
              </div>
              
              <div className="prod-actions">
                <div className="prod-search-box" style={{ position: 'relative' }}>
                  <Search size={18} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="상품명, 카테고리, 바코드 검색" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && !categories.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                      color: '#ef4444', fontSize: '0.75rem', fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      * 등록되지 않은 카테고리명입니다.
                    </div>
                  )}
                </div>
                
                <button 
                  ref={settingsRef}
                  className="btn-outline" 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                  style={{ position: 'relative' }}
                >
                  <Settings size={16} /> 설정
                  {isSettingsOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100,
                      width: '200px', padding: '12px'
                    }} onClick={e => e.stopPropagation()}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textAlign: 'left' }}>항목 표시 설정</p>
                      {[
                        { id: 'photo', label: '상품 사진' },
                        { id: 'categoryLarge', label: '대분류' },
                        { id: 'categoryMedium', label: '중분류' },
                        { id: 'categorySmall', label: '소분류' },
                        { id: 'name', label: '상품명' },
                        { id: 'abbreviation', label: '상품약칭' },
                        { id: 'spec', label: '규격' },
                        { id: 'innerQty', label: '내품수량' },
                        { id: 'showInMall', label: '몰 노출' },
                        { id: 'optimalStock', label: '적정재고량' },
                        { id: 'initialStock', label: '기초재고수량' },
                        { id: 'salesPrice', label: '매출가' },
                        { id: 'purchasePrice', label: '매입가' },
                        { id: 'barcode', label: '바코드' },
                        { id: 'memo', label: '상품 설명' }
                      ].map(col => (
                        <div key={col.id} onClick={() => toggleColumn(col.id)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px', borderRadius: '6px', cursor: 'pointer',
                          backgroundColor: visibleColumns[col.id] ? '#eff6ff' : 'transparent',
                          transition: 'all 0.1s', marginBottom: '2px'
                        }}>
                          <span style={{ fontSize: '0.85rem', color: visibleColumns[col.id] ? '#1d4ed8' : '#475569', fontWeight: 500 }}>{col.label}</span>
                          {visibleColumns[col.id] && <Check size={14} color="#1d4ed8" />}
                        </div>
                      ))}
                    </div>
                  )}
                </button>

                <button className="btn-outline" onClick={() => window.print()}>
                  <Printer size={16} /> 인쇄
                </button>
                <button className="btn-outline" onClick={handleExcelExport}>
                  <Download size={16} /> 엑셀
                </button>
                
                <button 
                  className="btn-primary" 
                  onClick={handleSaveEditedStocks} 
                  disabled={Object.keys(editedStocks).length === 0}
                  style={Object.keys(editedStocks).length === 0 ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8' } : { backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  <Save size={16} /> 저장
                </button>

                <button className="btn-primary" onClick={handleAddProduct}>
                  <Plus size={16} /> 품목 추가
                </button>
              </div>
            </div>

            {/* Category Filter Dropdowns */}
            <div className="product-category-filters" style={{ 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'center', 
              paddingBottom: '4px',
              flexWrap: 'wrap',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>대분류</span>
                <select
                  value={selectedLargeId}
                  onChange={(e) => {
                    setSelectedLargeId(e.target.value);
                    setSelectedMediumId('전체');
                    setSelectedSmallId('전체');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    minWidth: '140px',
                    height: '38px'
                  }}
                >
                  <option value="전체">전체</option>
                  {categories.filter(c => String(c.level) === '1' || !c.parentId).sort((a,b) => (a.order||0) - (b.order||0)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>중분류</span>
                <select
                  disabled={selectedLargeId === '전체'}
                  value={selectedMediumId}
                  onChange={(e) => {
                    setSelectedMediumId(e.target.value);
                    setSelectedSmallId('전체');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: selectedLargeId === '전체' ? '#f8fafc' : '#fff',
                    color: selectedLargeId === '전체' ? '#94a3b8' : '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: selectedLargeId === '전체' ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    minWidth: '140px',
                    height: '38px'
                  }}
                >
                  <option value="전체">전체</option>
                  {categories.filter(c => String(c.level) === '2' && String(c.parentId) === String(selectedLargeId)).sort((a,b) => (a.order||0) - (b.order||0)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>소분류</span>
                <select
                  disabled={selectedMediumId === '전체'}
                  value={selectedSmallId}
                  onChange={(e) => setSelectedSmallId(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: selectedMediumId === '전체' ? '#f8fafc' : '#fff',
                    color: selectedMediumId === '전체' ? '#94a3b8' : '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: selectedMediumId === '전체' ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    minWidth: '140px',
                    height: '38px'
                  }}
                >
                  <option value="전체">전체</option>
                  {categories.filter(c => String(c.level) === '3' && String(c.parentId) === String(selectedMediumId)).sort((a,b) => (a.order||0) - (b.order||0)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <button 
                className="cat-tab add-cat"
                onClick={() => setIsCategoryModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  background: '#eff6ff',
                  color: '#3b82f6',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '38px',
                  boxShadow: '0 1px 2px rgba(59, 130, 246, 0.05)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
              >
                <Plus size={14} strokeWidth={3} />
                관리
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(8px, 2vw, 24px)', paddingTop: '16px' }}>
            <div className="product-table-container">
              <table className="product-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    {[
                      { key: 'photo', label: '사진', visible: visibleColumns.photo, align: 'center' },
                      { key: 'categoryLarge', label: '대분류', visible: visibleColumns.categoryLarge, align: 'left' },
                      { key: 'categoryMedium', label: '중분류', visible: visibleColumns.categoryMedium, align: 'left' },
                      { key: 'categorySmall', label: '소분류', visible: visibleColumns.categorySmall, align: 'left' },
                      { key: 'name', label: '상품명', visible: visibleColumns.name, align: 'left' },
                      { key: 'spec', label: '규격', visible: visibleColumns.spec, align: 'left' },
                      { key: 'innerQty', label: '내품수량', visible: visibleColumns.innerQty, align: 'center' },
                      { 
                        key: 'showInMall', 
                        label: (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>몰 노출</span>
                            <input 
                              type="checkbox" 
                              checked={allInMallChecked}
                              onChange={(e) => handleToggleAllMallExposure(e.target.checked)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                              onClick={e => e.stopPropagation()}
                              title="전체 선택/해제"
                            />
                          </div>
                        ),
                        visible: visibleColumns.showInMall, 
                        align: 'center' 
                      },
                      { key: 'optimalStock', label: '적정재고', visible: visibleColumns.optimalStock, align: 'center' },
                      { key: 'initialStock', label: '기초재고', visible: visibleColumns.initialStock, align: 'center' },
                      { key: 'salesPrice', label: '매출가(낱/박)', visible: visibleColumns.salesPrice, align: 'right' },
                      { key: 'purchasePrice', label: '매입가', visible: visibleColumns.purchasePrice, align: 'right' },
                      { key: 'barcode', label: '바코드', visible: visibleColumns.barcode, align: 'left' },
                      { key: 'memo', label: '상품 설명', visible: visibleColumns.memo, align: 'left' },
                    ].filter(col => col.visible).map(col => (
                      <th 
                        key={col.key} 
                        style={{ 
                          width: (colWidths[col.key] || 100) + 'px', 
                          position: 'relative', 
                          userSelect: 'none',
                          textAlign: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left'
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
                          title={`${typeof col.label === 'string' ? col.label : '몰 노출'} 너비 조절`}
                        >
                          <span style={{
                            display: 'block', width: '0px', height: '100%',
                            borderLeft: '1px dotted #cbd5e1',
                          }} />
                        </span>
                      </th>
                    ))}
                    <th style={{ width: colWidths.management + 'px', position: 'relative', userSelect: 'none', textAlign: 'center' }}>
                      관리
                      <span
                        onMouseDown={(e) => onResizeMouseDown(e, 'management')}
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0,
                          width: '6px', cursor: 'col-resize',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 2,
                        }}
                        title="관리 너비 조절"
                      >
                        <span style={{
                          display: 'block', width: '0px', height: '100%',
                          borderLeft: '1px dotted #cbd5e1',
                        }} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map(product => {
                    const getCellStyle = (colKey, extra = {}) => {
                      const w = (colWidths[colKey] || 100) + 'px';
                      return {
                        width: w,
                        maxWidth: w,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                        ...extra
                      };
                    };

                    return (
                      <tr key={product.id}>
                        {visibleColumns.photo && (
                          <td style={getCellStyle('photo', { textAlign: 'center' })}>
                            <div className="prod-photo-cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                              {product.photos && product.photos.length > 0 ? (
                                <img src={product.photos[0]} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                              ) : product.photo ? (
                                <img src={product.photo} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                              ) : (
                                <Package size={20} color="#cbd5e1" />
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.categoryLarge && (
                          <td style={getCellStyle('categoryLarge')}><span className="prod-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }}>{product.categoryLarge || '-'}</span></td>
                        )}
                        {visibleColumns.categoryMedium && (
                          <td style={getCellStyle('categoryMedium')}><span className="prod-badge" style={{ backgroundColor: '#eff6ff', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }}>{product.categoryMedium || '-'}</span></td>
                        )}
                        {visibleColumns.categorySmall && (
                          <td style={getCellStyle('categorySmall')}><span className="prod-badge" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }}>{product.categorySmall || '-'}</span></td>
                        )}
                        {visibleColumns.name && (
                          <td style={getCellStyle('name')}>
                            <div className="prod-name-cell" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span className="main-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: 600 }}>{product.name}</span>
                              {visibleColumns.abbreviation && product.abbreviation && <span className="sub-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontSize: '0.8rem', color: '#64748b' }}>{product.abbreviation}</span>}
                            </div>
                          </td>
                        )}
                        {visibleColumns.spec && <td style={getCellStyle('spec')}>{product.spec || '-'}</td>}
                        {visibleColumns.innerQty && <td style={getCellStyle('innerQty', { textAlign: 'center' })}>{product.innerQty || 1}</td>}
                        {visibleColumns.showInMall && (
                          <td style={getCellStyle('showInMall', { textAlign: 'center' })}>
                            <input 
                              type="checkbox" 
                              checked={product.showInMall !== false} 
                              onChange={(e) => handleInlineUpdate(product.id, 'showInMall', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        {visibleColumns.optimalStock && (
                          <td style={getCellStyle('optimalStock', { textAlign: 'center' })}>
                            <input 
                              type="text" 
                              lang="ko"
                              inputMode="numeric"
                              value={editedStocks[product.id]?.optimalStock !== undefined ? editedStocks[product.id].optimalStock : (product.optimalStock || 0)}
                              onChange={(e) => handleStockChange(product.id, 'optimalStock', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedStocks()}
                              style={{ 
                                width: '100%', 
                                textAlign: 'center', 
                                padding: '4px', 
                                borderRadius: '4px', 
                                border: editedStocks[product.id]?.optimalStock !== undefined ? '1px solid #10b981' : '1px solid #e2e8f0', 
                                backgroundColor: editedStocks[product.id]?.optimalStock !== undefined ? '#f0fdf4' : 'white',
                                fontSize: '0.85rem' 
                              }}
                            />
                          </td>
                        )}
                        {visibleColumns.initialStock && (
                          <td style={getCellStyle('initialStock', { textAlign: 'center' })}>
                            <input 
                              type="text" 
                              lang="ko"
                              inputMode="numeric"
                              value={editedStocks[product.id]?.initialStock !== undefined ? editedStocks[product.id].initialStock : (product.initialStock || 0)}
                              onChange={(e) => handleStockChange(product.id, 'initialStock', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedStocks()}
                              style={{ 
                                width: '100%', 
                                textAlign: 'center', 
                                padding: '4px', 
                                borderRadius: '4px', 
                                border: editedStocks[product.id]?.initialStock !== undefined ? '1px solid #10b981' : '1px solid #e2e8f0', 
                                backgroundColor: editedStocks[product.id]?.initialStock !== undefined ? '#f0fdf4' : 'white',
                                fontSize: '0.85rem' 
                              }}
                            />
                          </td>
                        )}
                        {visibleColumns.salesPrice && (
                          <td style={getCellStyle('salesPrice', { textAlign: 'right' })}>
                            {product.isBoxOnly ? (
                              <div style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(product.salesPriceBox || 0).toLocaleString()}원(박스)</div>
                            ) : (
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(product.salesPriceSingle || product.salesPrice || 0).toLocaleString()}원</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(product.salesPriceBox || 0).toLocaleString()}원(박스)</div>
                              </div>
                            )}
                          </td>
                        )}
                        {visibleColumns.purchasePrice && (
                          <td style={getCellStyle('purchasePrice', { textAlign: 'right', color: '#64748b' })}>{product.purchasePrice.toLocaleString()}원</td>
                        )}
                        {visibleColumns.barcode && (
                          <td style={getCellStyle('barcode')}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.singleBarcode || '-'} (낱개)</div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.boxBarcode || '-'} (박스)</div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.memo && (
                          <td style={getCellStyle('memo')}>
                            <div style={{ fontSize: '0.8rem', color: '#475569', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.memo}>
                              {product.memo || '-'}
                            </div>
                          </td>
                        )}
                        <td style={getCellStyle('management', { textAlign: 'center' })}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className="icon-btn" onClick={() => handleEditProduct(product)}><Edit2 size={16} /></button>
                            <button className="icon-btn" onClick={() => handleDeleteProduct(product.id)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>
                        <Package size={48} style={{ opacity: 0.2, marginBottom: '12px', color: '#ef4444' }} />
                        <p style={{ fontWeight: 600 }}>
                          {searchTerm ? `'${searchTerm}'에 해당하는 검색 결과가 없습니다.` : '등록된 품목이 없습니다.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Beautiful Pagination Bar */}
          {totalItems > 0 && (
            <div className="prod-pagination">
              <div className="prod-pagination-info">
                전체 <b>{totalItems}</b>개 품목 중 <b>{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(totalItems, currentPage * itemsPerPage)}</b> 표시
              </div>
              <div className="prod-pagination-controls">
                <button 
                  className="prod-page-btn" 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  title="첫 페이지"
                >
                  &lt;&lt;
                </button>
                <button 
                  className="prod-page-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1}
                  title="이전 페이지"
                >
                  &lt;
                </button>
                
                {pageNumbers.map(page => (
                  <button 
                    key={page}
                    className={`prod-page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="prod-page-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages}
                  title="다음 페이지"
                >
                  &gt;
                </button>
                <button 
                  className="prod-page-btn" 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages}
                  title="마지막 페이지"
                >
                  &gt;&gt;
                </button>
              </div>
              <div style={{ width: '150px', textAlign: 'right', fontWeight: 600 }}>
                페이지당 {itemsPerPage}개씩 보기
              </div>
            </div>
          )}
        </div>
      </WindowModal>

      {isRegistrationOpen && (
        <ProductRegistration 
          onClose={() => setIsRegistrationOpen(false)}
          onSave={handleSaveProduct}
          onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
          categories={categories}
          initialData={editingProduct}
        />
      )}

      {isCategoryModalOpen && (
        <ProductCategoryModal 
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          setCategories={setCategories}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default ProductManagement;
