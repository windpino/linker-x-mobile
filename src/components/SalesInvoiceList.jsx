import React, { useState, useRef, useCallback } from 'react';
import { BookOpen, Printer, Download, Search, Wallet, CreditCard, Landmark, FileText, X } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { matchesInitialSound } from '../utils/koreanUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';

const SalesInvoiceList = ({ onClose, salesInvoices = [], onOpenInvoice, zIndex, staffList = [], initialDate, products }) => {
  const [colWidths, setColWidths] = useState({
    date: 110,
    partner: 150,
    creator: 90,
    item: 220,
    qty: 80,
    totalSales: 120,
    received: 120,
    discount: 100,
    balance: 120
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 50;

  const onResizeMouseDown = useCallback((e, colKey) => {
    e.preventDefault();
    resizingCol.current = colKey;
    resizeStartX.current = e.clientX;
    resizeStartW.current = colWidths[colKey];

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

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const getPresetDates = (preset) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    
    const formatDateStr = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    let start = "";
    let end = formatDateStr(today);

    switch (preset) {
      case '1년':
        start = `${y}-01-01`;
        end = `${y}-12-31`;
        break;
      case '상반기':
        start = `${y}-01-01`;
        end = `${y}-06-30`;
        break;
      case '하반기':
        start = `${y}-07-01`;
        end = `${y}-12-31`;
        break;
      case '한달':
        start = `${y}-${String(m).padStart(2, '0')}-01`;
        break;
      case '1주일':
        const day = today.getDay();
        const sun = new Date(today);
        sun.setDate(today.getDate() - day);
        start = formatDateStr(sun);
        break;
      default:
        start = `${y}-${String(m).padStart(2, '0')}-01`;
    }
    return { start, end };
  };

  const [filter, setFilter] = useState(initialDate ? '' : '1주일');
  const [startDate, setStartDate] = useState(() => initialDate || getPresetDates('1주일').start);
  const [endDate, setEndDate] = useState(() => initialDate || getPresetDates('1주일').end);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filterOptions = ['1주일', '한달', '상반기', '하반기', '1년'];

  // Collect unique creators from invoices and staff list for filter dropdown
  const uniqueCreators = [...new Set(
    (salesInvoices || []).map(inv => inv.creator || '시스템')
  )].filter(Boolean);

  const allStaffNames = [...new Set([
    '전체',
    ...(staffList || []).map(s => s.name),
    ...uniqueCreators
  ])];

  const filteredInvoices = (salesInvoices || []).filter(inv => {
    // 1. Date range filter
    if (inv.date < startDate || inv.date > endDate) return false;

    // 2. Staff filter
    if (selectedStaff) {
      const creatorName = inv.creator || '시스템';
      if (creatorName !== selectedStaff) return false;
    }

    // 3. Search term filter (by partner name or item name)
    const matchesSearch = !searchTerm || 
                          inv.partner.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          matchesInitialSound(inv.partner, searchTerm) ||
                          inv.items.some(item => {
                            const term = searchTerm.toLowerCase();
                            if (item.name.toLowerCase().includes(term)) return true;
                            const product = products && products.find(p => p.name === item.name);
                            return product && product.abbreviation && product.abbreviation.toLowerCase().includes(term);
                          });
    
    return matchesSearch;
  });

  const totals = filteredInvoices.reduce((acc, inv) => {
    acc.cash += inv.payments?.cash || 0;
    acc.account += inv.payments?.account || 0;
    acc.card += inv.payments?.card || 0;
    acc.bill += inv.payments?.bill || 0;
    acc.totalSales += inv.items.reduce((sum, i) => sum + i.total, 0);
    acc.totalReceived += inv.receivedAmount || 0;
    acc.totalBalance += (inv.items.reduce((sum, i) => sum + i.total, 0) - (inv.receivedAmount || 0) - (inv.discount || 0));
    return acc;
  }, { cash: 0, account: 0, card: 0, bill: 0, totalSales: 0, totalReceived: 0, totalBalance: 0 });

  const handleExcelExport = () => {
    const dataToExport = filteredInvoices.map(inv => ({
      '날짜': inv.date,
      '거래처': inv.partner,
      '발행자': inv.creator || '시스템',
      '품목명': inv.items[0]?.name + (inv.items.length > 1 ? ` 외 ${inv.items.length - 1}건` : ''),
      '수량': inv.items.reduce((sum, i) => sum + i.qty, 0),
      '매출액': inv.items.reduce((sum, i) => sum + i.total, 0),
      '입금액': inv.receivedAmount,
      '할인액': inv.discount || 0,
      '미수잔액': (inv.items.reduce((sum, i) => sum + i.total, 0) - inv.receivedAmount - (inv.discount || 0))
    }));
    exportToExcel(dataToExport, '매출전표내역_목록');
  };

  return (
    <WindowModal title="매출전표내역" onClose={onClose} width="1050px" zIndex={zIndex}>
      <div className="account-header">
        <div className="acc-title-section">
          <h2 className="acc-title">
            <BookOpen color="#3b82f6" size={24} />
            매출전표내역
          </h2>
          <p className="acc-desc">등록된 매출 전표 목록과 결제 내역을 모아봅니다.</p>
        </div>
        <div className="acc-actions">
          <button className="btn-outline"><Printer size={16} /> 인쇄</button>
          <button className="btn-outline" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="purchase-modal-body">
        <div className="sales-ledger-filter" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div className="filter-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>시작일</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => {
                  setStartDate(e.target.value);
                  setFilter('');
                }} 
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: '#334155'
                }}
              />
            </div>
            <span style={{ marginBottom: '10px', color: '#64748b', fontWeight: 600 }}>~</span>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>종료일</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => {
                  setEndDate(e.target.value);
                  setFilter('');
                }} 
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: '#334155'
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>발행 직원</label>
              <select
                value={selectedStaff}
                onChange={e => setSelectedStaff(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: 'white',
                  width: '100%',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                {allStaffNames.map((name, i) => (
                  <option key={i} value={name === '전체' ? '' : name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '220px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>거래처 또는 품목 검색 <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>초성 가능</span></label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="거래처 또는 품목명 입력..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    width: '100%',
                    color: '#334155'
                  }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    style={{ 
                      position: 'absolute', 
                      right: '10px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#94a3b8', 
                      padding: '2px' 
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="filter-btns" style={{ display: 'flex', gap: '8px' }}>
            {filterOptions.map(opt => (
              <button 
                key={opt} 
                className={`filter-btn ${filter === opt ? 'active' : ''}`}
                onClick={() => {
                  setFilter(opt);
                  const dates = getPresetDates(opt);
                  setStartDate(dates.start);
                  setEndDate(dates.end);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: filter === opt ? '#3b82f6' : 'white',
                  color: filter === opt ? 'white' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="ledger-summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="ledger-summary-card">
            <div className="summary-card-title"><Wallet size={14} /> 현금 수금</div>
            <div className="summary-card-value">{totals.cash.toLocaleString()}</div>
          </div>
          <div className="ledger-summary-card">
            <div className="summary-card-title"><Landmark size={14} /> 계좌 수금</div>
            <div className="summary-card-value">{totals.account.toLocaleString()}</div>
          </div>
          <div className="ledger-summary-card">
            <div className="summary-card-title"><CreditCard size={14} /> 카드 수금</div>
            <div className="summary-card-value">{totals.card.toLocaleString()}</div>
          </div>
          <div className="ledger-summary-card">
            <div className="summary-card-title"><FileText size={14} /> 어음 수금</div>
            <div className="summary-card-value">{totals.bill.toLocaleString()}</div>
          </div>
          <div className="ledger-summary-card summary-card-total">
            <div className="summary-card-title">총 미수액 (검색 필터)</div>
            <div className="summary-card-value">{totals.totalBalance.toLocaleString()}</div>
          </div>
        </div>

        <div className="invoice-table-container" style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <table className="invoice-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                {[
                  { key: 'date', label: '날짜', width: colWidths.date, align: 'left' },
                  { key: 'partner', label: '거래처', width: colWidths.partner, align: 'left' },
                  { key: 'creator', label: '발행자', width: colWidths.creator, align: 'center' },
                  { key: 'item', label: '품목(대표)', width: colWidths.item, align: 'left' },
                  { key: 'qty', label: '수량', width: colWidths.qty, align: 'center' },
                  { key: 'totalSales', label: '매출액', width: colWidths.totalSales, align: 'right' },
                  { key: 'received', label: '입금액', width: colWidths.received, align: 'right' },
                  { key: 'discount', label: '할인액', width: colWidths.discount, align: 'right' },
                  { key: 'balance', label: '미수잔액', width: colWidths.balance, align: 'right' }
                ].map(col => (
                  <th 
                    key={col.key} 
                    style={{ 
                      width: col.width + 'px', 
                      position: 'relative', 
                      userSelect: 'none', 
                      textAlign: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left'
                    }}
                  >
                    {col.label}
                    <span
                      onMouseDown={(e) => onResizeMouseDown(e, col.key)}
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
              </tr>
            </thead>
            <tbody>
              {filteredInvoices?.length > 0 ? (
                filteredInvoices.map(inv => {
                  const invTotal = inv.items.reduce((sum, i) => sum + i.total, 0);
                  const invBalance = invTotal - (inv.receivedAmount || 0) - (inv.discount || 0);
                  return (
                    <tr 
                      key={inv.id} 
                      onDoubleClick={() => onOpenInvoice(inv)}
                      style={{ cursor: 'pointer' }}
                      title="더블클릭하여 전표 수정"
                    >
                      <td>{inv.date}</td>
                      <td style={{ fontWeight: 600 }}>{inv.partner}</td>
                      <td className="text-center" style={{ color: '#64748b', fontSize: '0.85rem' }}>{inv.creator || '시스템'}</td>
                      <td>{inv.items[0]?.name} {inv.items.length > 1 ? `외 ${inv.items.length - 1}건` : ''}</td>
                      <td className="text-center">{inv.items.reduce((sum, i) => sum + i.qty, 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{invTotal.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{(inv.receivedAmount || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444' }}>{(inv.discount || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: invBalance > 0 ? '#2563eb' : '#64748b' }}>
                        {invBalance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ padding: '60px 0', color: '#94a3b8', textAlign: 'center' }}>조회된 내역이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default SalesInvoiceList;
