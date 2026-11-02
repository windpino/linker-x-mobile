import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import SingleInstanceModal from './components/SingleInstanceModal.jsx'
import { singleInstanceManager } from './utils/singleInstanceManager'

// ─────────────────────────────────────────────────────────
// 모바일 뷰포트 높이 보정 (주소창 포함/제외 차이 해결)
// --vh 변수를 실제 inner height 기준으로 설정
// ─────────────────────────────────────────────────────────
const setVh = () => {
  try {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  } catch (e) {}
};
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', () => {
  // 화면 회전 시 약간의 딜레이 후 재측정 (iOS 대응)
  setTimeout(setVh, 100);
});

function AppWithSingleInstance() {
  const [instanceState, setInstanceState] = useState({
    isPrimary: true,
    isDuplicate: false,
    existingInfo: null,
    focusAlert: false
  });

  useEffect(() => {
    const unsubscribe = singleInstanceManager.subscribe((state) => {
      setInstanceState(state);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {instanceState.isDuplicate && (
        <SingleInstanceModal existingInfo={instanceState.existingInfo} />
      )}
      {instanceState.focusAlert && (
        <div style={{
          position: 'fixed',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100vw - 24px)',
          maxWidth: '400px',
          zIndex: 9999999,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '14px',
          boxShadow: '0 16px 32px -8px rgba(0, 0, 0, 0.6), 0 0 0 2px #3b82f6',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.84rem',
          fontWeight: 700,
          pointerEvents: 'none',
          boxSizing: 'border-box',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>🔔</span>
          <span style={{ lineHeight: 1.4 }}>새 창 실행이 감지되어 <strong>기존 링커엑스 창</strong>이 활성화되었습니다.</span>
        </div>
      )}
      <App />
    </>
  );
}

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.dataset.rendered = 'true';
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <AppWithSingleInstance />
        </ErrorBoundary>
      </StrictMode>,
    );
  }
} catch (err) {
  console.error('Fatal initialization error in main.jsx:', err);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.removeAttribute('data-rendered');
    if (typeof window.__hardResetApp === 'function') {
      window.location.reload();
    }
  }
}
