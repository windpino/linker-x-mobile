import Inko from 'inko';

const inko = new Inko();

export const convertEnToKo = (str) => {
  if (!str || typeof str !== 'string') return "";
  return inko.en2ko(str);
};

export const getInitialSound = (str) => {
  if (!str || typeof str !== 'string') return "";
  const initialSounds = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) result += initialSounds[Math.floor(code / 588)];
    else result += str.charAt(i);
  }
  return result;
};

export const matchesInitialSound = (target, search) => {
  if (!search) return true;
  if (!target || typeof target !== 'string') return false;
  const targetInitials = getInitialSound(target);
  const searchInitials = getInitialSound(search);
  
  // If search contains only initials, compare with target initials
  const onlyInitials = /^[ㄱ-ㅎ]+$/.test(search);
  if (onlyInitials) {
    return targetInitials.includes(search);
  }
  
  // Otherwise, standard includes
  return target.toLowerCase().includes(search.toLowerCase());
};


