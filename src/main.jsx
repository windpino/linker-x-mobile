import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ─────────────────────────────────────────────────────────
// 모바일 뷰포트 높이 보정 (주소창 포함/제외 차이 해결)
// --vh 변수를 실제 inner height 기준으로 설정
// ─────────────────────────────────────────────────────────
const setVh = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', () => {
  // 화면 회전 시 약간의 딜레이 후 재측정 (iOS 대응)
  setTimeout(setVh, 100);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
