import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, LogOut, ChevronDown, Calendar as CalendarIcon, MessageSquare, Menu, X, LayoutDashboard, Code, Bell, ChevronRight } from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';
import { hasMenuPermission, hasMobileMenuPermission, MOBILE_CORE_MENUS } from '../utils/menuPermissions';

const Header = ({ 
  currentUser, companyLogo, onLogout, onOpenWarehouseManager, onOpenStaffManager, 
  onOpenInventoryTransfer, onOpenInventoryMovementManager, onOpenPartnerManager, onOpenProductManager, 
  onOpenAccountManager, onOpenScheduleList,
  onOpenPurchaseInvoice, onOpenPurchaseLedger, onOpenPurchaseOrder,
  onOpenSalesInvoice, onOpenSalesInvoiceList, onOpenSalesLedger, onOpenSalesOrder, onOpenOrderList, onOpenLoadingCheck, onOpenQuotation, onOpenQuotationManagement,
  onOpenCashReport, onOpenSalesReport, onOpenOrderReport, onOpenInventoryReport, onOpenEditDeleteReport, onOpenCashBook,
  onOpenDepositSlipManagement,
  onOpenWithdrawalSlipManagement,
  onOpenExpenseRegistration, onOpenStaffPerformanceReport, onOpenDataManager,
  onOpenPartnerExcel, onOpenProductExcel, onOpenInventoryTransferExcel, onOpenPurchaseLedgerExcel, onOpenSalesLedgerExcel,
  onOpenSettings, onOpenLicense, onOpenReceivablesReport, onOpenInventoryAdjustment,
  onOpenTaxReport, onOpenPartnerMall, onOpenPlatformManager, companyName,
  onOpenPartnerSpecialPriceManager, onOpenInventoryMismatch, onOpenPhysicalInventory,
  onOpenWarehouseInitialStockBatch,
  onOpenRecentActivityReport,
  onOpenWidgetModal, onOpenCalendarModal, onToggleMobileDrawer,
  settings,
  isDevModeEnabled = false,
  onOpenDevAssistant,
  onOpenMobileSettings
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeSubDropdown, setActiveSubDropdown] = useState(null);
  const dropdownRef = useRef(null);
  
  // Search states and refs
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setActiveSubDropdown(null);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasPerm = (perm) => {
    return hasMenuPermission(currentUser, perm);
  };

  const getMenuItems = () => [
    {
      title: '거래처몰',
      category: '바로가기',
      action: onOpenPartnerMall,
      perm: hasPerm('거래처몰'),
    },
    {
      title: '플랫폼 관리',
      category: '플랫폼',
      action: onOpenPlatformManager,
      perm: currentUser?.role === 'super_admin' || currentUser?.isPlatformAdmin === true || currentUser?.claims?.superAdmin === true || currentUser?.claims?.platform_admin === true,
    },
    // 기초자료등록
    {
      title: '직원관리',
      category: '기초자료등록',
      action: onOpenStaffManager,
      perm: hasPerm('직원관리'),
    },
    {
      title: '창고관리',
      category: '기초자료등록',
      action: onOpenWarehouseManager,
      perm: hasPerm('창고관리'),
    },
    {
      title: '거래처등록/관리',
      category: '기초자료등록',
      action: onOpenPartnerManager,
      perm: hasPerm('거래처등록') || hasPerm('거래처관리'),
      keywords: '거래처등록 거래처관리',
    },
    {
      title: '품목등록/관리',
      category: '기초자료등록',
      action: onOpenProductManager,
      perm: hasPerm('품목등록') || hasPerm('품목관리'),
      keywords: '품목등록 품목관리 상품등록 상품관리',
    },
    {
      title: '일정추가',
      category: '스마트지원',
      action: onOpenScheduleList,
      perm: hasPerm('일정'),
      keywords: '캘린더 스케줄 일정관리',
    },
    // 매입/발주관리
    {
      title: '매입전표 등록',
      category: '매입/발주관리',
      action: onOpenPurchaseInvoice,
      perm: hasPerm('매입전표'),
      keywords: '매입등록 매입입력',
    },
    {
      title: '매입전표 관리',
      category: '매입/발주관리',
      action: onOpenPurchaseLedger,
      perm: hasPerm('매입원장'),
      keywords: '매입조회 매입목록',
    },
    {
      title: '발주 등록',
      category: '매입/발주관리',
      action: onOpenPurchaseOrder,
      perm: hasPerm('발주'),
      keywords: '발주등록 발주서',
    },
    // 매출/수주관리
    {
      title: '매출 전표',
      category: '매출/수주관리',
      action: onOpenSalesInvoice,
      perm: hasPerm('매출전표'),
      keywords: '매출등록 매출입력',
    },
    {
      title: '매출전표내역',
      category: '매출/수주관리',
      action: onOpenSalesInvoiceList,
      perm: hasPerm('매출전표내역'),
      keywords: '매출전표조회 매출목록 발행내역',
    },
    {
      title: '매출원장',
      category: '매출/수주관리',
      action: onOpenSalesLedger,
      perm: hasPerm('매출원장'),
      keywords: '매출조회 매출목록 매출장 거래처원장',
    },
    {
      title: '수주 등록',
      category: '매출/수주관리',
      action: onOpenSalesOrder,
      perm: hasPerm('수주'),
      keywords: '수주등록 수주서',
    },
    {
      title: '수주목록',
      category: '매출/수주관리',
      action: onOpenOrderList,
      perm: hasPerm('수주'),
      keywords: '수주조회 수주현황',
    },
    {
      title: '견적서',
      category: '매출/수주관리',
      action: onOpenQuotation,
      perm: hasPerm('견적서'),
      keywords: '견적서 견적 견적등록 견적서작성 견적관리',
    },
    {
      title: '견적서 관리',
      category: '매출/수주관리',
      action: onOpenQuotationManagement,
      perm: hasPerm('견적서'),
      keywords: '견적서관리 견적관리 견적서목록 견적목록 견적서조회',
    },
    // 입출금관리
    {
      title: '계좌관리',
      category: '입출금관리',
      action: onOpenAccountManager,
      perm: hasPerm('계좌관리'),
      keywords: '은행 계좌 통장',
    },
    {
      title: '결산보고서',
      category: '입출금관리',
      action: () => onOpenCashReport && onOpenCashReport('결산'),
      perm: hasPerm('입출금보고서'),
      keywords: '결산 보고서 자금현황',
    },
    {
      title: '일자별 입출금 현황',
      category: '입출금관리',
      action: () => onOpenCashReport && onOpenCashReport('일자별'),
      perm: hasPerm('입출금보고서'),
      keywords: '일자별입출금 돈흐름',
    },
    {
      title: '계좌별 입출금 현황',
      category: '입출금관리',
      action: () => onOpenCashReport && onOpenCashReport('계좌별'),
      perm: hasPerm('입출금보고서'),
      keywords: '계좌별입출금 통장현황',
    },
    {
      title: '입금전표발행',
      category: '입출금관리',
      action: onOpenDepositSlipManagement,
      perm: hasPerm('입금전표발행'),
      keywords: '입금전표 입금관리 수금 수금관리 입금전표발행 입금등록',
    },
    {
      title: '출금전표발행',
      category: '입출금관리',
      action: onOpenWithdrawalSlipManagement,
      perm: hasPerm('출금전표발행'),
      keywords: '출금전표 출금관리 지급 지급관리 출금전표발행 지급등록 돈주기 미지급금출금',
    },
    {
      title: '금전출납부',
      category: '입출금관리',
      action: onOpenCashBook,
      perm: hasPerm('금전출납부'),
      keywords: '장부 수입지출 현금출납',
    },
    {
      title: '경비출금',
      category: '입출금관리',
      action: onOpenExpenseRegistration,
      perm: hasPerm('경비출금'),
      keywords: '경비등록 비용처리 지출결의',
    },
    // 재고관리
    {
      title: '실재고 입력',
      category: '재고관리',
      action: onOpenPhysicalInventory,
      perm: hasPerm('실재고 입력'),
      keywords: '실재고입력 재고실사 실사 재고입력 실재고',
    },
    {
      title: '창고별 기초재고 일괄설정',
      category: '기초자료등록',
      action: onOpenWarehouseInitialStockBatch,
      perm: hasPerm('창고별 기초재고 일괄설정'),
      keywords: '창고별 기초재고 일괄설정 기초재고 창고기초재고 창고재고설정 초기재고',
    },
    {
      title: '재고이동',
      category: '재고관리',
      action: onOpenInventoryTransfer,
      perm: hasPerm('재고이동'),
      keywords: '재고이동 창고간이동 신규이동',
    },
    {
      title: '매출보고서',
      category: '스마트지원',
      action: onOpenSalesReport,
      perm: hasPerm('매출보고서'),
      keywords: '판매보고서 매출현황',
    },
    {
      title: '수주보고서',
      category: '스마트지원',
      action: onOpenOrderReport,
      perm: hasPerm('수주보고서'),
      keywords: '수주보고서 수주현황',
    },
    {
      title: '일자별 재고이동',
      category: '재고관리',
      action: () => onOpenInventoryReport && onOpenInventoryReport('daily'),
      perm: hasPerm('재고보고서'),
      keywords: '재고현황 날짜별재고 일자별재고현황',
    },
    {
      title: '최종재고',
      category: '재고관리',
      action: () => onOpenInventoryReport && onOpenInventoryReport('final'),
      perm: hasPerm('재고보고서'),
      keywords: '남은재고 최종재고 최종재고현황',
    },
    {
      title: '매입처별 재고',
      category: '재고관리',
      action: () => onOpenInventoryReport && onOpenInventoryReport('partner'),
      perm: hasPerm('재고보고서'),
      keywords: '거래처별재고 매입처재고 매입처별재고현황',
    },
    {
      title: '전표수정/삭제 보고서',
      category: '스마트지원',
      action: onOpenEditDeleteReport,
      perm: hasPerm('전표수정/삭제 보고서'),
      keywords: '수정이력 삭제이력 로그',
    },
    {
      title: '직원 실적 보고서',
      category: '스마트지원',
      action: onOpenStaffPerformanceReport,
      perm: hasPerm('직원 실적 보고서'),
      keywords: '직원매출 직원판매 직원실적 인센티브',
    },
    {
      title: '미수금관리',
      category: '스마트지원',
      action: onOpenReceivablesReport,
      perm: hasPerm('매출처 미수금현황'),
      keywords: '외상 외상값 못받은돈 미수금조회',
    },
    {
      title: '최근 처리 현황 보고서',
      category: '스마트지원',
      action: onOpenRecentActivityReport,
      perm: hasPerm('최근 처리 현황 보고서'),
      keywords: '최근처리현황보고서 최근처리 최근작업 처리이력 작업내역 이력 보고서',
    },
    {
      title: '재고조정 (손실처리)',
      category: '재고관리',
      action: onOpenInventoryAdjustment,
      perm: hasPerm('재고조정 (손실처리)'),
      keywords: '재고조정 손실처리 재고수량조정',
    },
    {
      title: '재고 불일치 현황',
      category: '재고관리',
      action: onOpenInventoryMismatch,
      perm: hasPerm('재고 불일치 현황'),
      keywords: '재고불일치 실사재고 장부재고 차이조정',
    },
    {
      title: '세금신고 지원 보고서',
      category: '스마트지원',
      action: onOpenTaxReport,
      perm: hasPerm('세금신고 지원 보고서'),
      keywords: '부가세 세무 세금계산서 세금신고',
    },
    {
      title: '거래처별 특별단가 관리',
      category: '스마트지원',
      action: onOpenPartnerSpecialPriceManager,
      perm: hasPerm('특별단가관리'),
      keywords: '거래처단가 특별단가 할인단가 단가관리 거래처별특별단가',
    },
    // 데이터관리
    {
      title: '데이터 전체 저장/불러오기/삭제',
      category: '데이터관리',
      action: onOpenDataManager,
      perm: hasPerm('데이터 전체 저장/불러오기/삭제'),
      keywords: '백업 복원 데이터백업 db저장 삭제 데이터삭제 전체삭제',
    },
    // 환경설정
    {
      title: '모바일 전용 환경설정',
      category: '환경설정',
      action: onOpenMobileSettings || onOpenSettings,
      perm: true,
      keywords: '모바일설정 효과음 소리 진동 글자크기 햅틱 미스링 환경설정',
    },
    {
      title: '회사/시스템 환경설정',
      category: '환경설정',
      action: onOpenSettings,
      perm: hasPerm('환경설정'),
      keywords: '설정 옵션 회사정보',
    }
  ];

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase().replace(/\s+/g, '');
    const filtered = getMenuItems().filter(item => {
      if (!item.perm) return false;
      const titleMatch = item.title.toLowerCase().replace(/\s+/g, '').includes(query);
      const categoryMatch = item.category.toLowerCase().replace(/\s+/g, '').includes(query);
      const keywordsMatch = item.keywords ? item.keywords.toLowerCase().replace(/\s+/g, '').includes(query) : false;
      return titleMatch || categoryMatch || keywordsMatch;
    });

    setSearchResults(filtered);
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => (prevIndex - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = searchResults[selectedIndex];
      if (selectedItem && selectedItem.action) {
        playMenuClickSound();
        selectedItem.action();
        setIsMobileMenuOpen(false);
        setSearchQuery('');
        setIsSearchFocused(false);
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      e.target.blur();
    }
  };

  const handleSearchResultClick = (item) => {
    if (item.action) {
      playMenuClickSound();
      item.action();
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

  const handleMenuClick = (menu) => {
    playMenuClickSound();
    setActiveDropdown(activeDropdown === menu ? null : menu);
    setActiveSubDropdown(null);
  };

  const handleSubMenuClick = (e, subMenu) => {
    e.stopPropagation();
    playMenuClickSound();
    setActiveSubDropdown(activeSubDropdown === subMenu ? null : subMenu);
  };

  const closeDropdown = (action) => {
    playMenuClickSound();
    action();
    setActiveDropdown(null);
    setActiveSubDropdown(null);
  };

  const showMenuIcons = settings?.display?.showMenuIcons ?? true;

  const MENU_EMOJIS = {
    '거래처몰': '🛍️',
    '플랫폼 관리': '💻',
    '직원관리': '👤',
    '창고관리': '🏠',
    '거래처등록/관리': '🤝',
    '품목등록/관리': '📦',
    '실재고 입력': '📝',
    '창고별 기초재고 일괄설정': '🏢',
    '재고이동': '🚚',
    '재고조정 (손실처리)': '🔧',
    '재고 불일치 현황': '⚠️',
    '일자별 재고현황': '🗃️',
    '최종 재고': '📦',
    '최종 재고 현황': '📦',
    '매입처별 재고현황': '📋',
    '매입전표 등록': '📥',
    '매입전표 관리': '📋',
    '매입원장': '📊',
    '발주 등록': '📤',
    '매출 전표': '🧾',
    '매출전표등록': '🧾',
    '매출전표내역': '📄',
    '매출원장': '📊',
    '수주 등록': '🛒',
    '간편수주 등록': '🛒',
    '수주목록': '📝',
    '견적서': '📑',
    '견적서 관리': '📑',
    '계좌관리': '💳',
    '입금전표발행': '💰',
    '출금전표발행': '💳',
    '결산보고서': '💰',
    '일자별 입출금 현황': '📈',
    '계좌별 입출금 현황': '📊',
    '금전출납부': '📓',
    '경비출금': '💸',
    '매출보고서': '📉',
    '종합매출보고서': '📉',
    '수주보고서': '📊',
    '전표수정/삭제 보고서': '🔍',
    '직원 실적 보고서': '🏆',
    '미수금관리': '💵',
    '미수금 보고서': '💵',
    '최근 처리 현황 보고서': '📋',
    '거래처별 특별단가 관리': '🏷️',
    '세금신고 지원 보고서': '🧮',
    '일정추가': '📅',
    '데이터 전체 저장/불러오기/삭제': '🗄️',
    '거래처 엑셀파일로 저장/불러오기/삭제': '📊',
    '품목 엑셀파일로 저장/불러오기/삭제': '📈',
    '재고이동 내역 저장/불러오기/삭제': '🚚',
    '재고이동 내역 저장/불러오기': '🚚',
    '매출처원장 저장/불러오기/삭제': '📋',
    '매입처원장 저장/불러오기/삭제': '📝',
    '데이터 전체 저장/불러오기': '🗄️',
    '거래처 엑셀파일로 저장/불러오기': '📊',
    '품목 엑셀파일로 저장/불러오기': '📈',
    '매출처원장 저장/불러오기': '📋',
    '매입처원장 저장/불러오기': '📝',
    '환경설정': '⚙️',
    '정품등록': '🔑'
  };

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDrawerSections, setOpenDrawerSections] = useState({
    basic: true,
    sales: true,
    purchase: true,
    inventory: true,
    cash_mgmt: true,
    report_management: true,
    data: true,
    settings_license: true
  });

  const toggleDrawerSection = (id) => {
    playMenuClickSound();
    setOpenDrawerSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    window.__isMobileMenuOpen = isMobileMenuOpen;
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      try {
        window.history.pushState({ page: 'mobile_menu_open' }, '', window.location.href);
      } catch (e) {}
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleCloseMenu = () => {
      setIsMobileMenuOpen(false);
    };
    const handleOpenMenu = () => {
      setIsMobileMenuOpen(true);
    };
    const handleToggleMenu = () => {
      setIsMobileMenuOpen(prev => !prev);
    };
    window.addEventListener('linkerx_close_mobile_menu', handleCloseMenu);
    window.addEventListener('linkerx_open_mobile_menu', handleOpenMenu);
    window.addEventListener('linkerx_toggle_mobile_menu', handleToggleMenu);
    return () => {
      window.removeEventListener('linkerx_close_mobile_menu', handleCloseMenu);
      window.removeEventListener('linkerx_open_mobile_menu', handleOpenMenu);
      window.removeEventListener('linkerx_toggle_mobile_menu', handleToggleMenu);
    };
  }, []);

  const menuGroups = new Map();
  if (isMobileMenuOpen) {
    for (const item of getMenuItems()) {
      if (!item.perm || typeof item.action !== 'function') continue;
      if (!menuGroups.has(item.category)) menuGroups.set(item.category, []);
      menuGroups.get(item.category).push(item);
    }
  }

  const coreActions = {
    sales_order: onOpenSalesOrder,
    loading_check: onOpenLoadingCheck || onOpenOrderList,
    inventory_transfer: onOpenInventoryTransfer,
    sales_invoice: onOpenSalesInvoice,
    product: onOpenProductManager,
    partner: onOpenPartnerManager,
  };

  const openDrawerItem = item => {
    setIsMobileMenuOpen(false);
    handleSearchResultClick(item);
  };

  return (
    <header className="header mobile-topbar" ref={dropdownRef}>
      <div className="mobile-brand">
        <img className="mobile-brand-mark" src="/logo_icon.png" alt="" />
        <div className="mobile-brand-wordmark">
          <strong>Linker <b>X</b></strong>
          <span>ERP SYSTEM</span>
        </div>
        {companyName && companyName !== 'Link X' && (
          <span className="mobile-brand-company" title={companyName}>{companyName}</span>
        )}
      </div>
      <div className="mobile-topbar-actions">
        <button
          type="button"
          aria-label="알림 및 최근 내역"
          onClick={() => {
            playMenuClickSound();
            onOpenRecentActivityReport?.();
          }}
        >
          <Bell size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={isMobileMenuOpen ? '전체 메뉴 닫기' : '전체 메뉴 열기'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu-drawer"
          onClick={() => {
            playMenuClickSound();
            setIsMobileMenuOpen(open => !open);
          }}
        >
          {isMobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <nav className="mobile-menu-drawer mobile-menu-panel" id="mobile-menu-drawer" aria-label="전체 메뉴">
          <div className="mobile-menu-search" ref={searchContainerRef}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="메뉴 검색"
              placeholder="메뉴 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {isSearchFocused && searchQuery.trim() ? (
            <div className="mobile-menu-results">
              {searchResults.length === 0 && <p>검색 결과가 없습니다.</p>}
              {searchResults.map((item, index) => (
                <button
                  key={item.category + item.title}
                  type="button"
                  className="mobile-menu-row"
                  data-highlighted={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => openDrawerItem(item)}
                >
                  <span>{item.title}</span>
                  <small>{item.category}</small>
                </button>
              ))}
            </div>
          ) : (
            <>
              <section className="mobile-core-menu">
                <h2>핵심 업무</h2>
                <div className="mobile-core-menu-grid">
                  {MOBILE_CORE_MENUS.filter(item => hasMobileMenuPermission(currentUser, item.permKey)).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      data-menu-item={item.label}
                      className="mobile-core-menu-item"
                      style={{ '--tile-color': item.color, '--tile-bg': item.bgColor }}
                      onClick={() => openDrawerItem({ action: coreActions[item.id] })}
                    >
                      <span className="mobile-core-menu-icon" aria-hidden="true">{item.emoji}</span>
                      <span><strong>{item.label}</strong><small>{item.subLabel}</small></span>
                    </button>
                  ))}
                </div>
              </section>

              {[...menuGroups].map(([category, items]) => (
                <section className="mobile-menu-group" key={category}>
                  <button
                    type="button"
                    className="mobile-menu-group-toggle"
                    aria-expanded={Boolean(openDrawerSections[category])}
                    onClick={() => toggleDrawerSection(category)}
                  >
                    <span>{category}</span><ChevronDown size={17} aria-hidden="true" />
                  </button>
                  {openDrawerSections[category] && items.map(item => (
                    <button
                      type="button"
                      className="mobile-menu-row"
                      key={item.title}
                      data-menu-item={item.title}
                      onClick={() => openDrawerItem(item)}
                    >
                      <span>{item.title}</span><ChevronRight size={15} aria-hidden="true" />
                    </button>
                  ))}
                </section>
              ))}

              <button
                type="button"
                className="mobile-menu-row mobile-menu-settings"
                data-menu-item="모바일 전용 환경설정"
                onClick={() => openDrawerItem({ action: onOpenMobileSettings || onOpenSettings })}
              >
                <span>모바일 전용 환경설정</span><ChevronRight size={15} aria-hidden="true" />
              </button>
              <div className="mobile-menu-profile">
                <span>{currentUser?.name} <small>{currentUser?.jobTitle}</small></span>
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}>
                  <LogOut size={16} aria-hidden="true" /> 로그아웃
                </button>
              </div>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
