import React, { useState, useEffect } from 'react';
import { Package, Download, X, Share } from 'lucide-react';
import './PwaInstallPrompt.css';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTutorial, setShowIosTutorial] = useState(false);

  useEffect(() => {
    // 1. Detect if PWA is already running in standalone/app mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // 2. Detect User Agent
    const ua = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const detectIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(detectIOS);

    // 3. Handle beforeinstallprompt event (Android / Desktop Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Fallback for iOS Safari (which doesn't support beforeinstallprompt)
    if (detectIOS) {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Toggle tutorial steps for iOS Safari
      setShowIosTutorial(!showIosTutorial);
      return;
    }

    if (!deferredPrompt) return;

    // Trigger Chrome/Android PWA prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice: ${outcome}`);
    
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="pwa-install-banner">
      <div className="pwa-banner-header">
        <div className="pwa-app-icon">
          <Package size={24} color="white" />
        </div>
        <div className="pwa-app-info">
          <h4>Linker X 모바일 앱 설치</h4>
          <p>
            홈 화면에 앱을 추가하여 브라우저 주소창 없이 모바일 앱처럼 깔끔하고 쾌적하게 사용해 보세요.
          </p>
        </div>
        <button 
          onClick={handleDismiss} 
          style={{ color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          title="닫기"
        >
          <X size={18} />
        </button>
      </div>

      {!showIosTutorial ? (
        <div className="pwa-banner-actions">
          <button className="pwa-btn-later" onClick={handleDismiss}>
            나중에
          </button>
          <button className="pwa-btn-install" onClick={handleInstallClick}>
            <Download size={14} style={{ marginRight: '6px', display: 'inline' }} />
            {isIOS ? '설치 안내 보기' : '앱 설치하기'}
          </button>
        </div>
      ) : (
        <div className="ios-tutorial-panel">
          <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.82rem' }}>
             iOS Safari 설치 방법:
          </div>
          <div className="ios-step">
            <span className="ios-icon-badge">1단계</span>
            <span>Safari 브라우저 하단의 <strong>공유 아이콘</strong> <Share size={14} style={{ display: 'inline', margin: '0 2px' }} /> 을 누릅니다.</span>
          </div>
          <div className="ios-step">
            <span className="ios-icon-badge">2단계</span>
            <span>메뉴를 아래로 스크롤하여 <strong>'홈 화면에 추가'</strong>를 선택합니다.</span>
          </div>
          <div className="ios-step">
            <span className="ios-icon-badge">3단계</span>
            <span>우측 상단의 <strong>'추가'</strong> 버튼을 눌러 홈 화면에서 앱을 실행합니다.</span>
          </div>
          <button 
            className="pwa-btn-later" 
            style={{ width: '100%', marginTop: '8px', padding: '8px' }} 
            onClick={handleDismiss}
          >
            확인했습니다
          </button>
        </div>
      )}
    </div>
  );
}
