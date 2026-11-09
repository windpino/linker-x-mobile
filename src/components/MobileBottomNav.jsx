import React from 'react';
import { Home, FileText, ShoppingCart, ArrowLeftRight, FileOutput, Menu } from 'lucide-react';
import { playButtonClickSound } from '../utils/audio';
import { hasMobileMenuPermission } from '../utils/menuPermissions';

const MobileBottomNav = ({
  activeTab = 'home',
  currentUser,
  onGoHome,
  onOpenOrderList,
  onOpenSalesOrder,
  onOpenSalesInvoice,
  onOpenInventoryTransfer,
  onToggleMenu
}) => {
  const canOrder = !currentUser || hasMobileMenuPermission(currentUser, '모바일_수주');
  const canLoading = !currentUser || hasMobileMenuPermission(currentUser, '모바일_상차');
  const canTransfer = !currentUser || hasMobileMenuPermission(currentUser, '모바일_재고이동');
  const canInvoice = !currentUser || hasMobileMenuPermission(currentUser, '모바일_매출전표발행');

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
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: -0.3px;
          line-height: 1;
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
          size={19} 
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

      {/* 2. 수주 */}
      {canOrder && (
        <button 
          className="mob-nav-item"
          onClick={() => {
            playButtonClickSound();
            if (onOpenSalesOrder) onOpenSalesOrder();
          }}
          title="수주 등록"
        >
          <ShoppingCart 
            size={19} 
            color={activeTab === 'sales_order' ? '#38bdf8' : '#94a3b8'} 
            strokeWidth={activeTab === 'sales_order' ? 2.5 : 2} 
          />
          <span 
            className="mob-nav-label" 
            style={{ color: activeTab === 'sales_order' ? '#38bdf8' : '#94a3b8' }}
          >
            수주
          </span>
        </button>
      )}

      {/* 3. 상차 */}
      {canLoading && (
        <button 
          className="mob-nav-item"
          onClick={() => {
            playButtonClickSound();
            if (onOpenOrderList) onOpenOrderList();
          }}
          title="상차 체크 및 수주목록"
        >
          <FileText 
            size={19} 
            color={activeTab === 'order_list' ? '#34d399' : '#94a3b8'} 
            strokeWidth={activeTab === 'order_list' ? 2.5 : 2} 
          />
          <span 
            className="mob-nav-label" 
            style={{ color: activeTab === 'order_list' ? '#34d399' : '#94a3b8' }}
          >
            상차
          </span>
        </button>
      )}

      {/* 4. 매출전표발행 */}
      {canInvoice && (
        <button 
          className="mob-nav-item"
          onClick={() => {
            playButtonClickSound();
            if (onOpenSalesInvoice) onOpenSalesInvoice();
          }}
          title="매출전표발행"
        >
          <FileOutput 
            size={19} 
            color={activeTab === 'sales_invoice' ? '#fb923c' : '#94a3b8'} 
            strokeWidth={activeTab === 'sales_invoice' ? 2.5 : 2} 
          />
          <span 
            className="mob-nav-label" 
            style={{ color: activeTab === 'sales_invoice' ? '#fb923c' : '#94a3b8' }}
          >
            전표발행
          </span>
        </button>
      )}

      {/* 5. 재고이동 */}
      {canTransfer && (
        <button 
          className="mob-nav-item"
          onClick={() => {
            playButtonClickSound();
            if (onOpenInventoryTransfer) onOpenInventoryTransfer();
          }}
          title="재고이동"
        >
          <ArrowLeftRight 
            size={19} 
            color={activeTab === 'inventory_transfer' ? '#a78bfa' : '#94a3b8'} 
            strokeWidth={activeTab === 'inventory_transfer' ? 2.5 : 2} 
          />
          <span 
            className="mob-nav-label" 
            style={{ color: activeTab === 'inventory_transfer' ? '#a78bfa' : '#94a3b8' }}
          >
            재고이동
          </span>
        </button>
      )}

      {/* 6. 전체메뉴 (상품등록/거래처등록 포함) */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onToggleMenu) onToggleMenu();
        }}
        title="메뉴 열기"
      >
        <Menu 
          size={19} 
          color={activeTab === 'menu' ? '#38bdf8' : '#94a3b8'} 
          strokeWidth={activeTab === 'menu' ? 2.5 : 2} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'menu' ? '#38bdf8' : '#94a3b8' }}
        >
          메뉴
        </span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
