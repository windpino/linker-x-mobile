/**
 * Linker X - Mobile UI Audio & Haptic Feedback System
 * Web Audio API를 활용한 제로 레이턴시 버튼 클릭 효과음 및 진동 엔진
 */

import { getMobileSettings } from './mobileSettings';

let sharedAudioCtx = null;
let currentMobileSettings = getMobileSettings();

// Listen for live mobile settings updates
if (typeof window !== 'undefined') {
  window.addEventListener('linkerx_mobile_settings_changed', (e) => {
    currentMobileSettings = e.detail;
  });
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }

  return sharedAudioCtx;
}

/**
 * Play synthesized sound based on tone type and volume
 */
export const playButtonClickSound = (customTone = null, customVolume = null) => {
  const settings = currentMobileSettings || getMobileSettings();

  // 1. Check if sound is enabled
  const soundEnabled = settings.enableButtonSound !== false;
  const tone = customTone || settings.soundTone || 'pop';
  const volume = typeof customVolume === 'number' ? customVolume : (settings.soundVolume || 0.15);

  // 2. Trigger Haptic (Vibration) feedback on mobile devices
  if (settings.enableHaptic && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(8);
    } catch {
      // Ignore vibration error
    }
  }

  if (!soundEnabled) return;

  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    if (tone === 'click') {
      // Crisp mechanical click
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);

      gain.gain.setValueAtTime(volume * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.start(now);
      osc.stop(now + 0.02);

    } else if (tone === 'chime') {
      // Pleasant dual bell chime
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc2.frequency.setValueAtTime(1320, now); // E6

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.07);
      osc2.stop(now + 0.07);

    } else if (tone === 'soft') {
      // Gentle soft bubble tap
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.03);

      gain.gain.setValueAtTime(volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.start(now);
      osc.stop(now + 0.03);

    } else {
      // Default: Modern clean "pop"
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.035);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.start(now);
      osc.stop(now + 0.035);
    }
  } catch (e) {
    console.warn("Audio playback issue:", e);
  }
};

/**
 * Backward compatibility alias for playMenuClickSound
 */
export const playMenuClickSound = () => {
  playButtonClickSound();
};

/**
 * 상차 체크 시 경쾌하고 높은 톤의 상승 사운드
 */
export const playLoadSound = () => {
  const settings = currentMobileSettings || getMobileSettings();
  if (settings.enableButtonSound === false) return;
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    // Rising chime tone (800Hz -> 1400Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);

    const volume = settings.soundVolume || 0.15;
    gain.gain.setValueAtTime(volume * 1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
};

/**
 * 상차 취소 / 풀기 시 부드럽고 낮은 톤의 하강 사운드
 */
export const playUnloadSound = () => {
  const settings = currentMobileSettings || getMobileSettings();
  if (settings.enableButtonSound === false) return;
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    // Falling lower tone (950Hz -> 420Hz)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    const volume = settings.soundVolume || 0.15;
    gain.gain.setValueAtTime(volume * 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
};

/**
 * 가려진 메뉴 / 필터 보이기 및 가리기 토글 전용 차별화된 효과음
 * 경쾌한 2단 찰칵/스위치 사운드 (일반 메뉴 클릭음과 명확히 구별)
 */
export const playToggleSound = (isOpening = true) => {
  const settings = currentMobileSettings || getMobileSettings();
  if (settings.enableButtonSound === false) return;
  if (settings.enableHaptic && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([6, 15, 8]);
    } catch {}
  }

  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const volume = settings.soundVolume || 0.15;

    // Dual-stage tactile switch pulse
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    if (isOpening) {
      // Opening/Showing: Low -> High snappy switch (650Hz -> 1550Hz)
      osc1.frequency.setValueAtTime(650, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.02);
      osc2.frequency.setValueAtTime(1200, now + 0.015);
      osc2.frequency.exponentialRampToValueAtTime(1850, now + 0.04);
    } else {
      // Closing/Hiding: High -> Low snappy latch (1600Hz -> 580Hz)
      osc1.frequency.setValueAtTime(1600, now);
      osc1.frequency.exponentialRampToValueAtTime(950, now + 0.02);
      osc2.frequency.setValueAtTime(950, now + 0.015);
      osc2.frequency.exponentialRampToValueAtTime(480, now + 0.04);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(volume * 1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc1.start(now);
    osc1.stop(now + 0.025);
    osc2.start(now + 0.015);
    osc2.stop(now + 0.045);
  } catch (e) {
    console.warn("Toggle audio playback issue:", e);
  }
};

/**
 * Preview sound effect for settings modal
 */
export const testSound = (tone, volume) => {
  playButtonClickSound(tone, volume);
};

/**
 * Global capture-phase button sound interceptor
 * 모든 모바일 화면의 버튼, 탭, 체크박스 터치 시 자동 재생
 */
export const initGlobalButtonSound = () => {
  if (typeof window === 'undefined') return () => {};

  let lastClickTime = 0;

  const handleClick = (e) => {
    const settings = currentMobileSettings || getMobileSettings();
    if (!settings.enableButtonSound && !settings.enableHaptic) return;

    const target = e.target;
    if (!target) return;

    // Check if target is inside an interactive button/element
    const clickable = target.closest(
      'button, [role="button"], a, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], select, .quick-chip-btn, .fav-menu-card, .clickable, .tab-btn, [data-menu-item], .chat-trigger-btn'
    );

    if (clickable) {
      const now = Date.now();
      // Throttle rapid repeated triggers within 35ms
      if (now - lastClickTime < 35) return;
      lastClickTime = now;

      // Check if this is a toggle button (보이기, 가리기, 접기, 펼치기 등)
      const text = clickable.innerText || clickable.getAttribute('title') || clickable.getAttribute('aria-label') || '';
      const isToggle = clickable.matches('[data-toggle], .toggle-btn, .collapse-toggle, [aria-expanded]') ||
                       text.includes('보이기') || text.includes('가리기') || text.includes('접기') || text.includes('펼치기') ||
                       clickable.querySelector('svg.lucide-chevron-down, svg.lucide-chevron-up');

      if (isToggle) {
        const isHiding = text.includes('가리기') || text.includes('접기');
        playToggleSound(!isHiding);
        return;
      }

      playButtonClickSound();
    }
  };

  // Add click listener in capture phase so it fires across all components
  document.addEventListener('click', handleClick, true);

  return () => {
    document.removeEventListener('click', handleClick, true);
  };
};
