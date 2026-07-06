import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BookOpen, Printer, Download, Search, Settings, X } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { exportToExcel } from '../utils/excelUtils';
import './PurchaseInvoice.css';
import './SalesManagementCommon.css';

const SalesLedger = ({ onClose, salesInvoices = [], partners = [], onOpenInvoice, currentUser, onUpdateInvoice, zIndex, initialPartner = '', initialDate = '' }) => {
  const [colWidths, setColWidths] = useState({
    date: 100,
    partner: 130,
    name: 180,
    spec: 120,
    qty: 80,
    price: 90,
    supplyValue: 110,
    total: 110,
    received: 110,
    balance: 120,
    creator: 90,
    createdAt: 90,
    updatedAt: 90
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 40;

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
  const [filter, setFilter] = useState('한달');
  const filterOptions = ['1주일', '한달', '상반기', '하반기', '1년'];
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchText, setSearchText] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (initialPartner) {
      setSelectedPartner(initialPartner);
      setSearchText(initialPartner);
    } else {
      setSelectedPartner('');
      setSearchText('');
    }

    if (initialDate) {
      const parts = initialDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDayDate = new Date(year, month, 0);
        const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        
        setStartDate(firstDay);
        setEndDate(lastDay);
        setFilter(`${month}월`);
      }
    } else {
      const today = new Date();
      const formatStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const end = formatStr(today);
      const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      
      setStartDate(start);
      setEndDate(end);
      setFilter('한달');
    }
  }, [initialPartner, initialDate]);

  // Quick date filter
  const applyFilter = (opt) => {
    setFilter(opt);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    let start = "";
    let end = formatDate(today);

    switch (opt) {
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
        start = formatDate(sun);
        break;
      default:
        start = `${y}-${String(m).padStart(2, '0')}-01`;
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  // Unique partner names for autocomplete
  const uniquePartners = [...new Set(salesInvoices.map(inv => inv.partner).filter(Boolean))];
  const suggestions = searchText.trim()
    ? uniquePartners.filter(name => matchesInitialSound(name, searchText.trim()))
    : [];



  // 1. Calculate Carried Forward
  let carriedForward = 0;
  const priorInvoices = salesInvoices.filter(inv => {
    if (inv.date >= startDate) return false;
    if (selectedPartner) return inv.partner === selectedPartner;
    return true;
  });
  const priorSales = priorInvoices.reduce((sum, inv) => {
    const itemsSum = inv.items && inv.items.length > 0 ? inv.items.reduce((s, item) => s + (item.total || 0), 0) : (inv.totalAmount || 0);
    return sum + itemsSum;
  }, 0);
  const priorReceived = priorInvoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0);
  const priorDiscount = priorInvoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);
  carriedForward = priorSales - priorReceived - priorDiscount;

  // 2. Overhaul Data Pipeline to traditional "ledger book" format (장부식)
  const rows = [];

  // Push Carried Forward row
  rows.push({
    rowType: 'carriedForward',
    date: '[전기이월]',
    name: '[전기이월]',
    spec: '',
    qty: '',
    price: '',
    supplyValue: '',
    total: '',
    received: '',
    balance: carriedForward,
    isFirstRowOfDay: true,
    isFirstRowOfInvoice: false
  });

  // Filter and sort invoices
  const currentInvoices = salesInvoices
    .filter(inv => {
      if (inv.date < startDate || inv.date > endDate) return false;
      if (selectedPartner) return inv.partner === selectedPartner;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      
      // Sort chronologically by time of creation/issue
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0);
      return timeA - timeB;
    });

  // Group invoices by date
  const invoicesByDate = {};
  currentInvoices.forEach(inv => {
    if (!invoicesByDate[inv.date]) {
      invoicesByDate[inv.date] = [];
    }
    invoicesByDate[inv.date].push(inv);
  });

  let runningBalance = carriedForward;

  // Process each day chronologically
  const sortedDates = Object.keys(invoicesByDate).sort();
  sortedDates.forEach(dateStr => {
    const dayInvoices = invoicesByDate[dateStr];
    const dayRows = [];

    let dayTotalQty = 0;
    let dayTotalSupplyValue = 0;
    let dayTotalAmount = 0;
    let dayTotalReceived = 0;

    dayInvoices.forEach(inv => {
      const rowCreator = inv.creator || inv.manager || '시스템';
      const partner = partners.find(p => p.name === inv.partner);
      const partnerBankAccount = partner ? partner.bankAccount : '';

      // A. Sales items rows
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item, idx) => {
          runningBalance += (item.total || 0);
          dayTotalQty += Number(item.qty || 0);
          const itemSupply = item.supplyValue !== undefined ? item.supplyValue : Math.floor((item.total || 0) / 1.1);
          dayTotalSupplyValue += itemSupply;
          dayTotalAmount += (item.total || 0);

          dayRows.push({
            rowType: 'sale',
            invoiceId: inv.id,
            itemId: item.id,
            date: dateStr,
            partner: inv.partner,
            name: item.name,
            spec: item.spec || '',
            qty: item.qty,
            price: item.price,
            supplyValue: itemSupply,
            total: item.total,
            received: '',
            balance: runningBalance,
            isFirstRowOfInvoice: idx === 0,
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt,
            creator: rowCreator
          });
        });
      } else {
        // Fallback if no items but total exists
        const totalAmt = inv.totalAmount || 0;
        if (totalAmt > 0) {
          runningBalance += totalAmt;
          const itemSupply = Math.floor(totalAmt / 1.1);
          dayTotalSupplyValue += itemSupply;
          dayTotalAmount += totalAmt;

          dayRows.push({
            rowType: 'sale',
            invoiceId: inv.id,
            itemId: null,
            date: dateStr,
            partner: inv.partner,
            name: '매출',
            spec: '',
            qty: 0,
            price: 0,
            supplyValue: itemSupply,
            total: totalAmt,
            received: '',
            balance: runningBalance,
            isFirstRowOfInvoice: true,
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt,
            creator: rowCreator
          });
        }
      }

      // B. Payment rows
      const paymentsList = [];
      if (inv.payments) {
        if (inv.payments.cash > 0) paymentsList.push({ type: 'cash', amount: inv.payments.cash, label: '입금(현금)', spec: '' });
        if (inv.payments.account > 0) paymentsList.push({ type: 'account', amount: inv.payments.account, label: '입금(통장)', spec: partnerBankAccount && partnerBankAccount !== '선택안함' ? partnerBankAccount : '' });
        if (inv.payments.card > 0) paymentsList.push({ type: 'card', amount: inv.payments.card, label: '입금(카드)', spec: '' });
        if (inv.payments.bill > 0) paymentsList.push({ type: 'bill', amount: inv.payments.bill, label: '입금(어음)', spec: '' });
      }
      if (paymentsList.length === 0 && (inv.receivedAmount || 0) > 0) {
        paymentsList.push({ type: 'cash', amount: inv.receivedAmount, label: '입금(현금)', spec: '' });
      }

      paymentsList.forEach((pm, pmIdx) => {
        runningBalance -= pm.amount;
        dayTotalReceived += pm.amount;

        dayRows.push({
          rowType: 'payment',
          invoiceId: inv.id,
          paymentType: pm.type,
          date: dateStr,
          partner: inv.partner,
          name: pm.label,
          spec: pm.spec,
          qty: '',
          price: '',
          supplyValue: '',
          total: '',
          received: pm.amount,
          balance: runningBalance,
          isFirstRowOfInvoice: pmIdx === 0 && (!inv.items || inv.items.length === 0),
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          creator: rowCreator
        });
      });

      // C. Discount rows
      if (inv.discount > 0) {
        runningBalance -= inv.discount;
        dayTotalReceived += inv.discount;

        dayRows.push({
          rowType: 'discount',
          invoiceId: inv.id,
          date: dateStr,
          partner: inv.partner,
          name: '할인(DC)',
          spec: '',
          qty: '',
          price: '',
          supplyValue: '',
          total: '',
          received: inv.discount,
          balance: runningBalance,
          isFirstRowOfInvoice: false,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          creator: rowCreator
        });
      }
    });

    if (dayRows.length > 0) {
      // Set date vertical merge: only show date on first row of the day
      dayRows.forEach((r, idx) => {
        r.isFirstRowOfDay = (idx === 0);
      });
      rows.push(...dayRows);

      // Push Daily Subtotal row (【 일계 】)
      rows.push({
        rowType: 'subtotal',
        date: dateStr,
        name: '【 일계 】',
        spec: '',
        qty: dayTotalQty,
        price: '',
        supplyValue: dayTotalSupplyValue,
        total: dayTotalAmount,
        received: dayTotalReceived,
        balance: runningBalance,
        isFirstRowOfDay: false,
        isFirstRowOfInvoice: false
      });
    }
  });

  // Summary card calculations
  let totalQty = 0;
  let totalSales = 0;
  let totalReceived = 0;
  let balance = 0;

  const currentSummaryInvoices = salesInvoices.filter(inv => {
    if (inv.date < startDate || inv.date > endDate) return false;
    if (selectedPartner) return inv.partner === selectedPartner;
    return true;
  });
  currentSummaryInvoices.forEach(inv => {
    totalSales += inv.items ? inv.items.reduce((s, i) => s + (i.total || 0), 0) : (inv.totalAmount || 0);
    totalReceived += (inv.receivedAmount || 0) + (inv.discount || 0);
    totalQty += inv.items ? inv.items.reduce((s, i) => s + Number(i.qty || 0), 0) : 0;
  });
  balance = carriedForward + totalSales - totalReceived;

  const handleExcelExport = () => {
    const dataToExport = rows.map(r => ({
      '거래일자': r.rowType === 'carriedForward' ? '[전기이월]' : (r.isFirstRowOfDay ? r.date : ''),
      '거래처': r.partner || '',
      '상 품 명': r.name,
      '규 격': r.spec || '',
      '수량': r.qty !== '' && r.qty !== undefined ? Number(r.qty) : '',
      '단가': r.price !== '' && r.price !== undefined ? Number(r.price) : '',
      '공급가액': r.supplyValue !== '' && r.supplyValue !== undefined ? Number(r.supplyValue) : '',
      '합계액': r.total !== '' && r.total !== undefined ? Number(r.total) : '',
      '입금액': r.received !== '' && r.received !== undefined ? Number(r.received) : '',
      '잔액': r.balance !== '' && r.balance !== undefined ? Number(r.balance) : '',
      '발행자': r.creator || ''
    }));

    const filename = `매출원장_${selectedPartner || '전체거래처'}`;
    exportToExcel(dataToExport, filename);
  };

  const handleInlineEdit = (invoiceId, itemId, field, value, paymentType = null) => {
    const val = Number(value) || 0;
    const originalInv = salesInvoices.find(inv => inv.id === invoiceId);
    if (!originalInv) return;

    let updatedInv = { ...originalInv };

    if (field === 'received') {
      const currentPayments = updatedInv.payments || { cash: 0, account: 0, card: 0, bill: 0 };
      if (paymentType) {
        const newPayments = { ...currentPayments, [paymentType]: val };
        updatedInv.payments = newPayments;
        updatedInv.receivedAmount = (newPayments.cash || 0) + (newPayments.account || 0) + (newPayments.card || 0) + (newPayments.bill || 0);
      } else {
        updatedInv.receivedAmount = val;
        const others = (currentPayments.account || 0) + (currentPayments.card || 0) + (currentPayments.bill || 0);
        updatedInv.payments = { ...currentPayments, cash: Math.max(0, val - others) };
      }
    } else if (field === 'discount') {
      updatedInv.discount = val;
    } else {
      // qty or price
      updatedInv.items = updatedInv.items.map(item => {
        if (item.id === itemId) {
          const newQty = field === 'qty' ? val : item.qty;
          const newPrice = field === 'price' ? val : item.price;
          const newTotal = newQty * newPrice;
          return {
            ...item,
            qty: newQty,
            price: newPrice,
            supplyValue: Math.floor(newTotal / 1.1),
            tax: newTotal - Math.floor(newTotal / 1.1),
            total: newTotal
          };
        }
        return item;
      });
      // Recalculate totalAmount
      updatedInv.totalAmount = updatedInv.items.reduce((sum, item) => sum + (item.total || 0), 0);
    }

    onUpdateInvoice(updatedInv);
  };

  const isAdmin = currentUser?.role === 'super_admin' || 
                  currentUser?.role === 'admin' || 
                  currentUser?.userId === 'admin' ||
                  currentUser?.allowAllEditDelete === true;

  return (
    <WindowModal title="매출원장" onClose={onClose} width="1250px" zIndex={zIndex}>
      <div className="account-header">
        <div className="acc-title-section">
          <h2 className="acc-title">
            <BookOpen color="#3b82f6" size={24} />
            매출원장
          </h2>
        </div>
        <div className="acc-actions">
          <button className="btn-outline"><Printer size={16} /> 인쇄</button>
          <button className="btn-outline" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="purchase-modal-body">
        <div className="sales-ledger-filter">
          <div className="filter-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>시작일</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <span style={{ marginBottom: '10px' }}>~</span>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>종료일</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>

            {/* 초성 검색 */}
            <div className="form-group" style={{ marginBottom: 0, flex: 1, position: 'relative' }} ref={searchRef}>
              <label>업체명 검색 <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>초성 가능</span></label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchText}
                  placeholder="업체명 검색 (예: ㅈㅅㅁ)"
                  onChange={e => { setSearchText(e.target.value); setSelectedPartner(''); setShowSuggestions(true); }}
                  onFocus={() => searchText && setShowSuggestions(true)}
                  style={{ paddingLeft: '28px', paddingRight: searchText ? '28px' : '8px' }}
                />
                {searchText && (
                  <button onClick={() => { setSearchText(''); setSelectedPartner(''); }} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                  {suggestions.map((name, i) => (
                    <div key={i}
                      onMouseDown={() => { setSelectedPartner(name); setSearchText(name); setShowSuggestions(false); }}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="filter-btns">
            {filterOptions.map(opt => (
              <button key={opt} className={`filter-btn ${filter === opt ? 'active' : ''}`} onClick={() => applyFilter(opt)}>{opt}</button>
            ))}
          </div>
        </div>

        <>
          <div style={{ padding: '6px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '0.84rem', color: '#1d4ed8', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '8px 8px 0 0' }}>
            🔍 <strong>{selectedPartner || '전체 거래처'}</strong> 매출원장 조회 중
            {selectedPartner && (
              <button onClick={() => { setSearchText(''); setSelectedPartner(''); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem' }}>조회 해제</button>
            )}
          </div>

            <div className="invoice-table-container" style={{ backgroundColor: 'white', borderRadius: '0 0 12px 12px', border: '1px solid #e2e8f0', borderTop: 'none', overflowX: 'auto' }}>
              <table className="invoice-table ledger-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    {[
                      { key: 'date', label: '거래일자', width: colWidths.date, align: 'center' },
                      { key: 'partner', label: '거래처명', width: colWidths.partner, align: 'left' },
                      { key: 'name', label: '상 품 명', width: colWidths.name, align: 'left' },
                      { key: 'spec', label: '규 격', width: colWidths.spec, align: 'left' },
                      { key: 'qty', label: '수량', width: colWidths.qty, align: 'right' },
                      { key: 'price', label: '단가', width: colWidths.price, align: 'right' },
                      { key: 'supplyValue', label: '공급가액', width: colWidths.supplyValue, align: 'right' },
                      { key: 'total', label: '합계액', width: colWidths.total, align: 'right' },
                      { key: 'received', label: '입금액', width: colWidths.received, align: 'right' },
                      { key: 'balance', label: '잔액', width: colWidths.balance, align: 'right' },
                      { key: 'creator', label: '발행자', width: colWidths.creator, align: 'center' },
                      { key: 'createdAt', label: '최초 발행', width: colWidths.createdAt, align: 'center' },
                      { key: 'updatedAt', label: '최종 수정', width: colWidths.updatedAt, align: 'center' }
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
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ padding: '60px 0', color: '#94a3b8', textAlign: 'center' }}>
                        조회기간 내의 거래 내역이 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      let rowClass = '';
                      if (r.rowType === 'carriedForward') rowClass = 'row-carried-forward';
                      else if (r.rowType === 'subtotal') rowClass = 'row-subtotal';
                      else if (r.rowType === 'payment') rowClass = 'row-payment';
                      else if (r.rowType === 'discount') rowClass = 'row-discount';

                      const inv = r.invoiceId ? salesInvoices.find(i => i.id === r.invoiceId) : null;
                      const isCreator = inv ? (inv.creator === currentUser?.name || !inv.creator) : false;
                      const canOpen = inv ? (isCreator || isAdmin) : false;

                      return (
                        <tr 
                          key={idx} 
                          onDoubleClick={() => {
                            if (inv) {
                              if (canOpen) {
                                onOpenInvoice(inv);
                              } else {
                                alert('조회 권한이 없습니다 (본인이 작성한 전표만 조회 가능).');
                              }
                            }
                          }}
                          className={rowClass}
                          style={{ cursor: r.invoiceId ? (canOpen ? 'pointer' : 'not-allowed') : 'default' }}
                          title={r.invoiceId ? (canOpen ? '더블클릭하여 전표 수정' : '조회 권한 없음 (본인 전표만 가능)') : ''}
                        >
                          {/* 1. Date */}
                          <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {r.rowType === 'carriedForward' ? (
                              <span style={{ fontWeight: 700, color: '#d97706' }}>[전기이월]</span>
                            ) : (
                              r.isFirstRowOfDay ? r.date : ''
                            )}
                          </td>

                          {/* 2. Partner Name */}
                          <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 500 }}>
                            {r.rowType !== 'carriedForward' && r.rowType !== 'subtotal' ? r.partner : ''}
                          </td>

                          {/* 3. Product Name */}
                          <td className={r.rowType === 'subtotal' ? 'cell-name text-center' : 'cell-name'}>
                            {r.rowType === 'sale' || r.rowType === 'normal' ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (inv) {
                                    if (canOpen) {
                                      onOpenInvoice(inv);
                                    } else {
                                      alert('조회 권한이 없습니다 (본인이 작성한 전표만 조회 가능).');
                                    }
                                  }
                                }}
                                style={{ 
                                  color: canOpen ? '#3b82f6' : '#64748b', 
                                  textDecoration: canOpen ? 'underline' : 'none', 
                                  cursor: canOpen ? 'pointer' : 'not-allowed' 
                                }}
                                title={canOpen ? '클릭하여 전표 수정' : '조회 권한 없음'}
                              >
                                {r.name}
                              </span>
                            ) : (
                              r.name
                            )}
                          </td>

                          {/* 4. Spec */}
                          <td className="cell-spec">{r.spec}</td>

                          {/* 5. Qty */}
                          <td className="text-right">
                            {isAdmin && (r.rowType === 'sale' || r.rowType === 'normal') ? (
                              <input 
                                type="number" 
                                value={r.qty} 
                                onChange={(e) => handleInlineEdit(r.invoiceId, r.itemId, 'qty', e.target.value)}
                                className="inline-edit-input text-right"
                              />
                            ) : (
                              r.qty !== '' && r.qty !== undefined ? Number(r.qty).toFixed(1) : ''
                            )}
                          </td>

                          {/* 6. Price */}
                          <td className="text-right">
                            {isAdmin && (r.rowType === 'sale' || r.rowType === 'normal') ? (
                              <input 
                                type="number" 
                                value={r.price} 
                                onChange={(e) => handleInlineEdit(r.invoiceId, r.itemId, 'price', e.target.value)}
                                className="inline-edit-input text-right"
                              />
                            ) : (
                              r.price !== '' && r.price !== undefined ? Number(r.price).toLocaleString() : ''
                            )}
                          </td>

                          {/* 7. Supply Value (공급가액) */}
                          <td className="text-right">
                            {r.supplyValue !== '' && r.supplyValue !== undefined ? Number(r.supplyValue).toLocaleString() : ''}
                          </td>

                          {/* 8. Total Amt */}
                          <td className="text-right" style={{ fontWeight: r.rowType === 'subtotal' ? 700 : 500 }}>
                            {r.total !== '' && r.total !== undefined ? Number(r.total).toLocaleString() : ''}
                          </td>

                          {/* 9. Received Amt */}
                          <td className="text-right" style={{ fontWeight: r.rowType === 'subtotal' ? 700 : 500, color: r.rowType === 'payment' || r.rowType === 'discount' ? '#10b981' : 'inherit' }}>
                            {r.received !== '' && r.received !== undefined ? Number(r.received).toLocaleString() : ''}
                          </td>

                          {/* 10. Balance */}
                          <td className="text-right font-semibold" style={{ color: r.balance > 0 ? '#1d4ed8' : '#475569', fontWeight: 700 }}>
                            {r.balance !== '' && r.balance !== undefined ? Number(r.balance).toLocaleString() : ''}
                          </td>

                          {/* 발행자 */}
                          <td className="text-center" style={{ color: '#475569', fontSize: '0.84rem', fontWeight: 500 }}>
                            {r.creator || ''}
                          </td>

                          {/* 11. Created By / Date */}
                          <td className="text-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''}
                          </td>

                          {/* 12. Updated By / Date */}
                          <td className="text-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="sales-summary-grid">
              <div className="sales-summary-card summary-card-dark"><div className="summary-label">총 건수</div><div className="summary-value">{currentSummaryInvoices.length}</div></div>
              <div className="sales-summary-card summary-card-purple"><div className="summary-label">총수량</div><div className="summary-value">{totalQty.toLocaleString()}</div></div>
              <div className="sales-summary-card summary-card-blue"><div className="summary-label">매출액</div><div className="summary-value">{totalSales.toLocaleString()}</div></div>
              <div className="sales-summary-card summary-card-green"><div className="summary-label">입금액</div><div className="summary-value">{totalReceived.toLocaleString()}</div></div>
              <div className="sales-summary-card summary-card-blue"><div className="summary-label">잔액(미수)</div><div className="summary-value">{balance.toLocaleString()}</div></div>
            </div>
        </>
      </div>
      <style>{`
        .inline-edit-input {
          width: 80px;
          padding: 4px 8px;
          border: 1px solid transparent;
          border-radius: 4px;
          text-align: right;
          font-size: 0.9rem;
          background: transparent;
          transition: all 0.2s;
        }
        .inline-edit-input:hover {
          border-color: #cbd5e1;
          background: white;
        }
        .inline-edit-input:focus {
          border-color: #3b82f6;
          background: white;
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        /* Hide arrows for Chrome, Safari, Edge, Opera */
        .inline-edit-input::-webkit-outer-spin-button,
        .inline-edit-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Hide arrows for Firefox */
        .inline-edit-input[type=number] {
          -moz-appearance: textfield;
        }

        /* Traditional Ledger Book aesthetics */
        .ledger-table th, .ledger-table td {
          padding: 8px 10px !important;
          font-size: 0.88rem !important;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        
        .row-carried-forward {
          background-color: #fffbeb !important; /* amber-50 */
          color: #b45309; /* amber-700 */
        }
        .row-carried-forward td {
          border-bottom: 2px double #fcd34d !important;
        }
        .row-carried-forward .cell-balance {
          color: #1e3a8a !important; /* dark blue */
          font-weight: 700 !important;
        }

        .row-subtotal {
          background-color: #ecfdf5 !important; /* green-50 */
          color: #065f46 !important; /* green-800 */
          font-weight: 600;
        }
        .row-subtotal td {
          border-top: 1px solid #a7f3d0 !important;
          border-bottom: 2px solid #a7f3d0 !important;
        }
        .row-subtotal .cell-name {
          text-align: center !important;
          font-weight: 700;
        }

        .row-payment {
          background-color: #fcfaff !important; /* very soft purple tint */
        }
        .row-payment .cell-name {
          color: #c2410c !important; /* orange-700 for 입금 */
          font-weight: 600;
        }
        .row-payment .cell-spec {
          color: #c2410c !important; /* orange-700 for bank details */
          font-weight: 500;
        }
        .row-payment .cell-received {
          color: #c2410c !important;
          font-weight: 700;
        }

        .row-discount {
          background-color: #fef2f2 !important; /* red-50 */
        }
        .row-discount .cell-name {
          color: #dc2626 !important; /* red-600 for 할인 */
          font-weight: 600;
        }
        .row-discount .cell-received {
          color: #dc2626 !important;
          font-weight: 700;
        }

        .text-right {
          text-align: right !important;
        }

        .text-center {
          text-align: center !important;
        }
      `}</style>
    </WindowModal>
  );
};

export default SalesLedger;
