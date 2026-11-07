import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Printer, Download, Search, RotateCw, X } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { exportToExcel } from '../utils/excelUtils';

const SalesLedger = ({ 
  onClose, 
  salesInvoices = [], 
  partners = [], 
  onOpenInvoice, 
  currentUser, 
  onUpdateInvoice, 
  zIndex, 
  initialPartner = '', 
  initialDate = '',
  staffList = [],
  warehouses = [],
  categories = [],
  products = []
}) => {
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
  const [showDailySubtotal, setShowDailySubtotal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (initialPartner) {
      const cleanPartner = typeof initialPartner === 'object' ? (initialPartner?.name || '') : String(initialPartner || '');
      setSelectedPartner(cleanPartner.trim());
      setSearchText(cleanPartner.trim());
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
      }
    } else {
      const today = new Date();
      const formatStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setStartDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(formatStr(today));
    }
  }, [initialPartner, initialDate]);

  // 거래처 자동완성 목록
  const uniquePartners = [...new Set(
    (partners || []).map(p => p.name).concat((salesInvoices || []).map(inv => inv.partner)).filter(Boolean)
  )];
  const cleanSearch = searchText.trim();
  const suggestions = cleanSearch
    ? uniquePartners.filter(name => matchesInitialSound(name, cleanSearch))
    : uniquePartners.slice(0, 30);

  // 전표 내 품목 추출
  const getMatchingInvoiceItems = (inv) => {
    if (inv.isDepositOnly || inv.type === 'deposit' || inv.slipType === '입금전표') {
      return [];
    }
    if (!inv.items || inv.items.length === 0) {
      if (Number(inv.totalAmount || 0) > 0) {
        return [{ name: '매출', total: inv.totalAmount || 0, qty: 1, price: inv.totalAmount || 0 }];
      }
      return [];
    }
    return inv.items;
  };

  // 1. 전기 이월액 계산
  let carriedForward = 0;
  const partnerObj = (partners || []).find(p => p.name === selectedPartner);
  const initialBase = partnerObj ? Number(partnerObj.initialReceivables || partnerObj.receivablesBase || 0) : 0;

  const priorInvoices = (salesInvoices || []).filter(inv => {
    if (!inv.date || inv.date >= startDate) return false;
    if (selectedPartner && (inv.partner || '').trim() !== selectedPartner.trim()) return false;
    return true;
  });
  const priorSales = priorInvoices.reduce((sum, inv) => {
    const items = getMatchingInvoiceItems(inv);
    return sum + items.reduce((s, item) => s + (item.total || 0), 0);
  }, 0);
  const priorReceived = priorInvoices.reduce((sum, inv) => sum + (Number(inv.receivedAmount || 0) + Number(inv.discount || 0)), 0);
  carriedForward = initialBase + priorSales - priorReceived;

  // 2. 조회 기간 내 데이터 필터링 및 일자별 그룹화
  const currentInvoices = (salesInvoices || [])
    .filter(inv => {
      if (!inv.date || inv.date < startDate || inv.date > endDate) return false;
      if (selectedPartner && (inv.partner || '').trim() !== selectedPartner.trim()) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0);
      return timeA - timeB;
    });

  const invoicesByDate = {};
  currentInvoices.forEach(inv => {
    if (!invoicesByDate[inv.date]) invoicesByDate[inv.date] = [];
    invoicesByDate[inv.date].push(inv);
  });

  const rows = [];
  let runningBalance = carriedForward;
  let totalSales = 0;
  let totalReceived = 0;

  const sortedDates = Object.keys(invoicesByDate).sort();
  sortedDates.forEach(dateStr => {
    const dayInvoices = invoicesByDate[dateStr];
    const dayRows = [];

    let dayTotalQty = 0;
    let dayTotalAmount = 0;
    let dayTotalReceived = 0;

    dayInvoices.forEach(inv => {
      const partner = (partners || []).find(p => p.name === inv.partner);
      const partnerBankAccount = partner ? partner.bankAccount : '';

      // A. 매출 품목
      const items = getMatchingInvoiceItems(inv);
      items.forEach((item, idx) => {
        const itemTotal = Number(item.total || 0);
        const itemQty = Number(item.qty || 0);
        runningBalance += itemTotal;
        dayTotalQty += itemQty;
        dayTotalAmount += itemTotal;
        totalSales += itemTotal;

        dayRows.push({
          rowType: 'sale',
          invoiceId: inv.id,
          invObj: inv,
          date: dateStr,
          partner: inv.partner,
          name: item.name || '품목',
          spec: item.spec || '',
          qty: itemQty,
          price: Number(item.price || 0),
          total: itemTotal,
          balance: runningBalance
        });
      });

      // B. 입금 내역
      const paymentsList = [];
      if (inv.payments) {
        if (inv.payments.cash > 0) paymentsList.push({ type: 'cash', amount: inv.payments.cash, label: '입금(현금)' });
        if (inv.payments.account > 0) {
          const accInfo = (partnerBankAccount && partnerBankAccount !== '선택안함') ? ` ${partnerBankAccount}` : (inv.accountInfo ? ` ${inv.accountInfo}` : '');
          paymentsList.push({ type: 'account', amount: inv.payments.account, label: `입금(통장)${accInfo}` });
        }
        if (inv.payments.card > 0) paymentsList.push({ type: 'card', amount: inv.payments.card, label: '입금(카드)' });
        if (inv.payments.bill > 0) paymentsList.push({ type: 'bill', amount: inv.payments.bill, label: '입금(어음)' });
      }
      if (paymentsList.length === 0 && (Number(inv.receivedAmount || 0) > 0)) {
        paymentsList.push({ type: 'cash', amount: Number(inv.receivedAmount || 0), label: '입금(현금)' });
      }

      paymentsList.forEach(pm => {
        runningBalance -= pm.amount;
        dayTotalReceived += pm.amount;
        totalReceived += pm.amount;

        dayRows.push({
          rowType: 'payment',
          invoiceId: inv.id,
          invObj: inv,
          date: dateStr,
          partner: inv.partner,
          name: pm.label,
          qty: 0,
          price: 0,
          total: 0,
          received: pm.amount,
          balance: runningBalance
        });
      });

      // C. 할인
      if (Number(inv.discount || 0) > 0) {
        const disc = Number(inv.discount);
        runningBalance -= disc;
        dayTotalReceived += disc;
        totalReceived += disc;

        dayRows.push({
          rowType: 'discount',
          invoiceId: inv.id,
          invObj: inv,
          date: dateStr,
          partner: inv.partner,
          name: '할인(DC)',
          qty: 0,
          price: 0,
          total: 0,
          received: disc,
          balance: runningBalance
        });
      }
    });

    if (dayRows.length > 0) {
      rows.push(...dayRows);

      // 일계 체크 시 해당 날짜 끝에 일계 행 추가
      if (showDailySubtotal) {
        rows.push({
          rowType: 'subtotal',
          date: dateStr,
          name: '【 일계 】',
          qty: dayTotalQty,
          total: dayTotalAmount,
          received: dayTotalReceived,
          balance: runningBalance
        });
      }
    }
  });

  const balance = carriedForward + totalSales - totalReceived;

  // 일자 표시: YYYY-MM-DD -> MM-DD
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    return parts.length === 3 ? `${parts[1]}-${parts[2]}` : dateStr;
  };

  const handleExcelExport = () => {
    const dataToExport = rows.map(r => ({
      '일자': r.date,
      '거래처': r.partner || selectedPartner || '',
      '구분/상품명': r.name,
      '규격': r.spec || '',
      '단가': r.price || '',
      '수량': r.qty || '',
      '금액': r.total || '',
      '입금액': r.received || '',
      '잔액': r.balance || ''
    }));
    exportToExcel(dataToExport, `매출원장_${selectedPartner || '전체'}_${startDate}_${endDate}`);
  };

  return (
    <WindowModal title="매출원장" onClose={onClose} width="100%" zIndex={zIndex}>
      <div className="sales-ledger-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* 상단 컨트롤 바 */}
        <div className="sales-ledger-controls" style={{
          padding: '10px 12px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0
        }}>
          {/* 1행: 기간 [시작일] ~ [종료일] [조회] */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%'
          }}>
            <span style={{
              fontSize: '0.86rem',
              fontWeight: 800,
              color: '#1e293b',
              whiteSpace: 'nowrap'
            }}>
              기간:
            </span>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                textAlign: 'center'
              }}
            />
            <span style={{ fontSize: '0.84rem', color: '#64748b', fontWeight: 700 }}>~</span>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                textAlign: 'center'
              }}
            />
            <button
              type="button"
              onClick={() => setRefreshTrigger(k => k + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#ffffff',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(59,130,246,0.2)'
              }}
            >
              <RotateCw size={13} /> 조회
            </button>
          </div>

          {/* 2행: [인쇄] [ ] 일계 [거래처 검색/선택] */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '5px 8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              title="인쇄"
            >
              <Printer size={13} /> 인쇄
            </button>

            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#334155',
              userSelect: 'none',
              whiteSpace: 'nowrap'
            }}>
              <input 
                type="checkbox"
                checked={showDailySubtotal}
                onChange={e => setShowDailySubtotal(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              일계
            </label>

            {/* 거래처 검색 입력란 */}
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }} ref={searchRef}>
              <input
                type="text"
                value={searchText}
                placeholder="거래처 검색..."
                onChange={e => {
                  setSearchText(e.target.value);
                  setSelectedPartner(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                style={{
                  width: '100%',
                  padding: '5px 24px 5px 8px',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontWeight: selectedPartner ? 700 : 500,
                  color: selectedPartner ? '#1d4ed8' : '#1e293b',
                  background: '#ffffff'
                }}
              />
              {searchText ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    setSelectedPartner('');
                    setShowSuggestions(false);
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={13} />
                </button>
              ) : (
                <Search
                  size={13}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  <div
                    onMouseDown={() => {
                      setSelectedPartner('');
                      setSearchText('');
                      setShowSuggestions(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#3b82f6',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    전체 거래처
                  </div>
                  {suggestions.map((pName, i) => (
                    <div
                      key={i}
                      onMouseDown={() => {
                        setSelectedPartner(pName);
                        setSearchText(pName);
                        setShowSuggestions(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        borderBottom: '1px solid #f1f5f9',
                        color: '#1e293b'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {pName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 컬럼 헤더 (일자 | 상품명 | 단가 | 수량 | 금액) */}
        <div className="sales-ledger-table-header" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '7px 10px',
          background: '#f1f5f9',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #cbd5e1',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#475569',
          flexShrink: 0
        }}>
          <div style={{ width: '46px', textAlign: 'left' }}>일자</div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0, paddingLeft: '4px' }}>상품명</div>
          <div style={{ width: '75px', textAlign: 'right' }}>단가</div>
          <div style={{ width: '50px', textAlign: 'right' }}>수량</div>
          <div style={{ width: '85px', textAlign: 'right' }}>금액</div>
        </div>

        {/* 스크롤 거래 내역 목록 */}
        <div className="sales-ledger-list" style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#ffffff'
        }}>
          {rows.length === 0 ? (
            <div style={{
              padding: '60px 16px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.88rem'
            }}>
              조회기간 내의 거래 내역이 존재하지 않습니다.
            </div>
          ) : (
            rows.map((r, idx) => {
              const isPayment = r.rowType === 'payment' || r.rowType === 'discount';
              const isSubtotal = r.rowType === 'subtotal';
              const inv = r.invObj;

              if (isSubtotal) {
                return (
                  <div 
                    key={idx}
                    style={{
                      padding: '7px 10px',
                      background: '#f8fafc',
                      borderTop: '1px dashed #cbd5e1',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                      color: '#475569'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#64748b', width: '42px' }}>
                        {formatShortDate(r.date)}
                      </span>
                      <span style={{ fontWeight: 800, color: '#2563eb' }}>【 일계 】</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {r.qty > 0 && <span>수량: <strong>{Number(r.qty).toFixed(1)}</strong></span>}
                      {r.total > 0 && <span>매출: <strong>{Number(r.total).toLocaleString()}</strong></span>}
                      {r.received > 0 && <span style={{ color: '#16a34a' }}>입금: <strong>{Number(r.received).toLocaleString()}</strong></span>}
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={idx}
                  onClick={() => inv && onOpenInvoice && onOpenInvoice(inv)}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isPayment ? '#f0fdf4' : '#ffffff',
                    cursor: inv ? 'pointer' : 'default',
                    transition: 'background-color 0.15s'
                  }}
                  title={inv ? '클릭하여 해당 전표 열기' : ''}
                >
                  {/* 1행: 일자 (MM-DD) + 상품명/내용 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '3px'
                  }}>
                    <span style={{
                      width: '42px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: isPayment ? '#16a34a' : '#64748b',
                      flexShrink: 0
                    }}>
                      {formatShortDate(r.date)}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.86rem',
                      fontWeight: isPayment ? 700 : 600,
                      color: isPayment ? '#15803d' : '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {r.name}
                      {r.spec && (
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>
                          ({r.spec})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 2행: 단가, 수량, 금액 (매출) 또는 입금액 (입금) */}
                  {!isPayment ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '0px'
                    }}>
                      <div style={{
                        width: '75px',
                        textAlign: 'right',
                        fontSize: '0.82rem',
                        color: '#64748b',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {Number(r.price || 0).toLocaleString()}
                      </div>
                      <div style={{
                        width: '50px',
                        textAlign: 'right',
                        fontSize: '0.82rem',
                        color: '#334155',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {Number(r.qty || 0).toFixed(1)}
                      </div>
                      <div style={{
                        width: '85px',
                        textAlign: 'right',
                        fontSize: '0.86rem',
                        color: '#0f172a',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {Number(r.total || 0).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>입금액</span>
                      <div style={{
                        width: '85px',
                        textAlign: 'right',
                        fontSize: '0.9rem',
                        color: '#16a34a',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {Number(r.received || 0).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 하단 고정 요약 바 (이월 / 매출 / 입금 / 잔액) */}
        <div className="sales-ledger-footer" style={{
          background: '#1e293b',
          color: '#ffffff',
          padding: '10px 14px',
          boxShadow: '0 -3px 10px rgba(0,0,0,0.08)',
          borderTop: '1px solid #334155',
          flexShrink: 0
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 20px',
            fontSize: '0.86rem'
          }}>
            {/* 1행: 이월 / 매출 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>이월:</span>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
                {Number(carriedForward || 0).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>매출:</span>
              <span style={{ fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>
                {Number(totalSales || 0).toLocaleString()}
              </span>
            </div>

            {/* 2행: 입금 / 잔액 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>입금:</span>
              <span style={{ fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                {Number(totalReceived || 0).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>잔액:</span>
              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
                {Number(balance || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .sales-ledger-controls,
          .window-header,
          .close-btn {
            display: none !important;
          }
          .sales-ledger-container {
            height: auto !important;
            overflow: visible !important;
          }
          .sales-ledger-list {
            height: auto !important;
            overflow: visible !important;
          }
          .sales-ledger-footer {
            position: static !important;
            page-break-inside: avoid;
            background: #f1f5f9 !important;
            color: #000 !important;
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </WindowModal>
  );
};

export default SalesLedger;
