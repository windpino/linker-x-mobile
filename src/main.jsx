import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

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

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.dataset.rendered = 'true';
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
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
