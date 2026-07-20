import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search, ShoppingCart, User, Menu, ChevronRight, ChevronLeft, Plus, Minus,
  LogOut, Package, Heart, X, Truck, Star, Gift, Bell, RotateCcw, FileText
} from 'lucide-react';
import './PartnerShoppingMall.css';

/* =========================================
   CONSTANTS
   ========================================= */
const SORT_OPTIONS = ['최신순', '인기순', '낮은 가격순', '높은 가격순'];

// Pastel-vibrant gradient palettes for banners
const BANNER_PALETTES = [
  { bg: 'linear-gradient(135deg, #e62e2e 0%, #c0392b 50%, #922b21 100%)', emoji: '🔥' },
  { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', emoji: '✨' },
  { bg: 'linear-gradient(135deg, #00b09b 0%, #00a650 100%)', emoji: '🌿' },
  { bg: 'linear-gradient(135deg, #f09819 0%, #ff6b00 100%)', emoji: '⚡' },
  { bg: 'linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)', emoji: '🎁' },
];

const SERVICE_ITEMS = [
  { icon: '🚚', label: '빠른 배송', sub: '익일 도착', color: '#fff3e0' },
  { icon: '💝', label: '즐겨찾기', sub: '단골 상품', color: '#fce4ec' },
  { icon: '📦', label: '주문 현황', sub: '실시간 확인', color: '#e3f2fd' },
  { icon: '🧾', label: '거래 명세표', sub: '이전 내역', color: '#e8f5e9' },
  { icon: '💬', label: '고객센터', sub: '평일 09~18시', color: '#f3e5f5' },
];

/* =========================================
   BANNER CAROUSEL COMPONENT
   ========================================= */
const BannerCarousel = ({ categories, onCategoryClick }) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  // Build banners: first from categories, fill with defaults
  const banners = useMemo(() => {
    const largeCats = (categories || []).filter(c => !c.parentId || String(c.level) === '1');
    const base = largeCats.slice(0, 5).map((cat, i) => ({
      tag: '카테고리 특가',
      title: `${cat.name}\n특별 기획전`,
      desc: '지금 바로 확인해보세요',
      cta: '상품 보기',
      catName: cat.name,
      ...BANNER_PALETTES[i % BANNER_PALETTES.length],
    }));
    if (base.length < 3) {
      const defaults = [
        { tag: '이번 주 베스트', title: '인기 상품\n모음전', desc: '가장 많이 찾는 상품을 모았습니다', cta: '베스트 보기', catName: 'recommend', ...BANNER_PALETTES[0] },
        { tag: '신규 입고', title: '새로 들어온\n신상품', desc: '최신 상품을 가장 먼저 만나보세요', cta: '신상품 보기', catName: 'new', ...BANNER_PALETTES[1] },
        { tag: '전체 상품', title: '우리 가게\n전 상품', desc: '필요한 모든 상품이 여기 있습니다', cta: '전체 보기', catName: 'all', ...BANNER_PALETTES[2] },
      ];
      defaults.slice(0, 3 - base.length).forEach(d => base.push(d));
    }
    return base.slice(0, 5);
  }, [categories]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 3500);
  }, [banners.length]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const go = (dir) => {
    setCurrent(prev => (prev + dir + banners.length) % banners.length);
    startTimer();
  };

  const goTo = (idx) => { setCurrent(idx); startTimer(); };

  if (banners.length === 0) return null;
  const b = banners[current];

  return (
    <div className="mall-banner-section">
      <div className="mall-banner-carousel">
        <div
          className="mall-banner-track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((slide, i) => (
            <div
              key={i}
              className="mall-banner-slide"
              style={{ background: slide.bg, minWidth: '100%' }}
            >
              <div className="mall-banner-slide-inner">
                <div className="mall-banner-content">
                  <div className="mall-banner-tag">{slide.tag}</div>
                  <div className="mall-banner-title" style={{ whiteSpace: 'pre-line' }}>
                    {slide.title}
                  </div>
                  <div className="mall-banner-desc">{slide.desc}</div>
                  <button
                    className="mall-banner-cta"
                    onClick={() => onCategoryClick(slide.catName)}
                    style={{ color: slide.bg.includes('#e62e2e') ? '#e62e2e' : '#1a1a2e' }}
                  >
                    {slide.cta} →
                  </button>
                </div>
                <div className="mall-banner-visual">{slide.emoji}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="mall-banner-nav-btn prev" onClick={() => go(-1)}>
          <ChevronLeft size={18} />
        </button>
        <button className="mall-banner-nav-btn next" onClick={() => go(1)}>
          <ChevronRight size={18} />
        </button>

        <div className="mall-banner-footer">
          <div className="mall-banner-dots">
            {banners.map((_, i) => (
              <button
                key={i}
                className={`mall-banner-dot ${i === current ? 'active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <span className="mall-banner-counter">{current + 1} / {banners.length}</span>
        </div>
      </div>
    </div>
  );
};

/* =========================================
   PRODUCT CARD COMPONENT
   ========================================= */
const ProductCard = ({ p, idx, showRank, quantities, handleQtyChange, handleOrder, isFavorite, onToggleFavorite, currentUser }) => {
  const [imgIdx, setImgIdx] = useState(0);
  const photos = (p.photos && p.photos.length > 0) ? p.photos : (p.photo ? [p.photo] : []);
  const photo = photos[imgIdx] || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=f0f0f0`;
  const discountRate = 15 + (p.id % 10);
  const price = p.salesPriceSingle || p.salesPrice || 0;
  const originalPrice = Math.round(price / (1 - discountRate / 100));

  const nextImg = (e) => { e.stopPropagation(); setImgIdx(prev => (prev + 1) % photos.length); };
  const prevImg = (e) => { e.stopPropagation(); setImgIdx(prev => (prev - 1 + photos.length) % photos.length); };

  return (
    <div className="mall-product-card">
      {/* Image Area */}
      <div className="mall-product-img-wrap">
        {/* Rank badge */}
        {showRank && idx < 4 && (
          <div className={`mall-rank-badge rank-${idx + 1}`}>{idx + 1}</div>
        )}

        {/* Sale badge */}
        {!showRank && (
          <div className="mall-sale-badge">{discountRate}%</div>
        )}

        <img src={photo} alt={p.name} className="mall-product-img" />

        {/* Multi-image nav */}
        {photos.length > 1 && (
          <>
            <button className="mall-img-nav prev" onClick={prevImg}><ChevronLeft size={12} /></button>
            <button className="mall-img-nav next" onClick={nextImg}><ChevronRight size={12} /></button>
            <div className="mall-img-dots">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`mall-img-dot ${i === imgIdx ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick cart overlay */}
        <div className="mall-cart-overlay" onClick={() => handleOrder(p)}>
          <ShoppingCart size={16} /> 장바구니 담기
        </div>

        {/* Favorite button */}
        <button
          className={`mall-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.name); }}
          title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <Heart size={16} fill={isFavorite ? '#e62e2e' : 'none'} color={isFavorite ? '#e62e2e' : '#ccc'} />
        </button>
      </div>

      {/* Info Area */}
      <div className="mall-product-info">
        <div className="mall-product-brand">{p.category || '일반상품'}</div>
        <div className="mall-product-name">{p.name}{p.spec ? ` ${p.spec}` : ''}</div>

        <div className="mall-product-rating">
          <span className="mall-stars">{'★'.repeat(4)}☆</span>
          <span className="mall-review-count">({(p.id % 50) + 10})</span>
        </div>

        {currentUser?.hidePrice ? (
          <div className="mall-product-hidden-price">가격 비공개</div>
        ) : (
          <div className="mall-product-price-area">
            <span className="mall-product-discount">{discountRate}%</span>
            <span className="mall-product-price">{price.toLocaleString()}원</span>
            <span className="mall-product-original">{originalPrice.toLocaleString()}원</span>
          </div>
        )}

        <div className="mall-qty-row">
          <div className="mall-qty-control">
            <button className="mall-qty-btn" onClick={() => handleQtyChange(p.id, -1)}>
              <Minus size={12} />
            </button>
            <input
              type="text"
              className="mall-qty-input"
              value={quantities[p.id] || 1}
              readOnly
            />
            <button className="mall-qty-btn" onClick={() => handleQtyChange(p.id, 1)}>
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================
   HOME SECTION COMPONENT
   ========================================= */
const HomeSection = ({ title, subtitle, icon, products, onOrder, quantities, handleQtyChange, favorites, onToggleFavorite, currentUser, onMore }) => (
  <div className="mall-home-section">
    <div className="mall-section-header">
      <div className="mall-section-title-wrap">
        <div className="mall-section-title">
          {icon && <span>{icon}</span>}
          {title}
        </div>
        {subtitle && <div className="mall-section-subtitle">{subtitle}</div>}
      </div>
      <button className="mall-section-more" onClick={onMore}>
        더보기 <ChevronRight size={13} />
      </button>
    </div>
    <div className="mall-product-grid">
      {products.map((p, idx) => (
        <ProductCard
          key={p.id}
          p={p}
          idx={idx}
          showRank={title.includes('추천') || title.includes('인기')}
          quantities={quantities}
          handleQtyChange={handleQtyChange}
          handleOrder={onOrder}
          isFavorite={favorites.includes(p.name)}
          onToggleFavorite={onToggleFavorite}
          currentUser={currentUser}
        />
      ))}
    </div>
  </div>
);

/* =========================================
   MAIN COMPONENT
   ========================================= */
const PartnerShoppingMall = ({
  products,
  categories = [],
  systemSettings = {},
  salesOrders = [],
  salesInvoices = [],
  partners = [],
  currentUser,
  onLogout,
  onOrder,
  onUpdateOrder,
  onDeleteOrder,
  companyName
}) => {
  const mallName = (companyName || systemSettings.company?.name || '회원사') + '몰';

  /* ---- State ---- */
  const [activeCat, setActiveCat] = useState('home');
  const [activeSort, setActiveSort] = useState('최신순');
  const [searchText, setSearchText] = useState('');
  const [quantities, setQuantities] = useState({});
  const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('pending');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  /* ---- Cart (persisted) ---- */
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`mall_cart_${currentUser.name}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`mall_cart_${currentUser.name}`, JSON.stringify(cart));
  }, [cart, currentUser.name]);

  /* ---- Favorites (persisted) ---- */
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(`mall_favs_${currentUser.name}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`mall_favs_${currentUser.name}`, JSON.stringify(favorites));
  }, [favorites, currentUser.name]);

  const toggleFavorite = (name) =>
    setFavorites(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  /* ---- Category helpers ---- */
  const largeCats = useMemo(() => categories.filter(c => !c.parentId || String(c.level) === '1'), [categories]);

  const activeCategoryObj = categories.find(c => c.name === activeCat);
  let currentLarge = null, currentMedium = null, currentSmall = null;
  if (activeCategoryObj) {
    if (!activeCategoryObj.parentId || activeCategoryObj.level === 1) {
      currentLarge = activeCategoryObj;
    } else if (activeCategoryObj.level === 2) {
      currentMedium = activeCategoryObj;
      currentLarge = categories.find(c => String(c.id) === String(activeCategoryObj.parentId));
    } else if (activeCategoryObj.level === 3) {
      currentSmall = activeCategoryObj;
      currentMedium = categories.find(c => String(c.id) === String(activeCategoryObj.parentId));
      currentLarge = currentMedium ? categories.find(c => String(c.id) === String(currentMedium.parentId)) : null;
    }
  }

  const mediumCats = currentLarge ? categories.filter(c => String(c.parentId) === String(currentLarge.id)) : [];
  const smallCats = currentMedium ? categories.filter(c => String(c.parentId) === String(currentMedium.id)) : [];

  const getSubCategoryNames = (catName) => {
    if (!catName || catName === 'all' || catName === 'home') return [];
    const root = categories.find(c => c.name === catName);
    if (!root) return [catName];
    const names = [catName];
    const findChildren = (parentId) => {
      categories.filter(c => String(c.parentId) === String(parentId)).forEach(child => {
        names.push(child.name);
        findChildren(child.id);
      });
    };
    findChildren(root.id);
    return names;
  };

  /* ---- Product filtering ---- */
  const getFilteredList = useCallback((cat, sort = activeSort) => {
    let list = products.filter(p => p.showInMall !== false);
    if (searchText) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.abbreviation && p.abbreviation.toLowerCase().includes(searchText.toLowerCase())) ||
        (p.spec && p.spec.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    if (sort === '낮은 가격순') list = [...list].sort((a, b) => (Number(a.salesPriceSingle || a.salesPrice || 0)) - (Number(b.salesPriceSingle || b.salesPrice || 0)));
    else if (sort === '높은 가격순') list = [...list].sort((a, b) => (Number(b.salesPriceSingle || b.salesPrice || 0)) - (Number(a.salesPriceSingle || a.salesPrice || 0)));
    else list = [...list].sort((a, b) => b.id - a.id);

    if (cat === 'recommend') return list.slice(0, 8);
    if (cat === 'new') return list.slice(0, 8);
    if (cat === 'popular') return list.filter((_, i) => i % 2 === 0).slice(0, 8);
    if (cat === 'home' || cat === 'all') return list;
    const targetNames = getSubCategoryNames(cat);
    return list.filter(p => targetNames.includes(p.category));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories, activeSort, searchText]);

  const filteredProducts = useMemo(() => getFilteredList(activeCat), [getFilteredList, activeCat]);

  /* ---- Quantity ---- */
  const handleQtyChange = (id, delta) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + delta) }));

  /* ---- Cart ops ---- */
  const addToCart = (product) => {
    const qty = quantities[product.id] || 1;
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + qty } : item));
    } else {
      setCart([...cart, { product, qty }]);
    }
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    // Brief visual toast would go here; using alert for now to preserve original UX
    alert(`${product.name} ${qty}개가 장바구니에 담겼습니다.`);
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.product.id !== productId));

  const submitOrder = () => {
    if (cart.length === 0) return;
    if (window.confirm('장바구니의 모든 품목을 주문하시겠습니까?')) {
      onOrder(cart);
      setCart([]);
      setIsCartOpen(false);
    }
  };

  const cartTotal = cart.reduce((acc, item) =>
    acc + (item.product.salesPriceSingle || item.product.salesPrice || 0) * item.qty, 0);

  /* ---- Order history ---- */
  const myOrders = useMemo(() => salesOrders.filter(o => o.partner === currentUser.name), [salesOrders, currentUser]);
  const myPendingOrders = useMemo(() => myOrders.filter(o => o.status === '주문대기'), [myOrders]);
  const myPastInvoices = useMemo(() =>
    (salesInvoices || []).filter(inv => inv.partner === currentUser.name)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [salesInvoices, currentUser.name]);
  const frequentProducts = useMemo(() => products.filter(p => favorites.includes(p.name)), [favorites, products]);

  const handleHistoryItemQty = (order, itemIdx, delta) => {
    const updatedItems = [...(order.items || [])];
    const item = updatedItems[itemIdx];
    if (item.loaded) return;
    updatedItems[itemIdx] = { ...item, qty: Math.max(1, item.qty + delta) };
    onUpdateOrder(order.id, { items: updatedItems, itemsText: updatedItems.map(i => `${i.name}${i.qty}`).join(' ') });
  };

  const handleHistoryItemDelete = (order, itemIdx) => {
    if (!window.confirm('해당 품목을 주문에서 삭제하시겠습니까?')) return;
    const updatedItems = order.items.filter((_, idx) => idx !== itemIdx);
    if (updatedItems.length === 0) { onDeleteOrder(order.id); }
    else { onUpdateOrder(order.id, { items: updatedItems, itemsText: updatedItems.map(i => `${i.name}${i.qty}`).join(' ') }); }
  };

  /* ---- Navigation helper ---- */
  const navigate = (cat) => { setActiveCat(cat); setIsCatMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* ============================================
     RENDER
  ============================================ */
  return (
    <div className="mall-container">

      {/* ---- TOP BAR ---- */}
      <div className="mall-topbar">
        <div className="mall-topbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>안녕하세요, <strong style={{ color: '#333' }}>{currentUser.name}</strong> 님</span>
          </div>
          <div className="mall-topbar-links">
            <span onClick={() => { setIsOrderHistoryOpen(true); setHistoryTab('frequent'); }}>자주 주문하는 상품</span>
            <span className="mall-topbar-divider">|</span>
            <span onClick={() => { setIsOrderHistoryOpen(true); setHistoryTab('pending'); }}>주문현황</span>
            <span className="mall-topbar-divider">|</span>
            <span onClick={() => { setIsOrderHistoryOpen(true); setHistoryTab('past'); }}>이전 주문 내역</span>
            <span className="mall-topbar-divider">|</span>
            <span onClick={onLogout} style={{ color: '#e62e2e' }}>로그아웃</span>
          </div>
        </div>
      </div>

      {/* ---- HEADER ---- */}
      <header className="mall-header">
        <div className="mall-header-inner">
          {/* Logo */}
          <div className="mall-logo" onClick={() => navigate('home')}>
            <div className="mall-logo-name">{mallName}</div>
            <div className="mall-logo-sub">PARTNER B2B STORE</div>
          </div>

          {/* Search */}
          <div className="mall-search-wrap">
            <div className="mall-search-bar">
              <input
                type="text"
                placeholder="상품명, 규격으로 검색해보세요"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setActiveCat('all')}
              />
              <button className="mall-search-btn" onClick={() => setActiveCat('all')}>
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mall-header-actions">
            <div
              className="mall-action-item"
              onClick={() => { setIsOrderHistoryOpen(true); setHistoryTab('frequent'); }}
              title="즐겨찾기"
            >
              <Heart size={22} color={favorites.length > 0 ? '#e62e2e' : '#555'} fill={favorites.length > 0 ? '#e62e2e' : 'none'} />
              <span>즐겨찾기</span>
            </div>
            <div
              className="mall-action-item"
              onClick={() => { setIsOrderHistoryOpen(true); setHistoryTab('pending'); }}
              title="나의 주문"
            >
              <User size={22} />
              <span>나의 주문</span>
            </div>
            <div
              className="mall-action-item"
              onClick={() => setIsCartOpen(true)}
              style={{ position: 'relative' }}
              title="장바구니"
            >
              <ShoppingCart size={22} />
              <span>장바구니</span>
              {cart.length > 0 && (
                <span className="mall-cart-badge">{cart.length}</span>
              )}
            </div>
            <div className="mall-action-item" onClick={onLogout} title="로그아웃">
              <LogOut size={22} />
              <span>로그아웃</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---- NAVIGATION ---- */}
      <nav className="mall-nav" style={{ position: 'relative' }}>
        <div className="mall-nav-inner">
          {/* All Categories */}
          <div
            className="mall-nav-all"
            onClick={() => setIsCatMenuOpen(!isCatMenuOpen)}
          >
            <Menu size={16} /> 전체 카테고리
          </div>

          {/* Category Dropdown */}
          {isCatMenuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 798 }}
                onClick={() => setIsCatMenuOpen(false)}
              />
              <div className="mall-sidebar-dropdown" style={{ left: 20 }}>
                {largeCats.map(lc => (
                  <div key={lc.id}>
                    <div
                      className="mall-sidebar-dropdown-item"
                      onClick={() => navigate(lc.name)}
                      style={{ fontWeight: 700, color: '#1a1a2e', borderLeft: '3px solid transparent', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderLeftColor = '#e62e2e'}
                      onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
                    >
                      {lc.name}
                      <ChevronRight size={13} color="#ccc" />
                    </div>
                    {categories.filter(c => String(c.parentId) === String(lc.id)).map(mc => (
                      <div
                        key={mc.id}
                        className="mall-sidebar-dropdown-item"
                        style={{ paddingLeft: 28, fontSize: 12, color: '#666', fontWeight: 500 }}
                        onClick={() => navigate(mc.name)}
                      >
                        {mc.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fixed nav links */}
          <div className={`mall-nav-link ${activeCat === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}>홈</div>
          <div className={`mall-nav-link ${activeCat === 'recommend' ? 'active' : ''}`} onClick={() => navigate('recommend')}>
            🔥 베스트
          </div>
          <div className={`mall-nav-link ${activeCat === 'new' ? 'active' : ''}`} onClick={() => navigate('new')}>
            ✨ 신상품
          </div>
          <div className={`mall-nav-link ${activeCat === 'all' ? 'active' : ''}`} onClick={() => navigate('all')}>전체 상품</div>

          {/* Category nav links */}
          {largeCats.map(cat => (
            <div
              key={cat.id}
              className={`mall-nav-link ${currentLarge?.id === cat.id ? 'active' : ''}`}
              onClick={() => navigate(cat.name)}
            >
              {cat.name}
            </div>
          ))}
        </div>
      </nav>

      {/* Sub-nav (medium categories) */}
      {(currentLarge || currentMedium) && mediumCats.length > 0 && (
        <div className="mall-subnav">
          <div className="mall-subnav-inner">
            <div
              className={`mall-subnav-item ${activeCat === currentLarge?.name ? 'active' : ''}`}
              onClick={() => navigate(currentLarge.name)}
            >
              전체
            </div>
            {mediumCats.map(m => (
              <div
                key={m.id}
                className={`mall-subnav-item ${currentMedium?.id === m.id ? 'active' : ''}`}
                onClick={() => navigate(m.name)}
              >
                {m.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Small-nav (level 3) */}
      {currentMedium && smallCats.length > 0 && (
        <div className="mall-subnav" style={{ background: '#f5f5f5' }}>
          <div className="mall-subnav-inner">
            {smallCats.map(s => (
              <div
                key={s.id}
                className={`mall-smallnav-item ${activeCat === s.name ? 'active' : ''}`}
                onClick={() => navigate(s.name)}
              >
                # {s.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- BANNER (Home only) ---- */}
      {activeCat === 'home' && (
        <>
          <BannerCarousel categories={categories} onCategoryClick={navigate} />

          {/* Service Icon Bar */}
          <div className="mall-service-bar">
            <div className="mall-service-bar-inner">
              <div className="mall-service-title">배송서비스 바로가기</div>
              <div className="mall-service-grid">
                {SERVICE_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="mall-service-item"
                    onClick={() => {
                      if (i === 1) { setIsOrderHistoryOpen(true); setHistoryTab('frequent'); }
                      else if (i === 2) { setIsOrderHistoryOpen(true); setHistoryTab('pending'); }
                      else if (i === 3) { setIsOrderHistoryOpen(true); setHistoryTab('past'); }
                    }}
                  >
                    <div className="mall-service-icon-wrap" style={{ background: item.color }}>
                      <span>{item.icon}</span>
                    </div>
                    <div className="mall-service-label">{item.label}</div>
                    <div className="mall-service-sub">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---- BREADCRUMB (non-home) ---- */}
      {activeCat !== 'home' && (
        <div className="mall-breadcrumb">
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('home')}>홈</span>
          {currentLarge && (
            <>
              <ChevronRight size={12} className="mall-breadcrumb-sep" />
              <span style={{ cursor: 'pointer' }} onClick={() => navigate(currentLarge.name)}>{currentLarge.name}</span>
            </>
          )}
          {currentMedium && (
            <>
              <ChevronRight size={12} className="mall-breadcrumb-sep" />
              <span style={{ cursor: 'pointer' }} onClick={() => navigate(currentMedium.name)}>{currentMedium.name}</span>
            </>
          )}
          {currentSmall && (
            <>
              <ChevronRight size={12} className="mall-breadcrumb-sep" />
              <span>{currentSmall.name}</span>
            </>
          )}
          {!currentLarge && activeCat !== 'all' && (
            <>
              <ChevronRight size={12} className="mall-breadcrumb-sep" />
              <span>
                {activeCat === 'recommend' ? '🔥 베스트' : activeCat === 'new' ? '✨ 신상품' : activeCat}
              </span>
            </>
          )}
          {activeCat === 'all' && (
            <>
              <ChevronRight size={12} className="mall-breadcrumb-sep" />
              <span>전체 상품</span>
            </>
          )}
        </div>
      )}

      {/* ---- MAIN CONTENT ---- */}
      <main className="mall-main">
        {/* Sidebar (non-home) */}
        {activeCat !== 'home' && largeCats.length > 0 && (
          <aside className="mall-sidebar">
            <div className="mall-sidebar-box">
              <div className="mall-sidebar-title">
                <Menu size={14} /> 카테고리
              </div>
              {largeCats.map(lc => (
                <div key={lc.id} className="mall-cat-tree-group">
                  <div
                    className={`mall-cat-tree-large ${currentLarge?.id === lc.id ? 'active' : ''}`}
                    onClick={() => navigate(lc.name)}
                  >
                    {lc.name}
                    <ChevronRight size={13} color="#ccc" />
                  </div>
                  {currentLarge?.id === lc.id && (
                    <div className="mall-cat-tree-mediums">
                      {categories.filter(c => String(c.parentId) === String(lc.id)).map(mc => (
                        <div
                          key={mc.id}
                          className={`mall-cat-tree-medium ${currentMedium?.id === mc.id ? 'active' : ''}`}
                          onClick={() => navigate(mc.name)}
                        >
                          {mc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Content */}
        <section className="mall-content">
          {activeCat === 'home' ? (
            /* ---- HOME VIEW ---- */
            <div className="mall-home-sections">
              <HomeSection
                title="🔥 추천 상품"
                subtitle="가장 많이 찾는 베스트 상품"
                products={getFilteredList('recommend')}
                onOrder={addToCart}
                quantities={quantities}
                handleQtyChange={handleQtyChange}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                currentUser={currentUser}
                onMore={() => navigate('recommend')}
              />
              <HomeSection
                title="✨ 신규 상품"
                subtitle="새로 들어온 따끈따끈한 신상품"
                products={getFilteredList('new')}
                onOrder={addToCart}
                quantities={quantities}
                handleQtyChange={handleQtyChange}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                currentUser={currentUser}
                onMore={() => navigate('new')}
              />
              {largeCats.slice(0, 2).map(cat => {
                const catProducts = getFilteredList(cat.name).slice(0, 4);
                if (catProducts.length === 0) return null;
                return (
                  <HomeSection
                    key={cat.id}
                    title={cat.name}
                    subtitle={`${cat.name} 카테고리 주요 상품`}
                    products={catProducts}
                    onOrder={addToCart}
                    quantities={quantities}
                    handleQtyChange={handleQtyChange}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    currentUser={currentUser}
                    onMore={() => navigate(cat.name)}
                  />
                );
              })}
            </div>
          ) : (
            /* ---- CATEGORY / LIST VIEW ---- */
            <>
              <div className="mall-cat-header">
                <div>
                  <div className="mall-cat-title">
                    {activeCat === 'all' ? '전체 상품' :
                     activeCat === 'recommend' ? '🔥 베스트 상품' :
                     activeCat === 'new' ? '✨ 신규 상품' :
                     `${activeCat} 상품`}
                  </div>
                  <div className="mall-cat-count">총 {filteredProducts.length}개 상품</div>
                </div>
                <div className="mall-sort-bar">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      className={`mall-sort-btn ${activeSort === opt ? 'active' : ''}`}
                      onClick={() => setActiveSort(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', background: '#fff', border: '1px solid #eee', borderRadius: 8 }}>
                  <Package size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                  <div style={{ fontSize: 16, fontWeight: 600 }}>해당 카테고리에 상품이 없습니다.</div>
                </div>
              ) : (
                <div className="mall-product-grid" style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #eee' }}>
                  {filteredProducts.map((p, idx) => (
                    <ProductCard
                      key={p.id}
                      p={p}
                      idx={idx}
                      showRank={activeCat === 'recommend'}
                      quantities={quantities}
                      handleQtyChange={handleQtyChange}
                      handleOrder={addToCart}
                      isFavorite={favorites.includes(p.name)}
                      onToggleFavorite={toggleFavorite}
                      currentUser={currentUser}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ============================================
          CART MODAL
      ============================================ */}
      {isCartOpen && (
        <div className="mall-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="mall-modal" onClick={e => e.stopPropagation()}>
            <div className="mall-modal-header">
              <h2>🛒 장바구니 ({cart.length})</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {cart.length > 0 && (
                  <button
                    className="mall-btn mall-btn-danger-outline"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => setShowClearConfirm(true)}
                  >
                    전체 삭제
                  </button>
                )}
                <button className="mall-modal-close" onClick={() => setIsCartOpen(false)}>×</button>
              </div>
            </div>

            <div className="mall-modal-body">
              {cart.length === 0 ? (
                <div className="mall-cart-empty">
                  <div className="mall-cart-empty-icon">🛒</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>장바구니가 비어있습니다</div>
                  <div style={{ fontSize: 13, color: '#bbb' }}>원하는 상품을 담아보세요</div>
                </div>
              ) : (
                <div className="mall-cart-items">
                  {cart.map(item => {
                    const photo = item.product.photos?.[0] || item.product.photo ||
                      `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(item.product.name)}`;
                    return (
                      <div key={item.product.id} className="mall-cart-item">
                        <img src={photo} alt="" className="mall-cart-item-img" />
                        <div className="mall-cart-item-info">
                          <div className="mall-cart-item-name">{item.product.name}</div>
                          <div className="mall-cart-item-price">
                            {currentUser?.hidePrice ? '가격 비공개' :
                              `${(item.product.salesPriceSingle || item.product.salesPrice || 0).toLocaleString()}원`}
                          </div>
                        </div>
                        <div className="mall-cart-item-actions">
                          <span className="mall-cart-item-qty">{item.qty}개</span>
                          <button className="mall-cart-remove-btn" onClick={() => removeFromCart(item.product.id)}>
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {!currentUser?.hidePrice && (
                    <div className="mall-cart-total">
                      <span>결제 예정 금액</span>
                      <span className="mall-cart-total-price">{cartTotal.toLocaleString()}원</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mall-modal-footer">
              <button
                className="mall-btn mall-btn-primary"
                onClick={submitOrder}
                disabled={cart.length === 0}
              >
                <ShoppingCart size={16} /> 주문 제출하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          ORDER HISTORY MODAL
      ============================================ */}
      {isOrderHistoryOpen && (
        <div className="mall-modal-overlay" onClick={() => setIsOrderHistoryOpen(false)}>
          <div
            className="mall-modal"
            onClick={e => e.stopPropagation()}
            style={{ width: '900px', maxWidth: '95vw', height: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="mall-modal-header" style={{ padding: '16px 20px 0', flexDirection: 'column', gap: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                <h2>나의 주문 / 활동 기록</h2>
                <button className="mall-modal-close" onClick={() => setIsOrderHistoryOpen(false)}>×</button>
              </div>
              <div className="mall-history-tabs">
                {[
                  { key: 'pending', label: '📦 실시간 주문 현황' },
                  { key: 'past', label: '🧾 이전 주문 내역' },
                  { key: 'frequent', label: '❤️ 자주 주문하는 상품' },
                ].map(tab => (
                  <div
                    key={tab.key}
                    className={`mall-h-tab ${historyTab === tab.key ? 'active' : ''}`}
                    onClick={() => setHistoryTab(tab.key)}
                  >
                    {tab.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mall-modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Pending Orders */}
              {historyTab === 'pending' && (
                <div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                    접수된 주문의 실시간 진행 상황입니다.
                  </div>
                  {myPendingOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#bbb' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                      진행 중인 주문이 없습니다.
                    </div>
                  ) : (
                    myPendingOrders.map(order => {
                      const items = order.items || [];
                      return (
                        <div key={order.id} className="mall-order-card">
                          <div className="mall-order-card-header">
                            <span className="mall-order-date">{order.date} 주문서</span>
                            <span className="mall-order-status pending">배송 전</span>
                          </div>
                          {items.map((item, idx) => {
                            const product = products.find(p => p.name === item.name);
                            const photo = product?.photos?.[0] || product?.photo ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`;
                            return (
                              <div key={idx} className="mall-order-item-row">
                                <img src={photo} alt="" className="mall-order-item-img" />
                                <div className="mall-order-item-name">{item.name}</div>
                                <div className="mall-order-item-qty">수량: {item.qty}개</div>
                                {isEditMode && !item.loaded && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div className="mall-qty-control">
                                      <button className="mall-qty-btn" onClick={() => handleHistoryItemQty(order, idx, -1)}>
                                        <Minus size={11} />
                                      </button>
                                      <input className="mall-qty-input" value={item.qty} readOnly style={{ width: 28 }} />
                                      <button className="mall-qty-btn" onClick={() => handleHistoryItemQty(order, idx, 1)}>
                                        <Plus size={11} />
                                      </button>
                                    </div>
                                    <button
                                      className="mall-btn mall-btn-danger-outline"
                                      style={{ padding: '4px 10px', fontSize: 12 }}
                                      onClick={() => handleHistoryItemDelete(order, idx)}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                )}
                                <span className={`mall-order-item-status ${item.loaded ? 'shipped' : 'waiting'}`}>
                                  {item.loaded ? '배송중' : '배송전'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Past Invoices */}
              {historyTab === 'past' && (
                <div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>완료된 이전 주문 내역입니다.</div>
                  {myPastInvoices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#bbb' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                      완료된 주문 내역이 없습니다.
                    </div>
                  ) : (
                    myPastInvoices.map(inv => (
                      <div key={inv.id} className="mall-order-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>{inv.date} 매출전표</span>
                            <span className="mall-order-status done">배송완료</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                            {inv.items.map(i => `${i.name}×${i.qty}`).join(', ')}
                          </div>
                          {!currentUser?.hidePrice && (
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#e62e2e' }}>
                              합계: {inv.totalAmount.toLocaleString()}원
                            </div>
                          )}
                        </div>
                        <button
                          className="mall-btn mall-btn-secondary"
                          style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <FileText size={14} /> 거래명세표
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Frequent Products */}
              {historyTab === 'frequent' && (
                <div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                    하트를 눌러 나만의 단골 상품을 관리할 수 있습니다.
                  </div>
                  {frequentProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#bbb' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>❤️</div>
                      <div>즐겨찾는 상품이 없습니다.</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>상품 카드의 하트 버튼을 눌러 등록해보세요!</div>
                    </div>
                  ) : (
                    frequentProducts.map(p => (
                      <div key={p.id} className="mall-freq-item">
                        <img
                          src={p.photos?.[0] || p.photo || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.name}`}
                          alt=""
                          className="mall-freq-img"
                        />
                        <div style={{ flex: 1 }}>
                          <div className="mall-freq-name">{p.name}</div>
                          <div className="mall-freq-price">
                            {currentUser?.hidePrice ? '가격 비공개' :
                              `${(p.salesPriceSingle || p.salesPrice || 0).toLocaleString()}원`}
                          </div>
                        </div>
                        <div className="mall-freq-actions">
                          <button
                            className="mall-btn"
                            style={{ background: '#fff1f2', color: '#e62e2e', border: 'none', padding: '8px 10px', borderRadius: 8 }}
                            onClick={() => toggleFavorite(p.name)}
                            title="즐겨찾기 해제"
                          >
                            <Heart size={16} fill="#e62e2e" />
                          </button>
                          <button
                            className="mall-btn"
                            style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '8px 12px', borderRadius: 8 }}
                            onClick={() => addToCart(p)}
                          >
                            <ShoppingCart size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mall-modal-footer">
              {historyTab === 'pending' && myPendingOrders.length > 0 ? (
                <button
                  className="mall-btn mall-btn-primary"
                  onClick={() => setIsEditMode(!isEditMode)}
                  style={{ background: isEditMode ? '#10b981' : undefined }}
                >
                  {isEditMode ? '✅ 수정 완료' : '✏️ 주문현황 수정하기'}
                </button>
              ) : (
                <button className="mall-btn mall-btn-secondary" style={{ width: '100%', padding: 12 }} onClick={() => setIsOrderHistoryOpen(false)}>
                  닫기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          CLEAR CART CONFIRM
      ============================================ */}
      {showClearConfirm && (
        <div className="mall-modal-overlay" style={{ zIndex: 3000 }} onClick={() => setShowClearConfirm(false)}>
          <div className="mall-modal mall-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="mall-confirm-title">장바구니 비우기</div>
            <div className="mall-confirm-desc">
              장바구니의 모든 품목을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
            </div>
            <div className="mall-confirm-actions">
              <button
                className="mall-btn mall-btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowClearConfirm(false)}
              >
                취소
              </button>
              <button
                className="mall-btn mall-btn-primary"
                style={{ flex: 1 }}
                onClick={() => { setCart([]); setShowClearConfirm(false); }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          STATEMENT MODAL
      ============================================ */}
      {selectedInvoice && (() => {
        const inv = selectedInvoice;
        const partnerDetail = partners.find(p => p.name === inv.partner) || {};
        return (
          <div className="mall-modal-overlay" style={{ zIndex: 11000 }} onClick={() => setSelectedInvoice(null)}>
            <div
              className="mall-modal"
              style={{ width: 800, maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="mall-modal-header">
                <h2>거래명세표 확인</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="mall-btn mall-btn-secondary"
                    style={{ padding: '7px 14px', fontSize: 13 }}
                    onClick={() => window.print()}
                  >
                    인쇄
                  </button>
                  <button className="mall-modal-close" onClick={() => setSelectedInvoice(null)}>×</button>
                </div>
              </div>

              <div className="mall-modal-body" style={{ background: '#f5f5f5' }}>
                <div className="mall-statement-wrap">
                  {/* Title */}
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ display: 'inline-block', border: '3px double #000', padding: '8px 36px', fontSize: '1.8rem', fontWeight: 900, letterSpacing: 8 }}>
                      거 래 명 세 표
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, fontSize: 13 }}>
                    <div>일자: <strong>{inv.date}</strong></div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{inv.partner} <span style={{ fontSize: 13, fontWeight: 400, color: '#666' }}>귀하</span></div>
                  </div>

                  {/* Supplier / Receiver */}
                  <div style={{ display: 'flex', border: '1px solid #000', marginBottom: 16 }}>
                    {[
                      {
                        label: '공 급 자',
                        bizNum: systemSettings.company?.bizNum || systemSettings.businessNo || '-',
                        name: companyName || systemSettings.company?.name || '-',
                        ceo: systemSettings.company?.ceo || systemSettings.ceo || '-',
                        address: systemSettings.company?.address || systemSettings.address || '-',
                      },
                      {
                        label: '공급받는자',
                        bizNum: partnerDetail.businessNo || '-',
                        name: inv.partner,
                        ceo: partnerDetail.ceo || '-',
                        address: partnerDetail.address || '-',
                      },
                    ].map((side, i) => (
                      <div key={i} style={{ flex: 1, borderRight: i === 0 ? '1px solid #000' : 'none', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: '#f8fafc', borderBottom: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 900, fontSize: 12 }}>
                          {side.label}
                        </div>
                        <div style={{ display: 'flex', flex: 1 }}>
                          <div style={{ width: 72, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', fontSize: 11, fontWeight: 700, background: '#f8fafc' }}>
                            {['등록번호', '상호명', '대표자', '주소'].map(label => (
                              <div key={label} style={{ padding: '6px', borderBottom: '1px solid #ddd', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {label}
                              </div>
                            ))}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: 11 }}>
                            {[side.bizNum, side.name, side.ceo, side.address].map((val, j) => (
                              <div key={j} style={{ padding: '6px 10px', borderBottom: '1px solid #ddd', flex: 1, display: 'flex', alignItems: 'center', fontWeight: j === 1 ? 700 : 400 }}>
                                {val}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['월/일', '품명', '규격', '수량',
                          ...(!currentUser?.hidePrice ? ['단가', '공급가액', '세액'] : [])
                        ].map(h => (
                          <th key={h} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{inv.date.substring(5)}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }}>{item.name}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{item.spec || '-'}</td>
                          <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{item.qty}</td>
                          {!currentUser?.hidePrice && (
                            <>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{(item.price || 0).toLocaleString()}</td>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{(item.supplyValue || 0).toLocaleString()}</td>
                              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{(item.tax || 0).toLocaleString()}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 6 - inv.items.length) }).map((_, i) => (
                        <tr key={`e-${i}`} style={{ height: 24 }}>
                          {[...'1234', ...(!currentUser?.hidePrice ? '567' : '')].map((_, j) => (
                            <td key={j} style={{ border: '1px solid #ddd' }} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '7px', textAlign: 'center', fontSize: 13 }}>합 계 금 액</td>
                        <td colSpan={currentUser?.hidePrice ? 1 : 4} style={{ border: '1px solid #000', padding: '7px', textAlign: 'right', color: '#1e3a8a', fontSize: 14 }}>
                          {currentUser?.hidePrice
                            ? `${inv.items.reduce((s, i) => s + i.qty, 0)}개`
                            : `${inv.totalAmount.toLocaleString()}원`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {!currentUser?.hidePrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 16 }}>
                      <span>공급가액 합계: {inv.items.reduce((s, i) => s + (i.supplyValue || 0), 0).toLocaleString()}원</span>
                      <span>세액 합계: {inv.items.reduce((s, i) => s + (i.tax || 0), 0).toLocaleString()}원</span>
                    </div>
                  )}

                  <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#333' }}>
                    위 금액을 정히 영수(청구)함.
                  </div>
                </div>
              </div>

              <div className="mall-modal-footer">
                <button className="mall-btn mall-btn-secondary" style={{ width: '100%', padding: 12 }} onClick={() => setSelectedInvoice(null)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hidden print layout */}
      {selectedInvoice && (() => {
        const inv = selectedInvoice;
        const partnerDetail = partners.find(p => p.name === inv.partner) || {};
        return (
          <div className="mall-print-only">
            <div style={{ maxWidth: 780, margin: '0 auto', padding: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{ display: 'inline-block', border: '3px double #000', padding: '8px 36px', fontSize: '1.8rem', fontWeight: 900, letterSpacing: 8 }}>
                  거 래 명 세 표
                </h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
                  <span>일자: {inv.date}</span>
                  <span>거래처: {inv.partner} 귀하</span>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 16 }}>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ width: '5%', textAlign: 'center', fontWeight: 900, border: '1px solid #000', background: '#f1f5f9', fontSize: 12 }}>공<br/>급<br/>자</td>
                    {[['등록번호', systemSettings.company?.bizNum || '-'], ['상호(법인명)', companyName || systemSettings.company?.name || '-'], ['성명(대표자)', systemSettings.company?.ceo || '-'], ['주소', systemSettings.company?.address || '-']].slice(0, 1).map(([k, v]) => (
                      <React.Fragment key={k}>
                        <td style={{ width: '15%', border: '1px solid #000', padding: '5px', fontSize: 11, fontWeight: 700, background: '#f8fafc' }}>{k}</td>
                        <td style={{ width: '30%', border: '1px solid #000', padding: '5px', fontSize: 11 }}>{v}</td>
                      </React.Fragment>
                    ))}
                    <td rowSpan={4} style={{ width: '5%', textAlign: 'center', fontWeight: 900, border: '1px solid #000', background: '#f1f5f9', fontSize: 12 }}>공<br/>급<br/>받<br/>는<br/>자</td>
                    <td style={{ width: '15%', border: '1px solid #000', padding: '5px', fontSize: 11, fontWeight: 700, background: '#f8fafc' }}>등록번호</td>
                    <td style={{ width: '30%', border: '1px solid #000', padding: '5px', fontSize: 11 }}>{partnerDetail.businessNo || '-'}</td>
                  </tr>
                  {[
                    [['상호(법인명)', companyName || systemSettings.company?.name || '-'], ['상호(법인명)', inv.partner]],
                    [['성명(대표자)', systemSettings.company?.ceo || '-'], ['성명(대표자)', partnerDetail.ceo || '-']],
                    [['주소', systemSettings.company?.address || '-'], ['주소', partnerDetail.address || '-']],
                  ].map(([left, right], i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', padding: '5px', fontSize: 11, fontWeight: 700, background: '#f8fafc' }}>{left[0]}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', fontSize: 11 }}>{left[1]}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', fontSize: 11, fontWeight: 700, background: '#f8fafc' }}>{right[0]}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', fontSize: 11 }}>{right[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['월/일', '품명', '규격', '수량', ...(!currentUser?.hidePrice ? ['단가', '공급가액', '세액'] : [])].map(h => (
                      <th key={h} style={{ border: '1px solid #000', padding: '5px', fontSize: 11, textAlign: 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: 11 }}>{inv.date.substring(5)}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 700, fontSize: 11 }}>{item.name}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: 11 }}>{item.spec || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: 11 }}>{item.qty}</td>
                      {!currentUser?.hidePrice && (
                        <>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontSize: 11 }}>{(item.price || 0).toLocaleString()}</td>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontSize: 11 }}>{(item.supplyValue || 0).toLocaleString()}</td>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontSize: 11 }}>{(item.tax || 0).toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 8 - inv.items.length) }).map((_, i) => (
                    <tr key={`pe-${i}`} style={{ height: 28 }}>
                      {[1, 2, 3, 4, ...(!currentUser?.hidePrice ? [5, 6, 7] : [])].map(j => (
                        <td key={j} style={{ border: '1px solid #ddd' }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: '7px', textAlign: 'center' }}>합 계 금 액</td>
                    <td colSpan={currentUser?.hidePrice ? 1 : 4} style={{ border: '1px solid #000', padding: '7px', textAlign: 'right', fontSize: 14 }}>
                      {currentUser?.hidePrice ? `${inv.items.reduce((s, i) => s + i.qty, 0)}개` : `${inv.totalAmount.toLocaleString()}원`}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ textAlign: 'center', marginTop: 32, fontWeight: 700 }}>위 금액을 정히 영수(청구)함.</div>
            </div>
          </div>
        );
      })()}

      {/* ---- FOOTER ---- */}
      <footer className="mall-footer">
        <div className="mall-footer-inner">
          <div className="mall-footer-logo">{mallName}</div>
          <div className="mall-footer-info">
            사업자등록번호: {systemSettings.company?.bizNum || systemSettings.businessNo || '123-45-67890'}&nbsp;&nbsp;
            대표자: {systemSettings.company?.ceo || systemSettings.ceo || '대표자'}<br />
            고객센터: {systemSettings.phone || systemSettings.company?.phone || '1588-0000'}&nbsp;&nbsp;
            평일 09:00 ~ 18:00 (주말·공휴일 휴무)<br />
            본 플랫폼은 거래처 전용 주문 시스템입니다.
          </div>
          <div className="mall-footer-copy">
            © {new Date().getFullYear()} {mallName}. Powered by LINK-X ERP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PartnerShoppingMall;
