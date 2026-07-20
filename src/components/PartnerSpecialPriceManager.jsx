import React, { useState, useMemo } from 'react';
import { DollarSign, Printer, Download, Plus, Edit2, Trash2, Search, Filter, HelpCircle } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import './PartnerSpecialPrice.css';

const PartnerSpecialPriceManager = ({ onClose, partners = [], products = [], specialPrices = [], currentUser }) => {
  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    if (currentUser?.allowSpecialPriceSave === true) return true;
    return currentUser?.allowAllEditDelete === true;
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
    const product = products.find(p => String(p.id) === String(prodId));
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
        ? sp.partnerName.toLowerCase().includes(query) || sp.productName.toLowerCase().includes(query) || (sp.memo && sp.memo.toLowerCase().includes(query))
        : true;

      return matchPartner && matchProduct && matchSearch;
    });
  }, [specialPrices, filterPartnerId, filterProductId, searchText]);

  // Form handlers
  const handleOpenAddForm = () => {
    setEditingRecord(null);
    setFormPartnerId(partners[0]?.id || '');
    setFormProductId(products[0]?.id || '');
    setFormSpecialPrice('');
    setFormMemo('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (record) => {
    setEditingRecord(record);
    setFormPartnerId(record.partnerId);
    setFormProductId(record.productId);
    setFormSpecialPrice(String(record.specialPrice));
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

    const partner = partners.find(p => String(p.id) === String(formPartnerId));
    const product = products.find(p => String(p.id) === String(formProductId));

    if (!partner || !product) {
      alert('유효하지 않은 거래처 또는 품목입니다.');
      return;
    }

    try {
      const id = editingRecord ? String(editingRecord.id) : String(Date.now());
      const finalData = {
        id,
        partnerId: partner.id,
        partnerName: partner.name,
        productId: product.id,
        productName: product.name,
        specialPrice: priceNum,
        memo: formMemo.trim(),
        companyId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'specialPrices', id), finalData);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error saving special price:', err);
      alert('특별단가 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!window.confirm('정말 이 특별단가 설정을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'specialPrices', String(id)));
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
      <WindowModal title="거래처별 특별단가 관리" onClose={onClose}>
        <div className="special-price-header">
          <div className="sp-title-section">
            <h2 className="sp-title">
              <DollarSign color="#3b82f6" size={24} strokeWidth={2.5} />
              거래처별 특별단가 관리
            </h2>
            <p className="sp-desc">특정 거래처에 적용할 제품별 특별 공급단가를 설정하고 관리합니다.</p>
          </div>
          <div className="sp-actions">
            <button className="btn-outline sp-btn"><Printer size={16} /> 인쇄</button>
            <button className="btn-outline sp-btn" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
            <button className="btn-primary" onClick={handleOpenAddForm}>
              <Plus size={16} /> 특별단가 등록
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="sp-filter-panel">
          <div className="filter-group">
            <label className="filter-label">거래처 필터</label>
            <select 
              className="filter-select"
              value={filterPartnerId}
              onChange={(e) => setFilterPartnerId(e.target.value)}
            >
              <option value="">전체 거래처</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">품목 필터</label>
            <select 
              className="filter-select"
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
            >
              <option value="">전체 품목</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group search-group">
            <label className="filter-label">통합 검색</label>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="filter-search" 
                placeholder="거래처명, 품목명, 메모 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Grid Table */}
        <div className="sp-table-container">
          <table className="sp-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>거래처명</th>
                <th style={{ width: '22%' }}>품목명</th>
                <th style={{ width: '13%', textAlign: 'right' }}>정상판매가</th>
                <th style={{ width: '13%', textAlign: 'right' }}>특별단가</th>
                <th style={{ width: '12%', textAlign: 'right' }}>할인 혜택</th>
                <th style={{ width: '10%' }}>메모</th>
                <th style={{ width: '8%', textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecialPrices.length > 0 ? (
                filteredSpecialPrices.map(sp => {
                  const normal = getProductNormalPrice(sp.productId);
                  const discount = normal - sp.specialPrice;
                  const discountRate = normal > 0 ? Math.round((discount / normal) * 100) : 0;
                  
                  return (
                    <tr key={sp.id}>
                      <td className="bold-text">{sp.partnerName}</td>
                      <td>{sp.productName}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {normal > 0 ? `${normal.toLocaleString()}원` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#3b82f6' }}>
                        {sp.specialPrice.toLocaleString()}원
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {discount > 0 ? (
                          <span className="discount-tag">
                            -{discount.toLocaleString()}원 ({discountRate}%)
                          </span>
                        ) : discount < 0 ? (
                          <span className="discount-tag surcharge">
                            +{Math.abs(discount).toLocaleString()}원 (할증)
                          </span>
                        ) : (
                          <span className="discount-tag neutral">0원 (동일)</span>
                        )}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{sp.memo || '-'}</td>
                      <td>
                        <div className="sp-action-cell">
                          <button className="icon-btn" title="수정" onClick={() => handleOpenEditForm(sp)}>
                            <Edit2 size={15} />
                          </button>
                          <button className="icon-btn delete" title="삭제" onClick={() => handleDelete(sp.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                    등록된 특별단가 내역이 없거나 필터 조건에 맞는 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </WindowModal>

      {/* Form Modal overlay */}
      {isFormOpen && (
        <div className="sp-form-overlay">
          <div className="sp-form-dialog">
            <div className="sp-form-header">
              <h3>{editingRecord ? '특별단가 정보 수정' : '신규 특별단가 등록'}</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-body">
                <div className="form-item">
                  <label className="form-label">거래처 선택</label>
                  <select 
                    className="form-select"
                    value={formPartnerId}
                    onChange={(e) => setFormPartnerId(e.target.value)}
                    disabled={!!editingRecord}
                  >
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-item">
                  <label className="form-label">품목 선택</label>
                  <select 
                    className="form-select"
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    disabled={!!editingRecord}
                  >
                    {products.map(p => {
                      const normal = p.salesPrice || p.salesPriceSingle || 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} (정상가: {normal.toLocaleString()}원)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-item">
                  <label className="form-label">특별단가 설정</label>
                  <div className="price-input-wrapper">
                    <input 
                      type="number"
                      className="form-input text-right"
                      placeholder="특별단가 입력"
                      value={formSpecialPrice}
                      onChange={(e) => setFormSpecialPrice(e.target.value)}
                      required
                    />
                    <span className="price-unit">원</span>
                  </div>
                  <div className="form-help">
                    선택한 품목의 원래 정상 판매가: <strong>{getProductNormalPrice(formProductId).toLocaleString()}원</strong>
                  </div>
                </div>

                <div className="form-item">
                  <label className="form-label">적용 메모 (사유)</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="예: 연간 장기 계약 단가, 대량 납품 계약 등"
                    value={formMemo}
                    onChange={(e) => setFormMemo(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsFormOpen(false)}>취소</button>
                <button type="submit" className="btn-submit">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PartnerSpecialPriceManager;
