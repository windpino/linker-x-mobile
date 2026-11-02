import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { singleInstanceManager } from '../utils/singleInstanceManager';

export default function SingleInstanceModal({ existingInfo }) {
  const [hasRequestedFocus, setHasRequestedFocus] = useState(false);

  // Automatically signal existing window as soon as duplicate window opens
  useEffect(() => {
    singleInstanceManager.focusExistingWindow();
  }, []);

  const handleFocusExisting = () => {
    singleInstanceManager.focusExistingWindow();
    setHasRequestedFocus(true);

    // 1. Standard window close
    try {
      window.close();
    } catch (e) {}

    // 2. Chromium workaround for window opened by user
    try {
      window.open('', '_self', '');
      window.close();
    } catch (e) {}

    // 3. Fallback retry
    setTimeout(() => {
      try {
        window.close();
      } catch (e) {}
    }, 150);
  };

  const userName = existingInfo?.userName;
  const companyName = existingInfo?.companyName;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '28px 20px 24px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Warning Icon Badge */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
          border: '2px solid #fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 16px -4px rgba(239, 68, 68, 0.2)'
        }}>
          <AlertTriangle size={32} color="#ef4444" strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 10px 0',
          letterSpacing: '-0.02em'
        }}>
          이미 실행되어 있습니다
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '0.88rem',
          color: '#475569',
          lineHeight: '1.55',
          margin: '0 0 16px 0'
        }}>
          링커엑스 프로그램이 <strong style={{ color: '#ef4444' }}>이미 다른 창에서 실행 중</strong>입니다.<br />
          데이터 충돌 및 중복 전표 입력을 방지하기 위해 링커엑스는 <strong style={{ color: '#0f172a' }}>하나의 창에서만 실행</strong>됩니다.
        </p>

        {/* Running Account Details Box (If available) */}
        {(userName || companyName) && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '18px',
            fontSize: '0.82rem',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={15} color="#3b82f6" />
            <span>
              현재 실행 계정: <strong>{companyName ? `${companyName} - ` : ''}{userName}</strong>
            </span>
          </div>
        )}

        {/* Guidance when focus is requested */}
        {hasRequestedFocus && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: '#1d4ed8',
            lineHeight: '1.45',
            textAlign: 'center'
          }}>
            💡 기존 실행 창으로 전환 신호를 보냈습니다.<br />
            <strong>현재 창이 자동으로 닫히지 않는 경우 상단 [X] (닫기) 버튼을 눌러 창을 닫아주세요.</strong>
          </div>
        )}

        {/* Action Button: only the close & focus existing button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleFocusExisting}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 18px',
              backgroundColor: '#e62e2e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.94rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(230, 46, 46, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <ExternalLink size={17} />
            기존 창으로 이동 (현재 창 닫기)
          </button>
        </div>
      </div>
    </div>
  );
}
