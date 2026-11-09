import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, LogOut, ChevronDown, Calendar as CalendarIcon, MessageSquare, Menu, X, LayoutDashboard, Code } from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';
import { hasMenuPermission, hasMobileMenuPermission } from '../utils/menuPermissions';

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
      perm: currentUser?.role === 'super_admin',
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

  return (
    <header className="header" ref={dropdownRef}>
      {/* 맨 왼쪽: 햄버거 버튼 + 회사명 */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          title="전체 메뉴"
          style={{
            background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: 'white', flexShrink: 0
          }}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {companyLogo ? (
            <img src={companyLogo} alt="Company Logo" style={{ height: '26px', objectFit: 'contain' }} />
          ) : (
            <Package size={18} color="white" />
          )}
          <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px', color: 'white', whiteSpace: 'nowrap' }}>
            {companyName}
          </span>
        </div>
      </div>

      {/* 맨 오른쪽 정렬: [ 개발자모드 버튼 (활성화 시) | 위젯창 아이콘 | 달력 아이콘 ] */}
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        

        <button 
          onClick={() => { playMenuClickSound(); onOpenWidgetModal(); }}
          title="위젯창 열기 (6개 위젯)"
          style={{
            background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '8px',
            width: '34px', height: '34px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#60a5fa', flexShrink: 0
          }}
        >
          <LayoutDashboard size={18} />
        </button>
 
        <button 
          onClick={() => { playMenuClickSound(); onOpenCalendarModal(); }}
          title="달력 열기"
          style={{
            background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px',
            width: '34px', height: '34px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#fbbf24', flexShrink: 0
          }}
        >
          <CalendarIcon size={18} />
        </button>
      </div>

      {/* 햄버거 클릭 시 슬라이드 수직 메뉴 드로어 */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-drawer" style={{
          position: 'absolute',
          top: '52px',
          left: 0,
          right: 0,
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          padding: '16px',
          zIndex: 99999,
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          

          {/* 검색 바 */}
          <div className="search-bar" ref={searchContainerRef} style={{ width: '100%', maxWidth: 'none', marginBottom: '12px', position: 'relative' }}>
            <Search size={16} className="search-icon" style={{ color: '#64748b', left: '10px' }} />
            <input 
              type="text" 
              placeholder="메뉴 검색" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px 8px 34px',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {isSearchFocused && searchQuery.trim() !== '' && (
              <div className="search-results-dropdown" style={{ left: 0, right: 0, width: 'auto' }}>
                {searchResults.map((item, index) => (
                  <div 
                    key={index}
                    className={`search-result-item ${index === selectedIndex ? 'active' : ''}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => { setIsMobileMenuOpen(false); handleSearchResultClick(item); }}
                  >
                    <div className="search-result-category">{item.category}</div>
                    <div className="search-result-title">{item.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 📱 모바일 6대 핵심 메뉴 (직원별 모바일 메뉴 제어와 100% 연동) */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '0.76rem',
              fontWeight: 800,
              color: '#93c5fd',
              marginBottom: '8px',
              paddingLeft: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>📱 모바일 핵심 업무 메뉴</span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>터치하여 즉시 실행</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[
                {
                  id: 'sales_order',
                  perm: hasMobileMenuPermission(currentUser, '모바일_수주'),
                  label: '수주',
                  sub: '수주 등록 · 목록',
                  emoji: '🛒',
                  color: '#3b82f6',
                  action: onOpenSalesOrder
                },
                {
                  id: 'loading_check',
                  perm: hasMobileMenuPermission(currentUser, '모바일_상차'),
                  label: '상차',
                  sub: '품목·거래처 상차체크',
                  emoji: '🚛',
                  color: '#10b981',
                  action: onOpenLoadingCheck || onOpenOrderList
                },
                {
                  id: 'inventory_transfer',
                  perm: hasMobileMenuPermission(currentUser, '모바일_재고이동'),
                  label: '재고이동',
                  sub: '창고 · 차량 이동',
                  emoji: '🔄',
                  color: '#8b5cf6',
                  action: onOpenInventoryTransfer
                },
                {
                  id: 'sales_invoice',
                  perm: hasMobileMenuPermission(currentUser, '모바일_매출전표발행'),
                  label: '매출전표발행',
                  sub: '현장 전표 즉시 발행',
                  emoji: '🧾',
                  color: '#f97316',
                  action: onOpenSalesInvoice
                },
                {
                  id: 'product',
                  perm: hasMobileMenuPermission(currentUser, '모바일_상품등록'),
                  label: '상품등록',
                  sub: '품목 등록 · 관리',
                  emoji: '📦',
                  color: '#0ea5e9',
                  action: onOpenProductManager
                },
                {
                  id: 'partner',
                  perm: hasMobileMenuPermission(currentUser, '모바일_거래처등록'),
                  label: '거래처등록',
                  sub: '거래처 등록 · 관리',
                  emoji: '🤝',
                  color: '#ec4899',
                  action: onOpenPartnerManager
                }
              ].filter(item => item.perm).map(item => (
                <button
                  key={item.id}
                  data-menu-item={item.label}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    playMenuClickSound();
                    if (typeof item.action === 'function') item.action();
                  }}
                  style={{
                    padding: '12px 12px',
                    borderRadius: '10px',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#ffffff'
                  }}
                >
                  <span style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9px',
                    background: `${item.color}22`,
                    border: `1px solid ${item.color}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    flexShrink: 0
                  }}>
                    {item.emoji}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.sub}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ⚙️ 관리자 및 환경설정 메뉴 (접기/펼치기 가능) */}
          {[
            { id: 'settings_license', label: '⚙️ 환경설정 및 관리자 도구', items: [
              { perm: true, label: '📱 모바일 전용 환경설정', action: onOpenMobileSettings || onOpenSettings },
              { perm: hasPerm('직원관리'), label: '👤 직원관리 (모바일 메뉴 제어)', action: onOpenStaffManager },
              { perm: hasPerm('창고관리'), label: '🏠 창고관리', action: onOpenWarehouseManager },
              { perm: hasPerm('데이터 전체 저장/불러오기/삭제'), label: '🗄️ 데이터 전체 저장/불러오기/삭제', action: onOpenDataManager },
              { perm: hasPerm('회사/시스템 환경설정'), label: '🏢 회사/시스템 환경설정', action: onOpenSettings }
            ]}
          ].map(group => {
            const visibleItems = group.items.filter(item => item.perm);
            if (visibleItems.length === 0) return null;
            const isOpen = Boolean(openDrawerSections[group.id]);
            return (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => toggleDrawerSection(group.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(51, 65, 85, 0.45)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: '#94a3b8',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.22s ease'
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '4px 0 4px 8px',
                    gap: '4px'
                  }}>
                    {visibleItems.map((item, idx) => (
                      <button 
                        key={idx} 
                        data-menu-item={item.label}
                        onClick={() => { 
                          setIsMobileMenuOpen(false); 
                          playMenuClickSound(); 
                          if (typeof item.action === 'function') {
                            item.action();
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          fontSize: '0.86rem',
                          color: '#cbd5e1',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textAlign: 'left',
                          width: '100%',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 프로필 & 로그아웃 */}
          <div style={{ 
            marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              {currentUser?.name} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{currentUser?.jobTitle}</span>
            </span>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
              style={{ background: 'transparent', border: 'none', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

