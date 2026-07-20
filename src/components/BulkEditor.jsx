import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Save, Plus, Trash2, X, AlertCircle, Settings } from 'lucide-react';
import WindowModal from './WindowModal';
import './BulkEditor.css';

const PARTNER_COLUMNS = [
  { field: 'type', header: '구분', type: 'string', width: 80 },
  { field: 'name', header: '상호명', type: 'string', width: 150 },
  { field: 'abbreviation', header: '약칭', type: 'string', width: 100 },
  { field: 'barcode', header: '바코드', type: 'string', width: 120 },
  { field: 'ceo', header: '대표자', type: 'string', width: 100 },
  { field: 'businessNo', header: '사업자번호', type: 'string', width: 120 },
  { field: 'address', header: '주소', type: 'string', width: 250 },
  { field: 'phone', header: '일반전화', type: 'string', width: 120 },
  { field: 'mobile', header: '휴대전화', type: 'string', width: 120 },
  { field: 'fax', header: '팩스', type: 'string', width: 120 },
  { field: 'email', header: '이메일', type: 'string', width: 150 },
  { field: 'manager', header: '담당자', type: 'string', width: 100 },
  { field: 'warehouse', header: '담당창고', type: 'string', width: 100 },
  { field: 'bankAccount', header: '은행/계좌', type: 'string', width: 150 },
  { field: 'creditLimit', header: '여신한도', type: 'number', width: 100 },
  { field: 'receivables', header: '누적 미수금', type: 'number', width: 100 },
  { field: 'receivableBase', header: '기초미수', type: 'number', width: 100 },
  { field: 'grade', header: '등급', type: 'string', width: 80 },
  { field: 'loginId', header: '아이디', type: 'string', width: 100 },
  { field: 'password', header: '비밀번호', type: 'string', width: 100 },
  { field: 'hideOrderInfo', header: '주문정보숨김', type: 'boolean', width: 100 },
  { field: 'memo', header: '메모', type: 'string', width: 200 },
];

const PRODUCT_COLUMNS = [
  { field: 'code', header: '품목코드', type: 'string', width: 100 },
  { field: 'name', header: '품목명', type: 'string', width: 200 },
  { field: 'categoryLarge', header: '대분류', type: 'string', width: 100 },
  { field: 'categoryMedium', header: '중분류', type: 'string', width: 100 },
  { field: 'categorySmall', header: '소분류', type: 'string', width: 100 },
  { field: 'spec', header: '규격', type: 'string', width: 100 },
  { field: 'unit', header: '단위', type: 'string', width: 80 },
  { field: 'innerQty', header: '내품수량', type: 'number', width: 80 },
  { field: 'purchasePrice', header: '매입가', type: 'number', width: 120 },
  { field: 'salesPriceSingle', header: '매출가(낱개)', type: 'number', width: 120 },
  { field: 'salesPriceBox', header: '매출가(박스)', type: 'number', width: 120 },
  { field: 'stock', header: '현재고', type: 'number', width: 100 },
  { field: 'optimalStock', header: '적정재고', type: 'number', width: 100 },
  { field: 'safeStock', header: '안전재고', type: 'number', width: 100 },
  { field: 'singleBarcode', header: '낱개바코드', type: 'string', width: 150 },
  { field: 'boxBarcode', header: '박스바코드', type: 'string', width: 150 },
  { field: 'warehouse', header: '보관창고', type: 'string', width: 120 },
  { field: 'showInMall', header: '몰 노출', type: 'boolean', width: 80 },
  { field: 'memo', header: '상품설명', type: 'string', width: 200 },
];

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

const EditableInput = ({ initialValue, onSave, onCancel, type, style, lang, inputMode, isDirectInput, pendingChar, onPaste }) => {
  const inputRef = React.useRef(null);
  const isComposing = React.useRef(false);

  // Synchronous focus & selection range setup via ref callback
  const setInputRef = React.useCallback((node) => {
    if (node) {
      inputRef.current = node;
      // Focus synchronously immediately during mount commit phase
      node.focus();
      if (isDirectInput) {
        const len = node.value.length;
        node.setSelectionRange(len, len);
      } else {
        node.select();
      }
    }
  }, [isDirectInput]);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (!isDirectInput) {
        inputRef.current.select();
      } else {
        // Position cursor at the end when starting directly
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
  }, [isDirectInput]);
  
  const handleKeyDown = (e) => {
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

    // Intercept English characters when last layout was Korean to prevent OS native layout conflict
    const lastImeLang = localStorage.getItem('linkerx_last_ime_lang') || 'ko';
    if (lastImeLang === 'ko' && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const engToKor = {
        'a':'ㅁ', 'b':'ㅠ', 'c':'ㅊ', 'd':'ㅇ', 'e':'ㄷ', 'f':'ㄹ', 'g':'ㅎ', 'h':'ㅗ', 'i':'ㅑ', 'j':'ㅓ', 'k':'ㅏ', 'l':'ㅣ', 'm':'ㅡ', 'n':'ㅜ', 'o':'ㅐ', 'p':'ㅔ', 'q':'ㅂ', 'r':'ㄱ', 's':'ㄴ', 't':'ㅅ', 'u':'ㅕ', 'v':'ㅍ', 'w':'ㅈ', 'x':'ㅌ', 'y':'요', 'z':'ㅋ',
        'A':'ㅁ', 'B':'ㅠ', 'C':'ㅊ', 'D':'ㅇ', 'E':'ㄸ', 'F':'ㄹ', 'G':'ㅎ', 'H':'ㅗ', 'I':'ㅑ', 'J':'ㅓ', 'K':'ㅏ', 'L':'ㅣ', 'M':'ㅡ', 'N':'ㅜ', 'O':'ㅒ', 'P':'ㅖ', 'Q':'ㅃ', 'R':'ㄲ', 'S':'ㄴ', 'T':'ㅆ', 'U':'ㅕ', 'V':'ㅍ', 'W':'ㅉ', 'X':'ㅌ', 'Y':'요', 'Z':'ㅋ'
      };
      
      const mapped = engToKor[e.key];
      if (mapped) {
        e.preventDefault();
        
        const input = inputRef.current;
        let start = input.selectionStart;
        let end = input.selectionEnd;
        const val = input.value;
        
        // Prevent auto select-all or default cursor position 0 from misplacing/overwriting the character in direct typing mode
        if (isDirectInput && (val.length === 1 || (start === 0 && end === val.length) || (start === 0 && end === 0))) {
          start = val.length;
          end = val.length;
        }
        
        // Decompose everything, insert new mapped Jamo, and reassemble
        const textBefore = val.slice(0, start);
        const textAfter = val.slice(end);
        
        const jamosBefore = decomposeHangul(textBefore);
        const jamosAfter = decomposeHangul(textAfter);
        
        const allJamos = [...jamosBefore, mapped, ...jamosAfter];
        const newText = assembleJamos(allJamos);
        
        input.value = newText;
        
        // Calculate new cursor position based on newly assembled prefix
        const newBefore = assembleJamos([...jamosBefore, mapped]);
        input.setSelectionRange(newBefore.length, newBefore.length);
        
        // Trigger manual input event to sync state if there are listeners
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  };

  const handleInput = (e) => {
    const input = e.target;
    const val = input.value;
    
    // Save last used keyboard language
    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(val)) {
      localStorage.setItem('linkerx_last_ime_lang', 'ko');
    } else if (/[a-zA-Z]/.test(val)) {
      localStorage.setItem('linkerx_last_ime_lang', 'en');
    }
    
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

const BulkEditor = ({ type, data: initialDataProp, title: titleProp, initialData: oldInitialData, columns: columnsProp, onSave, onClose, categories = [] }) => {
  const isPartner = type === 'partner';
  const isProduct = type === 'product';
  const title = titleProp || (isPartner ? '거래처 일괄 편집' : isProduct ? '품목 일괄 편집' : '일괄 편집');
  const columns = columnsProp || (isPartner ? PARTNER_COLUMNS : isProduct ? PRODUCT_COLUMNS : []);
  const initialData = initialDataProp || oldInitialData || [];

  const [data, setData] = useState([...initialData]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selection, setSelection] = useState(null); // { r1, c1, r2, c2 }
  const [isSelecting, setIsSelecting] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { r, c, isDirectInput }
  const [bulkInputValue, setBulkInputValue] = useState('');
  const [isBulkInputActive, setIsBulkInputActive] = useState(false);
  const [enterDirection, setEnterDirection] = useState('vertical'); // 'vertical' or 'horizontal'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const tableWrapperRef = React.useRef(null);

  // Category Filtering States
  const [selectedLargeId, setSelectedLargeId] = useState('전체');
  const [selectedMediumId, setSelectedMediumId] = useState('전체');
  const [selectedSmallId, setSelectedSmallId] = useState('전체');

  // Memoized visible rows after category filtering
  const visibleData = React.useMemo(() => {
    if (!isProduct || !categories || categories.length === 0) return data;
    
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
        
        return data.filter(p => {
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
        return [];
      }
    }
    return data;
  }, [data, selectedLargeId, selectedMediumId, selectedSmallId, categories, isProduct]);

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
            
            const field = activeColumns[targetColIndex].field;
            const type = activeColumns[targetColIndex].type;
            
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
              const lower = cellVal.trim().toLowerCase();
              newData[targetIdxInOriginal][field] = lower === 'true' || cellVal === '1' || lower === 'y' || lower === 'yes' || lower === 'o';
            } else {
              newData[targetIdxInOriginal][field] = cellVal;
            }
          }
        }
      }
    }
    
    setData(newData);
  }, [data, visibleData, activeColumns, isPartner, selection]);

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

      // Enter key to start editing
      if (e.key === 'Enter') {
        e.preventDefault();
        const field = activeColumns[c1]?.field;
        if (isPartner && field === 'receivables') return;
        
        flushSync(() => {
          setEditingCell({ r: r1, c: c1, isDirectInput: false });
        });
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
            rowCells.push(val !== undefined && val !== null ? String(val) : '');
          }
          rowsStr.push(rowCells.join('\t'));
        }
        const clipboardText = rowsStr.join('\n');
        navigator.clipboard.writeText(clipboardText).catch(err => {
          console.error('Failed to copy text: ', err);
        });
        return;
      }

      // Start edit on printable character keys (including space)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); // Intercept initial keystroke to prevent raw English insertion

        // Check the last remembered Han/Eng layout state
        const lastImeLang = localStorage.getItem('linkerx_last_ime_lang') || 'ko';
        let mappedKey = e.key;

        if (lastImeLang === 'ko') {
          const engToKor = {
            'a':'ㅁ', 'b':'ㅠ', 'c':'ㅊ', 'd':'ㅇ', 'e':'ㄷ', 'f':'ㄹ', 'g':'ㅎ', 'h':'ㅗ', 'i':'ㅑ', 'j':'ㅓ', 'k':'ㅏ', 'l':'ㅣ', 'm':'ㅡ', 'n':'ㅜ', 'o':'ㅐ', 'p':'ㅔ', 'q':'ㅂ', 'r':'ㄱ', 's':'ㄴ', 't':'ㅅ', 'u':'ㅕ', 'v':'ㅍ', 'w':'ㅈ', 'x':'ㅌ', 'y':'요', 'z':'ㅋ',
            'A':'ㅁ', 'B':'ㅠ', 'C':'ㅊ', 'D':'ㅇ', 'E':'ㄷ', 'F':'ㄹ', 'G':'ㅎ', 'H':'ㅗ', 'I':'ㅑ', 'J':'ㅓ', 'K':'ㅏ', 'L':'ㅣ', 'M':'ㅡ', 'N':'ㅜ', 'O':'ㅒ', 'P':'ㅖ', 'Q':'ㅃ', 'R':'ㄲ', 'S':'ㄴ', 'T':'ㅅ', 'U':'ㅕ', 'V':'ㅍ', 'W':'ㅉ', 'X':'ㅌ', 'Y':'요', 'Z':'ㅋ'
          };
          mappedKey = engToKor[e.key] || e.key;
        }

        if (isRange) {
          const startCol = Math.min(c1, c2);
          const endCol = Math.max(c1, c2);
          let allReceivables = true;
          for (let c = startCol; c <= endCol; c++) {
            if (!(isPartner && activeColumns[c]?.field === 'receivables')) {
              allReceivables = false;
              break;
            }
          }
          if (allReceivables) return;

          flushSync(() => {
            setIsBulkInputActive(true);
            setBulkInputValue(mappedKey); 
          });
        } else {
          const field = activeColumns[c1]?.field;
          if (isPartner && field === 'receivables') return;

          // Render cell input synchronously so it instantly mounts and registers further keypresses
          flushSync(() => {
            setEditingCell({ r: r1, c: c1, isDirectInput: true, pendingChar: mappedKey });
          });
        }
      }
      
      // Delete/Backspace for range or single cell
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const startRow = Math.min(r1, r2);
        const endRow = Math.max(r1, r2);
        const startCol = Math.min(c1, c2);
        const endCol = Math.max(c1, c2);

        const newData = [...data];
        let hasChanges = false;
        for (let r = startRow; r <= endRow; r++) {
          const visibleRow = visibleData[r];
          if (!visibleRow) continue;
          const idx = newData.findIndex(d => d.id === visibleRow.id);
          if (idx < 0) continue;

          for (let c = startCol; c <= endCol; c++) {
            const field = activeColumns[c].field;
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
            } else if (activeColumns[c].type !== 'boolean') {
              newData[idx] = { ...newData[idx], [field]: activeColumns[c].type === 'number' ? 0 : '' };
              hasChanges = true;
            }
          }
        }
        if (hasChanges) {
          setData(newData);
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
  }, [selection, editingCell, isBulkInputActive, data, columns, visibleData, activeColumns, handlePaste, isPartner]);

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
        const field = activeColumns[c].field;
        const type = activeColumns[c].type;
        
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
        } else {
          newData[idx] = { 
            ...newData[idx], 
            [field]: type === 'number' ? Number(val.replace(/,/g, '')) || 0 : val 
          };
        }
      }
    }
    setData(newData);
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

    setData(sortedData);
  };

  const handleChange = (visibleIndex, field, value) => {
    const visibleRow = visibleData[visibleIndex];
    if (!visibleRow) return;
    if (isPartner && field === 'receivables') return;
    const idx = data.findIndex(d => d.id === visibleRow.id);
    if (idx >= 0) {
      const newData = [...data];
      if (isPartner && field === 'receivableBase') {
        const oldBase = Number(newData[idx].receivableBase) || 0;
        const newBase = Number(value) || 0;
        const delta = newBase - oldBase;
        const oldReceivables = Number(newData[idx].receivables) || 0;
        newData[idx] = {
          ...newData[idx],
          receivableBase: newBase,
          receivables: oldReceivables + delta
        };
      } else {
        newData[idx] = { ...newData[idx], [field]: value };
      }
      setData(newData);
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
    const field = activeColumns[c]?.field;
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
    const newRows = Array.from({ length: count }, () => 
      activeColumns.reduce((acc, col) => {
        acc[col.field] = col.type === 'number' ? 0 : '';
        return acc;
      }, { id: Date.now() + Math.random() })
    );
    setData([...data, ...newRows]);
  };


  const handleRemoveRow = (visibleIndex) => {
    const visibleRow = visibleData[visibleIndex];
    if (!visibleRow) return;
    const newData = data.filter(d => d.id !== visibleRow.id);
    setData(newData);
  };

  const handleSave = () => {
    onSave(data);
    const message = isPartner ? '거래처 일괄 수정이 완료되었습니다.' : isProduct ? '품목 일괄 수정이 완료되었습니다.' : '변경사항이 성공적으로 적용되었습니다.';
    alert(message);
    onClose();
  };

  return (
    <WindowModal title={title} onClose={onClose} width="95vw">
      <div className="bulk-editor-container">
        <div className="bulk-editor-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="info-badge" style={{ padding: '8px 14px', borderRadius: '10px' }}>
            <AlertCircle size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.4' }}>
              드래그로 영역 선택이 가능하며, 선택 후 타이핑 시 일괄 수정됩니다.<br />
              <strong>[복사/붙여넣기 안내]</strong> 셀 선택 후 <strong>Ctrl+C</strong>로 복사, <strong>Ctrl+V</strong>로 복수 셀이나 엑셀 데이터를 자유롭게 붙여넣기 할 수 있습니다.
            </span>
          </div>
          <div className="bulk-actions" style={{ flexWrap: 'wrap', gap: '12px' }}>
            {/* Category Filter Dropdowns like ProductManagement */}
            {isProduct && categories && categories.length > 0 && (
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

            <div className="enter-direction-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '10px', padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>엔터 방향:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enterDirection === 'vertical'} onChange={() => setEnterDirection('vertical')} /> 세로
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enterDirection === 'horizontal'} onChange={() => setEnterDirection('horizontal')} /> 가로
              </label>
            </div>
            <div className="add-row-group">
              <span>행 추가:</span>
              <button onClick={() => handleAddRows(1)}>+1</button>
              <button onClick={() => handleAddRows(10)}>+10</button>
              <button onClick={() => handleAddRows(20)}>+20</button>
              <button onClick={() => handleAddRows(30)}>+30</button>
              <button onClick={() => handleAddRows(50)}>+50</button>
            </div>
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
                <th width="50px">삭제</th>
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

                    return (
                      <td 
                        key={col.field} 
                        data-row={rIdx}
                        data-col={cIdx}
                        className={`editable-cell ${isSelected ? 'selected' : ''} ${isEditing ? 'active-cell' : ''}`}
                        style={{ width: `${colWidths[col.field]}px` }}
                        onMouseDown={() => handleCellMouseDown(rIdx, cIdx)}
                        onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                        onDoubleClick={() => handleCellDoubleClick(rIdx, cIdx)}
                      >
                        {isEditing && col.type !== 'boolean' ? (
                          <EditableInput
                            initialValue={row[col.field] || ''}
                            isDirectInput={editingCell?.isDirectInput}
                            pendingChar={editingCell?.pendingChar}
                            onSave={(val, key) => {
                              handleChange(rIdx, col.field, col.type === 'number' ? Number(val) || 0 : val);
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
                            inputMode={col.type === 'number' ? 'numeric' : 'text'}
                            style={{ 
                              textAlign: col.type === 'number' ? 'right' : 'left',
                              imeMode: 'active'
                            }}
                          />
                        ) : isFirstSelected && col.type !== 'boolean' ? (
                          <EditableInput
                            initialValue={bulkInputValue}
                            isDirectInput={true}
                            pendingChar={bulkInputValue}
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
                            inputMode={col.type === 'number' ? 'numeric' : 'text'}
                            style={{ 
                              width: '100%', border: 'none', background: '#fff', 
                              boxShadow: '0 0 0 2px #3b82f6', outline: 'none',
                              zIndex: 30,
                              textAlign: col.type === 'number' ? 'right' : 'left',
                              imeMode: 'active'
                            }}
                          />
                        ) : (
                          <div className="cell-display" style={{ justifyContent: col.type === 'number' ? 'flex-end' : 'center' }}>
                            {col.type === 'boolean' ? (
                              <input 
                                type="checkbox" 
                                checked={row[col.field] !== false} 
                                onChange={(e) => handleChange(rIdx, col.field, e.target.checked)}
                              />
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
                  <td className="action-cell">
                    <button className="btn-delete-row" onClick={() => handleRemoveRow(rIdx)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleData.length === 0 && (
            <div className="empty-bulk">
              {isProduct && selectedLargeId !== '전체' ? '선택한 카테고리에 해당하는 품목이 없습니다.' : '편집할 데이터가 없습니다. 행 추가를 클릭하여 데이터를 입력하세요.'}
            </div>
          )}
        </div>
      </div>
    </WindowModal>
  );
};

export default BulkEditor;
