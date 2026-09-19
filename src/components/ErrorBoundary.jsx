import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Mobile App Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('autoLogin');
      localStorage.removeItem('favoriteMenus');
      localStorage.removeItem('dashboardConfig');
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#f1f5f9',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", Roboto, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
            화면 로딩 중 오류가 발생했습니다
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.5, maxWidth: '320px' }}>
            일시적인 캐시 또는 네트워크 상태로 인해 화면을 표시하지 못했습니다. 아래 버튼을 눌러 새로고침해 주세요.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
            <button
              onClick={this.handleReload}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} /> 화면 새로고침
            </button>

            <button
              onClick={this.handleResetCache}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} /> 캐시 초기화 후 재접속
            </button>
          </div>

          {this.state.error && (
            <details style={{ marginTop: '30px', textAlign: 'left', width: '100%', maxWidth: '340px' }}>
              <summary style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>오류 상세 정보 보기</summary>
              <pre style={{
                marginTop: '8px',
                padding: '10px',
                backgroundColor: '#1e293b',
                borderRadius: '6px',
                fontSize: '0.7rem',
                color: '#f87171',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
