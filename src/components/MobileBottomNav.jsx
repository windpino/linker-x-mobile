import React from 'react';
import { Home, FileText, Plus, ArrowLeftRight, Menu } from 'lucide-react';
import { playButtonClickSound } from '../utils/audio';

const MobileBottomNav = ({
  activeTab = 'home',
  onGoHome,
  onOpenOrderList,
  onOpenSalesOrder,
  onOpenInventoryTransfer,
  onToggleMenu
}) => {
  return (
    <nav className="mobile-bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '56px',
      backgroundColor: '#0f172a',
      borderTop: '1px solid #1e293b',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 9990,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      userSelect: 'none',
      backdropFilter: 'blur(10px)',
      boxSizing: 'content-box'
    }}>
      <style>{`
        @media (min-width: 901px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
        .mob-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 0 2px 0;
          transition: all 0.15s ease;
          gap: 3px;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .mob-nav-item:active {
          transform: scale(0.92);
        }
        .mob-nav-label {
          font-size: 0.70rem;
          font-weight: 700;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .mob-nav-center-fab {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.55), 0 0 0 3px #0f172a;
          margin-top: -16px;
          border: 1.5px solid #60a5fa;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .mob-nav-item:active .mob-nav-center-fab {
          transform: scale(0.92);
        }
      `}</style>

      {/* 1. 홈 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onGoHome) onGoHome();
        }}
        title="홈 화면"
      >
        <Home 
          size={20} 
          color={activeTab === 'home' ? '#38bdf8' : '#94a3b8'} 
          strokeWidth={activeTab === 'home' ? 2.5 : 2} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'home' ? '#38bdf8' : '#94a3b8' }}
        >
          홈
        </span>
      </button>

      {/* 2. 수주·상차 목록 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenOrderList) onOpenOrderList();
        }}
        title="수주목록 및 상차 체크"
      >
        <FileText 
          size={20} 
          color={activeTab === 'order_list' ? '#38bdf8' : '#94a3b8'} 
          strokeWidth={activeTab === 'order_list' ? 2.5 : 2} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'order_list' ? '#38bdf8' : '#94a3b8' }}
        >
          수주·상차
        </span>
      </button>

      {/* 3. 빠른 수주등록 (중앙 강조 FAB) */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenSalesOrder) onOpenSalesOrder();
        }}
        title="빠른 수주 등록"
      >
        <div className="mob-nav-center-fab">
          <Plus size={24} color="#ffffff" strokeWidth={2.8} />
        </div>
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'sales_order' ? '#60a5fa' : '#e2e8f0', marginTop: '1px' }}
        >
          수주등록
        </span>
      </button>

      {/* 4. 재고이동 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenInventoryTransfer) onOpenInventoryTransfer();
        }}
        title="재고이동"
      >
        <ArrowLeftRight 
          size={20} 
          color={activeTab === 'inventory_transfer' ? '#38bdf8' : '#94a3b8'} 
          strokeWidth={activeTab === 'inventory_transfer' ? 2.5 : 2} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'inventory_transfer' ? '#38bdf8' : '#94a3b8' }}
        >
          재고이동
        </span>
      </button>

      {/* 5. 전체메뉴 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onToggleMenu) onToggleMenu();
        }}
        title="전체 메뉴 열기"
      >
        <Menu 
          size={20} 
          color={activeTab === 'menu' ? '#38bdf8' : '#94a3b8'} 
          strokeWidth={activeTab === 'menu' ? 2.5 : 2} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'menu' ? '#38bdf8' : '#94a3b8' }}
        >
          전체메뉴
        </span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
