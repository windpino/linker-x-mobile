import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Edit2, Trash2, FileText, Search, X,
  Lock, Unlock, KeyRound, GripVertical, Building2
} from 'lucide-react';
import PartnerRegistration from './PartnerRegistration';
import PartnerSettingsModal from './PartnerSettingsModal';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { db } from '../firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { saveBundle, deduplicatePartners } from '../utils/bundleSyncManager';
import './Partner.css';

const PartnerManagement = ({
  onClose,
  staffList = [],
  partners = [],
  setPartners,
  onOrder,
  warehouses = [],
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
  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const safePartners = useMemo(() => {
    return deduplicatePartners(Array.isArray(partners) ? partners : []);
  }, [partners]);

  // [무한 루프 방지] 중복 정리 실행 가드
  const cleanedPartnersLengthRef = useRef(0);
  useEffect(() => {
    if (Array.isArray(partners) && safePartners.length < partners.length && currentUser?.companyId) {
      if (cleanedPartnersLengthRef.current === partners.length) return;
      cleanedPartnersLengthRef.current = partners.length;
      setPartners(safePartners);
      saveBundle(currentUser.companyId, 'partners', safePartners).catch(console.warn);
    }
  }, [partners, safePartners, currentUser?.companyId, setPartners]);

  const hasWritePermission = () => {
    return true;
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [filterType, setFilterType] = useState(initialFilterType || 'all');
  const [filterManager, setFilterManager] = useState(() => {
    if (initialFilterManager && initialFilterManager !== 'all') return initialFilterManager;
    return 'all';
  });
  const [confirmModal, setConfirmModal] = useState(null);
  const [clickManagerFilter, setClickManagerFilter] = useState(null);

  // 열쇠(잠금/해제) 상태 및 드래그앤드롭 상태
  const [isReorderUnlocked, setIsReorderUnlocked] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const touchDragIdxRef = useRef(null);
  const touchOverIdxRef = useRef(null);

  // 검색 상태
  const [displayLimit, setDisplayLimit] = useState(200);
  const [searchText, setSearchText] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('partnerVisibleColumns');
      if (saved && saved.startsWith('[')) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return ['sequence', 'type', 'name', 'ceo', 'mobile', 'manager'];
  });

  const handleOpenRegistration = () => {
    setEditingPartner(null);
    setIsRegistrationOpen(true);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setIsRegistrationOpen(true);
  };

  // 거래처 정렬 함수 (sortOrder 최우선 -> sequence 순번 정렬)
  const getSortedPartners = useCallback((partnersList = safePartners, explicitSaveId = null) => {
    return [...partnersList].sort((a, b) => {
      if (a.hideOrderInfo && !b.hideOrderInfo) return 1;
      if (!a.hideOrderInfo && b.hideOrderInfo) return -1;

      const hasSortA = a.sortOrder !== undefined && a.sortOrder !== null && !isNaN(Number(a.sortOrder));
      const hasSortB = b.sortOrder !== undefined && b.sortOrder !== null && !isNaN(Number(b.sortOrder));
      if (hasSortA && hasSortB && Number(a.sortOrder) !== Number(b.sortOrder)) {
        return Number(a.sortOrder) - Number(b.sortOrder);
      }

      const seqA = String(a.sequence || '');
      const seqB = String(b.sequence || '');
      if (seqA === '-' && seqB !== '-') return 1;
      if (seqA !== '-' && seqB === '-') return -1;
      if (!seqA && seqB) return 1;
      if (seqA && !seqB) return -1;

      const comp = seqA.localeCompare(seqB, undefined, { numeric: true, sensitivity: 'base' });
      if (comp === 0 && explicitSaveId !== null) {
        if (Number(a.id) === Number(explicitSaveId)) return -1;
        if (Number(b.id) === Number(explicitSaveId)) return 1;
      }
      return comp;
    });
  }, [safePartners]);

  // 순번(sequence 및 sortOrder) 자동 부여 함수
  const autoAssignSequences = useCallback((currentPartners, explicitSaveId = null, explicitSequence = null) => {
    const managerToSeq = {};
    safeStaffList.forEach(s => {
      if (s.sequence) managerToSeq[s.name] = s.sequence;
    });

    const updated = currentPartners.map(p => ({ ...p }));
    const managerCounts = {};
    const manualSequences = new Set();

    updated.forEach(p => {
      const isExplicit = explicitSaveId !== null && Number(p.id) === Number(explicitSaveId);
      if (isExplicit && explicitSequence) {
        p.sequence = explicitSequence;
        manualSequences.add(explicitSequence);
      }
    });

    let activeOrderCounter = 1;
    updated.forEach(p => {
      if (p.hideOrderInfo) {
        p.sequence = '-';
        p.sortOrder = 999999;
        return;
      }

      p.sortOrder = activeOrderCounter++;

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
        while (manualSequences.has(`${prefix}-${count}`) && guard2 < 10000) {
          count++;
          guard2++;
        }
        managerCounts[managerName] = count;
        p.sequence = `${prefix}-${count}`;
      }
    });

    return updated;
  }, [safeStaffList]);

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
          original.sortOrder !== p.sortOrder ||
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
      }

      await saveBundle(companyId, 'partners', cleanPartners);
      localStorage.setItem(`partners_${companyId}`, JSON.stringify(cleanPartners));
      localStorage.setItem(`bundle_partners_${companyId}`, JSON.stringify(cleanPartners));
    } catch (err) {
      console.error('Error saving partner sequences to Firestore:', err);
    }
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
        manager: partnerData.manager && partnerData.manager !== '-'
          ? partnerData.manager
          : (filterManager !== 'all' && filterManager !== '미지정' ? filterManager : (partnerData.manager || '-')),
        updatedAt: new Date().toISOString()
      };

      const existingPartner = safePartners.find(p =>
        String(p.name || '').trim().toLowerCase() === String(finalData.name || '').trim().toLowerCase() &&
        String(p.id) !== String(finalData.id)
      );

      if (existingPartner && !editingPartner) {
        const confirmOverwrite = confirm(
          `'${finalData.name}' 거래처는 이미 등록되어 있습니다.\n\n기존 거래처 정보를 업데이트하시겠습니까?`
        );
        if (!confirmOverwrite) return;
        finalData.id = existingPartner.id;
      }

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

      let tempPartners = safePartners.some(p => p.id === finalData.id)
        ? safePartners.map(p => p.id === finalData.id ? finalData : p)
        : [...safePartners, finalData];
      tempPartners = deduplicatePartners(tempPartners);
      tempPartners = getSortedPartners(tempPartners, finalData.id);

      const managerToSeq = {};
      safeStaffList.forEach(s => {
        if (s.sequence) managerToSeq[s.name] = s.sequence;
      });
      const managerName = finalData.manager || '-';
      const mSeq = managerToSeq[managerName] || (managerName !== '-' ? managerName.charAt(0) : '0');
      const expectedPrefix = `${mSeq}-`;
      const isSequenceValid = partnerData.sequence && partnerData.sequence.startsWith(expectedPrefix);

      const withNewSequences = autoAssignSequences(
        tempPartners,
        finalData.id,
        isSequenceValid ? partnerData.sequence : null
      );

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

      setIsRegistrationOpen(false);
    } catch (err) {
      console.error('Partner save error:', err);
      alert('거래처 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 담당자별 카테고리 목록 생성 (직원 목록 + 거래처에 지정된 담당자 통합)
  const managerCategories = useMemo(() => {
    const activePartners = safePartners.filter(p => !p.hideOrderInfo);
    const counts = {};
    let unassignedCount = 0;

    activePartners.forEach(p => {
      const mNorm = (p.manager || '').replace(/\s*\(.*?\)/g, '').trim();
      if (!mNorm || mNorm === '-' || mNorm === '미지정') {
        unassignedCount++;
      } else {
        counts[mNorm] = (counts[mNorm] || 0) + 1;
      }
    });

    const staffNames = [];
    const seen = new Set();
    safeStaffList.forEach(s => {
      const nameNorm = (s.name || '').replace(/\s*\(.*?\)/g, '').trim();
      if (nameNorm && !seen.has(nameNorm)) {
        seen.add(nameNorm);
        staffNames.push(nameNorm);
      }
    });
    Object.keys(counts).forEach(mName => {
      if (mName && !seen.has(mName)) {
        seen.add(mName);
        staffNames.push(mName);
      }
    });

    const tabs = [
      { id: 'all', label: '전체', count: activePartners.length }
    ];
    staffNames.forEach(name => {
      tabs.push({ id: name, label: name, count: counts[name] || 0 });
    });
    if (unassignedCount > 0) {
      tabs.push({ id: '미지정', label: '미지정', count: unassignedCount });
    }
    return tabs;
  }, [safePartners, safeStaffList]);

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setSelectedPartnerName(null);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSelectedPartnerName(null);
  };

  const getFilteredPartners = useCallback(() => {
    return getSortedPartners().filter(partner => {
      if (filterType === 'hidden' || filterType === '숨김') {
        if (!partner.hideOrderInfo) return false;
      } else {
        if (partner.hideOrderInfo) return false;
      }

      if (selectedPartnerName) {
        return partner.name === selectedPartnerName;
      }

      if (clickManagerFilter !== null) {
        const pManagerNorm = (partner.manager || '').replace(/\s*\(.*?\)/g, '').trim();
        const cManagerNorm = (clickManagerFilter || '').replace(/\s*\(.*?\)/g, '').trim();
        if (cManagerNorm === '-' || cManagerNorm === '미지정') {
          return !pManagerNorm || pManagerNorm === '-' || pManagerNorm === '미지정';
        }
        return pManagerNorm === cManagerNorm;
      }

      if (filterManager && filterManager !== 'all' && filterManager !== '전체') {
        const pManagerNorm = (partner.manager || '').replace(/\s*\(.*?\)/g, '').trim();
        const fManagerNorm = (filterManager || '').replace(/\s*\(.*?\)/g, '').trim();
        if (fManagerNorm === '미지정' || fManagerNorm === '-') {
          if (pManagerNorm && pManagerNorm !== '-' && pManagerNorm !== '미지정') return false;
        } else {
          if (pManagerNorm !== fManagerNorm) return false;
        }
      }

      if (searchText.trim()) {
        return matchesInitialSound(partner.name, searchText.trim());
      }
      return true;
    });
  }, [getSortedPartners, filterType, selectedPartnerName, clickManagerFilter, filterManager, searchText]);

  // 드래그앤드롭 순번 변경 실행 함수 (마우스 & 모바일 터치 공용)
  const executeReorder = useCallback(async (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;

    const filteredList = getFilteredPartners();
    const draggedItem = filteredList[fromIdx];
    const targetItem = filteredList[toIdx];
    if (!draggedItem || !targetItem) return;

    const sortedMainPartners = getSortedPartners();
    const actualDraggedIdx = sortedMainPartners.findIndex(p => String(p.id) === String(draggedItem.id));
    const actualTargetIdx = sortedMainPartners.findIndex(p => String(p.id) === String(targetItem.id));
    if (actualDraggedIdx === -1 || actualTargetIdx === -1) return;

    const newPartners = [...sortedMainPartners];
    const [movedItem] = newPartners.splice(actualDraggedIdx, 1);
    newPartners.splice(actualTargetIdx, 0, movedItem);

    const withNewSequences = autoAssignSequences(newPartners);
    setPartners(withNewSequences);
    await savePartnerSequences(withNewSequences);
  }, [getFilteredPartners, getSortedPartners, autoAssignSequences, setPartners]);

  // 데스크탑/마우스 Drag & Drop 핸들러
  const handleDragStart = (e, index) => {
    if (!isReorderUnlocked) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    setDragOverIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
    }
  };

  const handleDragOver = (e, index) => {
    if (!isReorderUnlocked) return;
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (!isReorderUnlocked) return;
    const fromIdx = draggedIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);
    await executeReorder(fromIdx, targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 모바일 터치 Drag & Drop 핸들러
  const handleTouchStart = (e, index) => {
    if (!isReorderUnlocked) return;
    touchDragIdxRef.current = index;
    touchOverIdxRef.current = index;
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  const handleTouchMove = (e) => {
    if (!isReorderUnlocked || touchDragIdxRef.current === null) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const rowEl = el?.closest?.('[data-partner-row-idx]');
    if (rowEl) {
      const overIdx = Number(rowEl.getAttribute('data-partner-row-idx'));
      if (!isNaN(overIdx) && overIdx !== touchOverIdxRef.current) {
        touchOverIdxRef.current = overIdx;
        setDragOverIndex(overIdx);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isReorderUnlocked || touchDragIdxRef.current === null) return;
    const fromIdx = touchDragIdxRef.current;
    const toIdx = touchOverIdxRef.current;
    touchDragIdxRef.current = null;
    touchOverIdxRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
      await executeReorder(fromIdx, toIdx);
    }
  };

  const filteredPartners = getFilteredPartners();
  const displayedPartners = filteredPartners.slice(0, displayLimit);

  return (
    <>
      <WindowModal title="거래처 등록/관리" onClose={onClose} width="1100px" contentPadding="0" noScroll>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(88vh - 40px)', overflow: 'hidden', background: '#f8fafc' }}>
          
          {/* 상단 고정 영역: [담당별 카테고리 탭] + [열쇠(순번변경) & 신규등록 버튼] + [검색창] */}
          <div style={{ padding: '10px 12px 8px 12px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            
            {/* 1. 담당별 거래처 카테고리 탭 바 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px', WebkitOverflowScrolling: 'touch' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0, marginRight: '2px' }}>
                <Users size={13} color="#2563eb" /> 담당별:
              </span>
              {managerCategories.map(cat => {
                const isActive = filterManager === cat.id && filterType !== 'hidden';
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setFilterType('all');
                      setFilterManager(cat.id);
                      setSelectedPartnerName(null);
                      setClickManagerFilter(null);
                      setDisplayLimit(200);
                    }}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '18px',
                      border: isActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isActive ? '#2563eb' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 800 : 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: isActive ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{cat.label}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0 5px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#475569'
                    }}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
              {/* 숨김 거래처 필터 칩 */}
              <button
                type="button"
                onClick={() => {
                  setFilterType(filterType === 'hidden' ? 'all' : 'hidden');
                  setSelectedPartnerName(null);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '18px',
                  border: filterType === 'hidden' ? '1.5px solid #64748b' : '1px solid #e2e8f0',
                  backgroundColor: filterType === 'hidden' ? '#475569' : '#f8fafc',
                  color: filterType === 'hidden' ? '#ffffff' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                숨김
              </button>
            </div>

            {/* 2. 검색창 + [🔑 열쇠(순번변경) 토글 버튼] + [➕ 거래처 등록 버튼] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* 실시간 검색창 */}
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchText}
                  onChange={handleSearchChange}
                  placeholder="거래처 검색 (초성 가능)..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 26px 0 30px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 🔑 열쇠(자물쇠) 모양 순번 변경 잠금/해제 버튼 */}
              <button
                type="button"
                onClick={() => setIsReorderUnlocked(prev => !prev)}
                title={isReorderUnlocked ? '순번 변경 잠그기' : '열쇠를 풀어 드래그앤드롭으로 거래처 순번 변경'}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: isReorderUnlocked ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                  backgroundColor: isReorderUnlocked ? '#fffbeb' : '#f8fafc',
                  color: isReorderUnlocked ? '#b45309' : '#475569',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: isReorderUnlocked ? '0 2px 8px rgba(245, 158, 11, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <KeyRound size={14} color={isReorderUnlocked ? '#d97706' : '#64748b'} />
                {isReorderUnlocked ? <Unlock size={14} color="#d97706" /> : <Lock size={14} color="#64748b" />}
                <span>{isReorderUnlocked ? '순번변경중' : '순번잠금'}</span>
              </button>

              {/* [➕ 거래처 등록] 버튼 */}
              <button
                type="button"
                className="btn-primary"
                onClick={handleOpenRegistration}
                style={{
                  height: '36px',
                  padding: '0 11px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  borderRadius: '10px',
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
                <Plus size={14} /> 등록
              </button>
            </div>

            {/* 열쇠 해제 시 안내 배너 */}
            {isReorderUnlocked && (
              <div style={{
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}>
                <span>🔓 좌측 순번(⠿)을 길게 눌러 위·아래로 드래그하면 거래처 순번이 변경됩니다.</span>
                <button
                  type="button"
                  onClick={() => setIsReorderUnlocked(false)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #f59e0b',
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  잠그기
                </button>
              </div>
            )}
          </div>

          {/* 거래처 단순화 리스트: [순번] + [거래처명] + [수정] + [수주등록] */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 80px 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              
              {/* 건수 및 현재 카테고리 안내 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 2px 4px', fontSize: '0.73rem', color: '#64748b' }}>
                <span>
                  {filterManager === 'all' ? '전체' : `[${filterManager}] 담당`} 거래처 <strong>{filteredPartners.length}</strong>곳
                </span>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                  순번대로 수주목록에 자동 정렬됩니다
                </span>
              </div>

              {displayedPartners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '44px 16px', color: '#94a3b8', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <Building2 size={30} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>표시할 거래처가 없습니다</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>다른 담당자 카테고리를 선택하거나 우측 상단 [등록] 버튼을 눌러 추가하세요.</div>
                </div>
              ) : (
                displayedPartners.map((partner, idx) => {
                  const isDragging = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;

                  return (
                    <div
                      key={partner.id}
                      data-partner-row-idx={idx}
                      draggable={isReorderUnlocked}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        backgroundColor: isDragOver ? '#eff6ff' : isDragging ? '#fef3c7' : '#ffffff',
                        border: isDragOver
                          ? '2px dashed #2563eb'
                          : isDragging
                          ? '1.5px solid #f59e0b'
                          : isReorderUnlocked
                          ? '1px solid #fde68a'
                          : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                        opacity: isDragging ? 0.85 : 1,
                        transition: 'background-color 0.12s ease, border-color 0.12s ease',
                        userSelect: 'none'
                      }}
                    >
                      {/* 좌측: [드래그 핸들(열쇠 해제 시)] + [순번 배지] + [거래처명] */}
                      <div
                        onTouchStart={(e) => handleTouchStart(e, idx)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flex: 1,
                          minWidth: 0,
                          cursor: isReorderUnlocked ? 'grab' : 'default',
                          touchAction: isReorderUnlocked ? 'none' : 'auto',
                          padding: '2px 0'
                        }}
                      >
                        {isReorderUnlocked && (
                          <GripVertical size={16} color="#d97706" style={{ flexShrink: 0 }} />
                        )}

                        {/* 맨 앞 순번 배지 */}
                        <span
                          style={{
                            minWidth: '26px',
                            height: '24px',
                            padding: '0 6px',
                            borderRadius: '6px',
                            backgroundColor: isReorderUnlocked ? '#fef3c7' : '#eff6ff',
                            border: isReorderUnlocked ? '1px solid #fcd34d' : '1px solid #bfdbfe',
                            color: isReorderUnlocked ? '#b45309' : '#1d4ed8',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          title={partner.sequence ? `고유순번: ${partner.sequence}` : `순번: ${idx + 1}`}
                        >
                          {idx + 1}
                        </span>

                        {/* 거래처명 */}
                        <span
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            letterSpacing: '-0.3px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          {partner.name}
                        </span>
                      </div>

                      {/* 우측: [수정] 버튼 + [수주등록] 버튼만 깔끔하게 배치 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPartner(partner);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '7px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={12} /> 수정
                        </button>

                        {onOrder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOrder(partner);
                            }}
                            style={{
                              padding: '6px 11px',
                              borderRadius: '7px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #16a34a, #15803d)',
                              color: '#ffffff',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
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
                    onClick={() => setDisplayLimit(prev => prev + 200)}
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
                    더보기 (+200개) <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({displayedPartners.length} / {filteredPartners.length}개)</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </WindowModal>

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
            background: '#fff', borderRadius: '12px', padding: '24px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', minWidth: '300px', maxWidth: '420px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>⚠️</div>
            <p style={{
              fontSize: '0.9rem',
              color: '#1e293b',
              fontWeight: 500,
              marginBottom: '20px',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              lineHeight: '1.5'
            }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem'
                }}
                onClick={() => setConfirmModal(null)}
              >
                취소
              </button>
              <button
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem'
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
