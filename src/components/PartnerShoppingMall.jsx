import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingCart, User, Menu, ChevronRight, Plus, Minus, 
  Flame, Sparkles, CloudSun, Anchor, Fish, LogOut, Package, Heart
} from 'lucide-react';
import './PartnerShoppingMall.css';

// Categories and Menus are now derived dynamically from props in the component
const SORT_OPTIONS = ['최신순', '인기순', '낮은 가격순', '높은 가격순'];

const HomeSection = ({ title, products, onOrder, quantities, handleQtyChange, favorites, onToggleFavorite, currentUser }) => (
  <div className="home-section" style={{ marginBottom: '60px' }}>
    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{title}</h2>
      <span style={{ fontSize: '14px', color: '#868e96', cursor: 'pointer' }}>더보기 &gt;</span>
    </div>
    <div className="product-grid">
      {products.map((p, idx) => (
        <ProductCard 
          key={p.id} 
          p={p} 
          idx={idx} 
          showBadge={title === '추천 상품'} 
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

const ProductCard = ({ p, idx, showBadge, quantities, handleQtyChange, handleOrder, isFavorite, onToggleFavorite, currentUser }) => {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const photos = p.photos && p.photos.length > 0 ? p.photos : (p.photo ? [p.photo] : []);

  const nextImg = (e) => {
    e.stopPropagation();
    setCurrentImgIdx((currentImgIdx + 1) % photos.length);
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setCurrentImgIdx((currentImgIdx - 1 + photos.length) % photos.length);
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        {idx < 4 && showBadge && <div className="rank-badge">{idx + 1}</div>}
        <img 
          src={photos[currentImgIdx] || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}&backgroundColor=f1f3f5`} 
          alt={p.name} 
          className="product-image"
        />
        
        {photos.length > 1 && (
          <>
            <div className="image-nav-btn prev" onClick={prevImg}>
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <div className="image-nav-btn next" onClick={nextImg}>
              <ChevronRight size={16} />
            </div>
            <div className="image-dots">
              {photos.map((_, i) => (
                <div key={i} className={`dot ${i === currentImgIdx ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}

        <div className="cart-overlay" onClick={() => handleOrder(p)}>
          <ShoppingCart size={20} color="#333" />
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.name); }}
          style={{ 
            position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', 
            border: 'none', borderRadius: '50%', width: '36px', height: '36px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)', color: isFavorite ? '#ef4444' : '#94a3b8',
            zIndex: 10, transition: 'transform 0.2s ease'
          }}
          className="fav-toggle-btn"
        >
          <Heart size={20} fill={isFavorite ? '#ef4444' : 'none'} />
        </button>
      </div>
      
      <div className="product-info">
        <div className="product-meta">{p.category || '일반상품'}</div>
        <div className="product-name">{p.name} {p.spec || ''}</div>
        
        <div className="product-rating">
          ★★★★★ <span>({(p.id % 50) + 10})</span>
        </div>

        {currentUser?.hidePrice ? (
          <div className="product-price-row">
            <div className="product-price" style={{ color: '#868e96', fontSize: '0.85rem', fontWeight: 600 }}>가격 비공개</div>
          </div>
        ) : (
          <div className="product-price-row">
            <div className="product-discount">{15 + (p.id % 10)}%</div>
            <div className="product-price">{(p.salesPriceSingle || p.salesPrice || 0).toLocaleString()}원</div>
          </div>
        )}
        
        <div className="product-order-area">
          <div className="qty-control" style={{ width: '100px' }}>
            <button className="qty-btn" onClick={() => handleQtyChange(p.id, -1)}><Minus size={14} /></button>
            <input type="text" className="qty-input" value={quantities[p.id] || 1} readOnly />
            <button className="qty-btn" onClick={() => handleQtyChange(p.id, 1)}><Plus size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PartnerShoppingMall = ({ products, categories = [], systemSettings = {}, salesOrders = [], salesInvoices = [], partners = [], currentUser, onLogout, onOrder, onUpdateOrder, onDeleteOrder, companyName }) => {
  const [activeCat, setActiveCat] = useState('home');
  const mallName = (companyName || systemSettings.company?.name || '회원사') + '몰';
  const [selectedInvoiceForStatement, setSelectedInvoiceForStatement] = useState(null);

  const [activeSort, setActiveSort] = useState('최신순');
  const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [quantities, setQuantities] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('pending'); // 'pending', 'past', 'frequent'
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Cart persistence management
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`mall_cart_${currentUser.name}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse cart from localStorage:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`mall_cart_${currentUser.name}`, JSON.stringify(cart));
  }, [cart, currentUser.name]);

  const handleClearCart = (e) => {
    if (e) e.stopPropagation();
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setShowClearConfirm(false);
  };
  
  // Favorites management
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem(`mall_favs_${currentUser.name}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(`mall_favs_${currentUser.name}`, JSON.stringify(favorites));
  }, [favorites, currentUser.name]);

  const toggleFavorite = (productName) => {
    setFavorites(prev => 
      prev.includes(productName) 
        ? prev.filter(n => n !== productName) 
        : [...prev, productName]
    );
  };

  // Helper for item editing in history
  const handleHistoryItemQty = (order, itemIdx, delta) => {
    const updatedItems = [...(order.items || [])];
    const item = updatedItems[itemIdx];
    if (item.loaded) return; 

    const newQty = Math.max(1, item.qty + delta);
    updatedItems[itemIdx] = { ...item, qty: newQty };
    
    onUpdateOrder(order.id, { 
      items: updatedItems,
      itemsText: updatedItems.map(i => `${i.name}${i.qty}`).join(' ') 
    });
  };

  const handleHistoryItemDelete = (order, itemIdx) => {
    if (!window.confirm('해당 품목을 주문에서 삭제하시겠습니까?')) return;
    
    const updatedItems = order.items.filter((_, idx) => idx !== itemIdx);
    if (updatedItems.length === 0) {
      onDeleteOrder(order.id);
    } else {
      onUpdateOrder(order.id, { 
        items: updatedItems,
        itemsText: updatedItems.map(i => `${i.name}${i.qty}`).join(' ')
      });
    }
  };

  // Logic for Frequent/Past orders
  const myOrders = useMemo(() => salesOrders.filter(o => o.partner === currentUser.name), [salesOrders, currentUser]);
  const myPendingOrders = useMemo(() => myOrders.filter(o => o.status === '주문대기'), [myOrders]);
  const myPastOrders = useMemo(() => myOrders.filter(o => o.status !== '주문대기'), [myOrders]);
  const myPastInvoices = useMemo(() => {
    return (salesInvoices || []).filter(inv => inv.partner === currentUser.name)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [salesInvoices, currentUser.name]);
  
  const frequentProducts = useMemo(() => {
    // Show manually favorited products primarily
    return products.filter(p => favorites.includes(p.name));
  }, [favorites, products]);

  // Helper to get all sub-category names for filtering
  const getSubCategoryNames = (catName) => {
    if (catName === 'all' || catName === 'home' || !catName) return [];
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

  const getFilteredList = (cat, sort = activeSort) => {
    let list = products.filter(p => p.showInMall !== false);
    
    if (searchText) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(searchText.toLowerCase()) || 
        (p.abbreviation && p.abbreviation.toLowerCase().includes(searchText.toLowerCase())) || 
        (p.spec && p.spec.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    if (sort === '낮은 가격순') list.sort((a, b) => (Number(a.salesPriceSingle || a.salesPrice || 0)) - (Number(b.salesPriceSingle || b.salesPrice || 0)));
    if (sort === '높은 가격순') list.sort((a, b) => (Number(b.salesPriceSingle || b.salesPrice || 0)) - (Number(a.salesPriceSingle || a.salesPrice || 0)));
    if (sort === '최신순' || sort === '인기순') list.sort((a, b) => b.id - a.id);

    if (cat === 'recommend') return list.slice(0, 8);
    if (cat === 'new') return list.sort((a, b) => b.id - a.id).slice(0, 8);
    if (cat === 'popular') return list.filter((_, i) => i % 2 === 0).slice(0, 8);
    if (cat === 'home' || cat === 'all') return list;
    
    // Support hierarchical filtering
    const targetNames = getSubCategoryNames(cat);
    return list.filter(p => targetNames.includes(p.category));
  };

  const filteredProducts = useMemo(() => getFilteredList(activeCat), [products, categories, activeCat, activeSort, searchText]);

  const handleQtyChange = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const addToCart = (product) => {
    const qty = quantities[product.id] || 1;
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + qty } : item));
    } else {
      setCart([...cart, { product, qty }]);
    }
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    alert(`${product.name} ${qty}개가 장바구니에 담겼습니다.`);
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const submitOrder = () => {
    if (cart.length === 0) return;
    if (window.confirm('장바구니의 모든 품목을 주문하시겠습니까?')) {
      onOrder(cart);
      setCart([]);
      setIsCartOpen(false);
    }
  };

  // Find hierarchical info for breadcrumbs and sub-menus
  const activeCategoryObj = categories.find(c => c.name === activeCat);
  const largeCats = categories.filter(c => String(c.level) === '1' || !c.parentId);
  
  let currentLarge = null;
  let currentMedium = null;
  let currentSmall = null;

  if (activeCategoryObj) {
    if (activeCategoryObj.level === 1) {
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

  return (
    <div className="mall-container">
      <header className="mall-header">
        <div className="mall-logo" onClick={() => { setActiveCat('home'); setIsCatMenuOpen(false); }}>
          <Package size={32} /> {mallName}
        </div>

        <div className="mall-search-bar">
          <Search size={20} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="어떤 상품을 찾으시나요?" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="mall-header-actions">
          <div className="mall-action-item" onClick={() => { setIsOrderHistoryOpen(true); setHistoryTab('pending'); }}>
            <User size={24} />
            <span>나의 주문/기록</span>
          </div>
          <div className="mall-action-item" onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }}>
            <ShoppingCart size={24} />
            <span>장바구니</span>
            {cart.length > 0 && <span className="cart-count-badge">{cart.length}</span>}
          </div>
          <div className="mall-action-item" onClick={onLogout}>
            <LogOut size={24} />
            <span>로그아웃</span>
          </div>
        </div>
      </header>

      <nav className="mall-top-nav">
        <div 
          className={`nav-link all-cats ${isCatMenuOpen ? 'active' : ''}`}
          onClick={() => setIsCatMenuOpen(!isCatMenuOpen)}
        >
          <Menu size={20} /> 카테고리
        </div>
        <div className={`nav-link ${activeCat === 'home' ? 'active' : ''}`} onClick={() => { setActiveCat('home'); setIsCatMenuOpen(false); }}>홈</div>
        <div className={`nav-link ${activeCat === 'recommend' ? 'active' : ''}`} onClick={() => { setActiveCat('recommend'); setIsCatMenuOpen(false); }}>베스트</div>
        <div className={`nav-link ${activeCat === 'new' ? 'active' : ''}`} onClick={() => { setActiveCat('new'); setIsCatMenuOpen(false); }}>신상품</div>
        
        {/* Level 1 Categories in Top Nav */}
        {largeCats.map(cat => (
          <div 
            key={cat.id} 
            className={`nav-link ${currentLarge?.id === cat.id ? 'active' : ''}`}
            onClick={() => { setActiveCat(cat.name); setIsCatMenuOpen(false); }}
          >
            {cat.name}
          </div>
        ))}
      </nav>

      {/* Sub Navigation for Medium/Small levels */}
      {(currentLarge || currentMedium) && (
        <div className="mall-sub-nav" style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '10px 50px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {mediumCats.map(m => (
            <div 
              key={m.id} 
              className={`sub-nav-item ${currentMedium?.id === m.id ? 'active' : ''}`}
              onClick={() => setActiveCat(m.name)}
              style={{ fontSize: '0.9rem', cursor: 'pointer', color: currentMedium?.id === m.id ? '#3b82f6' : '#64748b', fontWeight: currentMedium?.id === m.id ? 700 : 500 }}
            >
              {m.name}
            </div>
          ))}
        </div>
      )}
      
      {currentMedium && smallCats.length > 0 && (
        <div className="mall-small-nav" style={{ background: '#f8fafc', borderBottom: '1px solid #eee', padding: '8px 50px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {smallCats.map(s => (
            <div 
              key={s.id} 
              className={`small-nav-item ${activeCat === s.name ? 'active' : ''}`}
              onClick={() => setActiveCat(s.name)}
              style={{ fontSize: '0.8rem', cursor: 'pointer', color: activeCat === s.name ? '#3b82f6' : '#94a3b8', fontWeight: activeCat === s.name ? 700 : 500 }}
            >
              #{s.name}
            </div>
          ))}
        </div>
      )}

      <div className="breadcrumb-area" style={{ padding: '15px 50px', fontSize: '0.85rem', color: '#94a3b8' }}>
        홈 {currentLarge && ` > ${currentLarge.name}`} {currentMedium && ` > ${currentMedium.name}`} {currentSmall && ` > ${currentSmall.name}`} 
        {!currentLarge && activeCat !== 'home' && ` > ${activeCat === 'recommend' ? '베스트' : activeCat === 'new' ? '신상품' : activeCat}`}
      </div>

      <main className="mall-main">
        {isCatMenuOpen && (
          <aside className="mall-sidebar" style={{ animation: 'fadeInLeft 0.3s ease-out', borderRight: '1px solid #eee' }}>
            <div className="sidebar-title" style={{ padding: '20px', fontWeight: 900, borderBottom: '2px solid #3b82f6' }}>카테고리 전체보기</div>
            <div className="cat-tree-container" style={{ padding: '10px' }}>
              {largeCats.map(lc => (
                <div key={lc.id} className="cat-tree-group" style={{ marginBottom: '15px' }}>
                  <div 
                    className={`cat-tree-large ${currentLarge?.id === lc.id ? 'active' : ''}`}
                    onClick={() => setActiveCat(lc.name)}
                    style={{ fontWeight: 800, padding: '8px', cursor: 'pointer', color: currentLarge?.id === lc.id ? '#3b82f6' : '#1e293b' }}
                  >
                    {lc.name}
                  </div>
                  <div className="cat-tree-mediums" style={{ paddingLeft: '15px', borderLeft: '1px solid #f1f5f9', marginLeft: '5px' }}>
                    {categories.filter(c => String(c.parentId) === String(lc.id)).map(mc => (
                      <div key={mc.id} className="cat-tree-medium-group">
                        <div 
                          className={`cat-tree-medium ${currentMedium?.id === mc.id ? 'active' : ''}`}
                          onClick={() => setActiveCat(mc.name)}
                          style={{ fontSize: '0.85rem', padding: '4px 8px', cursor: 'pointer', color: currentMedium?.id === mc.id ? '#3b82f6' : '#64748b' }}
                        >
                          {mc.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        <section className="mall-content">
          {activeCat === 'home' ? (
            <div className="home-sections">
              <HomeSection title="추천 상품" products={getFilteredList('recommend')} onOrder={addToCart} quantities={quantities} handleQtyChange={handleQtyChange} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} />
              <HomeSection title="신규 상품" products={getFilteredList('new')} onOrder={addToCart} quantities={quantities} handleQtyChange={handleQtyChange} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} />
              <HomeSection title="인기 상품" products={getFilteredList('popular')} onOrder={addToCart} quantities={quantities} handleQtyChange={handleQtyChange} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} />
            </div>
          ) : (
            <>
              <div className="category-title">
                {activeCat === 'all' ? '전체 상품' : activeCat} 상품 리스트
              </div>

              <div className="sort-tabs">
                {SORT_OPTIONS.map(opt => (
                  <div key={opt} className={`sort-tab ${activeSort === opt ? 'active' : ''}`} onClick={() => setActiveSort(opt)}>{opt}</div>
                ))}
              </div>

              <div className="product-grid">
                {filteredProducts.map((p, idx) => (
                  <ProductCard 
                    key={p.id} p={p} idx={idx} 
                    showBadge={activeCat === 'recommend'} 
                    quantities={quantities} 
                    handleQtyChange={handleQtyChange} 
                    handleOrder={addToCart} 
                    isFavorite={favorites.includes(p.name)}
                    onToggleFavorite={toggleFavorite}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="mall-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="mall-modal" onClick={e => e.stopPropagation()}>
            <div className="mall-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2>장바구니 ({cart.length})</h2>
                {cart.length > 0 && (
                  <button 
                    className="clear-all-btn" 
                    onClick={handleClearCart}
                    style={{ 
                      padding: '6px 12px', fontSize: '13px', background: '#fff', 
                      border: '1.5px solid #ff4d4d', color: '#ff4d4d', borderRadius: '8px', 
                      cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s',
                      zIndex: 2100
                    }}
                  >
                    전체 삭제
                  </button>
                )}
              </div>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>×</button>
            </div>
            <div className="mall-modal-body">
              {cart.length === 0 ? (
                <div className="empty-cart-msg">장바구니가 비어있습니다.</div>
              ) : (
                <div className="cart-items-list">
                  {cart.map(item => (
                    <div key={item.product.id} className="cart-item">
                      <div className="item-info">
                        <div className="item-name">{item.product.name}</div>
                        <div className="item-price">{currentUser?.hidePrice ? '가격 비공개' : `${(item.product.salesPriceSingle || item.product.salesPrice || 0).toLocaleString()}원`}</div>
                      </div>
                      <div className="item-controls">
                        <span className="item-qty">{item.qty}개</span>
                        <button className="remove-btn" onClick={() => removeFromCart(item.product.id)}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mall-modal-footer">
              <div className="total-price">
                합계: <span>{currentUser?.hidePrice ? '가격 비공개' : `${cart.reduce((acc, item) => acc + (item.product.salesPriceSingle || item.product.salesPrice || 0) * item.qty, 0).toLocaleString()}원`}</span>
              </div>
              <button className="submit-order-btn" onClick={submitOrder} disabled={cart.length === 0}>최종 주문 제출</button>
            </div>
          </div>
        </div>
      )}

      {/* Order History / My Page Modal */}
      {isOrderHistoryOpen && (
        <div className="mall-modal-overlay" onClick={() => setIsOrderHistoryOpen(false)}>
          <div className="mall-modal" onClick={e => e.stopPropagation()} style={{ width: '1000px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="mall-modal-header" style={{ padding: '20px 20px 0 20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>나의 주문 / 활동 기록</h2>
              </div>
              <div className="history-tabs-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                <div className="history-tabs" style={{ display: 'flex', gap: '30px' }}>
                  <div className={`h-tab ${historyTab === 'pending' ? 'active' : ''}`} onClick={() => setHistoryTab('pending')} style={{ padding: '12px 5px', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', borderBottom: historyTab === 'pending' ? '3px solid #3b82f6' : '3px solid transparent', color: historyTab === 'pending' ? '#3b82f6' : '#94a3b8', whiteSpace: 'nowrap' }}>실시간 주문 현황</div>
                  <div className={`h-tab ${historyTab === 'past' ? 'active' : ''}`} onClick={() => setHistoryTab('past')} style={{ padding: '12px 5px', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', borderBottom: historyTab === 'past' ? '3px solid #3b82f6' : '3px solid transparent', color: historyTab === 'past' ? '#3b82f6' : '#94a3b8', whiteSpace: 'nowrap' }}>이전 주문 내역</div>
                  <div className={`h-tab ${historyTab === 'frequent' ? 'active' : ''}`} onClick={() => setHistoryTab('frequent')} style={{ padding: '12px 5px', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', borderBottom: historyTab === 'frequent' ? '3px solid #3b82f6' : '3px solid transparent', color: historyTab === 'frequent' ? '#3b82f6' : '#94a3b8', whiteSpace: 'nowrap' }}>자주 주문하는 상품</div>
                </div>
                <button 
                  className="header-close-btn" 
                  onClick={() => setIsOrderHistoryOpen(false)}
                  style={{ 
                    background: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 18px', 
                    fontSize: '0.85rem', fontWeight: 800, color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
                    transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  닫기 ×
                </button>
              </div>
            </div>

            <div className="mall-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {historyTab === 'pending' && (
                <div className="pending-orders-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>접수된 주문의 실시간 진행 상황입니다.</div>
                  </div>

                  {myPendingOrders.length === 0 ? (
                    <div className="empty-cart-msg">진행 중인 주문이 없습니다.</div>
                  ) : (
                    <div className="order-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                      {myPendingOrders.map(order => {
                        const items = order.items || [];
                        return (
                          <div key={order.id} className="history-order-card" style={{ padding: '20px', borderRadius: '16px', background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f8fafc' }}>
                              <div className="order-date" style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e293b' }}>{order.date} 주문서</div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="order-status-badge" style={{ backgroundColor: '#eff6ff', color: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{order.status === '주문대기' ? '배송전' : order.status}</div>
                              </div>
                            </div>
                            
                            <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {items.map((item, idx) => {
                                const product = products.find(p => p.name === item.name);
                                const photo = product?.photos?.[0] || product?.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`;
                                return (
                                  <div key={idx} style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                    padding: '12px 15px', background: '#f8fafc', borderRadius: '12px',
                                    border: item.loaded ? '1.5px solid #10b981' : '1px solid #e2e8f0'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                      <img src={photo} alt="" style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover', background: '#fff', border: '1px solid #eee' }} />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>{item.name}</span>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>수량: {item.qty}개</div>
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                      {isEditMode && !item.loaded && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div className="qty-control mini" style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                                            <button 
                                              style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                              onClick={() => handleHistoryItemQty(order, idx, -1)}
                                            ><Minus size={14} /></button>
                                            <button 
                                              style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #cbd5e1' }}
                                              onClick={() => handleHistoryItemQty(order, idx, 1)}
                                            ><Plus size={14} /></button>
                                          </div>
                                          <button 
                                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fee2e2', color: '#ef4444', background: '#fff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                                            onClick={() => handleHistoryItemDelete(order, idx)}
                                          >삭제</button>
                                        </div>
                                      )}
                                      <span style={{ 
                                        fontSize: '0.75rem', fontWeight: 900, 
                                        color: item.loaded ? '#10b981' : '#3b82f6',
                                        background: item.loaded ? '#f0fdf4' : '#eff6ff',
                                        padding: '5px 12px', borderRadius: '8px',
                                        minWidth: '70px', textAlign: 'center',
                                        border: item.loaded ? '1px solid #10b981' : '1px solid #dbeafe'
                                      }}>
                                        {item.loaded ? '배송중' : '배송전'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {historyTab === 'past' && (
                <div className="past-orders-section">
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px', textAlign: 'left' }}>완료된 이전 주문 내역입니다.</div>
                  {myPastInvoices.length === 0 ? (
                    <div className="empty-cart-msg">완료된 주문 내역이 없습니다.</div>
                  ) : (
                    <div className="order-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {myPastInvoices.map(inv => {
                        const itemsText = inv.items.map(i => `${i.name}${i.qty}`).join(' ');
                        return (
                          <div key={inv.id} className="history-order-card" style={{ padding: '20px', borderRadius: '16px', background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1e293b' }}>{inv.date} 매출전표</span>
                                <span style={{ backgroundColor: '#f0fdf4', color: '#10b981', border: '1px solid #10b981', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 900 }}>배송완료</span>
                              </div>
                              <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                                {itemsText}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                                합계금액: <span style={{ color: '#3b82f6', fontWeight: 800 }}>{currentUser?.hidePrice ? '가격 비공개' : `${inv.totalAmount.toLocaleString()}원`}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => setSelectedInvoiceForStatement(inv)}
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 10px rgba(59, 130, 246, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              거래명세표 확인
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {historyTab === 'frequent' && (
                <div className="frequent-products-section">
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px' }}>나만의 단골 상품 리스트입니다. 하트를 눌러 관리할 수 있습니다.</div>
                  {frequentProducts.length === 0 ? (
                    <div className="empty-cart-msg">등록된 자주 주문하는 상품이 없습니다. 상품 목록에서 하트를 눌러 등록해보세요!</div>
                  ) : (
                    <div className="product-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                      {frequentProducts.map(p => (
                        <div key={p.id} style={{ display: 'flex', gap: '15px', padding: '15px', background: '#fff', border: '1px solid #eee', borderRadius: '16px', alignItems: 'center', position: 'relative' }}>
                          <img src={p.photos?.[0] || p.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`} alt="" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>{p.name}</div>
                            <div style={{ color: '#3b82f6', fontWeight: 900, fontSize: '0.95rem' }}>{currentUser?.hidePrice ? '가격 비공개' : `${(p.salesPriceSingle || p.salesPrice || 0).toLocaleString()}원`}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => toggleFavorite(p.name)}
                              style={{ padding: '8px', background: '#fff1f2', color: '#ef4444', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                              title="삭제"
                            >
                              <Heart size={18} fill="#ef4444" />
                            </button>
                            <button 
                              onClick={() => addToCart(p)}
                              style={{ padding: '8px 12px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mall-modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              {historyTab === 'pending' && myPendingOrders.length > 0 ? (
                <button 
                  onClick={() => setIsEditMode(!isEditMode)}
                  style={{ 
                    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                    background: isEditMode ? '#10b981' : '#3b82f6', color: '#fff',
                    fontSize: '1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {isEditMode ? '수정 완료 및 저장' : '나의 주문현황 수정하기'}
                </button>
              ) : (
                <button className="close-action-btn" onClick={() => setIsOrderHistoryOpen(false)} style={{ width: '100%', padding: '12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>닫기</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="mall-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="mall-modal" style={{ width: '350px', padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '15px' }}>장바구니 비우기</div>
            <div style={{ color: '#64748b', marginBottom: '25px', fontSize: '15px', lineHeight: 1.5 }}>
              장바구니의 모든 품목을 삭제하시겠습니까?<br/>이 작업은 되돌릴 수 없습니다.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowClearConfirm(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
              <button 
                onClick={confirmClearCart}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ff4d4d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement Modal Overlay */}
      {selectedInvoiceForStatement && (() => {
        const inv = selectedInvoiceForStatement;
        const partnerDetail = partners.find(p => p.name === inv.partner) || {};
        return (
          <div className="mall-modal-overlay" style={{ zIndex: 11000 }} onClick={() => setSelectedInvoiceForStatement(null)}>
            <div className="mall-modal" style={{ width: '800px', maxHeight: '90vh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
              <div className="mall-modal-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>거래명세표 확인</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => window.print()}
                    style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    인쇄하기
                  </button>
                  <button className="close-btn" style={{ position: 'static', fontSize: '1.5rem', color: '#64748b' }} onClick={() => setSelectedInvoiceForStatement(null)}>×</button>
                </div>
              </div>
              
              <div className="mall-modal-body" style={{ padding: '30px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
                <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '720px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
                  
                  {/* Title */}
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'inline-block', border: '3px double #000', padding: '10px 40px', fontSize: '2rem', fontWeight: 900, letterSpacing: '8px' }}>
                      거 래 명 세 표
                    </div>
                  </div>
                  
                  {/* Meta (Date and Customer) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>일자: {inv.date}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>{inv.partner} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>귀하</span></div>
                  </div>
                  
                  {/* Supplier vs Receiver details block */}
                  <div style={{ display: 'flex', border: '1px solid #000', marginBottom: '20px' }}>
                    {/* Left half: Supplier */}
                    <div style={{ flex: 1, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem' }}>공 급 자</div>
                      <div style={{ display: 'flex', flex: 1 }}>
                        <div style={{ width: '80px', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>등록번호</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>상호명</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>대표자</div>
                          <div style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>주소</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '0.75rem', textAlign: 'left' }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>{systemSettings.company?.bizNum || systemSettings.businessNo || '123-45-67890'}</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px', fontWeight: 700 }}>{companyName || systemSettings.company?.name || '회원사'}</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>{systemSettings.company?.ceo || systemSettings.ceo || '홍길동'}</div>
                          <div style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px', lineHeight: 1.3 }}>{systemSettings.company?.address || systemSettings.address || '대한민국'}</div>
                        </div>
                      </div>
                    </div>
                    {/* Right half: Receiver */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem' }}>공급받는자</div>
                      <div style={{ display: 'flex', flex: 1 }}>
                        <div style={{ width: '80px', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>등록번호</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>상호명</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>대표자</div>
                          <div style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>주소</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '0.75rem', textAlign: 'left' }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>{partnerDetail.businessNo || '없음'}</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px', fontWeight: 700 }}>{inv.partner}</div>
                          <div style={{ padding: '8px', borderBottom: '1px solid #000', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>{partnerDetail.ceo || '없음'}</div>
                          <div style={{ padding: '8px', flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '10px', lineHeight: 1.3 }}>{partnerDetail.address || '없음'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '0.75rem', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #000' }}>
                        <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>월/일</th>
                        <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>품명</th>
                        <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>규격</th>
                        <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>수량</th>
                        {!currentUser?.hidePrice && <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>단가</th>}
                        {!currentUser?.hidePrice && <th style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>공급가액</th>}
                        {!currentUser?.hidePrice && <th style={{ padding: '6px', textAlign: 'center' }}>세액</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>{inv.date.substring(5)}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 700 }}>{item.name}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>{item.spec || '-'}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'center' }}>{item.qty}</td>
                          {!currentUser?.hidePrice && <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{item.price.toLocaleString()}</td>}
                          {!currentUser?.hidePrice && <td style={{ borderRight: '1px solid #000', padding: '6px', textAlign: 'right' }}>{item.supplyValue.toLocaleString()}</td>}
                          {!currentUser?.hidePrice && <td style={{ padding: '6px', textAlign: 'right' }}>{item.tax.toLocaleString()}</td>}
                        </tr>
                      ))}
                      {/* Empty pad rows */}
                      {Array.from({ length: Math.max(0, 8 - inv.items.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} style={{ height: '26px', borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ borderRight: '1px solid #000' }}></td>
                          <td style={{ borderRight: '1px solid #000' }}></td>
                          <td style={{ borderRight: '1px solid #000' }}></td>
                          <td style={{ borderRight: '1px solid #000' }}></td>
                          {!currentUser?.hidePrice && <td style={{ borderRight: '1px solid #000' }}></td>}
                          {!currentUser?.hidePrice && <td style={{ borderRight: '1px solid #000' }}></td>}
                          {!currentUser?.hidePrice && <td></td>}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #000', fontWeight: 900 }}>
                        <td colSpan="3" style={{ borderRight: '1px solid #000', padding: '8px', fontSize: '0.85rem', textAlign: 'center' }}>합 계 금 액</td>
                        <td colSpan={currentUser?.hidePrice ? 1 : 4} style={{ padding: '8px', fontSize: '1rem', textAlign: 'right', color: '#1e3a8a', paddingRight: '10px' }}>
                          {currentUser?.hidePrice ? `${inv.items.reduce((sum, item) => sum + item.qty, 0)}개` : `${inv.totalAmount.toLocaleString()}원`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  {/* Totals description */}
                  {!currentUser?.hidePrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, borderBottom: '1px dashed #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
                      <div>공급가액 합계: {inv.items.reduce((sum, item) => sum + (item.supplyValue || 0), 0).toLocaleString()}원</div>
                      <div>세액 합계: {inv.items.reduce((sum, item) => sum + (item.tax || 0), 0).toLocaleString()}원</div>
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'center', marginTop: '30px', fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                    위 금액을 정히 영수(청구)함.
                  </div>
                </div>
              </div>
              
              <div className="mall-modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <button className="close-action-btn" style={{ width: '100%', padding: '12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }} onClick={() => setSelectedInvoiceForStatement(null)}>닫기</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hidden Print Layout */}
      {selectedInvoiceForStatement && (() => {
        const inv = selectedInvoiceForStatement;
        const partnerDetail = partners.find(p => p.name === inv.partner) || {};
        return (
          <div className="mall-print-only-container">
            <div className="print-statement">
              <div className="print-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ display: 'inline-block', border: '3px double #000', padding: '10px 40px', fontSize: '2rem', fontWeight: 900, letterSpacing: '8px' }}>거 래 명 세 표</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '0.85rem' }}>
                  <div>일자: {inv.date}</div>
                  <div>거래처: {inv.partner} 귀하</div>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '20px' }}>
                <tbody>
                  <tr>
                    <td rowSpan="4" style={{ width: '5%', textAlign: 'center', fontWeight: 900, border: '1px solid #000', backgroundColor: '#f1f5f9' }}>공<br/>급<br/>자</td>
                    <td style={{ width: '15%', border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>등록번호</td>
                    <td style={{ width: '30%', border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{systemSettings.company?.bizNum || systemSettings.businessNo || '123-45-67890'}</td>
                    <td rowSpan="4" style={{ width: '5%', textAlign: 'center', fontWeight: 900, border: '1px solid #000', backgroundColor: '#f1f5f9' }}>공<br/>급<br/>받<br/>는<br/>자</td>
                    <td style={{ width: '15%', border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>등록번호</td>
                    <td style={{ width: '30%', border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{partnerDetail.businessNo || '없음'}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>상호 (법인명)</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{companyName || systemSettings.company?.name || '회원사'}</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>상호 (법인명)</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{inv.partner}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>성명 (대표자)</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{systemSettings.company?.ceo || systemSettings.ceo || '홍길동'}</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>성명 (대표자)</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{partnerDetail.ceo || '없음'}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>주소</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{systemSettings.company?.address || systemSettings.address || '대한민국'}</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f8fafc' }}>주소</td>
                    <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem' }}>{partnerDetail.address || '없음'}</td>
                  </tr>
                </tbody>
              </table>

              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>월/일</th>
                    <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>품명</th>
                    <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>규격</th>
                    <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>수량</th>
                    {!currentUser?.hidePrice && <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>단가</th>}
                    {!currentUser?.hidePrice && <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>공급가액</th>}
                    {!currentUser?.hidePrice && <th style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>세액</th>}
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>{inv.date.substring(5)}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', fontWeight: 700 }}>{item.name}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>{item.spec || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'center' }}>{item.qty}</td>
                      {!currentUser?.hidePrice && <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'right' }}>{item.price.toLocaleString()}</td>}
                      {!currentUser?.hidePrice && <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'right' }}>{item.supplyValue.toLocaleString()}</td>}
                      {!currentUser?.hidePrice && <td style={{ border: '1px solid #000', padding: '6px', fontSize: '0.75rem', textAlign: 'right' }}>{item.tax.toLocaleString()}</td>}
                    </tr>
                  ))}
                  {/* Empty pad rows */}
                  {Array.from({ length: Math.max(0, 8 - inv.items.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} style={{ height: '30px' }}>
                      <td style={{ border: '1px solid #000' }}></td>
                      <td style={{ border: '1px solid #000' }}></td>
                      <td style={{ border: '1px solid #000' }}></td>
                      <td style={{ border: '1px solid #000' }}></td>
                      {!currentUser?.hidePrice && <td style={{ border: '1px solid #000' }}></td>}
                      {!currentUser?.hidePrice && <td style={{ border: '1px solid #000' }}></td>}
                      {!currentUser?.hidePrice && <td style={{ border: '1px solid #000' }}></td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 900 }}>
                    <td colSpan="3" style={{ border: '1px solid #000', padding: '8px', fontSize: '0.85rem', textAlign: 'center' }}>합 계 금 액</td>
                    <td colSpan={currentUser?.hidePrice ? 1 : 4} style={{ border: '1px solid #000', padding: '8px', fontSize: '1rem', textAlign: 'right' }}>
                      {currentUser?.hidePrice ? `${inv.items.reduce((sum, item) => sum + item.qty, 0)}개` : `${inv.totalAmount.toLocaleString()}원`}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              {!currentUser?.hidePrice && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                  <div>공급가액 합계: {inv.items.reduce((sum, item) => sum + (item.supplyValue || 0), 0).toLocaleString()}원</div>
                  <div>세액 합계: {inv.items.reduce((sum, item) => sum + (item.tax || 0), 0).toLocaleString()}원</div>
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginTop: '40px', fontWeight: 700, fontSize: '1rem' }}>
                위 금액을 정히 영수(청구)함.
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @media screen {
          .mall-print-only-container { display: none !important; }
        }
        @media print {
          /* Hide everything in the body */
          body * {
            display: none !important;
          }
          /* Show the printable container and all its descendents */
          .mall-print-only-container, 
          .mall-print-only-container * {
            display: block !important;
            visibility: visible !important;
          }
          .mall-print-only-container {
            position: fixed;
            left: 0;
            top: 0;
            width: 100% !important;
            height: 100% !important;
            padding: 20px;
            background: white !important;
            z-index: 9999999 !important;
          }
          
          /* Table structures must remain as tables */
          .mall-print-only-container table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .mall-print-only-container thead { display: table-header-group !important; }
          .mall-print-only-container tbody { display: table-row-group !important; }
          .mall-print-only-container tfoot { display: table-footer-group !important; }
          .mall-print-only-container tr { display: table-row !important; }
          .mall-print-only-container th, .mall-print-only-container td {
            display: table-cell !important;
            border: 1px solid #000 !important;
          }
          
          .print-statement {
            max-width: 800px;
            margin: 0 auto;
            color: #000 !important;
            background: white !important;
          }
        }
      `}</style>

      <footer style={{ background: '#fff', borderTop: '1px solid #eee', padding: '40px 50px', marginTop: '50px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '15px' }}>{mallName}</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 2 }}>
              사업자등록번호: {systemSettings.businessNo || '123-45-67890'} | 대표자: {systemSettings.ceo || '홍길동'}<br />
              고객센터: {systemSettings.phone || '1588-0000'} | 평일 09:00 ~ 18:00 (주말 공휴일 휴무)<br />
              본 플랫폼은 거래처 전용 주문 시스템입니다.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PartnerShoppingMall;
