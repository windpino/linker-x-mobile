import React, { useState, useMemo } from 'react';
import { 
  DollarSign, Printer, Download, Plus, Edit2, Trash2, Search, Filter, 
  HelpCircle, RotateCcw, User, Clock, Building2, Package, Tag, Warehouse as WarehouseIcon
} from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { exportToExcel, formatDataForExcel } from '../utils/excelUtils';
import { matchesInitialSound } from '../utils/koreanUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import './PartnerSpecialPrice.css';

const PartnerSpecialPriceManager = ({ 
  onClose, 
  partners = [], 
  products = [], 
  specialPrices = [], 
  setSpecialPrices, 
  currentUser,
  categories = [],
  warehouses = [],
  staffList = []
}) => {
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

  // 1. Search and Filter states
  const [filterCategory, setFilterCategory] = useState('전체');
  const [filterManager, setFilterManager] = useState('전체');
  const [filterWarehouse, setFilterWarehouse] = useState('전체');
  const [filterSupplier, setFilterSupplier] = useState('전체');
  const [filterCustomer, setFilterCustomer] = useState('전체');
  const [searchPartner, setSearchPartner] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchText, setSearchText] = useState('');

  const companyId = currentUser?.companyId || 'default';
  const isRestricted = currentUser?.restrictPartnerSearch && currentUser?.name && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && currentUser?.userId !== 'admin';

  const visiblePartners = useMemo(() => {
    if (!isRestricted) return partners;
    return partners.filter(p => (p.manager || '').trim() === (currentUser.name || '').trim());
  }, [partners, isRestricted, currentUser]);

  // Options for filter dropdowns
  const categoryOptions = useMemo(() => {
    const set = new Set();
    (categories || []).forEach(c => {
      const name = typeof c === 'string' ? c : (c.name || c.category);
      if (name && name !== '전체') set.add(name);
    });
    (products || []).forEach(p => {
      if (p.category && p.category !== '기타' && p.category !== '-') set.add(p.category);
      if (p.categoryLarge && p.categoryLarge !== '-') set.add(p.categoryLarge);
    });
    return Array.from(set).sort();
  }, [categories, products]);

  const managerOptions = useMemo(() => {
    const set = new Set();
    (staffList || []).forEach(s => { if (s.name) set.add(s.name); });
    (partners || []).forEach(p => { if (p.manager && p.manager !== '-' && p.manager !== '미지정') set.add(p.manager); });
    (specialPrices || []).forEach(sp => {
      if (sp.updatedBy && sp.updatedBy !== '시스템') set.add(sp.updatedBy);
      if (sp.creator && sp.creator !== '시스템') set.add(sp.creator);
    });
    return Array.from(set).sort();
  }, [staffList, partners, specialPrices]);

  const warehouseOptions = useMemo(() => {
    const set = new Set();
    (warehouses || []).forEach(w => { if (w.name) set.add(w.name); });
    (products || []).forEach(p => { if (p.warehouse && p.warehouse !== '-') set.add(p.warehouse); });
    return Array.from(set).sort();
  }, [warehouses, products]);

  const supplierOptions = useMemo(() => {
    const set = new Set();
    (partners || []).forEach(p => {
      if (p.type === '매입처' || p.type === '혼합' || p.type === '공통' || p.type === '매입매출처' || p.type === 'supplier') {
        if (p.name) set.add(p.name);
      }
    });
    (products || []).forEach(p => {
      const sup = p.mainPartner || p.supplier;
      if (sup && sup !== '-') set.add(sup);
    });
    return Array.from(set).sort();
  }, [partners, products]);

  const customerOptions = useMemo(() => {
    return (visiblePartners || []).filter(p => 
      p.type === '매출처' || p.type === '혼합' || p.type === '공통' || p.type === '매입매출처' || p.type === 'customer' || !p.type
    );
  }, [visiblePartners]);

  // Format product price helper
  const getProductNormalPrice = (prodId) => {
    const product = products.find(p => String(p.id) === String(prodId) || p.name === prodId);
    if (!product) return 0;
    return product.salesPrice || product.salesPriceSingle || 0;
  };

  // Filtered special prices
  const filteredSpecialPrices = useMemo(() => {
    const visiblePartnerIds = isRestricted ? new Set(visiblePartners.map(p => String(p.id))) : null;

    return (specialPrices || []).filter(sp => {
      if (isRestricted && visiblePartnerIds && !visiblePartnerIds.has(String(sp.partnerId))) {
        return false;
      }

      const prod = (products || []).find(p => String(p.id) === String(sp.productId) || p.name === sp.productName);
      const part = (partners || []).find(p => String(p.id) === String(sp.partnerId) || p.name === sp.partnerName);

      // 1. 카테고리 필터
      if (filterCategory && filterCategory !== '전체') {
        const prodCat = prod?.category || prod?.categoryLarge || '';
        const prodMed = prod?.categoryMedium || '';
        if (prodCat !== filterCategory && prodMed !== filterCategory && !prodCat.includes(filterCategory)) {
          return false;
        }
      }

      // 2. 담당별 필터 (거래처 담당자 또는 지정자/수정자 매칭)
      if (filterManager && filterManager !== '전체') {
        const partMgr = (part?.manager || '').trim();
        const spUpd = (sp.updatedBy || sp.designatedBy || '').trim();
        const spCrt = (sp.creator || sp.createdBy || '').trim();
        if (partMgr !== filterManager && spUpd !== filterManager && spCrt !== filterManager) {
          return false;
        }
      }

      // 3. 창고별 필터
      if (filterWarehouse && filterWarehouse !== '전체') {
        const prodWh = prod?.warehouse || '';
        const partWh = part?.warehouse || '';
        if (prodWh !== filterWarehouse && partWh !== filterWarehouse) {
          return false;
        }
      }

      // 4. 매입처별 필터
      if (filterSupplier && filterSupplier !== '전체') {
        const prodSup = prod?.mainPartner || prod?.supplier || '';
        if (prodSup !== filterSupplier && !prodSup.includes(filterSupplier)) {
          return false;
        }
      }

      // 5. 매출처별 필터
      if (filterCustomer && filterCustomer !== '전체') {
        if (String(sp.partnerId) !== String(filterCustomer) && sp.partnerName !== filterCustomer) {
          return false;
        }
      }

      // 6. 거래처명 검색 (초성 지원)
      if (searchPartner.trim()) {
        const q = searchPartner.trim();
        const pName = sp.partnerName || '';
        if (!pName.toLowerCase().includes(q.toLowerCase()) && !matchesInitialSound(pName, q)) {
          return false;
        }
      }

      // 7. 품목명 검색 (초성 지원)
      if (searchProduct.trim()) {
        const q = searchProduct.trim();
        const prName = sp.productName || '';
        if (!prName.toLowerCase().includes(q.toLowerCase()) && !matchesInitialSound(prName, q)) {
          return false;
        }
      }

      // 8. 통합 검색 (메모, 지정자 등)
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const pMatch = sp.partnerName && (sp.partnerName.toLowerCase().includes(q) || matchesInitialSound(sp.partnerName, q));
        const prMatch = sp.productName && (sp.productName.toLowerCase().includes(q) || matchesInitialSound(sp.productName, q));
        const mMatch = sp.memo && sp.memo.toLowerCase().includes(q);
        const uMatch = (sp.updatedBy && sp.updatedBy.toLowerCase().includes(q)) || (sp.creator && sp.creator.toLowerCase().includes(q));
        if (!pMatch && !prMatch && !mMatch && !uMatch) return false;
      }

      return true;
    });
  }, [specialPrices, products, partners, filterCategory, filterManager, filterWarehouse, filterSupplier, filterCustomer, searchPartner, searchProduct, searchText, isRestricted, visiblePartners]);

  // Reset all filters
  const handleResetFilters = () => {
    setFilterCategory('전체');
    setFilterManager('전체');
    setFilterWarehouse('전체');
    setFilterSupplier('전체');
    setFilterCustomer('전체');
    setSearchPartner('');
    setSearchProduct('');
    setSearchText('');
  };

  // Form handlers
  const handleOpenAddForm = () => {
    setEditingRecord(null);
    const initialPartnerId = visiblePartners[0]?.id ? String(visiblePartners[0].id) : '';
    const initialProductId = products[0]?.id ? String(products[0].id) : '';
    const initialNormalPrice = products[0] ? (products[0].salesPrice || products[0].salesPriceSingle || 0) : 0;

    setFormPartnerId(initialPartnerId);
    setFormProductId(initialProductId);
    // 신규 등록 시에도 기존 품목지정금액으로 자동 초기화
    setFormSpecialPrice(initialNormalPrice > 0 ? String(initialNormalPrice) : '');
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

      const now = new Date();
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
        createdAt: editingRecord?.createdAt || existingSP?.createdAt || now.toISOString(),
        creator: editingRecord?.creator || existingSP?.creator || currentUser?.name || '시스템',
        updatedAt: now.toISOString(),
        updatedBy: currentUser?.name || '시스템',
        designatedDate: now.toISOString().split('T')[0],
        designatedBy: currentUser?.name || '시스템'
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

  // 특별단가 삭제 시: 기존 품목지정금액(정상판매가)으로 입력 및 복원
  const handleDelete = async (recordOrId) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    const record = typeof recordOrId === 'object' && recordOrId !== null
      ? recordOrId
      : (specialPrices || []).find(sp => String(sp._docId || sp.id) === String(recordOrId));

    const targetId = record 
      ? String(record._docId || record.id || '') 
      : String(recordOrId || '');

    if (!targetId || targetId === 'undefined') {
      alert('삭제할 대상의 ID를 찾을 수 없습니다.');
      return;
    }

    const normalPrice = getProductNormalPrice(record?.productId || '');
    const currentPrice = Number(record?.specialPrice || 0);

    // 특별단가가 기존 품목지정금액과 다를 때 -> 기존 품목지정금액으로 입력 및 복원
    if (currentPrice !== normalPrice && normalPrice > 0) {
      const confirmMsg = `해당 특별단가 설정을 삭제하고 기존 품목 지정금액(${normalPrice.toLocaleString()}원)으로 입력(복원)하시겠습니까?\n\n` +
        `• 거래처: ${record?.partnerName || '-'}\n` +
        `• 품목: ${record?.productName || '-'}\n` +
        `• 변경 전 단가: ${currentPrice.toLocaleString()}원 ➔ 변경 후: ${normalPrice.toLocaleString()}원\n\n` +
        `[확인]: 기존 품목지정금액으로 변경 및 저장\n[취소]: 취소`;

      if (!window.confirm(confirmMsg)) return;

      try {
        const now = new Date();
        const updatedData = {
          ...record,
          specialPrice: normalPrice,
          memo: record?.memo ? `${record.memo} (기존 지정금액으로 복원)` : '기존 품목지정금액으로 복원',
          updatedAt: now.toISOString(),
          updatedBy: currentUser?.name || '시스템',
          designatedDate: now.toISOString().split('T')[0],
          designatedBy: currentUser?.name || '시스템'
        };

        await setDoc(doc(db, 'companies', companyId, 'specialPrices', targetId), updatedData);

        if (setSpecialPrices) {
          setSpecialPrices(prev => prev.map(sp => String(sp._docId || sp.id) === targetId ? updatedData : sp));
        }

        // LocalStorage 동기화
        const prefix = `_${companyId}`;
        const cached = JSON.parse(localStorage.getItem(`specialPrices${prefix}`)) || [];
        const updatedCache = cached.map(sp => String(sp._docId || sp.id) === targetId ? updatedData : sp);
        localStorage.setItem(`specialPrices${prefix}`, JSON.stringify(updatedCache));
        localStorage.setItem(`specialPrices_${companyId}`, JSON.stringify(updatedCache));

        alert(`기존 품목 지정금액(${normalPrice.toLocaleString()}원)으로 정상 변경되었습니다.`);
        return;
      } catch (err) {
        console.error('Error reverting special price:', err);
        alert('특별단가 변경 중 오류가 발생했습니다.');
        return;
      }
    }

    // 이미 기존 품목지정금액과 동일하거나 정상가가 0인 경우 -> 특별단가 목록에서 완전 삭제 확인
    if (!window.confirm('현재 특별단가가 이미 기존 품목지정금액과 동일합니다.\n특별단가 관리 목록에서 완전히 삭제(제거)하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'companies', companyId, 'specialPrices', targetId));
      if (setSpecialPrices) {
        setSpecialPrices(prev => prev.filter(sp => String(sp._docId || sp.id) !== targetId));
      }

      // LocalStorage 캐시 동기화
      const prefix = `_${companyId}`;
      const cached = JSON.parse(localStorage.getItem(`specialPrices${prefix}`)) || [];
      const updatedCache = cached.filter(sp => String(sp._docId || sp.id) !== targetId);
      localStorage.setItem(`specialPrices${prefix}`, JSON.stringify(updatedCache));
      localStorage.setItem(`specialPrices_${companyId}`, JSON.stringify(updatedCache));
      alert('특별단가 설정이 완전히 삭제되었습니다.');
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
      designatedBy: '지정자',
      designatedDate: '특별단가 지정일자'
    };

    const exportData = filteredSpecialPrices.map(sp => {
      const normal = getProductNormalPrice(sp.productId);
      const discountAmt = normal - sp.specialPrice;
      const discountRate = normal > 0 ? `${Math.round((discountAmt / normal) * 100)}%` : '0%';
      const designatedDate = (sp.designatedDate || sp.updatedAt || sp.createdAt || '-').split('T')[0];
      const designatedBy = sp.designatedBy || sp.updatedBy || sp.creator || '시스템';
      return {
        ...sp,
        normalPrice: `${normal.toLocaleString()}원`,
        specialPrice: `${sp.specialPrice.toLocaleString()}원`,
        discountAmount: `${discountAmt.toLocaleString()}원`,
        discountRate,
        designatedBy,
        designatedDate
      };
    });

    const formattedData = formatDataForExcel(exportData, columnMap);
    exportToExcel(formattedData, '거래처별_특별단가_목록');
  };

  return (
    <>
      <WindowModal title="거래처별 특별단가 관리" onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign color="#3b82f6" size={18} strokeWidth={2.5} />
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                특별단가 관리
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={handleOpenAddForm}
                style={{ padding: '5px 10px', fontSize: '0.74rem', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}
              >
                <Plus size={13} /> 등록
              </button>
              <button onClick={() => window.print()} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }} title="인쇄">
                <Printer size={13} />
              </button>
              <button onClick={handleExcelExport} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }} title="엑셀">
                <Download size={13} />
              </button>
            </div>
          </div>

          {/* Enhanced Filter Panel: 카테고리, 담당별, 창고별, 매입처별, 매출처별, 거래처명 검색 */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Search 1: 거래처명 검색 (초성 지원) & 품목명 검색 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="거래처명 검색 (초성 가능)" 
                  value={searchPartner} 
                  onChange={(e) => setSearchPartner(e.target.value)} 
                  style={{ width: '100%', padding: '5px 8px 5px 26px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="품목명 검색 (초성 가능)" 
                  value={searchProduct} 
                  onChange={(e) => setSearchProduct(e.target.value)} 
                  style={{ width: '100%', padding: '5px 8px 5px 26px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                />
              </div>
            </div>

            {/* Filter Dropdowns: 카테고리 & 담당별 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체">전체 카테고리</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                value={filterManager} 
                onChange={(e) => setFilterManager(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체">전체 담당자</option>
                {managerOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filter Dropdowns: 창고별, 매입처별, 매출처별 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <select 
                value={filterWarehouse} 
                onChange={(e) => setFilterWarehouse(e.target.value)}
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체">전체 창고</option>
                {warehouseOptions.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <select 
                value={filterSupplier} 
                onChange={(e) => setFilterSupplier(e.target.value)}
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체">전체 매입처</option>
                {supplierOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select 
                value={filterCustomer} 
                onChange={(e) => setFilterCustomer(e.target.value)}
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="전체">전체 매출처</option>
                {customerOptions.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Search 2: 통합 검색 & 초기화 */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="통합 검색 (메모, 지정자 등)..." 
                  value={searchText} 
                  onChange={(e) => setSearchText(e.target.value)} 
                  style={{ width: '100%', padding: '5px 8px 5px 26px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                />
              </div>
              <button 
                type="button" 
                onClick={handleResetFilters}
                style={{ padding: '5px 8px', fontSize: '0.72rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                <RotateCcw size={12} /> 초기화
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                특별단가 목록 ({filteredSpecialPrices.length}건)
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
                const designatedDate = (sp.designatedDate || sp.updatedAt || sp.createdAt || '-').split('T')[0];
                const designatedBy = sp.designatedBy || sp.updatedBy || sp.creator || '시스템';

                return (
                  <div key={sp.id || sp._docId} style={{
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
                          title="특별단가 삭제 (기존 품목지정금액으로 복원)"
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
                            기존금액 동일
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

                    {/* Row 5: 특별단가 지정일자 맨 뒤에 표시 & 지정자 표시 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #f1f5f9', paddingTop: '5px', fontSize: '0.72rem', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <User size={11} color="#64748b" />
                        지정자: <strong style={{ color: '#334155' }}>{designatedBy}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} color="#94a3b8" />
                        지정일자: <strong style={{ color: '#1e293b' }}>{designatedDate}</strong>
                      </span>
                    </div>
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
                      partners={visiblePartners}
                      value={visiblePartners.find(p => String(p.id) === String(formPartnerId))?.name || ''}
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
                      {visiblePartners.map(p => (
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
                            기존지정가: {normalPrice.toLocaleString()}원
                          </span>
                        )}
                      </div>
                      <select 
                        value={formProductId} 
                        onChange={(e) => {
                          const newProdId = e.target.value;
                          setFormProductId(newProdId);
                          const prod = products.find(p => String(p.id) === String(newProdId));
                          if (prod) {
                            const norm = prod.salesPrice || prod.salesPriceSingle || 0;
                            if (!formSpecialPrice || formSpecialPrice === '0' || !editingRecord) {
                              setFormSpecialPrice(String(norm));
                            }
                          }
                        }} 
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
                              {p.name} {p.spec ? `(${p.spec})` : ''} [기존지정가: {normal.toLocaleString()}원]
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
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>선택 품목 기존 품목지정금액</span>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>지정단가 (특별단가)</label>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {normalPrice > 0 && (
                            <button 
                              type="button" 
                              onClick={() => setFormSpecialPrice(String(normalPrice))}
                              style={{
                                padding: '2px 6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                cursor: 'pointer'
                              }}
                              title="기존 품목지정금액으로 입력"
                            >
                              기존금액 입력
                            </button>
                          )}
                          {discountRate !== null && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: discountAmount > 0 ? '#eff6ff' : discountAmount < 0 ? '#fff7ed' : '#f1f5f9',
                              color: discountAmount > 0 ? '#2563eb' : discountAmount < 0 ? '#ea580c' : '#64748b',
                              border: discountAmount > 0 ? '1px solid #bfdbfe' : discountAmount < 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0'
                            }}>
                              {discountAmount > 0 ? (
                                <>할인 {discountRate}%</>
                              ) : discountAmount < 0 ? (
                                <>할증 +{Math.abs(discountRate)}%</>
                              ) : (
                                <>동일 (0%)</>
                              )}
                            </span>
                          )}
                        </div>
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
                          padding: '7px 10px',
                          backgroundColor: discountAmount > 0 ? '#eff6ff' : discountAmount < 0 ? '#fff7ed' : '#f8fafc',
                          borderRadius: '6px',
                          border: discountAmount > 0 ? '1px solid #bfdbfe' : discountAmount < 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                          fontSize: '0.74rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#64748b' }}>
                            <span>기본 정상지정가:</span>
                            <span style={{ textDecoration: 'line-through' }}>{normalPrice.toLocaleString()}원</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 800, color: discountAmount > 0 ? '#2563eb' : discountAmount < 0 ? '#ea580c' : '#1e293b' }}>
                            <span>지정 특별단가:</span>
                            <span>{numSpecialPrice.toLocaleString()}원</span>
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

              {editingRecord && (
                <div style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}>
                  <div>• 지정자: <strong>{editingRecord.creator || '시스템'}</strong> ({editingRecord.createdAt ? editingRecord.createdAt.split('T')[0] : '-'})</div>
                  <div>• 최종수정: <strong>{editingRecord.updatedBy || editingRecord.creator || '시스템'}</strong> ({editingRecord.updatedAt ? editingRecord.updatedAt.split('T')[0] : '-'})</div>
                </div>
              )}

              {editingRecord && (
                <button 
                  type="button" 
                  onClick={() => {
                    const selectedProduct = products.find(p => String(p.id) === String(formProductId) || p.name === editingRecord?.productName);
                    const normalPrice = selectedProduct ? (selectedProduct.salesPrice || selectedProduct.salesPriceSingle || 0) : 0;
                    setFormSpecialPrice(String(normalPrice));
                    setFormMemo(prev => prev ? `${prev} (기존 지정금액으로 복원)` : '기존 품목지정금액으로 복원');
                  }}
                  style={{
                    padding: '7px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: '#fff1f2',
                    color: '#e11d48',
                    border: '1px solid #fecdd3',
                    cursor: 'pointer'
                  }}
                >
                  특별단가 삭제 (기존금액 복원)
                </button>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
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
