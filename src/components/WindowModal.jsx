import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2, Star } from 'lucide-react';
import './WindowModal.css';

// Global tracking for minimized windows to arrange them side by side
let minimizedWindowsList = [];
let minimizedChangeListeners = [];

// Global tracking for open windows to cascade their positions on desktop
let openWindowsList = [];
let openChangeListeners = [];

const addOpenWindow = (title) => {
  if (!openWindowsList.includes(title)) {
    openWindowsList = [...openWindowsList, title];
    openChangeListeners.forEach(fn => fn());
  }
};

const removeOpenWindow = (title) => {
  if (openWindowsList.includes(title)) {
    openWindowsList = openWindowsList.filter(t => t !== title);
    openChangeListeners.forEach(fn => fn());
  }
};

const addMinimizedWindow = (title) => {
  if (!minimizedWindowsList.includes(title)) {
    minimizedWindowsList = [...minimizedWindowsList, title];
    minimizedChangeListeners.forEach(fn => fn());
  }
};

const removeMinimizedWindow = (title) => {
  if (minimizedWindowsList.includes(title)) {
    minimizedWindowsList = minimizedWindowsList.filter(t => t !== title);
    minimizedChangeListeners.forEach(fn => fn());
  }
};

const getMinimizedIndex = (title) => {
  return minimizedWindowsList.indexOf(title);
};

const subscribeToMinimizedChanges = (fn) => {
  minimizedChangeListeners.push(fn);
  return () => {
    minimizedChangeListeners = minimizedChangeListeners.filter(l => l !== fn);
  };
};

let globalZIndex = 5000;

const getMenuIdFromTitle = (title) => {
  if (title.includes('직원')) return 'staff';
  if (title.includes('창고 이동') || title.includes('창고이동')) return 'inventory_transfer';
  if (title.includes('재고 이동 현황')) return 'inventory_movement_manager';
  if (title.includes('창고')) return 'warehouse';
  if (title.includes('거래처')) return 'partner';
  if (title.includes('품목')) return 'product';
  if (title.includes('계좌')) return 'account';
  if (title.includes('일정')) return 'schedule';
  if (title.includes('발주')) return 'purchase_order';
  if (title.includes('매입전표')) return 'purchase_invoice';
  if (title.includes('매입원장') || title.includes('매입처원장')) return 'purchase_ledger';
  if (title.includes('매출전표내역')) return 'sales_invoice_list';
  if (title.includes('매출전표')) return 'sales_invoice';
  if (title.includes('매출원장') || title.includes('매출처원장')) return 'sales_ledger';
  if (title.includes('주문') || title.includes('수주')) return 'sales_order'; 
  if (title.includes('결산')) return 'cash_report_1';
  if (title.includes('입출금')) return 'cash_report_2';
  if (title.includes('매출보고서')) return 'sales_report';
  if (title.includes('재고보고서') || title.includes('재고 현황')) return 'inventory_report_1';
  if (title.includes('재고 손실 조정')) return 'inventory_adjustment';
  if (title.includes('미수금')) return 'receivables';
  if (title.includes('수정/삭제')) return 'edit_delete';
  if (title.includes('실적')) return 'staff_perf';
  if (title.includes('세금신고')) return 'tax_report';
  if (title.includes('경비출금')) return 'expense';
  if (title.includes('데이터 전체')) return 'data_manager';
  if (title.includes('환경설정')) return 'settings';
  return null;
};

const WindowModal = ({ title, onClose, children, width, height, zIndex, contentPadding, noScroll, className, style }) => {
  // Detect mobile view from localStorage, window width, or URL
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;

  // Load saved size and state from localStorage based on title
  const [savedData, setSavedData] = useState(() => {
    try {
      const saved = localStorage.getItem(`windowConfig_${title}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [position, setPosition] = useState(() => {
    if (isMobileView) return { x: 0, y: 0 };
    // Cascade open windows: offset each new window slightly
    const index = openWindowsList.length;
    return { x: index * 25, y: index * 25 };
  });
  const [isDragging, setIsDragging] = useState(false);
  
  // Default isMaximized should prioritize saved state, then mobile detection
  const [isMaximized, setIsMaximized] = useState(() => {
    if (isMobileView) return true;
    if (savedData?.isMaximized !== undefined) return savedData.isMaximized;
    return false;
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [minimizedIndex, setMinimizedIndex] = useState(-1);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [localZIndex, setLocalZIndex] = useState(() => {
    if (zIndex && zIndex > globalZIndex) {
      globalZIndex = zIndex;
      return zIndex;
    }
    globalZIndex += 10;
    return globalZIndex;
  });

  const menuId = getMenuIdFromTitle(title);
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('favoriteMenus')) || [];
      return favs.includes(menuId);
    } catch { return false; }
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      const favs = e.detail;
      setIsFavorite(favs.includes(menuId));
    };
    window.addEventListener('favoritesUpdated', handleUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleUpdate);
  }, [menuId]);

  const toggleFavorite = (e) => {
    e.stopPropagation();
    if (!menuId) return;
    window.dispatchEvent(new CustomEvent('toggleFavorite', { detail: menuId }));
  };

  const bringToFront = () => {
    if (localZIndex < globalZIndex) {
      globalZIndex += 10;
      setLocalZIndex(globalZIndex);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    addOpenWindow(title);
    return () => {
      removeOpenWindow(title);
    };
  }, [title]);

  useEffect(() => {
    const unsubscribe = subscribeToMinimizedChanges(() => {
      setMinimizedIndex(getMinimizedIndex(title));
    });
    return unsubscribe;
  }, [title]);

  useEffect(() => {
    if (isMinimized) {
      addMinimizedWindow(title);
    } else {
      removeMinimizedWindow(title);
    }
    return () => {
      removeMinimizedWindow(title);
    };
  }, [isMinimized, title]);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const resizeTimeout = useRef(null);

  const handleMouseDown = (e) => {
    if (isMaximized) return; // Prevent dragging when maximized
    // Only allow dragging from the titlebar
    if (e.target.closest('.window-controls')) return;
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    modalPos.current = { ...position };
    
    // Set global cursor to grabbing during drag
    document.body.style.cursor = 'grabbing';
  };

  const toggleMaximize = () => {
    if (isMinimized) setIsMinimized(false);
    const nextState = !isMaximized;
    setIsMaximized(nextState);
    
    // Save maximization state
    const current = JSON.parse(localStorage.getItem(`windowConfig_${title}`) || '{}');
    localStorage.setItem(`windowConfig_${title}`, JSON.stringify({
      ...current,
      isMaximized: nextState
    }));
  };

  const toggleMinimize = (e) => {
    if (e) e.stopPropagation();
    setIsMinimized(!isMinimized);
    if (!isMinimized && isMaximized) {
      setIsMaximized(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      setPosition({
        x: modalPos.current.x + dx,
        y: modalPos.current.y + dy
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = '';
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // ResizeObserver to detect size changes from native CSS resize
  useEffect(() => {
    if (!containerRef.current || isMaximized) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const actualWidth = containerRef.current.offsetWidth;
        const actualHeight = containerRef.current.offsetHeight;
        
        // Debounce saving to localStorage
        if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
        resizeTimeout.current = setTimeout(() => {
          const current = JSON.parse(localStorage.getItem(`windowConfig_${title}`) || '{}');
          localStorage.setItem(`windowConfig_${title}`, JSON.stringify({
            ...current,
            width: actualWidth,
            height: actualHeight
          }));
        }, 500);
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
    };
  }, [title, isMaximized]);

  const targetX = isMinimized ? -(windowSize.width / 2) + 140 + 20 + (minimizedIndex * 290) : position.x;
  const targetY = isMinimized ? (windowSize.height / 2) - 20 - 20 : position.y;

  return (
    <div className={`window-overlay ${isMaximized ? 'maximized' : ''} ${isMinimized ? 'minimized' : ''}`} style={{ zIndex: localZIndex }}>
      <div 
        ref={containerRef}
        onMouseDownCapture={bringToFront}
        onTouchStartCapture={bringToFront}
        className={`window-container ${isMaximized ? 'is-maximized' : ''} ${isMinimized ? 'is-minimized' : ''} ${className || ''}`} 
        style={{ 
          transform: (isMaximized || isMobileView) ? 'none' : `translate(${targetX}px, ${targetY}px)`,
          transition: isDragging && !isMinimized ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s, height 0.3s',
          width: isMaximized ? '100vw' : (isMinimized ? '280px' : (savedData?.width || width || '1400px')),
          height: isMaximized ? '100vh' : (isMinimized ? '40px' : (savedData?.height || height || '1100px')),
          top: isMaximized ? 0 : undefined,
          left: isMaximized ? 0 : undefined,
          borderRadius: isMaximized ? 0 : undefined,
          overflow: isMinimized ? 'hidden' : 'hidden',
          ...style
        }}
      >
        {/* Window Title Bar */}
        <div 
          className="window-titlebar" 
          onMouseDown={handleMouseDown}
          onDoubleClick={toggleMaximize}
          style={{ cursor: (isDragging ? 'grabbing' : (isMaximized ? 'default' : 'grab')) }}
        >
          <div className="window-title">{title}</div>
          <div className="window-controls">
            {menuId && (
              <button 
                className="window-btn" 
                onClick={toggleFavorite}
                title={isFavorite ? "즐겨찾기 해제" : "대시보드 위젯에 즐겨찾기 추가"}
              >
                <Star size={14} color={isFavorite ? "#eab308" : "#94a3b8"} fill={isFavorite ? "#eab308" : "none"} />
              </button>
            )}
            {!isMobileView && (
              <>
                <button className="window-btn" onClick={toggleMinimize}>
                  {isMinimized ? <Maximize2 size={12} /> : <Minus size={14} />}
                </button>
                <button className="window-btn" onClick={toggleMaximize}>
                  {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              </>
            )}
            <button className="window-btn close-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        
        {/* Window Content */}
        {!isMinimized && (
          <div 
            className="window-content-area" 
            style={{ 
              height: isMaximized ? 'calc(100vh - 40px)' : undefined,
              padding: contentPadding || undefined,
              overflowY: noScroll ? 'hidden' : 'auto',
              overflowX: noScroll ? 'hidden' : 'auto'
            }}
          >
            {children}
          </div>
        )}

        {/* Custom Resize Indicator (Hide when maximized) */}
        {!isMaximized && (
          <div className="resize-handle-indicator">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 1L1 11M11 6L6 11M11 11L11.01 11" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default WindowModal;
