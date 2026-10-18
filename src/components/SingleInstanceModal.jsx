import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { singleInstanceManager } from '../utils/singleInstanceManager';

export default function SingleInstanceModal({ existingInfo }) {
  const [hasRequestedFocus, setHasRequestedFocus] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  const handleFocusExisting = () => {
    singleInstanceManager.focusExistingWindow();
    setHasRequestedFocus(true);
    // Attempt to close this tab/window
    try {
      window.close();
    } catch (e) {}
  };

  const handleTakeover = () => {
    setIsTakingOver(true);
    singleInstanceManager.takeoverToThisWindow();
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
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '36px 32px 30px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Warning Icon Badge */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
          border: '2px solid #fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 16px -4px rgba(239, 68, 68, 0.2)'
        }}>
          <AlertTriangle size={38} color="#ef4444" strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 12px 0',
          letterSpacing: '-0.02em'
        }}>
          이미 실행되어 있습니다
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '0.94rem',
          color: '#475569',
          lineHeight: '1.6',
          margin: '0 0 20px 0'
        }}>
          링커엑스 프로그램이 <strong style={{ color: '#ef4444' }}>이미 다른 창에서 실행 중</strong>입니다.<br />
          데이터 충돌 및 중복 전표 입력을 방지하기 위해 링커엑스는 <strong style={{ color: '#0f172a' }}>하나의 창에서만 실행</strong>됩니다.
        </p>

        {/* Running Account Details Box (If available) */}
        {(userName || companyName) && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '0.85rem',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} color="#3b82f6" />
            <span>
              현재 실행 계정: <strong>{companyName ? `${companyName} - ` : ''}{userName}</strong>
            </span>
          </div>
        )}

        {/* Focus guidance notice if user clicked focus */}
        {hasRequestedFocus && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.84rem',
            color: '#1d4ed8',
            lineHeight: '1.5'
          }}>
            💡 기존 실행 창으로 전환되었습니다.<br />
            <strong>현재 브라우저 창(탭)을 닫아주세요.</strong>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleFocusExisting}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 20px',
              backgroundColor: '#e62e2e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(230, 46, 46, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <ExternalLink size={18} />
            기존 창으로 이동 (창 닫기)
          </button>

          <button
            onClick={handleTakeover}
            disabled={isTakingOver}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: isTakingOver ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isTakingOver ? 0.6 : 1
            }}
          >
            <RefreshCw size={15} className={isTakingOver ? 'animate-spin' : ''} />
            {isTakingOver ? '창 전환 중...' : '현재 창에서 계속 실행하기 (기존 창 전환)'}
          </button>
        </div>
      </div>
    </div>
  );
}
