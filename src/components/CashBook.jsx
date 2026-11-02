import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Printer, Download, Plus, Calendar, Filter, Search, Wallet, 
  TrendingUp, TrendingDown, ArrowUpRight, Layers, Tag, User, CreditCard,
  Edit, RotateCcw, Trash2, X, Check, Building2, Eye, EyeOff, Save
} from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { DateNavButton, DateInputWithArrows, addDays } from '../utils/dateNavigationUtils';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './CashBook.css';

const CashBook = ({ 
  onClose, 
  expenses = [], 
  salesInvoices = [], 
  purchaseInvoices = [], 
  staffList = [], 
  currentUser, 
  partners = [],
  accounts = [],
  onOpenExpenseRegistration 
}) => {
  const [activeTab, setActiveTab] = useState('journal'); // 'journal' | 'byCategory'
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState(null);

  // ─── 수기 장부 독자 관리 상태 (전표와 연동되지만 수기 장부처럼 수정 가능) ───
  const companyId = currentUser?.companyId || 'default';
  const storageKey = `cashBookData_${companyId}`;

  const [overrides, setOverrides] = useState(() => {
    try {
      const cached = localStorage.getItem(`${storageKey}_overrides`);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [manualEntries, setManualEntries] = useState(() => {
    try {
      const cached = localStorage.getItem(`${storageKey}_manual`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [hiddenIds, setHiddenIds] = useState(() => {
    try {
      const cached = localStorage.getItem(`${storageKey}_hidden`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({
    id: '',
    isManual: false,
    isNewManual: false,
    source: '',
    date: '',
    typeLabel: '매출수금',
    category: '매출수금',
    partner: '',
    description: '',
    paymentMethod: '현금',
    manager: '',
    income: 0,
    expense: 0,
    memo: ''
  });

  // Firestore에서 수기 장부 커스텀 데이터 로드
  useEffect(() => {
    let isMounted = true;
    const loadRemote = async () => {
      try {
        const snap = await getDoc(doc(db, 'companies', companyId, 'settings', 'cashBookData'));
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.overrides) {
            setOverrides(data.overrides);
            localStorage.setItem(`${storageKey}_overrides`, JSON.stringify(data.overrides));
          }
          if (data.manualEntries) {
            setManualEntries(data.manualEntries);
            localStorage.setItem(`${storageKey}_manual`, JSON.stringify(data.manualEntries));
          }
          if (data.hiddenIds) {
            setHiddenIds(data.hiddenIds);
            localStorage.setItem(`${storageKey}_hidden`, JSON.stringify(data.hiddenIds));
          }
        }
      } catch (err) {
        console.warn('Failed to load cashBookData from Firestore:', err);
      }
    };
    loadRemote();
    return () => { isMounted = false; };
  }, [companyId, storageKey]);

  // 수기 장부 변경사항 영구 저장 (Firestore & LocalStorage)
  const persistCashBook = async (nextOverrides, nextManual, nextHidden) => {
    try {
      localStorage.setItem(`${storageKey}_overrides`, JSON.stringify(nextOverrides));
      localStorage.setItem(`${storageKey}_manual`, JSON.stringify(nextManual));
      localStorage.setItem(`${storageKey}_hidden`, JSON.stringify(nextHidden));

      await setDoc(doc(db, 'companies', companyId, 'settings', 'cashBookData'), {
        overrides: nextOverrides,
        manualEntries: nextManual,
        hiddenIds: nextHidden,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving cashBookData:', err);
    }
  };

  const [filters, setFilters] = useState({
    startDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    endDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    category: '전체',
    type: '전체', // '전체' | 'income' | 'expense' | 'expenseOnly' | 'purchaseOnly'
    manager: '전체',
    paymentMethod: '전체',
    searchQuery: ''
  });

  const handleQuickDate = (type) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    
    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    let start = "";
    let end = formatDate(today);

    switch (type) {
      case '오늘':
        start = formatDate(today);
        end = formatDate(today);
        break;
      case '1주일': {
        const day = today.getDay();
        const sun = new Date(today);
        sun.setDate(today.getDate() - day);
        start = formatDate(sun);
        break;
      }
      case '한달':
        start = `${y}-${String(m).padStart(2, '0')}-01`;
        break;
      case '3개월': {
        const threeM = new Date(today);
        threeM.setMonth(today.getMonth() - 2);
        threeM.setDate(1);
        start = formatDate(threeM);
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
        start = '2020-01-01';
        end = '2030-12-31';
        break;
      default:
        start = `${y}-${String(m).padStart(2, '0')}-01`;
    }

    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  // Combine and normalize all transaction records (전표 자동 연동 + 거래처명 완벽 포함 + 수기 수정 오버라이드)
  const allTransactions = useMemo(() => {
    const list = [];

    // 1. Expenses (경비출금 내역)
    (expenses || []).forEach(exp => {
      if (!exp.date) return;
      const expAmt = Number(exp.amount || 0);
      if (expAmt <= 0) return;

      const expPartner = (exp.partner || exp.payee || exp.vendor || exp.partnerName || '').trim();
      const expDesc = exp.description || exp.category || '경비지출';

      list.push({
        id: `exp-${exp.id || Math.random()}`,
        rawId: exp.id,
        date: exp.date,
        source: 'expense',
        typeLabel: '경비출금',
        category: exp.category || '기타경비',
        partner: expPartner,
        manager: exp.manager || '본사',
        paymentMethod: exp.paymentMethod || '현금',
        description: expPartner ? `[${expPartner}] ${expDesc}` : expDesc,
        income: 0,
        expense: expAmt,
        memo: exp.memo || ''
      });
    });

    // 2. Sales Invoices (매출수금 / 입금전표 내역 - 거래처명 및 세부수금 완벽 연동)
    (salesInvoices || []).forEach(inv => {
      if (!inv.date) return;

      const customer = (inv.partner || inv.partnerName || inv.customerName || inv.customer || '').trim() || '미지정 거래처';
      const isPureDep = Boolean(
        inv.isDepositOnly ||
        (!inv.items?.length && (Number(inv.receivedAmount || 0) > 0 || inv.memo === '입금전표' || inv.type === 'deposit'))
      );

      // A. 다중 수금 전표(paymentList)가 있는 경우 각각의 개별 수금 내역으로 분리 연동
      if (Array.isArray(inv.paymentList) && inv.paymentList.length > 0) {
        inv.paymentList.forEach((slip, pIdx) => {
          const slipAmt = Number(
            slip.totalAmount || slip.amount || 
            (Number(slip.cash || 0) + Number(slip.account || 0) + Number(slip.card || 0) + Number(slip.bill || 0)) || 0
          );
          if (slipAmt <= 0) return;

          let payMethod = '현금';
          if (Number(slip.account) > 0) payMethod = '계좌이체';
          else if (Number(slip.card) > 0) payMethod = '카드';
          else if (Number(slip.bill) > 0) payMethod = '어음';

          const itemSummary = inv.items?.[0]?.productName || inv.items?.[0]?.name || '';
          const countText = inv.items?.length > 1 ? ` 외 ${inv.items.length - 1}건` : '';
          const fullItemText = itemSummary ? `${itemSummary}${countText}` : '';
          const slipMemo = slip.memo || inv.memo || '';
          
          const detailText = slipMemo 
            ? `${slipMemo}${fullItemText ? ` (${fullItemText})` : ''}` 
            : (fullItemText || '매출수금');

          list.push({
            id: slip.id ? `sale-${inv.id}_${slip.id}` : `sale-${inv.id}_p${pIdx}`,
            rawId: inv.id,
            date: slip.date || inv.date,
            source: 'sales',
            typeLabel: '매출수금',
            category: '매출수금',
            partner: customer,
            manager: slip.creator || inv.manager || inv.creator || '본사',
            paymentMethod: payMethod,
            description: `[${customer}] ${detailText}`,
            income: slipAmt,
            expense: 0,
            memo: slipMemo
          });
        });
      } else {
        // B. 단일 수금 내역
        const received = Number(inv.receivedAmount || 0);
        const amount = received > 0 
          ? received 
          : (isPureDep ? Number(inv.totalAmount || 0) : 0);
        if (amount <= 0) return;

        let payMethod = inv.paymentMethod || '현금';
        const payments = inv.payments || {};
        if (Number(payments.account) > 0) payMethod = '계좌이체';
        else if (Number(payments.card) > 0) payMethod = '카드';
        else if (Number(payments.bill) > 0) payMethod = '어음';

        const itemSummary = inv.items?.[0]?.productName || inv.items?.[0]?.name || '';
        const countText = inv.items?.length > 1 ? ` 외 ${inv.items.length - 1}건` : '';
        const fullItemText = itemSummary ? `${itemSummary}${countText}` : '';
        const baseMemo = inv.memo || '';

        const detailText = baseMemo
          ? `${baseMemo}${fullItemText ? ` (${fullItemText})` : ''}`
          : (fullItemText || (isPureDep ? '입금전표' : '매출수금'));

        list.push({
          id: `sale-${inv.id}`,
          rawId: inv.id,
          date: inv.date,
          source: 'sales',
          typeLabel: isPureDep ? '입금전표' : '매출수금',
          category: '매출수금',
          partner: customer,
          manager: inv.manager || inv.creator || '본사',
          paymentMethod: payMethod,
          description: `[${customer}] ${detailText}`,
          income: amount,
          expense: 0,
          memo: baseMemo
        });
      }
    });

    // 3. Purchase Invoices (매입지급 내역 - 거래처명 명확히 포함)
    (purchaseInvoices || []).forEach(pinv => {
      if (!pinv.date) return;
      const amount = Number(pinv.paidAmount || pinv.totalAmount || 0);
      if (amount <= 0) return;

      const partner = (pinv.partnerName || pinv.partner || '').trim() || '미지정 매입처';
      const itemSummary = pinv.items?.[0]?.productName || pinv.items?.[0]?.name || '';
      const countText = pinv.items?.length > 1 ? ` 외 ${pinv.items.length - 1}건` : '';
      const summaryText = itemSummary ? `${itemSummary}${countText}` : (pinv.memo || '매입지급');

      list.push({
        id: `purch-${pinv.id || Math.random()}`,
        rawId: pinv.id,
        date: pinv.date,
        source: 'purchase',
        typeLabel: '매입지급',
        category: '매입지급',
        partner: partner,
        manager: pinv.manager || pinv.creator || '본사',
        paymentMethod: pinv.paymentMethod || '계좌이체',
        description: `[${partner}] ${summaryText}${pinv.memo ? ` (${pinv.memo})` : ''}`,
        income: 0,
        expense: amount,
        memo: pinv.memo || ''
      });
    });

    // 4. 수기 장부 오버라이드(수정본) 적용 및 숨김 내역 제외
    const hiddenSet = new Set(hiddenIds);
    const processedList = list
      .filter(tx => !hiddenSet.has(tx.id))
      .map(tx => {
        if (overrides[tx.id]) {
          return {
            ...tx,
            ...overrides[tx.id],
            isOverridden: true,
            original: tx
          };
        }
        return tx;
      });

    // 5. 수기 장부에 직접 입력된 순수 수기 내역(manualEntries) 병합
    (manualEntries || []).forEach(m => {
      if (!hiddenSet.has(m.id)) {
        processedList.push({
          ...m,
          isManual: true,
          source: 'manual'
        });
      }
    });

    // Sort chronologically ascending
    processedList.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return String(a.id).localeCompare(String(b.id));
    });

    return processedList;
  }, [expenses, salesInvoices, purchaseInvoices, overrides, manualEntries, hiddenIds]);

  // Extract all unique categories for the dropdown filter (수기 과목 포함)
  const categoryOptions = useMemo(() => {
    const expenseCats = Array.from(new Set([
      ...(expenses || []).map(e => e.category).filter(Boolean),
      ...(manualEntries || []).map(m => m.category).filter(Boolean)
    ]));
    const allUnique = Array.from(new Set(['매출수금', ...expenseCats, '매입지급']));
    return {
      expenseCats,
      allCats: allUnique
    };
  }, [expenses, manualEntries]);

  // Filtered transactions based on active filter state
  const filteredTransactions = useMemo(() => {
    let runningBalance = 0;

    return allTransactions
      .filter(tx => {
        if (filters.startDate && tx.date < filters.startDate) return false;
        if (filters.endDate && tx.date > filters.endDate) return false;
        if (filters.category !== '전체' && tx.category !== filters.category) return false;

        if (filters.type === 'income' && tx.income <= 0) return false;
        if (filters.type === 'expense' && tx.expense <= 0) return false;
        if (filters.type === 'expenseOnly' && tx.source !== 'expense') return false;
        if (filters.type === 'purchaseOnly' && tx.source !== 'purchase') return false;

        if (filters.manager !== '전체' && tx.manager !== filters.manager) return false;
        if (filters.paymentMethod !== '전체' && tx.paymentMethod !== filters.paymentMethod) return false;

        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchDesc = (tx.description || '').toLowerCase().includes(q);
          const matchPartner = (tx.partner || '').toLowerCase().includes(q);
          const matchCat = (tx.category || '').toLowerCase().includes(q);
          const matchMgr = (tx.manager || '').toLowerCase().includes(q);
          if (!matchDesc && !matchPartner && !matchCat && !matchMgr) return false;
        }

        return true;
      })
      .map(tx => {
        runningBalance += (tx.income - tx.expense);
        return {
          ...tx,
          balance: runningBalance
        };
      });
  }, [allTransactions, filters]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let expenseOnlyTotal = 0;
    let purchaseOnlyTotal = 0;

    filteredTransactions.forEach(tx => {
      totalIncome += tx.income;
      totalExpense += tx.expense;
      if (tx.source === 'expense') expenseOnlyTotal += tx.expense;
      if (tx.source === 'purchase') purchaseOnlyTotal += tx.expense;
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      expenseOnly: expenseOnlyTotal,
      purchaseOnly: purchaseOnlyTotal,
      net: totalIncome - totalExpense,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Aggregation by category (과목별 집계)
  const categoryStats = useMemo(() => {
    const map = {};

    filteredTransactions.forEach(tx => {
      const cat = tx.category || '기타';
      if (!map[cat]) {
        map[cat] = {
          category: cat,
          source: tx.source,
          typeLabel: tx.typeLabel,
          count: 0,
          income: 0,
          expense: 0,
          cash: 0,
          transfer: 0,
          card: 0,
          bill: 0,
          other: 0,
          items: []
        };
      }

      map[cat].count += 1;
      map[cat].income += tx.income;
      map[cat].expense += tx.expense;
      map[cat].items.push(tx);

      const amt = tx.income > 0 ? tx.income : tx.expense;
      if (tx.paymentMethod === '현금') map[cat].cash += amt;
      else if (tx.paymentMethod === '계좌이체' || tx.paymentMethod === '계좌') map[cat].transfer += amt;
      else if (tx.paymentMethod === '카드') map[cat].card += amt;
      else if (tx.paymentMethod === '어음') map[cat].bill += amt;
      else map[cat].other += amt;
    });

    const list = Object.values(map);
    list.sort((a, b) => (b.expense + b.income) - (a.expense + a.income));

    return list;
  }, [filteredTransactions]);

  // ─── 수기 장부 편집 / 신규 등록 핸들러 ───
  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditForm({
      id: tx.id,
      isManual: Boolean(tx.isManual),
      isNewManual: false,
      source: tx.source || '',
      date: tx.date || '',
      typeLabel: tx.typeLabel || (tx.income > 0 ? '매출수금' : '경비출금'),
      category: tx.category || '기타',
      partner: tx.partner || '',
      description: tx.description || '',
      paymentMethod: tx.paymentMethod || '현금',
      manager: tx.manager || currentUser?.name || '본사',
      income: tx.income || 0,
      expense: tx.expense || 0,
      memo: tx.memo || ''
    });
  };

  const handleOpenNewManual = () => {
    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const newId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newTxObj = { isNewManual: true, isManual: true, id: newId };
    setEditingTx(newTxObj);
    setEditForm({
      id: newId,
      isManual: true,
      isNewManual: true,
      source: 'manual',
      date: todayStr,
      typeLabel: '기타수입',
      category: '기타수입',
      partner: '',
      description: '',
      paymentMethod: '현금',
      manager: currentUser?.name || '관리자',
      income: 0,
      expense: 0,
      memo: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.date) {
      alert('일자를 입력해주세요.');
      return;
    }
    const inc = Number(editForm.income) || 0;
    const exp = Number(editForm.expense) || 0;
    if (inc === 0 && exp === 0) {
      alert('수입 또는 지출 금액을 1원 이상 입력해주세요.');
      return;
    }

    let desc = (editForm.description || '').trim();
    if (editForm.partner && !desc.includes(editForm.partner)) {
      desc = desc ? `[${editForm.partner}] ${desc}` : `[${editForm.partner}]`;
    }
    if (!desc) {
      desc = editForm.partner ? `[${editForm.partner}]` : (editForm.typeLabel || '출납내역');
    }

    const payload = {
      ...editForm,
      description: desc,
      income: inc,
      expense: exp,
      updatedAt: new Date().toISOString()
    };

    if (editingTx.isNewManual) {
      const nextManual = [payload, ...manualEntries];
      setManualEntries(nextManual);
      await persistCashBook(overrides, nextManual, hiddenIds);
      alert('수기 출납 내역이 장부에 성공적으로 등록되었습니다.');
    } else if (editingTx.isManual) {
      const nextManual = manualEntries.map(m => m.id === payload.id ? payload : m);
      setManualEntries(nextManual);
      await persistCashBook(overrides, nextManual, hiddenIds);
      alert('수기 출납 내역이 수정되었습니다.');
    } else {
      const nextOverrides = {
        ...overrides,
        [payload.id]: payload
      };
      setOverrides(nextOverrides);
      await persistCashBook(nextOverrides, manualEntries, hiddenIds);
      alert('금전출납부(수기 장부) 내역이 수정되었습니다.\n(원본 전표 데이터는 안전하게 보존됩니다)');
    }
    setEditingTx(null);
  };

  const handleResetToOriginal = async (txId) => {
    if (window.confirm('이 내역의 수기 수정을 취소하고, 전표 원본 데이터로 복원하시겠습니까?')) {
      const nextOverrides = { ...overrides };
      delete nextOverrides[txId];
      setOverrides(nextOverrides);
      await persistCashBook(nextOverrides, manualEntries, hiddenIds);
      alert('전표 원본 데이터로 복원되었습니다.');
      setEditingTx(null);
    }
  };

  const handleDeleteOrHide = async (tx) => {
    if (tx.isManual) {
      if (window.confirm('이 수기 출납 내역을 삭제하시겠습니까?')) {
        const nextManual = manualEntries.filter(m => m.id !== tx.id);
        setManualEntries(nextManual);
        await persistCashBook(overrides, nextManual, hiddenIds);
        alert('삭제되었습니다.');
        setEditingTx(null);
      }
    } else {
      if (window.confirm('이 전표 내역을 금전출납부 장부에서 숨기시겠습니까?\n(원본 전표는 삭제되지 않으며, 장부 목록에서만 제외됩니다)')) {
        const nextHidden = [...hiddenIds, tx.id];
        setHiddenIds(nextHidden);
        await persistCashBook(overrides, manualEntries, nextHidden);
        alert('금전출납부에서 제외되었습니다.');
        setEditingTx(null);
      }
    }
  };

  const handleExcelExport = () => {
    if (activeTab === 'byCategory') {
      const dataToExport = categoryStats.map((st, idx) => ({
        '순번': idx + 1,
        '과목(구분)': st.category,
        '분류': st.typeLabel,
        '건수': st.count,
        '현금': st.cash,
        '계좌이체': st.transfer,
        '카드': st.card,
        '어음': st.bill,
        '수입합계': st.income,
        '지출합계': st.expense,
        '총합계': st.income > 0 ? st.income : st.expense
      }));
      exportToExcel(dataToExport, `금전출납부_과목별집계_${filters.startDate}_${filters.endDate}`);
    } else {
      const dataToExport = filteredTransactions.map((tx, idx) => ({
        '순번': idx + 1,
        '일자': tx.date,
        '구분': tx.typeLabel,
        '과목': tx.category,
        '거래처명': tx.partner || '',
        '담당자': tx.manager,
        '결제수단': tx.paymentMethod,
        '적요(내역)': tx.description,
        '수입': tx.income,
        '지출': tx.expense,
        '잔액': tx.balance,
        '장부상태': tx.isOverridden ? '수기수정' : (tx.isManual ? '수기등록' : '전표연동')
      }));
      exportToExcel(dataToExport, `금전출납부_출납장부_${filters.startDate}_${filters.endDate}`);
    }
  };

  const getCategoryBadgeStyle = (cat, source) => {
    if (source === 'sales' || cat === '매출수금') {
      return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
    }
    if (source === 'purchase' || cat === '매입지급') {
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }

    const palette = {
      '식대': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
      '교통비': { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
      '소모품비': { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
      '통신비': { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
      '수도광열비': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
      '차량유지비': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
      '임차료': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
      '급여': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      '세금과공과': { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
      '기타': { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
    };

    return palette[cat] || { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
  };

  return (
    <WindowModal title="금전출납부 (경비·수입·지출 과목별 현황)" onClose={onClose} width="100%" height="92vh" contentPadding="0" noScroll>
      <div className="cashbook-mobile-root">
        {/* 상단 헤더 */}
        <div className="report-v2-header">
          <div className="report-v2-title-group">
            <BookOpen size={20} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <h2 className="report-v2-title">금전출납부</h2>
              <span className="report-v2-subtitle">
                (과목별 경비출금 및 수금·지급 내역)
              </span>
            </div>
          </div>

          <div className="report-v2-actions">
            <button className="btn-v2-action" onClick={() => window.print()} title="출력">
              <Printer size={14} /> 인쇄
            </button>
            <button className="btn-v2-action" onClick={handleExcelExport} title="엑셀 다운로드">
              <Download size={14} /> 엑셀
            </button>
            <button 
              className="btn-v2-action primary-action" 
              onClick={handleOpenNewManual}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }}
              title="금전출납부에 수기 출납 내역 직접 입력"
            >
              <Plus size={14} /> 수기 출납 입력
            </button>
            {hiddenIds.length > 0 && (
              <button 
                className="btn-v2-action" 
                onClick={async () => {
                  if (window.confirm(`장부에서 숨김 처리된 ${hiddenIds.length}건의 전표 내역을 모두 복원하시겠습니까?`)) {
                    setHiddenIds([]);
                    await persistCashBook(overrides, manualEntries, []);
                    alert('숨김 처리된 내역이 모두 복원되었습니다.');
                  }
                }}
                style={{ backgroundColor: '#fff', borderColor: '#cbd5e1', color: '#64748b' }}
                title="숨김 처리된 내역 복원"
              >
                <RotateCcw size={13} /> 숨김 해제 ({hiddenIds.length})
              </button>
            )}
            {onOpenExpenseRegistration && (
              <button 
                className="btn-v2-action" 
                onClick={onOpenExpenseRegistration}
                style={{ backgroundColor: '#fff', borderColor: '#ef4444', color: '#ef4444' }}
                title="경비출금 등록 창 열기"
              >
                <Plus size={14} /> 경비출금 등록
              </button>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="cashbook-tabs-wrapper">
          <button 
            className={`cb-tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => { setActiveTab('journal'); setSelectedCategoryDetail(null); }}
          >
            <Layers size={15} />
            출납 장부 내역 ({filteredTransactions.length}건)
          </button>

          <button 
            className={`cb-tab-btn ${activeTab === 'byCategory' ? 'active' : ''}`}
            onClick={() => setActiveTab('byCategory')}
          >
            <Tag size={15} />
            과목별 집계 현황 ({categoryStats.length}개 과목)
          </button>
        </div>

        {/* 필터 바 */}
        <div className="report-v2-filters">
          <div className="filter-row-simple">
            
            {/* 기간 필터 (DateInputWithArrows 활용) */}
            <div className="cb-date-filter-wrap">
              <div className="date-range-simple">
                <Calendar size={14} color="#64748b" style={{ flexShrink: 0 }} />
                <DateInputWithArrows
                  value={filters.startDate}
                  onChange={val => setFilters(prev => ({ ...prev, startDate: val }))}
                  inputStyle={{ width: '112px', fontSize: '0.78rem', padding: '3px 5px', fontWeight: 600 }}
                />
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>~</span>
                <DateInputWithArrows
                  value={filters.endDate}
                  onChange={val => setFilters(prev => ({ ...prev, endDate: val }))}
                  inputStyle={{ width: '112px', fontSize: '0.78rem', padding: '3px 5px', fontWeight: 600 }}
                />
              </div>

              <div className="cb-quick-dates">
                {['오늘', '1주일', '한달', '3개월', '상반기', '하반기', '1년', '전체'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleQuickDate(btn)}
                    className="cb-quick-date-btn"
                  >{btn}</button>
                ))}
              </div>
            </div>

            {/* 세부 드롭다운 & 검색 필터 */}
            <div className="cb-subfilters-grid">
              {/* 과목 필터 드롭다운 */}
              <div className="select-with-icon">
                <Tag size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                <select 
                  value={filters.category} 
                  onChange={e => setFilters({...filters, category: e.target.value})}
                  style={{ fontWeight: filters.category !== '전체' ? 800 : 500, color: filters.category !== '전체' ? '#2563eb' : 'inherit' }}
                >
                  <option value="전체">전체 과목</option>
                  <optgroup label="[수입 과목]">
                    <option value="매출수금">매출수금</option>
                  </optgroup>
                  <optgroup label="[경비출금 과목]">
                    {categoryOptions.expenseCats.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="[매입 과목]">
                    <option value="매입지급">매입지급</option>
                  </optgroup>
                </select>
              </div>

              {/* 거래구분 드롭다운 */}
              <div className="select-with-icon">
                <Filter size={13} color="#64748b" style={{ flexShrink: 0 }} />
                <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
                  <option value="전체">전체 구분</option>
                  <option value="income">수입만 (수금)</option>
                  <option value="expense">지출만 (경비+매입)</option>
                  <option value="expenseOnly">경비출금만</option>
                  <option value="purchaseOnly">매입지급만</option>
                </select>
              </div>

              {/* 담당자 드롭다운 */}
              <div className="select-with-icon">
                <User size={13} color="#64748b" style={{ flexShrink: 0 }} />
                <select value={filters.manager} onChange={e => setFilters({...filters, manager: e.target.value})}>
                  <option value="전체">전체 담당자</option>
                  {staffList.map(s => <option key={s.id || s.userId || s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {/* 결제수단 드롭다운 */}
              <div className="select-with-icon">
                <CreditCard size={13} color="#64748b" style={{ flexShrink: 0 }} />
                <select value={filters.paymentMethod} onChange={e => setFilters({...filters, paymentMethod: e.target.value})}>
                  <option value="전체">전체 결제수단</option>
                  <option value="현금">현금</option>
                  <option value="계좌이체">계좌이체</option>
                  <option value="카드">카드</option>
                  <option value="어음">어음</option>
                </select>
              </div>

              {/* 검색창 */}
              <div className="cb-search-box">
                <Search size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="적요, 거래처, 과목 검색..." 
                  value={filters.searchQuery} 
                  onChange={e => setFilters({...filters, searchQuery: e.target.value})}
                />
                {filters.searchQuery && (
                  <button onClick={() => setFilters({...filters, searchQuery: ''})} className="cb-search-clear">✕</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="report-v2-content">
          {/* 요약 카드 (4개) */}
          <div className="cashbook-summary-cards">
            <div className="cb-card blue">
              <div className="cb-label">
                <span>수입 총액 (수금)</span>
                <TrendingUp size={15} color="#3b82f6" />
              </div>
              <div className="cb-value" style={{ color: '#1e3a8a' }}>
                {totals.income.toLocaleString()}<span className="cb-unit">원</span>
              </div>
            </div>

            <div className="cb-card red">
              <div className="cb-label">
                <span>지출 총액 (출금)</span>
                <TrendingDown size={15} color="#ef4444" />
              </div>
              <div className="cb-value" style={{ color: '#991b1b' }}>
                {totals.expense.toLocaleString()}<span className="cb-unit">원</span>
              </div>
              <div className="cb-submeta" style={{ color: '#b91c1c' }}>
                <span>경비: <b>{totals.expenseOnly.toLocaleString()}원</b></span>
                <span>·</span>
                <span>매입: <b>{totals.purchaseOnly.toLocaleString()}원</b></span>
              </div>
            </div>

            <div className="cb-card purple">
              <div className="cb-label">
                <span>경비출금 (과목별)</span>
                <Wallet size={15} color="#8b5cf6" />
              </div>
              <div className="cb-value" style={{ color: '#5b21b6' }}>
                {totals.expenseOnly.toLocaleString()}<span className="cb-unit">원</span>
              </div>
              <div className="cb-submeta" style={{ color: '#7c3aed' }}>
                등록된 과목 {categoryOptions.expenseCats.length}종류
              </div>
            </div>

            <div className="cb-card green">
              <div className="cb-label">
                <span>순 출납 잔액</span>
                <ArrowUpRight size={15} color="#10b981" />
              </div>
              <div className="cb-value" style={{ color: totals.net >= 0 ? '#047857' : '#b91c1c' }}>
                {totals.net.toLocaleString()}<span className="cb-unit">원</span>
              </div>
            </div>
          </div>

          {/* 탭 1: 출납 장부 내역 */}
          {activeTab === 'journal' && (
            <div className="report-v2-table-container">
              <table className="report-v2-table">
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <th style={{ padding: '10px 8px', width: '44px' }}>No</th>
                    <th style={{ padding: '10px 8px', width: '92px' }}>일자</th>
                    <th style={{ padding: '10px 8px', width: '80px' }}>구분</th>
                    <th style={{ padding: '10px 10px', width: '105px' }}>과목 (계정과목)</th>
                    <th style={{ padding: '10px 8px', width: '80px' }}>담당자</th>
                    <th style={{ padding: '10px 8px', width: '80px' }}>결제수단</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '200px' }}>적요 / 상세내역 (거래처)</th>
                    <th style={{ padding: '10px 10px', width: '105px', textAlign: 'right', color: '#2563eb' }}>수입 (입금)</th>
                    <th style={{ padding: '10px 10px', width: '105px', textAlign: 'right', color: '#ef4444' }}>지출 (출금)</th>
                    <th style={{ padding: '10px 10px', width: '110px', textAlign: 'right' }}>누적 잔액</th>
                    <th style={{ padding: '10px 8px', width: '98px', textAlign: 'center' }}>장부 관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx, idx) => {
                      const badge = getCategoryBadgeStyle(tx.category, tx.source);
                      return (
                        <tr 
                          key={tx.id} 
                          onDoubleClick={() => handleOpenEdit(tx)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.1s' }}
                          title="터치 또는 수정 버튼으로 수기 장부 내역 수정"
                        >
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{tx.date}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontSize: '0.73rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: tx.source === 'sales' ? '#eff6ff' : (tx.source === 'expense' ? '#fef2f2' : (tx.source === 'manual' ? '#ecfdf5' : '#f1f5f9')),
                              color: tx.source === 'sales' ? '#1d4ed8' : (tx.source === 'expense' ? '#b91c1c' : (tx.source === 'manual' ? '#047857' : '#475569'))
                            }}>
                              {tx.typeLabel}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span 
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                display: 'inline-block',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilters(prev => ({ ...prev, category: tx.category }));
                              }}
                              title="클릭 시 이 과목으로 필터링"
                            >
                              {tx.category}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#475569', whiteSpace: 'nowrap' }}>{tx.manager}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.73rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {tx.paymentMethod}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left', color: '#1e293b', fontWeight: 500, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {tx.partner && (
                                <span style={{
                                  fontWeight: 800,
                                  color: tx.source === 'sales' ? '#1d4ed8' : (tx.source === 'purchase' ? '#475569' : '#047857'),
                                  backgroundColor: tx.source === 'sales' ? '#eff6ff' : (tx.source === 'purchase' ? '#f1f5f9' : '#ecfdf5'),
                                  border: `1px solid ${tx.source === 'sales' ? '#bfdbfe' : (tx.source === 'purchase' ? '#cbd5e1' : '#a7f3d0')}`,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.76rem',
                                  flexShrink: 0
                                }}>
                                  {tx.partner}
                                </span>
                              )}
                              <span>{tx.description}</span>
                              {tx.isOverridden && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 5px' }}>
                                  수기수정
                                </span>
                              )}
                              {tx.isManual && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '1px 5px' }}>
                                  수기등록
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: tx.income > 0 ? '#2563eb' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                            {tx.income > 0 ? `${tx.income.toLocaleString()}원` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: tx.expense > 0 ? '#ef4444' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                            {tx.expense > 0 ? `${tx.expense.toLocaleString()}원` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: tx.balance >= 0 ? '#0f172a' : '#b91c1c', whiteSpace: 'nowrap' }}>
                            {tx.balance.toLocaleString()}원
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(tx);
                                }}
                                style={{
                                  padding: '4px 7px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                                title="수기 장부 내역 수정"
                              >
                                <Edit size={11} /> 수정
                              </button>
                              {tx.isOverridden ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetToOriginal(tx.id);
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  title="전표 원본 데이터로 복원"
                                >
                                  <RotateCcw size={11} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOrHide(tx);
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  title={tx.isManual ? "수기 내역 삭제" : "장부에서 숨기기"}
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '44px 16px', color: '#94a3b8' }}>
                        해당 기간 및 조건에 일치하는 금전 출납 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '12px' }}>
                      총 합계 ({filteredTransactions.length}건)
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#2563eb', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {totals.income.toLocaleString()}원
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#ef4444', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {totals.expense.toLocaleString()}원
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px', color: totals.net >= 0 ? '#0f172a' : '#b91c1c', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {totals.net.toLocaleString()}원
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 탭 2: 과목별 집계 현황 */}
          {activeTab === 'byCategory' && (
            <div className="cashbook-by-category-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 과목별 요약 카드 그리드 */}
              <div className="cb-category-cards-grid">
                {categoryStats.map(st => {
                  const isExpense = st.source === 'expense' || st.source === 'purchase';
                  const totalAmt = isExpense ? st.expense : st.income;
                  const badge = getCategoryBadgeStyle(st.category, st.source);
                  const percent = isExpense 
                    ? (totals.expense > 0 ? ((st.expense / totals.expense) * 100).toFixed(1) : 0)
                    : (totals.income > 0 ? ((st.income / totals.income) * 100).toFixed(1) : 0);

                  return (
                    <div 
                      key={st.category}
                      onClick={() => setSelectedCategoryDetail(selectedCategoryDetail === st.category ? null : st.category)}
                      style={{
                        background: '#fff',
                        border: selectedCategoryDetail === st.category ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {st.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {st.count}건 ({percent}%)
                        </span>
                      </div>

                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isExpense ? '#ef4444' : '#2563eb', marginBottom: '6px' }}>
                        {totalAmt.toLocaleString()}원
                      </div>

                      <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isExpense ? '#ef4444' : '#3b82f6', borderRadius: '3px' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <span>현금: {st.cash.toLocaleString()}</span>
                        <span>계좌: {st.transfer.toLocaleString()}</span>
                        <span>카드: {st.card.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 과목별 집계 상세 테이블 */}
              <div className="report-v2-table-container">
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={15} color="#ef4444" />
                    과목별 집계표 (금액 및 결제수단 분석)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    * 항목을 터치하면 하단에 세부 내역이 표시됩니다.
                  </div>
                </div>

                <table className="report-v2-table">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <th style={{ padding: '10px 8px', width: '50px' }}>No</th>
                      <th style={{ padding: '10px 10px', textAlign: 'left' }}>과목 (계정과목)</th>
                      <th style={{ padding: '10px 8px', width: '75px' }}>분류</th>
                      <th style={{ padding: '10px 8px', width: '70px' }}>건수</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>현금</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>계좌이체</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>카드</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>어음</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right', width: '120px' }}>총 금액</th>
                      <th style={{ padding: '10px 8px', width: '80px' }}>비중(%)</th>
                      <th style={{ padding: '10px 8px', width: '80px' }}>조회</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryStats.map((st, idx) => {
                      const isExpense = st.source === 'expense' || st.source === 'purchase';
                      const totalAmt = isExpense ? st.expense : st.income;
                      const badge = getCategoryBadgeStyle(st.category, st.source);
                      const percent = isExpense 
                        ? (totals.expense > 0 ? ((st.expense / totals.expense) * 100).toFixed(1) : 0)
                        : (totals.income > 0 ? ((st.income / totals.income) * 100).toFixed(1) : 0);

                      const isSelected = selectedCategoryDetail === st.category;

                      return (
                        <tr 
                          key={st.category}
                          onClick={() => setSelectedCategoryDetail(isSelected ? null : st.category)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`
                            }}>
                              {st.category}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>{st.typeLabel}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>{st.count}건</td>
                          <td style={{ textAlign: 'right', color: st.cash > 0 ? '#334155' : '#cbd5e1', whiteSpace: 'nowrap' }}>{st.cash.toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', color: st.transfer > 0 ? '#334155' : '#cbd5e1', whiteSpace: 'nowrap' }}>{st.transfer.toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', color: st.card > 0 ? '#334155' : '#cbd5e1', whiteSpace: 'nowrap' }}>{st.card.toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', color: st.bill > 0 ? '#334155' : '#cbd5e1', whiteSpace: 'nowrap' }}>{st.bill.toLocaleString()}원</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: isExpense ? '#ef4444' : '#2563eb', whiteSpace: 'nowrap' }}>
                            {totalAmt.toLocaleString()}원
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                            {percent}%
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilters(prev => ({ ...prev, category: st.category }));
                                setActiveTab('journal');
                              }}
                              style={{
                                padding: '3px 6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#fff',
                                color: '#2563eb',
                                cursor: 'pointer'
                              }}
                            >
                              내역보기
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 선택한 과목의 세부 내역 (드릴다운 테이블) */}
              {selectedCategoryDetail && (
                <div className="report-v2-table-container" style={{ border: '1.5px solid #3b82f6' }}>
                  <div style={{ padding: '10px 14px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.88rem' }}>
                      📌 '{selectedCategoryDetail}' 과목 세부 내역 (총 {categoryStats.find(s => s.category === selectedCategoryDetail)?.count || 0}건)
                    </div>
                    <button 
                      onClick={() => setSelectedCategoryDetail(null)}
                      style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
                    >
                      닫기 ✕
                    </button>
                  </div>
                  <table className="report-v2-table">
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <th style={{ padding: '8px 10px', width: '95px' }}>일자</th>
                        <th style={{ padding: '8px 10px', width: '85px' }}>담당자</th>
                        <th style={{ padding: '8px 10px', width: '80px' }}>결제수단</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '180px' }}>적요 / 상세내역</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(categoryStats.find(s => s.category === selectedCategoryDetail)?.items || []).map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.date}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{item.manager}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{item.paymentMethod}</td>
                          <td style={{ textAlign: 'left' }}>{item.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: item.income > 0 ? '#2563eb' : '#ef4444', whiteSpace: 'nowrap' }}>
                            {(item.income > 0 ? item.income : item.expense).toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── 수기 장부 내역 수정 및 직접 등록 모달 ─── */}
      {editingTx && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 10050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '95vw',
            maxWidth: '580px',
            maxHeight: '88vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingTx.isNewManual ? '수기 출납 내역 직접 등록' : '금전출납부 수기 장부 내역 수정'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {!editingTx.isNewManual && !editingTx.isManual && (
                <div style={{
                  padding: '9px 12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  color: '#1d4ed8',
                  lineHeight: 1.45
                }}>
                  💡 <b>안내</b>: 실제 전표({editingTx.typeLabel || '전표'})와 연동된 내역입니다. 여기서 수정하는 내용은 <b>금전출납부(수기 장부)에만 독립적으로 반영</b>되며, 원본 전표 데이터에는 영향을 주지 않습니다.
                </div>
              )}

              {/* 1. 일자 & 거래구분 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    일자 *
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    거래 구분 *
                  </label>
                  <select
                    value={editForm.typeLabel}
                    onChange={e => {
                      const val = e.target.value;
                      const isInc = val === '매출수금' || val === '기타수입';
                      setEditForm(prev => ({
                        ...prev,
                        typeLabel: val,
                        category: isInc ? (prev.category === '기타' || prev.category === '매입지급' ? '매출수금' : prev.category) : (prev.category === '매출수금' ? '식대' : prev.category)
                      }));
                    }}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, boxSizing: 'border-box' }}
                  >
                    <option value="매출수금">수입 (매출수금/입금)</option>
                    <option value="기타수입">수입 (기타수입)</option>
                    <option value="경비출금">지출 (경비출금)</option>
                    <option value="매입지급">지출 (매입지급)</option>
                    <option value="기타지출">지출 (기타지출)</option>
                  </select>
                </div>
              </div>

              {/* 2. 과목 & 결제수단 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    과목 (계정과목) *
                  </label>
                  <input
                    type="text"
                    list="cashbook-category-datalist"
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    placeholder="과목 직접 입력 또는 선택"
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                  <datalist id="cashbook-category-datalist">
                    <option value="매출수금" />
                    <option value="매입지급" />
                    <option value="식대" />
                    <option value="교통비" />
                    <option value="소모품비" />
                    <option value="통신비" />
                    <option value="수도광열비" />
                    <option value="차량유지비" />
                    <option value="임차료" />
                    <option value="급여" />
                    <option value="세금과공과" />
                    <option value="기타수입" />
                    <option value="기타경비" />
                    <option value="기타" />
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    결제수단
                  </label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  >
                    <option value="현금">현금</option>
                    <option value="계좌이체">계좌이체</option>
                    <option value="카드">카드</option>
                    <option value="어음">어음</option>
                  </select>
                </div>
              </div>

              {/* 3. 거래처명 & 담당자 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    거래처명
                  </label>
                  <input
                    type="text"
                    list="cashbook-partner-datalist"
                    value={editForm.partner}
                    onChange={e => {
                      const newPartner = e.target.value;
                      setEditForm(prev => {
                        let newDesc = prev.description;
                        if (!newDesc && newPartner) {
                          newDesc = `[${newPartner}] ${prev.typeLabel || '매출수금'}`;
                        }
                        return { ...prev, partner: newPartner, description: newDesc };
                      });
                    }}
                    placeholder="거래처명 입력 또는 선택"
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                  <datalist id="cashbook-partner-datalist">
                    {(partners || []).map(p => (
                      <option key={p.id || p.name} value={p.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    담당자
                  </label>
                  <select
                    value={editForm.manager}
                    onChange={e => setEditForm({ ...editForm, manager: e.target.value })}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  >
                    <option value="본사">본사</option>
                    {staffList.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 4. 금액 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                    수입 (입금액)
                  </label>
                  <input
                    type="number"
                    value={editForm.income}
                    onChange={e => setEditForm({ ...editForm, income: Number(e.target.value) || 0, expense: 0 })}
                    placeholder="0"
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800, textAlign: 'right', color: '#2563eb', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
                    지출 (출금액)
                  </label>
                  <input
                    type="number"
                    value={editForm.expense}
                    onChange={e => setEditForm({ ...editForm, expense: Number(e.target.value) || 0, income: 0 })}
                    placeholder="0"
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800, textAlign: 'right', color: '#ef4444', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* 5. 적요 / 상세내역 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  적요 / 상세내역 *
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="상세 내역을 수기 장부처럼 자유롭게 작성하세요 (예: [거래처명] 10월분 매출수금 입금)"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* 6. 비고 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  비고 (메모)
                </label>
                <input
                  type="text"
                  value={editForm.memo}
                  onChange={e => setEditForm({ ...editForm, memo: e.target.value })}
                  placeholder="추가 참고 사항"
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '8px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {editingTx.isOverridden && (
                  <button
                    type="button"
                    onClick={() => handleResetToOriginal(editingTx.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={13} /> 원본 복원
                  </button>
                )}
                {!editingTx.isNewManual && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOrHide(editingTx)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={13} /> {editingTx.isManual ? '삭제' : '숨기기'}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  장부에 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WindowModal>
  );
};

export default CashBook;
