import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, LogOut, ChevronDown, Calendar as CalendarIcon, MessageSquare, Menu, X, LayoutDashboard } from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';

const Header = ({ 
  currentUser, companyLogo, onLogout, onOpenWarehouseManager, onOpenStaffManager, 
  onOpenInventoryTransfer, onOpenInventoryMovementManager, onOpenPartnerManager, onOpenProductManager, 
  onOpenAccountManager, onOpenScheduleList,
  onOpenPurchaseInvoice, onOpenPurchaseLedger, onOpenPurchaseOrder,
  onOpenSalesInvoice, onOpenSalesInvoiceList, onOpenSalesLedger, onOpenSalesOrder, onOpenOrderList,
  onOpenCashReport, onOpenSalesReport, onOpenOrderReport, onOpenInventoryReport, onOpenEditDeleteReport, onOpenCashBook,
  onOpenExpenseRegistration, onOpenStaffPerformanceReport, onOpenDataManager,
  onOpenPartnerExcel, onOpenProductExcel, onOpenPurchaseLedgerExcel, onOpenSalesLedgerExcel,
  onOpenSettings, onOpenLicense, onOpenReceivablesReport, onOpenInventoryAdjustment,
  onOpenTaxReport, onOpenPartnerMall, onOpenPlatformManager, companyName,
  onOpenPartnerSpecialPriceManager, onOpenInventoryMismatch,
  onOpenWidgetModal, onOpenCalendarModal, onToggleMobileDrawer
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

  const getMenuItems = () => [
    {
      title: '거래처몰',
      category: '바로가기',
      action: onOpenPartnerMall,
      perm: true,
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
      title: '매출전표등록',
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
      title: '간편수주 등록',
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
      perm: hasPerm('수주'),
      keywords: '수주보고서 수주현황',
    },
    {
      title: '일자별 재고현황(창고별이동현황)',
      category: '재고관리',
      action: () => onOpenInventoryReport && onOpenInventoryReport('daily'),
      perm: hasPerm('재고보고서'),
      keywords: '재고현황 날짜별재고',
    },
    {
      title: '최종 재고 현황(창고별 최종재고현황)',
      category: '재고관리',
      action: () => onOpenInventoryReport && onOpenInventoryReport('final'),
      perm: hasPerm('재고보고서'),
      keywords: '남은재고 최종재고',
    },
    {
      title: '매입처별 재고현황',
      category: '재고관리',
      action: () => onOpenInventoryReport && onOpenInventoryReport('partner'),
      perm: hasPerm('재고보고서'),
      keywords: '거래처별재고 매입처재고',
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
      perm: true,
      keywords: '외상 외상값 못받은돈 미수금조회',
    },
    {
      title: '재고조정 (손실처리)',
      category: '재고관리',
      action: onOpenInventoryAdjustment,
      perm: true,
      keywords: '재고조정 손실처리 재고수량조정',
    },
    {
      title: '재고 불일치 현황',
      category: '재고관리',
      action: onOpenInventoryMismatch,
      perm: true,
      keywords: '재고불일치 실사재고 장부재고 차이조정',
    },
    {
      title: '재고 이동 현황 관리',
      category: '재고관리',
      action: onOpenInventoryMovementManager,
      perm: hasPerm('재고이동'),
      keywords: '재고이동 현황 목록 이동내역 관리 수정 삭제',
    },
    {
      title: '세금신고 지원 보고서',
      category: '스마트지원',
      action: onOpenTaxReport,
      perm: true,
      keywords: '부가세 세무 세금계산서 세금신고',
    },
    {
      title: '거래처별 특별단가 관리',
      category: '스마트지원',
      action: onOpenPartnerSpecialPriceManager,
      perm: hasPerm('특별단가관리'),
      keywords: '거래처단가 특별단가 할인단가 단가관리 거래처별특별단가',
    },
    // 시스템관리
    {
      title: '데이터 전체 저장/불러오기',
      category: '시스템관리',
      action: onOpenDataManager,
      perm: hasPerm('데이터 전체 저장/불러오기'),
      keywords: '백업 복원 데이터백업 db저장',
    },
    {
      title: '거래처 엑셀파일로 저장/불러오기',
      category: '시스템관리',
      action: onOpenPartnerExcel,
      perm: hasPerm('거래처 엑셀파일로 저장/불러오기'),
      keywords: '거래처엑셀 업로드 다운로드',
    },
    {
      title: '품목 엑셀파일로 저장/불러오기',
      category: '시스템관리',
      action: onOpenProductExcel,
      perm: hasPerm('품목 엑셀파일로 저장/불러오기'),
      keywords: '품목엑셀 상품엑셀 업로드 다운로드',
    },
    {
      title: '매출처원장 저장/불러오기',
      category: '시스템관리',
      action: onOpenSalesLedgerExcel,
      perm: hasPerm('매출처원장 저장/불러오기'),
      keywords: '매출처엑셀 매출원장엑셀',
    },
    {
      title: '매입처원장 저장/불러오기',
      category: '시스템관리',
      action: onOpenPurchaseLedgerExcel,
      perm: hasPerm('매입처원장 저장/불러오기'),
      keywords: '매입처엑셀 매입원장엑셀',
    },
    // 환경설정&정품등록
    {
      title: '환경설정',
      category: '환경설정&정품등록',
      action: onOpenSettings,
      perm: true,
      keywords: '설정 옵션 회사정보',
    },
    {
      title: '정품등록',
      category: '환경설정&정품등록',
      action: onOpenLicense,
      perm: true,
      keywords: '라이센스 라이선스 시리얼',
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

  const hasPerm = (perm) => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.permissions?.[perm];
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

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <header className="header mobile-header" ref={dropdownRef} style={{
        minWidth: 'auto',
        width: '100%',
        height: 'auto',
        minHeight: '60px',
        padding: '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-darker)',
        position: 'relative',
        zIndex: 99990
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          height: '40px'
        }}>
          {/* Logo */}
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" style={{ height: '28px', objectFit: 'contain' }} />
            ) : (
              <Package size={20} color="white" />
            )}
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>
              {companyName}
            </span>
          </div>

          {/* Hamburger / Close Icon */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Collapsible Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-drawer" style={{
            width: '100%',
            marginTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Search Bar */}
            <div className="search-bar" ref={searchContainerRef} style={{ width: '100%', maxWidth: 'none', margin: '0 0 8px 0' }}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="메뉴 검색" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                style={{ width: '100%' }}
              />
              {isSearchFocused && searchQuery.trim() !== '' && (
                <div className="search-results-dropdown" style={{ left: 0, right: 0, width: 'auto' }}>
                  {searchResults.map((item, index) => (
                    <div 
                      key={index}
                      className={`search-result-item ${index === selectedIndex ? 'active' : ''}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleSearchResultClick(item)}
                    >
                      <div className="search-result-category">{item.category}</div>
                      <div className="search-result-title">{item.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Link - 거래처몰 */}
            <div 
              style={{ padding: '8px 12px', color: '#ff4d4d', fontWeight: 800, cursor: 'pointer' }}
              onClick={() => { setIsMobileMenuOpen(false); onOpenPartnerMall(); }}
            >
              거래처몰
            </div>

            {/* Platform Manager */}
            {currentUser?.role === 'super_admin' && (
              <div 
                style={{ padding: '8px 12px', color: '#fbbf24', fontWeight: 800, cursor: 'pointer' }}
                onClick={() => { setIsMobileMenuOpen(false); onOpenPlatformManager(); }}
              >
                플랫폼 관리
              </div>
            )}

            {/* Category Dropdowns styled for mobile */}
            {[
              { id: 'basic', label: '기초자료등록', items: [
                { perm: hasPerm('직원관리'), label: '직원관리', action: onOpenStaffManager },
                { perm: hasPerm('창고관리'), label: '창고관리', action: onOpenWarehouseManager },
                { perm: (hasPerm('거래처등록') || hasPerm('거래처관리')), label: '거래처등록/관리', action: onOpenPartnerManager },
                { perm: (hasPerm('품목등록') || hasPerm('품목관리')), label: '품목등록/관리', action: onOpenProductManager },
              ]},
              { id: 'inventory', label: '재고관리', items: [
                { perm: hasPerm('재고이동'), label: '재고이동', action: onOpenInventoryTransfer },
                { perm: hasPerm('재고이동'), label: '재고 이동 현황 관리', action: onOpenInventoryMovementManager },
                { perm: true, label: '재고조정 (손실처리)', action: onOpenInventoryAdjustment },
                { perm: true, label: '재고 불일치 현황', action: onOpenInventoryMismatch },
                { perm: hasPerm('재고보고서'), label: '일자별 재고현황', action: () => onOpenInventoryReport && onOpenInventoryReport('daily') },
                { perm: hasPerm('재고보고서'), label: '최종 재고 현황', action: () => onOpenInventoryReport && onOpenInventoryReport('final') },
                { perm: hasPerm('재고보고서'), label: '매입처별 재고현황', action: () => onOpenInventoryReport && onOpenInventoryReport('partner') },
              ]},
              { id: 'purchase', label: '매입/발주관리', items: [
                { perm: hasPerm('매입전표'), label: '매입전표 등록', action: onOpenPurchaseInvoice },
                { perm: hasPerm('매입원장'), label: '매입전표 관리', action: onOpenPurchaseLedger },
                { perm: hasPerm('발주'), label: '발주 등록', action: onOpenPurchaseOrder },
              ]},
              { id: 'sales', label: '매출/수주관리', items: [
                { perm: hasPerm('매출전표'), label: '매출전표등록', action: onOpenSalesInvoice },
                { perm: hasPerm('매출전표내역'), label: '매출전표내역', action: onOpenSalesInvoiceList },
                { perm: hasPerm('매출원장'), label: '매출원장', action: onOpenSalesLedger },
                { perm: hasPerm('수주'), label: '간편수주 등록', action: onOpenSalesOrder },
                { perm: hasPerm('수주'), label: '수주목록', action: onOpenOrderList },
              ]},
              { id: 'cash_mgmt', label: '입출금관리', items: [
                { perm: hasPerm('계좌관리'), label: '계좌관리', action: onOpenAccountManager },
                { perm: hasPerm('입출금보고서'), label: '결산보고서', action: () => onOpenCashReport && onOpenCashReport('결산') },
                { perm: hasPerm('입출금보고서'), label: '일자별 입출금 현황', action: () => onOpenCashReport && onOpenCashReport('일자별') },
                { perm: hasPerm('입출금보고서'), label: '계좌별 입출금 현황', action: () => onOpenCashReport && onOpenCashReport('계좌별') },
                { perm: hasPerm('금전출납부'), label: '금전출납부', action: onOpenCashBook },
                { perm: hasPerm('경비출금'), label: '경비출금', action: onOpenExpenseRegistration },
              ]},
              { id: 'report_management', label: '스마트지원', items: [
                { perm: hasPerm('매출보고서'), label: '매출보고서', action: onOpenSalesReport },
                { perm: hasPerm('수주'), label: '수주보고서', action: onOpenOrderReport },
                { perm: hasPerm('전표수정/삭제 보고서'), label: '전표수정/삭제 보고서', action: onOpenEditDeleteReport },
                { perm: hasPerm('직원 실적 보고서'), label: '직원 실적 보고서', action: onOpenStaffPerformanceReport },
                { perm: true, label: '미수금관리', action: onOpenReceivablesReport },
                { perm: hasPerm('특별단가관리'), label: '거래처별 특별단가 관리', action: onOpenPartnerSpecialPriceManager },
                { perm: true, label: '세금신고 지원 보고서', action: onOpenTaxReport },
                { perm: hasPerm('일정'), label: '일정추가', action: onOpenScheduleList },
              ]},
              { id: 'data', label: '시스템관리', items: [
                { perm: hasPerm('데이터 전체 저장/불러오기'), label: '데이터 전체 저장/불러오기', action: onOpenDataManager },
                { perm: hasPerm('거래처 엑셀파일로 저장/불러오기'), label: '거래처 엑셀파일로 저장/불러오기', action: onOpenPartnerExcel },
                { perm: hasPerm('품목 엑셀파일로 저장/불러오기'), label: '품목 엑셀파일로 저장/불러오기', action: onOpenProductExcel },
                { perm: hasPerm('매출처원장 저장/불러오기'), label: '매출처원장 저장/불러오기', action: onOpenSalesLedgerExcel },
                { perm: hasPerm('매입처원장 저장/불러오기'), label: '매입처원장 저장/불러오기', action: onOpenPurchaseLedgerExcel },
              ]},
              { id: 'settings_license', label: '환경설정&정품등록', items: [
                { perm: true, label: '환경설정', action: onOpenSettings },
                { perm: true, label: '정품등록', action: onOpenLicense },
              ]}
            ].map(group => (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', padding: '4px 12px' }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
                  {group.items.filter(item => item.perm).map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { setIsMobileMenuOpen(false); playMenuClickSound(); item.action(); }}
                      style={{
                        padding: '10px 12px',
                        fontSize: '0.9rem',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Profile & Logout */}
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '16px'
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
  }

  return (
    <header className="header" ref={dropdownRef}>
      <div className="header-left">
        {/* 모바일 아이콘 3개 그룹: [ 햄버거 | 위젯창 | 달력창 ] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
          <button 
            onClick={onToggleMobileDrawer}
            title="전체 메뉴"
            style={{
              background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'white', flexShrink: 0
            }}
          >
            <Menu size={20} />
          </button>
          
          <button 
            onClick={onOpenWidgetModal}
            title="위젯창 열기 (6개 위젯)"
            style={{
              background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '8px',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#60a5fa', flexShrink: 0
            }}
          >
            <LayoutDashboard size={18} />
          </button>

          <button 
            onClick={onOpenCalendarModal}
            title="달력 열기"
            style={{
              background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#fbbf24', flexShrink: 0
            }}
          >
            <CalendarIcon size={18} />
          </button>
        </div>

        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {companyLogo ? (
            <img src={companyLogo} alt="Company Logo" style={{ height: '28px', objectFit: 'contain' }} />
          ) : (
            <Package size={20} color="white" />
          )}
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px', color: 'white', whiteSpace: 'nowrap' }}>
            {companyName}
          </span>
        </div>
        <nav className="nav-links">
          <div className="nav-item" onClick={onOpenPartnerMall} style={{ color: '#ff4d4d', fontWeight: 800 }}>거래처몰</div>

          
          {currentUser?.role === 'super_admin' && (
            <div className="nav-item" onClick={onOpenPlatformManager} style={{ color: '#fbbf24', fontWeight: 800, border: '1px solid #fbbf24', borderRadius: '4px', padding: '2px 8px', marginLeft: '8px' }}>
              플랫폼 관리
            </div>
          )}
          
          {/* 기초자료등록 */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'basic' ? 'active' : ''}`} onClick={() => handleMenuClick('basic')}>
              기초자료등록 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'basic' && (
              <div className="dropdown-menu">
                {hasPerm('직원관리') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenStaffManager)}>직원관리</div>}
                {hasPerm('창고관리') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenWarehouseManager)}>창고관리</div>}
                {(hasPerm('거래처등록') || hasPerm('거래처관리')) && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPartnerManager)}>거래처등록/관리</div>}
                {(hasPerm('품목등록') || hasPerm('품목관리')) && <div className="dropdown-item" onClick={() => closeDropdown(onOpenProductManager)}>품목등록/관리</div>}
              </div>
            )}
          </div>

          {/* 재고관리 */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'inventory' ? 'active' : ''}`} onClick={() => handleMenuClick('inventory')}>
              재고관리 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'inventory' && (
              <div className="dropdown-menu">
                {hasPerm('재고이동') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenInventoryTransfer)}>재고이동</div>}
                {hasPerm('재고이동') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenInventoryMovementManager)}>재고 이동 현황 관리</div>}
                <div className="dropdown-item" onClick={() => closeDropdown(onOpenInventoryAdjustment)}>재고조정 (손실처리)</div>
                <div className="dropdown-item" onClick={() => closeDropdown(onOpenInventoryMismatch)}>재고 불일치 현황</div>
                {hasPerm('재고보고서') && (
                  <>
                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '6px 0' }}></div>
                    <div className="dropdown-item" onClick={() => closeDropdown(() => onOpenInventoryReport && onOpenInventoryReport('daily'))}>일자별 재고현황</div>
                    <div className="dropdown-item" onClick={() => closeDropdown(() => onOpenInventoryReport && onOpenInventoryReport('final'))}>최종 재고 현황</div>
                    <div className="dropdown-item" onClick={() => closeDropdown(() => onOpenInventoryReport && onOpenInventoryReport('partner'))}>매입처별 재고현황</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 매입/발주관리 */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'purchase' ? 'active' : ''}`} onClick={() => handleMenuClick('purchase')}>
              매입/발주관리 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'purchase' && (
              <div className="dropdown-menu">
                {hasPerm('매입전표') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPurchaseInvoice)}>매입전표 등록</div>}
                {hasPerm('매입원장') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPurchaseLedger)}>매입전표 관리</div>}
                {hasPerm('매입원장') && <div className="dropdown-item">매입원장</div>}
                {hasPerm('매입원장') && <div className="dropdown-item">매입처미지급현황</div>}
                {hasPerm('발주') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPurchaseOrder)}>발주 등록</div>}
              </div>
            )}
          </div>

          {/* 매출/수주관리 */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'sales' ? 'active' : ''}`} onClick={() => handleMenuClick('sales')}>
              매출/수주관리 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'sales' && (
              <div className="dropdown-menu">
                {hasPerm('매출전표') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenSalesInvoice)}>매출전표등록</div>}
                {hasPerm('매출전표내역') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenSalesInvoiceList)}>매출전표내역</div>}
                {hasPerm('매출원장') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenSalesLedger)}>매출원장</div>}
                {hasPerm('수주') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenSalesOrder)}>간편수주 등록</div>}
                {hasPerm('수주') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenOrderList)}>수주목록</div>}
              </div>
            )}
          </div>

          {/* 입출금관리 (신규 추가) */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'cash_mgmt' ? 'active' : ''}`} onClick={() => handleMenuClick('cash_mgmt')}>
              입출금관리 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'cash_mgmt' && (
              <div className="dropdown-menu">
                {hasPerm('계좌관리') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenAccountManager)}>계좌관리</div>}
                {hasPerm('입출금보고서') && <div className="dropdown-item" onClick={() => closeDropdown(() => onOpenCashReport && onOpenCashReport('결산'))}>결산보고서</div>}
                {hasPerm('입출금보고서') && <div className="dropdown-item" onClick={() => closeDropdown(() => onOpenCashReport && onOpenCashReport('일자별'))}>일자별 입출금 현황</div>}
                {hasPerm('입출금보고서') && <div className="dropdown-item" onClick={() => closeDropdown(() => onOpenCashReport && onOpenCashReport('계좌별'))}>계좌별 입출금 현황</div>}
                {hasPerm('금전출납부') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenCashBook)}>금전출납부</div>}
                {hasPerm('경비출금') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenExpenseRegistration)}>경비출금</div>}
              </div>
            )}
          </div>

          {/* 스마트지원 */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'report_management' ? 'active' : ''}`} onClick={() => handleMenuClick('report_management')}>
              스마트지원 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'report_management' && (
              <div className="dropdown-menu">
                {hasPerm('매출보고서') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenSalesReport)}>매출보고서</div>}
                {hasPerm('수주') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenOrderReport)}>수주보고서</div>}
                 {hasPerm('전표수정/삭제 보고서') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenEditDeleteReport)}>전표수정/삭제 보고서</div>}
                {hasPerm('직원 실적 보고서') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenStaffPerformanceReport)}>직원 실적 보고서</div>}
                <div className="dropdown-item" onClick={() => closeDropdown(onOpenReceivablesReport)}>미수금관리</div>
                
                {hasPerm('특별단가관리') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPartnerSpecialPriceManager)}>거래처별 특별단가 관리</div>}
                <div className="dropdown-item" onClick={() => closeDropdown(onOpenTaxReport)}>세금신고 지원 보고서</div>
                {hasPerm('일정') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenScheduleList)}>일정추가</div>}
              </div>
            )}
          </div>

          {/* 시스템관리 */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'data' ? 'active' : ''}`} onClick={() => handleMenuClick('data')}>
              시스템관리 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'data' && (
              <div className="dropdown-menu">
                {hasPerm('데이터 전체 저장/불러오기') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenDataManager)}>데이터 전체 저장/불러오기</div>}
                {hasPerm('거래처 엑셀파일로 저장/불러오기') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPartnerExcel)}>거래처 엑셀파일로 저장/불러오기</div>}
                {hasPerm('품목 엑셀파일로 저장/불러오기') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenProductExcel)}>품목 엑셀파일로 저장/불러오기</div>}
                {hasPerm('매출처원장 저장/불러오기') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenSalesLedgerExcel)}>매출처원장 저장/불러오기</div>}
                {hasPerm('매입처원장 저장/불러오기') && <div className="dropdown-item" onClick={() => closeDropdown(onOpenPurchaseLedgerExcel)}>매입처원장 저장/불러오기</div>}
              </div>
            )}
          </div>

          {/* 환경설정&정품등록 (통합) */}
          <div className="dropdown-container">
            <div className={`nav-item ${activeDropdown === 'settings_license' ? 'active' : ''}`} onClick={() => handleMenuClick('settings_license')}>
              환경설정&정품등록 <ChevronDown size={14} />
            </div>
            {activeDropdown === 'settings_license' && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => closeDropdown(onOpenSettings)}>환경설정</div>
                <div className="dropdown-item" onClick={() => closeDropdown(onOpenLicense)}>정품등록</div>
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="header-right">
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '16px' }}>
          <button 
            onClick={() => window.open('/agent-chat.html', '_blank', 'width=500,height=700,resizable=yes,scrollbars=yes')}
            className="action-icon-btn"
            title="AI 명령창 / 채팅방"
            style={{ 
              background: '#e0f2fe', border: 'none', borderRadius: '8px', 
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', cursor: 'pointer', color: '#0284c7',
              transition: 'all 0.2s'
            }}
          >
            <MessageSquare size={20} />
          </button>
          <button 
            onClick={onOpenScheduleList}
            className="action-icon-btn"
            title="일정 리스트"
            style={{ 
              background: '#f1f5f9', border: 'none', borderRadius: '8px', 
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', cursor: 'pointer', color: '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <CalendarIcon size={20} />
          </button>
        </div>
        <div className="search-bar" ref={searchContainerRef}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="메뉴 검색" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {isSearchFocused && searchQuery.trim() !== '' && (
            <div className="search-results-dropdown">
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <div 
                    key={index}
                    className={`search-result-item ${index === selectedIndex ? 'active' : ''}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => handleSearchResultClick(item)}
                  >
                    <div className="search-result-category">{item.category}</div>
                    <div className="search-result-title">{item.title}</div>
                  </div>
                ))
              ) : (
                <div className="search-no-results">검색 결과가 없습니다</div>
              )}
            </div>
          )}
        </div>
        <div className="user-profile">
          <span className="user-role">{currentUser?.name} <span className="user-account">{currentUser?.jobTitle}</span></span>
          <button className="logout-btn" onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
