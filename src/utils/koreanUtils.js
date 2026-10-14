import Inko from 'inko';

const inko = new Inko();

export const convertEnToKo = (str) => {
  if (!str || typeof str !== 'string') return "";
  return inko.en2ko(str);
};

export const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// Normalize decomposed Jamo (U+1100~U+1112) to Compatibility Jamo (U+3131~)
export const normalizeJamo = (str) => {
  if (!str || typeof str !== 'string') return "";
  return str.normalize('NFC').replace(/[\u1100-\u1112]/g, (ch) => {
    const code = ch.charCodeAt(0) - 0x1100;
    return CHOSUNG[code] || ch;
  });
};

export const getInitialSound = (str) => {
  if (!str || typeof str !== 'string') return "";
  const normalized = normalizeJamo(str);
  let result = "";
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) {
      result += CHOSUNG[Math.floor(code / 588)];
    } else {
      result += normalized.charAt(i);
    }
  }
  return result;
};

// Builds a dynamic regular expression matching both full syllables and initial consonants
export const makeChoseongRegex = (search) => {
  if (!search) return null;
  const clean = search.trim();
  if (!clean) return null;
  let pattern = '';
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === ' ') {
      pattern += '\\s*';
      continue;
    }
    const chIdx = CHOSUNG.indexOf(ch);
    if (chIdx !== -1) {
      const startCode = 44032 + (chIdx * 588);
      const endCode = startCode + 587;
      pattern += '[' + String.fromCharCode(startCode) + '-' + String.fromCharCode(endCode) + ch + ']';
    } else {
      pattern += ch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
  }
  try {
    return new RegExp(pattern, 'i');
  } catch (e) {
    return null;
  }
};

const checkSingleMatch = (target, search) => {
  if (!search) return true;
  if (!target || typeof target !== 'string') return false;
  const s = search.trim();
  if (!s) return true;

  // 1. Direct includes (case-insensitive)
  if (target.toLowerCase().includes(s.toLowerCase())) return true;

  // 2. Choseong regex matching
  const reg = makeChoseongRegex(s);
  if (reg && reg.test(target)) return true;

  // 3. Normalized target without spaces / special characters
  const targetClean = target.replace(/[^가-힣a-zA-Z0-9]/g, '');
  const searchClean = s.replace(/[^가-힣a-zA-Z0-9ㄱ-ㅎ]/g, '');
  if (reg && reg.test(targetClean)) return true;
  if (searchClean && targetClean.toLowerCase().includes(searchClean.toLowerCase())) return true;

  // 4. Initial sounds match (both raw and cleaned)
  const tInit = getInitialSound(target);
  const tInitClean = getInitialSound(targetClean);
  if (tInit.includes(s) || (searchClean && tInitClean.includes(searchClean))) return true;

  return false;
};

export const matchesInitialSound = (target, search) => {
  if (!search) return true;
  if (!target || typeof target !== 'string') return false;

  const normSearch = normalizeJamo(search);
  if (checkSingleMatch(target, normSearch)) return true;

  // Also check English keyboard typo conversion (e.g. 'rs' -> 'ㄱㄴ', 'tkatjd' -> '삼성')
  const converted = convertEnToKo(normSearch);
  if (converted && converted !== normSearch && checkSingleMatch(target, converted)) {
    return true;
  }

  return false;
};



