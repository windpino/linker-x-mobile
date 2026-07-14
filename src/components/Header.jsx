import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, LogOut, ChevronDown, Calendar as CalendarIcon, MessageSquare, Menu, X, Sparkles, LayoutGrid } from 'lucide-react';
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
  onOpenPartnerSpecialPriceManager, onOpenInventoryMismatch, onOpenAgentChat,
  onOpenWidgets
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeSubDropdown, setActiveSubDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Mobile drawer states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState(null);

  const hasPerm = (perm) => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.permissions?.[perm];
  };

  const categoriesList = [
    { id: 'basic', label: '기초자료등록', items: [
      { title: '직원관리', action: onOpenStaffManager, perm: hasPerm('직원관리') },
      { title: '창고관리', action: onOpenWarehouseManager, perm: hasPerm('창고관리') },
      { title: '거래처등록/관리', action: onOpenPartnerManager, perm: hasPerm('거래처등록') || hasPerm('거래처관리') },
      { title: '품목등록/관리', action: onOpenProductManager, perm: hasPerm('품목등록') || hasPerm('품목관리') },
    ]},
    { id: 'purchase', label: '매입/발주관리', items: [
      { title: '매입전표 등록', action: onOpenPurchaseInvoice, perm: hasPerm('매입전표') },
      { title: '매입전표 관리', action: onOpenPurchaseLedger, perm: hasPerm('매입원장') },
      { title: '발주 등록', action: onOpenPurchaseOrder, perm: hasPerm('발주') },
    ]},
    { id: 'sales', label: '매출/수주관리', items: [
      { title: '매출전표등록', action: onOpenSalesInvoice, perm: hasPerm('매출전표') },
      { title: '매출전표내역', action: onOpenSalesInvoiceList, perm: hasPerm('매출전표내역') },
      { title: '매출원장', action: onOpenSalesLedger, perm: hasPerm('매출원장') },
      { title: '간편수주 등록', action: onOpenSalesOrder, perm: hasPerm('수주') },
      { title: '수주목록', action: onOpenOrderList, perm: hasPerm('수주') },
    ]},
    { id: 'cash', label: '입출금관리', items: [
      { title: '계좌관리', action: onOpenAccountManager, perm: hasPerm('계좌관리') },
      { title: '결산보고서', action: () => onOpenCashReport && onOpenCashReport('결산'), perm: hasPerm('입출금보고서') },
      { title: '일자별 입출금 현황', action: () => onOpenCashReport && onOpenCashReport('일자별'), perm: hasPerm('입출금보고서') },
      { title: '계좌별 입출금 현황', action: () => onOpenCashReport && onOpenCashReport('계좌별'), perm: hasPerm('입출금보고서') },
      { title: '금전출납부', action: onOpenCashBook, perm: hasPerm('금전출납부') },
      { title: '경비출금', action: onOpenExpenseRegistration, perm: hasPerm('경비출금') },
    ]},
    { id: 'smart', label: '스마트지원', items: [
      { title: '매출보고서', action: onOpenSalesReport, perm: hasPerm('매출보고서') },
      { title: '수주보고서', action: onOpenOrderReport, perm: hasPerm('수주') },
      { title: '전표수정/삭제 보고서', action: onOpenEditDeleteReport, perm: hasPerm('전표수정/삭제 보고서') },
      { title: '직원 실적 보고서', action: onOpenStaffPerformanceReport, perm: hasPerm('직원 실적 보고서') },
      { title: '미수금관리', action: onOpenReceivablesReport, perm: true },
      { title: '거래처별 특별단가 관리', action: onOpenPartnerSpecialPriceManager, perm: hasPerm('특별단가관리') },
      { title: '세금신고 지원 보고서', action: onOpenTaxReport, perm: true },
      { title: '일정추가', action: onOpenScheduleList, perm: hasPerm('일정') },
      
      { title: '재고이동', action: onOpenInventoryTransfer, perm: hasPerm('재고이동'), sub: '재고관리' },
      { title: '재고 이동 현황 관리', action: onOpenInventoryMovementManager, perm: hasPerm('재고이동'), sub: '재고관리' },
      { title: '재고조정 (손실처리)', action: onOpenInventoryAdjustment, perm: true, sub: '재고관리' },
      { title: '재고 불일치 현황', action: onOpenInventoryMismatch, perm: true, sub: '재고관리' },
      
      { title: '일자별 재고현황', action: () => onOpenInventoryReport && onOpenInventoryReport('daily'), perm: hasPerm('재고보고서'), sub: '재고보고서' },
      { title: '최종 재고 현황', action: () => onOpenInventoryReport && onOpenInventoryReport('final'), perm: hasPerm('재고보고서'), sub: '재고보고서' },
      { title: '매입처별 재고현황', action: () => onOpenInventoryReport && onOpenInventoryReport('partner'), perm: hasPerm('재고보고서'), sub: '재고보고서' },
    ]},
    { id: 'system', label: '시스템관리', items: [
      { title: '데이터 전체 저장/불러오기', action: onOpenDataManager, perm: hasPerm('데이터 전체 저장/불러오기') },
      { title: '거래처 엑셀파일로 저장/불러오기', action: onOpenPartnerExcel, perm: hasPerm('거래처 엑셀파일로 저장/불러오기') },
      { title: '품목 엑셀파일로 저장/불러오기', action: onOpenProductExcel, perm: hasPerm('품목 엑셀파일로 저장/불러오기') },
      { title: '매출처원장 저장/불러오기', action: onOpenSalesLedgerExcel, perm: hasPerm('매출처원장 저장/불러오기') },
      { title: '매입처원장 저장/불러오기', action: onOpenPurchaseLedgerExcel, perm: hasPerm('매입처원장 저장/불러오기') },
    ]},
    { id: 'settings', label: '환경설정 & 정품등록', items: [
      { title: '환경설정', action: onOpenSettings, perm: true },
      { title: '정품등록', action: onOpenLicense, perm: true },
      { title: 'AI 명령창 (Antigravity)', action: onOpenAgentChat, perm: true },
    ]}
  ];
  
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
    // 스마트지원
    {
      title: '재고이동',
      category: '스마트지원 > 재고관리',
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
      category: '스마트지원 > 재고보고서',
      action: () => onOpenInventoryReport && onOpenInventoryReport('daily'),
      perm: hasPerm('재고보고서'),
      keywords: '재고현황 날짜별재고',
    },
    {
      title: '최종 재고 현황(창고별 최종재고현황)',
      category: '스마트지원 > 재고보고서',
      action: () => onOpenInventoryReport && onOpenInventoryReport('final'),
      perm: hasPerm('재고보고서'),
      keywords: '남은재고 최종재고',
    },
    {
      title: '매입처별 재고현황',
      category: '스마트지원 > 재고보고서',
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
      category: '스마트지원 > 재고관리',
      action: onOpenInventoryAdjustment,
      perm: true,
      keywords: '재고조정 손실처리 재고수량조정',
    },
    {
      title: '재고 불일치 현황',
      category: '스마트지원 > 재고관리',
      action: onOpenInventoryMismatch,
      perm: true,
      keywords: '재고불일치 실사재고 장부재고 차이조정',
    },
    {
      title: '재고 이동 현황 관리',
      category: '스마트지원 > 재고관리',
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

  return (
    <header className="header" ref={dropdownRef}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={() => { playMenuClickSound(); setIsMobileMenuOpen(true); }}
          style={{
            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px'
          }}
        >
          <Menu size={24} />
        </button>

        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {companyLogo ? (
            <img src={companyLogo} alt="Company Logo" style={{ height: '24px', objectFit: 'contain' }} />
          ) : (
            <Package size={20} color="white" />
          )}
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white', letterSpacing: '-0.3px' }}>
            {companyName}
          </span>
          <button 
            onClick={onOpenAgentChat}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#f59e0b',
              marginLeft: '4px',
              transition: 'all 0.2s',
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)'
            }}
            title="AI 명령창 (Antigravity)"
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Sparkles size={13} fill="#f59e0b" />
          </button>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={onOpenWidgets}
          className="action-icon-btn"
          title="위젯 목록"
          style={{ 
            background: '#f0fdf4', border: 'none', borderRadius: '8px', 
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', cursor: 'pointer', color: '#16a34a',
            transition: 'all 0.2s'
          }}
        >
          <LayoutGrid size={18} />
        </button>
        <button 
          onClick={() => window.open('/agent-chat.html', '_blank', 'width=500,height=700,resizable=yes,scrollbars=yes')}
          className="action-icon-btn"
          title="AI 명령창 / 채팅방"
          style={{ 
            background: '#e0f2fe', border: 'none', borderRadius: '8px', 
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', cursor: 'pointer', color: '#0284c7',
            transition: 'all 0.2s'
          }}
        >
          <MessageSquare size={18} />
        </button>
        <button 
          onClick={onOpenScheduleList}
          className="action-icon-btn"
          title="일정 리스트"
          style={{ 
            background: '#f1f5f9', border: 'none', borderRadius: '8px', 
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', cursor: 'pointer', color: '#64748b',
            transition: 'all 0.2s'
          }}
        >
          <CalendarIcon size={18} />
        </button>
      </div>

      {/* Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          zIndex: 20000, display: 'flex', justifyContent: 'flex-start'
        }} onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" style={{
            width: '280px', height: '100%', backgroundColor: '#1e293b',
            boxShadow: '4px 0 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
            animation: 'slide-in-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            color: '#cbd5e1', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px', borderBottom: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" style={{ height: '20px', objectFit: 'contain' }} />
                ) : (
                  <Package size={16} color="#3b82f6" />
                )}
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'white' }}>{companyName}</span>
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); onOpenAgentChat(); }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#f59e0b',
                    marginLeft: '4px'
                  }}
                  title="AI 명령창 (Antigravity)"
                >
                  <Sparkles size={11} fill="#f59e0b" />
                </button>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* User Profile */}
            <div style={{
              padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)',
              borderBottom: '1px solid #334155', display: 'flex',
              flexDirection: 'column', gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>접속 사용자</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>
                  {currentUser?.name} <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>({currentUser?.jobTitle})</span>
                </div>
              </div>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); onLogout(); }}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', fontWeight: 700,
                  fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '6px'
                }}
              >
                <LogOut size={12} /> 로그아웃
              </button>
            </div>

            {/* Quick Links */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); onOpenPartnerMall(); }}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#ef4444', color: 'white', fontWeight: 800, fontSize: '0.8rem',
                  cursor: 'pointer', textAlign: 'center'
                }}
              >
                거래처몰 바로가기
              </button>
              
              {currentUser?.role === 'super_admin' && (
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); onOpenPlatformManager(); }}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.05)', color: '#fbbf24', fontWeight: 800,
                    fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  플랫폼 관리
                </button>
              )}
            </div>

            {/* Menu Search Bar */}
            <div style={{ padding: '8px 16px', position: 'relative' }} ref={searchContainerRef}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="메뉴 검색" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={handleSearchKeyDown}
                  style={{
                    width: '100%', padding: '8px 10px 8px 30px', borderRadius: '8px',
                    border: '1px solid #475569', backgroundColor: '#334155',
                    color: 'white', fontSize: '0.8rem', outline: 'none'
                  }}
                />
              </div>
              {isSearchFocused && searchQuery.trim() !== '' && (
                <div className="search-results-dropdown" style={{
                  position: 'absolute', top: '100%', left: '16px', right: '16px',
                  backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', zIndex: 20005, overflow: 'hidden'
                }}>
                  {searchResults.length > 0 ? (
                    searchResults.map((item, index) => (
                      <div 
                        key={index}
                        className={`search-result-item ${index === selectedIndex ? 'active' : ''}`}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => { setIsMobileMenuOpen(false); handleSearchResultClick(item); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer',
                          backgroundColor: index === selectedIndex ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.02)',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700 }}>{item.category}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginTop: '2px' }}>{item.title}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>검색 결과가 없습니다</div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Menu Accordion */}
            <div style={{ flex: 1, padding: '10px 16px 30px' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>메뉴 목록</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {categoriesList.map(cat => {
                  const isExpanded = expandedCategory === cat.id;
                  return (
                    <div key={cat.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Category Header */}
                      <div 
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 8px', borderRadius: '6px', cursor: 'pointer',
                          backgroundColor: isExpanded ? '#334155' : 'transparent',
                          color: isExpanded ? 'white' : '#cbd5e1', fontWeight: 700, fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>{cat.label}</span>
                        <ChevronDown size={14} style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s'
                        }} />
                      </div>

                      {/* Category Items */}
                      {isExpanded && (
                        <div style={{
                          paddingLeft: '10px', borderLeft: '1.5px solid #334155',
                          marginLeft: '10px', marginTop: '2px', marginBottom: '6px',
                          display: 'flex', flexDirection: 'column', gap: '2px',
                          textAlign: 'left'
                        }}>
                          {/* Render Non-sub-category items */}
                          {cat.items.filter(item => !item.sub && item.perm).map((item, idx) => (
                            <div 
                              key={idx}
                              onClick={() => { setIsMobileMenuOpen(false); item.action(); }}
                              style={{
                                padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '0.8rem', color: '#cbd5e1', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = '#334155'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              {item.title}
                            </div>
                          ))}

                          {/* Render Sub-category Accordions */}
                          {cat.id === 'smart' && (
                            <>
                              {/* 재고관리 Sub Accordion */}
                              {(() => {
                                const subItems = cat.items.filter(item => item.sub === '재고관리' && item.perm);
                                if (subItems.length === 0) return null;
                                const isSubExpanded = expandedSubCategory === 'inventory_mgmt';
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div 
                                      onClick={() => setExpandedSubCategory(isSubExpanded ? null : 'inventory_mgmt')}
                                      style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                        backgroundColor: isSubExpanded ? '#334155' : 'transparent',
                                        color: isSubExpanded ? 'white' : '#cbd5e1', fontWeight: 600, fontSize: '0.8rem'
                                      }}
                                    >
                                      <span>재고관리</span>
                                      <ChevronDown size={12} style={{ transform: isSubExpanded ? 'rotate(180deg)' : 'none' }} />
                                    </div>
                                    {isSubExpanded && (
                                      <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {subItems.map((item, idx) => (
                                          <div 
                                            key={idx}
                                            onClick={() => { setIsMobileMenuOpen(false); item.action(); }}
                                            style={{
                                              padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                                              fontSize: '0.75rem', color: '#cbd5e1'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = '#334155'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                          >
                                            {item.title}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* 재고보고서 Sub Accordion */}
                              {(() => {
                                const subItems = cat.items.filter(item => item.sub === '재고보고서' && item.perm);
                                if (subItems.length === 0) return null;
                                const isSubExpanded = expandedSubCategory === 'inventory_report';
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div 
                                      onClick={() => setExpandedSubCategory(isSubExpanded ? null : 'inventory_report')}
                                      style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                        backgroundColor: isSubExpanded ? '#334155' : 'transparent',
                                        color: isSubExpanded ? 'white' : '#cbd5e1', fontWeight: 600, fontSize: '0.8rem'
                                      }}
                                    >
                                      <span>재고보고서</span>
                                      <ChevronDown size={12} style={{ transform: isSubExpanded ? 'rotate(180deg)' : 'none' }} />
                                    </div>
                                    {isSubExpanded && (
                                      <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {subItems.map((item, idx) => (
                                          <div 
                                            key={idx}
                                            onClick={() => { setIsMobileMenuOpen(false); item.action(); }}
                                            style={{
                                              padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                                              fontSize: '0.75rem', color: '#cbd5e1'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = '#334155'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                          >
                                            {item.title}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
</header>
  );
};

export default Header;
