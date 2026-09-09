import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowLeftRight, Search, Plus, X, Download, Save, Trash2, FileSpreadsheet } from 'lucide-react';
import WindowModal from './WindowModal';
import { matchesInitialSound } from '../utils/koreanUtils';
import { exportToExcel } from '../utils/excelUtils';
import './InventoryTransfer.css';

const InventoryTransfer = ({ 
  onClose, currentUser, warehouses = [], products = [], inventory = {}, onMoveStock,
  onDeleteMoveStock, onUpdateMoveStock, historyData = [], setHistoryData,
  salesOrders = [], salesInvoices = [], onOpenSalesInvoice, onOpenSalesOrder,
  purchaseInvoices = [], onOpenPurchaseInvoice,
  initialDate, staffList = []
}) => {
  // ─── 컬럼 너비 조정 ───
  const [colWidths, setColWidths] = useState({
    select: 40,
    date: 110,
    from: 105,
    to: 105,
    moveType: 85,
    item: 190,
    spec: 95,
    qty: 85,
    processedAt: 90,
    operator: 85,
    memo: 130,
    manage: 85
  });

  const resizingCol = useRef(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);
  const MIN_COL_W = 35;

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

  const formatDateLocal = (d) => {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ─── 검색 및 기간 필터 상태 ───
  const [startDateInput, setStartDateInput] = useState(() => {
    if (initialDate) return formatDateLocal(initialDate);
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDateInput, setEndDateInput] = useState(() => {
    if (initialDate) return formatDateLocal(initialDate);
    return getTodayStr();
  });

  const [startDate, setStartDate] = useState(startDateInput);
  const [endDate, setEndDate] = useState(endDateInput);

  const [historyFromWarehouse, setHistoryFromWarehouse] = useState('전체창고');
  const [historyToWarehouse, setHistoryToWarehouse] = useState('전체창고');
  const [historySearch, setHistorySearch] = useState('');

  const [appliedFromWarehouse, setAppliedFromWarehouse] = useState('전체창고');
  const [appliedToWarehouse, setAppliedToWarehouse] = useState('전체창고');
  const [appliedSearch, setAppliedSearch] = useState('');

  // ─── 상단 등록창 토글 ───
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [transferDate, setTransferDate] = useState(() => {
    if (initialDate) return formatDateLocal(initialDate);
    return getTodayStr();
  });

  useEffect(() => {
    if (initialDate) {
      const dateStr = formatDateLocal(initialDate);
      setStartDateInput(dateStr);
      setEndDateInput(dateStr);
      setStartDate(dateStr);
      setEndDate(dateStr);
      setTransferDate(dateStr);
    }
  }, [initialDate]);

  // ─── 엑셀 직접 수정(인라인 그리드) 상태 관리 ───
  const [modifiedRows, setModifiedRows] = useState({});
  const [newRows, setNewRows] = useState([]);
  const [activeItemSuggestRowId, setActiveItemSuggestRowId] = useState(null);
  const [itemSuggestQuery, setItemSuggestQuery] = useState('');

  const handleSearch = () => {
    setStartDate(startDateInput);
    setEndDate(endDateInput);
    setAppliedFromWarehouse(historyFromWarehouse);
    setAppliedToWarehouse(historyToWarehouse);
    setAppliedSearch(historySearch);
  };

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
      case '당일':
        start = formatDate(today);
        end = formatDate(today);
        break;
      case '1주일':
        const day = today.getDay();
        const sun = new Date(today);
        sun.setDate(today.getDate() - day);
        start = formatDate(sun);
        break;
      case '한달':
        start = `${y}-${String(m).padStart(2, '0')}-01`;
        break;
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
        start = '2000-01-01';
        end = '2099-12-31';
        break;
      default:
        start = `${y}-${String(m).padStart(2, '0')}-01`;
    }

    setStartDateInput(start);
    setEndDateInput(end);
    setStartDate(start);
    setEndDate(end);
    setAppliedFromWarehouse(historyFromWarehouse);
    setAppliedToWarehouse(historyToWarehouse);
    setAppliedSearch(historySearch);
  };

  const [fromWarehouse, setFromWarehouse] = useState(warehouses[0]?.name || '창고');
  const [toWarehouse, setToWarehouse] = useState(() => {
    if (currentUser?.warehouse && currentUser.warehouse !== '-') {
      return currentUser.warehouse;
    }
    const otherWh = warehouses.find(w => w.name !== warehouses[0]?.name);
    return otherWh ? otherWh.name : '통영창고';
  });

  const renderWarehouseOptions = (includeAll = true) => {
    return (
      <>
        {includeAll && <option value="전체창고">전체창고</option>}
        {warehouses.map(w => (
          <option key={w.id} value={w.name}>
            {w.name} {w.manager && !w.name.includes(w.manager) ? `(${w.manager})` : ''}
          </option>
        ))}
      </>
    );
  };

  const getTransferBadge = (row) => {
    if (row.isNew) {
      return { text: '신규등록', bg: '#ecfdf5', color: '#059669' };
    }
    if (row.memo === '상차(자동이동)') {
      return { text: '주문상차', bg: '#e0e7ff', color: '#4f46e5' };
    }
    if (row.to === '매출출고' || row.memo?.startsWith('[매출]') || row.memo?.includes('매출')) {
      return { text: '매출전표', bg: '#dcfce7', color: '#16a34a' };
    }
    if (row.from === '매입입고' || row.memo?.startsWith('[매입]') || row.memo?.includes('매입')) {
      return { text: '매입전표', bg: '#fee2e2', color: '#dc2626' };
    }
    return { text: '창고이동', bg: '#f1f5f9', color: '#475569' };
  };

  const getWarehouseColor = (name) => {
    const wh = warehouses.find(w => w.name === name);
    return wh?.color || '#3b82f6';
  };

  const getProductStockInWarehouse = (productName, whName) => {
    if (!whName || whName === '전체창고') return 0;
    const product = products?.find(p => p.name === productName);
    const initialStock = product ? (Number(product.initialStock) || 0) : 0;
    const delta = (inventory && inventory[whName] && inventory[whName][productName])
      ? Number(inventory[whName][productName])
      : 0;
    return initialStock + delta;
  };

  const findWarehousesWithStock = (productName) => {
    const result = [];
    const product = products?.find(p => p.name === productName);
    const initialStock = product ? (Number(product.initialStock) || 0) : 0;

    for (const wh of warehouses) {
      if (!wh.name || wh.name === '전체창고') continue;
      const delta = (inventory && inventory[wh.name] && inventory[wh.name][productName])
        ? Number(inventory[wh.name][productName])
        : 0;
      const stock = initialStock + delta;
      if (stock > 0) {
        result.push({
          id: wh.id,
          name: wh.name,
          manager: wh.manager || '',
          color: wh.color || '#3b82f6',
          stock
        });
      }
    }
    result.sort((a, b) => b.stock - a.stock);
    return result;
  };

  const [itemSearch, setItemSearch] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [warehousePickerState, setWarehousePickerState] = useState({
    show: false,
    candidates: [],
    product: null
  });
  const searchRef = useRef(null);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const productInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const submitBtnRef = useRef(null);
  const productListRef = useRef(null);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setItemSearch(prod.name);
    setShowSuggestions(false);

    const availableWarehouses = findWarehousesWithStock(prod.name);

    if (availableWarehouses.length === 1) {
      const targetWh = availableWarehouses[0].name;
      setFromWarehouse(targetWh);
      if (toWarehouse === targetWh) {
        const otherWh = warehouses.find(w => w.name !== targetWh && w.name !== '전체창고');
        if (otherWh) setToWarehouse(otherWh.name);
      }
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 10);
    } else if (availableWarehouses.length > 1) {
      setWarehousePickerState({
        show: true,
        candidates: availableWarehouses,
        product: prod
      });
    } else {
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 10);
    }
  };

  const handleChooseWarehouse = (whName) => {
    setFromWarehouse(whName);
    if (toWarehouse === whName) {
      const otherWh = warehouses.find(w => w.name !== whName && w.name !== '전체창고');
      if (otherWh) setToWarehouse(otherWh.name);
    }
    setWarehousePickerState({ show: false, candidates: [], product: null });
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (!e.target.closest('.grid-autocomplete-container')) {
        setActiveItemSuggestRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!itemSearch.trim()) return [];
    return products.filter(p => 
      matchesInitialSound(p.name, itemSearch) || 
      (p.abbreviation && matchesInitialSound(p.abbreviation, itemSearch))
    ).slice(0, 50);
  }, [itemSearch, products]);

  const gridSuggestions = useMemo(() => {
    if (!itemSuggestQuery.trim()) return products.slice(0, 30);
    return products.filter(p => 
      matchesInitialSound(p.name, itemSuggestQuery) || 
      (p.abbreviation && matchesInitialSound(p.abbreviation, itemSuggestQuery))
    ).slice(0, 50);
  }, [itemSuggestQuery, products]);

  useEffect(() => {
    setSelectedIndex(suggestions.length > 0 ? 0 : -1);
  }, [itemSearch, suggestions]);

  useEffect(() => {
    if (selectedIndex !== -1 && productListRef.current) {
      const activeItem = productListRef.current.children[selectedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // ─── 날짜 정규화 및 필터링 ───
  const normalizeDate = (d) => {
    if (!d) return '';
    return String(d).trim().replace(/[./]/g, '-').slice(0, 10);
  };

  const recentHistory = useMemo(() => {
    return historyData.filter(item => {
      if (item.isPhysicalAdjustment || item.isAdjustment || item.adjustmentId) return false;

      const itemDate = normalizeDate(item.date);
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;

      if (appliedFromWarehouse !== '전체창고' && appliedFromWarehouse !== '전체') {
        if (item.from !== appliedFromWarehouse) return false;
      }

      if (appliedToWarehouse !== '전체창고' && appliedToWarehouse !== '전체') {
        if (item.to !== appliedToWarehouse) return false;
      }

      if (appliedSearch.trim()) {
        const q = appliedSearch.trim().toLowerCase();
        const product = products?.find(p => p.name === item.item);
        const matchItem = matchesInitialSound(item.item || '', q) || (item.item || '').toLowerCase().includes(q);
        const matchSpec = (item.spec || '').toLowerCase().includes(q);
        const matchAbbr = product?.abbreviation && (matchesInitialSound(product.abbreviation, q) || product.abbreviation.toLowerCase().includes(q));
        const matchFrom = matchesInitialSound(item.from || '', q) || (item.from || '').toLowerCase().includes(q);
        const matchTo = matchesInitialSound(item.to || '', q) || (item.to || '').toLowerCase().includes(q);
        const matchOperator = matchesInitialSound(item.operator || '', q) || (item.operator || '').toLowerCase().includes(q);
        const matchMemo = matchesInitialSound(item.memo || '', q) || (item.memo || '').toLowerCase().includes(q);
        return matchItem || matchSpec || matchAbbr || matchFrom || matchTo || matchOperator || matchMemo;
      }
      return true;
    });
  }, [historyData, startDate, endDate, appliedFromWarehouse, appliedToWarehouse, appliedSearch, products]);

  const combinedGridRows = useMemo(() => {
    const formattedNewRows = newRows.map(nr => ({
      ...nr,
      isNew: true,
      processedAt: '입력중',
      id: nr.tempId
    }));
    return [...formattedNewRows, ...recentHistory];
  }, [newRows, recentHistory]);

  const deletableHistory = useMemo(() => {
    return recentHistory.filter(h => {
      const badge = getTransferBadge(h);
      return badge.text === '창고이동' || badge.text === '주문상차';
    });
  }, [recentHistory]);

  const isAllSelected = useMemo(() => {
    return deletableHistory.length > 0 && deletableHistory.every(h => selectedHistoryIds.includes(h.id));
  }, [deletableHistory, selectedHistoryIds]);

  const isSomeSelected = useMemo(() => {
    return deletableHistory.length > 0 && 
      deletableHistory.some(h => selectedHistoryIds.includes(h.id)) && 
      !isAllSelected;
  }, [deletableHistory, selectedHistoryIds, isAllSelected]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      const deletableIds = deletableHistory.map(h => h.id);
      setSelectedHistoryIds(prev => prev.filter(id => !deletableIds.includes(id)));
    } else {
      const deletableIds = deletableHistory.map(h => h.id);
      setSelectedHistoryIds(prev => {
        const otherIds = prev.filter(id => !deletableIds.includes(id));
        return [...otherIds, ...deletableIds];
      });
    }
  }, [isAllSelected, deletableHistory]);

  // ─── 엑셀 인라인 셀 편집 ───
  const handleCellChange = (row, field, value) => {
    if (row.isNew) {
      setNewRows(prev => prev.map(nr => {
        if (nr.tempId === row.id) {
          const updated = { ...nr, [field]: value };
          if (field === 'item') {
            const matchedProd = products.find(p => p.name === value);
            if (matchedProd) {
              updated.spec = matchedProd.spec || '';
            }
          }
          return updated;
        }
        return nr;
      }));
    } else {
      setModifiedRows(prev => {
        const currentMod = prev[row.id] || { ...row };
        const updated = { ...currentMod, [field]: value };
        if (field === 'item') {
          const matchedProd = products.find(p => p.name === value);
          if (matchedProd) {
            updated.spec = matchedProd.spec || '';
          }
        }
        return {
          ...prev,
          [row.id]: updated
        };
      });
    }
  };

  const handleAddNewRow = () => {
    const defaultFrom = warehouses[0]?.name || '통영창고';
    const otherWh = warehouses.find(w => w.name !== defaultFrom);
    const defaultTo = currentUser?.warehouse && currentUser.warehouse !== '-' 
      ? currentUser.warehouse 
      : (otherWh?.name || '본사창고');

    const newRow = {
      tempId: `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: getTodayStr(),
      from: defaultFrom,
      to: defaultTo,
      item: '',
      spec: '',
      qty: 1,
      operator: currentUser?.name || '관리자',
      memo: '수동이동'
    };
    setNewRows(prev => [newRow, ...prev]);
  };

  const handleSaveSingleRow = async (row) => {
    const targetData = row.isNew 
      ? newRows.find(nr => nr.tempId === row.id)
      : (modifiedRows[row.id] || row);

    if (!targetData) return;

    if (!targetData.item?.trim()) {
      alert('품목명을 입력해주세요.');
      return;
    }
    if (targetData.from === targetData.to) {
      alert('출고창고와 입고창고가 같을 수 없습니다.');
      return;
    }
    if (Number(targetData.qty) <= 0) {
      alert('이동 수량을 1개 이상 입력해주세요.');
      return;
    }

    try {
      if (row.isNew) {
        await onMoveStock(
          targetData.from,
          targetData.to,
          targetData.item.trim(),
          Number(targetData.qty),
          false,
          targetData.date
        );
        setNewRows(prev => prev.filter(nr => nr.tempId !== row.id));
        alert('신규 재고이동이 등록되었습니다.');
      } else {
        if (onUpdateMoveStock) {
          await onUpdateMoveStock(row.id, {
            ...targetData,
            qty: Number(targetData.qty)
          });
        } else {
          await onDeleteMoveStock(row.id);
          await onMoveStock(
            targetData.from,
            targetData.to,
            targetData.item.trim(),
            Number(targetData.qty),
            false,
            targetData.date
          );
        }
        setModifiedRows(prev => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });
        alert('재고이동 내역이 성공적으로 수정되었습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelRowEdit = (row) => {
    if (row.isNew) {
      setNewRows(prev => prev.filter(nr => nr.tempId !== row.id));
    } else {
      setModifiedRows(prev => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    }
  };

  const totalModifiedCount = Object.keys(modifiedRows).length + newRows.length;

  const handleBatchSave = async () => {
    if (totalModifiedCount === 0) {
      alert('저장할 변경사항이 없습니다.');
      return;
    }

    for (const nr of newRows) {
      if (!nr.item?.trim()) {
        alert(`신규 추가 행의 품목명을 입력해주세요.`);
        return;
      }
      if (nr.from === nr.to) {
        alert(`신규 추가 행 [${nr.item}]의 출고창고와 입고창고가 같습니다.`);
        return;
      }
      if (Number(nr.qty) <= 0) {
        alert(`신규 추가 행 [${nr.item}]의 수량을 1개 이상 입력해주세요.`);
        return;
      }
    }

    for (const id of Object.keys(modifiedRows)) {
      const mr = modifiedRows[id];
      if (!mr.item?.trim()) {
        alert(`수정 행의 품목명을 입력해주세요.`);
        return;
      }
      if (mr.from === mr.to) {
        alert(`수정 행 [${mr.item}]의 출고창고와 입고창고가 같습니다.`);
        return;
      }
      if (Number(mr.qty) <= 0) {
        alert(`수정 행 [${mr.item}]의 수량을 1개 이상 입력해주세요.`);
        return;
      }
    }

    try {
      for (const nr of newRows) {
        await onMoveStock(nr.from, nr.to, nr.item.trim(), Number(nr.qty), false, nr.date);
      }
      for (const id of Object.keys(modifiedRows)) {
        const mr = modifiedRows[id];
        if (onUpdateMoveStock) {
          await onUpdateMoveStock(id, { ...mr, qty: Number(mr.qty) });
        } else {
          await onDeleteMoveStock(id);
          await onMoveStock(mr.from, mr.to, mr.item.trim(), Number(mr.qty), false, mr.date);
        }
      }

      setNewRows([]);
      setModifiedRows({});
      alert(`${totalModifiedCount}건의 변경사항이 일괄 저장되었습니다.`);
    } catch (err) {
      console.error(err);
      alert('일괄 저장 중 오류가 발생했습니다.');
    }
  };

  const handleExcelExport = () => {
    if (recentHistory.length === 0) {
      alert('내보낼 이동 내역이 없습니다.');
      return;
    }
    const exportData = recentHistory.map(row => ({
      '이동일자': row.date || '',
      '출고창고': row.from || '',
      '입고창고': row.to || '',
      '구분': getTransferBadge(row).text,
      '품목명': row.item || '',
      '규격': row.spec || '',
      '수량': Number(row.qty) || 0,
      '처리시간': row.processedAt || '',
      '담당자': row.operator || '',
      '비고': row.memo || ''
    }));
    exportToExcel(exportData, `재고이동내역_${startDate}_${endDate}`, '재고이동내역');
  };

  const handleTransfer = () => {
    if (fromWarehouse === '전체창고' || toWarehouse === '전체창고') {
      alert('출고창고와 입고창고는 "전체창고" 이외의 실제 창고를 지정해야 이동할 수 있습니다.');
      productInputRef.current?.focus();
      return;
    }

    if (!selectedProduct || quantity <= 0) {
      alert('품목과 수량을 정확히 입력해주세요.');
      productInputRef.current?.focus();
      return;
    }
    
    if (fromWarehouse === toWarehouse) {
      alert('출고창고와 입고창고가 같습니다.');
      productInputRef.current?.focus();
      return;
    }

    const prodObj = products.find(p => p.name === selectedProduct.name);
    const initialStock = prodObj?.initialStock || 0;
    const available = initialStock + ((inventory[fromWarehouse]?.[selectedProduct.name]) || 0);
    if (available < quantity) {
      if (!window.confirm(`선택한 창고의 재고(${available}개)가 부족합니다. 그래도 이동하시겠습니까?`)) {
        productInputRef.current?.focus();
        return;
      }
    }

    onMoveStock(fromWarehouse, toWarehouse, selectedProduct.name, parseInt(quantity, 10), false, transferDate);
    
    setItemSearch('');
    setSelectedProduct(null);
    setQuantity(0);
    setTimeout(() => {
      productInputRef.current?.focus();
    }, 10);
  };

  const handleRowClickOrDoubleClick = (row) => {
    const badge = getTransferBadge(row);
    
    if (badge.text === '매출전표') {
      const foundInvoice = salesInvoices.find(inv => 
        inv.date === row.date && 
        inv.items?.some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
      );
      if (foundInvoice) {
        onOpenSalesInvoice(foundInvoice);
        onClose();
      } else {
        alert('매칭되는 매출전표를 찾을 수 없습니다.');
      }
    } else if (badge.text === '매입전표') {
      const foundInvoice = purchaseInvoices.find(inv => 
        inv.date === row.date && 
        inv.items?.some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
      );
      if (foundInvoice) {
        if (onOpenPurchaseInvoice) {
          onOpenPurchaseInvoice(foundInvoice);
          onClose();
        }
      } else {
        alert('매칭되는 매입전표를 찾을 수 없습니다.');
      }
    } else if (badge.text === '주문상차') {
      const parseOrderItems = (text) => {
        if (!text) return [];
        const tokens = text.trim().split(/[\s\n]+/);
        return tokens.map(token => {
          const match = token.match(/^(.+?)(\d+)$/);
          if (match) {
            return { name: match[1], qty: parseInt(match[2], 10) };
          }
          return { name: token, qty: 0 };
        });
      };
      
      const foundOrder = salesOrders.find(order => 
        order.date === row.date && 
        parseOrderItems(order.itemsText).some(item => item.name === row.item && Number(item.qty) === Number(row.qty))
      );
      if (foundOrder) {
        onOpenSalesOrder(foundOrder);
        onClose();
      } else {
        alert('매칭되는 주문서를 찾을 수 없습니다.');
      }
    }
  };

  const totalQuantity = recentHistory.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  return (
    <WindowModal title="재고이동 관리 (엑셀형 수정)" onClose={onClose} width="96%">
      <div className="inv-wrapper" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* 상단 필터 바 */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>이력조회:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <input 
                  type="date" 
                  value={startDateInput} 
                  onChange={e => setStartDateInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }} 
                />
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>~</span>
                <input 
                  type="date" 
                  value={endDateInput} 
                  onChange={e => setEndDateInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '2px' }}>
                {['당일', '1주일', '한달', '1년', '전체'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleQuickDate(btn)}
                    style={{
                      padding: '3px 6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >{btn}</button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>출고:</span>
                <select
                  value={historyFromWarehouse}
                  onChange={e => {
                    setHistoryFromWarehouse(e.target.value);
                    setAppliedFromWarehouse(e.target.value);
                  }}
                  style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#fff', outline: 'none' }}
                >
                  {renderWarehouseOptions(true)}
                </select>

                <span style={{ color: '#64748b', fontWeight: 700 }}>입고:</span>
                <select
                  value={historyToWarehouse}
                  onChange={e => {
                    setHistoryToWarehouse(e.target.value);
                    setAppliedToWarehouse(e.target.value);
                  }}
                  style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#fff', outline: 'none' }}
                >
                  {renderWarehouseOptions(true)}
                </select>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder="품목/창고/담당자"
                  style={{
                    paddingLeft: '24px', paddingRight: '6px',
                    height: '28px', border: '1px solid #cbd5e1',
                    borderRadius: '6px', fontSize: '0.78rem',
                    outline: 'none', width: '130px',
                    background: '#fff'
                  }}
                />
              </div>

              <button 
                type="button"
                onClick={handleSearch}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Search size={13} /> 검색
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsRegisterOpen(prev => !prev)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: isRegisterOpen ? '1px solid #ef4444' : '1px solid #3b82f6',
                background: isRegisterOpen ? '#fef2f2' : '#eff6ff',
                color: isRegisterOpen ? '#dc2626' : '#2563eb',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isRegisterOpen ? <X size={13} /> : <Plus size={13} />}
              {isRegisterOpen ? '등록창 닫기' : '신규 이동 폼'}
            </button>
          </div>
        </div>

        {/* 신규 등록 폼 (토글) */}
        {isRegisterOpen && (
          <div className="inv-form-box" style={{ background: '#fff', border: '1.5px solid #3b82f6', padding: '12px 14px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div className="inv-col">
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>출고</label>
                <select 
                  className="inv-select" 
                  value={fromWarehouse} 
                  onChange={e => setFromWarehouse(e.target.value)} 
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.8rem', color: '#1e293b' }}
                >
                  {renderWarehouseOptions(false)}
                </select>
              </div>
              <div className="inv-col">
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>입고</label>
                <select 
                  className="inv-select" 
                  value={toWarehouse} 
                  onChange={e => setToWarehouse(e.target.value)} 
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.8rem', color: '#1e293b' }}
                >
                  {renderWarehouseOptions(false)}
                </select>
              </div>
              <div className="inv-col">
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>일자</label>
                <input 
                  type="date" 
                  className="inv-input" 
                  value={transferDate} 
                  onChange={e => setTransferDate(e.target.value)} 
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '8px', alignItems: 'end' }} ref={searchRef}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>품목 검색</label>
                <input 
                  ref={productInputRef}
                  type="text" 
                  className="inv-input" 
                  placeholder="품목명/초성" 
                  value={itemSearch}
                  onChange={e => {
                    setItemSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', height: '34px', outline: 'none', fontSize: '0.8rem' }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto'
                  }}>
                    {suggestions.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectProduct(p);
                        }}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem' }}
                      >
                        <b>{p.name}</b> {p.spec && <span style={{ color: '#94a3b8' }}>({p.spec})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '2px' }}>수량</label>
                <input 
                  ref={qtyInputRef}
                  type="number" 
                  className="inv-input" 
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', height: '34px', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem' }}
                />
              </div>

              <button 
                ref={submitBtnRef}
                onClick={handleTransfer}
                style={{ height: '34px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
              >
                이동 실행
              </button>
            </div>
          </div>
        )}

        {/* 엑셀 스타일 그리드 */}
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* 그리드 툴바 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileSpreadsheet size={15} color="#059669" />
                이동내역 ({recentHistory.length}건, {totalQuantity.toLocaleString()}개)
              </span>
              {totalModifiedCount > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px' }}>
                  {totalModifiedCount}건 미저장
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handleAddNewRow}
                style={{ padding: '4px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <Plus size={12} /> 행추가
              </button>

              {totalModifiedCount > 0 && (
                <button
                  type="button"
                  onClick={handleBatchSave}
                  style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <Save size={12} /> 저장 ({totalModifiedCount})
                </button>
              )}

              <button
                type="button"
                onClick={handleExcelExport}
                style={{ padding: '4px 8px', background: '#fff', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <Download size={12} /> 엑셀
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div style={{ maxHeight: isRegisterOpen ? '320px' : '480px', overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                  {[
                    { key: 'select', label: '', width: colWidths.select, align: 'center' },
                    { key: 'date', label: '일자', width: colWidths.date, align: 'center' },
                    { key: 'from', label: '출고', width: colWidths.from, align: 'center' },
                    { key: 'to', label: '입고', width: colWidths.to, align: 'center' },
                    { key: 'moveType', label: '구분', width: colWidths.moveType, align: 'center' },
                    { key: 'item', label: '품목명', width: colWidths.item, align: 'left' },
                    { key: 'spec', label: '규격', width: colWidths.spec, align: 'left' },
                    { key: 'qty', label: '수량', width: colWidths.qty, align: 'right' },
                    { key: 'processedAt', label: '시간', width: colWidths.processedAt, align: 'center' },
                    { key: 'operator', label: '담당자', width: colWidths.operator, align: 'center' },
                    { key: 'memo', label: '비고', width: colWidths.memo, align: 'left' },
                    { key: 'manage', label: '관리', width: colWidths.manage, align: 'center' }
                  ].map(col => (
                    <th key={col.key} style={{ width: col.width + 'px', padding: '6px 4px', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', fontWeight: 800, color: '#334155', textAlign: col.align }}>
                      {col.key === 'select' ? (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                          onChange={handleSelectAll}
                          disabled={deletableHistory.length === 0}
                        />
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {combinedGridRows.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8' }}>
                      해당 조건 및 기간에 발생한 이동 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  combinedGridRows.map((row, rIdx) => {
                    const badge = getTransferBadge(row);
                    const isNew = !!row.isNew;
                    const isModified = !!modifiedRows[row.id];
                    const isEditableType = isNew || badge.text === '창고이동' || badge.text === '주문상차';
                    
                    const rowData = isNew 
                      ? (newRows.find(nr => nr.tempId === row.id) || row)
                      : (modifiedRows[row.id] || row);

                    const isSuggestOpen = activeItemSuggestRowId === row.id;

                    const rowBg = isNew ? '#f0fdf4' : isModified ? '#fffbeb' : (rIdx % 2 === 1 ? '#f8fafc' : '#ffffff');

                    return (
                      <tr key={row.id} style={{ backgroundColor: rowBg, borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {!isNew ? (
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.includes(row.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedHistoryIds(prev => [...prev, row.id]);
                                else setSelectedHistoryIds(prev => prev.filter(id => id !== row.id));
                              }}
                              disabled={!isEditableType}
                            />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>NEW</span>
                          )}
                        </td>

                        {/* 일자 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <input
                              type="date"
                              value={rowData.date || ''}
                              onChange={e => handleCellChange(row, 'date', e.target.value)}
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.76rem', padding: '2px', outline: 'none', textAlign: 'center', fontWeight: 600 }}
                            />
                          ) : (
                            <div style={{ textAlign: 'center', fontSize: '0.76rem', fontWeight: 600 }}>{rowData.date}</div>
                          )}
                        </td>

                        {/* 출고 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <select
                              value={rowData.from || ''}
                              onChange={e => handleCellChange(row, 'from', e.target.value)}
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.76rem', padding: '2px', outline: 'none', fontWeight: 700, color: getWarehouseColor(rowData.from) }}
                            >
                              {renderWarehouseOptions(false)}
                            </select>
                          ) : (
                            <div style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 700, color: getWarehouseColor(rowData.from) }}>{rowData.from}</div>
                          )}
                        </td>

                        {/* 입고 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <select
                              value={rowData.to || ''}
                              onChange={e => handleCellChange(row, 'to', e.target.value)}
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.76rem', padding: '2px', outline: 'none', fontWeight: 700, color: getWarehouseColor(rowData.to) }}
                            >
                              {renderWarehouseOptions(false)}
                            </select>
                          ) : (
                            <div style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 700, color: getWarehouseColor(rowData.to) }}>{rowData.to}</div>
                          )}
                        </td>

                        {/* 구분 */}
                        <td style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: badge.bg, color: badge.color }}>
                            {badge.text}
                          </span>
                        </td>

                        {/* 품목명 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0', position: 'relative' }} className="grid-autocomplete-container">
                          {isEditableType ? (
                            <div>
                              <input
                                type="text"
                                value={rowData.item || ''}
                                placeholder="품목명"
                                onChange={e => {
                                  handleCellChange(row, 'item', e.target.value);
                                  setItemSuggestQuery(e.target.value);
                                  setActiveItemSuggestRowId(row.id);
                                }}
                                onFocus={() => {
                                  setItemSuggestQuery(rowData.item || '');
                                  setActiveItemSuggestRowId(row.id);
                                }}
                                style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.78rem', padding: '2px 4px', outline: 'none', fontWeight: 700 }}
                              />
                              {isSuggestOpen && gridSuggestions.length > 0 && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, zIndex: 1000,
                                  width: '240px', maxHeight: '180px', overflowY: 'auto',
                                  backgroundColor: '#fff', border: '1px solid #3b82f6',
                                  borderRadius: '6px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                                }}>
                                  {gridSuggestions.map(p => (
                                    <div
                                      key={p.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleCellChange(row, 'item', p.name);
                                        setActiveItemSuggestRowId(null);
                                      }}
                                      style={{ padding: '5px 8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.74rem' }}
                                    >
                                      <b>{p.name}</b> {p.spec && <span style={{ color: '#94a3b8' }}>({p.spec})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleRowClickOrDoubleClick(row)}
                              style={{ fontWeight: 700, cursor: 'pointer', color: '#2563eb', textDecoration: 'underline', padding: '2px' }}
                            >
                              {rowData.item}
                            </div>
                          )}
                        </td>

                        {/* 규격 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <input
                              type="text"
                              value={rowData.spec || ''}
                              onChange={e => handleCellChange(row, 'spec', e.target.value)}
                              placeholder="규격"
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.74rem', padding: '2px', outline: 'none', color: '#64748b' }}
                            />
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', padding: '2px' }}>{rowData.spec || '-'}</div>
                          )}
                        </td>

                        {/* 수량 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <input
                              type="number"
                              value={rowData.qty}
                              onChange={e => handleCellChange(row, 'qty', e.target.value)}
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.84rem', padding: '2px', outline: 'none', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}
                            />
                          ) : (
                            <div style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb', padding: '2px' }}>
                              {Number(rowData.qty || 0).toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* 처리시간 */}
                        <td style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b' }}>
                          {rowData.processedAt || '-'}
                        </td>

                        {/* 담당자 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <input
                              type="text"
                              value={rowData.operator || ''}
                              onChange={e => handleCellChange(row, 'operator', e.target.value)}
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.74rem', padding: '2px', outline: 'none', textAlign: 'center', fontWeight: 600 }}
                            />
                          ) : (
                            <div style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 600 }}>{rowData.operator || '-'}</div>
                          )}
                        </td>

                        {/* 비고 */}
                        <td style={{ padding: '2px', borderRight: '1px solid #e2e8f0' }}>
                          {isEditableType ? (
                            <input
                              type="text"
                              value={rowData.memo || ''}
                              onChange={e => handleCellChange(row, 'memo', e.target.value)}
                              placeholder="비고"
                              style={{ width: '100%', border: '1px solid transparent', background: 'transparent', fontSize: '0.74rem', padding: '2px', outline: 'none', color: '#475569' }}
                            />
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', padding: '2px' }}>{rowData.memo || '-'}</div>
                          )}
                        </td>

                        {/* 관리 */}
                        <td style={{ textAlign: 'center', padding: '2px' }}>
                          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', alignItems: 'center' }}>
                            {isNew || isModified ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleRow(row)}
                                  style={{ padding: '2px 5px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelRowEdit(row)}
                                  style={{ padding: '2px 5px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                                >
                                  취소
                                </button>
                              </>
                            ) : isEditableType ? (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('이 이동 내역을 삭제하시겠습니까?')) {
                                    if (onDeleteMoveStock) await onDeleteMoveStock(row.id);
                                    else setHistoryData(historyData.filter(h => h.id !== row.id));
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 창고 선택 모달 */}
      {warehousePickerState.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }} onClick={() => setWarehousePickerState({ show: false, candidates: [], product: null })}>
          <div 
            style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', maxWidth: '400px', width: '90%' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800 }}>출고 창고 선택</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {warehousePickerState.candidates.map(wh => (
                <button
                  key={wh.name}
                  type="button"
                  onClick={() => handleChooseWarehouse(wh.name)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}
                >
                  <b>{wh.name}</b>
                  <span style={{ color: '#059669', fontWeight: 700 }}>{wh.stock.toLocaleString()}개</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setWarehousePickerState({ show: false, candidates: [], product: null })}
              style={{ marginTop: '12px', width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', fontWeight: 700 }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </WindowModal>
  );
};

export default InventoryTransfer;
