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

const stripCorp = (name) => (name || '').replace(/^(\(주\)|주식회사|\(유\)|유한회사|\(합\)|합자회사)\s*/i, '');

const checkSingleMatch = (target, search) => {
  if (!search) return true;
  if (!target || typeof target !== 'string') return false;
  const s = search.trim();
  if (!s) return true;

  const tLower = target.toLowerCase();
  const sLower = s.toLowerCase();

  // 1. 단어/부분 문자열 일치 (e.g. '삼양', '유통', '대림')
  if (tLower.includes(sLower)) return true;

  // 2. 공백 제거 후 일치 (e.g. '강남 유통' <-> '강남유통')
  const tNoSpace = tLower.replace(/\s+/g, '');
  const sNoSpace = sLower.replace(/\s+/g, '');
  if (tNoSpace.includes(sNoSpace)) return true;

  // 3. 초성만 있는 경우 (e.g. 'ㅅ', 'ㄱ', 'ㅅㅇ', 'ㄷㄹ')
  const isChosungOnly = /^[ㄱ-ㅎ\s]+$/.test(s);
  if (isChosungOnly) {
    const tInit = getInitialSound(target);
    const tInitNoSpace = tInit.replace(/\s+/g, '');
    const sInitNoSpace = s.replace(/\s+/g, '');

    // 단일 초성 검색인 경우 (e.g. 'ㅅ', 'ㄱ', 'ㄷ')
    // 회사명 시작 초성이 일치하거나, 단어별 첫 글자 초성이 일치할 때만 매칭 (아무 글자나 포함되는 것 방지)
    if (sInitNoSpace.length === 1) {
      const stripped = stripCorp(target);
      const strippedInit = getInitialSound(stripped);
      if (strippedInit.startsWith(sInitNoSpace)) return true;
      const words = target.split(/\s+/);
      if (words.some(w => getInitialSound(stripCorp(w)).startsWith(sInitNoSpace))) return true;
      return false;
    }

    // 2글자 이상 초성 검색인 경우 (e.g. 'ㅅㅇ', 'ㄷㄹ', 'ㄱㄴㅇㅌ', 'ㅁㅅ')
    if (tInitNoSpace.includes(sInitNoSpace)) return true;
    const strippedInit = getInitialSound(stripCorp(target)).replace(/\s+/g, '');
    if (strippedInit.includes(sInitNoSpace)) return true;
    return false;
  }

  // 4. 초성+음절 혼합 검색 (e.g. '대ㄹ', '삼ㅇ')
  const reg = makeChoseongRegex(s);
  if (reg && (reg.test(target) || reg.test(tNoSpace))) return true;

  // 5. 전체 초성 포함 확인 (초성 이외 특수문자 포함 등 보조 확인)
  const tInit = getInitialSound(target);
  if (tInit.includes(s)) return true;

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



