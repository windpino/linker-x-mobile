import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Printer, 
  Download, 
  Trash2, 
  Edit3, 
  ShoppingCart, 
  Plus, 
  Calendar, 
  User, 
  Building2, 
  FileText,
  RotateCcw
} from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { matchesInitialSound } from '../utils/koreanUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';

const QuotationManagement = ({
  onClose,
  quotations = [],
  staffList = [],
  partners = [],
  currentUser,
  onEditQuotation,
  onDeleteQuotation,
  onNewQuotation,
  onConvertToOrder,
  zIndex
}) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;

  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getPresetDates = (preset) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    let start = '';
    let end = formatDateStr(today);

    switch (preset) {
      case '오늘':
        start = formatDateStr(today);
        end = formatDateStr(today);
        break;
      case '1주일': {
        const d = new Date(today);
        d.setDate(today.getDate() - 7);
        start = formatDateStr(d);
        break;
      }
      case '한달': {
        const d = new Date(today);
        d.setMonth(today.getMonth() - 1);
        start = formatDateStr(d);
        break;
      }
      case '3개월': {
        const d = new Date(today);
        d.setMonth(today.getMonth() - 3);
        start = formatDateStr(d);
        break;
      }
      case '상반기':
        start = `${y}-01-01`;
        end = `${y}-06-30`;
        break;
      case '하반기':
        start = `${y}-07-01`;
        end = `${y}-12-31`;
        break;
      case '1년':
        start = `${y}-01-01`;
        end = `${y}-12-31`;
        break;
      case '전체':
        start = '';
        end = '';
        break;
      default: {
        const d = new Date(today);
        d.setMonth(today.getMonth() - 1);
        start = formatDateStr(d);
        break;
      }
    }
    return { start, end };
  };

  const [datePreset, setDatePreset] = useState('한달');
  const [startDate, setStartDate] = useState(() => getPresetDates('한달').start);
  const [endDate, setEndDate] = useState(() => getPresetDates('한달').end);
  const [selectedStaff, setSelectedStaff] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePresetClick = (preset) => {
    setDatePreset(preset);
    const { start, end } = getPresetDates(preset);
    setStartDate(start);
    setEndDate(end);
  };

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return (quotations || []).filter(q => {
      // 1. Date filter
      const qDate = q.date || (q.createdAt ? q.createdAt.split('T')[0] : '');
      if (startDate && qDate && qDate < startDate) return false;
      if (endDate && qDate && qDate > endDate) return false;

      // 2. Staff filter
      if (selectedStaff !== '전체') {
        const qStaff = q.manager || q.creator || '';
        if (qStaff !== selectedStaff) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const partnerName = q.partner || '';
        const managerName = q.manager || q.creator || '';
        const itemsText = q.itemsText || (q.items ? q.items.map(it => it.name).join(' ') : '');
        const memo = q.memo || '';
        const qId = String(q.id || '');

        const matchesQuery = 
          partnerName.toLowerCase().includes(query) ||
          matchesInitialSound(partnerName, query) ||
          managerName.toLowerCase().includes(query) ||
          matchesInitialSound(managerName, query) ||
          itemsText.toLowerCase().includes(query) ||
          memo.toLowerCase().includes(query) ||
          qId.includes(query);

        if (!matchesQuery) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort newest first
      const dateA = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
      const dateB = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '');
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [quotations, startDate, endDate, selectedStaff, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    let count = filteredQuotations.length;
    let totalQty = 0;
    let supplyValue = 0;
    let tax = 0;
    let totalAmount = 0;

    filteredQuotations.forEach(q => {
      totalQty += Number(q.totalQty || 0);
      const total = Number(q.totalPrice || q.totalAmount || 0);
      totalAmount += total;
      
      const sVal = q.supplyValue !== undefined ? Number(q.supplyValue) : Math.round(total / 1.1);
      const tVal = q.tax !== undefined ? Number(q.tax) : (total - sVal);
      supplyValue += sVal;
      tax += tVal;
    });

    return { count, totalQty, supplyValue, tax, totalAmount };
  }, [filteredQuotations]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredQuotations.length === 0) {
      alert('내보낼 견적서 데이터가 없습니다.');
      return;
    }

    const exportData = filteredQuotations.map((q, idx) => {
      const total = Number(q.totalPrice || q.totalAmount || 0);
      const sVal = q.supplyValue !== undefined ? Number(q.supplyValue) : Math.round(total / 1.1);
      const tVal = q.tax !== undefined ? Number(q.tax) : (total - sVal);
      const itemsSummary = q.itemsText || (q.items ? q.items.map(it => `${it.name}(${it.qty || 1}개)`).join(', ') : '-');

      return {
        '순번': idx + 1,
        '견적번호': q.id,
        '견적일자': q.date || '-',
        '거래처명': q.partner || '-',
        '담당자': q.manager || q.creator || '-',
        '견적품목': itemsSummary,
        '총수량': q.totalQty || (q.items ? q.items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0) : 0),
        '공급가액': sVal,
        '세액': tVal,
        '총견적금액': total,
        '유효기간': q.validUntil || '견적일로부터 15일간',
        '비고': q.memo || ''
      };
    });

    exportToExcel(exportData, `견적서목록_${startDate || '전체'}~${endDate || '전체'}`);
  };

  const handleDelete = (id, partner) => {
    if (window.confirm(`[${partner || '견적서'}] 내역을 삭제하시겠습니까?`)) {
      if (onDeleteQuotation) {
        onDeleteQuotation(id);
      }
    }
  };

  return (
    <WindowModal
      title="견적서 관리"
      onClose={onClose}
      width="1280px"
      height="820px"
      contentPadding="0"
      zIndex={zIndex}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
        {/* 1. Header Toolbar & Filters */}
        <div style={{ padding: '12px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {/* Quick Date Presets */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              {['오늘', '1주일', '한달', '3개월', '상반기', '하반기', '1년', '전체'].map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '0.78rem',
                    fontWeight: datePreset === preset ? 700 : 500,
                    border: '1px solid',
                    borderColor: datePreset === preset ? '#2563eb' : '#cbd5e1',
                    backgroundColor: datePreset === preset ? '#2563eb' : '#ffffff',
                    color: datePreset === preset ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Top Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={handleExportExcel}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> 엑셀
              </button>

              <button
                onClick={() => {
                  if (onNewQuotation) onNewQuotation();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} /> 신규등록
              </button>
            </div>
          </div>

          {/* Secondary Filter Row: Date Pickers + Staff + Search Input */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset(''); }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  backgroundColor: '#ffffff'
                }}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset(''); }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            {/* Staff Selector */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="전체">담당자 전체</option>
                {(staffList || []).map(s => (
                  <option key={s.id || s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="거래처, 품목, 담당자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 28px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. KPI Summary Bar */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '8px', 
          padding: '10px 16px', 
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>총 건수</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              {totals.count.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>건</span>
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>공급가액</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb' }}>
              {totals.supplyValue.toLocaleString()}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>세액</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
              {totals.tax.toLocaleString()}
            </div>
          </div>
          <div style={{ backgroundColor: '#eff6ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700 }}>견적 합계</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e40af' }}>
              {totals.totalAmount.toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 3. Data Table */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>No.</th>
                <th style={{ padding: '8px 10px', width: '85px' }}>일자</th>
                <th style={{ padding: '8px 10px', width: '130px' }}>거래처명</th>
                <th style={{ padding: '8px 10px', width: '75px' }}>담당자</th>
                <th style={{ padding: '8px 10px', minWidth: '160px' }}>품목 내역</th>
                <th style={{ padding: '8px 10px', width: '60px', textAlign: 'right' }}>수량</th>
                <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>공급가액</th>
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'right' }}>세액</th>
                <th style={{ padding: '8px 10px', width: '100px', textAlign: 'right' }}>견적합계</th>
                <th style={{ padding: '8px 10px', width: '110px' }}>비고</th>
                <th style={{ padding: '8px 10px', width: '135px', textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length > 0 ? (
                filteredQuotations.map((q, idx) => {
                  const total = Number(q.totalPrice || q.totalAmount || 0);
                  const sVal = q.supplyValue !== undefined ? Number(q.supplyValue) : Math.round(total / 1.1);
                  const tVal = q.tax !== undefined ? Number(q.tax) : (total - sVal);
                  const itemsSummary = q.itemsText || (q.items ? q.items.map(it => `${it.name}(${it.qty || 1})`).join(', ') : '-');
                  const totalQty = q.totalQty || (q.items ? q.items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0) : 0);

                  return (
                    <tr 
                      key={q.id || idx}
                      onDoubleClick={() => onEditQuotation && onEditQuotation(q)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>
                        {q.date || '-'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>
                        {q.partner || '미지정'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>
                        {q.manager || q.creator || '-'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemsSummary}>
                        {itemsSummary}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>
                        {Number(totalQty).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                        {sVal.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                        {tVal.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                        {total.toLocaleString()}원
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.74rem' }}>
                        {q.memo && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.memo}>{q.memo}</span>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEditQuotation) onEditQuotation(q);
                            }}
                            title="수정"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            수정
                          </button>

                          {onConvertToOrder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const orderPayload = {
                                  id: Date.now(),
                                  date: q.date,
                                  partner: q.partner,
                                  outWarehouse: q.outWarehouse,
                                  manager: q.manager,
                                  itemsText: q.itemsText,
                                  items: q.items || [],
                                  totalPrice: q.totalPrice || q.totalAmount,
                                  totalAmount: q.totalPrice || q.totalAmount,
                                  totalQty: q.totalQty,
                                  memo: q.memo ? `[견적연동] ${q.memo}` : '[견적연동]',
                                  fromQuotationId: q.id
                                };
                                onConvertToOrder(orderPayload);
                              }}
                              title="수주전환"
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid #bbf7d0',
                                backgroundColor: '#f0fdf4',
                                color: '#16a34a',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              수주
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(q.id, q.partner);
                            }}
                            title="삭제"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} style={{ padding: '50px 0', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <FileText size={32} style={{ color: '#cbd5e1' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>조회된 견적서 내역이 없습니다.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default QuotationManagement;
