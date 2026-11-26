import React from 'react';
import { ChevronRight, LayoutDashboard, Plus, Star } from 'lucide-react';

export default function MobileHomeFavorites({
  menus, notice, noticeFade, onOpenNotice, onOpenMenu, onEditFavorites, onMenuAction, renderMenuIcon
}) {
  const visibleMenus = menus.slice(0, 7);
  const menuColors = ['blue', 'mint', 'orange', 'pink', 'violet', 'teal', 'indigo'];

  return (
    <>
      {notice && (
        <button className="mobile-home-notice" type="button" onClick={() => onOpenNotice(notice)}>
          <span className="mobile-home-notice-badge">NOTICE</span>
          <span className="mobile-home-notice-title" style={{ opacity: noticeFade ? 1 : 0 }}>
            {notice.title}
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      )}

      <section className="mobile-home-card" aria-labelledby="mobile-favorites-heading">
        <div className="mobile-home-card-heading">
          <span className="mobile-favorites-star" aria-hidden="true"><Star size={18} fill="currentColor" /></span>
          <h2 id="mobile-favorites-heading">자주 찾는 메뉴</h2>
          <button className="mobile-outline-action" type="button" onClick={onOpenMenu}>
            <LayoutDashboard size={15} aria-hidden="true" /> 전체 메뉴
          </button>
        </div>

        <div className="mobile-favorites-grid">
          {visibleMenus.map((menu, index) => (
            <button
              key={menu.id}
              type="button"
              className="mobile-favorite-tile"
              data-tone={menuColors[index]}
              onClick={() => onMenuAction(menu.id)}
            >
              <span className="mobile-favorite-icon" aria-hidden="true">{renderMenuIcon(menu.id, 22)}</span>
              <ChevronRight className="mobile-favorite-chevron" size={13} aria-hidden="true" />
              <span>{menu.name}</span>
            </button>
          ))}
          <button className="mobile-favorite-tile mobile-favorite-edit" type="button" onClick={onEditFavorites}>
            <Plus size={24} aria-hidden="true" />
            <span>{visibleMenus.length === 7 ? '메뉴 편집' : '메뉴 추가'}</span>
          </button>
        </div>
      </section>
    </>
  );
}


