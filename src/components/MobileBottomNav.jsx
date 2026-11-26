import React from 'react';
import { ArrowLeftRight, House, LayoutGrid, ShoppingCart, Truck } from 'lucide-react';
import { playButtonClickSound } from '../utils/audio';

const MobileBottomNav = ({
  activeTab = 'home', onOpenHome, onOpenMenu, onOpenSalesOrder, onOpenLoadingCheck, onOpenInventoryTransfer
}) => {
  const items = [
    { id: 'home', label: '홈', icon: House, action: onOpenHome },
    { id: 'sales_order', label: '수주', icon: ShoppingCart, action: onOpenSalesOrder },
    { id: 'loading_check', label: '상차', icon: Truck, action: onOpenLoadingCheck },
    { id: 'inventory_transfer', label: '재고이동', icon: ArrowLeftRight, action: onOpenInventoryTransfer },
    { id: 'menu', label: '메뉴', icon: LayoutGrid, action: onOpenMenu },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="빠른 업무 이동">
      {items.map(({ id, label, icon: Icon, action }) => {
        const active = activeTab === id || (activeTab === 'order_list' && id === 'loading_check');
        return (
          <button
            key={id}
            type="button"
            className="mob-nav-item"
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              playButtonClickSound();
              action?.();
            }}
          >
            <span className="mob-nav-icon"><Icon aria-hidden="true" size={21} strokeWidth={2.2} /></span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
