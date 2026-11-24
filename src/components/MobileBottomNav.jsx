import React from 'react';
import { ShoppingCart, Truck, ArrowLeftRight } from 'lucide-react';
import { playButtonClickSound } from '../utils/audio';

const MobileBottomNav = ({
  activeTab = 'home',
  onOpenSalesOrder,
  onOpenLoadingCheck,
  onOpenInventoryTransfer
}) => {
  return (
    <nav className="mobile-bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '62px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #f1f5f9',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 9990,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      userSelect: 'none',
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
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .mob-nav-center-fab {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #007aff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(0, 122, 255, 0.35);
          margin-top: -24px;
          border: 4px solid #ffffff;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .mob-nav-item:active .mob-nav-center-fab {
          transform: scale(0.92);
        }
      `}</style>

      {/* 1. 맨 앞: 수주(수주 등록 창) */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenSalesOrder) onOpenSalesOrder();
        }}
        title="수주 등록"
      >
        <ShoppingCart 
          size={24} 
          color={activeTab === 'sales_order' ? '#007aff' : '#0f172a'} 
          strokeWidth={2.4} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'sales_order' ? '#007aff' : '#0f172a' }}
        >
          수주
        </span>
      </button>

      {/* 2. 가운데: 돋보이는 원형 상차 버튼 (상차·품목합계) */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenLoadingCheck) onOpenLoadingCheck();
        }}
        title="상차 체크"
      >
        <div className="mob-nav-center-fab">
          <Truck size={28} color="#ffffff" strokeWidth={2.4} />
        </div>
        <span 
          className="mob-nav-label" 
          style={{ color: '#007aff', marginTop: '2px', fontWeight: 900 }}
        >
          상차
        </span>
      </button>

      {/* 3. 맨 끝: 재고이동 */}
      <button 
        className="mob-nav-item"
        onClick={() => {
          playButtonClickSound();
          if (onOpenInventoryTransfer) onOpenInventoryTransfer();
        }}
        title="재고이동"
      >
        <ArrowLeftRight 
          size={24} 
          color={activeTab === 'inventory_transfer' ? '#007aff' : '#0f172a'} 
          strokeWidth={2.4} 
        />
        <span 
          className="mob-nav-label" 
          style={{ color: activeTab === 'inventory_transfer' ? '#007aff' : '#0f172a' }}
        >
          재고이동
        </span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
