import React, { useState, useMemo, useEffect } from 'react';
import { History, Printer, Download, Search, Calendar, Trash2, Users, User, Filter, X, Clock, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { DateNavButton, DateInputWithArrows, addDays } from '../utils/dateNavigationUtils';

const extractDateTime = (item) => {
  let dateStr = item.date || '';
  let timeStr = item.time || item.processedAt || '';
  let ts = item.timestamp || item.createdAt || null;

  if (typeof ts === 'string' && ts.includes('T')) {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      if (!dateStr) dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!timeStr) timeStr = d.toLocaleTimeString('ko-KR', { hour12: false });
      ts = d.getTime();
    }
  } else if (typeof ts === 'number' && ts > 1000000000000) {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      if (!dateStr) dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!timeStr) timeStr = d.toLocaleTimeString('ko-KR', { hour12: false });
    }
  }

  if ((!ts || !timeStr) && typeof item.id === 'number' && item.id > 1000000000000) {
    const d = new Date(item.id);
    if (!isNaN(d.getTime())) {
      if (!dateStr) dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!timeStr) timeStr = d.toLocaleTimeString('ko-KR', { hour12: false });
      if (!ts) ts = item.id;
    }
  }

  if (!dateStr) {
    dateStr = new Date().toISOString().split('T')[0];
  }

  if (!timeStr) {
    timeStr = '-';
  }

  if (!ts) {
    const parsed = new Date(dateStr).getTime();
    ts = !isNaN(parsed) ? parsed : 0;
  }

  return { displayDate: dateStr, displayTime: timeStr, numericTimestamp: Number(ts) };
};

const RecentActivityModal = ({ 
  onClose, 
  salesInvoices = [], 
  purchaseInvoices = [], 
  salesOrders = [], 
  purchaseOrders = [], 
  quotations = [], 
  inventoryMovements = [], 
  inventoryAdjustments = [],
  activityLogs = [],
  staffList = [],
  currentUser = null,
  onDeleteActivity = () => {},
  onDeleteMultipleActivities = null,
  onOpenActivity = null,
  retentionPeriod = 'none',
  onSaveRetentionPeriod = null,
  deletedActivityIds = []
}) => {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedStaff, setSelectedStaff] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedActIds, setSelectedActIds] = useState([]);
  const [localRetentionPeriod, setLocalRetentionPeriod] = useState(retentionPeriod || 'none');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const shiftDate = (days) => {
    const baseStr = dateFilter || getTodayStr();
    const nextStr = addDays(baseStr, days);
    setDateFilter(nextStr || getTodayStr());
  };

  useEffect(() => {
    if (retentionPeriod) {
      setLocalRetentionPeriod(retentionPeriod);
    }
  }, [retentionPeriod]);

  const getRetentionLabel = (val) => {
    switch (val) {
      case '1day': return '하루 (1일 보관 후 자동삭제)';
      case '1week': return '일주일 (7일 보관 후 자동삭제)';
      case '1month': return '한달 (30일 보관 후 자동삭제)';
      case '3months': return '3개월 (90일 보관 후 자동삭제)';
      case '6months': return '6개월 (180일 보관 후 자동삭제)';
      case '1year': return '1년 (365일 보관 후 자동삭제)';
      default: return '보관 제한 없음';
    }
  };

  const handleSaveRetention = async () => {
    try {
      if (onSaveRetentionPeriod) {
        await onSaveRetentionPeriod(localRetentionPeriod);
      }
      alert(`내역 자동삭제 기한이 [${getRetentionLabel(localRetentionPeriod)}]으로 설정 변경 및 저장되었습니다.`);
    } catch (e) {
      console.error('Failed to save retention period:', e);
      alert('설정 저장 중 오류가 발생했습니다.');
    }
  };

  const canDelete = Boolean(
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'admin' || 
    currentUser?.role === 'owner' || 
    currentUser?.role === 'company' || 
    currentUser?.userId === 'admin' || 
    currentUser?.isCompanyAdmin ||
    currentUser?.jobTitle === '관리자' ||
    currentUser?.jobTitle === '대표' ||
    currentUser?.jobTitle === '대표이사' ||
    currentUser?.allowAllEditDelete === true || 
    currentUser?.deleteRecentActivity === true ||
    currentUser?.permissions?.deleteRecentActivity === true ||
    currentUser?.permissions?.['최근 처리 이력 삭제 권한'] === true ||
    currentUser?.permissions?.['최근 처리 현황 삭제'] === true ||
    currentUser?.permissions?.ALL === true
  );

  const handleItemClick = (act) => {
    if (onOpenActivity) {
      onOpenActivity(act);
      onClose();
    }
  };

  // 1. Gather all activity logs into a unified timeline
  const allActivities = useMemo(() => {
    const list = [];
    const loggedTargetIds = new Set();
    const activeCompanyId = currentUser?.companyId ? String(currentUser.companyId) : null;

    const isSameCompany = (item) => {
      if (!item) return false;
      if (!activeCompanyId) return true;
      if (item.companyId && String(item.companyId) !== activeCompanyId) return false;
      return true;
    };

    // 1) Action / Activity Logs (Permanent Audit History)
    (activityLogs || []).filter(isSameCompany).forEach((log, idx) => {
      if (log.targetId) {
        loggedTargetIds.add(`${log.targetId}_${log.type || '등록'}`);
      }

      const isDelete = log.type === '삭제' || (log.action && log.action.includes('삭제')) || log.category === '삭제';
      const isEdit = log.type === '변경' || log.type === '수정' || (log.action && (log.action.includes('수정') || log.action.includes('변경')));
      const isMove = log.type === '이동' || log.category === '이동' || (log.action && log.action.includes('이동'));
      const isAdjust = log.type === '조정' || log.category === '재고조정' || (log.action && log.action.includes('조정'));

      let type = '등록';
      let badgeBg = '#eff6ff';
      let badgeColor = '#2563eb';
      let category = log.category || '전표등록';

      if (isDelete) {
        type = '삭제';
        badgeBg = '#fef2f2';
        badgeColor = '#ef4444';
        category = '삭제';
      } else if (isEdit) {
        type = '수정';
        badgeBg = '#fff7ed';
        badgeColor = '#ea580c';
        category = '변경';
      } else if (isMove) {
        type = '이동';
        badgeBg = '#fdf4ff';
        badgeColor = '#c026d3';
        category = '이동';
      } else if (isAdjust) {
        type = '조정';
        badgeBg = '#fef3c7';
        badgeColor = '#d97706';
        category = '변경';
      }

      const dt = extractDateTime(log);

      list.push({
        id: `log-${log.id || idx}`,
        rawId: log.id || idx,
        targetId: log.targetId || null,
        category: log.category || category,
        subCategory: log.subCategory || '전표',
        title: log.title || log.action || `${type} 처리 완료`,
        detail: log.detail || log.message || '시스템 처리 이력 기록',
        user: log.user || log.operator || log.creator || log.manager || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: log.type || type,
        badgeBg,
        badgeColor
      });
    });

    // 2) Fallback for active Sales Invoices (if not already logged)
    (salesInvoices || []).filter(isSameCompany).forEach(inv => {
      if (loggedTargetIds.has(`${inv.id}_등록`)) return;
      const dt = extractDateTime(inv);
      const itemsSummary = (inv.items || []).map(i => `${i.name}(${i.qty}개)`).join(', ') || '-';
      list.push({
        id: `sales-inv-${inv.id}`,
        rawId: inv.id,
        targetId: inv.id,
        category: '전표등록',
        subCategory: '매출전표',
        title: `매출전표 등록 - ${inv.partner || '미지정 거래처'}`,
        detail: `품목: ${itemsSummary} | 합계: ${(inv.totalAmount || 0).toLocaleString()}원 (출고: ${inv.warehouse || '본사창고'})`,
        user: inv.creator || inv.user || inv.operator || inv.manager || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // 3) Fallback for active Purchase Invoices (if not already logged)
    (purchaseInvoices || []).filter(isSameCompany).forEach(inv => {
      if (loggedTargetIds.has(`${inv.id}_등록`)) return;
      const dt = extractDateTime(inv);
      const itemsSummary = (inv.items || []).map(i => `${i.name}(${i.qty}개)`).join(', ') || '-';
      list.push({
        id: `purch-inv-${inv.id}`,
        rawId: inv.id,
        targetId: inv.id,
        category: '전표등록',
        subCategory: '매입전표',
        title: `매입전표 등록 - ${inv.partner || '미지정 거래처'}`,
        detail: `품목: ${itemsSummary} | 합계: ${(inv.totalAmount || 0).toLocaleString()}원 (입고: ${inv.warehouse || '본사창고'})`,
        user: inv.creator || inv.user || inv.operator || inv.manager || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // 4) Fallback for active Sales Orders (if not already logged)
    (salesOrders || []).filter(isSameCompany).forEach(ord => {
      if (loggedTargetIds.has(`${ord.id}_등록`)) return;
      const dt = extractDateTime(ord);
      const itemsSummary = (ord.items || []).map(i => `${i.name}(${i.qty}개)`).join(', ') || '-';
      list.push({
        id: `order-${ord.id}`,
        rawId: ord.id,
        targetId: ord.id,
        category: '전표등록',
        subCategory: '수주',
        title: `수주서 등록 - ${ord.partner || '미지정 거래처'}`,
        detail: `품목: ${itemsSummary} | 합계: ${(ord.totalPrice || ord.totalAmount || 0).toLocaleString()}원 (출고: ${ord.outWarehouse || '본사창고'} ➔ 배송: ${ord.inWarehouse || '차량'})`,
        user: ord.creator || ord.user || ord.operator || ord.manager || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // 5) Purchase Orders
    (purchaseOrders || []).filter(isSameCompany).forEach(po => {
      if (loggedTargetIds.has(`${po.id}_등록`)) return;
      const dt = extractDateTime(po);
      const itemsSummary = (po.items || []).map(i => `${i.name}(${i.qty}개)`).join(', ') || '-';
      list.push({
        id: `po-${po.id}`,
        rawId: po.id,
        targetId: po.id,
        category: '전표등록',
        subCategory: '발주',
        title: `발주서 등록 - ${po.partner || '미지정 거래처'}`,
        detail: `품목: ${itemsSummary} | 발주금액: ${(po.totalAmount || 0).toLocaleString()}원`,
        user: po.creator || po.user || po.operator || po.manager || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // 5-1) Fallback for active Quotations (if not already logged)
    (quotations || []).filter(isSameCompany).forEach(q => {
      if (loggedTargetIds.has(`${q.id}_등록`)) return;
      const dt = extractDateTime(q);
      const itemsSummary = q.itemsText || (q.items ? q.items.map(it => `${it.name}(${it.qty || 1}개)`).join(', ') : '-');
      list.push({
        id: `quotation-${q.id}`,
        rawId: q.id,
        targetId: q.id,
        category: '전표등록',
        subCategory: '견적서',
        title: `견적서 등록 - ${q.partner || '미지정 거래처'}`,
        detail: `품목: ${itemsSummary} | 합계: ${(q.totalPrice || q.totalAmount || 0).toLocaleString()}원`,
        user: q.creator || q.user || q.operator || q.manager || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // 6) Inventory Movements
    (inventoryMovements || []).filter(isSameCompany).forEach(mov => {
      if (loggedTargetIds.has(`${mov.id}_이동`) || loggedTargetIds.has(`${mov.id}_등록`)) return;
      const isPhysicalAdjustment = 
        mov.isPhysicalAdjustment || 
        mov.isAdjustment || 
        mov.adjustmentId ||
        (typeof mov.memo === 'string' && (mov.memo.includes('실사') || mov.memo.includes('재고조정'))) ||
        (typeof mov.from === 'string' && (mov.from.includes('실사') || mov.from.includes('재고조정'))) ||
        (typeof mov.to === 'string' && (mov.to.includes('실사') || mov.to.includes('재고조정'))) ||
        (typeof mov.description === 'string' && (mov.description.includes('실사') || mov.description.includes('재고조정')));
      if (isPhysicalAdjustment) return;

      // 매출출고 제외: 매출전표로 인한 출고는 '매출' 카테고리에서 표시되므로 재고이동 목록에서 제외
      if (
        mov.to === '매출출고' || 
        mov.salesInvoiceId || 
        (typeof mov.to === 'string' && mov.to.includes('매출')) ||
        (typeof mov.memo === 'string' && (mov.memo.startsWith('[매출]') || mov.memo.includes('매출출고')))
      ) {
        return;
      }

      const itemDetail = mov.item ? `${mov.item} (${mov.qty}개${mov.spec ? `, 규격: ${mov.spec}` : ''})` : (mov.items?.map(i => `${i.name}(${i.qty}개)`).join(', ') || '재고 품목');
      const dt = extractDateTime(mov);
      list.push({
        id: `mov-${mov.id}`,
        rawId: mov.id,
        targetId: mov.id,
        category: '이동',
        subCategory: '재고이동',
        title: `재고이동: ${mov.from || mov.fromWarehouse || '출발'} ➔ ${mov.to || mov.toWarehouse || '도착'}`,
        detail: `품목: ${itemDetail} | 구분: ${mov.memo || '재고이동'}`,
        user: mov.creator || mov.operator || mov.user || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '이동',
        badgeBg: '#fdf4ff',
        badgeColor: '#c026d3'
      });
    });

    // 7) Inventory Adjustments
    (inventoryAdjustments || []).filter(isSameCompany).forEach(adj => {
      if (loggedTargetIds.has(`${adj.id}_조정`) || loggedTargetIds.has(`${adj.id}_등록`)) return;
      const dt = extractDateTime(adj);
      list.push({
        id: `adj-${adj.id}`,
        rawId: adj.id,
        targetId: adj.id,
        category: '변경',
        subCategory: '재고조정',
        title: `재고 손실/조정 - ${adj.productName || '품목'}`,
        detail: `조정수량: ${adj.qty > 0 ? '+' + adj.qty : adj.qty}개 | 사유: ${adj.reason || '재고실사 차이'} (창고: ${adj.warehouse || '본사창고'})`,
        user: adj.creator || adj.author || adj.user || '시스템',
        date: dt.displayDate,
        time: dt.displayTime,
        displayDate: dt.displayDate,
        displayTime: dt.displayTime,
        numericTimestamp: dt.numericTimestamp,
        type: '조정',
        badgeBg: '#fef3c7',
        badgeColor: '#d97706'
      });
    });

    const deletedIdSet = new Set((deletedActivityIds || []).map(String));

    const now = Date.now();
    let cutoffMs = null;
    if (localRetentionPeriod === '1day') cutoffMs = now - 24 * 60 * 60 * 1000;
    else if (localRetentionPeriod === '1week') cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
    else if (localRetentionPeriod === '1month') cutoffMs = now - 30 * 24 * 60 * 60 * 1000;

    const filteredList = list.filter(item => {
      if (deletedIdSet.has(String(item.id))) return false;
      if (item.rawId && deletedIdSet.has(String(item.rawId))) return false;
      if (item.targetId && deletedIdSet.has(String(item.targetId))) return false;
      if (cutoffMs && Number(item.numericTimestamp) > 0 && Number(item.numericTimestamp) < cutoffMs) return false;
      return true;
    });

    // Sort by timestamp descending (most recent first)
    return filteredList.sort((a, b) => Number(b.numericTimestamp) - Number(a.numericTimestamp));
  }, [salesInvoices, purchaseInvoices, salesOrders, purchaseOrders, quotations, inventoryMovements, inventoryAdjustments, activityLogs, currentUser?.companyId, deletedActivityIds, localRetentionPeriod]);

  // Extract unique staff members from staffList and activity data
  const staffOptions = useMemo(() => {
    const set = new Set();
    (staffList || []).forEach(s => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    (allActivities || []).forEach(a => {
      if (a.user && a.user.trim() && a.user !== '시스템') {
        set.add(a.user.trim());
      }
    });
    return ['전체', ...Array.from(set)];
  }, [staffList, allActivities]);

  // Calculate activity counts per staff member
  const staffCounts = useMemo(() => {
    const counts = { '전체': allActivities.length };
    allActivities.forEach(a => {
      const u = a.user || '시스템';
      counts[u] = (counts[u] || 0) + 1;
    });
    return counts;
  }, [allActivities]);

  // Filtered Activity Data
  const filteredActivities = useMemo(() => {
    return allActivities.filter(item => {
      // Category Filter
      if ((activeCategory === '등록' || activeCategory === '전표등록') && item.category !== '전표등록' && item.category !== '등록' && item.type !== '등록') return false;
      if (activeCategory === '변경' && item.category !== '변경' && item.type !== '변경' && item.type !== '수정' && item.type !== '조정') return false;
      if (activeCategory === '이동' && item.category !== '이동' && item.type !== '이동') return false;
      if (activeCategory === '삭제' && item.category !== '삭제' && item.type !== '삭제') return false;

      // Staff Filter
      if (selectedStaff !== '전체') {
        if (item.user !== selectedStaff) return false;
      }

      // Date Filter
      if (dateFilter && item.date !== dateFilter && item.displayDate !== dateFilter) return false;

      // Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(term);
        const matchesDetail = item.detail?.toLowerCase().includes(term);
        const matchesUser = item.user?.toLowerCase().includes(term);
        const matchesSub = item.subCategory?.toLowerCase().includes(term);
        const matchesDate = item.displayDate?.includes(term);
        const matchesTime = item.displayTime?.includes(term);
        if (!matchesTitle && !matchesDetail && !matchesUser && !matchesSub && !matchesDate && !matchesTime) return false;
      }

      return true;
    });
  }, [allActivities, activeCategory, selectedStaff, dateFilter, searchTerm]);

  const handleExcelExport = () => {
    const exportData = filteredActivities.map((act, index) => ({
      '번호': index + 1,
      '처리일시': `${act.displayDate} ${act.displayTime !== '-' ? act.displayTime : ''}`.trim(),
      '유형': act.type,
      '구분': act.subCategory,
      '처리내용': act.title,
      '상세정보': act.detail,
      '실행직원': act.user
    }));
    const staffSuffix = selectedStaff !== '전체' ? `_${selectedStaff}` : '';
    exportToExcel(exportData, `최근처리현황보고서${staffSuffix}`);
  };

  const categories = ['전체', '등록', '변경', '이동', '삭제'];

  return (
    <WindowModal title="최근 처리 현황 보고서" onClose={onClose} width="1100px">
      {/* Header: Title & Actions on a clean responsive row */}
      <div className="report-v2-header" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div className="report-v2-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={22} color="#f59e0b" />
          <h2 className="report-v2-title" style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
            최근 처리 현황 보고서
          </h2>
        </div>

        <div className="report-v2-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 내역 자동삭제 기한 설정 셀렉트 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ffffff',
            padding: '4px 8px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <Clock size={13} color="#f59e0b" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              자동삭제 기한:
            </span>
            <select
              value={localRetentionPeriod}
              onChange={(e) => setLocalRetentionPeriod(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: localRetentionPeriod === 'none' ? '#64748b' : '#2563eb',
                outline: 'none',
                cursor: 'pointer'
              }}
              title="설정한 기한이 경과한 내역은 자동으로 삭제되며 원본 데이터는 안전하게 보존됩니다"
            >
              <option value="none">보관 제한 없음</option>
              <option value="1day">하루 (1일 보관)</option>
              <option value="1week">일주일 (7일 보관)</option>
              <option value="1month">한달 (30일 보관)</option>
              <option value="3months">3개월 (90일 보관)</option>
              <option value="6months">6개월 (180일 보관)</option>
              <option value="1year">1년 (365일 보관)</option>
            </select>
          </div>

          {/* 저장하기 버튼 */}
          <button 
            className="btn-v2-action" 
            onClick={handleSaveRetention} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '5px 10px', 
              fontSize: '0.75rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
              whiteSpace: 'nowrap'
            }}
            title="선택한 자동삭제 기한을 저장하고 즉시 적용합니다"
          >
            <Save size={13} /> 저장하기
          </button>

          {/* 설정창(필터/검색) 펼치기/접기 토글 버튼 */}
          <button
            type="button"
            className="btn-v2-action"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: isFilterExpanded ? '#eff6ff' : '#ffffff',
              color: isFilterExpanded ? '#2563eb' : '#475569',
              border: isFilterExpanded ? '1px solid #93c5fd' : '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'nowrap'
            }}
            title="검색, 날짜, 카테고리, 직원별 보기 설정창을 열거나 닫습니다"
          >
            <Filter size={13} color={isFilterExpanded ? "#2563eb" : "#64748b"} />
            <span>설정창 {isFilterExpanded ? '접기 ▲' : '열기 ▼'}</span>
            {(activeCategory !== '전체' || selectedStaff !== '전체' || dateFilter || searchTerm) && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
            )}
          </button>

          <button className="btn-v2-action" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Printer size={13} /> 인쇄
          </button>
          <button className="btn-v2-action" onClick={handleExcelExport} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Download size={13} /> 엑셀 다운로드
          </button>

          {canDelete && selectedActIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const targets = filteredActivities.filter(a => selectedActIds.includes(a.id));
                if (onDeleteMultipleActivities) {
                  onDeleteMultipleActivities(targets);
                } else {
                  targets.forEach(a => onDeleteActivity(a));
                }
                setSelectedActIds([]);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#dc2626',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Trash2 size={13} /> 선택 삭제 ({selectedActIds.length}건)
            </button>
          )}
        </div>
      </div>

      {/* 설정창 접힘 상태일 때 활성 필터 요약 스트립 */}
      {!isFilterExpanded && (activeCategory !== '전체' || selectedStaff !== '전체' || dateFilter || searchTerm) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.74rem', color: '#64748b', flexWrap: 'wrap', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: 700, color: '#2563eb' }}>적용 중인 필터:</span>
          {activeCategory !== '전체' && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>구분: {activeCategory}</span>}
          {dateFilter && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>날짜: {dateFilter}</span>}
          {selectedStaff !== '전체' && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>직원: {selectedStaff}</span>}
          {searchTerm && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>검색: {searchTerm}</span>}
          <button
            type="button"
            onClick={() => { setActiveCategory('전체'); setSelectedStaff('전체'); setDateFilter(''); setSearchTerm(''); }}
            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', textDecoration: 'underline', marginLeft: '4px' }}
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* Category Tabs & Filter Row (기본 가리기 상태) */}
      {isFilterExpanded && (
        <div className="report-v2-filters" style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          {/* Top Row: Categories + Date & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px', overflowX: 'auto', maxWidth: '100%' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    backgroundColor: activeCategory === cat ? '#ffffff' : 'transparent',
                    color: activeCategory === cat ? '#2563eb' : '#64748b',
                    boxShadow: activeCategory === cat ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Date & Search Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff', padding: '3px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
                <DateInputWithArrows
                  value={dateFilter}
                  onChange={(val) => setDateFilter(val)}
                  onPrev={() => shiftDate(-1)}
                  onNext={() => shiftDate(1)}
                  inputStyle={{ border: 'none', padding: '2px 0', fontSize: '0.78rem', fontWeight: 600 }}
                />

                <button
                  type="button"
                  onClick={() => setDateFilter(getTodayStr())}
                  title="오늘 날짜로 이동"
                  style={{
                    padding: '3px 7px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: dateFilter === getTodayStr() ? '#eff6ff' : '#ffffff',
                    color: dateFilter === getTodayStr() ? '#2563eb' : '#475569',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}
                >
                  오늘
                </button>

                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    title="날짜 필터 해제 (전체 보기)"
                    style={{
                      padding: '3px 7px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    전체
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '180px', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="내용 또는 담당자 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Staff Tabs / Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', flexShrink: 0 }}>
              <Users size={14} color="#3b82f6" /> 직원별 보기:
            </div>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              {staffOptions.map(staffName => {
                const isSelected = selectedStaff === staffName;
                const count = staffCounts[staffName] || 0;
                return (
                  <button
                    key={staffName}
                    onClick={() => setSelectedStaff(staffName)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 800 : 600,
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.2)' : 'none'
                    }}
                  >
                    {staffName === '전체' ? '전체 직원' : staffName}
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#3b82f6' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b'
                    }}>
                      {count}건
                    </span>
                  </button>
                );
              })}

              {selectedStaff !== '전체' && (
                <button
                  onClick={() => setSelectedStaff('전체')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#ef4444',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <X size={12} /> 필터 해제
                </button>
              )}

              {canDelete && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  {allActivities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`현재 최근 처리현황에 남아있는 전체 내역(${allActivities.length}건)을 완전히 삭제하시겠습니까?\n\n※ 실제 등록된 원본 전표/주문서/재고 등은 안전하게 보존되며, 최근 처리현황 내역만 깨끗이 비워집니다.`)) {
                          if (onDeleteMultipleActivities) {
                            onDeleteMultipleActivities(allActivities);
                          } else {
                            allActivities.forEach(a => onDeleteActivity(a));
                          }
                          setSelectedActIds([]);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: '#991b1b',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      title="최근 처리현황 목록 전체를 한 번에 비웁니다"
                    >
                      <Trash2 size={12} /> 전체 내역 비우기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Timeline List / Table */}
      <div className="report-v2-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="report-v2-table-container" style={{ flex: 1, minHeight: '420px', maxHeight: isFilterExpanded ? 'calc(80vh - 260px)' : 'calc(80vh - 110px)', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', transition: 'max-height 0.2s ease-in-out' }}>
          <table className="report-v2-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '700px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 10 }}>
              <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                {canDelete && (
                  <th style={{ padding: '8px 8px', width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredActivities.length > 0 && selectedActIds.length === filteredActivities.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedActIds(filteredActivities.map(a => a.id));
                        } else {
                          setSelectedActIds([]);
                        }
                      }}
                      title="전체 선택/해제"
                    />
                  </th>
                )}
                <th style={{ padding: '8px 10px', width: '65px', textAlign: 'center' }}>유형</th>
                <th style={{ padding: '8px 10px', width: '120px' }}>처리일시</th>
                <th style={{ padding: '8px 10px', width: '90px' }}>구분</th>
                <th style={{ padding: '8px 10px' }}>처리 내용</th>
                <th style={{ padding: '8px 10px' }}>상세 정보</th>
                <th style={{ padding: '8px 10px', width: '95px', textAlign: 'center' }}>실행 직원</th>
                {canDelete && <th style={{ padding: '8px 10px', width: '55px', textAlign: 'center' }}>관리</th>}
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 8 : 6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    조건에 해당하는 최근 처리 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const isChecked = selectedActIds.includes(act.id);
                  return (
                    <tr 
                      key={act.id} 
                      onClick={() => handleItemClick(act)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        transition: 'background-color 0.15s',
                        cursor: onOpenActivity ? 'pointer' : 'default',
                        backgroundColor: isChecked ? '#f0f9ff' : undefined
                      }} 
                      className="hover:bg-slate-50"
                      title={onOpenActivity ? '클릭 시 해당 등록/처리 창으로 이동합니다' : undefined}
                    >
                      {canDelete && (
                        <td style={{ padding: '8px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedActIds(prev => [...prev, act.id]);
                              } else {
                                setSelectedActIds(prev => prev.filter(id => id !== act.id));
                              }
                            }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: act.badgeBg,
                          color: act.badgeColor
                        }}>
                          {act.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>{act.displayDate}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px', fontWeight: 600 }}>{act.displayTime}</div>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#334155' }}>
                        {act.subCategory}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>
                        {act.title}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569', fontSize: '0.75rem' }}>
                        {act.detail}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (act.user && act.user !== '시스템') {
                              setSelectedStaff(act.user);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: selectedStaff === act.user ? '#1d4ed8' : (act.user === '시스템' ? '#64748b' : '#1e40af'),
                            fontWeight: 700,
                            cursor: act.user && act.user !== '시스템' ? 'pointer' : 'default',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            backgroundColor: selectedStaff === act.user ? '#dbeafe' : (act.user === '시스템' ? '#f1f5f9' : '#eff6ff'),
                            border: selectedStaff === act.user ? '1px solid #93c5fd' : (act.user === '시스템' ? '1px solid #e2e8f0' : '1px solid #bfdbfe'),
                            boxShadow: selectedStaff === act.user ? '0 1px 2px rgba(29, 78, 216, 0.15)' : 'none',
                            transition: 'all 0.15s'
                          }}
                          title={act.user && act.user !== '시스템' ? `클릭 시 [${act.user}] 실행 직원 내역만 필터링` : undefined}
                        >
                          <User size={12} style={{ flexShrink: 0, color: selectedStaff === act.user ? '#1d4ed8' : (act.user === '시스템' ? '#94a3b8' : '#3b82f6') }} />
                          <span>{act.user || '미지정'}</span>
                        </span>
                      </td>
                      {canDelete && (
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActivity(act);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s'
                            }}
                            title="최근 처리 내역 삭제 (원본 데이터는 보존됩니다)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default RecentActivityModal;
