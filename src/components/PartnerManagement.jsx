import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Users, Printer, Plus, Edit2, Trash2, Phone, User, FileText, Search, Settings, X, Grid } from 'lucide-react';
import PartnerRegistration from './PartnerRegistration';
import BulkEditor from './BulkEditor';
import PartnerSettingsModal from './PartnerSettingsModal';
import WindowModal from './WindowModal';
import { ALL_COLUMNS } from '../constants/partnerColumns';
import { matchesInitialSound } from '../utils/koreanUtils';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import './Partner.css';

const PartnerManagement = ({ onClose, staffList = [], partners = [], setPartners, onOrder, warehouses = [], onOpenBulk, currentUser, isBulkOpen, accounts = [] }) => {
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768;
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
  const safePartners = Array.isArray(partners) ? partners : [];

  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [activeTab, setActiveTab] = useState('전체');
  const [filterType, setFilterType] = useState('전체');
  const [filterManager, setFilterManager] = useState('전체');
  const [confirmModal, setConfirmModal] = useState(null);
  const [clickManagerFilter, setClickManagerFilter] = useState(null); // set when badge is clicked
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Search state
  const [searchText, setSearchText] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState(null); // null = no selection
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

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
      const batch = writeBatch(db);
      let hasChanges = false;

      updatedPartners.forEach(p => {
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
    setClickManagerFilter(null); // clear manager filter when searching
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
        while (manualSequences.has(`${mSeq}-${count}`)) {
          count++;
        }
        managerCounts[managerName] = count;
        p.sequence = `${mSeq}-${count}`;
      } else {
        if (!managerCounts[managerName]) managerCounts[managerName] = 0;
        
        let count = managerCounts[managerName] + 1;
        const prefix = managerName !== '-' ? managerName.charAt(0) : '0';
        while (manualSequences.has(`${prefix}-${count}`)) {
          count++;
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
      // Logic for 'Hidden' partners (hideOrderInfo)
      if (activeTab === '숨김') {
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
        if (clickManagerFilter === '-') return partner.manager === '-' || !partner.manager;
        return partner.manager === clickManagerFilter;
      }
      // Tab filter
      if (activeTab === '구분별') {
        if (filterType !== '전체') {
          if (filterType === '매입매출처') {
            if (partner.type !== '혼합' && partner.type !== '매입매출처') return false;
          } else {
            if (partner.type !== filterType) return false;
          }
        }
      }
      if (activeTab === '담당별') {
        if (filterManager !== '전체' && partner.manager !== filterManager) return false;
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(85vh - 40px)', overflow: 'hidden' }}>
          <div style={{ padding: isMobileView ? '12px' : '0.8cm', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <div className="partner-header-modern" style={{ marginBottom: isMobileView ? '0px' : '16px' }}>
              {!isMobileView && (
                <div className="partner-title-area">
                  <h2 className="partner-title" style={{ fontSize: '1.8rem' }}>
                    <Users color="#3b82f6" size={28} strokeWidth={2} />
                    거래처 관리
                  </h2>
                </div>
              )}

              <div className="partner-header-right">
                {!isMobileView && (
                  <div className="partner-tabs">
                    <button className={`partner-tab ${activeTab === '전체' ? 'active' : ''}`} onClick={() => setActiveTab('전체')}>전체</button>
                    <button className={`partner-tab ${activeTab === '구분별' ? 'active' : ''}`} onClick={() => setActiveTab('구분별')}>구분별</button>
                    <button className={`partner-tab ${activeTab === '담당별' ? 'active' : ''}`} onClick={() => setActiveTab('담당별')}>담당별</button>
                    <button className={`partner-tab ${activeTab === '숨김' ? 'active' : ''}`} onClick={() => setActiveTab('숨김')} style={{ color: activeTab === '숨김' ? '#ef4444' : '#94a3b8' }}>숨김</button>
                  </div>
                )}

                <div ref={searchRef} style={{ position: 'relative' }}>
                  <div className="partner-search" style={{ position: 'relative' }}>
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={handleSearchChange}
                      onFocus={() => searchText && setShowSuggestions(true)}
                      placeholder="상호 검색 (초성 가능)"
                      style={{ paddingRight: searchText ? '28px' : '12px' }}
                    />
                    {searchText && (
                      <button onClick={handleClearSearch} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
                      {suggestions.map(p => (
                        <div key={p.id} onMouseDown={() => handleSelectSuggestion(p.name)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{p.type === '혼합' ? '매입매출처' : p.type} {p.manager && p.manager !== '-' ? `· ${p.manager}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


                {!isMobileView && (
                  <button className="btn-outline partner-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={16} /> 환경설정</button>
                )}
                <button className="btn-outline partner-btn" onClick={() => window.print()}><Printer size={16} /> 인쇄</button>
                {!isMobileView && (
                  <button className="btn-outline partner-btn" onClick={onOpenBulk} style={{ color: '#10b981', borderColor: '#10b981' }}><Grid size={16} /> 일괄 편집</button>
                )}
                <button className="btn-primary" onClick={handleOpenRegistration}><Plus size={16} /> 거래처 추가</button>
              </div>
            </div>

            <div style={{ height: '8px' }}></div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: isMobileView ? '12px' : '0.8cm', paddingTop: '16px' }}>
            {activeTab === '구분별' && (
              <div className="partner-sub-filter" style={{ display: 'flex', gap: '16px', padding: '12px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', borderRadius: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>거래처 구분:</span>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {['전체', '매출처', '매입처', '매입매출처'].map((type) => (
                      <label 
                        key={type} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '0.9rem', 
                          fontWeight: filterType === type ? 600 : 500,
                          color: filterType === type ? '#2563eb' : '#475569',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'color 0.2s'
                        }}
                      >
                        <input 
                          type="radio" 
                          name="filterType" 
                          value={type} 
                          checked={filterType === type} 
                          onChange={(e) => setFilterType(e.target.value)} 
                          style={{
                            appearance: 'none',
                            width: '16px',
                            height: '16px',
                            border: filterType === type ? '5px solid #2563eb' : '2px solid #cbd5e1',
                            borderRadius: '50%',
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backgroundColor: '#fff'
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '6px', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 500 }}>
                  <span>💡 리스트의 행을 드래그하여 거래처 순서를 자유롭게 변경할 수 있습니다.</span>
                </div>
              </div>
            )}

            {activeTab === '담당별' && (
              <div className="partner-sub-filter" style={{ display: 'flex', gap: '12px', padding: '12px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>담당자 선택:</span>
                  <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                    <option value="전체">전체 담당자</option>
                    {safeStaffList.map(staff => <option key={staff.id} value={staff.name}>{staff.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '6px', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 500 }}>
                  <span>💡 리스트의 행을 드래그하여 거래처 순서를 자유롭게 변경할 수 있습니다.</span>
                </div>
              </div>
            )}

            {selectedPartnerName && (
              <div style={{ padding: '8px 24px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: 600 }}>🔍 "{selectedPartnerName}" 검색 중</span>
                <button onClick={handleClearSearch} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>전체 보기</button>
              </div>
            )}

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
                  {getFilteredPartners().map((partner, index) => (
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
                                <User size={12} style={{ marginRight: '4px', flexShrink: 0 }} />
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
                                 {value === '1' ? '★ 1등급' : value === '2' ? '★★ 2등급' : '★★★ 3등급'}
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
                  {getFilteredPartners().length === 0 && (
                    <tr><td colSpan={visibleColumns.length + 3} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>{searchText ? `"${searchText}" 검색 결과가 없습니다.` : '거래처가 없습니다.'}</td></tr>
                  )}
                </tbody>
              </table>
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
