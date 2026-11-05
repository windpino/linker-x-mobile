import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Users, Printer, Plus, Edit2, Trash2, Phone, User, FileText, Search, Settings, X, Grid } from 'lucide-react';
import PartnerRegistration from './PartnerRegistration';
import BulkEditor from './BulkEditor';
import PartnerSettingsModal from './PartnerSettingsModal';
import WindowModal from './WindowModal';
import { ALL_COLUMNS } from '../constants/partnerColumns';
import { matchesInitialSound } from '../utils/koreanUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { saveBundle, deduplicatePartners } from '../utils/bundleSyncManager';
import './Partner.css';

const PartnerManagement = ({ 
  onClose, 
  staffList = [], 
  partners = [], 
  setPartners, 
  onOrder, 
  warehouses = [], 
  onOpenBulk, 
  currentUser, 
  isBulkOpen, 
  accounts = [],
  salesInvoices = [],
  purchaseInvoices = [],
  salesOrders = [],
  purchaseOrders = [],
  initialFilterType = 'all',
  initialFilterManager = 'all',
  logOperation
}) => {
  const isMobileView = true;
  const [colWidths, setColWidths] = useState({
    sequence: 60,
    type: 100,
    name: 180,
    ceo: 100,
    businessNo: 120,
    address: 200,
    phone: 120,
    mobile: 130,
    fax: 120,
    email: 150,
    manager: 100,
    warehouse: 120,
    bankAccount: 140,
    creditLimit: 120,
    receivables: 120,
    receivableBase: 120,
    grade: 110,
    loginId: 100,
    password: 100,
    hideOrderInfo: 80,
    hideAmountInInvoice: 80,
    memo: 150,
    control: 120
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
  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const safePartners = useMemo(() => {
    return deduplicatePartners(Array.isArray(partners) ? partners : []);
  }, [partners]);

  // [무한 루프 방지] 중복 정리 실행 가드 (동일한 파트너 수에 대해 중복 반복 실행 방지)
  const cleanedPartnersLengthRef = useRef(0);
  useEffect(() => {
    if (Array.isArray(partners) && safePartners.length < partners.length && currentUser?.companyId) {
      if (cleanedPartnersLengthRef.current === partners.length) return;
      cleanedPartnersLengthRef.current = partners.length;
      console.log(`[PartnerManagement] 🧹 Auto-cleaning duplicate partners (${partners.length} -> ${safePartners.length})`);
      setPartners(safePartners);
      saveBundle(currentUser.companyId, 'partners', safePartners).catch(console.warn);
    }
  }, [partners, safePartners, currentUser?.companyId, setPartners]);

  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [filterType, setFilterType] = useState(initialFilterType || 'all');
  const [filterManager, setFilterManager] = useState(initialFilterManager || 'all');
  const [confirmModal, setConfirmModal] = useState(null);
  const [clickManagerFilter, setClickManagerFilter] = useState(null); // set when badge is clicked
  const [draggedIndex, setDraggedIndex] = useState(null);

  // 30 days transaction lookup set
  const recentTransactedSet = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const names = new Set();
    const ids = new Set();

    const checkInvoice = (inv) => {
      const invDate = inv.date || inv.invoiceDate || (inv.createdAt ? inv.createdAt.split('T')[0] : '');
      if (invDate && invDate >= thirtyDaysAgoDateStr) {
        if (inv.partner) names.add(inv.partner.trim());
        if (inv.partnerName) names.add(inv.partnerName.trim());
        if (inv.partnerId) ids.add(String(inv.partnerId));
      }
    };

    (salesInvoices || []).forEach(checkInvoice);
    (purchaseInvoices || []).forEach(checkInvoice);
    (salesOrders || []).forEach(checkInvoice);
    (purchaseOrders || []).forEach(checkInvoice);

    return { names, ids, thirtyDaysAgo };
  }, [salesInvoices, purchaseInvoices, salesOrders, purchaseOrders]);

  // Search state
  const [hasSearched, setHasSearched] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(100);
  const [searchText, setSearchText] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState(null); // null = no selection
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const handleSearch = () => {
    setDisplayLimit(100);
    setHasSearched(true);
  };

  // Default visible columns matching registration form order (with robust local storage parsing)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('partnerVisibleColumns');
      if (saved) {
        if (saved.startsWith('[')) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } else {
          return saved.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    } catch (e) {
      console.error('Error parsing partnerVisibleColumns:', e);
    }
    return ['sequence', 'type', 'name', 'ceo', 'mobile', 'manager'];
  });

  React.useEffect(() => {
    localStorage.setItem('partnerVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Synchronize visible columns when bulk editor is closed
  useEffect(() => {
    if (!isBulkOpen) {
      try {
        const saved = localStorage.getItem('partnerVisibleColumns');
        if (saved) {
          let parsed;
          if (saved.startsWith('[')) {
            parsed = JSON.parse(saved);
          } else {
            parsed = saved.split(',').map(s => s.trim()).filter(Boolean);
          }
          if (Array.isArray(parsed)) {
            if (JSON.stringify(parsed) !== JSON.stringify(visibleColumns)) {
              setVisibleColumns(parsed);
            }
          }
        }
      } catch (e) {
        console.error('Error reloading partnerVisibleColumns:', e);
      }
    }
  }, [isBulkOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAmount = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString();
  };

  const handleOpenRegistration = () => {
    setEditingPartner(null);
    setIsRegistrationOpen(true);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setIsRegistrationOpen(true);
  };

  const handleSavePartner = async (partnerData) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      
      const finalData = {
        ...partnerData,
        id: Number(partnerData.id || Date.now()),
        companyId,
        manager: partnerData.manager || '-',
        updatedAt: new Date().toISOString()
      };

      // Check if a partner with the same name already exists
      const existingPartner = safePartners.find(p => 
        String(p.name || '').trim().toLowerCase() === String(finalData.name || '').trim().toLowerCase() &&
        String(p.id) !== String(finalData.id)
      );

      if (existingPartner && !editingPartner) {
        const confirmOverwrite = confirm(
          `'${finalData.name}' 거래처는 이미 등록되어 있습니다.\n\n` +
          `동일한 이름의 거래처가 2개 생기지 않도록 기존 거래처 정보를 수정하시겠습니까?\n\n` +
          `[확인]을 누르면 기존 거래처 정보가 업데이트됩니다.\n` +
          `[취소]를 누르면 중복 등록이 방지됩니다.`
        );
        if (!confirmOverwrite) {
          return;
        }
        finalData.id = existingPartner.id;
      }

      // Handle old document ID deletion if loginId or email changes
      if (editingPartner) {
        const oldDocId = editingPartner.loginId ? `${companyId}_${editingPartner.loginId}` : 
                         editingPartner.email ? `${companyId}_${editingPartner.email}` : 
                         String(editingPartner.id);
        const newDocId = finalData.loginId ? `${companyId}_${finalData.loginId}` : 
                         finalData.email ? `${companyId}_${finalData.email}` : 
                         String(finalData.id);
        if (oldDocId !== newDocId) {
          await deleteDoc(doc(db, 'companies', companyId, 'partners', oldDocId));
        }
      }
      
      // Update in local temporary array to calculate new sequences
      let tempPartners = safePartners.some(p => p.id === finalData.id)
        ? safePartners.map(p => p.id === finalData.id ? finalData : p)
        : [...safePartners, finalData];
      tempPartners = deduplicatePartners(tempPartners);
      
      // Sort tempPartners by sequence first so their relative order is preserved.
      // Pass finalData.id as explicitSaveId so it takes precedence on duplicate sequence clash!
      tempPartners = getSortedPartners(tempPartners, finalData.id);

      // Verify the entered sequence matches the new manager prefix
      const managerToSeq = {};
      safeStaffList.forEach(s => {
        if (s.sequence) managerToSeq[s.name] = s.sequence;
      });
      const managerName = partnerData.manager || '-';
      const mSeq = managerToSeq[managerName] || (managerName !== '-' ? managerName.charAt(0) : '0');
      const expectedPrefix = `${mSeq}-`;
      const isSequenceValid = partnerData.sequence && partnerData.sequence.startsWith(expectedPrefix);
      
      const withNewSequences = autoAssignSequences(
        tempPartners, 
        finalData.id, 
        isSequenceValid ? partnerData.sequence : null
      );
      
      // Save all updated sequences (and explicitly save the new/edited partner) to Firestore in a single batch
      setPartners(withNewSequences);
      await savePartnerSequences(withNewSequences, finalData.id);

      if (logOperation) {
        const isEdit = Boolean(editingPartner);
        await logOperation({
          category: isEdit ? '수정' : '등록',
          subCategory: '거래처',
          type: isEdit ? '수정' : '등록',
          title: isEdit ? `거래처 수정 (${finalData.name})` : `거래처 등록 (${finalData.name})`,
          detail: `거래처명: ${finalData.name} | 대표: ${finalData.ceo || '-'} | 담당자: ${finalData.manager || '-'} | 유형: ${finalData.type || '매출처'}`,
          user: currentUser?.name || '시스템',
          targetId: String(finalData.id)
        });
      }

      alert(editingPartner ? '거래처 정보가 수정되었습니다.' : '신규 거래처가 등록되었습니다.');
      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Partner save error:', err);
      alert('거래처 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const showConfirm = (message, onConfirm, confirmText = '확인') => {
    setConfirmModal({ message, onConfirm, confirmText });
  };

  const handleDeletePartner = (id) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    
    const deleteMessage = `거래처를 정말로 삭제하시겠습니까?\n\n💡 추천: 거래처를 완전히 삭제하기보다 '거래처 가리기' 기능을 이용하시는 것을 추천합니다.\n거래처를 삭제하더라도 기존 전표 및 내역은 안전하게 유지됩니다.\n\n(거래처 가리기는 거래처 정보 수정 창에서 '주문정보숨김'을 체크하여 언제든지 편리하게 숨기거나 다시 노출시킬 수 있습니다.)`;
    
    showConfirm(deleteMessage, async () => {
      try {
        const companyId = currentUser?.companyId || 'default';
        const partner = safePartners.find(p => String(p.id) === String(id));
        if (partner) {
          const possibleDocIds = [];
          if (partner.loginId) possibleDocIds.push(`${companyId}_${partner.loginId}`);
          if (partner.email) possibleDocIds.push(`${companyId}_${partner.email}`);
          possibleDocIds.push(String(partner.id));
          
          // Delete all possible document variations for this partner
          for (const docId of [...new Set(possibleDocIds)]) {
             await deleteDoc(doc(db, 'companies', companyId, 'partners', docId));
          }
        } else {
          await deleteDoc(doc(db, 'companies', companyId, 'partners', String(id)));
        }

        // Recalculate sequences for remaining partners and save
        const remainingPartners = safePartners.filter(p => String(p.id) !== String(id));
        const withNewSequences = autoAssignSequences(remainingPartners);
        await savePartnerSequences(withNewSequences);
        setPartners(withNewSequences);

        if (logOperation) {
          await logOperation({
            category: '삭제',
            subCategory: '거래처',
            type: '삭제',
            title: `거래처 삭제 (${partner?.name || id})`,
            detail: `거래처명: ${partner?.name || '-'} | 담당자: ${partner?.manager || '-'}`,
            user: currentUser?.name || '시스템',
            targetId: String(id)
          });
        }

      } catch (err) {
        console.error('Partner delete error:', err);
        alert('삭제 중 오류가 발생했습니다.');
      }
      setConfirmModal(null);
    }, '삭제');
  };

  const savePartnerSequences = async (updatedPartners, explicitSaveId = null) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      const cleanPartners = deduplicatePartners(updatedPartners);
      const batch = writeBatch(db);
      let hasChanges = false;

      cleanPartners.forEach(p => {
        const original = safePartners.find(orig => orig.id === p.id);
        const isExplicitSave = explicitSaveId !== null && Number(p.id) === Number(explicitSaveId);

        if (
          isExplicitSave ||
          !original || 
          original.sequence !== p.sequence || 
          original.manager !== p.manager ||
          original.hideOrderInfo !== p.hideOrderInfo
        ) {
          const docId = p.loginId ? `${companyId}_${p.loginId}` : 
                        p.email ? `${companyId}_${p.email}` : 
                        String(p.id);
          
          const cleanPartner = { ...p };
          delete cleanPartner._docId;

          batch.set(doc(db, 'companies', companyId, 'partners', docId), cleanPartner);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
        console.log('Successfully saved updated partner sequences to Firestore');
      }

      // 🛡️ Always sync bundle and local cache for instant 1-read and persistence across re-logins
      await saveBundle(companyId, 'partners', cleanPartners);
      localStorage.setItem(`partners_${companyId}`, JSON.stringify(cleanPartners));
      localStorage.setItem(`bundle_partners_${companyId}`, JSON.stringify(cleanPartners));
    } catch (err) {
      console.error('Error saving partner sequences to Firestore:', err);
    }
  };

  const getSortedPartners = (partnersList = safePartners, explicitSaveId = null) => {
    return [...partnersList].sort((a, b) => {
      // Put hidden partners at the very end
      if (a.hideOrderInfo && !b.hideOrderInfo) return 1;
      if (!a.hideOrderInfo && b.hideOrderInfo) return -1;

      const seqA = a.sequence || '';
      const seqB = b.sequence || '';
      if (seqA === '-' && seqB !== '-') return 1;
      if (seqA !== '-' && seqB === '-') return -1;
      
      const comp = seqA.localeCompare(seqB, undefined, { numeric: true, sensitivity: 'base' });
      if (comp === 0 && explicitSaveId !== null) {
        // If sequences are identical, place the explicitly saved partner first so it inserts and pushes others down
        if (Number(a.id) === Number(explicitSaveId)) return -1;
        if (Number(b.id) === Number(explicitSaveId)) return 1;
      }
      return comp;
    });
  };

  // Autocomplete suggestions: search by name (including 초성)
  const suggestions = searchText.trim()
    ? safePartners.filter(p => matchesInitialSound(p.name, searchText.trim()))
    : [];

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setSelectedPartnerName(null); // clear exact selection when typing again
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (name) => {
    setSelectedPartnerName(name);
    setSearchText(name);
    setShowSuggestions(false);
    setClickManagerFilter(null);
    setHasSearched(true);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSelectedPartnerName(null);
    setShowSuggestions(false);
  };

  const handleManagerChange = async (partnerId, newManager) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    const updatedPartners = safePartners.map(p => p.id === partnerId ? { ...p, manager: newManager } : p);
    const withNewSequences = autoAssignSequences(updatedPartners);
    setPartners(withNewSequences);
    await savePartnerSequences(withNewSequences);
  };

  const autoAssignSequences = (currentPartners, explicitSaveId = null, explicitSequence = null) => {
    const managerToSeq = {};
    safeStaffList.forEach(s => {
      if (s.sequence) managerToSeq[s.name] = s.sequence;
    });

    const updated = [...currentPartners];
    const managerCounts = {};

    const manualSequences = new Set();
    updated.forEach(p => {
      const isExplicit = explicitSaveId !== null && Number(p.id) === Number(explicitSaveId);
      if (isExplicit && explicitSequence) {
        p.sequence = explicitSequence;
        manualSequences.add(explicitSequence);
      }
    });

    updated.forEach(p => {
      // If partner is marked as hidden (관리안함/주문정보숨김), do not assign sequence and do not increment counters
      if (p.hideOrderInfo) {
        p.sequence = '-';
        return;
      }

      const isExplicit = explicitSaveId !== null && Number(p.id) === Number(explicitSaveId);
      if (isExplicit && explicitSequence) {
        return;
      }

      const managerName = p.manager || '-';
      const mSeq = managerToSeq[managerName];
      
      if (mSeq) {
        if (!managerCounts[managerName]) managerCounts[managerName] = 0;
        
        let count = managerCounts[managerName] + 1;
        let guard1 = 0;
        // [무한 루프 방지] 시퀀스 탐색 상한선 가드 (최대 10000회)
        while (manualSequences.has(`${mSeq}-${count}`) && guard1 < 10000) {
          count++;
          guard1++;
        }
        managerCounts[managerName] = count;
        p.sequence = `${mSeq}-${count}`;
      } else {
        if (!managerCounts[managerName]) managerCounts[managerName] = 0;
        
        let count = managerCounts[managerName] + 1;
        const prefix = managerName !== '-' ? managerName.charAt(0) : '0';
        let guard2 = 0;
        // [무한 루프 방지] 시퀀스 탐색 상한선 가드 (최대 10000회)
        while (manualSequences.has(`${prefix}-${count}`) && guard2 < 10000) {
          count++;
          guard2++;
        }
        managerCounts[managerName] = count;
        p.sequence = `${prefix}-${count}`;
      }
    });

    return updated;
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      setDraggedIndex(null);
      return;
    }
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const filteredList = getFilteredPartners();
    const draggedItem = filteredList[draggedIndex];
    const targetItem = filteredList[targetIndex];

    if (!draggedItem || !targetItem) {
      setDraggedIndex(null);
      return;
    }

    // Find actual indices in the main partners array (which is sorted)
    const sortedMainPartners = getSortedPartners();
    const actualDraggedIdx = sortedMainPartners.findIndex(p => p.id === draggedItem.id);
    const actualTargetIdx = sortedMainPartners.findIndex(p => p.id === targetItem.id);

    if (actualDraggedIdx === -1 || actualTargetIdx === -1) {
      setDraggedIndex(null);
      return;
    }

    const newPartners = [...sortedMainPartners];
    const [movedItem] = newPartners.splice(actualDraggedIdx, 1);
    newPartners.splice(actualTargetIdx, 0, movedItem);

    // After moving, re-assign all sequences based on the new global order
    const withNewSequences = autoAssignSequences(newPartners);
    setPartners(withNewSequences);
    await savePartnerSequences(withNewSequences);
    setDraggedIndex(null);
  };

  const getFilteredPartners = () => {
    return getSortedPartners().filter(partner => {
      // Logic for 'hidden' vs regular
      if (filterType === 'hidden' || filterType === '숨김') {
        if (!partner.hideOrderInfo) return false;
      } else {
        if (partner.hideOrderInfo) return false;
      }

      // If a suggestion was selected, show only that partner
      if (selectedPartnerName) {
        return partner.name === selectedPartnerName;
      }
      // If a manager badge was clicked
      if (clickManagerFilter !== null) {
        const pManagerNorm = (partner.manager || '').replace(/\s*\(.*?\)/g, '').trim();
        const cManagerNorm = (clickManagerFilter || '').replace(/\s*\(.*?\)/g, '').trim();
        if (cManagerNorm === '-' || cManagerNorm === '미지정') {
          return !pManagerNorm || pManagerNorm === '-' || pManagerNorm === '미지정';
        }
        return pManagerNorm === cManagerNorm;
      }

      // Type filter (롤박스)
      if (filterType && filterType !== 'all' && filterType !== '전체' && filterType !== 'hidden' && filterType !== '숨김') {
        if (filterType === '매입매출처') {
          if (partner.type !== '혼합' && partner.type !== '매입매출처') return false;
        } else if (filterType === 'newInMonth') {
          let isNew = false;
          if (partner.createdAt) isNew = new Date(partner.createdAt) >= recentTransactedSet.thirtyDaysAgo;
          else if (typeof partner.id === 'number' && partner.id > 1700000000000) isNew = new Date(partner.id) >= recentTransactedSet.thirtyDaysAgo;
          else if (partner.updatedAt) isNew = new Date(partner.updatedAt) >= recentTransactedSet.thirtyDaysAgo;
          if (!isNew) return false;
        } else if (filterType === 'noTransactionInMonth') {
          const pName = (partner.name || '').trim();
          const pId = String(partner.id || '');
          const hasRecent = (pName && recentTransactedSet.names.has(pName)) || (pId && recentTransactedSet.ids.has(pId));
          if (hasRecent) return false;
        } else {
          if (partner.type !== filterType) return false;
        }
      }

      // Manager filter (롤박스)
      if (filterManager && filterManager !== 'all' && filterManager !== '전체') {
        const pManagerNorm = (partner.manager || '').replace(/\s*\(.*?\)/g, '').trim();
        const fManagerNorm = (filterManager || '').replace(/\s*\(.*?\)/g, '').trim();
        if (fManagerNorm === '미지정' || fManagerNorm === '-') {
          if (pManagerNorm && pManagerNorm !== '-' && pManagerNorm !== '미지정') return false;
        } else {
          if (pManagerNorm !== fManagerNorm) return false;
        }
      }

      // Text search filter (no exact selection)
      if (searchText.trim()) {
        return matchesInitialSound(partner.name, searchText.trim());
      }
      return true;
    });
  };

  return (
    <>
      <WindowModal title="거래처 등록/관리" onClose={onClose} width="1100px" contentPadding="0" noScroll>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(88vh - 40px)', overflow: 'hidden', background: '#f8fafc' }}>
          
          {/* 모바일 최적화 헤더: [구분 필터 칩] + [➕ 신규 거래처 등록] */}
          <div style={{ padding: '12px 14px 10px 14px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
              {/* 구분 필터 칩 (전체, 매출처, 매입처) */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1 }}>
                {[
                  { id: 'all', label: '전체' },
                  { id: '매출처', label: '매출처' },
                  { id: '매입처', label: '매입처' },
                  { id: 'hidden', label: '숨김' }
                ].map(tab => {
                  const isActive = filterType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setFilterType(tab.id);
                        setSelectedPartnerName(null);
                        setClickManagerFilter(null);
                        setDisplayLimit(100);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: isActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                        color: isActive ? '#1d4ed8' : '#475569',
                        fontSize: '0.80rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: isActive ? '0 1px 4px rgba(37,99,235,0.15)' : 'none'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* [➕ 신규 등록] 버튼 */}
              <button 
                className="btn-primary" 
                onClick={handleOpenRegistration} 
                style={{ 
                  padding: '7px 12px', 
                  fontSize: '0.80rem', 
                  fontWeight: 800,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                }}
              >
                <Plus size={14} /> 거래처 등록
              </button>
            </div>

            {/* 거래처명 실시간 검색창 */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="거래처명 검색 (초성 'ㄱㄴ' 검색 가능)..."
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 30px 0 32px',
                  borderRadius: '20px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchText && (
                <button 
                  onClick={handleClearSearch} 
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* 거래처명 중심의 모바일 간소화 카드 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {(() => {
              const filteredPartners = getFilteredPartners();
              const displayedPartners = filteredPartners.slice(0, displayLimit);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* 건수 안내 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '0.74rem', color: '#64748b' }}>
                    <span>총 <strong>{filteredPartners.length}</strong>개 거래처</span>
                    {filterType !== 'all' && (
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>필터: {filterType}</span>
                    )}
                  </div>

                  {displayedPartners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <Building2 size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#334155' }}>등록된 거래처가 없습니다</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>우측 상단의 [거래처 등록] 버튼을 눌러 새로 등록해보세요.</div>
                    </div>
                  ) : (
                    displayedPartners.map(partner => {
                      const isMixed = partner.type === '혼합' || partner.type === '매입매출처';
                      const displayType = isMixed ? '매입매출처' : (partner.type || '매출처');
                      const phone = partner.phone || partner.mobile || '';

                      return (
                        <div 
                          key={partner.id} 
                          className="partner-card-simplified"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '7px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* 1. 최상단: 거래처명 (Bold & Large) + 구분 뱃지 */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', wordBreak: 'break-all' }}>
                                {partner.name}
                              </h4>
                              <span 
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: partner.type === '매입처' ? '#fee2e2' : (isMixed ? '#f3e8ff' : '#eff6ff'),
                                  color: partner.type === '매입처' ? '#dc2626' : (isMixed ? '#7e22ce' : '#1d4ed8')
                                }}
                              >
                                {displayType}
                              </span>
                              {partner.manager && partner.manager !== '-' && (
                                <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#475569', padding: '2px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  {partner.manager}
                                </span>
                              )}
                            </div>

                            {/* 미수금 잔액 (있을 때만 눈에 띄게 표시) */}
                            {Number(partner.receivables || 0) !== 0 && (
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block' }}>미수금</span>
                                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: Number(partner.receivables) > 0 ? '#dc2626' : '#2563eb' }}>
                                  {formatAmount(partner.receivables)}원
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2. 간결한 정보: 대표자 & 연락처 (누르면 바로 스마트폰 통화) */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.80rem' }}>
                            <div style={{ color: '#64748b' }}>
                              {partner.ceo ? `대표: ${partner.ceo}` : (partner.address ? partner.address.slice(0, 20) : '')}
                            </div>
                            {phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} color="#2563eb" />
                                <a 
                                  href={`tel:${phone.replace(/[^0-9]/g, '')}`} 
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', fontSize: '0.82rem' }}
                                >
                                  {phone}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* 3. 하단 빠른 액션 바: [수정] [삭제] [수주등록] */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '7px', borderTop: '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button 
                                type="button"
                                onClick={() => handleEditPartner(partner)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#334155',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit2 size={12} /> 수정
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeletePartner(partner.id); }}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                  border: '1px solid #fee2e2',
                                  background: '#fff5f5',
                                  color: '#ef4444',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={12} /> 삭제
                              </button>
                            </div>

                            {onOrder && (
                              <button 
                                type="button"
                                onClick={() => onOrder(partner)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                  color: '#ffffff',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 5px rgba(22, 163, 74, 0.2)'
                                }}
                              >
                                <FileText size={12} /> 수주등록
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* 더보기 버튼 */}
                  {filteredPartners.length > displayLimit && (
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                      <button
                        type="button"
                        onClick={() => setDisplayLimit(prev => prev + 100)}
                        style={{
                          padding: '8px 16px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        더보기 (+100개) <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({displayedPartners.length} / {filteredPartners.length}개)</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        </div>
      </WindowModal>
      {false && (
              <div className="partner-table-container">
                <table className="partner-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                        <th 
                          key={col.id} 
                          style={{ 
                            width: (colWidths[col.id] || 120) + 'px', 
                            position: 'relative', 
                            userSelect: 'none' 
                          }}
                        >
                          {col.label}
                          <span
                            onMouseDown={(e) => onResizeMouseDown(e, col.id)}
                            style={{
                              position: 'absolute', right: 0, top: 0, bottom: 0,
                              width: '6px', cursor: 'col-resize',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              zIndex: 2,
                            }}
                            title={`${col.label} 너비 조절`}
                          >
                            <span style={{
                              display: 'block', width: '0px', height: '100%',
                              borderLeft: '1px dotted #cbd5e1',
                            }} />
                          </span>
                        </th>
                      ))}
                      <th style={{ width: colWidths.control + 'px', position: 'relative', userSelect: 'none', textAlign: 'center' }}>
                        관리
                        <span
                          onMouseDown={(e) => onResizeMouseDown(e, 'control')}
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
                    {displayedPartners.map((partner, index) => (
                      <tr 
                        key={partner.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={draggedIndex === index ? 'dragging-row' : ''}
                        style={{ cursor: 'grab' }}
                      >
                        {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => {
                          const colId = col.id;
                          const value = partner[colId];
                          const cellWidth = (colWidths[colId] || 120) + 'px';
                          const baseStyle = {
                            width: cellWidth,
                            maxWidth: cellWidth,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle'
                          };

                          if (colId === 'sequence') {
                            return (
                              <td key={colId} style={{ ...baseStyle, textAlign: 'center', fontWeight: '700', color: '#3b82f6', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <Grid size={14} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '-'}</span>
                                </div>
                              </td>
                            );
                          }

                          if (colId === 'type') {
                            const isMixed = value === '혼합' || value === '매입매출처';
                            const displayValue = isMixed ? '매입매출처' : value;
                            return (
                              <td key={colId} style={baseStyle}>
                                <span className={value === '매입처' ? 'badge-red' : isMixed ? 'badge-purple' : 'badge-blue'} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                  {displayValue}
                                </span>
                              </td>
                            );
                          }

                          if (colId === 'name') {
                            return (
                              <td key={colId} style={baseStyle}><div className="partner-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span className="main-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span></div></td>
                            );
                          }

                          if (colId === 'phone' || colId === 'mobile') {
                            return (
                              <td key={colId} style={baseStyle}>
                                <div className="partner-phone" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Phone size={14} className="icon-blue" style={{ flexShrink: 0 }} />{value || '-'}</div>
                              </td>
                            );
                          }

                          if (colId === 'manager') {
                            return (
                              <td key={colId} style={baseStyle}>
                                <div className="partner-manager-inline" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <select value={value || '-'} onChange={(e) => handleManagerChange(partner.id, e.target.value)} className="inline-manager-select" style={{ paddingLeft: '12px', border: '1px solid transparent', background: 'transparent', fontSize: '0.875rem', color: '#1e293b', borderRadius: '4px', cursor: 'pointer', width: '100%', appearance: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.border = '1px solid #cbd5e1'} onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
                                    <option value="-">-</option>
                                    {safeStaffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                  </select>
                                </div>
                              </td>
                            );
                          }

                          if (colId === 'creditLimit' || colId === 'receivableBase' || colId === 'receivables') {
                            return (
                              <td key={colId} style={{ ...baseStyle, textAlign: 'right' }}>
                                {formatAmount(value)}원
                              </td>
                            );
                          }

                          if (colId === 'hideOrderInfo') {
                            return (
                              <td key={colId} style={{ ...baseStyle, textAlign: 'center' }}>
                                <span style={{ 
                                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                                  background: value ? '#f1f5f9' : '#ecfdf5',
                                  color: value ? '#64748b' : '#059669',
                                  flexShrink: 0
                                }}>
                                  {value ? '숨김' : '노출'}
                                </span>
                              </td>
                            );
                          }

                          if (colId === 'grade') {
                            return (
                              <td key={colId} style={{ ...baseStyle, textAlign: 'center' }}>
                                 <span style={{ 
                                   padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700,
                                   background: value === '1' ? '#eff6ff' : value === '2' ? '#fffbeb' : '#fef2f2',
                                   color: value === '1' ? '#1d4ed8' : value === '2' ? '#b45309' : '#dc2626',
                                   flexShrink: 0
                                 }}>
                                   {value === '1' ? '1등급' : value === '2' ? '2등급' : '3등급'}
                                  </span>
                              </td>
                            );
                          }

                          return (
                            <td key={colId} style={baseStyle}>{value || '-'}</td>
                          );
                        })}

                        <td style={{
                          width: (colWidths.control || 120) + 'px',
                          maxWidth: (colWidths.control || 120) + 'px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle'
                        }}>
                          <div className="partner-action-cell" style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button className="icon-btn" onClick={() => handleEditPartner(partner)}><Edit2 size={16} /></button>
                            <button className="icon-btn" type="button" onClick={(e) => { e.stopPropagation(); handleDeletePartner(partner.id); }}><Trash2 size={16} /></button>
                            <button className="btn-green-outline" onClick={() => onOrder(partner)} style={{ flexShrink: 0 }}><FileText size={14} /> 주문</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPartners.length === 0 && (
                      <tr><td colSpan={visibleColumns.length + 3} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>{searchText ? `"${searchText}" 검색 결과가 없습니다.` : '거래처가 없습니다.'}</td></tr>
                    )}
                  </tbody>
                </table>
                {hasSearched && filteredPartners.length > displayLimit && (
                  <div style={{ textAlign: 'center', margin: '16px 0 10px' }}>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(prev => prev + 100)}
                      style={{
                        padding: '10px 28px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      더보기 (+100개) <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>({displayedPartners.length} / {filteredPartners.length}개 표시 중)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

      {isRegistrationOpen && (
        <PartnerRegistration
          onClose={() => setIsRegistrationOpen(false)}
          initialData={editingPartner}
          onSave={handleSavePartner}
          staffList={safeStaffList}
          warehouses={warehouses}
          accounts={accounts}
        />
      )}

      {isSettingsOpen && (
        <PartnerSettingsModal
          onClose={() => setIsSettingsOpen(false)}
          initialVisibleColumns={visibleColumns}
          onSave={setVisibleColumns}
        />
      )}

      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '32px 28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', minWidth: '320px', maxWidth: '480px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>⚠️</div>
            <p style={{
              fontSize: '0.95rem',
              color: '#1e293b',
              fontWeight: 500,
              marginBottom: '24px',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              lineHeight: '1.6'
            }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  padding: '8px 24px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                }}
                onClick={() => setConfirmModal(null)}
              >
                취소
              </button>
              <button
                style={{
                  padding: '8px 24px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                }}
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
              >
                {confirmModal.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PartnerManagement;
