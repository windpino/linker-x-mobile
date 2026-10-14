import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Wallet, Plus, Search, Filter, Calendar, Printer, Download, Trash2, 
  Edit, X, RefreshCw, FileText, Landmark, CreditCard, Banknote, CheckCircle,
  TrendingUp, ArrowRight, Building2, User, Clock
} from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { matchesInitialSound } from '../utils/koreanUtils';

const DepositSlipManagement = ({
  onClose,
  salesInvoices = [],
  partners = [],
  accounts = [],
  staffList = [],
  warehouses = [],
  currentUser,
  onSaveSalesInvoice,
  onDeleteInvoice,
  onOpenSalesInvoice,
  onOpenLedger,
  zIndex
}) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const canIssuePastDateDeposit = (() => {
    if (currentUser?.role === 'super_admin' || currentUser?.userId === 'admin') return true;
    const staff = (staffList || []).find(s => 
      (currentUser?.userId && s.userId === currentUser.userId) ||
      (currentUser?.id && String(s.id) === String(currentUser.id)) ||
      (currentUser?.name && s.name === currentUser.name)
    ) || currentUser;
    if (staff?.allowPastDateDeposit !== undefined) return Boolean(staff.allowPastDateDeposit);
    if (currentUser?.allowPastDateDeposit !== undefined) return Boolean(currentUser.allowPastDateDeposit);
    if (staff?.permissions?.['과거일자 입금전표발행'] !== undefined) return Boolean(staff.permissions['과거일자 입금전표발행']);
    if (currentUser?.permissions?.['과거일자 입금전표발행'] !== undefined) return Boolean(currentUser.permissions['과거일자 입금전표발행']);
    if (currentUser?.role === 'admin') return true;
    return false;
  })();

  const [dateFilter, setDateFilter] = useState({
    preset: '당월',
    startDate: `${y}-${m}-01`,
    endDate: `${y}-${m}-${d}`
  });

  const [filterPartner, setFilterPartner] = useState('');
  const [filterSlipType, setFilterSlipType] = useState('전체');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePresetDate = (preset) => {
    const cur = new Date();
    const curY = cur.getFullYear();
    const curM = cur.getMonth() + 1;
    const curD = cur.getDate();

    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    let start = `${curY}-${String(curM).padStart(2, '0')}-01`;
    let end = fmt(cur);

    if (preset === '오늘') {
      start = fmt(cur);
      end = fmt(cur);
    } else if (preset === '어제') {
      const yDate = new Date(cur);
      yDate.setDate(curD - 1);
      start = fmt(yDate);
      end = fmt(yDate);
    } else if (preset === '1주일') {
      const wDate = new Date(cur);
      wDate.setDate(curD - 7);
      start = fmt(wDate);
      end = fmt(cur);
    } else if (preset === '당월') {
      start = `${curY}-${String(curM).padStart(2, '0')}-01`;
      end = fmt(cur);
    } else if (preset === '전체') {
      start = '2020-01-01';
      end = '2030-12-31';
    }

    setDateFilter({ preset, startDate: start, endDate: end });
  };

  const allDepositSlips = useMemo(() => {
    const list = [];

    (salesInvoices || []).forEach(inv => {
      const isPureDep = Boolean(
        inv.isDepositOnly ||
        (!inv.items?.length && (Number(inv.receivedAmount || 0) > 0 || inv.memo === '입금전표' || inv.type === 'deposit'))
      );
      const received = Number(inv.receivedAmount) || 0;
      const payments = inv.payments || { cash: 0, account: 0, card: 0, bill: 0 };
      const discount = Number(inv.discount) || 0;

      if (isPureDep) {
        list.push({
          id: inv.id,
          invoiceId: inv.id,
          date: inv.date || '',
          partner: inv.partner || '미지정',
          type: 'pure_deposit',
          typeLabel: '입금전표',
          cash: Number(payments.cash) || 0,
          account: Number(payments.account) || 0,
          card: Number(payments.card) || 0,
          bill: Number(payments.bill) || 0,
          discount: discount,
          totalAmount: received > 0 ? received : ((Number(payments.cash) || 0) + (Number(payments.account) || 0) + (Number(payments.card) || 0) + (Number(payments.bill) || 0)),
          memo: inv.memo || '입금전표',
          manager: inv.manager || '',
          creator: inv.creator || '',
          warehouse: inv.warehouse || '',
          selectedAccount: inv.selectedAccount || (inv.paymentList?.[0]?.selectedAccount) || '',
          rawInvoice: inv,
          isDepositOnly: true
        });
      } else if (received > 0 || discount > 0 || (Array.isArray(inv.paymentList) && inv.paymentList.length > 0)) {
        if (Array.isArray(inv.paymentList) && inv.paymentList.length > 0) {
          inv.paymentList.forEach((slip, pIdx) => {
            list.push({
              id: slip.id ? `${inv.id}_${slip.id}` : `${inv.id}_p${pIdx}`,
              slipId: slip.id,
              invoiceId: inv.id,
              date: slip.date || inv.date || '',
              partner: inv.partner || '미지정',
              type: 'sales_deposit',
              typeLabel: '매출수금',
              cash: Number(slip.cash) || 0,
              account: Number(slip.account) || 0,
              card: Number(slip.card) || 0,
              bill: Number(slip.bill) || 0,
              discount: Number(slip.discount) || 0,
              totalAmount: Number(slip.totalAmount) || ((Number(slip.cash) || 0) + (Number(slip.account) || 0) + (Number(slip.card) || 0) + (Number(slip.bill) || 0)),
              memo: slip.memo || inv.memo || '매출수금',
              manager: inv.manager || '',
              creator: slip.creator || inv.creator || '',
              warehouse: inv.warehouse || '',
              selectedAccount: slip.selectedAccount || '',
              rawInvoice: inv,
              isDepositOnly: false
            });
          });
        } else {
          list.push({
            id: `${inv.id}_rec`,
            invoiceId: inv.id,
            date: inv.date || '',
            partner: inv.partner || '미지정',
            type: 'sales_deposit',
            typeLabel: '매출수금',
            cash: Number(payments.cash) || 0,
            account: Number(payments.account) || 0,
            card: Number(payments.card) || 0,
            bill: Number(payments.bill) || 0,
            discount: discount,
            totalAmount: received,
            memo: inv.memo || '매출수금',
            manager: inv.manager || '',
            creator: inv.creator || '',
            warehouse: inv.warehouse || '',
            selectedAccount: '',
            rawInvoice: inv,
            isDepositOnly: false
          });
        }
      }
    });

    list.sort((a, b) => {
      if (b.date !== a.date) return (b.date || '').localeCompare(a.date || '');
      return String(b.id).localeCompare(String(a.id));
    });

    return list;
  }, [salesInvoices]);

  const filteredSlips = useMemo(() => {
    return allDepositSlips.filter(slip => {
      if (dateFilter.startDate && slip.date < dateFilter.startDate) return false;
      if (dateFilter.endDate && slip.date > dateFilter.endDate) return false;

      if (filterPartner && filterPartner !== '전체') {
        if (slip.partner !== filterPartner) return false;
      }

      if (filterSlipType !== '전체') {
        if (slip.type !== filterSlipType) return false;
      }

      if (filterPaymentMethod !== '전체') {
        if (filterPaymentMethod === 'cash' && slip.cash <= 0) return false;
        if (filterPaymentMethod === 'account' && slip.account <= 0) return false;
        if (filterPaymentMethod === 'card' && slip.card <= 0) return false;
        if (filterPaymentMethod === 'bill' && slip.bill <= 0) return false;
        if (filterPaymentMethod === 'discount' && slip.discount <= 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pMatch = slip.partner?.toLowerCase().includes(q) || matchesInitialSound(slip.partner || '', q);
        const mMatch = slip.memo?.toLowerCase().includes(q) || matchesInitialSound(slip.memo || '', q);
        const cMatch = slip.creator?.toLowerCase().includes(q);
        const idMatch = String(slip.invoiceId || '').includes(q);
        const amtMatch = String(slip.totalAmount || '').includes(q);
        if (!pMatch && !mMatch && !cMatch && !idMatch && !amtMatch) return false;
      }

      return true;
    });
  }, [allDepositSlips, dateFilter, filterPartner, filterSlipType, filterPaymentMethod, searchQuery]);

  const summary = useMemo(() => {
    let totalAmt = 0;
    let cashAmt = 0;
    let accountAmt = 0;
    let cardAmt = 0;
    let billAmt = 0;
    let discountAmt = 0;

    filteredSlips.forEach(s => {
      totalAmt += s.totalAmount || 0;
      cashAmt += s.cash || 0;
      accountAmt += s.account || 0;
      cardAmt += s.card || 0;
      billAmt += s.bill || 0;
      discountAmt += s.discount || 0;
    });

    return {
      totalAmt,
      cashAmt,
      accountAmt,
      otherAmt: cardAmt + billAmt,
      discountAmt,
      count: filteredSlips.length
    };
  }, [filteredSlips]);

  // Modal State
  const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState(null);

  const [formData, setFormData] = useState({
    date: `${y}-${m}-${d}`,
    partner: '',
    warehouse: '',
    manager: '',
    cash: 0,
    account: 0,
    card: 0,
    bill: 0,
    discount: 0,
    selectedAccount: '',
    memo: '입금전표'
  });

  const [partnerQuery, setPartnerQuery] = useState('');
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState(false);

  const partnerSuggestions = useMemo(() => {
    if (!partnerQuery.trim()) return [];
    const q = partnerQuery.trim().toLowerCase();
    return (partners || []).filter(p => {
      const name = p.name || '';
      return name.toLowerCase().includes(q) || matchesInitialSound(name, q);
    }).slice(0, 8);
  }, [partners, partnerQuery]);

  const currentPartnerObj = useMemo(() => {
    if (!formData.partner) return null;
    return (partners || []).find(p => p.name === formData.partner) || null;
  }, [partners, formData.partner]);

  const partnerReceivables = useMemo(() => {
    if (!currentPartnerObj) return 0;
    return Number(currentPartnerObj.receivables || 0);
  }, [currentPartnerObj]);

  const formTotalDeposit = Number(formData.cash || 0) + Number(formData.account || 0) + Number(formData.card || 0) + Number(formData.bill || 0);
  const formRemainingReceivables = Math.max(0, partnerReceivables - formTotalDeposit - Number(formData.discount || 0));

  const handleOpenNewModal = () => {
    setEditingSlip(null);
    const mainWH = warehouses.find(w => w.isMain)?.name || warehouses[0]?.name || '창고';
    setFormData({
      date: `${y}-${m}-${d}`,
      partner: '',
      warehouse: (currentUser?.warehouse && currentUser.warehouse !== '-') ? currentUser.warehouse : mainWH,
      manager: currentUser?.name || staffList[0]?.name || '',
      cash: 0,
      account: 0,
      card: 0,
      bill: 0,
      discount: 0,
      selectedAccount: accounts[0]?.bankName ? `${accounts[0].bankName} ${accounts[0].accountNumber || ''}` : '',
      memo: '입금전표'
    });
    setPartnerQuery('');
    setShowPartnerSuggestions(false);
    setIsIssuanceModalOpen(true);
  };

  const handleOpenEditModal = (slip) => {
    setEditingSlip(slip);
    setFormData({
      date: slip.date || `${y}-${m}-${d}`,
      partner: slip.partner || '',
      warehouse: slip.warehouse || (warehouses[0]?.name || '창고'),
      manager: slip.manager || (currentUser?.name || ''),
      cash: slip.cash || 0,
      account: slip.account || 0,
      card: slip.card || 0,
      bill: slip.bill || 0,
      discount: slip.discount || 0,
      selectedAccount: slip.selectedAccount || '',
      memo: slip.memo || '입금전표'
    });
    setPartnerQuery(slip.partner || '');
    setShowPartnerSuggestions(false);
    setIsIssuanceModalOpen(true);
  };

  const handleFormAmountChange = (type, rawVal) => {
    const val = Number(String(rawVal).replace(/[^0-9]/g, '')) || 0;
    setFormData(prev => ({ ...prev, [type]: val }));
  };

  const handleSelectPartner = (p) => {
    setFormData(prev => {
      const rec = Number(p.receivables || 0);
      const defaultCash = (prev.cash === 0 && prev.account === 0 && prev.card === 0 && prev.bill === 0 && rec > 0) ? rec : prev.cash;
      return {
        ...prev,
        partner: p.name,
        cash: defaultCash
      };
    });
    setPartnerQuery(p.name);
    setShowPartnerSuggestions(false);
  };

  const handleSaveModal = async () => {
    if (!formData.partner) {
      alert('거래처를 선택해주세요.');
      return;
    }
    if (!canIssuePastDateDeposit && formData.date < todayStr && (!editingSlip || formData.date !== editingSlip.date)) {
      alert('과거일자 입금전표발행 권한이 없습니다. 당일 또는 미래일자만 발행할 수 있습니다.');
      return;
    }
    const totalDep = formTotalDeposit;
    const disc = Number(formData.discount || 0);
    if (totalDep <= 0 && disc <= 0) {
      alert('입금액 또는 할인액을 1원 이상 입력해주세요.');
      return;
    }

    try {
      const now = new Date();
      const targetId = editingSlip ? editingSlip.invoiceId : Date.now();
      const slipPaymentId = editingSlip?.slipId || Date.now();

      const newSlip = {
        id: slipPaymentId,
        date: formData.date,
        cash: Number(formData.cash || 0),
        account: Number(formData.account || 0),
        card: Number(formData.card || 0),
        bill: Number(formData.bill || 0),
        discount: disc,
        totalAmount: totalDep,
        memo: formData.memo || '입금전표',
        selectedAccount: formData.selectedAccount || '',
        createdAt: editingSlip ? (editingSlip.createdAt || now.toISOString()) : now.toISOString(),
        creator: currentUser?.name || '시스템'
      };

      let slipInvoiceData = null;

      if (editingSlip && !editingSlip.isDepositOnly && editingSlip.rawInvoice) {
        const raw = editingSlip.rawInvoice;
        const curList = Array.isArray(raw.paymentList) ? [...raw.paymentList] : [];
        const nextList = curList.map(p => String(p.id) === String(editingSlip.slipId) ? newSlip : p);
        if (!nextList.some(p => String(p.id) === String(editingSlip.slipId))) {
          nextList.push(newSlip);
        }

        const aggPayments = {
          cash: nextList.reduce((s, p) => s + (p.cash || 0), 0),
          account: nextList.reduce((s, p) => s + (p.account || 0), 0),
          card: nextList.reduce((s, p) => s + (p.card || 0), 0),
          bill: nextList.reduce((s, p) => s + (p.bill || 0), 0)
        };
        const aggRec = nextList.reduce((s, p) => s + (p.totalAmount || 0), 0);
        const aggDisc = nextList.reduce((s, p) => s + (p.discount || 0), 0);

        slipInvoiceData = {
          ...raw,
          paymentList: nextList,
          payments: aggPayments,
          receivedAmount: aggRec,
          discount: aggDisc,
          updatedAt: now.toISOString()
        };
      } else {
        slipInvoiceData = {
          id: targetId,
          date: formData.date,
          partner: formData.partner,
          warehouse: formData.warehouse || (warehouses[0]?.name || '창고'),
          manager: formData.manager || (currentUser?.name || ''),
          creator: editingSlip ? (editingSlip.creator || currentUser?.name) : (currentUser?.name || '시스템'),
          items: [],
          totalAmount: 0,
          receivedAmount: totalDep,
          discount: disc,
          payments: {
            cash: Number(formData.cash || 0),
            account: Number(formData.account || 0),
            card: Number(formData.card || 0),
            bill: Number(formData.bill || 0)
          },
          paymentList: [newSlip],
          selectedAccount: formData.selectedAccount || '',
          isDepositOnly: true,
          memo: formData.memo || '입금전표',
          type: 'deposit',
          createdAt: editingSlip ? (editingSlip.createdAt || now.toISOString()) : now.toISOString(),
          updatedAt: now.toISOString()
        };
      }

      await onSaveSalesInvoice(slipInvoiceData, false);
      alert(`[입금전표] ${formData.partner} 거래처에 입금(${totalDep.toLocaleString()}원)이 성공적으로 등록되었습니다.`);
      setIsIssuanceModalOpen(false);
      setEditingSlip(null);
    } catch (err) {
      console.error('입금전표 저장 실패:', err);
      alert('입금전표 저장 중 오류가 발생했습니다: ' + (err.message || err));
    }
  };

  const handleDeleteSlip = async (slip) => {
    if (!window.confirm(`[${slip.partner}] 거래처의 입금전표 (금액: ${(slip.totalAmount || 0).toLocaleString()}원)를 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      if (slip.isDepositOnly) {
        await onDeleteInvoice(slip.invoiceId);
        alert(`거래처 [${slip.partner}]의 입금전표가 정상적으로 삭제되었습니다.`);
      } else if (slip.rawInvoice) {
        const raw = slip.rawInvoice;
        const curList = Array.isArray(raw.paymentList) ? [...raw.paymentList] : [];
        const nextList = curList.filter(p => String(p.id) !== String(slip.slipId));

        const aggPayments = {
          cash: nextList.reduce((s, p) => s + (p.cash || 0), 0),
          account: nextList.reduce((s, p) => s + (p.account || 0), 0),
          card: nextList.reduce((s, p) => s + (p.card || 0), 0),
          bill: nextList.reduce((s, p) => s + (p.bill || 0), 0)
        };
        const aggRec = nextList.reduce((s, p) => s + (p.totalAmount || 0), 0);
        const aggDisc = nextList.reduce((s, p) => s + (p.discount || 0), 0);

        const updatedInv = {
          ...raw,
          paymentList: nextList,
          payments: aggPayments,
          receivedAmount: aggRec,
          discount: aggDisc
        };
        await onSaveSalesInvoice(updatedInv, true);
        alert(`거래처 [${slip.partner}]의 해당 수금 내역이 정상적으로 삭제되었습니다.`);
      }
    } catch (err) {
      console.error('입금전표 삭제 실패:', err);
      alert('입금전표 삭제 중 오류가 발생했습니다: ' + (err.message || err));
    }
  };

  const handlePrintReceipt = (slip) => {
    const newWin = window.open('', '_blank', 'width=850,height=900,scrollbars=yes,resizable=yes');
    if (!newWin) {
      alert('팝업 차단을 해제해주세요.');
      return;
    }

    const partnerObj = (partners || []).find(p => p.name === slip.partner) || {};
    const totalDeposit = slip.totalAmount || 0;

    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>입금전표 (영수증) - ${slip.partner}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Pretendard', system-ui, sans-serif; margin: 0; padding: 20px; background: #525659; display: flex; flex-direction: column; align-items: center; }
          .toolbar { width: 210mm; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); box-sizing: border-box; }
          .page { width: 210mm; min-height: 297mm; padding: 15mm; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.3); box-sizing: border-box; }
          h1 { text-align: center; margin: 0 0 24px; font-size: 26px; text-decoration: underline; letter-spacing: 4px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          th, td { border: 1px solid #333; padding: 8px 10px; }
          th { background: #f8fafc; font-weight: 700; text-align: center; }
          @media print {
            body { background: #fff; padding: 0; }
            .toolbar { display: none !important; }
            .page { box-shadow: none; padding: 0; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div style="font-weight:800; font-size:16px; color:#0f172a;">📄 입금전표 / 영수증 인쇄 미리보기</div>
          <div>
            <button onclick="window.print()" style="padding:8px 18px; background:#059669; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:14px;">🖨️ 즉시 인쇄</button>
            <button onclick="window.close()" style="padding:8px 18px; background:#64748b; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:14px; margin-left:6px;">닫기</button>
          </div>
        </div>
        <div class="page">
          <h1>입 금 전 표 (영 수 증)</h1>
          <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px;">
            <div>전표일자: <strong>${slip.date || ''}</strong></div>
            <div>전표번호: <strong>${slip.invoiceId || slip.id || ''}</strong></div>
          </div>
          <table>
            <tr style="height:85px;">
              <td style="width:50%; vertical-align:top;">
                <strong style="color:#059669;">[공급자 (본사)]</strong><br/>
                담당자: <strong>${slip.manager || slip.creator || '-'}</strong><br/>
                관리창고: ${slip.warehouse || '-'}
              </td>
              <td style="width:50%; vertical-align:top;">
                <strong style="color:#059669;">[입금 거래처]</strong><br/>
                상호명: <strong>${slip.partner || '-'}</strong><br/>
                대표자: ${partnerObj.ceo || '-'}<br/>
                연락처: ${partnerObj.phone || partnerObj.tel || '-'}
              </td>
            </tr>
          </table>

          <div style="margin: 20px 0 10px; font-size: 15px; font-weight: 800; color: #1e293b;">
            ■ 입금 내역 명세서
          </div>
          <table>
            <thead>
              <tr>
                <th>입금 구분</th>
                <th>결제 수단</th>
                <th>입금 계좌 / 상세</th>
                <th>입금액 (원)</th>
                <th>할인 (원)</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center; font-weight:700; color:#059669;">${slip.typeLabel}</td>
                <td style="text-align:center;">
                  ${slip.cash > 0 ? '현금 ' : ''}
                  ${slip.account > 0 ? '계좌이체 ' : ''}
                  ${slip.card > 0 ? '카드 ' : ''}
                  ${slip.bill > 0 ? '어음 ' : ''}
                </td>
                <td style="text-align:center;">${slip.selectedAccount || '-'}</td>
                <td style="text-align:right; font-weight:800; font-size:14px; color:#059669;">${totalDeposit.toLocaleString()} 원</td>
                <td style="text-align:right; color:#ef4444;">${(slip.discount || 0) > 0 ? `-${slip.discount.toLocaleString()} 원` : '-'}</td>
                <td>${slip.memo || '-'}</td>
              </tr>
            </tbody>
          </table>

          <div style="background:#f8fafc; border:1.5px solid #059669; border-radius:8px; padding:16px 20px; margin-top:24px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:14px; color:#64748b; font-weight:600;">총 수금/입금 합계금액:</span>
            </div>
            <div style="font-size:20px; font-weight:800; color:#059669;">
              ${totalDeposit.toLocaleString()} 원
            </div>
          </div>

          <div style="margin-top:60px; text-align:right; font-size:14px; color:#334155;">
            위 금액을 정히 영수(입금 확인)하였습니다.<br/><br/>
            <strong>발행일자: ${slip.date}</strong><br/>
            <strong>수금/담당자: ${slip.manager || slip.creator || '담당자'} (인)</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    newWin.document.open();
    newWin.document.write(html);
    newWin.document.close();
  };

  const handleExportExcel = () => {
    if (filteredSlips.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const dataToExport = filteredSlips.map((s, idx) => ({
      'No': idx + 1,
      '전표일자': s.date,
      '거래처명': s.partner,
      '전표구분': s.typeLabel,
      '총입금액': s.totalAmount,
      '현금': s.cash,
      '계좌이체': s.account,
      '카드': s.card,
      '어음': s.bill,
      '현장할인': s.discount,
      '입금계좌': s.selectedAccount || '-',
      '비고/메모': s.memo,
      '담당자': s.manager || s.creator
    }));

    exportToExcel(dataToExport, `입금전표목록_${dateFilter.startDate}_${dateFilter.endDate}`);
  };

  return (
    <WindowModal title="💰 입금전표 관리 및 발행" onClose={onClose} width="100%" contentPadding="12px 14px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>

        {/* 1. Header with New Button */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
          borderRadius: '10px',
          padding: '14px 16px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={20} color="#ffffff" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>입금전표 관리</h3>
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>
              거래처별 입금 전표 발행 및 내역 관리
            </div>
          </div>

          <button
            onClick={handleOpenNewModal}
            style={{
              background: '#ffffff',
              color: '#065f46',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> 입금 발행
          </button>
        </div>

        {/* 2. Summary Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700 }}>총 입금 합계 ({summary.count}건)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {summary.totalAmt.toLocaleString()}원
            </div>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 700 }}>계좌이체 합계</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
              {summary.accountAmt.toLocaleString()}원
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>현금 입금 합계</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {summary.cashAmt.toLocaleString()}원
            </div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: 700 }}>현장 할인 합계</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {summary.discountAmt.toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 3. Filters */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Quick Date */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['오늘', '어제', '1주일', '당월', '전체'].map(p => (
              <button
                key={p}
                onClick={() => handlePresetDate(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: dateFilter.preset === p ? '1px solid #059669' : '1px solid #cbd5e1',
                  background: dateFilter.preset === p ? '#059669' : '#fff',
                  color: dateFilter.preset === p ? '#fff' : '#475569',
                  whiteSpace: 'nowrap'
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, preset: '직접', startDate: e.target.value }))}
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
            />
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, preset: '직접', endDate: e.target.value }))}
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
            <select
              value={filterPartner}
              onChange={(e) => setFilterPartner(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <option value="">전체 거래처</option>
              {(partners || []).map(p => (
                <option key={p.id || p.name} value={p.name}>{p.name}</option>
              ))}
            </select>

            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <option value="전체">전체 결제수단</option>
              <option value="cash">현금 포함</option>
              <option value="account">계좌이체 포함</option>
              <option value="card">카드 포함</option>
              <option value="bill">어음 포함</option>
              <option value="discount">할인 포함</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="거래처명, 메모 검색..."
              style={{ width: '100%', padding: '6px 8px 6px 28px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* 4. Slips List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredSlips.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
              입금전표 내역이 없습니다.
            </div>
          ) : (
            filteredSlips.map((slip) => (
              <div
                key={slip.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{slip.partner}</span>
                    <span style={{
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: slip.type === 'pure_deposit' ? '#ecfdf5' : '#eff6ff',
                      color: slip.type === 'pure_deposit' ? '#047857' : '#1d4ed8'
                    }}>
                      {slip.typeLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{slip.date}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {slip.cash > 0 && <span style={{ background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>현금 {slip.cash.toLocaleString()}</span>}
                    {slip.account > 0 && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>계좌 {slip.account.toLocaleString()}</span>}
                    {slip.card > 0 && <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>카드 {slip.card.toLocaleString()}</span>}
                    {slip.bill > 0 && <span style={{ background: '#fffbeb', color: '#b45309', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>어음 {slip.bill.toLocaleString()}</span>}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                    {(slip.totalAmount || 0).toLocaleString()}원
                  </div>
                </div>

                {slip.memo && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    비고: {slip.memo}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #f1f5f9', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    담당: {slip.manager || slip.creator || '-'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handlePrintReceipt(slip)}
                      style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      영수증
                    </button>
                    <button
                      onClick={() => {
                        if (slip.isDepositOnly) handleOpenEditModal(slip);
                        else if (onOpenSalesInvoice && slip.rawInvoice) onOpenSalesInvoice(slip.rawInvoice);
                      }}
                      style={{ background: '#f1f5f9', color: '#2563eb', border: '1px solid #cbd5e1', padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteSlip(slip)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* --- 5. Mobile Issuance Modal --- */}
      {isIssuanceModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: (zIndex || 10000) + 20,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '420px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '18px 16px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {editingSlip ? '✏️ 입금전표 수정' : '💰 신규 입금전표 발행'}
              </h3>
              <button onClick={() => { setIsIssuanceModalOpen(false); setEditingSlip(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>입금 일자</label>
                <input
                  type="date"
                  value={formData.date}
                  min={!canIssuePastDateDeposit ? todayStr : undefined}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (!canIssuePastDateDeposit && newDate < todayStr) {
                      alert('과거일자 입금전표발행 권한이 없습니다. 당일 또는 미래일자만 선택할 수 있습니다.');
                      return;
                    }
                    setFormData({ ...formData, date: newDate });
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>거래처 검색</label>
                <input
                  type="text"
                  placeholder="거래처명 입력 (초성 가능)"
                  value={partnerQuery}
                  onChange={(e) => {
                    setPartnerQuery(e.target.value);
                    setFormData({ ...formData, partner: e.target.value });
                    setShowPartnerSuggestions(true);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                {showPartnerSuggestions && partnerSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '160px', overflowY: 'auto'
                  }}>
                    {partnerSuggestions.map(p => (
                      <div
                        key={p.id || p.name}
                        onMouseDown={() => handleSelectPartner(p)}
                        style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}
                      >
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                        <span style={{ fontSize: '0.74rem', color: '#ef4444' }}>미수: {Number(p.receivables || 0).toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formData.partner && (
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>전미수금:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: partnerReceivables > 0 ? '#ef4444' : '#10b981' }}>
                    {partnerReceivables.toLocaleString()}원
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 700 }}>현금 수금</label>
                  <input
                    type="text"
                    value={formData.cash ? formData.cash.toLocaleString() : ''}
                    onChange={(e) => handleFormAmountChange('cash', e.target.value)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 700 }}>현장 할인</label>
                  <input
                    type="text"
                    value={formData.discount ? formData.discount.toLocaleString() : ''}
                    onChange={(e) => handleFormAmountChange('discount', e.target.value)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700, color: '#dc2626', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 700 }}>계좌 이체</label>
                  <input
                    type="text"
                    value={formData.account ? formData.account.toLocaleString() : ''}
                    onChange={(e) => handleFormAmountChange('account', e.target.value)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>입금 계좌</label>
                  <select
                    value={formData.selectedAccount}
                    onChange={(e) => setFormData({ ...formData, selectedAccount: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                  >
                    <option value="">계좌 미선택</option>
                    {(accounts || []).map(acc => (
                      <option key={acc.id || acc.accountNumber} value={`${acc.bankName} ${acc.accountNumber || ''}`}>
                        {acc.bankName} {acc.accountNumber || ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 700 }}>카드 결제</label>
                  <input
                    type="text"
                    value={formData.card ? formData.card.toLocaleString() : ''}
                    onChange={(e) => handleFormAmountChange('card', e.target.value)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 700 }}>어음 수금</label>
                  <input
                    type="text"
                    value={formData.bill ? formData.bill.toLocaleString() : ''}
                    onChange={(e) => handleFormAmountChange('bill', e.target.value)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '3px' }}>메모</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>총 입금 합계:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>
                    {formTotalDeposit.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setIsIssuanceModalOpen(false); setEditingSlip(null); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 700 }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  style={{ flex: 2, padding: '10px', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', fontWeight: 800 }}
                >
                  💰 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </WindowModal>
  );
};

export default DepositSlipManagement;
