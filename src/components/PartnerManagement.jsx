import { withoutSecrets } from '../auth/sanitize';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Edit2, Trash2, FileText, Search, X,
  Lock, Unlock, KeyRound, GripVertical, Building2,
  Link2, Mail, Send, CheckCircle2, Clock
} from 'lucide-react';
import { callAuth } from '../auth/client';
import PartnerRegistration from './PartnerRegistration';
import PartnerSettingsModal from './PartnerSettingsModal';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { db } from '../firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { saveBundle, deduplicatePartners } from '../utils/bundleSyncManager';
import DataRegistrationGuardModal from './common/DataRegistrationGuardModal';
import { hasCompanyDpaAgreed } from '../utils/complianceUtils';
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
      setPartners(withoutSecrets(safePartners));
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

  // ── 거래처 주문 초대 및 회원사 연결 상태 ──
  const [partnerInviteModal, setPartnerInviteModal] = useState({ open: false, partner: null });
  const [partnerInviteForm, setPartnerInviteForm] = useState({ targetEmail: '', contactName: '', phone: '' });
  const [inviteLoading, setInviteLoading] = useState(false);

  const [companyLinkModal, setCompanyLinkModal] = useState({ open: false, tab: 'request' });
  const [companyLinkForm, setCompanyLinkForm] = useState({ partnerId: '', toCompanyId: '', toCompanyName: '' });
  const [linkLoading, setLinkLoading] = useState(false);
  const [inboundLinks, setInboundLinks] = useState([]);
  const [outboundLinks, setOutboundLinks] = useState([]);
  const [partnerInvitations, setPartnerInvitations] = useState([]);
  const [dpaGuard, setDpaGuard] = useState({ open: false, actionName: '', onConfirm: null });

  const loadPartnerLinksAndInvites = useCallback(() => {
    const cid = currentUser?.companyId;
    if (!cid) return;
    try {
      const allInv = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
      setPartnerInvitations(allInv.filter(i => i.companyId === cid && i.type === 'partner_order'));

      const allLinks = JSON.parse(localStorage.getItem('dev_company_links') || '[]');
      setInboundLinks(allLinks.filter(l => l.toCompanyId === cid));
      setOutboundLinks(allLinks.filter(l => l.fromCompanyId === cid));
    } catch (e) {
      console.warn('Error loading links/invites:', e);
    }
  }, [currentUser?.companyId]);

  useEffect(() => {
    loadPartnerLinksAndInvites();
  }, [loadPartnerLinksAndInvites]);

  const handleOpenPartnerInvite = (partner) => {
    setPartnerInviteModal({ open: true, partner });
    setPartnerInviteForm({
      targetEmail: partner.email || '',
      contactName: partner.ceo || '',
      phone: partner.mobile || partner.phone || ''
    });
  };

  const handleSendPartnerInvite = async (e) => {
    e.preventDefault();
    if (!partnerInviteForm.targetEmail.trim()) {
      alert('거래처 담당자 이메일을 입력해 주세요.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await callAuth('createPartnerInvitation', {
        companyId: currentUser?.companyId,
        companyName: currentUser?.companyName,
        partnerId: partnerInviteModal.partner.id,
        partnerName: partnerInviteModal.partner.name,
        targetEmail: partnerInviteForm.targetEmail.trim(),
        contactName: partnerInviteForm.contactName.trim(),
        phone: partnerInviteForm.phone.trim()
      });
      alert(`[${res.partnerName}] 담당자(${res.targetEmail})에게 주문 초대가 발송되었습니다.\n담당자가 로그인 후 수락하면 전용 주문 포털이 즉시 연결됩니다.`);
      setPartnerInviteModal({ open: false, partner: null });
      loadPartnerLinksAndInvites();
    } catch (err) {
      alert('주문 초대 발송 실패: ' + (err.message || '오류가 발생했습니다.'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRequestCompanyLink = async (e) => {
    e.preventDefault();
    if (!companyLinkForm.partnerId) {
      alert('연결할 거래처를 선택해 주세요.');
      return;
    }
    if (!companyLinkForm.toCompanyId.trim()) {
      alert('상대 회원사 회사 ID를 입력해 주세요.');
      return;
    }
    setLinkLoading(true);
    try {
      const selPartner = safePartners.find(p => p.id === companyLinkForm.partnerId);
      await callAuth('requestCompanyLink', {
        fromCompanyId: currentUser?.companyId,
        fromCompanyName: currentUser?.companyName,
        toCompanyId: companyLinkForm.toCompanyId.trim(),
        toCompanyName: companyLinkForm.toCompanyName.trim() || selPartner?.name,
        partnerId: companyLinkForm.partnerId
      });
      alert('회원사 연결 요청이 발송되었습니다. 상대 회원사 관리자가 수락하면 B2B 거래관계가 연결됩니다.');
      setCompanyLinkForm({ partnerId: '', toCompanyId: '', toCompanyName: '' });
      setCompanyLinkModal(prev => ({ ...prev, tab: 'outbound' }));
      loadPartnerLinksAndInvites();
    } catch (err) {
      alert('연결 요청 실패: ' + (err.message || '오류가 발생했습니다.'));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleAcceptCompanyLink = async (linkId, matchingPartnerId) => {
    try {
      await callAuth('acceptCompanyLink', {
        linkId,
        matchingPartnerId
      });
      alert('회원사 연결을 수락했습니다! 상호 간 B2B 거래관계가 체결되었습니다.');
      loadPartnerLinksAndInvites();
    } catch (err) {
      alert('연결 수락 실패: ' + (err.message || '오류가 발생했습니다.'));
    }
  };

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
    if (!hasCompanyDpaAgreed(currentUser?.companyId, null, safePartners.length)) {
      setDpaGuard({
        open: true,
        actionName: '신규 거래처 등록',
        onConfirm: () => {
          setDpaGuard({ open: false, actionName: '', onConfirm: null });
          setEditingPartner(null);
          setIsRegistrationOpen(true);
        }
      });
      return;
    }
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

          batch.set(doc(db, 'companies', companyId, 'partners', docId), withoutSecrets(cleanPartner));
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

      setPartners(withoutSecrets(withNewSequences));
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
    setPartners(withoutSecrets(withNewSequences));
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

              {/* [🔗 회원사 연결] 버튼 */}
              <button
                type="button"
                onClick={() => setCompanyLinkModal({ open: true, tab: 'request' })}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  border: '1px solid #a5b4fc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  position: 'relative'
                }}
              >
                <Link2 size={14} /> 회원사 연결
                {inboundLinks.filter(l => l.status === 'pending').length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '1px 5px',
                    fontSize: '0.65rem',
                    fontWeight: 800
                  }}>
                    {inboundLinks.filter(l => l.status === 'pending').length}
                  </span>
                )}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <span
                            style={{
                              fontSize: '0.90rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              letterSpacing: '-0.3px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {partner.name}
                          </span>
                          {partner.linkedCompanyId && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: 800, flexShrink: 0 }}>
                              🔗 연동됨
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 우측: [초대] + [수정] + [수주등록] 버튼 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPartnerInvite(partner);
                          }}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '7px',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer'
                          }}
                          title="거래처 주문 초대"
                        >
                          <Mail size={12} /> 초대
                        </button>
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

      {/* ── 모바일 거래처 주문 초대 모달 ── */}
      {partnerInviteModal.open && partnerInviteModal.partner && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '420px',
            maxHeight: '90vh', overflowY: 'auto',
            padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Mail size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>거래처 전용 주문 초대</h3>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>[{partnerInviteModal.partner.name}] 매장 담당자</div>
                </div>
              </div>
              <button onClick={() => setPartnerInviteModal({ open: false, partner: null })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendPartnerInvite}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.75rem', color: '#166534', lineHeight: '1.4' }}>
                  💡 <strong>자체 ERP 개설 불필요:</strong> 거래처 담당자는 개인 계정으로 초대를 수락하면 이 매장의 주문 포털에 즉시 연결됩니다.<br />
                  🔒 <strong>보안 격리:</strong> 본인 매장 자료만 조회 가능하며, 공급사 내부 원가/재고/타 거래처 자료는 원천 차단됩니다.
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>거래처 담당자 이메일 *</label>
                  <input
                    type="email"
                    required
                    value={partnerInviteForm.targetEmail}
                    onChange={e => setPartnerInviteForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                    placeholder="partner@example.com"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>담당자 성명/직함</label>
                  <input
                    type="text"
                    value={partnerInviteForm.contactName}
                    onChange={e => setPartnerInviteForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="김대표"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>연락처</label>
                  <input
                    type="tel"
                    value={partnerInviteForm.phone}
                    onChange={e => setPartnerInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                {partnerInvitations.filter(i => i.partnerId === partnerInviteModal.partner.id).length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>기존 발송된 초대:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {partnerInvitations.filter(i => i.partnerId === partnerInviteModal.partner.id).map(inv => (
                        <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.74rem', border: '1px solid #e2e8f0' }}>
                          <span>{inv.targetEmail}</span>
                          <span style={{
                            padding: '2px 6px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700,
                            backgroundColor: inv.status === 'accepted' ? '#dcfce7' : '#fef3c7',
                            color: inv.status === 'accepted' ? '#166534' : '#92400e'
                          }}>
                            {inv.status === 'accepted' ? '수락됨' : '대기중'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPartnerInviteModal({ open: false, partner: null })}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {inviteLoading ? '발송 중...' : '주문 초대 발송'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 모바일 회원사 간 링커 연결 (B2B) 모달 ── */}
      {companyLinkModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '440px',
            maxHeight: '88vh', overflowY: 'auto',
            padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                  <Link2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>회원사 간 링커 연결 (B2B)</h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>양사 회원사 간 거래관계를 연결합니다.</div>
                </div>
              </div>
              <button onClick={() => setCompanyLinkModal({ open: false, tab: 'request' })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* 탭 네비게이션 */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
              {[
                { id: 'request', label: '연결 요청' },
                { id: 'inbound', label: `수신 (${inboundLinks.filter(l => l.status === 'pending').length})` },
                { id: 'outbound', label: `발송 (${outboundLinks.length})` }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCompanyLinkModal(prev => ({ ...prev, tab: t.id }))}
                  style={{
                    padding: '8px 10px',
                    border: 'none',
                    borderBottom: companyLinkModal.tab === t.id ? '2px solid #4f46e5' : '2px solid transparent',
                    background: 'none',
                    color: companyLinkModal.tab === t.id ? '#4f46e5' : '#64748b',
                    fontWeight: companyLinkModal.tab === t.id ? 800 : 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 탭 1: 새 연결 요청 */}
            {companyLinkModal.tab === 'request' && (
              <form onSubmit={handleRequestCompanyLink}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.74rem', color: '#5b21b6', lineHeight: '1.4' }}>
                    🔗 <strong>기존 이력 보존:</strong> 내 거래처에 상대 회원사 ID를 연결하여 전표/미수금 이력을 그대로 유지합니다.
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>연결할 내 거래처 선택 *</label>
                    <select
                      required
                      value={companyLinkForm.partnerId}
                      onChange={e => {
                        const pid = e.target.value;
                        const p = safePartners.find(x => x.id === pid);
                        setCompanyLinkForm(prev => ({
                          ...prev,
                          partnerId: pid,
                          toCompanyName: p?.name || prev.toCompanyName
                        }));
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="">거래처를 선택하세요</option>
                      {safePartners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.linkedCompanyId ? `(연동됨: ${p.linkedCompanyId})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>상대방 링커엑스 회사 ID *</label>
                    <input
                      type="text"
                      required
                      value={companyLinkForm.toCompanyId}
                      onChange={e => setCompanyLinkForm(prev => ({ ...prev, toCompanyId: e.target.value }))}
                      placeholder="예: comp_ocean_corp"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>상대 회사명</label>
                    <input
                      type="text"
                      value={companyLinkForm.toCompanyName}
                      onChange={e => setCompanyLinkForm(prev => ({ ...prev, toCompanyName: e.target.value }))}
                      placeholder="상대 회사명"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setCompanyLinkModal({ open: false, tab: 'request' })}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={linkLoading}
                      style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      {linkLoading ? '요청 중...' : '연결 요청 발송'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 탭 2: 수신된 연결 요청 */}
            {companyLinkModal.tab === 'inbound' && (
              <div>
                {inboundLinks.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    수신된 연결 요청이 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {inboundLinks.map(link => (
                      <div key={link.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem' }}>{link.fromCompanyName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID: {link.fromCompanyId}</div>
                          </div>
                          {link.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const matched = safePartners.find(p => p.name.includes(link.fromCompanyName) || link.fromCompanyName.includes(p.name));
                                handleAcceptCompanyLink(link.id, matched?.id || null);
                              }}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                            >
                              수락
                            </button>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>✓ 연결됨</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 탭 3: 발송한 연결 요청 / 연동 현황 */}
            {companyLinkModal.tab === 'outbound' && (
              <div>
                {outboundLinks.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    발송한 연결 요청이 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {outboundLinks.map(link => {
                      const localPartner = safePartners.find(p => p.id === link.partnerId);
                      return (
                        <div key={link.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem' }}>{link.toCompanyName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>거래처: {localPartner?.name || link.partnerId}</div>
                            </div>
                            <span style={{
                              padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                              backgroundColor: link.status === 'accepted' ? '#dcfce7' : '#fef3c7',
                              color: link.status === 'accepted' ? '#166534' : '#92400e'
                            }}>
                              {link.status === 'accepted' ? '연결됨' : '대기중'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 실제 데이터 최초 등록 컴플라이언스 가드 */}
      <DataRegistrationGuardModal
        isOpen={dpaGuard.open}
        onClose={() => setDpaGuard({ open: false, actionName: '', onConfirm: null })}
        onConfirm={dpaGuard.onConfirm}
        currentUser={currentUser}
        targetActionName={dpaGuard.actionName}
      />
    </>
  );
};

export default PartnerManagement;

