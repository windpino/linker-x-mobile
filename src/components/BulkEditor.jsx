import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Save, Plus, Trash2, X, AlertCircle, Settings, Search, Undo2, Redo2, Edit3 } from 'lucide-react';
import WindowModal from './WindowModal';
import './BulkEditor.css';

const PARTNER_COLUMNS = [
  { field: 'type', header: '구분', type: 'string', width: 80, align: 'center' },
  { field: 'name', header: '상호명', type: 'string', width: 150, align: 'center' },
  { field: 'abbreviation', header: '약칭', type: 'string', width: 100, align: 'center' },
  { field: 'barcode', header: '바코드', type: 'string', width: 120, align: 'center' },
  { field: 'ceo', header: '대표자', type: 'string', width: 100, align: 'center' },
  { field: 'businessNo', header: '사업자번호', type: 'string', width: 120, align: 'center' },
  { field: 'address', header: '주소', type: 'string', width: 250, align: 'center' },
  { field: 'phone', header: '일반전화', type: 'string', width: 120, align: 'center' },
  { field: 'mobile', header: '휴대전화', type: 'string', width: 120, align: 'center' },
  { field: 'fax', header: '팩스', type: 'string', width: 120, align: 'center' },
  { field: 'email', header: '이메일', type: 'string', width: 150, align: 'center' },
  { field: 'manager', header: '담당자', type: 'string', width: 100, align: 'center' },
  { field: 'warehouse', header: '담당창고', type: 'string', width: 100, align: 'center' },
  { field: 'bankAccount', header: '은행/계좌', type: 'string', width: 150, align: 'center' },
  { field: 'creditLimit', header: '여신한도', type: 'number', width: 100, align: 'right' },
  { field: 'receivables', header: '누적 미수금', type: 'number', width: 100, align: 'right' },
  { field: 'receivableBase', header: '기초미수', type: 'number', width: 100, align: 'right' },
  { field: 'grade', header: '등급', type: 'string', width: 80, align: 'center' },
  { field: 'loginId', header: '아이디', type: 'string', width: 100, align: 'center' },
  { field: 'password', header: '비밀번호', type: 'string', width: 100, align: 'center' },
  { field: 'hideOrderInfo', header: '주문정보숨김', type: 'boolean', width: 100, align: 'center' },
  { field: 'memo', header: '메모', type: 'string', width: 200, align: 'center' },
];

const PRODUCT_COLUMNS = [
  { field: 'code', header: '품목코드', type: 'string', width: 100, align: 'center' },
  { field: 'name', header: '품목명', type: 'string', width: 200, align: 'center' },
  { field: 'abbreviation', header: '약칭', type: 'string', width: 100, align: 'center' },
  { field: 'manufacturer', header: '제조사', type: 'string', width: 120, align: 'center' },
  { field: 'categoryLarge', header: '대분류', type: 'string', width: 100, align: 'center' },
  { field: 'categoryMedium', header: '중분류', type: 'string', width: 100, align: 'center' },
  { field: 'categorySmall', header: '소분류', type: 'string', width: 100, align: 'center' },
  { field: 'spec', header: '규격', type: 'string', width: 100, align: 'center' },
  { field: 'unit', header: '단위', type: 'string', width: 80, align: 'center' },
  { field: 'innerQty', header: '내품수량', type: 'number', width: 80, align: 'center' },
  { field: 'warehouse', header: '지정창고', type: 'string', width: 120, align: 'center' },
  { field: 'showInMall', header: '몰노출', type: 'boolean', width: 80, align: 'center' },
  { field: 'taxType', header: '과세구분', type: 'string', width: 90, align: 'center' },
  { field: 'purchasePrice', header: '매입가', type: 'number', width: 120, align: 'right' },
  { field: 'salesPriceSingle', header: '매출가(낱개)', type: 'number', width: 120, align: 'right' },
  { field: 'salesPriceBox', header: '매출가(박스)', type: 'number', width: 120, align: 'right' },
  { field: 'stock', header: '현재고', type: 'number', width: 100, align: 'center' },
  { field: 'initialStock', header: '기초재고', type: 'number', width: 100, align: 'center' },
  { field: 'optimalStock', header: '적정재고', type: 'number', width: 100, align: 'center' },
  { field: 'safeStock', header: '안전재고', type: 'number', width: 100, align: 'center' },
  { field: 'singleBarcode', header: '낱개바코드', type: 'string', width: 150, align: 'center' },
  { field: 'boxBarcode', header: '박스바코드', type: 'string', width: 150, align: 'center' },
  { field: 'memo', header: '상품설명', type: 'string', width: 200, align: 'center' },
];

const getColumnAlign = (col) => {
  if (col.align) return col.align;
  const isAmount = ['purchasePrice', 'salesPriceSingle', 'salesPriceBox', 'creditLimit', 'receivables', 'receivableBase'].includes(col.field);
  return isAmount ? 'right' : 'center';
};

const QWERTY_TO_HANGUL = {
  'q': 'ㅂ', 'Q': 'ㅃ', 'w': 'ㅈ', 'W': 'ㅉ', 'e': 'ㄷ', 'E': 'ㄸ',
  'r': 'ㄱ', 'R': 'ㄲ', 't': 'ㅅ', 'T': 'ㅆ', 'y': 'ㅛ', 'Y': 'ㅛ',
  'u': 'ㅕ', 'U': 'ㅕ', 'i': 'ㅑ', 'I': 'ㅑ', 'o': 'ㅐ', 'O': 'ㅒ',
  'p': 'ㅔ', 'P': 'ㅖ', 'a': 'ㅁ', 'A': 'ㅁ', 's': 'ㄴ', 'S': 'ㄴ',
  'd': 'ㅇ', 'D': 'ㅇ', 'f': 'ㄹ', 'F': 'ㄹ', 'g': 'ㅎ', 'G': 'ㅎ',
  'h': 'ㅗ', 'H': 'ㅗ', 'j': 'ㅓ', 'J': 'ㅓ', 'k': 'ㅏ', 'K': 'ㅏ',
  'l': 'ㅣ', 'L': 'ㅣ', 'z': 'ㅋ', 'Z': 'ㅋ', 'x': 'ㅌ', 'X': 'ㅌ',
  'c': 'ㅊ', 'C': 'ㅊ', 'v': 'ㅍ', 'V': 'ㅍ', 'b': 'ㅠ', 'B': 'ㅠ',
  'n': 'ㅜ', 'N': 'ㅜ', 'm': 'ㅡ', 'M': 'ㅡ'
};

const parseBooleanValue = (val, defaultVal = true) => {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const s = String(val).trim().toLowerCase();
  if (['1', 'true', 'y', 'yes', 'o', '노출', '1 (노출)', '노출 (1)', '1: 노출', '1:노출'].includes(s)) return true;
  if (['0', 'false', 'n', 'no', 'x', '비노출', '0 (비노출)', '비노출 (0)', '0: 비노출', '0:비노출'].includes(s)) return false;
  return Boolean(val);
};

const CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const COMPLEX_VOWELS = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ'
};

const COMPLEX_JONGS = {
  'ㄱㅅ': 'ㄳ',
  'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ'
};

const DECOMPOSE_JONGS = {
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ']
};

const makeSyllable = (cho, jung, jong) => {
  const choIdx = CHO_LIST.indexOf(cho);
  const jungIdx = JUNG_LIST.indexOf(jung);
  const jongIdx = JONG_LIST.indexOf(jong || '');
  
  if (choIdx !== -1 && jungIdx !== -1 && jongIdx !== -1) {
    return String.fromCharCode(44032 + (choIdx * 588) + (jungIdx * 28) + jongIdx);
  }
  return cho + jung + (jong || '');
};

const decomposeHangul = (str) => {
  let jamos = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 44032 && code <= 55203) {
      const offset = code - 44032;
      const choIdx = Math.floor(offset / 588);
      const jungIdx = Math.floor((offset % 588) / 28);
      const jongIdx = offset % 28;
      
      jamos.push(CHO_LIST[choIdx]);
      jamos.push(JUNG_LIST[jungIdx]);
      
      if (jongIdx > 0) {
        const jong = JONG_LIST[jongIdx];
        if (DECOMPOSE_JONGS[jong]) {
          jamos.push(...DECOMPOSE_JONGS[jong]);
        } else {
          jamos.push(jong);
        }
      }
    } else {
      jamos.push(str[i]);
    }
  }
  return jamos;
};

const assembleJamos = (jamos) => {
  let result = '';
  let i = 0;
  
  while (i < jamos.length) {
    const char = jamos[i];
    
    if (CHO_LIST.indexOf(char) === -1) {
      result += char;
      i++;
      continue;
    }
    
    let cho = char;
    i++;
    
    if (i >= jamos.length) {
      result += cho;
      break;
    }
    
    let nextChar = jamos[i];
    if (JUNG_LIST.indexOf(nextChar) === -1) {
      result += cho;
      continue;
    }
    
    let jung = nextChar;
    i++;
    
    if (i < jamos.length) {
      const combinedVowel = COMPLEX_VOWELS[jung + jamos[i]];
      if (combinedVowel) {
        jung = combinedVowel;
        i++;
      }
    }
    
    if (i >= jamos.length) {
      result += makeSyllable(cho, jung, '');
      break;
    }
    
    let jongCandidate = jamos[i];
    if (JONG_LIST.indexOf(jongCandidate) === -1) {
      result += makeSyllable(cho, jung, '');
      continue;
    }
    
    let hasVowelFollowing = false;
    if (i + 1 < jamos.length && JUNG_LIST.indexOf(jamos[i + 1]) !== -1) {
      hasVowelFollowing = true;
    }
    
    if (hasVowelFollowing) {
      result += makeSyllable(cho, jung, '');
      continue;
    }
    
    let jong = jongCandidate;
    i++;
    
    if (i < jamos.length) {
      const secondJongCandidate = jamos[i];
      if (JONG_LIST.indexOf(secondJongCandidate) !== -1) {
        const combinedJong = COMPLEX_JONGS[jong + secondJongCandidate];
        
        let hasVowelFollowingSecond = false;
        if (i + 1 < jamos.length && JUNG_LIST.indexOf(jamos[i + 1]) !== -1) {
          hasVowelFollowingSecond = true;
        }
        
        if (hasVowelFollowingSecond) {
          result += makeSyllable(cho, jung, jong);
          continue;
        } else if (combinedJong) {
          jong = combinedJong;
          i++;
        } else {
          result += makeSyllable(cho, jung, jong);
          continue;
        }
      }
    }
    
    result += makeSyllable(cho, jung, jong);
  }
  
  return result;
};

const combineInitialAndVowel = (val) => {
  const jamos = decomposeHangul(val);
  return assembleJamos(jamos);
};

const getChosung = (str) => {
  if (!str) return '';
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 44032 && code <= 55203) {
      const choIdx = Math.floor((code - 44032) / 588);
      res += CHO_LIST[choIdx];
    } else {
      res += str[i];
    }
  }
  return res;
};

const isChosungOnly = (str) => {
  if (!str) return false;
  return str.split('').every(ch => CHO_LIST.includes(ch) || ch === ' ' || !isNaN(Number(ch)));
};

const EditableInput = ({ initialValue, onSave, onCancel, type, style, lang, inputMode, isDirectInput, pendingChar, onPaste, list, onToggleKoreanMode, cursorAtEnd }) => {
  const inputRef = React.useRef(null);
  const isComposing = React.useRef(false);

  // Synchronous focus & selection range setup via ref callback
  const setInputRef = React.useCallback((node) => {
    if (node) {
      inputRef.current = node;
      // Focus synchronously immediately during mount commit phase
      node.focus();
      if (isDirectInput || cursorAtEnd) {
        const len = node.value.length;
        node.setSelectionRange(len, len);
      } else {
        node.select();
      }
    }
  }, [isDirectInput, cursorAtEnd]);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (!isDirectInput && !cursorAtEnd) {
        inputRef.current.select();
      } else {
        // Position cursor at the end when starting directly or via F2
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
        
        // Asynchronous focus double-insurance
        setTimeout(() => {
          if (inputRef.current) {
            const l = inputRef.current.value.length;
            inputRef.current.setSelectionRange(l, l);
          }
        }, 10);
      }
    }
  }, [isDirectInput, cursorAtEnd]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'HangulMode' || e.code === 'Lang1' || e.code === 'Lang2' || e.key === 'Hanja' || e.code === 'Hanja') {
      if (onToggleKoreanMode) onToggleKoreanMode();
      return;
    }
    if (e.key === 'Enter') {
      if (isComposing.current) return;
      onSave(inputRef.current.value);
      return;
    } else if (e.key === 'Escape') {
      onCancel();
      return;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (isComposing.current) return;
      onSave(inputRef.current.value, e.shiftKey ? 'ShiftTab' : 'Tab');
      return;
    }
  };

  const handleInput = (e) => {
    const input = e.target;
    const val = input.value;
    
    const combined = combineInitialAndVowel(val);
    if (combined !== val) {
      // Fix for Chrome/Edge native IME corruption:
      // Modifying input.value during an active composition fundamentally corrupts the native buffer.
      // To reset the buffer cleanly, we synchronously blur and focus the input.
      // CRUCIAL: We MUST update the value and set the selection range BEFORE blurring.
      // This ensures that when focus() is called, the browser restores a collapsed cursor,
      // rather than selecting the entire text which would cause the next keystroke to overwrite it.
      const diff = val.length - combined.length;
      const newCursorPos = Math.max(0, input.selectionStart - diff);
      
      input.value = combined;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.blur();
      input.focus();
    }
  };

  return (
    <input
      ref={setInputRef}
      lang={lang}
      type="text"
      list={list}
      inputMode={inputMode}
      defaultValue={isDirectInput ? (pendingChar || '') : initialValue}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={(e) => { 
        isComposing.current = false; 
        const input = e.currentTarget;
        const combined = combineInitialAndVowel(input.value);
        if (combined !== input.value) {
          const start = input.selectionStart;
          input.value = combined;
          input.setSelectionRange(start, start);
          // Dispatch input event for any parent listeners
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
      }}
      onInput={handleInput}
      onFocus={(e) => {
        if (isDirectInput) {
          const len = e.currentTarget.value.length;
          e.currentTarget.setSelectionRange(len, len);
        }
      }}
      onBlur={() => {
        setTimeout(() => {
          if (isComposing.current) return;
          // Prevent saving if the input was immediately re-focused (e.g., during the synchronous IME reset cycle)
          if (inputRef.current && document.activeElement === inputRef.current) return;
          if (inputRef.current) onSave(inputRef.current.value);
        }, 100);
      }}
      onKeyDown={handleKeyDown}
      onPaste={(e) => {
        if (onPaste) {
          const text = e.clipboardData.getData('text');
          if (text.includes('\t') || text.includes('\n') || text.includes('\r')) {
            e.preventDefault();
            onPaste(e);
          }
        }
      }}
      style={style}
    />
  );
};

const BulkEditor = ({ 
  type, 
  data: initialDataProp, 
  title: titleProp, 
  initialData: oldInitialData, 
  columns: columnsProp, 
  onSave, 
  onClose, 
  categories = [], 
  staffList = [], 
  warehouses = [],
  disableRowAddDelete = false 
}) => {
  const isPartner = type === 'partner';
  const isProduct = type === 'product';
  const isWarehouseStock = type === 'warehouse_initial_stock';
  const isProductOrWarehouseStock = isProduct || isWarehouseStock;
  const canAddDeleteRows = !isWarehouseStock && !disableRowAddDelete;
  const title = titleProp || (
    isPartner ? '거래처 일괄 편집' : 
    isProduct ? '품목 일괄 편집' : 
    isWarehouseStock ? '창고별 기초재고 일괄설정' : 
    '일괄 편집'
  );
  const columns = columnsProp || (isPartner ? PARTNER_COLUMNS : isProduct ? PRODUCT_COLUMNS : []);
  const initialData = initialDataProp || oldInitialData || [];

  const [data, setData] = useState([...initialData]);
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  const recalcRow = useCallback((row) => {
    if (isWarehouseStock || row.totalInitialStock !== undefined) {
      const sum = Object.keys(row)
        .filter(k => k.startsWith('wh_'))
        .reduce((acc, k) => acc + (Number(row[k]) || 0), 0);
      return { ...row, totalInitialStock: sum };
    }
    return row;
  }, [isWarehouseStock]);

  const updateData = React.useCallback((nextDataOrUpdater) => {
    setData(prevData => {
      const nextData = typeof nextDataOrUpdater === 'function' ? nextDataOrUpdater(prevData) : nextDataOrUpdater;
      // Record snapshot to undo history
      setHistory(prevHist => [...prevHist.slice(-50), prevData]);
      setRedoHistory([]); // Reset redo on new modification
      return nextData;
    });
  }, []);

  const handleUndo = React.useCallback(() => {
    setHistory(prevHist => {
      if (prevHist.length === 0) return prevHist;
      const previousData = prevHist[prevHist.length - 1];
      const newHist = prevHist.slice(0, prevHist.length - 1);
      
      setData(currentData => {
        setRedoHistory(prevRedo => [...prevRedo.slice(-50), currentData]);
        return previousData;
      });
      return newHist;
    });
  }, []);

  const handleRedo = React.useCallback(() => {
    setRedoHistory(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const nextData = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, prevRedo.length - 1);
      
      setData(currentData => {
        setHistory(prevHist => [...prevHist.slice(-50), currentData]);
        return nextData;
      });
      return newRedo;
    });
  }, []);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selection, setSelection] = useState(null); // { r1, c1, r2, c2 }
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { r, c, isDirectInput }
  const [bulkInputValue, setBulkInputValue] = useState('');
  const [isBulkInputActive, setIsBulkInputActive] = useState(false);
  const [enterDirection, setEnterDirection] = useState('vertical'); // 'vertical' or 'horizontal'
  const [isKoreanMode, setIsKoreanMode] = useState(true); // Default Korean mode (한글 기본)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const tableWrapperRef = React.useRef(null);

  const [searchTerm, setSearchTerm] = useState('');

  const warehouseOptions = React.useMemo(() => {
    const list = (warehouses || []).map(w => typeof w === 'string' ? w : w.name).filter(Boolean);
    if (!list.includes('본사창고')) list.unshift('본사창고');
    (data || []).forEach(item => {
      if (item.warehouse && !list.includes(item.warehouse)) {
        list.push(item.warehouse);
      }
    });
    return [...new Set(list)];
  }, [warehouses, data]);

  // Category Filtering States
  const [selectedLargeId, setSelectedLargeId] = useState('전체');
  const [selectedMediumId, setSelectedMediumId] = useState('전체');
  const [selectedSmallId, setSelectedSmallId] = useState('전체');

  // Memoized visible rows after category filtering and search
  const visibleData = React.useMemo(() => {
    let result = data;

    // 1. Category Filtering
    if (isProductOrWarehouseStock && categories && categories.length > 0) {
      let activeCatId = null;
      if (selectedSmallId !== '전체') {
        activeCatId = selectedSmallId;
      } else if (selectedMediumId !== '전체') {
        activeCatId = selectedMediumId;
      } else if (selectedLargeId !== '전체') {
        activeCatId = selectedLargeId;
      }
      
      if (activeCatId) {
        const allowedNames = new Set();
        const getDescendants = (parentId) => {
          categories.forEach(c => {
            if (c.parentId && String(c.parentId) === String(parentId)) {
              allowedNames.add(c.name.trim().toLowerCase());
              getDescendants(c.id);
            }
          });
        };
        
        const activeCat = categories.find(c => String(c.id) === String(activeCatId));
        if (activeCat) {
          allowedNames.add(activeCat.name.trim().toLowerCase());
          getDescendants(activeCat.id);
          
          result = result.filter(p => {
            const pLarge = (p.categoryLarge || '').trim().toLowerCase();
            const pMedium = (p.categoryMedium || '').trim().toLowerCase();
            const pSmall = (p.categorySmall || '').trim().toLowerCase();
            const pCat = (p.category || '').trim().toLowerCase();
            
            const hasMatchingPathPart = pCat.split('>').some(part => allowedNames.has(part.trim().toLowerCase()));
            
            return allowedNames.has(pLarge) || 
                   allowedNames.has(pMedium) || 
                   allowedNames.has(pSmall) || 
                   allowedNames.has(pCat) || 
                   hasMatchingPathPart;
          });
        } else {
          result = [];
        }
      }
    }

    // 2. Search Query Filtering
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const isChosung = isChosungOnly(term);
      result = result.filter(item => {
        return Object.entries(item).some(([key, val]) => {
          if (val === undefined || val === null || key === 'id' || key === 'companyId') return false;
          const valStr = String(val).toLowerCase();
          if (valStr.includes(term)) return true;
          if (isChosung) {
            const chosungVal = getChosung(valStr).toLowerCase();
            if (chosungVal.includes(term)) return true;
          }
          return false;
        });
      });
    }

    return result;
  }, [data, selectedLargeId, selectedMediumId, selectedSmallId, categories, isProductOrWarehouseStock, searchTerm]);

  // Column Visibility State
  const isCustomColumns = !!columnsProp;
  const visibilityKey = isPartner ? 'partnerVisibleColumns' : `bulk_col_visibility_${type || 'default'}_${title.replace(/\s+/g, '_')}${isCustomColumns ? '_custom' : ''}`;
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = localStorage.getItem(visibilityKey);
    const allFields = columns.map(c => c.field);
    if (saved) {
      try {
        let savedFields;
        if (saved.startsWith('[')) {
          savedFields = JSON.parse(saved);
        } else {
          savedFields = saved.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (Array.isArray(savedFields)) {
          // Filter out fields that no longer exist in the columns list
          const filtered = savedFields.filter(f => allFields.includes(f));
          if (filtered.length > 0) {
            return filtered;
          }
        }
      } catch (e) {
        console.error('Error parsing visible fields from localStorage:', e);
      }
    }
    // Default columns matching PartnerManagement default visible columns if type is partner
    if (isPartner) {
      const defaultPartnerVisible = ['type', 'name', 'ceo', 'mobile', 'manager'];
      return defaultPartnerVisible.filter(f => allFields.includes(f));
    }
    return allFields;
  });

  const toggleColumn = (field) => {
    const newFields = visibleFields.includes(field)
      ? visibleFields.filter(f => f !== field)
      : [...visibleFields, field];
    setVisibleFields(newFields);
    
    if (isPartner) {
      // In PartnerManagement.jsx, the 'sequence' (순번) column is optional but part of partnerVisibleColumns.
      // We should check if 'sequence' was in the saved storage, and if so, preserve it so it doesn't get lost.
      const saved = localStorage.getItem('partnerVisibleColumns');
      let hasSequence = true; // default to true to preserve it
      if (saved) {
        try {
          let parsed;
          if (saved.startsWith('[')) {
            parsed = JSON.parse(saved);
          } else {
            parsed = saved.split(',').map(s => s.trim()).filter(Boolean);
          }
          if (Array.isArray(parsed)) {
            hasSequence = parsed.includes('sequence');
          }
        } catch (e) {}
      }
      const finalFieldsForStorage = hasSequence ? ['sequence', ...newFields] : newFields;
      localStorage.setItem('partnerVisibleColumns', JSON.stringify(finalFieldsForStorage));
    } else {
      localStorage.setItem(visibilityKey, JSON.stringify(newFields));
    }
  };

  const activeColumns = columns.filter(col => visibleFields.includes(col.field));

  const handlePaste = React.useCallback((e, rowIndex, colIndex) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    
    // Parse clipboard data into 2D array
    const clipRows = pasteData.split(/\r?\n/).map(line => line.split('\t'));
    const parsedClip = clipRows.filter(row => row.length > 0 && (row.length > 1 || row[0] !== ''));
    
    if (parsedClip.length === 0) return;
    
    const R_clip = parsedClip.length;
    const C_clip = Math.max(...parsedClip.map(row => row.length));
    
    const newData = [...data];
    
    let R_sel = 1;
    let C_sel = 1;
    let startRow = rowIndex;
    let startCol = colIndex;
    let endRow = rowIndex + R_clip - 1;
    let endCol = colIndex + C_clip - 1;
    
    // If there is an active selection area that spans multiple cells, respect its boundaries
    if (selection) {
      const { r1, c1, r2, c2 } = selection;
      const selStartRow = Math.min(r1, r2);
      const selEndRow = Math.max(r1, r2);
      const selStartCol = Math.min(c1, c2);
      const selEndCol = Math.max(c1, c2);
      
      const selR = selEndRow - selStartRow + 1;
      const selC = selEndCol - selStartCol + 1;
      
      if (selR > 1 || selC > 1) {
        R_sel = selR;
        C_sel = selC;
        startRow = selStartRow;
        startCol = selStartCol;
        endRow = selEndRow;
        endCol = selEndCol;
      }
    }
    
    // Loop through the computed range and fill in values circularly via modulo
    for (let r = startRow; r <= endRow; r++) {
      const targetVisibleRowIndex = r;
      
      let targetRowId = null;
      if (targetVisibleRowIndex < visibleData.length) {
        targetRowId = visibleData[targetVisibleRowIndex].id;
      }
      
      let targetIdxInOriginal = -1;
      if (targetRowId !== null) {
        targetIdxInOriginal = newData.findIndex(d => d.id === targetRowId);
      } else {
        const newRow = activeColumns.reduce((acc, col) => {
          acc[col.field] = col.type === 'number' ? 0 : '';
          return acc;
        }, { id: Date.now() + Math.random() });
        newData.push(newRow);
        targetIdxInOriginal = newData.length - 1;
      }
      
      if (targetIdxInOriginal >= 0) {
        const clipRowIdx = (r - startRow) % R_clip;
        const rowCells = parsedClip[clipRowIdx] || [];
        
        for (let c = startCol; c <= endCol; c++) {
          const targetColIndex = c;
          if (targetColIndex < activeColumns.length) {
            const clipColIdx = (c - startCol) % C_clip;
            const cellVal = rowCells[clipColIdx] !== undefined ? rowCells[clipColIdx] : '';
            
            const colDef = activeColumns[targetColIndex];
            if (colDef?.readOnly) continue;

            const field = colDef.field;
            const type = colDef.type;
            
            if (isPartner && field === 'receivables') continue;
            
            if (isPartner && field === 'receivableBase') {
              const oldBase = Number(newData[targetIdxInOriginal].receivableBase) || 0;
              const newBase = Number(cellVal.replace(/,/g, '')) || 0;
              const delta = newBase - oldBase;
              const oldReceivables = Number(newData[targetIdxInOriginal].receivables) || 0;
              newData[targetIdxInOriginal].receivableBase = newBase;
              newData[targetIdxInOriginal].receivables = oldReceivables + delta;
            } else if (type === 'number') {
              newData[targetIdxInOriginal][field] = Number(cellVal.replace(/,/g, '')) || 0;
            } else if (type === 'boolean') {
              newData[targetIdxInOriginal][field] = parseBooleanValue(cellVal);
            } else {
              newData[targetIdxInOriginal][field] = cellVal;
            }
          }
        }
        newData[targetIdxInOriginal] = recalcRow(newData[targetIdxInOriginal]);
      }
    }
    
    updateData(newData);
  }, [data, visibleData, activeColumns, isPartner, selection, updateData, recalcRow]);

  const handleEnterNavigation = (r, c) => {
    if (enterDirection === 'vertical') {
      const nextRow = Math.min(r + 1, visibleData.length - 1);
      setSelection({ r1: nextRow, c1: c, r2: nextRow, c2: c });
    } else {
      const nextCol = Math.min(c + 1, activeColumns.length - 1);
      setSelection({ r1: r, c1: nextCol, r2: r, c2: nextCol });
    }
    setEditingCell(null);
  };

  // Column Resizing State
  const storageKey = `bulk_col_widths_${title.replace(/\s+/g, '_')}${isCustomColumns ? '_custom' : ''}`;
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing column widths from localStorage:', e);
      }
    }
    return columns.reduce((acc, col) => {
      acc[col.field] = parseInt(col.width) || 120;
      return acc;
    }, {});
  });

  const [resizing, setResizing] = useState(null); // { field, startX, startWidth }

  // Handle Global Mouse Events for Resizing and Selecting
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (resizing) {
        const deltaX = e.clientX - resizing.startX;
        const newWidth = Math.max(50, resizing.startWidth + deltaX);
        setColWidths(prev => ({ ...prev, [resizing.field]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      if (resizing) {
        localStorage.setItem(storageKey, JSON.stringify(colWidths));
        setResizing(null);
      }
      setIsSelecting(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, colWidths, storageKey]);

  // Auto-scroll on Drag Selection
  React.useEffect(() => {
    if (!isSelecting) return;

    let animationFrameId = null;
    let lastMouseEvent = null;

    const handleMouseMove = (e) => {
      lastMouseEvent = e;
    };

    const performAutoScroll = () => {
      if (!lastMouseEvent || !tableWrapperRef.current) {
        animationFrameId = requestAnimationFrame(performAutoScroll);
        return;
      }

      const wrapper = tableWrapperRef.current;
      const rect = wrapper.getBoundingClientRect();
      const { clientX, clientY } = lastMouseEvent;

      const threshold = 40; // Pixels inside boundary where scroll starts
      const scrollSpeedBase = 8; // Comfortable base speed

      let scrollX = 0;
      let scrollY = 0;

      // Vertical auto-scroll calculation (quadratic progressive scaling)
      if (clientY > rect.bottom - threshold) {
        const distance = clientY - (rect.bottom - threshold);
        const ratio = distance / threshold;
        scrollY = Math.min(60, ratio * ratio * scrollSpeedBase);
      } else if (clientY < rect.top + threshold) {
        const distance = (rect.top + threshold) - clientY;
        const ratio = distance / threshold;
        scrollY = -Math.min(60, ratio * ratio * scrollSpeedBase);
      }

      // Horizontal auto-scroll calculation (quadratic progressive scaling)
      if (clientX > rect.right - threshold) {
        const distance = clientX - (rect.right - threshold);
        const ratio = distance / threshold;
        scrollX = Math.min(60, ratio * ratio * scrollSpeedBase);
      } else if (clientX < rect.left + threshold) {
        const distance = (rect.left + threshold) - clientX;
        const ratio = distance / threshold;
        scrollX = -Math.min(60, ratio * ratio * scrollSpeedBase);
      }

      if (scrollX !== 0 || scrollY !== 0) {
        wrapper.scrollBy(scrollX, scrollY);

        // Dynamic element selection projection (clamped inside viewport)
        const clampX = Math.max(rect.left + 10, Math.min(rect.right - 10, clientX));
        const clampY = Math.max(rect.top + 10, Math.min(rect.bottom - 10, clientY));
        const element = document.elementFromPoint(clampX, clampY);
        
        if (element) {
          const cell = element.closest('td.editable-cell');
          if (cell) {
            const r = parseInt(cell.getAttribute('data-row'), 10);
            const c = parseInt(cell.getAttribute('data-col'), 10);
            if (!isNaN(r) && !isNaN(c)) {
              setSelection(prev => {
                if (!prev) return null;
                return { ...prev, r2: r, c2: c };
              });
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(performAutoScroll);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrameId = requestAnimationFrame(performAutoScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isSelecting]);

  // Handle Global Keydown and Paste for Bulk Edit Activation
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is focused on search/filter fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        if (!e.target.closest('td.editable-cell')) {
          return;
        }
      }

      // Handle Han/Eng key toggle (한/영 키 전환)
      if (e.key === 'HangulMode' || e.code === 'Lang1' || e.code === 'Lang2' || e.key === 'Hanja' || e.code === 'Hanja') {
        setIsKoreanMode(prev => !prev);
        return;
      }

      if (!selection || editingCell || isBulkInputActive) return;
      
      const { r1, c1, r2, c2 } = selection;
      const isRange = r1 !== r2 || c1 !== c2;

      // Tab key navigation
      if (e.key === 'Tab') {
        e.preventDefault();
        const shift = e.shiftKey;
        let nextC = shift ? c1 - 1 : c1 + 1;
        let nextR = r1;
        
        if (nextC < 0) {
          nextC = activeColumns.length - 1;
          nextR = Math.max(0, r1 - 1);
        } else if (nextC >= activeColumns.length) {
          nextC = 0;
          nextR = Math.min(visibleData.length - 1, r1 + 1);
        }
        
        setSelection({ r1: nextR, c1: nextC, r2: nextR, c2: nextC });
        
        setTimeout(() => {
          const activeCellEl = tableWrapperRef.current?.querySelector(`td.editable-cell[data-row="${nextR}"][data-col="${nextC}"]`);
          if (activeCellEl) {
            activeCellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }, 10);
        return;
      }

      // Arrow keys navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const shift = e.shiftKey;
        
        let nextR1 = r1;
        let nextC1 = c1;
        let nextR2 = r2;
        let nextC2 = c2;
        
        if (e.key === 'ArrowUp') {
          if (shift) {
            nextR2 = Math.max(0, r2 - 1);
          } else {
            nextR1 = Math.max(0, r1 - 1);
            nextR2 = nextR1;
            nextC2 = nextC1;
          }
        } else if (e.key === 'ArrowDown') {
          if (shift) {
            nextR2 = Math.min(visibleData.length - 1, r2 + 1);
          } else {
            nextR1 = Math.min(visibleData.length - 1, r1 + 1);
            nextR2 = nextR1;
            nextC2 = nextC1;
          }
        } else if (e.key === 'ArrowLeft') {
          if (shift) {
            nextC2 = Math.max(0, c2 - 1);
          } else {
            nextC1 = Math.max(0, c1 - 1);
            nextC2 = nextC1;
            nextR2 = nextR1;
          }
        } else if (e.key === 'ArrowRight') {
          if (shift) {
            nextC2 = Math.min(activeColumns.length - 1, c2 + 1);
          } else {
            nextC1 = Math.min(activeColumns.length - 1, c1 + 1);
            nextC2 = nextC1;
            nextR2 = nextR1;
          }
        }
        
        setSelection({ r1: nextR1, c1: nextC1, r2: nextR2, c2: nextC2 });
        
        setTimeout(() => {
          const activeCellEl = tableWrapperRef.current?.querySelector(`td.editable-cell[data-row="${shift ? nextR2 : nextR1}"][data-col="${shift ? nextC2 : nextC1}"]`);
          if (activeCellEl) {
            activeCellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }, 10);
        return;
      }

      // Space key to toggle boolean checkbox directly
      if (e.key === ' ' && !isRange && activeColumns[c1]?.type === 'boolean' && !activeColumns[c1]?.readOnly) {
        e.preventDefault();
        const field = activeColumns[c1].field;
        const currentVal = visibleData[r1]?.[field] !== false;
        handleChange(r1, field, !currentVal);
        return;
      }

      // Enter key to start editing
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isRange) return;
        const colDef = activeColumns[c1];
        if (colDef?.readOnly) return;
        const field = colDef?.field;
        if (isPartner && field === 'receivables') return;
        
        flushSync(() => {
          setEditingCell({ r: r1, c: c1, isDirectInput: false });
        });
        return;
      }

      // F2 key to start editing with cursor placed at the end of text (선택 블럭 수정 모드 및 커서 맨 뒤)
      if (e.key === 'F2') {
        e.preventDefault();
        if (isRange) return;
        const colDef = activeColumns[c1];
        if (colDef?.readOnly) return;
        const field = colDef?.field;
        if (isPartner && field === 'receivables') return;
        
        flushSync(() => {
          setEditingCell({ r: r1, c: c1, isDirectInput: false, cursorAtEnd: true });
        });
        return;
      }

      // Ctrl+Z Undo / Redo handler
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      // Ctrl+Y Redo handler
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+C Copy handler
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        const startRow = Math.min(r1, r2);
        const endRow = Math.max(r1, r2);
        const startCol = Math.min(c1, c2);
        const endCol = Math.max(c1, c2);
        
        let rowsStr = [];
        for (let r = startRow; r <= endRow; r++) {
          const rowData = visibleData[r];
          if (!rowData) continue;
          let rowCells = [];
          for (let c = startCol; c <= endCol; c++) {
            const col = activeColumns[c];
            if (!col) continue;
            const val = rowData[col.field];
            if (col.type === 'boolean') {
              rowCells.push(val !== false ? '1' : '0');
            } else {
              rowCells.push(val !== undefined && val !== null ? String(val) : '');
            }
          }
          rowsStr.push(rowCells.join('\t'));
        }
        const clipboardText = rowsStr.join('\n');
        navigator.clipboard.writeText(clipboardText).catch(err => {
          console.error('Failed to copy text: ', err);
        });
        return;
      }

      // Start edit on printable character keys (including space) - only for single cell selection
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (isRange) return; // 영역 선택(다중 셀) 시 타이핑으로 인한 데이터 변경 방지

        const col = activeColumns[c1];
        if (col?.readOnly) return;

        let mappedKey = e.key;
        if (col?.type !== 'number' && isKoreanMode) {
          if (QWERTY_TO_HANGUL[e.key]) {
            mappedKey = QWERTY_TO_HANGUL[e.key];
          }
        }

        const field = activeColumns[c1]?.field;
        if (isPartner && field === 'receivables') return;

        // Render cell input synchronously so it instantly mounts and registers further keypresses
        flushSync(() => {
          setEditingCell({ r: r1, c: c1, isDirectInput: true, pendingChar: mappedKey });
        });
      }
      
      // Delete/Backspace for range or single cell
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const startRow = Math.min(r1, r2);
        const endRow = Math.max(r1, r2);
        const startCol = Math.min(c1, c2);
        const endCol = Math.max(c1, c2);

        let newData = [...data];
        let hasChanges = false;
        for (let r = startRow; r <= endRow; r++) {
          const visibleRow = visibleData[r];
          if (!visibleRow) continue;
          const idx = newData.findIndex(d => (d.id ? d.id === visibleRow.id : d === visibleRow));
          if (idx < 0) continue;

          for (let c = startCol; c <= endCol; c++) {
            const colDef = activeColumns[c];
            if (!colDef || colDef.readOnly) continue;
            const field = colDef.field;
            if (isPartner && field === 'receivables') continue;
            
            if (isPartner && field === 'receivableBase') {
              const oldBase = Number(newData[idx].receivableBase) || 0;
              const newBase = 0;
              const delta = newBase - oldBase;
              const oldReceivables = Number(newData[idx].receivables) || 0;
              newData[idx] = {
                ...newData[idx],
                receivableBase: newBase,
                receivables: oldReceivables + delta
              };
              hasChanges = true;
            } else if (colDef.type === 'boolean') {
              newData[idx] = { ...newData[idx], [field]: false };
              hasChanges = true;
            } else {
              newData[idx] = { ...newData[idx], [field]: colDef.type === 'number' ? 0 : '' };
              hasChanges = true;
            }
          }
          if (hasChanges) {
            newData[idx] = recalcRow(newData[idx]);
          }
        }
        if (hasChanges) {
          updateData(newData);
        }
      }
    };

    const handleGlobalPaste = (e) => {
      if (!selection || editingCell || isBulkInputActive) return;
      
      const { r1, c1, r2, c2 } = selection;
      const startRow = Math.min(r1, r2);
      const startCol = Math.min(c1, c2);
      
      handlePaste(e, startRow, startCol);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [selection, editingCell, isBulkInputActive, data, columns, visibleData, activeColumns, handlePaste, isPartner, isKoreanMode, handleUndo, handleRedo, updateData, recalcRow]);

  const handleBulkInputChange = (val) => {
    setBulkInputValue(val);
    if (!selection) return;

    const { r1, c1, r2, c2 } = selection;
    const startRow = Math.min(r1, r2);
    const endRow = Math.max(r1, r2);
    const startCol = Math.min(c1, c2);
    const endCol = Math.max(c1, c2);

    const newData = [...data];
    for (let r = startRow; r <= endRow; r++) {
      const visibleRow = visibleData[r];
      if (!visibleRow) continue;
      const idx = newData.findIndex(d => d.id === visibleRow.id);
      if (idx < 0) continue;

      for (let c = startCol; c <= endCol; c++) {
        const colDef = activeColumns[c];
        if (!colDef || colDef.readOnly) continue;
        const field = colDef.field;
        const type = colDef.type;
        
        if (isPartner && field === 'receivables') continue;

        if (isPartner && field === 'receivableBase') {
          const oldBase = Number(newData[idx].receivableBase) || 0;
          const newBase = Number(val.replace(/,/g, '')) || 0;
          const delta = newBase - oldBase;
          const oldReceivables = Number(newData[idx].receivables) || 0;
          newData[idx] = {
            ...newData[idx],
            receivableBase: newBase,
            receivables: oldReceivables + delta
          };
        } else if (type === 'boolean') {
          newData[idx] = {
            ...newData[idx],
            [field]: parseBooleanValue(val)
          };
        } else {
          newData[idx] = { 
            ...newData[idx], 
            [field]: type === 'number' ? Number(val.replace(/,/g, '')) || 0 : val 
          };
        }
      }
      newData[idx] = recalcRow(newData[idx]);
    }
    updateData(newData);
  };

  const handleResizeStart = (e, field) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      field,
      startX: e.clientX,
      startWidth: colWidths[field]
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return direction === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    updateData(sortedData);
  };

  const handleChange = (visibleIndex, field, value) => {
    const visibleRow = visibleData[visibleIndex];
    if (!visibleRow) return;
    const colDef = activeColumns.find(c => c.field === field);
    if (colDef?.readOnly) return;
    if (isPartner && field === 'receivables') return;
    const idx = data.findIndex(d => d.id === visibleRow.id);
    if (idx >= 0) {
      const newData = [...data];
      let finalVal = value;
      if (colDef?.type === 'boolean') {
        finalVal = typeof value === 'boolean' ? value : parseBooleanValue(value);
      }
      if (isPartner && field === 'receivableBase') {
        const oldBase = Number(newData[idx].receivableBase) || 0;
        const newBase = Number(value) || 0;
        const delta = newBase - oldBase;
        const oldReceivables = Number(newData[idx].receivables) || 0;
        newData[idx] = recalcRow({
          ...newData[idx],
          receivableBase: newBase,
          receivables: oldReceivables + delta
        });
      } else {
        newData[idx] = recalcRow({ ...newData[idx], [field]: finalVal });
      }
      updateData(newData);
    }
  };

  const handleCellMouseDown = (r, c) => {
    setSelection({ r1: r, c1: c, r2: r, c2: c });
    setIsSelecting(true);
    setEditingCell(null);
  };

  const handleCellMouseEnter = (r, c) => {
    if (isSelecting) {
      setSelection(prev => ({ ...prev, r2: r, c2: c }));
    }
  };

  const handleCellDoubleClick = (r, c) => {
    const colDef = activeColumns[c];
    if (colDef?.readOnly) return;
    const field = colDef?.field;
    if (isPartner && field === 'receivables') return;
    setEditingCell({ r, c });
    setSelection(null);
  };

  const isCellSelected = (r, c) => {
    if (!selection) return false;
    const { r1, c1, r2, c2 } = selection;
    const startRow = Math.min(r1, r2);
    const endRow = Math.max(r1, r2);
    const startCol = Math.min(c1, c2);
    const endCol = Math.max(c1, c2);
    return r >= startRow && r <= endRow && c >= startCol && c <= endCol;
  };

  const handleAddRows = (count) => {
    const defaultWarehouse = warehouseOptions[0] || '본사창고';
    const newRows = Array.from({ length: count }, () => 
      activeColumns.reduce((acc, col) => {
        if (col.type === 'number') {
          acc[col.field] = 0;
        } else if (col.type === 'boolean') {
          acc[col.field] = true;
        } else if (col.field === 'warehouse') {
          acc[col.field] = defaultWarehouse;
        } else if (col.field === 'taxType') {
          acc[col.field] = '과세';
        } else {
          acc[col.field] = '';
        }
        return acc;
      }, { id: Date.now() + Math.random(), warehouse: defaultWarehouse, showInMall: true })
    );
    updateData([...data, ...newRows]);
  };


  const handleRemoveRow = (visibleIndex) => {
    const visibleRow = visibleData[visibleIndex];
    if (!visibleRow) return;
    const newData = data.filter(d => d.id !== visibleRow.id);
    updateData(newData);
  };

  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(data);
      }
      const message = isWarehouseStock
        ? '창고별 기초재고 일괄 수정이 완료되었습니다.'
        : isPartner 
        ? '거래처 일괄 수정이 완료되었습니다.' 
        : isProduct 
        ? '품목 일괄 수정이 완료되었습니다.' 
        : '변경사항이 성공적으로 적용되었습니다.';
      alert(message);
      onClose();
    } catch (err) {
      console.error('Save error in BulkEditor:', err);
      alert('저장 중 오류가 발생했습니다: ' + (err.message || err));
    }
  };

  return (
    <WindowModal title={title} onClose={onClose} width="95vw">
      <div className="bulk-editor-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Edit3 size={24} color="#3b82f6" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {title}
          </h2>
        </div>
        <div className="bulk-editor-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="info-badge" style={{ padding: '8px 14px', borderRadius: '10px' }}>
            <AlertCircle size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.4' }}>
              {isWarehouseStock ? (
                <>
                  각 창고별 기초재고를 엑셀처럼 자유롭게 입력할 수 있습니다.<br />
                  <strong>[단축키]</strong> 방향키(이동), Enter/F2/더블클릭(편집), <strong>드래그 선택 후 일괄입력</strong>, <strong>Ctrl+C/V</strong>(엑셀 복사/붙여넣기), <strong>Ctrl+Z</strong>(실행취소), <strong>Ctrl+Y</strong>(다시실행) 지원.
                </>
              ) : (
                <>
                  드래그로 영역 선택이 가능하며, 선택 후 타이핑 시 일괄 수정됩니다.<br />
                  {isProduct && (
                    <>
                      <strong>[몰노출]</strong> 숫자 <strong>1</strong>은 노출, <strong>0</strong>은 비노출입니다.<br />
                    </>
                  )}
                  <strong>[실행취소/단축키]</strong> 잘못 수정/삭제 시 <strong>Ctrl+Z</strong>(실행취소), <strong>Ctrl+Y</strong>(다시실행)로 되돌릴 수 있으며, <strong>Ctrl+C/V</strong> 복사/붙여넣기를 지원합니다.
                </>
              )}
            </span>
          </div>
          <div className="bulk-actions" style={{ flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Box */}
            <div className="bulk-search-box">
              <Search size={15} className="bulk-search-icon" />
              <input
                type="text"
                className="bulk-search-input"
                placeholder={isWarehouseStock ? "품목명, 코드, 규격 검색" : isProduct ? "품목명, 코드, 규격, 바코드 검색" : isPartner ? "거래처명, 대표자, 전화번호 검색" : "검색어 입력"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchTerm('');
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="bulk-search-clear"
                  onClick={() => setSearchTerm('')}
                  title="검색어 초기화"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Dropdowns like ProductManagement */}
            {isProductOrWarehouseStock && categories && categories.length > 0 && (
              <div className="bulk-category-filters" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '10px', padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af' }}>대분류</span>
                  <select
                    value={selectedLargeId}
                    onChange={(e) => {
                      setSelectedLargeId(e.target.value);
                      setSelectedMediumId('전체');
                      setSelectedSmallId('전체');
                    }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.8rem', background: '#fff', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="전체">전체</option>
                    {categories.filter(c => !c.parentId || c.level === 1).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af' }}>중분류</span>
                  <select
                    disabled={selectedLargeId === '전체'}
                    value={selectedMediumId}
                    onChange={(e) => {
                      setSelectedMediumId(e.target.value);
                      setSelectedSmallId('전체');
                    }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.8rem', background: '#fff', color: '#1e293b', outline: 'none', cursor: 'pointer', opacity: selectedLargeId === '전체' ? 0.5 : 1 }}
                  >
                    <option value="전체">전체</option>
                    {categories.filter(c => String(c.parentId) === String(selectedLargeId) && c.level === 2).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af' }}>소분류</span>
                  <select
                    disabled={selectedMediumId === '전체'}
                    value={selectedSmallId}
                    onChange={(e) => setSelectedSmallId(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.8rem', background: '#fff', color: '#1e293b', outline: 'none', cursor: 'pointer', opacity: selectedMediumId === '전체' ? 0.5 : 1 }}
                  >
                    <option value="전체">전체</option>
                    {categories.filter(c => String(c.parentId) === String(selectedMediumId) && c.level === 3).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div 
              onClick={() => setIsKoreanMode(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginRight: '10px',
                padding: '6px 12px',
                background: isKoreanMode ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${isKoreanMode ? '#93c5fd' : '#cbd5e1'}`,
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s'
              }}
              title="클릭하거나 키보드 [한/영] 키를 눌러 전환 (기본: 한글)"
            >
              <span style={{ fontWeight: 600, color: isKoreanMode ? '#1e40af' : '#475569' }}>한/영:</span>
              <span style={{ 
                fontWeight: 800, 
                color: isKoreanMode ? '#2563eb' : '#475569',
                background: isKoreanMode ? '#dbeafe' : '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}>
                {isKoreanMode ? '한글' : '영문'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  background: history.length > 0 ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${history.length > 0 ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: history.length > 0 ? '#1e40af' : '#94a3b8',
                  cursor: history.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: history.length > 0 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s'
                }}
                title="이전 작업으로 되돌리기 (단축키: Ctrl+Z)"
              >
                <Undo2 size={15} /> 실행취소{history.length > 0 ? ` (${history.length})` : ''}
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoHistory.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  background: redoHistory.length > 0 ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${redoHistory.length > 0 ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: redoHistory.length > 0 ? '#1e40af' : '#94a3b8',
                  cursor: redoHistory.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: redoHistory.length > 0 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s'
                }}
                title="다시 실행 (단축키: Ctrl+Y 또는 Ctrl+Shift+Z)"
              >
                <Redo2 size={15} /> 다시실행
              </button>
            </div>

            <div className="enter-direction-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '10px', padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>엔터 방향:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enterDirection === 'vertical'} onChange={() => setEnterDirection('vertical')} /> 세로
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enterDirection === 'horizontal'} onChange={() => setEnterDirection('horizontal')} /> 가로
              </label>
            </div>
            {canAddDeleteRows && (
              <div className="add-row-group">
                <span>행 추가:</span>
                <button onClick={() => handleAddRows(1)}>+1</button>
                <button onClick={() => handleAddRows(10)}>+10</button>
                <button onClick={() => handleAddRows(20)}>+20</button>
                <button onClick={() => handleAddRows(30)}>+30</button>
                <button onClick={() => handleAddRows(50)}>+50</button>
              </div>
            )}
            <button className="btn-settings-bulk" onClick={() => setIsSettingsOpen(!isSettingsOpen)} title="열 설정">
              <Settings size={18} color={isSettingsOpen ? '#3b82f6' : '#64748b'} />
            </button>
            <button className="btn-save-bulk" onClick={handleSave}>
              <Save size={16} /> 변경사항 적용
            </button>
          </div>
        </div>

        {isSettingsOpen && (
          <div className="bulk-settings-panel">
            <div className="settings-panel-header">
              <h4>표시할 열 선택</h4>
              <button onClick={() => setIsSettingsOpen(false)}><X size={14} /></button>
            </div>
            <div className="settings-panel-body">
              {columns.map(col => (
                <label key={col.field} className="setting-item">
                  <input 
                    type="checkbox" 
                    checked={visibleFields.includes(col.field)}
                    onChange={() => toggleColumn(col.field)}
                  />
                  <span>{col.header}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div ref={tableWrapperRef} className="bulk-table-wrapper">
          <table className="bulk-table">
            <thead>
              <tr>
                <th width="50px">No</th>
                {activeColumns.map((col, cIdx) => (
                  <th 
                    key={col.field} 
                    style={{ 
                      minWidth: '50px', 
                      width: `${colWidths[col.field]}px`, 
                      cursor: resizing ? 'col-resize' : 'pointer', 
                      userSelect: 'none',
                      position: 'relative'
                    }}
                    onDoubleClick={() => handleSort(col.field)}
                    title="더블클릭하여 정렬"
                  >
                    {col.header}
                    {sortConfig.key === col.field && (
                      <span style={{ marginLeft: '4px', color: '#3b82f6' }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                    <div 
                      className="resizer"
                      onMouseDown={(e) => handleResizeStart(e, col.field)}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px',
                        cursor: 'col-resize', backgroundColor: resizing?.field === col.field ? '#3b82f6' : 'transparent',
                        zIndex: 20
                      }}
                    />
                  </th>
                ))}
                {canAddDeleteRows && <th width="50px">삭제</th>}
              </tr>
            </thead>
            <tbody>
              {visibleData.map((row, rIdx) => (
                <tr key={row.id || rIdx}>
                  <td className="row-no">{rIdx + 1}</td>
                  {activeColumns.map((col, cIdx) => {
                    const isSelected = isCellSelected(rIdx, cIdx);
                    const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
                    
                    const { r1, c1, r2, c2 } = selection || {};
                    const startRow = Math.min(r1, r2);
                    const startCol = Math.min(c1, c2);
                    const isFirstSelected = isBulkInputActive && rIdx === startRow && cIdx === startCol;
                    const isReadOnly = !!col.readOnly;

                    return (
                      <td 
                        key={col.field} 
                        data-row={rIdx}
                        data-col={cIdx}
                        className={`editable-cell ${isSelected ? 'selected' : ''} ${isEditing ? 'active-cell' : ''} ${isReadOnly ? 'read-only-cell' : ''}`}
                        style={{ 
                          width: `${colWidths[col.field]}px`,
                          backgroundColor: isReadOnly ? (col.field === 'totalInitialStock' ? '#eff6ff' : '#f8fafc') : undefined,
                          cursor: isReadOnly ? 'default' : undefined
                        }}
                        onMouseDown={() => handleCellMouseDown(rIdx, cIdx)}
                        onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                        onDoubleClick={() => handleCellDoubleClick(rIdx, cIdx)}
                      >
                        {isEditing ? (
                          <EditableInput
                            initialValue={col.type === 'boolean' ? (row[col.field] !== false ? '1' : '0') : (row[col.field] || '')}
                            isDirectInput={editingCell?.isDirectInput}
                            cursorAtEnd={editingCell?.cursorAtEnd}
                            pendingChar={editingCell?.pendingChar}
                            list={col.field === 'warehouse' ? 'bulk-editor-warehouse-options' : (col.field === 'manager' ? 'bulk-editor-manager-options' : (col.field === 'taxType' ? 'bulk-editor-taxtype-options' : undefined))}
                            onToggleKoreanMode={() => setIsKoreanMode(prev => !prev)}
                            onSave={(val, key) => {
                              handleChange(rIdx, col.field, col.type === 'boolean' ? parseBooleanValue(val) : (col.type === 'number' ? Number(val) || 0 : val));
                              if (key === 'Tab' || key === 'ShiftTab') {
                                const shift = key === 'ShiftTab';
                                let nextC = shift ? cIdx - 1 : cIdx + 1;
                                let nextR = rIdx;
                                if (nextC < 0) {
                                  nextC = activeColumns.length - 1;
                                  nextR = Math.max(0, rIdx - 1);
                                } else if (nextC >= activeColumns.length) {
                                  nextC = 0;
                                  nextR = Math.min(visibleData.length - 1, rIdx + 1);
                                }
                                setSelection({ r1: nextR, c1: nextC, r2: nextR, c2: nextC });
                                setEditingCell(null);
                                setTimeout(() => {
                                  const activeCellEl = tableWrapperRef.current?.querySelector(`td.editable-cell[data-row="${nextR}"][data-col="${nextC}"]`);
                                  if (activeCellEl) {
                                    activeCellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                                  }
                                }, 10);
                              } else {
                                handleEnterNavigation(rIdx, cIdx);
                              }
                            }}
                            onCancel={() => {
                              setEditingCell(null);
                            }}
                            onPaste={(e) => {
                              setEditingCell(null);
                              handlePaste(e, rIdx, cIdx);
                            }}
                            type={col.type}
                            lang="ko"
                            inputMode={col.type === 'number' || col.type === 'boolean' ? 'numeric' : 'text'}
                            style={{ 
                              textAlign: getColumnAlign(col) === 'right' ? 'right' : (getColumnAlign(col) === 'left' ? 'left' : 'center'),
                              imeMode: 'active'
                            }}
                          />
                        ) : isFirstSelected ? (
                          <EditableInput
                            initialValue={bulkInputValue}
                            isDirectInput={true}
                            pendingChar={bulkInputValue}
                            list={col.field === 'warehouse' ? 'bulk-editor-warehouse-options' : (col.field === 'manager' ? 'bulk-editor-manager-options' : (col.field === 'taxType' ? 'bulk-editor-taxtype-options' : undefined))}
                            onToggleKoreanMode={() => setIsKoreanMode(prev => !prev)}
                            onSave={(val) => {
                              handleBulkInputChange(val);
                              setIsBulkInputActive(false);
                            }}
                            onCancel={() => setIsBulkInputActive(false)}
                            onPaste={(e) => {
                              setIsBulkInputActive(false);
                              if (selection) {
                                const { r1, c1, r2, c2 } = selection;
                                handlePaste(e, Math.min(r1, r2), Math.min(c1, c2));
                              }
                            }}
                            type={col.type}
                            lang="ko"
                            inputMode={col.type === 'number' || col.type === 'boolean' ? 'numeric' : 'text'}
                            style={{ 
                              width: '100%', border: 'none', background: '#fff', 
                              boxShadow: '0 0 0 2px #3b82f6', outline: 'none',
                              zIndex: 30,
                              textAlign: getColumnAlign(col) === 'right' ? 'right' : (getColumnAlign(col) === 'left' ? 'left' : 'center'),
                              imeMode: 'active'
                            }}
                          />
                        ) : (
                          <div className="cell-display" style={{ 
                            justifyContent: getColumnAlign(col) === 'right' ? 'flex-end' : (getColumnAlign(col) === 'left' ? 'flex-start' : 'center'),
                            textAlign: getColumnAlign(col) === 'right' ? 'right' : (getColumnAlign(col) === 'left' ? 'left' : 'center'),
                            fontWeight: col.field === 'totalInitialStock' ? 800 : (col.field === 'name' ? 600 : undefined),
                            color: col.field === 'totalInitialStock' ? '#1d4ed8' : (isReadOnly ? '#475569' : undefined)
                          }}>
                            {col.type === 'boolean' ? (
                              <span style={{ 
                                fontWeight: 700, 
                                fontSize: '0.9rem',
                                color: row[col.field] !== false ? '#1e293b' : '#64748b',
                                width: '100%',
                                textAlign: 'center'
                              }}>
                                {row[col.field] !== false ? '1' : '0'}
                              </span>
                            ) : col.type === 'number' ? (
                              Number(row[col.field] || 0).toLocaleString()
                            ) : (
                              row[col.field] || ''
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {canAddDeleteRows && (
                    <td className="action-cell">
                      <button className="btn-delete-row" onClick={() => handleRemoveRow(rIdx)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleData.length === 0 && (
            <div className="empty-bulk">
              {searchTerm ? (
                <span>&apos;{searchTerm}&apos;에 대한 검색 결과가 없습니다.</span>
              ) : isProductOrWarehouseStock && selectedLargeId !== '전체' ? (
                '선택한 카테고리에 해당하는 품목이 없습니다.'
              ) : isWarehouseStock ? (
                '표시할 품목이 없습니다.'
              ) : (
                '편집할 데이터가 없습니다. 행 추가를 클릭하여 데이터를 입력하세요.'
              )}
            </div>
          )}
        </div>
        <datalist id="bulk-editor-warehouse-options">
          {warehouseOptions.map((w, idx) => (
            <option key={idx} value={w} />
          ))}
        </datalist>
        {staffList && staffList.length > 0 && (
          <datalist id="bulk-editor-manager-options">
            {staffList.map((s, idx) => (
              <option key={idx} value={s.name || s} />
            ))}
          </datalist>
        )}
        <datalist id="bulk-editor-taxtype-options">
          <option value="과세" />
          <option value="면세" />
          <option value="영세" />
        </datalist>
      </div>
    </WindowModal>
  );
};

export default BulkEditor;

