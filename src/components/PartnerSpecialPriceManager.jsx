import React, { useState, useMemo } from 'react';
import { DollarSign, Printer, Download, Plus, Edit2, Trash2, Search, Filter, HelpCircle } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import './PartnerSpecialPrice.css';

const PartnerSpecialPriceManager = ({ onClose, partners = [], products = [], specialPrices = [], setSpecialPrices, currentUser }) => {
  const hasWritePermission = () => {
    if (!currentUser) return true;
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin' || currentUser?.isAdmin) return true;
    if (currentUser?.permissions?.['특별단가관리'] === true || currentUser?.permissions?.특별단가관리 === true) return true;
    if (currentUser?.allowSpecialPriceSave === true) return true;
    if (currentUser?.allowAllEditDelete === true) return true;
    if (currentUser?.allowMasterEdit === true) return true;
    return true;
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Form states
  const [formPartnerId, setFormPartnerId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formSpecialPrice, setFormSpecialPrice] = useState('');
  const [formMemo, setFormMemo] = useState('');

  // Search and Filter states
  const [filterPartnerId, setFilterPartnerId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [searchText, setSearchText] = useState('');

  const companyId = currentUser?.companyId || 'default';

  // Format product price helper
  const getProductNormalPrice = (prodId) => {
    const product = products.find(p => String(p.id) === String(prodId) || p.name === prodId);
    if (!product) return 0;
    return product.salesPrice || product.salesPriceSingle || 0;
  };

  // Filtered special prices
  const filteredSpecialPrices = useMemo(() => {
    return specialPrices.filter(sp => {
      const matchPartner = filterPartnerId ? String(sp.partnerId) === String(filterPartnerId) : true;
      const matchProduct = filterProductId ? String(sp.productId) === String(filterProductId) : true;
      
      const query = searchText.toLowerCase().trim();
      const matchSearch = query 
        ? (sp.partnerName && sp.partnerName.toLowerCase().includes(query)) || (sp.productName && sp.productName.toLowerCase().includes(query)) || (sp.memo && sp.memo.toLowerCase().includes(query))
        : true;

      return matchPartner && matchProduct && matchSearch;
    });
  }, [specialPrices, filterPartnerId, filterProductId, searchText]);

  // Form handlers
  const handleOpenAddForm = () => {
    setEditingRecord(null);
    setFormPartnerId(partners[0]?.id ? String(partners[0].id) : '');
    setFormProductId(products[0]?.id ? String(products[0].id) : '');
    setFormSpecialPrice('');
    setFormMemo('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (record) => {
    setEditingRecord(record);
    const matchedPartner = partners.find(p => String(p.id) === String(record.partnerId) || p.name === record.partnerName);
    const matchedProduct = products.find(p => String(p.id) === String(record.productId) || p.name === record.productName);

    setFormPartnerId(matchedPartner ? String(matchedPartner.id) : (record.partnerId != null ? String(record.partnerId) : ''));
    setFormProductId(matchedProduct ? String(matchedProduct.id) : (record.productId != null ? String(record.productId) : ''));
    setFormSpecialPrice(String(record.specialPrice != null ? record.specialPrice : ''));
    setFormMemo(record.memo || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!formPartnerId || !formProductId || !formSpecialPrice) {
      alert('거래처, 품목 및 특별단가를 모두 입력해주세요.');
      return;
    }

    const priceNum = Number(formSpecialPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('특별단가는 0보다 큰 숫자여야 합니다.');
      return;
    }

    const partner = partners.find(p => String(p.id) === String(formPartnerId) || p.name === editingRecord?.partnerName);
    const product = products.find(p => String(p.id) === String(formProductId) || p.name === editingRecord?.productName);

    const partnerId = partner ? partner.id : (editingRecord?.partnerId || formPartnerId);
    const partnerName = partner ? partner.name : (editingRecord?.partnerName || '');
    const productId = product ? product.id : (editingRecord?.productId || formProductId);
    const productName = product ? product.name : (editingRecord?.productName || '');

    if (!partnerName || !productName) {
      alert('유효하지 않은 거래처 또는 품목입니다.');
      return;
    }

    try {
      const existingSP = (specialPrices || []).find(sp => 
        (String(sp.partnerId) === String(partnerId) || (sp.partnerName || '').trim() === partnerName.trim()) &&
        (String(sp.productId) === String(productId) || (sp.productName || '').trim() === productName.trim())
      );
      const targetDocId = editingRecord 
        ? String(editingRecord._docId || editingRecord.id || Date.now()) 
        : (existingSP ? String(existingSP._docId || existingSP.id) : String(Date.now()));

      const finalData = {
        id: targetDocId,
        _docId: targetDocId,
        partnerId,
        partnerName,
        productId,
        productName,
        specialPrice: priceNum,
        memo: formMemo.trim(),
        companyId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'specialPrices', targetDocId), finalData);

      if (setSpecialPrices) {
        setSpecialPrices(prev => {
          const filtered = prev.filter(sp => 
            String(sp._docId || sp.id) !== targetDocId && 
            !((String(sp.partnerId) === String(partnerId) || (sp.partnerName || '').trim() === partnerName.trim()) &&
              (String(sp.productId) === String(productId) || (sp.productName || '').trim() === productName.trim()))
          );
          return [...filtered, finalData];
        });
      }

      // LocalStorage 캐시 동기화
      const prefix = `_${companyId}`;
      const cached = JSON.parse(localStorage.getItem(`specialPrices${prefix}`)) || [];
      const updatedCache = [
        ...cached.filter(sp => 
          String(sp._docId || sp.id) !== targetDocId && 
          !((String(sp.partnerId) === String(partnerId) || (sp.partnerName || '').trim() === partnerName.trim()) &&
            (String(sp.productId) === String(productId) || (sp.productName || '').trim() === productName.trim()))
        ),
        finalData
      ];
      localStorage.setItem(`specialPrices${prefix}`, JSON.stringify(updatedCache));
      localStorage.setItem(`specialPrices_${companyId}`, JSON.stringify(updatedCache));

      setIsFormOpen(false);
    } catch (err) {
      console.error('Error saving special price:', err);
      alert('특별단가 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (recordOrId) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    const targetId = typeof recordOrId === 'object' && recordOrId !== null
      ? String(recordOrId._docId || recordOrId.id || '')
      : String(recordOrId || '');

    if (!targetId || targetId === 'undefined') {
      alert('삭제할 대상의 ID를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm('정말 이 특별단가 설정을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'specialPrices', targetId));
      if (setSpecialPrices) {
        setSpecialPrices(prev => prev.filter(sp => String(sp._docId || sp.id) !== targetId));
      }
      const prefix = `_${companyId}`;
      const cached = JSON.parse(localStorage.getItem(`specialPrices${prefix}`)) || [];
      const updatedCache = cached.filter(sp => String(sp._docId || sp.id) !== targetId);
      localStorage.setItem(`specialPrices${prefix}`, JSON.stringify(updatedCache));
      localStorage.setItem(`specialPrices_${companyId}`, JSON.stringify(updatedCache));
    } catch (err) {
      console.error('Error deleting special price:', err);
      alert('특별단가 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleExcelExport = () => {
    const columnMap = {
      partnerName: '거래처명',
      productName: '품목명',
      normalPrice: '정상판매가',
      specialPrice: '특별단가',
      discountAmount: '할인금액',
      discountRate: '할인율',
      memo: '메모',
      updatedAt: '최종수정일'
    };

    const exportData = filteredSpecialPrices.map(sp => {
      const normal = getProductNormalPrice(sp.productId);
      const discountAmt = normal - sp.specialPrice;
      const discountRate = normal > 0 ? `${Math.round((discountAmt / normal) * 100)}%` : '0%';
      return {
        ...sp,
        normalPrice: `${normal.toLocaleString()}원`,
        specialPrice: `${sp.specialPrice.toLocaleString()}원`,
        discountAmount: `${discountAmt.toLocaleString()}원`,
        discountRate,
        updatedAt: sp.updatedAt ? sp.updatedAt.split('T')[0] : '-'
      };
    });

    const formattedData = formatDataForExcel(exportData, columnMap);
    exportToExcel(formattedData, '거래처별_특별단가_목록');
  };

  return (
    <>
      <WindowModal title="거래처별 특별단가" onClose={onClose} width="100%" contentPadding="0" noScroll>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
          
          {/* Header: Title & Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={18} color="#3b82f6" strokeWidth={2.5} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                  거래처별 특별단가
                </h2>
                <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                  거래처별 맞춤 공급단가 관리
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={handleOpenAddForm}
                style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}
              >
                <Plus size={12} /> 등록
              </button>
              <button onClick={() => window.print()} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                <Printer size={12} />
              </button>
              <button onClick={handleExcelExport} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                <Download size={12} />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="거래처명, 품목명, 메모 검색..." 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)} 
                style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <select 
                value={filterPartnerId} 
                onChange={(e) => setFilterPartnerId(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="">전체 거래처</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select 
                value={filterProductId} 
                onChange={(e) => setFilterProductId(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="">전체 품목</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                등록된 특별단가 ({filteredSpecialPrices.length}건)
              </span>
            </div>

            {filteredSpecialPrices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                등록된 특별단가 내역이 없거나 조건에 맞는 데이터가 없습니다.
              </div>
            ) : (
              filteredSpecialPrices.map(sp => {
                const normal = getProductNormalPrice(sp.productId);
                const discount = normal - sp.specialPrice;
                const discountRate = normal > 0 ? Math.round((discount / normal) * 100) : 0;

                return (
                  <div key={sp.id} style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {/* Row 1: Partner Name & Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                        {sp.partnerName}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleOpenEditForm(sp)}
                          style={{ padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer' }}
                          title="수정"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDelete(sp)}
                          style={{ padding: '3px 6px', border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                          title="삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Product Name */}
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', backgroundColor: '#f8fafc', padding: '5px 8px', borderRadius: '6px' }}>
                      {sp.productName}
                    </div>

                    {/* Row 3: Prices & Discount Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          {normal > 0 ? `${normal.toLocaleString()}원` : '-'}
                        </span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#2563eb' }}>
                          {sp.specialPrice.toLocaleString()}원
                        </span>
                      </div>

                      <div>
                        {discount > 0 ? (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.68rem', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                            -{discount.toLocaleString()}원 ({discountRate}%)
                          </span>
                        ) : discount < 0 ? (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.68rem', fontWeight: 800, border: '1px solid #fecaca' }}>
                            +{Math.abs(discount).toLocaleString()}원 (할증)
                          </span>
                        ) : (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', fontWeight: 700 }}>
                            정상가 동일
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Memo if exists */}
                    {sp.memo && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 0' }}>
                        📝 {sp.memo}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </WindowModal>

      {/* Form Modal overlay for Mobile */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                {editingRecord ? '특별단가 정보 수정' : '신규 특별단가 등록'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>거래처 선택 (검색/선택)</label>
                {editingRecord ? (
                  <input 
                    type="text" 
                    readOnly 
                    value={editingRecord.partnerName || ''} 
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <PartnerSearchInput 
                      partners={partners}
                      value={partners.find(p => String(p.id) === String(formPartnerId))?.name || ''}
                      onSelect={(partner) => {
                        if (partner) {
                          setFormPartnerId(String(partner.id));
                        }
                      }}
                      placeholder="거래처 검색 (초성검색 가능)..."
                    />
                    <select 
                      value={formPartnerId} 
                      onChange={(e) => setFormPartnerId(e.target.value)} 
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- 목록에서 거래처 직접 선택 --</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                {(() => {
                  const selectedProduct = products.find(p => String(p.id) === String(formProductId) || p.name === editingRecord?.productName);
                  const normalPrice = selectedProduct ? (selectedProduct.salesPrice || selectedProduct.salesPriceSingle || 0) : 0;
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>품목 선택</label>
                        {selectedProduct && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                            현재단가: {normalPrice.toLocaleString()}원
                          </span>
                        )}
                      </div>
                      <select 
                        value={formProductId} 
                        onChange={(e) => setFormProductId(e.target.value)} 
                        disabled={!!editingRecord}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: editingRecord ? '#f1f5f9' : '#fff', boxSizing: 'border-box' }}
                      >
                        {editingRecord && !products.some(p => String(p.id) === String(formProductId)) && (
                          <option value={formProductId}>{editingRecord.productName || '선택된 품목'}</option>
                        )}
                        <option value="">-- 품목을 선택하세요 --</option>
                        {products.map(p => {
                          const normal = p.salesPrice || p.salesPriceSingle || 0;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.spec ? `(${p.spec})` : ''} [현재단가: {normal.toLocaleString()}원]
                            </option>
                          );
                        })}
                      </select>
                      {formProductId && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          marginTop: '6px'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>선택 품목 현재 기본단가</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                            {normalPrice.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                {(() => {
                  const selectedProduct = products.find(p => String(p.id) === String(formProductId) || p.name === editingRecord?.productName);
                  const normalPrice = selectedProduct ? (selectedProduct.salesPrice || selectedProduct.salesPriceSingle || 0) : 0;
                  const numSpecialPrice = Number(formSpecialPrice);
                  const isPriceValid = formSpecialPrice !== '' && !isNaN(numSpecialPrice) && numSpecialPrice > 0;
                  const discountAmount = normalPrice - (isPriceValid ? numSpecialPrice : 0);
                  const discountRate = (normalPrice > 0 && isPriceValid)
                    ? ((discountAmount / normalPrice) * 100).toFixed(1)
                    : null;

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>지정단가 (특별단가)</label>
                        {discountRate !== null && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: discountAmount > 0 ? '#eff6ff' : discountAmount < 0 ? '#fff7ed' : '#f1f5f9',
                            color: discountAmount > 0 ? '#2563eb' : discountAmount < 0 ? '#ea580c' : '#64748b',
                            border: discountAmount > 0 ? '1px solid #bfdbfe' : discountAmount < 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0'
                          }}>
                            {discountAmount > 0 ? (
                              <>할인율: {discountRate}% (-{discountAmount.toLocaleString()}원)</>
                            ) : discountAmount < 0 ? (
                              <>할증율: +{Math.abs(discountRate)}% (+{Math.abs(discountAmount).toLocaleString()}원)</>
                            ) : (
                              <>정상가 동일 (0.0%)</>
                            )}
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number"
                          placeholder="특별단가 입력"
                          value={formSpecialPrice}
                          onChange={(e) => setFormSpecialPrice(e.target.value)}
                          required
                          style={{ width: '100%', padding: '8px 28px 8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 800, textAlign: 'right', boxSizing: 'border-box' }}
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>원</span>
                      </div>
                      {isPriceValid && normalPrice > 0 && (
                        <div style={{
                          marginTop: '6px',
                          padding: '8px 10px',
                          backgroundColor: discountAmount > 0 ? '#eff6ff' : discountAmount < 0 ? '#fff7ed' : '#f8fafc',
                          borderRadius: '6px',
                          border: discountAmount > 0 ? '1px solid #bfdbfe' : discountAmount < 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                          fontSize: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#64748b' }}>
                            <span>기본 정상단가:</span>
                            <span style={{ textDecoration: 'line-through' }}>{normalPrice.toLocaleString()}원</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 800, color: discountAmount > 0 ? '#2563eb' : discountAmount < 0 ? '#ea580c' : '#1e293b' }}>
                            <span>지정 특별단가:</span>
                            <span>{numSpecialPrice.toLocaleString()}원</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '3px', fontWeight: 700, color: discountAmount > 0 ? '#1d4ed8' : discountAmount < 0 ? '#c2410c' : '#475569' }}>
                            <span>{discountAmount >= 0 ? '적용 할인율' : '적용 할증율'}:</span>
                            <span>{discountAmount >= 0 ? `-${discountAmount.toLocaleString()}원 (${discountRate}%)` : `+${Math.abs(discountAmount).toLocaleString()}원 (+${Math.abs(discountRate)}%)`}</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>적용 메모 (사유)</label>
                <input 
                  type="text"
                  placeholder="예: 장기 계약 단가, 대량 납품 등"
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  style={{ flex: 1, padding: '9px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PartnerSpecialPriceManager;
