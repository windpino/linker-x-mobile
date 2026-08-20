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
    <div className="pwa-install-banner" style={{
      position: 'fixed',
      bottom: '12px',
      left: '12px',
      right: '12px',
      maxWidth: '460px',
      margin: '0 auto',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 99999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      animation: 'slideUpPrompt 0.3s ease'
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        backgroundColor: '#2563eb', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0
      }}>
        <Package size={18} color="white" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Linker X 모바일 앱 설치
        </div>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          홈 화면에 추가하여 앱처럼 사용
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          style={{
            backgroundColor: '#3b82f6', color: 'white', border: 'none',
            borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem',
            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <Download size={12} />
          {isIOS ? '안내' : '설치'}
        </button>
        <button
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
          title="닫기"
        >
          <X size={16} />
        </button>
      </div>

      {showIosTutorial && (
        <div className="ios-tutorial-panel" style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0,
          marginBottom: '8px', backgroundColor: '#1e293b', padding: '12px',
          borderRadius: '12px', border: '1px solid #334155'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.8rem', color: 'white' }}>
             iOS Safari 설치 방법:
          </div>
          <div className="ios-step" style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
            1. Safari 브라우저 하단 <strong>공유 아이콘</strong>을 누릅니다.
          </div>
          <div className="ios-step" style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
            2. 메뉴에서 <strong>'홈 화면에 추가'</strong>를 선택합니다.
          </div>
        </div>
      )}
    </div>
  );
}
