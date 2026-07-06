/**
 * Utility for playing UI sound effects using Web Audio API
 */

export const playMenuClickSound = () => {
  try {
    // Create AudioContext (works after user interaction)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Design: A subtle, clean "pop" sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.04);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.04);
    
    // Cleanup
    setTimeout(() => {
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    }, 100);
  } catch (e) {
    // Silently fail if audio is blocked or unsupported
    console.warn("Audio playback issue:", e);
  }
};
