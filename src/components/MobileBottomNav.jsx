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
          gap: 2px;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .mob-nav-item:active {
          transform: scale(0.92);
        }
        .mob-nav-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .mob-center-plus {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
          border: 2px solid #0f172a;
          margin-top: -14px;
          transition: transform 0.15s ease;
        }
        .mob-center-plus:active {
          transform: scale(0.9);
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

      {/* 2. 수주목록 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenOrderList) onOpenOrderList();
        }}
        title="수주 목록 및 상차 조회"
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
          수주목록
        </span>
      </button>

      {/* 3. 중앙 수주등록 원터치 버튼 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenSalesOrder) onOpenSalesOrder();
        }}
        title="새 수주 등록"
        style={{ position: 'relative' }}
      >
        <div className="mob-center-plus">
          <Plus size={24} strokeWidth={2.8} />
        </div>
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'sales_order' ? '#38bdf8' : '#cbd5e1', marginTop: '2px' }}
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
        title="재고 이동 및 이력"
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
