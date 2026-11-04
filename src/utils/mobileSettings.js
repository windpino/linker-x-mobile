/**
 * Linker X - Mobile Dedicated Independent Settings
 * 데스크탑과 완전히 분리되어 모바일 디바이스 환경만 독립적으로 제어합니다.
 */

export const DEFAULT_MOBILE_SETTINGS = {
  enableButtonSound: true,       // 모든 모바일 버튼 터치/클릭 시 효과음 사용 (기본 ON)
  soundVolume: 0.15,             // 효과음 볼륨 (0.05 ~ 0.5)
  soundTone: 'pop',             // 효과음 종류: 'pop' (깔끔한 팝), 'click' (타건음), 'chime' (맑은 벨), 'soft' (부드러운 탭)
  enableHaptic: true,           // 모바일 터치 진동(햅틱) 피드백 (기본 ON)
  enableMissRing: true,         // 모바일 미스링 AI 비서 활성화
  fontScale: 100,               // 모바일 글자 가독성 배율 (%: 95, 100, 105, 110, 115)
  showMenuIcons: true,          // 드로어 및 퀵메뉴 아이콘(이모지) 표시
  enableCompactMode: false      // 모바일 고밀도 간편 모드
};

const STORAGE_KEY = 'linkerx_mobile_standalone_settings';

export const getMobileSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_MOBILE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('[MobileSettings] Failed to load settings from localStorage:', e);
  }
  return { ...DEFAULT_MOBILE_SETTINGS };
};

export const saveMobileSettings = (newSettings) => {
  try {
    const current = getMobileSettings();
    const merged = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    // Broadcast event for live reactivity across all components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('linkerx_mobile_settings_changed', { detail: merged }));
    }
    return merged;
  } catch (e) {
    console.warn('[MobileSettings] Failed to save settings to localStorage:', e);
    return newSettings;
  }
};

export const resetMobileSettings = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('linkerx_mobile_settings_changed', { detail: { ...DEFAULT_MOBILE_SETTINGS } }));
    }
    return { ...DEFAULT_MOBILE_SETTINGS };
  } catch (e) {
    console.warn('[MobileSettings] Failed to reset settings:', e);
    return { ...DEFAULT_MOBILE_SETTINGS };
  }
};

export const subscribeMobileSettings = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const handler = (e) => {
    callback(e.detail);
  };

  window.addEventListener('linkerx_mobile_settings_changed', handler);
  return () => {
    window.removeEventListener('linkerx_mobile_settings_changed', handler);
  };
};
