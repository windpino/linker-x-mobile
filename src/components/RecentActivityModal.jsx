import React, { useState, useMemo } from 'react';
import { History, Printer, Download, Search, Filter, Calendar, FileText, CheckCircle2, ArrowRightLeft, AlertTriangle, Trash2 } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';

const RecentActivityModal = ({ 
  onClose, 
  salesInvoices = [], 
  purchaseInvoices = [], 
  salesOrders = [], 
  purchaseOrders = [], 
  inventoryMovements = [], 
  inventoryAdjustments = [],
  activityLogs = []
}) => {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // 1. Gather all activity logs into a unified timeline
  const allActivities = useMemo(() => {
    const list = [];

    // Sales Invoices
    salesInvoices.forEach(inv => {
      list.push({
        id: `sales-inv-${inv.id}`,
        rawId: inv.id,
        category: '전표등록',
        subCategory: '매출전표',
        title: `매출전표 등록 - ${inv.partner || '미지정 거래처'}`,
        detail: `총 ${inv.items?.length || 0}개 품목 | 합계: ${(inv.totalAmount || 0).toLocaleString()}원`,
        user: inv.manager || inv.creator || '시스템',
        date: inv.date || new Date().toISOString().split('T')[0],
        timestamp: inv.createdAt || inv.id || new Date(inv.date || Date.now()).getTime(),
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // Purchase Invoices
    purchaseInvoices.forEach(inv => {
      list.push({
        id: `purch-inv-${inv.id}`,
        rawId: inv.id,
        category: '전표등록',
        subCategory: '매입전표',
        title: `매입전표 등록 - ${inv.partner || '미지정 거래처'}`,
        detail: `총 ${inv.items?.length || 0}개 품목 | 합계: ${(inv.totalAmount || 0).toLocaleString()}원`,
        user: inv.manager || inv.creator || '시스템',
        date: inv.date || new Date().toISOString().split('T')[0],
        timestamp: inv.createdAt || inv.id || new Date(inv.date || Date.now()).getTime(),
        type: '등록',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb'
      });
    });

    // Sales Orders
    salesOrders.forEach(ord => {
      list.push({
        id: `order-${ord.id}`,
        rawId: ord.id,
        category: '전표등록',
        subCategory: '수주등록',
        title: `수주 등록 - ${ord.partner || '미지정 거래처'}`,
        detail: `상태: ${ord.status || '수주완료'} | 수주금액: ${(ord.totalPrice || 0).toLocaleString()}원`,
        user: ord.manager || '시스템',
        date: ord.date || new Date().toISOString().split('T')[0],
        timestamp: ord.createdAt || ord.id || new Date(ord.date || Date.now()).getTime(),
        type: '등록',
        badgeBg: '#f0fdf4',
        badgeColor: '#16a34a'
      });
    });

    // Purchase Orders
    purchaseOrders.forEach(po => {
      list.push({
        id: `po-${po.id}`,
        rawId: po.id,
        category: '전표등록',
        subCategory: '발주등록',
        title: `발주 등록 - ${po.partner || '미지정 거래처'}`,
        detail: `상태: ${po.status || '진행중'} | 발주금액: ${(po.totalAmount || 0).toLocaleString()}원`,
        user: po.manager || '시스템',
        date: po.date || new Date().toISOString().split('T')[0],
        timestamp: po.createdAt || po.id || new Date(po.date || Date.now()).getTime(),
        type: '등록',
        badgeBg: '#f0fdf4',
        badgeColor: '#16a34a'
      });
    });

    // Inventory Movements
    inventoryMovements.forEach(mov => {
      const itemNames = mov.items?.map(i => `${i.name}(${i.qty}개)`).join(', ') || '재고 품목';
      list.push({
        id: `mov-${mov.id}`,
        rawId: mov.id,
        category: '이동',
        subCategory: '재고이동',
        title: `재고이동: ${mov.fromWarehouse || '출발'} ➔ ${mov.toWarehouse || '도착'}`,
        detail: `이동품목: ${itemNames}`,
        user: mov.creator || '시스템',
        date: mov.date || new Date().toISOString().split('T')[0],
        timestamp: mov.createdAt || mov.id || new Date(mov.date || Date.now()).getTime(),
        type: '이동',
        badgeBg: '#fdf4ff',
        badgeColor: '#c026d3'
      });
    });

    // Inventory Adjustments
    inventoryAdjustments.forEach(adj => {
      list.push({
        id: `adj-${adj.id}`,
        rawId: adj.id,
        category: '변경',
        subCategory: '재고조정',
        title: `재고 손실/조정 - ${adj.productName || '품목'}`,
        detail: `조정수량: ${adj.qty > 0 ? '+' + adj.qty : adj.qty}개 | 사유: ${adj.reason || '재고실사 차이'}`,
        user: adj.creator || '시스템',
        date: adj.date || new Date().toISOString().split('T')[0],
        timestamp: adj.createdAt || adj.id || new Date(adj.date || Date.now()).getTime(),
        type: '변경',
        badgeBg: '#fff7ed',
        badgeColor: '#ea580c'
      });
    });

    // System/Edit/Delete Logs
    activityLogs.forEach((log, idx) => {
      const isDelete = log.type === '삭제' || (log.action && log.action.includes('삭제'));
      const isEdit = log.type === '변경' || log.type === '수정' || (log.action && (log.action.includes('수정') || log.action.includes('변경')));
      
      const type = isDelete ? '삭제' : (isEdit ? '변경' : (log.type || '변경'));
      list.push({
        id: `log-${log.id || idx}`,
        rawId: log.id || idx,
        category: type === '삭제' ? '삭제' : (type === '이동' ? '이동' : (type === '등록' ? '전표등록' : '변경')),
        subCategory: log.category || '전표',
        title: log.title || log.action || `${type} 처리 완료`,
        detail: log.detail || log.message || '시스템 처리 이력 기록',
        user: log.user || log.manager || '시스템',
        date: log.date || new Date().toISOString().split('T')[0],
        timestamp: log.timestamp || log.id || Date.now(),
        type: type,
        badgeBg: type === '삭제' ? '#fef2f2' : (type === '변경' ? '#fff7ed' : '#f8fafc'),
        badgeColor: type === '삭제' ? '#ef4444' : (type === '변경' ? '#ea580c' : '#475569')
      });
    });

    // Sort by timestamp or date descending (most recent first)
    return list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return Number(b.timestamp) - Number(a.timestamp);
    });
  }, [salesInvoices, purchaseInvoices, salesOrders, purchaseOrders, inventoryMovements, inventoryAdjustments, activityLogs]);

  // Filtered Activity Data
  const filteredActivities = useMemo(() => {
    return allActivities.filter(item => {
      // Category Filter
      if (activeCategory === '전표등록' && item.category !== '전표등록') return false;
      if (activeCategory === '변경' && item.category !== '변경' && item.type !== '변경') return false;
      if (activeCategory === '이동' && item.category !== '이동' && item.type !== '이동') return false;
      if (activeCategory === '삭제' && item.category !== '삭제' && item.type !== '삭제') return false;

      // Date Filter
      if (dateFilter && item.date !== dateFilter) return false;

      // Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(term);
        const matchesDetail = item.detail?.toLowerCase().includes(term);
        const matchesUser = item.user?.toLowerCase().includes(term);
        const matchesSub = item.subCategory?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDetail && !matchesUser && !matchesSub) return false;
      }

      return true;
    });
  }, [allActivities, activeCategory, dateFilter, searchTerm]);

  const handleExcelExport = () => {
    const exportData = filteredActivities.map((act, index) => ({
      '번호': index + 1,
      '처리일자': act.date,
      '유형': act.type,
      '구분': act.subCategory,
      '처리내용': act.title,
      '상세정보': act.detail,
      '처리자': act.user
    }));
    exportToExcel(exportData, '최근처리현황보고서');
  };

  const categories = ['전체', '전표등록', '변경', '이동', '삭제'];

  return (
    <WindowModal title="최근 처리 현황 보고서" onClose={onClose} width="1050px">
      <div className="report-v2-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="report-v2-title-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={24} color="#f59e0b" />
          <div>
            <h2 className="report-v2-title" style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
              최근 처리 현황 & 작업 이력
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              전표 등록, 수정/변경, 재고 이동 및 삭제 처리 등 전체 시스템 작업 내역을 최신순으로 확인합니다.
            </p>
          </div>
        </div>
        <div className="report-v2-actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-v2-action" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem' }}>
            <Printer size={14} /> 인쇄
          </button>
          <button className="btn-v2-action" onClick={handleExcelExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem' }}>
            <Download size={14} /> 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Category Tabs & Filter Row */}
      <div className="report-v2-filters" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <Calendar size={14} color="#64748b" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                  초기화
                </button>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '220px' }}>
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
      </div>

      {/* Main Timeline List / Table */}
      <div className="report-v2-content">
        <div className="report-v2-table-container" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <table className="report-v2-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 10 }}>
              <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '10px 12px', width: '70px', textAlign: 'center' }}>유형</th>
                <th style={{ padding: '10px 12px', width: '110px' }}>처리일자</th>
                <th style={{ padding: '10px 12px', width: '100px' }}>구분</th>
                <th style={{ padding: '10px 12px' }}>처리 내용</th>
                <th style={{ padding: '10px 12px' }}>상세 정보</th>
                <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center' }}>담당자</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                    조건에 해당하는 최근 처리 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => (
                  <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} className="hover:bg-slate-50">
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: act.badgeBg,
                        color: act.badgeColor
                      }}>
                        {act.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>
                      {act.date}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>
                      {act.subCategory}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                      {act.title}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', fontSize: '0.78rem' }}>
                      {act.detail}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#2563eb', fontWeight: 700 }}>
                      {act.user}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default RecentActivityModal;
