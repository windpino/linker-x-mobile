import React, { useState } from 'react';
import { 
  AlertTriangle, Package, TrendingUp, ShoppingCart, Users, Home, ClipboardList, Star, Settings as SettingsIcon,
  CreditCard, FileInput, FileText, Send, FileOutput, List, BarChart2, Box, DollarSign, Database, UserPlus, Calendar as CalendarIcon, LayoutDashboard,
  CheckCircle2, Info, FileSearch, Percent,
  Key, Search, MoreVertical, ChevronLeft, ChevronRight, Plus, Menu, LogOut, Lock, Eye, EyeOff
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import Header from './components/Header';
import DashboardBanner from './components/DashboardBanner';
import Calendar from './components/Calendar';
import ScheduleSidebar from './components/ScheduleSidebar';
import ScheduleDetailModal from './components/ScheduleDetailModal';
import Login from './components/Login';
import Signup from './components/Signup';
import AgencySignup from './components/AgencySignup';
import UserSignup from './components/UserSignup';
import Onboarding from './components/Onboarding';
import SuperAdmin from './components/SuperAdmin';

const ALL_PERMS = {
  warehouse: true, staff: true, partner: true, product: true, account: true,
  schedule: true, purchase: true, sales: true, inventory: true, report: true,
  settings: true, license: true
};
import WarehouseManagement from './components/WarehouseManagement';
import StaffManagement from './components/StaffManagement';
import InventoryTransfer from './components/InventoryTransfer';
import PartnerManagement from './components/PartnerManagement';
import ProductManagement from './components/ProductManagement';
import AccountManagement from './components/AccountManagement';
import ScheduleList from './components/ScheduleList';
import ScheduleRegistration from './components/ScheduleRegistration';
import ScheduleTypeManagement from './components/ScheduleTypeManagement';
import PurchaseInvoice from './components/PurchaseInvoice';
import PurchaseLedger from './components/PurchaseLedger';
import PurchaseOrder from './components/PurchaseOrder';
import SalesInvoice from './components/SalesInvoice';
import SalesInvoiceList from './components/SalesInvoiceList';
import SalesLedger from './components/SalesLedger';
import SalesOrder from './components/SalesOrder';
import OrderList from './components/OrderList';
import CashReport from './components/CashReport';
import SalesReport from './components/SalesReport';
import OrderReport from './components/OrderReport';
import InventoryReport from './components/InventoryReport';
import ReceivablesReport from './components/ReceivablesReport';
import BulkEditor from './components/BulkEditor';
import EditDeleteReport from './components/EditDeleteReport';
import CashBook from './components/CashBook';
import ExpenseRegistration from './components/ExpenseRegistration';
import StaffPerformanceReport from './components/StaffPerformanceReport';
import DataManager from './components/DataManager';
import PartnerExcelManager from './components/PartnerExcelManager';
import ProductExcelManager from './components/ProductExcelManager';
import PurchaseLedgerExcelManager from './components/PurchaseLedgerExcelManager';
import SalesLedgerExcelManager from './components/SalesLedgerExcelManager';
import SettingsManager from './components/SettingsManager';
import LicenseManager from './components/LicenseManager';
import InventoryAdjustment from './components/InventoryAdjustment';
import InventoryMismatch from './components/InventoryMismatch';
import TaxReport from './components/TaxReport';
import TaxInvoiceDocument from './components/TaxInvoiceDocument';
import PartnerShoppingMall from './components/PartnerShoppingMall';
import WindowModal from './components/WindowModal';
import PartnerSpecialPriceManager from './components/PartnerSpecialPriceManager'; // Import Special Price Manager
import './App.css';
import ChatAssistant from './components/ChatAssistant';
import useDevice from './hooks/useDevice';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, collection, getDocs, getDoc, writeBatch, query, where, updateDoc, deleteDoc } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────
// 자주 찾는 메뉴 전체 목록 (App 함수 외부에 한 번만 정의)
// ─────────────────────────────────────────────────────────
const ALL_FAVORITE_MENUS = [
  { id: 'staff',               name: '직원 관리',      category: '기초자료등록',   emoji: '👤' },
  { id: 'warehouse',           name: '창고 관리',      category: '기초자료등록',   emoji: '🏠' },
  { id: 'partner',             name: '거래처 관리',    category: '기초자료등록',   emoji: '🤝' },
  { id: 'product',             name: '품목 관리',      category: '기초자료등록',   emoji: '📦' },
  { id: 'schedule',            name: '일정 추가',      category: '스마트지원',     emoji: '📅' },
  { id: 'purchase_invoice',    name: '매입전표 등록',  category: '매입/발주관리',   emoji: '📥' },
  { id: 'purchase_ledger',     name: '매입전표 관리',  category: '매입/발주관리',   emoji: '📋' },
  { id: 'purchase_order',      name: '발주 등록',      category: '매입/발주관리',   emoji: '📤' },
  { id: 'sales_invoice',       name: '매출전표 등록',  category: '매출/수주관리',   emoji: '🧾' },
  { id: 'sales_invoice_list',  name: '매출전표 내역',  category: '매출/수주관리',   emoji: '📄' },
  { id: 'sales_ledger',        name: '매출 원장',      category: '매출/수주관리',   emoji: '📊' },
  { id: 'sales_order',         name: '간편수주 등록',  category: '매출/수주관리',   emoji: '🛒' },
  { id: 'account',             name: '계좌 관리',      category: '입출금관리',     emoji: '💳' },
  { id: 'cash_report_1',       name: '결산 보고',      category: '입출금관리',     emoji: '💰' },
  { id: 'cash_report_2',       name: '입출금 현황',    category: '입출금관리',     emoji: '📈' },
  { id: 'expense',             name: '경비 등록',      category: '입출금관리',     emoji: '💸' },
  { id: 'sales_report',        name: '매출 보고',      category: '스마트지원',     emoji: '📉' },
  { id: 'inventory_report_1',  name: '일자별 재고현황(창고별이동현황)', category: '스마트지원',     emoji: '🗃️' },
  { id: 'inventory_report_2',  name: '최종 재고 현황(창고별 최종재고현황)', category: '스마트지원',     emoji: '📦' },
  { id: 'inventory_mismatch',  name: '재고 불일치',    category: '스마트지원',     emoji: '⚠️' },
  { id: 'receivables',         name: '미수금 보고',    category: '스마트지원',     emoji: '💵' },
  { id: 'edit_delete',         name: '수정삭제 보고',  category: '스마트지원',     emoji: '🔍' },
  { id: 'staff_perf',          name: '직원 실적',      category: '스마트지원',     emoji: '🏆' },
  { id: 'tax_report',          name: '부가세 보고',    category: '스마트지원',     emoji: '🧮' },
  { id: 'data_manager',        name: '데이터 관리',    category: '시스템관리',     emoji: '🗄️' },
  { id: 'settings',            name: '환경 설정',      category: '환경설정&정품등록', emoji: '⚙️' },
  { id: 'license',             name: '정품 등록',      category: '환경설정&정품등록', emoji: '🔑' },
];
const FAV_CATEGORIES = ['기초자료등록', '매입/발주관리', '매출/수주관리', '입출금관리', '스마트지원', '시스템관리', '환경설정&정품등록'];

function App() {
  const { isMobile } = useDevice();

  const [currentView, setCurrentView] = useState(() => {
    try {
      if (window.location.pathname === '/madmin') return 'super_admin';
      
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser && savedUser !== 'undefined') {
        const user = JSON.parse(savedUser);
        if (user) {
          if (user.role === 'super_admin') return 'super_admin';
          if (user.role === 'partner') return 'shopping';
          return 'dashboard';
        }
      }
    } catch (err) {
      console.error('Error initializing currentView:', err);
    }
    return 'login';
  }); 


  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [currentUser, setCurrentUser] = useState(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user?.userId === 'sadmin' || user?.userId === 'madmin' || localStorage.getItem('autoLogin') === 'true') {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('autoLogin');
      return null;
    }
    return user || null;
  });
  const [staffList, setStaffList] = useState(() => JSON.parse(localStorage.getItem('staffList')) || []);

  const checkWritePermission = (docCreator = null, isMasterData = false) => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    if (currentUser?.allowAllEditDelete === true) return true;
    if (isMasterData) return false;
    return docCreator && currentUser?.name && docCreator === currentUser.name;
  };

  // Modal States
  const [isWarehouseManagerOpen, setIsWarehouseManagerOpen] = useState(false);
  const [isPartnerSpecialPriceManagerOpen, setIsPartnerSpecialPriceManagerOpen] = useState(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  const [isInventoryTransferOpen, setIsInventoryTransferOpen] = useState(false);
  const [inventoryTransferInitialDate, setInventoryTransferInitialDate] = useState(null);
  const [syncedCollections, setSyncedCollections] = useState({});
  const [isPartnerManagerOpen, setIsPartnerManagerOpen] = useState(false);
  const [isProductManagerOpen, setIsProductManagerOpen] = useState(false);
  const [isPartnerBulkOpen, setIsPartnerBulkOpen] = useState(false);
  const [isProductBulkOpen, setIsProductBulkOpen] = useState(false);
  const [scheduleTypes, setScheduleTypes] = useState([]);
  const [hiddenScheduleTypes, setHiddenScheduleTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('hiddenScheduleTypes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Firestore에서 일정유형 데이터를 fetch(불러오기)하여 로딩하는 훅
  React.useEffect(() => {
    const fetchScheduleTypes = async () => {
      const companyId = currentUser?.companyId || 'default';
      try {
        const querySnapshot = await getDocs(collection(db, 'companies', companyId, 'schedule_types'));
        let typesList = [];
        querySnapshot.forEach((doc) => {
          typesList.push({ id: doc.id, ...doc.data() });
        });
        
        // 만약 비어있다면 최초 기본 6개 유형을 생성 및 저장합니다.
        if (typesList.length === 0) {
          const defaultTypes = [
            { name: '입고예정', color: '#10b981', userId: currentUser?.userId || 'system' },
            { name: '납품', color: '#3b82f6', userId: currentUser?.userId || 'system' },
            { name: '업무지시', color: '#f59e0b', userId: currentUser?.userId || 'system' },
            { name: '회식', color: '#ec4899', userId: currentUser?.userId || 'system' },
            { name: '휴무일', color: '#ef4444', userId: currentUser?.userId || 'system' },
            { name: '기타', color: '#8b5cf6', userId: currentUser?.userId || 'system' }
          ];
          
          for (const dt of defaultTypes) {
            await setDoc(doc(db, 'companies', companyId, 'schedule_types', dt.name), dt);
          }
          typesList = defaultTypes;
        }
        
        setScheduleTypes(typesList);
        localStorage.setItem('scheduleTypes', JSON.stringify(typesList));
      } catch (err) {
        console.error("Error fetching schedule types from Firestore:", err);
        const local = JSON.parse(localStorage.getItem('scheduleTypes')) || [];
        setScheduleTypes(local);
      }
    };

    if (currentUser) {
      fetchScheduleTypes();
    }
  }, [currentUser]);

  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isScheduleListOpen, setIsScheduleListOpen] = useState(false);
  const [isScheduleRegistrationOpen, setIsScheduleRegistrationOpen] = useState(false);
  const [isTypeManagementOpen, setIsTypeManagementOpen] = useState(false);
  const [isManagingTypesOnOpen, setIsManagingTypesOnOpen] = useState(false);
  const [selectedScheduleForDetail, setSelectedScheduleForDetail] = useState(null);
  const [isScheduleDetailOpen, setIsScheduleDetailOpen] = useState(false);

  const [editingSchedule, setEditingSchedule] = useState(null);
  const [copiedSchedule, setCopiedSchedule] = useState(null);
  
  const [isPurchaseInvoiceOpen, setIsPurchaseInvoiceOpen] = useState(false);
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState(null);
  const [isPurchaseLedgerOpen, setIsPurchaseLedgerOpen] = useState(false);

  const openPurchaseInvoice = (invoice = null) => {
    setEditingPurchaseInvoice(invoice);
    setIsPurchaseInvoiceOpen(true);
  };
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
  const [isSalesInvoiceOpen, setIsSalesInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isSalesLedgerOpen, setIsSalesLedgerOpen] = useState(false);
  const [isSalesInvoiceListOpen, setIsSalesInvoiceListOpen] = useState(false);

  const [activeSalesModal, setActiveSalesModal] = useState(null);
  const openSalesInvoice = (invoice = null) => {
    setEditingInvoice(invoice);
    setIsSalesInvoiceOpen(true);
    setActiveSalesModal('invoice');
  };
  const openSalesInvoiceList = () => {
    setIsSalesInvoiceListOpen(true);
    setActiveSalesModal('invoice_list');
  };
  const openSalesLedger = () => {
    setIsSalesLedgerOpen(true);
    setActiveSalesModal('ledger');
  };
  const [isSalesOrderOpen, setIsSalesOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isOrderListOpen, setIsOrderListOpen] = useState(false);
  const [orderListSelectedStaff, setOrderListSelectedStaff] = useState('all');
  const [isCashReportOpen, setIsCashReportOpen] = useState(false);
  const [cashReportTab, setCashReportTab] = useState('결산');

  const openCashReport = (tab = '결산') => {
    setCashReportTab(tab);
    setIsCashReportOpen(true);
  };
  const [isSalesReportOpen, setIsSalesReportOpen] = useState(false);
  const [isOrderReportOpen, setIsOrderReportOpen] = useState(false);
  const [isInventoryReportOpen, setIsInventoryReportOpen] = useState(false);
  const [isReceivablesReportOpen, setIsReceivablesReportOpen] = useState(false);
  const [inventoryReportTab, setInventoryReportTab] = useState('daily');

  const openInventoryReport = (tab = 'daily') => {
    const norm = tab === '일자별' || tab === 'daily' ? 'daily' :
                 tab === '최종' || tab === 'final' ? 'final' :
                 tab === '매입처별' || tab === 'partner' ? 'partner' : 'daily';
    setInventoryReportTab(norm);
    setIsInventoryReportOpen(true);
  };
  const openInventoryTransfer = (date = null) => {
    setInventoryTransferInitialDate(date);
    setIsInventoryTransferOpen(true);
  };
  const [isEditDeleteReportOpen, setIsEditDeleteReportOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [prefilledAgencyId, setPrefilledAgencyId] = useState('');
  const [selectedAgencyForSignup, setSelectedAgencyForSignup] = useState(null);
  const [isCashBookOpen, setIsCashBookOpen] = useState(false);
  const [isExpenseRegistrationOpen, setIsExpenseRegistrationOpen] = useState(false);
  const [isStaffPerformanceReportOpen, setIsStaffPerformanceReportOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const [isPartnerExcelOpen, setIsPartnerExcelOpen] = useState(false);
  const [isProductExcelOpen, setIsProductExcelOpen] = useState(false);
  const [isPurchaseLedgerExcelOpen, setIsPurchaseLedgerExcelOpen] = useState(false);
  const [isSalesLedgerExcelOpen, setIsSalesLedgerExcelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = useState(false);
  const [isFavoriteSettingsOpen, setIsFavoriteSettingsOpen] = useState(false);
  const [isInventoryAdjustmentOpen, setIsInventoryAdjustmentOpen] = useState(false);
  const [isInventoryMismatchOpen, setIsInventoryMismatchOpen] = useState(false);
  const [mismatchInitialWarehouse, setMismatchInitialWarehouse] = useState('');
  const [mismatchInitialSearchTerm, setMismatchInitialSearchTerm] = useState('');
  const [isTaxReportOpen, setIsTaxReportOpen] = useState(false);
  const [isResizeLocked, setIsResizeLocked] = useState(true);
  const [isDashboardLocked, setIsDashboardLocked] = useState(() => {
    const saved = localStorage.getItem('isDashboardLocked');
    return saved === null ? true : saved === 'true';
  });
  
  React.useEffect(() => {
    localStorage.setItem('isDashboardLocked', isDashboardLocked);
  }, [isDashboardLocked]);
  const [calendarHeight, setCalendarHeight] = useState(() => Number(localStorage.getItem('calendarHeight')) || 550);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 5000);
  };
  const [printingTaxInvoice, setPrintingTaxInvoice] = useState(null); // { invoice, isTaxFree }
  const [orderingPartner, setOrderingPartner] = useState(null);

  // System notice data and states for rollover announcement
  const SYSTEM_NOTICES = [
    { 
      id: 1, 
      title: '[공지] Linker X 시스템 정기 업데이트 (v2.8.5) 완료 안내', 
      date: '2026-05-27', 
      content: '안녕하세요. 마스터허브입니다.\n\nLinker X 시스템의 기능 향상 및 안정화를 위한 v2.8.5 정기 업데이트가 완료되었습니다.\n\n[주요 업데이트 사항]\n1. 즐겨찾기(자주 찾는 메뉴) UI 달력 상단 배치 및 7개 한도 개편\n2. 메뉴 검색 및 카테고리 명칭 변경 (보고서 및 관리 통합)\n3. 대시보드 위젯 설정 연동성 최적화\n\n앞으로도 더욱 편리하고 안정적인 서비스를 제공하기 위해 최선을 다하겠습니다.\n감사합니다.' 
    },
    { 
      id: 2, 
      title: '[알림] 클라우드 서버 데이터베이스 정기 백업 점검 예정 (5/29 02:00)', 
      date: '2026-05-27', 
      content: '안녕하세요. 마스터허브입니다.\n\n보다 안전한 데이터 보호를 위해 클라우드 서버 데이터베이스 정기 백업 점검이 진행될 예정입니다.\n\n[점검 일정]\n- 일시: 2026년 5월 29일(금) 오전 02:00 ~ 오전 04:00 (약 2시간)\n- 대상: Linker X ERP 전체 클라우드 DB\n\n점검 시간 동안 일시적인 데이터 지연이 발생할 수 있으니 회원 여러분의 너른 양해 부탁드립니다.\n감사합니다.' 
    },
    { 
      id: 3, 
      title: '[안내] 거래처 실시간 모니터링을 위한 "모바일 미리보기" 기능 활용 가이드', 
      date: '2026-05-27', 
      content: '안녕하세요. 마스터허브입니다.\n\n언제 어디서나 모바일 디바이스 환경에서 ERP 핵심 대시보드를 시뮬레이션할 수 있는 "모바일 미리보기" 기능이 정식 출시되었습니다.\n\n상단 내비게이션 바의 "모바일 미리보기" 버튼을 누르시면 390x844 모바일 뷰 전용 시뮬레이터 창이 즉시 실행되어 현장 업무나 이동 중 상태 조회가 간편해집니다.\n\n많은 활용 부탁드립니다.\n감사합니다.' 
    }
  ];

  const [currentNoticeIdx, setCurrentNoticeIdx] = useState(0);
  const [noticeFade, setNoticeFade] = useState(true);
  const [selectedSystemNotice, setSelectedSystemNotice] = useState(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNoticeFade(false);
      setTimeout(() => {
        setCurrentNoticeIdx(prev => (prev + 1) % SYSTEM_NOTICES.length);
        setNoticeFade(true);
      }, 300);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const [favoriteMenus, setFavoriteMenus] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('favoriteMenus'));
    if (saved && Array.isArray(saved)) {
      return saved.slice(0, 5);
    }
    return [
      'sales_order', 'partner', 'product', 'warehouse', 'staff'
    ];
  });
  
  const [dashboardConfig, setDashboardConfig] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('dashboardConfig'));
    if (saved && saved.widgets) {
      return { ...saved, widgets: saved.widgets.filter(id => id !== 'Calendar') };
    }
    return saved || {
      widgets: ['Schedule', 'Inventory', 'Sales', 'Purchase', 'Partners', 'Warehouses']
    };
  });
  
  const [licenseData, setLicenseData] = useState(() => JSON.parse(localStorage.getItem('licenseData')) || {
    expiryDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 month free
    plan: '무료 체험판',
    isLockedOnExpiry: false,
    lastPaymentDate: null
  });

  const [showLicenseAlert, setShowLicenseAlert] = useState(false);
  
  const [systemSettings, setSystemSettings] = useState(() => JSON.parse(localStorage.getItem('systemSettings')) || {
    company: { name: '', bizNum: '', ceo: '', type: '', address: '', tel: '', email: '' },
    display: { darkMode: false, soundEffects: true, realTimeUpdate: true },
    transaction: { defaultVat: 10, decimalPlaces: 0, autoNumbering: true },
    salesInvoice: { warnNoStock: true },
    language: '한국어 (Korean)',
    timezone: '(GMT+09:00) Seoul',
    theme: {
      primaryColor: '#3b82f6',
      logoUrl: null
    }
  });

  const [companySettings, setCompanySettings] = useState(null);

  // Pre-fetch theme based on URL query (?company=ID)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const companyQuery = params.get('company');
    
    if (companyQuery) {
      const fetchCompanyTheme = async () => {
        const docRef = doc(db, 'companies', companyQuery);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setCompanySettings(snapshot.data());
          console.log(`Pre-fetched theme for: ${companyQuery}`);
        }
      };
      fetchCompanyTheme();
    }
  }, []);

  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('expenses')) || []);
  const [agencyCategories, setAgencyCategories] = useState(['본사', '직영점', '대리점']);

  const [staffZones, setStaffZones] = useState(() => {
    try {
      const saved = localStorage.getItem('staffZones');
      return saved ? JSON.parse(saved) : ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
    } catch {
      return ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
    }
  });

  const [staffJobTitles, setStaffJobTitles] = useState(() => {
    try {
      const saved = localStorage.getItem('staffJobTitles');
      return saved ? JSON.parse(saved) : ['대표', '이사', '부장', '차장', '과장', '대리', '사원', '주임', '팀장', '실장', '본부장', '고문', '자문'];
    } catch {
      return ['대표', '이사', '부장', '차장', '과장', '대리', '사원', '주임', '팀장', '실장', '본부장', '고문', '자문'];
    }
  });


  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'agencyCategories'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categories && data.categories.length > 0) {
          setAgencyCategories(data.categories);
        }
      }
    });
    return () => unsub();
  }, []);

  // Handle Dark Mode
  React.useEffect(() => {
    // Apply Primary Color from Company Settings or Default
    const primary = companySettings?.theme?.primaryColor || systemSettings.theme?.primaryColor || '#3b82f6';
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--primary-hover', primary + 'dd');

    if (systemSettings.display?.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [systemSettings.display?.darkMode, companySettings, systemSettings.theme]);

  React.useEffect(() => {
    if (currentUser && currentUser.userId && currentUser.role !== 'super_admin') {
      const currentStaff = staffList.find(s => s.userId === currentUser.userId);
      if (currentStaff) {
        const hasDiff = currentStaff.allowAllEditDelete !== currentUser.allowAllEditDelete ||
                        currentStaff.allowSpecialPriceSave !== currentUser.allowSpecialPriceSave ||
                        JSON.stringify(currentStaff.permissions) !== JSON.stringify(currentUser.permissions) ||
                        currentStaff.name !== currentUser.name ||
                        currentStaff.role !== currentUser.role;
        if (hasDiff) {
          const updatedUser = { ...currentUser, ...currentStaff };
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
      }
    }
  }, [staffList, currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('autoLogin');
    window.location.reload();
  };

  // Firebase Real-time Sync with Data Isolation
  React.useEffect(() => {
    if (!currentUser || currentView === 'login' || currentView === 'super_admin') return;

    const unsubscribes = [];
    const companyId = currentUser.companyId || 'default';

    // 1. Sync Company Settings (Logo, Theme, License)
    const companyUnsub = onSnapshot(doc(db, 'companies', companyId), (snapshot) => {
      if (snapshot.exists()) {
        setCompanySettings(snapshot.data());
      }
    });
    unsubscribes.push(companyUnsub);
    
    // Sync collections with companyId filter
    const collectionsToSync = [
      { name: 'staffList', setter: setStaffList },
      { name: 'schedules', setter: setSchedules },
      { name: 'products', setter: setProducts },
      { name: 'categories', setter: setCategories },
      { name: 'partners', setter: setPartners },
      { name: 'accounts', setter: setAccounts },
      { name: 'purchaseInvoices', setter: setPurchaseInvoices },
      { name: 'purchaseOrders', setter: setPurchaseOrders },
      { name: 'salesInvoices', setter: setSalesInvoices },
      { name: 'salesOrders', setter: setSalesOrders },
      { name: 'warehouses', setter: setWarehouses },
      { name: 'expenses', setter: setExpenses },
      { name: 'inventoryAdjustments', setter: setInventoryAdjustments },
      { name: 'inventoryTransferHistory', setter: setInventoryTransferHistory },
      { name: 'specialPrices', setter: setSpecialPrices }
    ];

    collectionsToSync.forEach(col => {
      // New structure: companies/{companyId}/{collectionName}
      const q = collection(db, 'companies', companyId, col.name);
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
        col.setter(data);
        localStorage.setItem(col.name, JSON.stringify(data));
        localStorage.setItem(`fb_synced_${col.name}_${companyId}`, 'true');
        setSyncedCollections(prev => ({ ...prev, [col.name]: true }));
      });
      unsubscribes.push(unsub);
    });

    // Sync single docs within company sub-collection or specific document
    const singleDocs = [
      { name: 'systemSettings', setter: setSystemSettings },
      { name: 'inventory', setter: setInventory },
      { name: 'physicalInventory', setter: setPhysicalInventory },
      { name: 'licenseData', setter: setLicenseData },
      { name: 'dashboardConfig', setter: setDashboardConfig },
      { name: 'favoriteMenus', setter: setFavoriteMenus },
      { name: 'staffZones', setter: setStaffZones },
      { name: 'staffJobTitles', setter: setStaffJobTitles }
    ];

    singleDocs.forEach(sd => {
      // New structure: companies/{companyId}/settings/{docName}
      const unsub = onSnapshot(doc(db, 'companies', companyId, 'settings', sd.name), (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return; // 로컬 쓰기가 대기 중일 때는 리스너 덮어쓰기를 스킵하여 Race Condition 방어
        
        if (snapshot.exists()) {
          const dataVal = snapshot.data().value;
          sd.setter(dataVal);


        }
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser, currentView]);

  React.useEffect(() => {
    const CLEANUP_VER = '20260509_v2';
    const isCleaned = localStorage.getItem('system_cleaned_ver');
    
    if (isCleaned !== CLEANUP_VER) {
      // Filter out unwanted schedule types from existing data
      const currentTypes = JSON.parse(localStorage.getItem('scheduleTypes')) || [];
      const unwanted = ['기타', '지시사항', 'TestType', '011', 'to'];
      const filteredTypes = currentTypes.filter(t => !unwanted.includes(t));
      
      if (filteredTypes.length === 0) filteredTypes.push('일반');
      localStorage.setItem('scheduleTypes', JSON.stringify(filteredTypes));
      
      // Clear any other suspected remnants but keep core data
      // For a truly clean state before "Fishing Portal", we can clear specific keys
      localStorage.removeItem('fishing_portal_data'); 
      localStorage.removeItem('catch_reports');
      
      localStorage.setItem('system_cleaned_ver', CLEANUP_VER);
      window.location.reload();
    }
  }, []);

  const ALL_PERMS = {
    '재고이동': true, '직원관리': true, '창고관리': true, '거래처등록': true, '거래처관리': true,
    '품목등록': true, '품목관리': true, '계좌관리': true, '특별단가관리': true, '일정': true,
    '매입전표': true, '매입원장': true, '발주': true,
    '매출전표': true, '매출원장': true, '수주': true,
    '입출금보고서': true, '매출보고서': true, '재고보고서': true, '전표수정/삭제 보고서': true,
    '금전출납부': true, '경비출금': true, '직원 실적 보고서': true,
    '데이터 전체 저장/불러오기': true, '엑셀파일로 거래처저장/불러오기': true,
    '엑셀파일로 품목저장/불러오기': true, '매출처원장 저장/불러오기': true,
    '매입처원장 저장/불러오기': true, '구글스프레드시트 연동': true,
    viewAllInventoryMovements: true
  };



  // 1. Initialize all states with localStorage

  const [schedules, setSchedules] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('schedules')) || [];
    // Aggressively remove stuck April 22nd schedules at initialization
    return saved.filter(s => {
      if (!s.date) return true;
      const d = new Date(s.date);
      const isApril22nd = d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() === 22;
      const dateStr = String(s.date || '');
      const isApril22ndStr = dateStr.includes('22') && (dateStr.includes('04') || dateStr.includes('4월'));
      return !(isApril22nd || isApril22ndStr);
    });
  });
  const [products, setProducts] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('products'));
    return (saved && saved.length > 0) ? saved : [];
  });
  const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('categories')) || []);
  const [partners, setPartners] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('partners'));
    return (saved && saved.length > 0) ? saved : [];
  });
  const [accounts, setAccounts] = useState(() => JSON.parse(localStorage.getItem('accounts')) || []);
  
  const [purchaseInvoices, setPurchaseInvoices] = useState(() => JSON.parse(localStorage.getItem('purchaseInvoices')) || []);
  const [purchaseOrders, setPurchaseOrders] = useState(() => JSON.parse(localStorage.getItem('purchaseOrders')) || []);
  const [salesInvoices, setSalesInvoices] = useState(() => JSON.parse(localStorage.getItem('salesInvoices')) || []);
  const [salesOrders, setSalesOrders] = useState(() => JSON.parse(localStorage.getItem('salesOrders')) || []);
  const [warehouses, setWarehouses] = useState(() => JSON.parse(localStorage.getItem('warehouses')) || []);
  const [inventory, setInventory] = useState(() => JSON.parse(localStorage.getItem('inventory')) || {});
  const [physicalInventory, setPhysicalInventory] = useState(() => JSON.parse(localStorage.getItem('physicalInventory')) || {});
  
  const [inventoryAdjustments, setInventoryAdjustments] = useState(() => JSON.parse(localStorage.getItem('inventoryAdjustments')) || []);
  const [inventoryTransferHistory, setInventoryTransferHistory] = useState(() => JSON.parse(localStorage.getItem('inventoryTransferHistory')) || []);
  const [specialPrices, setSpecialPrices] = useState(() => JSON.parse(localStorage.getItem('specialPrices')) || []);

  // 유령 재고 이동 내업 자동 정리 클린업 (주문서/전표가 삭제되었으나 이동 내역만 유령으로 남은 경우 일괄 제거)
  React.useEffect(() => {
    if (
      !currentUser ||
      inventoryTransferHistory.length === 0 ||
      !syncedCollections['salesOrders'] ||
      !syncedCollections['salesInvoices'] ||
      !syncedCollections['purchaseInvoices'] ||
      !syncedCollections['inventoryTransferHistory']
    ) {
      return;
    }

    const cleanupOrphanedTransfers = async () => {
      try {
        const companyId = currentUser?.companyId || 'default';
        const toDelete = [];

        for (const h of inventoryTransferHistory) {
          // 1. 자동 상차(자동이동)인 경우
          if (h.memo === '상차(자동이동)') {
            // 주문서 ID가 매칭되는 주문서가 있는지 검사 (있다면 보존)
            if (h.salesOrderId) {
              const hasOrder = salesOrders.some(o => String(o.id) === String(h.salesOrderId));
              if (!hasOrder) {
                toDelete.push(h);
              }
              continue;
            }
            // 전표 ID가 매칭되는 전표가 있는지 검사 (있다면 보존)
            if (h.salesInvoiceId) {
              const hasInvoice = salesInvoices.some(si => String(si.id) === String(h.salesInvoiceId));
              if (!hasInvoice) {
                toDelete.push(h);
              }
              continue;
            }

            // ID 연계가 없는 구버전 기록에 대한 하이브리드 필터링
            const hasMatchingOrder = salesOrders.some(o => 
              o.date === h.date &&
              o.outWarehouse === h.from &&
              o.inWarehouse === h.to &&
              (o.items || []).some(i => i.name === h.item && Number(i.qty) === Number(h.qty))
            );
            const hasMatchingInvoice = salesInvoices.some(si => 
              si.date === h.date &&
              (si.items || []).some(i => i.name === h.item && Number(i.qty) === Number(h.qty))
            );

            if (!hasMatchingOrder && !hasMatchingInvoice) {
              toDelete.push(h);
            }
          }
          // 2. 매출 출고인 경우
          else if (h.memo && h.memo.startsWith('[매출]')) {
            if (h.salesInvoiceId) {
              const hasInvoice = salesInvoices.some(si => String(si.id) === String(h.salesInvoiceId));
              if (!hasInvoice) {
                toDelete.push(h);
              }
              continue;
            }

            // 구버전 하이브리드
            const hasMatchingInvoice = salesInvoices.some(si => 
              si.date === h.date &&
              `[매출] ${si.partner}` === h.memo &&
              (si.items || []).some(i => i.name === h.item && Number(i.qty) === Number(h.qty))
            );
            if (!hasMatchingInvoice) {
              toDelete.push(h);
            }
          }
          // 3. 매입 입고인 경우
          else if (h.memo && h.memo.startsWith('[매입]')) {
            if (h.purchaseInvoiceId) {
              const hasInvoice = purchaseInvoices.some(pi => String(pi.id) === String(h.purchaseInvoiceId));
              if (!hasInvoice) {
                toDelete.push(h);
              }
              continue;
            }

            // 구버전 하이브리드
            const hasMatchingInvoice = purchaseInvoices.some(pi => 
              pi.date === h.date &&
              `[매입] ${pi.partner}` === h.memo &&
              (pi.items || []).some(i => i.name === h.item && Number(i.qty) === Number(h.qty))
            );
            if (!hasMatchingInvoice) {
              toDelete.push(h);
            }
          }
        }

        if (toDelete.length > 0) {
          console.log(`[Cleanup] Found ${toDelete.length} orphaned inventory transfers. Deleting from DB...`, toDelete);
          for (const h of toDelete) {
            try {
              await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(h.id)));
            } catch (err) {
              console.error(`Failed to delete orphaned transfer ${h.id}:`, err);
            }
          }
          // 로컬 상태 동기화
          setInventoryTransferHistory(prev => prev.filter(h => !toDelete.some(td => String(td.id) === String(h.id))));
        }
      } catch (err) {
        console.error('Error during orphaned transfers cleanup:', err);
      }
    };

    const timer = setTimeout(() => {
      cleanupOrphanedTransfers();
    }, 2000); // 2초 뒤에 데이터 로드 충분히 완료된 시점 실행

    return () => clearTimeout(timer);
  }, [salesOrders, salesInvoices, purchaseInvoices, inventoryTransferHistory, currentUser, syncedCollections]);

  // 자가 치유(Self-Healing): 누락되거나 잘못 삭제된 재고이동 이력 자동 복구
  React.useEffect(() => {
    if (
      !currentUser ||
      !syncedCollections['salesOrders'] ||
      !syncedCollections['salesInvoices'] ||
      !syncedCollections['purchaseInvoices'] ||
      !syncedCollections['inventoryTransferHistory']
    ) {
      return;
    }

    const repairHistory = async () => {
      try {
        const companyId = currentUser.companyId || 'default';
        const mainWH = warehouses.find(w => w.isMain)?.name || 
                       warehouses.find(w => w.name.includes('메인'))?.name || 
                       warehouses.find(w => w.name.includes('main'))?.name || 
                       warehouses[0]?.name || 
                       '메인창고';
        
        let writeCount = 0;
        
        // 1. 매출전표 복구
        for (const inv of salesInvoices) {
          const invoiceId = String(inv.id);
          const hasSaleEntry = inventoryTransferHistory.some(h => String(h.salesInvoiceId) === invoiceId && h.to === '매출출고');
          if (!hasSaleEntry && inv.items) {
            for (const item of inv.items) {
              const historyId = Date.now() + Math.random();
              const saleEntry = {
                id: historyId,
                date: inv.date,
                from: inv.warehouse,
                to: '매출출고',
                item: item.name,
                spec: item.spec || '-',
                qty: Number(item.qty),
                processedAt: '12:00:00',
                operator: inv.creator || '시스템',
                memo: `[매출] ${inv.partner}`,
                salesInvoiceId: invoiceId,
                companyId
              };
              await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), saleEntry);
              writeCount++;
            }
          }
          
          // 매출전표 자동이동(상차) 복구
          if (inv.warehouse !== mainWH && inv.items) {
            const hasAutoEntry = inventoryTransferHistory.some(h => String(h.salesInvoiceId) === invoiceId && h.from === mainWH && h.to === inv.warehouse);
            if (!hasAutoEntry) {
              for (const item of inv.items) {
                const historyId = Date.now() + Math.random();
                const autoEntry = {
                  id: historyId,
                  date: inv.date,
                  from: mainWH,
                  to: inv.warehouse,
                  item: item.name,
                  spec: item.spec || '-',
                  qty: Number(item.qty),
                  processedAt: '12:00:00',
                  operator: inv.creator || '시스템',
                  memo: '상차(자동이동)',
                  salesInvoiceId: invoiceId,
                  companyId
                };
                await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), autoEntry);
                writeCount++;
              }
            }
          }
        }

        // 2. 매입전표 복구
        for (const inv of purchaseInvoices) {
          const invoiceId = String(inv.id);
          const hasPurchaseEntry = inventoryTransferHistory.some(h => String(h.purchaseInvoiceId) === invoiceId);
          if (!hasPurchaseEntry && inv.items) {
            for (const item of inv.items) {
              const historyId = Date.now() + Math.random();
              const purchaseEntry = {
                id: historyId,
                date: inv.date,
                from: '매입입고',
                to: inv.warehouse,
                item: item.name,
                spec: item.spec || '-',
                qty: Number(item.qty),
                processedAt: '12:00:00',
                operator: inv.creator || '시스템',
                memo: `[매입] ${inv.partner}`,
                purchaseInvoiceId: invoiceId,
                companyId
              };
              await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), purchaseEntry);
              writeCount++;
            }
          }
        }

        // 3. 주문서(상차) 복구
        for (const order of salesOrders) {
          const orderId = String(order.id);
          if (order.items) {
            for (const item of order.items) {
              if (item.loaded) {
                const hasOrderEntry = inventoryTransferHistory.some(h => 
                  String(h.salesOrderId) === orderId && 
                  h.item === item.name && 
                  h.from === order.outWarehouse &&
                  h.to === order.inWarehouse
                );
                if (!hasOrderEntry) {
                  const historyId = Date.now() + Math.random();
                  const orderEntry = {
                    id: historyId,
                    date: order.date,
                    from: order.outWarehouse,
                    to: order.inWarehouse,
                    item: item.name,
                    spec: item.spec || '-',
                    qty: Number(item.qty),
                    processedAt: '12:00:00',
                    operator: order.manager || '시스템',
                    memo: '상차(자동이동)',
                    salesOrderId: orderId,
                    companyId
                  };
                  await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), orderEntry);
                  writeCount++;
                }
              }
            }
          }
        }

        if (writeCount > 0) {
          console.log(`[Repair] Successfully restored ${writeCount} missing inventory transfer entries.`);
        }
      } catch (err) {
        console.error('Error during inventory history repair:', err);
      }
    };

    // 3초의 여유를 두고 순차적으로 실행
    const timer = setTimeout(() => {
      repairHistory();
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentUser, syncedCollections, salesInvoices, purchaseInvoices, salesOrders, inventoryTransferHistory, warehouses]);

  const onMoveStock = async (from, to, productName, qty, isAuto = false, customDate = null, relatedOrderId = null) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      const getLocalDateStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      
      // 1. Update Inventory State
      const nextInv = { ...inventory };
      if (!nextInv[from]) nextInv[from] = { ...inventory[from] || {} };
      if (!nextInv[to]) nextInv[to] = { ...inventory[to] || {} };
      
      nextInv[from] = { ...nextInv[from], [productName]: (nextInv[from][productName] || 0) - Number(qty) };
      nextInv[to] = { ...nextInv[to], [productName]: (nextInv[to][productName] || 0) + Number(qty) };
      
      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      setInventory(nextInv);

      // 2. Add to Transfer History
      const product = products.find(p => p.name === productName);
      const historyId = Date.now() + Math.random();
      const newEntry = {
        id: historyId,
        date: customDate || getLocalDateStr(),
        from,
        to,
        item: productName,
        spec: product?.spec || '',
        qty: Number(qty),
        processedAt: new Date().toLocaleTimeString(),
        operator: currentUser?.name || '시스템',
        memo: isAuto ? '상차(자동이동)' : '수동이동',
        salesOrderId: relatedOrderId ? String(relatedOrderId) : null,
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), newEntry);
    } catch (err) { console.error(err); }
  };

  const onDeleteMoveStock = async (historyId) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      const record = inventoryTransferHistory.find(h => String(h.id) === String(historyId));
      if (!record) return;

      const { from, to, item, qty, memo, date } = record;
      const nextInv = { ...inventory };

      // 1. 역방향 재고 복구
      if (to === '매출출고') {
        if (!nextInv[from]) nextInv[from] = {};
        nextInv[from][item] = (nextInv[from][item] || 0) + Number(qty);
      } else {
        if (!nextInv[from]) nextInv[from] = {};
        if (!nextInv[to]) nextInv[to] = {};
        nextInv[from][item] = (nextInv[from][item] || 0) + Number(qty);
        nextInv[to][item] = (nextInv[to][item] || 0) - Number(qty);
      }

      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      setInventory(nextInv);

      // 2. 주문서 상차 기록인 경우 주문서(salesOrders)의 loaded 상태를 false로 자동 취소(동기화)
      if (memo === '상차(자동이동)') {
        const targetOrder = salesOrders.find(o => 
          o.date === date &&
          o.outWarehouse === from &&
          o.inWarehouse === to &&
          (o.items || []).some(i => i.name === item && Number(i.qty) === Number(qty) && i.loaded)
        );

        if (targetOrder) {
          const updatedItems = targetOrder.items.map(i => {
            if (i.name === item && Number(i.qty) === Number(qty) && i.loaded) {
              return { ...i, loaded: false };
            }
            return i;
          });
          await setDoc(doc(db, 'companies', companyId, 'salesOrders', String(targetOrder.id)), { items: updatedItems }, { merge: true });
        }
      }

      // 3. Firestore에서 해당 이동 내역 삭제
      await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)));
    } catch (err) {
      console.error('Error deleting move stock:', err);
    }
  };

  const onRevertAutoMoveStock = async (from, to, productName, qty, relatedOrderId = null) => {
    try {
      const companyId = currentUser?.companyId || 'default';

      const nextInv = { ...inventory };
      if (!nextInv[from]) nextInv[from] = {};
      if (!nextInv[to]) nextInv[to] = {};

      nextInv[from][productName] = (nextInv[from][productName] || 0) + Number(qty);
      nextInv[to][productName] = (nextInv[to][productName] || 0) - Number(qty);

      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      setInventory(nextInv);

      const match = [...inventoryTransferHistory]
        .reverse()
        .find(h => 
          h.from === from && 
          h.to === to && 
          h.item === productName && 
          Number(h.qty) === Number(qty) && 
          h.memo === '상차(자동이동)' &&
          (relatedOrderId ? String(h.salesOrderId) === String(relatedOrderId) : true)
        );

      if (match) {
        await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
      }
    } catch (err) {
      console.error('Error in onRevertAutoMoveStock:', err);
    }
  };

  const handleDeleteSalesInvoice = async (id) => {
    const targetInv = salesInvoices.find(si => String(si.id) === String(id));
    if (!checkWritePermission(targetInv?.creator)) {
      alert('수정/삭제 권한이 없습니다 (본인이 작성한 매출전표만 삭제 가능).');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const nextInv = { ...inventory };
      
      if (targetInv) {
        const targetWH = targetInv.warehouse;
        const mainWH = warehouses.find(w => w.isMain)?.name || 
                       warehouses.find(w => w.name.includes('메인'))?.name || 
                       warehouses.find(w => w.name.includes('main'))?.name || 
                       warehouses[0]?.name || 
                       '메인창고';

        // 전표 ID에 매칭되는 모든 재고이동 이력 일괄 삭제 (salesInvoiceId 매칭 우선)
        const idMatches = inventoryTransferHistory.filter(h => String(h.salesInvoiceId) === String(id));
        for (const match of idMatches) {
          await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
        }
        
        if (nextInv[targetWH]) {
          const whInv = { ...nextInv[targetWH] };
          
          for (const item of targetInv.items) {
            whInv[item.name] = (whInv[item.name] || 0) + item.qty;
            
            if (targetWH !== mainWH) {
              const hasAlreadyDeleted = idMatches.some(m => String(m.item) === String(item.name) && String(m.from) === String(mainWH) && String(m.to) === String(targetWH));
              if (!hasAlreadyDeleted) {
                const match = [...inventoryTransferHistory]
                  .reverse()
                  .find(h => 
                    h.date === targetInv.date &&
                    h.from === mainWH &&
                    h.to === targetWH &&
                    h.item === item.name &&
                    h.memo === '상차(자동이동)'
                  );
                  
                if (match) {
                  await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
                  
                  if (!nextInv[mainWH]) nextInv[mainWH] = {};
                  nextInv[mainWH][item.name] = (nextInv[mainWH][item.name] || 0) + (Number(match.qty) || 0);
                  whInv[item.name] = (whInv[item.name] || 0) - (Number(match.qty) || 0);
                }
              }
            }

            // 매출출고 이력 삭제 (유령 거래내역 방지)
            const hasAlreadyDeletedSale = idMatches.some(m => String(m.item) === String(item.name) && String(m.to) === '매출출고');
            if (!hasAlreadyDeletedSale) {
              const saleMatch = [...inventoryTransferHistory]
                .reverse()
                .find(h => 
                  h.date === targetInv.date &&
                  h.from === targetWH &&
                  h.to === '매출출고' &&
                  h.item === item.name &&
                  h.memo === `[매출] ${targetInv.partner}`
                );
              if (saleMatch) {
                await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(saleMatch.id)));
              }
            }
          }
          nextInv[targetWH] = whInv;
          await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
          setInventory(nextInv);
        }
      }
      
      await deleteDoc(doc(db, 'companies', companyId, 'salesInvoices', String(id)));
      alert('매출전표가 삭제되었으며 실시간 재고에 복구되었습니다.');
    } catch (err) { console.error(err); }
  };

  const handleDeleteSalesOrder = async (id) => {
    const targetOrder = salesOrders.find(so => String(so.id) === String(id));
    if (!checkWritePermission(targetOrder?.creator)) {
      alert('수정/삭제 권한이 없습니다 (본인이 작성한 수주서만 삭제 가능).');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const nextInv = { ...inventory };

      if (targetOrder) {
        const fromWH = targetOrder.outWarehouse;
        const toWH = targetOrder.inWarehouse;

        // 1. 주문서에 연계된 모든 재고 이동 내역 일괄 삭제 (salesOrderId 매칭 우선)
        const idMatches = inventoryTransferHistory.filter(h => String(h.salesOrderId) === String(id));
        for (const match of idMatches) {
          await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
        }

        for (const item of (targetOrder.items || [])) {
          if (item.loaded) {
            if (nextInv[toWH]) {
              nextInv[toWH][item.name] = (nextInv[toWH][item.name] || 0) - Number(item.qty);
            }
            if (!nextInv[fromWH]) nextInv[fromWH] = {};
            nextInv[fromWH][item.name] = (nextInv[fromWH][item.name] || 0) + Number(item.qty);

            // ID 매칭으로 지워지지 않은 구버전 데이터 백업 삭제
            const hasAlreadyDeleted = idMatches.some(m => String(m.item) === String(item.name) && Number(m.qty) === Number(item.qty));
            if (!hasAlreadyDeleted) {
              const match = [...inventoryTransferHistory]
                .reverse()
                .find(h => 
                  h.date === targetOrder.date &&
                  h.from === fromWH &&
                  h.to === toWH &&
                  h.item === item.name &&
                  h.memo === '상차(자동이동)'
                );

              if (match) {
                await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
              }
            }
          }
        }

        await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
        setInventory(nextInv);
      }

      await deleteDoc(doc(db, 'companies', companyId, 'salesOrders', String(id)));
      alert('수주서가 삭제되었으며 상차 완료된 재고는 실시간으로 원상 복구되었습니다.');
    } catch (err) {
      console.error('Error deleting sales order:', err);
    }
  };

  const handleDeletePurchaseInvoice = async (id) => {
    const targetInv = purchaseInvoices.find(pi => String(pi.id) === String(id));
    if (!checkWritePermission(targetInv?.creator)) {
      alert('수정/삭제 권한이 없습니다 (본인이 작성한 매입전표만 삭제 가능).');
      return;
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const nextInv = { ...inventory };

      if (targetInv) {
        const targetWH = targetInv.warehouse;

        // 전표 ID에 매칭되는 모든 재고이동 이력 일괄 삭제 (purchaseInvoiceId 매칭 우선)
        const idMatches = inventoryTransferHistory.filter(h => String(h.purchaseInvoiceId) === String(id));
        for (const match of idMatches) {
          await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
        }

        if (nextInv[targetWH]) {
          const whInv = { ...nextInv[targetWH] };

          for (const item of (targetInv.items || [])) {
            whInv[item.name] = (whInv[item.name] || 0) - Number(item.qty);

            const hasAlreadyDeleted = idMatches.some(m => String(m.item) === String(item.name) && String(m.from) === '매입입고');
            if (!hasAlreadyDeleted) {
              const match = [...inventoryTransferHistory]
                .reverse()
                .find(h => 
                  h.date === targetInv.date &&
                  h.from === '매입입고' &&
                  h.to === targetWH &&
                  h.item === item.name &&
                  h.memo === `[매입] ${targetInv.partner}`
                );

              if (match) {
                await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
              }
            }
          }

          nextInv[targetWH] = whInv;
          await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
          setInventory(nextInv);
        }
      }

      await deleteDoc(doc(db, 'companies', companyId, 'purchaseInvoices', String(id)));
      alert('매입전표가 삭제되었으며 실시간 창고 재고 및 매입 이력이 실시간으로 복구되었습니다.');
    } catch (err) {
      console.error('Error deleting purchase invoice:', err);
    }
  };

  const handleSavePurchaseInvoice = async (invData, isSilent = false) => {
    if (invData.id) {
      const targetInv = purchaseInvoices.find(pi => String(pi.id) === String(invData.id));
      if (!checkWritePermission(targetInv?.creator)) {
        alert('수정/삭제 권한이 없습니다 (본인이 작성한 매입전표만 수정 가능).');
        return null;
      }
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const id = invData.id || Date.now();
      const now = new Date();
      const nextInv = { ...inventory };

      const existingInv = editingPurchaseInvoice || purchaseInvoices.find(pi => String(pi.id) === String(id));
      if (existingInv) {
        const oldWH = existingInv.warehouse;
        if (nextInv[oldWH]) {
          const whInv = { ...nextInv[oldWH] };
          (existingInv.items || []).forEach(item => { 
            whInv[item.name] = (whInv[item.name] || 0) - Number(item.qty); 
          });
          nextInv[oldWH] = whInv;
        }

        // Clean up previous history entries for this purchaseInvoice to avoid duplicates on update
        const idMatches = inventoryTransferHistory.filter(h => String(h.purchaseInvoiceId) === String(id));
        for (const match of idMatches) {
          await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
        }
      }

      const targetWH = invData.warehouse;
      if (!nextInv[targetWH]) nextInv[targetWH] = {};
      const whInv = { ...nextInv[targetWH] };
      const processedTime = now.toLocaleTimeString('ko-KR', { hour12: false });
      
      const newHistoryEntries = [];
      for (const item of invData.items) {
        whInv[item.name] = (whInv[item.name] || 0) + Number(item.qty);
        const historyId = Date.now() + Math.random();
        const purchaseEntry = {
          id: historyId,
          date: invData.date,
          from: '매입입고',
          to: targetWH,
          item: item.name,
          spec: item.spec || '-',
          qty: Number(item.qty),
          processedAt: processedTime,
          operator: currentUser?.name || '시스템',
          memo: `[매입] ${invData.partner}`,
          purchaseInvoiceId: String(id),
          companyId
        };
        await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), purchaseEntry);
        newHistoryEntries.push(purchaseEntry);
      }
      nextInv[targetWH] = whInv;
      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      setInventory(nextInv);

      // Update state for history entries
      setInventoryTransferHistory(prev => {
        const filtered = prev.filter(h => String(h.purchaseInvoiceId) !== String(id));
        return [...filtered, ...newHistoryEntries];
      });

      const finalData = { 
        ...invData, 
        id: Number(id), 
        companyId, 
        updatedAt: now.toISOString(), 
        createdAt: invData.createdAt || now.toISOString(),
        creator: invData.creator || currentUser?.name || '시스템'
      };
      await setDoc(doc(db, 'companies', companyId, 'purchaseInvoices', String(id)), finalData);
      
      if (isSilent) {
        setEditingPurchaseInvoice(finalData);
      } else {
        setIsPurchaseInvoiceOpen(false);
        setEditingPurchaseInvoice(null);
        alert('매입전표가 발행되었습니다.');
      }
      return finalData;
    } catch (err) { 
      console.error(err); 
      return null;
    }
  };

  const handleSaveSalesInvoice = async (invData, isSilent = false) => {
    if (invData.id) {
      const targetInv = salesInvoices.find(si => String(si.id) === String(invData.id));
      if (!checkWritePermission(targetInv?.creator)) {
        alert('수정/삭제 권한이 없습니다 (본인이 작성한 매출전표만 수정 가능).');
        return null;
      }
    }
    try {
      const companyId = currentUser?.companyId || 'default';
      const id = invData.id || Date.now();
      const now = new Date();
      const nextInv = { ...inventory };
      
      const oldInv = editingInvoice || salesInvoices.find(si => String(si.id) === String(id));
      if (oldInv) {
        const oldWH = oldInv.warehouse;
        const mainWH = warehouses.find(w => w.isMain)?.name || 
                       warehouses.find(w => w.name.includes('메인'))?.name || 
                       warehouses.find(w => w.name.includes('main'))?.name || 
                       warehouses[0]?.name || 
                       '메인창고';
        
        if (nextInv[oldWH]) {
          const whInv = { ...nextInv[oldWH] };
          
          for (const item of oldInv.items) {
            whInv[item.name] = (whInv[item.name] || 0) + item.qty;
            
            if (oldWH !== mainWH) {
              const match = [...inventoryTransferHistory]
                .reverse()
                .find(h => 
                  h.date === oldInv.date &&
                  h.from === mainWH &&
                  h.to === oldWH &&
                  h.item === item.name &&
                  h.memo === '상차(자동이동)'
                );
                
              if (match) {
                await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(match.id)));
                setInventoryTransferHistory(prev => prev.filter(h => String(h.id) !== String(match.id)));
                if (!nextInv[mainWH]) nextInv[mainWH] = {};
                nextInv[mainWH][item.name] = (nextInv[mainWH][item.name] || 0) + (Number(match.qty) || 0);
                whInv[item.name] = (whInv[item.name] || 0) - (Number(match.qty) || 0);
              }
            }

            // 수정/재발행 시 유령 거래내역 중복 방지를 위한 기존 매출 출고 이력 정리
            const saleMatch = [...inventoryTransferHistory]
              .reverse()
              .find(h => 
                h.date === oldInv.date &&
                h.from === oldWH &&
                h.to === '매출출고' &&
                h.item === item.name &&
                h.memo === `[매출] ${oldInv.partner}`
              );
            if (saleMatch) {
              await deleteDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(saleMatch.id)));
              setInventoryTransferHistory(prev => prev.filter(h => String(h.id) !== String(saleMatch.id)));
            }
          }
          nextInv[oldWH] = whInv;
        }
      }
      
      const targetWH = invData.warehouse;
      if (!nextInv[targetWH]) nextInv[targetWH] = {};
      const whInv = { ...nextInv[targetWH] };
      const processedTime = now.toLocaleTimeString('ko-KR', { hour12: false });
      
      const mainWH = warehouses.find(w => w.isMain)?.name || 
                     warehouses.find(w => w.name.includes('메인'))?.name || 
                     warehouses.find(w => w.name.includes('main'))?.name || 
                     warehouses[0]?.name || 
                     '메인창고';

      const newHistoryEntries = [];

      for (const item of invData.items) {
        whInv[item.name] = (whInv[item.name] || 0) - item.qty;
        
        // ─── 상차(자동이동) 처리: 메인창고에 재고가 있는 양까지만 자동이동 ───
        if (targetWH !== mainWH) {
          const product = products.find(p => p.name === item.name);
          const initialStock = product ? (Number(product.initialStock) || 0) : 0;
          const mainWHChanges = nextInv[mainWH]?.[item.name] || 0;
          const mainWHStock = initialStock + mainWHChanges;
          
          const transferQty = Math.max(0, Math.min(item.qty, mainWHStock));
          
          if (transferQty > 0) {
            if (!nextInv[mainWH]) nextInv[mainWH] = {};
            nextInv[mainWH][item.name] = (nextInv[mainWH][item.name] || 0) - transferQty;
            whInv[item.name] = (whInv[item.name] || 0) + transferQty;
            
            const autoTransferId = Date.now() + Math.random();
            const autoEntry = {
              id: autoTransferId,
              date: invData.date,
              from: mainWH,
              to: targetWH,
              item: item.name,
              spec: item.spec || '-',
              qty: transferQty,
              processedAt: processedTime,
              operator: currentUser?.name || '시스템',
              memo: '상차(자동이동)',
              salesInvoiceId: String(id),
              companyId
            };
            await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(autoTransferId)), autoEntry);
            newHistoryEntries.push(autoEntry);
          }
        }
        
        // [매출] 출고 이력 추가
        const historyId = Date.now() + Math.random();
        const saleEntry = {
          id: historyId,
          date: invData.date,
          from: targetWH,
          to: '매출출고',
          item: item.name,
          spec: item.spec || '-',
          qty: item.qty,
          processedAt: processedTime,
          operator: currentUser?.name || '시스템',
          memo: `[매출] ${invData.partner}`,
          salesInvoiceId: String(id),
          companyId
        };
        await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), saleEntry);
        newHistoryEntries.push(saleEntry);
      }
      nextInv[targetWH] = whInv;
      
      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      setInventory(nextInv);

      // Update state for new history entries
      setInventoryTransferHistory(prev => {
        const filtered = prev.filter(h => String(h.salesInvoiceId) !== String(id));
        return [...filtered, ...newHistoryEntries];
      });
      
      const finalData = { 
        ...invData, 
        id: Number(id), 
        companyId, 
        updatedAt: now.toISOString(),
        creator: invData.creator || currentUser?.name || '시스템'
      };
      await setDoc(doc(db, 'companies', companyId, 'salesInvoices', String(id)), finalData);
      
      if (isSilent) {
        setEditingInvoice(finalData);
      } else {
        setIsSalesInvoiceOpen(false);
        setEditingInvoice(null);
        alert('매출전표가 발행되었으며 실시간 재고에 출고 반영되었습니다.');
      }
      return finalData;
    } catch (err) { 
      console.error(err); 
      return null;
    }
  };

  const handleSaveAdjustment = async (adjData) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      
      // 1. Update Inventory
      const nextInv = { ...inventory };
      const wh = adjData.warehouse;
      const prod = adjData.productName;
      if (!nextInv[wh]) nextInv[wh] = {};
      nextInv[wh] = { ...nextInv[wh], [prod]: (nextInv[wh][prod] || 0) - adjData.qty };
      
      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      setInventory(nextInv);

      // 2. Add to Adjustments List
      const adjId = Date.now();
      await setDoc(doc(db, 'companies', companyId, 'inventoryAdjustments', String(adjId)), { ...adjData, id: adjId, companyId });

      // 3. Process as Expense
      const product = products.find(p => p.id === adjData.productId);
      const unitPrice = product?.purchasePrice || 0;
      const totalAmount = unitPrice * adjData.qty;

      if (totalAmount > 0) {
        const expId = Date.now() + 1;
        const newExpense = {
          id: expId,
          date: adjData.date,
          category: '기타비용',
          description: `[재고손실] ${adjData.productName} ${adjData.qty}개 (${adjData.reason}) - ${adjData.description}`,
          amount: totalAmount,
          method: '기타',
          author: adjData.author,
          isAutoGenerated: true,
          companyId
        };
        await setDoc(doc(db, 'companies', companyId, 'expenses', String(expId)), newExpense);
      }

      alert(`재고 손실 조정이 완료되었습니다.\n창고: ${adjData.warehouse}\n품목: ${adjData.productName}\n차감수량: ${adjData.qty}개\n사유: ${adjData.reason}`);
    } catch (err) { console.error(err); }
  };

  const handleSaveStocktakeAdjustments = async ({ warehouse, date, adjustments, operator }) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      const batch = writeBatch(db);
      
      const nextInv = { ...inventory };
      if (!nextInv[warehouse]) nextInv[warehouse] = {};

      const newHistoryEntries = [];
      const newAdjustmentEntries = [];
      const newExpenses = [];

      for (let i = 0; i < adjustments.length; i++) {
        const adj = adjustments[i];
        const productName = adj.productName;
        const bookStock = adj.bookStock;
        const physicalStock = adj.physicalStock;
        const qty = adj.qty;
        const type = adj.type;
        const reason = adj.reason;
        const description = adj.description;

        const product = products.find(p => p.name === productName);
        const initialStock = product?.initialStock || 0;
        nextInv[warehouse][productName] = physicalStock - initialStock;

        const historyId = Date.now() + i + Math.random();
        const historyEntry = {
          id: historyId,
          date,
          from: type === 'loss' ? warehouse : '재고조정(실사기입)',
          to: type === 'loss' ? '재고조정(실사손실)' : warehouse,
          item: productName,
          spec: adj.spec || '-',
          qty,
          processedAt: new Date().toLocaleTimeString(),
          operator,
          memo: `[실사조정] 장부 ${bookStock} -> 실사 ${physicalStock} (${reason})`,
          description: description,
          companyId
        };
        batch.set(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), historyEntry);
        newHistoryEntries.push(historyEntry);

        const adjId = Date.now() + i + Math.random();
        const adjEntry = {
          id: adjId,
          date,
          warehouse,
          productId: adj.productId,
          productName,
          qty,
          reason,
          description: `[실사조정] 장부 ${bookStock} -> 실사 ${physicalStock} - ${description}`,
          author: operator,
          type,
          companyId
        };
        batch.set(doc(db, 'companies', companyId, 'inventoryAdjustments', String(adjId)), adjEntry);
        newAdjustmentEntries.push(adjEntry);

        if (type === 'loss') {
          const product = products.find(p => p.id === adj.productId);
          const unitPrice = product?.purchasePrice || 0;
          const totalAmount = unitPrice * qty;
          if (totalAmount > 0) {
            const expId = Date.now() + i + 1 + Math.random();
            const newExpense = {
              id: expId,
              date,
              category: '기타비용',
              description: `[재고손실] ${productName} ${qty}개 (${reason}) - 실사조정`,
              amount: totalAmount,
              method: '기타',
              author: operator,
              isAutoGenerated: true,
              companyId
            };
            batch.set(doc(db, 'companies', companyId, 'expenses', String(expId)), newExpense);
            newExpenses.push(newExpense);
          }
        }
      }

      batch.set(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });
      
      const countSummaryId = Date.now() + Math.random();
      const countSummary = {
        id: countSummaryId,
        date,
        warehouse,
        operator,
        adjustmentsCount: adjustments.length,
        itemsAdjusted: adjustments.map(a => ({
          productName: a.productName,
          bookStock: a.bookStock,
          physicalStock: a.physicalStock,
          diff: a.physicalStock - a.bookStock,
          reason: a.reason
        })),
        companyId
      };
      batch.set(doc(db, 'companies', companyId, 'inventoryCounts', String(countSummaryId)), countSummary);

      // Clear adjusted items from physicalInventory
      const nextPhysical = { ...physicalInventory };
      if (nextPhysical[warehouse]) {
        adjustments.forEach(adj => {
          delete nextPhysical[warehouse][adj.productName];
        });
      }
      batch.set(doc(db, 'companies', companyId, 'settings', 'physicalInventory'), { value: nextPhysical });

      await batch.commit();

      setInventory(nextInv);
      setPhysicalInventory(nextPhysical);
      setInventoryTransferHistory(prev => [...prev, ...newHistoryEntries]);
      if (newAdjustmentEntries.length > 0) {
        setInventoryAdjustments(prev => [...prev, ...newAdjustmentEntries]);
      }
      if (newExpenses.length > 0) {
        setExpenses(prev => [...prev, ...newExpenses]);
      }
    } catch (err) {
      console.error('Error saving stocktake adjustments:', err);
      alert('재고 조정 반영 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleUpdatePhysicalCount = async (warehouse, productName, value) => {
    try {
      const companyId = currentUser?.companyId || 'default';
      const nextPhysical = { ...physicalInventory };
      if (!nextPhysical[warehouse]) nextPhysical[warehouse] = {};
      
      if (value === undefined) {
        delete nextPhysical[warehouse][productName];
      } else {
        nextPhysical[warehouse][productName] = value;
      }

      await setDoc(doc(db, 'companies', companyId, 'settings', 'physicalInventory'), { value: nextPhysical });
      setPhysicalInventory(nextPhysical);
    } catch (err) {
      console.error('Error updating physical count:', err);
    }
  };

  const openMismatchFromOrder = (warehouse, product) => {
    setMismatchInitialWarehouse(warehouse);
    setMismatchInitialSearchTerm(product);
    setIsInventoryMismatchOpen(true);
  };

  // 2. Effects for persistence
  React.useEffect(() => {
    if (localStorage.getItem('savedLoginId') === 'windpino') {
      localStorage.removeItem('savedLoginId');
      localStorage.removeItem('savedLoginPw');
    }
  }, []);

  React.useEffect(() => {
    console.log('Categories State Updated:', categories);
  }, [categories]);

  React.useEffect(() => {
    try {
      // We still keep localStorage as a fallback/cache
      localStorage.setItem('staffList', JSON.stringify(staffList));
      localStorage.setItem('schedules', JSON.stringify(schedules));
      localStorage.setItem('products', JSON.stringify(products));
      localStorage.setItem('categories', JSON.stringify(categories));
      localStorage.setItem('partners', JSON.stringify(partners));
      localStorage.setItem('accounts', JSON.stringify(accounts));
      localStorage.setItem('purchaseInvoices', JSON.stringify(purchaseInvoices));
      localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders));
      localStorage.setItem('warehouses', JSON.stringify(warehouses));
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
      localStorage.setItem('expenses', JSON.stringify(expenses));
      localStorage.setItem('licenseData', JSON.stringify(licenseData));
      localStorage.setItem('dashboardConfig', JSON.stringify(dashboardConfig));
      localStorage.setItem('scheduleTypes', JSON.stringify(scheduleTypes));
      localStorage.setItem('inventory', JSON.stringify(inventory));
      localStorage.setItem('physicalInventory', JSON.stringify(physicalInventory));
      localStorage.setItem('inventoryAdjustments', JSON.stringify(inventoryAdjustments));
      localStorage.setItem('inventoryTransferHistory', JSON.stringify(inventoryTransferHistory));
      localStorage.setItem('staffZones', JSON.stringify(staffZones));
      localStorage.setItem('staffJobTitles', JSON.stringify(staffJobTitles));
      
      // Save single docs to Firebase (Throttle this in production!)
      const settingsToSync = { systemSettings, licenseData, dashboardConfig, favoriteMenus, staffZones, staffJobTitles };
      if (currentUser && currentUser.companyId) {
        const companyId = currentUser.companyId;
        Object.entries(settingsToSync).forEach(([name, value]) => {
          setDoc(doc(db, 'companies', companyId, 'settings', name), { value }).catch(e => console.warn("Firebase settings sync failed:", e));
        });
      }

    } catch (e) {
      console.warn('Storage sync failed:', e);
    }
  }, [staffList, schedules, products, categories, partners, accounts, purchaseInvoices, purchaseOrders, warehouses, currentUser, systemSettings, expenses, licenseData, dashboardConfig, scheduleTypes, inventory, physicalInventory, inventoryAdjustments, favoriteMenus, staffZones, staffJobTitles]);

  // Handle toggling menu favorites from window modals
  React.useEffect(() => {
    const handleToggleFavorite = (e) => {
      const menuId = e.detail;
      setFavoriteMenus(prev => {
        let next;
        const activeFavs = prev.filter(Boolean);
        
        if (prev.includes(menuId)) {
          // 이미 즐겨찾기에 등록된 경우 제거 (null로 대체하여 슬롯 구조 유지)
          next = prev.map(id => id === menuId ? null : id);
          showToast('즐겨찾기 메뉴에서 삭제되었습니다.', 'info');
        } else {
          // 즐겨찾기에 등록되지 않은 경우 추가
          if (activeFavs.length >= 7) {
            alert('자주 찾는 메뉴는 최대 7개까지만 등록할 수 있습니다.');
            return prev;
          }
          
          // 빈 슬롯(null)이 있으면 그 자리를 채우고, 없으면 맨 뒤에 추가
          const nullIdx = prev.indexOf(null);
          if (nullIdx !== -1) {
            next = [...prev];
            next[nullIdx] = menuId;
          } else {
            next = [...prev, menuId];
          }
          showToast('즐겨찾기 메뉴에 추가되었습니다.', 'success');
        }
        
        // 로컬스토리지 저장
        localStorage.setItem('favoriteMenus', JSON.stringify(next));
        
        // 파이어베이스 저장 (Firestore 동기화)
        if (currentUser?.companyId) {
          setDoc(doc(db, 'companies', currentUser.companyId, 'settings', 'favoriteMenus'), { value: next })
            .catch(err => console.warn('Firebase favorite sync failed:', err));
        } else {
          setDoc(doc(db, 'settings', 'favoriteMenus'), { value: next })
            .catch(err => console.warn('Firebase favorite sync failed:', err));
        }

        // WindowModal 컴포넌트들에게 업데이트 이벤트 전파
        window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: next }));
        
        return next;
      });
    };

    window.addEventListener('toggleFavorite', handleToggleFavorite);
    return () => window.removeEventListener('toggleFavorite', handleToggleFavorite);
  }, [currentUser]);

  // Handle Paste (Ctrl+V) for schedules
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (!copiedSchedule) return;
        
        // Prevent pasting if user is typing in an input or textarea
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable;
        if (isInput) return;

        // Fix: Use local date instead of UTC to avoid timezone issues
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const newDateStr = `${year}-${month}-${day}`;
        
        // Calculate duration to maintain it when pasting
        const start = new Date(copiedSchedule.startDate || copiedSchedule.date);
        const end = new Date(copiedSchedule.endDate || copiedSchedule.startDate || copiedSchedule.date);
        const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        const pasteEndDate = new Date(selectedDate);
        pasteEndDate.setDate(selectedDate.getDate() + (diffDays > 0 ? diffDays : 0));
        
        const endYear = pasteEndDate.getFullYear();
        const endMonth = String(pasteEndDate.getMonth() + 1).padStart(2, '0');
        const endDay = String(pasteEndDate.getDate()).padStart(2, '0');
        const endDateStr = `${endYear}-${endMonth}-${endDay}`;

        const pastedSchedule = {
          ...copiedSchedule,
          id: Date.now(),
          date: newDateStr,
          startDate: newDateStr,
          endDate: endDateStr,
          author: currentUser?.name || '알 수 없음',
          viewers: [] // Reset viewers for the new copy
        };

        setSchedules(prev => [...prev, pastedSchedule]);
        alert(`복사한 일정이 ${newDateStr} 날짜로 붙여넣기 되었습니다.`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copiedSchedule, selectedDate, currentUser, schedules, favoriteMenus]);

  const handleOpenScheduleDetail = async (schedule) => {
    if (!schedule) return;
    
    setSelectedScheduleForDetail(schedule);
    setIsScheduleDetailOpen(true);
    
    if (currentUser && currentUser.name) {
      const currentViewers = schedule.viewers || [];
      if (!currentViewers.includes(currentUser.name)) {
        const updatedViewers = [...currentViewers, currentUser.name];
        const updatedSchedule = { ...schedule, viewers: updatedViewers };
        
        setSchedules(prev => prev.map(s => String(s.id) === String(schedule.id) ? updatedSchedule : s));
        setSelectedScheduleForDetail(updatedSchedule);
        
        try {
          const companyId = currentUser?.companyId || 'default';
          const docRef = doc(db, 'companies', companyId, 'schedules', String(schedule.id));
          await setDoc(docRef, { viewers: updatedViewers }, { merge: true });
          console.log(`Auto read confirmation synced for schedule ${schedule.id} and user ${currentUser.name}`);
        } catch (err) {
          console.error("Firestore Auto Read Confirmation Sync Error:", err);
        }
      }
    }
  };

  // Drag and Drop Handlers
  const [draggedWidgetId, setDraggedWidgetId] = useState(null);

  const handleDragStart = (e, widgetId) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.setData('widgetId', widgetId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedWidgetId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetWidgetId) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) return;

    const newWidgets = [...dashboardConfig.widgets];
    const draggedIndex = newWidgets.indexOf(draggedWidgetId);
    const targetIndex = newWidgets.indexOf(targetWidgetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Swap the widgets
      newWidgets[draggedIndex] = targetWidgetId;
      newWidgets[targetIndex] = draggedWidgetId;
      setDashboardConfig({ ...dashboardConfig, widgets: newWidgets });
    }
  };

  const renderWidget = (widgetId, spanClass = 'grid-span-2') => {
    if (!widgetId) return <div className={`dashboard-widget empty-slot ${spanClass}`}></div>;

    if (widgetId?.toLowerCase() === 'schedule') {
      return (
        <div 
          key="schedule-widget" 
          className={`dashboard-widget ${draggedWidgetId === 'Schedule' ? 'dragging' : ''} ${spanClass} ${!isDashboardLocked ? 'editable-mode' : ''}`}
          style={{ height: '290px', minHeight: '290px', maxHeight: '290px', overflow: 'hidden' }}
          draggable={!isDashboardLocked}
          onDragStart={(e) => handleDragStart(e, 'Schedule')}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'Schedule')}
        >
          <ScheduleSidebar 
            selectedDate={selectedDate} 
            schedules={schedules} 
            setSchedules={setSchedules} 
            currentUser={currentUser} 
            scheduleTypes={scheduleTypes}
            hiddenScheduleTypes={hiddenScheduleTypes}
            onAdd={() => setIsScheduleRegistrationOpen(true)}
            isDashboardLocked={isDashboardLocked}
            onOpenScheduleDetail={handleOpenScheduleDetail}
            onCopy={(s) => {
              setCopiedSchedule(s);
              alert('일정이 복사되었습니다. 달력에서 날짜 선택 후 Ctrl+V를 누르면 붙여넣기 됩니다.');
            }}
            onEdit={(s) => { setEditingSchedule(s); setIsScheduleRegistrationOpen(true); }}
            onDelete={async (id) => {
              console.log("onDelete triggered. Target ID:", id, "Type:", typeof id);
              
              // bypass window.confirm as it might be blocked by the browser
              // 1. Update local state immediately with robust ID comparison
              setSchedules(prev => {
                const filtered = prev.filter(s => String(s.id) !== String(id));
                console.log(`Filtering complete. Previous: ${prev.length}, Current: ${filtered.length}`);
                return filtered;
              });
              
              // 2. Delete from Firestore
              try {
                const companyId = currentUser?.companyId || 'default';
                const docRef = doc(db, 'companies', companyId, 'schedules', String(id));
                console.log(`Attempting Firestore delete for path: companies/${companyId}/schedules/${id}`);
                await deleteDoc(docRef);
                showToast('일정이 삭제되었습니다.', 'success');
              } catch (err) {
                console.error("Firestore Delete Error:", err);
                alert('삭제 중 오류가 발생했습니다. (네트워크 상태 확인 필요)');
              }
            }}
          />
        </div>
      );
    }

    return (
      <div 
        key={widgetId} 
        className={`dashboard-widget summary-widget ${draggedWidgetId === widgetId ? 'dragging' : ''} ${spanClass} ${!isDashboardLocked ? 'editable-mode' : ''}`}
        style={{ height: '290px', minHeight: '290px', maxHeight: '290px', overflow: 'hidden' }}
        draggable={!isDashboardLocked}
        onDragStart={(e) => handleDragStart(e, widgetId)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, widgetId)}
      >
        <div className="widget-header" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          cursor: isDashboardLocked ? 'default' : 'grab' 
        }}>
          {widgetId === 'Inventory' && <Package size={20} color="#3b82f6" />}
          {widgetId === 'Sales' && <TrendingUp size={20} color="#10b981" />}
          {widgetId === 'Purchase' && <ShoppingCart size={20} color="#f59e0b" />}
          {widgetId === 'Partners' && <Users size={20} color="#8b5cf6" />}
          {widgetId === 'Warehouses' && <Home size={20} color="#ec4899" />}
          {widgetId === 'OrderReport' && <ShoppingCart size={20} color="#3b82f6" />}
          {widgetId === 'CashReport' && <BarChart2 size={20} color="#10b981" />}
          {widgetId === 'Favorites' && <Star size={20} color="#f59e0b" fill="#f59e0b" />}
          <h3 style={{ flex: 1 }}>{
            widgetId === 'Inventory' ? '재고 현황' :
            widgetId === 'Sales' ? '매출 현황' :
            widgetId === 'Purchase' ? '매입 현황' :
            widgetId === 'Partners' ? '거래처 현황' :
            widgetId === 'Warehouses' ? '창고 현황' : 
            widgetId === 'OrderReport' ? '수주 보고' :
            widgetId === 'CashReport' ? '입출금 보고' :
            widgetId === 'Favorites' ? '자주 찾는 메뉴' : widgetId
          }</h3>
          {widgetId === 'Favorites' && (
            <button 
              className="btn-icon-only" 
              onClick={(e) => { e.stopPropagation(); setIsFavoriteSettingsOpen(true); }}
              style={{ padding: '4px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', } }
            >
              <SettingsIcon size={16} />
            </button>
          )}
        </div>
        <div className="widget-content">
          {widgetId === 'Favorites' && (
            <div className="favorites-grid-wrapper" style={{ padding: '4px 0' }}>
              <div className="favorites-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: '8px',
                rowGap: '12px'
              }}>
                {Array.from({ length: 10 }).map((_, idx) => {
                  const menuId = favoriteMenus[idx];
                  const menu = [
                    { id: 'staff', name: '직원 관리', icon: <Users size={20} />, action: () => setIsStaffManagerOpen(true) },
                    { id: 'warehouse', name: '창고 관리', icon: <Home size={20} />, action: () => setIsWarehouseManagerOpen(true) },
                    { id: 'partner', name: '거래처 관리', icon: <UserPlus size={20} />, action: () => setIsPartnerManagerOpen(true) },
                    { id: 'product', name: '품목 관리', icon: <Package size={20} />, action: () => setIsProductManagerOpen(true) },
                    { id: 'account', name: '계좌 관리', icon: <CreditCard size={20} />, action: () => setIsAccountManagerOpen(true) },
                    { id: 'schedule', name: '일정 추가', icon: <CalendarIcon size={20} />, action: () => setIsScheduleRegistrationOpen(true) },
                    { id: 'purchase_invoice', name: '매입 전표', icon: <FileInput size={20} />, action: () => setIsPurchaseInvoiceOpen(true) },
                    { id: 'purchase_ledger', name: '매입 관리', icon: <FileText size={20} />, action: () => setIsPurchaseLedgerOpen(true) },
                    { id: 'purchase_order', name: '발주 등록', icon: <Send size={20} />, action: () => setIsPurchaseOrderOpen(true) },
                    { id: 'sales_invoice', name: '매출 전표', icon: <FileOutput size={20} />, action: () => setIsSalesInvoiceOpen(true) },
                    { id: 'sales_invoice_list', name: '매출전표내역', icon: <List size={20} />, action: () => setIsSalesInvoiceListOpen(true) },
                    { id: 'sales_ledger', name: '매출 원장', icon: <List size={20} />, action: () => setIsSalesLedgerOpen(true) },
                    { id: 'sales_order', name: '수주 추가', icon: <ShoppingCart size={20} />, action: () => { setEditingOrder(null); setOrderingPartner(null); setIsSalesOrderOpen(true); }, highlight: true },
                    { id: 'cash_report_1', name: '결산 보고', icon: <BarChart2 size={20} />, action: () => openCashReport('결산') },
                    { id: 'cash_report_2', name: '입출금 현황', icon: <TrendingUp size={20} />, action: () => openCashReport('일자별') },
                    { id: 'sales_report', name: '매출 보고', icon: <BarChart2 size={20} />, action: () => setIsSalesReportOpen(true) },
                    { id: 'inventory_report_1', name: '일자별 재고현황(창고별이동현황)', icon: <Box size={20} />, action: () => openInventoryReport('일자별') },
                    { id: 'inventory_report_2', name: '최종 재고 현황(창고별 최종재고현황)', icon: <Box size={20} />, action: () => openInventoryReport('최종') },
                    { id: 'receivables', name: '미수금 보고', icon: <DollarSign size={20} />, action: () => setIsReceivablesReportOpen(true) },
                    { id: 'edit_delete', name: '수정삭제 보고', icon: <FileSearch size={20} />, action: () => setIsEditDeleteReportOpen(true) },
                    { id: 'staff_perf', name: '직원 실적', icon: <TrendingUp size={20} />, action: () => setIsStaffPerformanceReportOpen(true) },
                    { id: 'tax_report', name: '부가세 보고', icon: <Percent size={20} />, action: () => setIsTaxReportOpen(true) },
                    { id: 'expense', name: '경비 등록', icon: <DollarSign size={20} />, action: () => setIsExpenseRegistrationOpen(true) },
                    { id: 'data_manager', name: '데이터 관리', icon: <Database size={20} />, action: () => setIsDataManagerOpen(true) },
                    { id: 'settings', name: '환경 설정', icon: <SettingsIcon size={20} />, action: () => setIsSettingsOpen(true) },
                  ].find(m => m.id === menuId);

                  if (!menu) return (
                    <div key={idx} className="favorite-item empty" style={{ 
                      height: '64px', 
                      border: '1px dashed #e2e8f0', 
                      backgroundColor: '#fcfcfc',
                      borderRadius: '8px'
                    }}></div>
                  );

                  return (
                    <button 
                      key={idx} 
                      className="favorite-item-v2" 
                      style={{ 
                        height: '64px', 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: menu.highlight ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : '#f8fafc',
                        border: menu.highlight ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }} 
                      onClick={menu.action}
                    >
                      <div className="menu-icon" style={{ color: menu.highlight ? '#1d4ed8' : '#64748b' }}>
                        {menu.icon}
                      </div>
                      <span className="menu-label" style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: '600',
                        color: menu.highlight ? '#1d4ed8' : '#475569',
                        textAlign: 'center',
                        lineHeight: '1.1'
                      }}>
                        {menu.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {widgetId === 'Inventory' && (() => {
            let discrepancyCount = 0;
            warehouses.forEach(w => {
              products.forEach(p => {
                const bookStock = (p.initialStock || 0) + (inventory[w.name]?.[p.name] || 0);
                const physStock = physicalInventory[w.name]?.[p.name];
                if (physStock !== undefined && physStock !== bookStock) {
                  discrepancyCount++;
                }
              });
            });
            
            return (
              <div className="summary-stat" onClick={() => setIsInventoryMismatchOpen(true)} style={{ cursor: 'pointer' }}>
                <div className="stat-item">
                  <span className="stat-label">총 품목 수</span>
                  <span className="stat-value">{products.length}개</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">카테고리</span>
                  <span className="stat-value">{categories.length}개</span>
                </div>
                <div className="stat-item" style={{ 
                  backgroundColor: discrepancyCount > 0 ? '#fef2f2' : 'transparent', 
                  borderRadius: '6px', 
                  padding: '2px 6px',
                  border: discrepancyCount > 0 ? '1px solid #fee2e2' : 'none'
                }}>
                  <span className="stat-label" style={{ color: discrepancyCount > 0 ? '#dc2626' : '#64748b', fontWeight: discrepancyCount > 0 ? 700 : 500 }}>재고 불일치</span>
                  <span className="stat-value" style={{ color: discrepancyCount > 0 ? '#dc2626' : '#475569', fontWeight: discrepancyCount > 0 ? 800 : 600 }}>{discrepancyCount}건</span>
                </div>
              </div>
            );
          })()}
          {widgetId === 'Sales' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">선택일 매출</span>
                <span className="stat-value">{salesInvoices.filter(inv => inv.date === selectedDate.toISOString().split('T')[0]).reduce((acc, inv) => acc + (inv.totalAmount || 0), 0).toLocaleString()}원</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">완료 수주</span>
                <span className="stat-value">{salesOrders.filter(o => o.date === selectedDate.toISOString().split('T')[0] && o.status === '완료').length}건</span>
              </div>
              <button className="btn-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center', gap: '8px' }} onClick={() => { setEditingOrder(null); setOrderingPartner(null); setIsSalesOrderOpen(true); }}>
                <ShoppingCart size={16} /> 수주 추가
              </button>
            </div>
          )}
          {widgetId === 'Purchase' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">선택일 매입</span>
                <span className="stat-value">{purchaseInvoices.filter(inv => inv.date === selectedDate.toISOString().split('T')[0]).reduce((acc, inv) => acc + (inv.totalAmount || 0), 0).toLocaleString()}원</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">진행 중 발주</span>
                <span className="stat-value">{purchaseOrders.filter(o => o.status === '진행중').length}건</span>
              </div>
            </div>
          )}
          {widgetId === 'Partners' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">총 거래처</span>
                <span className="stat-value">{partners.length}개</span>
              </div>
            </div>
          )}
          {widgetId === 'Warehouses' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">운영 창고</span>
                <span className="stat-value">{warehouses.length}개</span>
              </div>
            </div>
          )}
          {widgetId === 'OrderReport' && (() => {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin';
            const canViewAllOrders = isAdmin || currentUser?.viewOtherWarehouseOrders === true;
            
            const selectedDateOrders = salesOrders.filter(o => {
              const isDate = o.date === dateStr;
              if (!isDate) return false;
              return canViewAllOrders || o.manager === currentUser?.name;
            });
            
            const managerStats = {};
            selectedDateOrders.forEach(order => {
              const managerName = order.manager || '미지정';
              let qtySum = 0;
              if (order.items && Array.isArray(order.items)) {
                qtySum = order.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
              } else if (order.itemsText) {
                const tokens = order.itemsText.trim().split(/[\s\n]+/);
                tokens.forEach(token => {
                  const match = token.match(/^(.+?)(\d+)$/);
                  if (match) qtySum += parseInt(match[2], 10) || 0;
                });
              }
              
              if (!managerStats[managerName]) {
                managerStats[managerName] = {
                  manager: managerName,
                  warehouse: staffList.find(s => s.name === managerName)?.warehouse || '미지정',
                  totalQty: 0,
                  orderCount: 0
                };
              }
              managerStats[managerName].totalQty += qtySum;
              managerStats[managerName].orderCount += 1;
            });
            
            const statsList = Object.values(managerStats);
            
            if (statsList.length === 0) {
              return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: '#94a3b8', fontSize: '0.9rem' }}>
                  선택한 날짜에 등록된 수주가 없습니다.
                </div>
              );
            }
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.1)', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>담당자 (창고)</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>수주수량 (건수)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsList.map((stat, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => {
                          setOrderListSelectedStaff(stat.manager);
                          setIsOrderListOpen(true);
                        }}
                        style={{ 
                          borderBottom: '1px solid rgba(226, 232, 240, 0.05)', 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        className="widget-hover-row"
                      >
                        <td style={{ padding: '8px', color: '#334155', fontWeight: 500 }}>
                          {stat.manager} <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>({stat.warehouse})</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>
                          {stat.totalQty.toLocaleString()}개 <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>({stat.orderCount}건)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
          {widgetId === 'CashReport' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">선택일 매출합계</span>
                <span className="stat-value">{salesInvoices.filter(inv => inv.date === selectedDate.toISOString().split('T')[0]).reduce((acc, inv) => acc + (inv.receivedAmount || 0), 0).toLocaleString()}원</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">선택일 매입합계</span>
                <span className="stat-value">{purchaseInvoices.filter(inv => inv.date === selectedDate.toISOString().split('T')[0]).reduce((acc, inv) => acc + (inv.paidAmount || 0), 0).toLocaleString()}원</span>
              </div>
            </div>
          )}
          {widgetId === 'CashBook' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">입금 합계</span>
                <span className="stat-value">0원</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">출금 합계</span>
                <span className="stat-value">0원</span>
              </div>
            </div>
          )}
          {widgetId === 'Expense' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">당월 경비 합계</span>
                <span className="stat-value">{expenses.filter(e => e.date.startsWith(selectedDate.toISOString().split('T')[0].substring(0, 7))).reduce((acc, e) => acc + (e.amount || 0), 0).toLocaleString()}원</span>
              </div>
            </div>
          )}
          {widgetId === 'Receivables' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">미수금 총액</span>
                <span className="stat-value">{partners.reduce((acc, p) => acc + (p.receivables || 0), 0).toLocaleString()}원</span>
              </div>
            </div>
          )}
          {widgetId === 'InventoryAdjustment' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">최근 조정 건수</span>
                <span className="stat-value">0건</span>
              </div>
            </div>
          )}
          {widgetId === 'TaxReport' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">예상 납부 세액</span>
                <span className="stat-value">0원</span>
              </div>
            </div>
          )}
          {widgetId === 'Settings' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">회사명</span>
                <span className="stat-value">{systemSettings.companyName}</span>
              </div>
            </div>
          )}
          {widgetId === 'License' && (
            <div className="summary-stat">
              <div className="stat-item">
                <span className="stat-label">사용 기한</span>
                <span className="stat-value">{licenseData.expiryDate}</span>
              </div>
            </div>
          )}
        </div>
        <button className="widget-more-btn" onClick={() => {
          if (widgetId === 'Inventory') setIsInventoryReportOpen(true);
          if (widgetId === 'Sales') setIsSalesReportOpen(true);
          if (widgetId === 'Purchase') setIsPurchaseLedgerOpen(true);
          if (widgetId === 'Partners') setIsPartnerManagerOpen(true);
          if (widgetId === 'Warehouses') setIsWarehouseManagerOpen(true);
          if (widgetId === 'OrderReport') setIsOrderReportOpen(true);
          if (widgetId === 'CashReport') openCashReport('결산');
          if (widgetId === 'Favorites') setIsFavoriteSettingsOpen(true);
        }}>자세히 보기</button>
      </div>
    );
  };


  const renderAppView = () => {
    if (currentView === 'login') {
      return (
        <Login 
          onBackToHome={null}
          prefilledAgencyId={prefilledAgencyId}
          onFindAgency={async (idOrEmail, pwd) => {
          // 0. Master Check (Login directly from Stage 1)
          if ((idOrEmail === 'madmin' || idOrEmail === 'sadmin') && pwd === 'gdtop7818@@') {
            const masterUser = { 
              id: idOrEmail === 'madmin' ? 0 : -1, 
              userId: idOrEmail, 
              name: idOrEmail === 'madmin' ? '최고관리자' : '마스터관리자', 
              jobTitle: 'System Master', 
              role: 'super_admin', 
              permissions: ALL_PERMS 
            };
            setCurrentUser(masterUser);
            setCurrentView('super_admin');
            setSelectedDate(new Date());
            localStorage.setItem('currentUser', JSON.stringify(masterUser));
            return { isMaster: true };
          }

          try {
            let company = null;
            const q = query(collection(db, 'companies'), where('email', '==', idOrEmail));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              company = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            } else {
              const docRef = doc(db, 'companies', idOrEmail);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) company = { id: docSnap.id, ...docSnap.data() };
            }

            if (company && company.password === pwd) {
              return company;
            }
            return null;
          } catch (err) {
            console.error("Agency login error:", err);
            return null;
          }
        }}
        onLogin={async (uid, pwd, companyId) => { 
          // Clear prefilled ID after login attempt
          setPrefilledAgencyId('');
          
          // Master check
          if ((uid === 'madmin' || uid === 'sadmin') && pwd === 'gdtop7818@@') {
            const masterUser = { id: 0, userId: uid, name: '최고관리자', jobTitle: 'System Admin', role: 'super_admin', permissions: ALL_PERMS };
            setCurrentUser(masterUser);
            setCurrentView('super_admin');
            setSelectedDate(new Date());
            return true;
          }

          if (!companyId) return false;

          try {
            // 1. Staff Check
            let u = null;
            const compositeId = `${companyId}_${uid}`;
            
            // Direct ID lookup (Fast & Reliable for same IDs across agencies)
            const staffDoc = await getDoc(doc(db, 'companies', companyId, 'staffList', compositeId));
            if (staffDoc.exists()) {
              const data = staffDoc.data();
              if (data.password === pwd) u = data;
            }
            
            // Try userId match if direct ID lookup fails
            if (!u) {
              const staffRef = collection(db, 'companies', companyId, 'staffList');
              const q2 = query(staffRef, where('userId', '==', uid));
              const snap2 = await getDocs(q2);
              if (!snap2.empty) {
                const data = snap2.docs[0].data();
                if (data.password === pwd) u = data;
              }
            }

            if (u) { 
              const today = new Date();
              const expiry = new Date(licenseData.expiryDate);
              
              if (today > expiry) {
                if (licenseData.isLockedOnExpiry) {
                  alert('라이선스가 만료되어 로그인이 차단되었습니다. 관리자에게 문의하세요.');
                  return false;
                } else {
                  setShowLicenseAlert(true);
                }
              }

              setCurrentUser(u); 
              if (u.role === 'super_admin') setCurrentView('super_admin');
              else setCurrentView('dashboard');
              
              setSelectedDate(new Date());
              return true; 
            } 

            // 2. Partner check
            let p = null;
            let loggedInHidePrice = false;
            
            // Direct lookup in company sub-collection
            const partnerDoc = await getDoc(doc(db, 'companies', companyId, 'partners', compositeId));
            if (partnerDoc.exists()) {
              const data = partnerDoc.data();
              const match1 = (data.loginId && data.loginId === uid && data.password === pwd);
              const match2 = (data.loginId2 && data.loginId2 === uid && data.password2 === pwd);
              const match3 = (data.loginId3 && data.loginId3 === uid && data.password3 === pwd);
              const matchEmail = (data.email && data.email === uid && data.password === pwd);
              if (match1 || match2 || match3 || matchEmail) {
                p = data;
                if (match1) loggedInHidePrice = data.hidePrice1 || false;
                else if (match2) loggedInHidePrice = data.hidePrice2 || false;
                else if (match3) loggedInHidePrice = data.hidePrice3 || false;
                else if (matchEmail) loggedInHidePrice = data.hidePrice1 || false;
              }
            }

            // Fallback: Company partners collection scan for multi-account login support if direct lookup fails/doesn't match
            if (!p) {
              const partnerRef = collection(db, 'companies', companyId, 'partners');
              const partnerSnap = await getDocs(partnerRef);
              for (const partnerDoc of partnerSnap.docs) {
                const data = partnerDoc.data();
                const match1 = (data.loginId && data.loginId === uid && data.password === pwd);
                const match2 = (data.loginId2 && data.loginId2 === uid && data.password2 === pwd);
                const match3 = (data.loginId3 && data.loginId3 === uid && data.password3 === pwd);
                const matchEmail = (data.email && data.email === uid && data.password === pwd);
                
                if (match1 || match2 || match3 || matchEmail) {
                  p = data;
                  if (match1) loggedInHidePrice = data.hidePrice1 || false;
                  else if (match2) loggedInHidePrice = data.hidePrice2 || false;
                  else if (match3) loggedInHidePrice = data.hidePrice3 || false;
                  else if (matchEmail) loggedInHidePrice = data.hidePrice1 || false;
                  break;
                }
              }
            }

            if (p) {
              const partnerUser = { 
                ...p, 
                role: 'partner', 
                name: p.name, 
                companyId: p.companyId || companyId,
                hidePrice: loggedInHidePrice
              };
              setCurrentUser(partnerUser);
              
              // Check if the agency itself is new and needs setup
              const compDoc = await getDoc(doc(db, 'companies', partnerUser.companyId));
              const compData = compDoc.exists() ? compDoc.data() : null;
              if (compData && compData.status === 'pending_setup') {
                setCurrentView('onboarding');
                return true;
              }

              setCurrentView('shopping');
              return true;
            }

          } catch (err) {
            console.error("Login error:", err);
          }

          return false; 
        }} 
        onNavigateToSignup={() => setCurrentView('agency_signup')} 
        onNavigateToUserSignup={(agency) => {
          setSelectedAgencyForSignup(agency);
          setCurrentView('user_signup');
        }}
      />
    );
  }

  if (currentView === 'agency_signup') {
    return (
      <AgencySignup 
        agencyCategories={agencyCategories}
        onNavigateToLogin={(id) => {
          if (id) setPrefilledAgencyId(id);
          setCurrentView('login');
        }}
        onSignup={async (userData) => {
          const companyId = userData.id;
          await setDoc(doc(db, 'companies', companyId), {
            id: companyId,
            name: userData.name,
            email: userData.email,
            password: userData.password,
            category: userData.category || '',
            status: 'pending_setup',
            createdAt: new Date().toISOString()
          });
          
          const newPartner = {
            id: Date.now(),
            loginId: userData.email,
            password: userData.password,
            name: userData.name,
            email: userData.email,
            companyId: companyId,
            type: '매출처',
            status: 'pending',
            createdAt: new Date().toISOString()
          };
          // Save to agency sub-collection
          await setDoc(doc(db, 'companies', companyId, 'partners', String(newPartner.id)), newPartner);
          setPartners(prev => [...prev, newPartner]);

          alert('회원사 가입이 완료되었습니다! 방금 가입한 정보로 로그인해 주세요.');
          return true;
        }}
      />
    );
  }

  if (currentView === 'onboarding') {
    return (
      <Onboarding 
        currentUser={currentUser}
        onComplete={async (data) => {
          try {
            const companyId = currentUser.companyId;
            // 1. Update company info
            await updateDoc(doc(db, 'companies', companyId), {
              ...data.company,
              status: 'active',
              updatedAt: new Date().toISOString()
            });

            // 2. Register initial admin staff
            const compositeId = `${companyId}_${data.staff.userId}`;
            const newStaff = {
              ...data.staff,
              id: Date.now(),
              companyId: companyId,
              createdAt: new Date().toISOString()
            };
            
            await setDoc(doc(db, 'companies', companyId, 'staffList', compositeId), newStaff);

            // 3. Update current user to the newly created staff user
            const updatedUser = { ...newStaff, role: 'admin' };
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            setCurrentView('dashboard');
          } catch (err) { 
            console.error("Onboarding completion error:", err);
            alert('설정 저장 중 오류가 발생했습니다.'); 
          }
        }}

      />
    );
  }

  if (currentView === 'super_admin') {
    return (
      <SuperAdmin 
        onClose={() => setCurrentView('login')} 
        onEnterCompany={(id) => {
          // setCompanyId(id); // Ensure this state exists or skip
          setCurrentUser(prev => ({ ...prev, companyId: id }));
          setCurrentView('dashboard');
        }}
      />
    );
  }

  if (currentView === 'user_signup') {
    return (
      <UserSignup 
        agency={selectedAgencyForSignup}
        warehouses={warehouses}
        onNavigateToLogin={() => setCurrentView('login')}
        onSignup={async (data) => {
          try {
            const compositeId = `${data.companyId}_${data.loginId}`;
            if (data.regType === 'staff') {
              const newStaff = {
                id: Date.now(),
                userId: data.loginId,
                password: data.password,
                name: data.name,
                email: data.email,
                phone: data.phone,
                jobTitle: data.jobTitle,
                role: 'admin', 
                permissions: ALL_PERMS,
                companyId: data.companyId,
                createdAt: data.createdAt
              };
              await setDoc(doc(db, 'companies', data.companyId, 'staffList', compositeId), newStaff);
              alert('직원 등록이 완료되었습니다! 관리자 아이디로 로그인해 주세요.');
            } else {
              const newPartner = {
                id: Date.now(),
                loginId: data.loginId,
                password: data.password,
                name: data.name,
                email: data.email,
                phone: data.phone,
                ceo: data.ceo,
                businessNo: data.businessNo,
                type: data.type,
                companyId: data.companyId,
                status: 'pending',
                createdAt: data.createdAt
              };
              await setDoc(doc(db, 'companies', data.companyId, 'partners', compositeId), newPartner);
              alert('거래처 가입 신청이 완료되었습니다! 관리자 승인 후 이용 가능합니다.');
            }
            setCurrentView('login');
          } catch (err) {
            console.error("User signup error:", err);
            alert('등록 중 오류가 발생했습니다.');
          }
        }}
      />
    );
  }

  const handleMallOrder = (items) => {
    // Find existing pending order for this partner today
    const today = new Date().toISOString().split('T')[0];
    const existingOrder = salesOrders.find(o => 
      o.partner === currentUser.name && 
      o.date === today && 
      o.status === '주문대기'
    );

    const newItems = items.map(item => ({
      name: item.product.name,
      qty: item.qty,
      loaded: false
    }));

    if (existingOrder) {
      // Merge items into existing order
      const mergedItems = [...(existingOrder.items || []), ...newItems];
      const newItemsText = mergedItems.map(i => `${i.name}${i.qty}`).join(' ');
      const additionalAmount = items.reduce((acc, item) => acc + (item.product.salesPriceSingle || item.product.salesPrice || 0) * item.qty, 0);
      
      setSalesOrders(prev => prev.map(o => 
        o.id === existingOrder.id 
          ? { ...o, items: mergedItems, itemsText: newItemsText, totalAmount: o.totalAmount + additionalAmount } 
          : o
      ));
      alert('기존 수주서에 품목이 추가되었습니다.');
      showToast(`${currentUser.name} 거래처의 수주가 추가되었습니다!`, 'success');
    } else {
      // Create new order
      const newOrder = {
        id: Date.now(),
        date: today,
        partner: currentUser.name,
        manager: currentUser.manager && currentUser.manager !== '-' ? currentUser.manager : '알 수 없음',
        outWarehouse: warehouses.find(w => w.isMain)?.name || 
                      warehouses.find(w => w.name.includes('메인'))?.name || 
                      warehouses.find(w => w.name.includes('main'))?.name || 
                      warehouses[0]?.name || 
                      '메인창고', 
        inWarehouse: currentUser.warehouse && currentUser.warehouse !== '-' ? currentUser.warehouse : '동명',
        items: newItems,
        itemsText: newItems.map(i => `${i.name}${i.qty}`).join(' '),
        status: '주문대기',
        totalAmount: items.reduce((acc, item) => acc + (item.product.salesPriceSingle || item.product.salesPrice || 0) * item.qty, 0),
        memo: '거래처 직접 수주 (MALL)',
        companyId: currentUser.companyId || 'default'
      };
      
      const companyId = currentUser.companyId || 'default';
      setDoc(doc(db, 'companies', companyId, 'salesOrders', String(newOrder.id)), newOrder);
      alert('수주가 정상적으로 접수되었습니다.');
      showToast(`${currentUser.name} 거래처의 신규 수주가 도착했습니다!`, 'success');
    }
  };

  if (currentView === 'shopping') {
    return (
      <PartnerShoppingMall 
        products={products}
        categories={categories}
        systemSettings={systemSettings}
        salesOrders={salesOrders}
        currentUser={currentUser || { name: '미로그인', role: 'partner' }}
        onLogout={() => {
          if (currentUser && currentUser.role !== 'partner') {
            setCurrentView('dashboard');
          } else {
            handleLogout();
          }
        }}
        onOrder={handleMallOrder}
        onUpdateOrder={(id, data) => setSalesOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o))}
        onDeleteOrder={(id) => setSalesOrders(prev => prev.filter(o => o.id !== id))}
        companyName={companySettings?.name || currentUser?.companyName || systemSettings.company?.name || '회원사'}
      />
    );
  }

  if (currentView === 'signup') {
    return <Signup 
      onNavigateToLogin={() => setCurrentView('login')} 
      staffList={staffList} 
      onSignup={async (nd) => {
        setPartners(prev => [...prev, { ...nd, id: Date.now() }]);
        alert('가입이 완료되었습니다. 로그인해주세요.');
        setCurrentView('login');
      }} 
    />;
  }

  if (currentView === 'shopping') {
    return (
      <PartnerShoppingMall 
        products={products}
        categories={categories}
        systemSettings={systemSettings}
        salesOrders={salesOrders}
        currentUser={currentUser || { name: '미로그인', role: 'partner' }}
        onLogout={() => {
          if (currentUser && currentUser.role !== 'partner') {
            setCurrentView('dashboard');
          } else {
            setCurrentUser(null);
            setCurrentView('login');
          }
        }}
        onOrder={handleMallOrder}
        onUpdateOrder={(id, data) => setSalesOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o))}
        onDeleteOrder={(id) => setSalesOrders(prev => prev.filter(o => o.id !== id))}
        companyName={companySettings?.name || currentUser?.companyName || systemSettings.company?.name || '회원사'}
      />
    );
  }

  if (currentView === 'super_admin') {
    return <SuperAdmin onClose={() => setCurrentView('login')} />;
  }

  const getAgentContext = () => {
    return {
      currentView,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      currentUser: currentUser ? { name: currentUser.name, role: currentUser.role } : null,
      stats: {
        warehouseCount: warehouses?.length || 0,
        staffCount: staffList?.length || 0,
        partnerCount: partners?.length || 0,
        productCount: products?.length || 0,
        categoryCount: categories?.length || 0,
        salesOrderCount: salesOrders?.length || 0,
        salesInvoiceCount: salesInvoices?.length || 0,
        purchaseOrderCount: purchaseOrders?.length || 0,
        purchaseInvoiceCount: purchaseInvoices?.length || 0,
        inventoryTransferCount: inventoryTransferHistory?.length || 0
      }
    };
  };

    return (
      <div className="app-container">
        <Header 
          currentUser={currentUser} 
          companyLogo={companySettings?.theme?.logoUrl}
          companyName={companySettings?.name || systemSettings.company?.name || 'Link X'}
          onLogout={handleLogout} 
          favoriteMenus={favoriteMenus}
          setIsFavoriteSettingsOpen={setIsFavoriteSettingsOpen}
          onOpenInventoryMovementManager={() => setIsInventoryMovementManagerOpen(true)}
        onOpenWarehouseManager={() => setIsWarehouseManagerOpen(true)}
        onOpenStaffManager={() => setIsStaffManagerOpen(true)}
        onOpenInventoryTransfer={openInventoryTransfer}
        onOpenPartnerManager={() => setIsPartnerManagerOpen(true)}
        onOpenProductManager={() => setIsProductManagerOpen(true)}
        onOpenAccountManager={() => setIsAccountManagerOpen(true)}
        onOpenScheduleList={() => setIsScheduleListOpen(true)}
        onOpenPurchaseInvoice={() => setIsPurchaseInvoiceOpen(true)}
        onOpenPurchaseLedger={() => setIsPurchaseLedgerOpen(true)}
        onOpenPurchaseOrder={() => setIsPurchaseOrderOpen(true)}
        onOpenSalesInvoice={openSalesInvoice}
        onOpenSalesInvoiceList={openSalesInvoiceList}
        onOpenSalesLedger={openSalesLedger}
        onOpenSalesOrder={() => { setEditingOrder(null); setIsSalesOrderOpen(true); }}
        onOpenOrderList={() => setIsOrderListOpen(true)}
        onOpenCashReport={openCashReport}
        onOpenSalesReport={() => setIsSalesReportOpen(true)}
        onOpenOrderReport={() => setIsOrderReportOpen(true)}
        onOpenInventoryReport={openInventoryReport}
        onOpenReceivablesReport={() => setIsReceivablesReportOpen(true)}
        onOpenEditDeleteReport={() => setIsEditDeleteReportOpen(true)}
        onOpenCashBook={() => setIsCashBookOpen(true)}
        onOpenExpenseRegistration={() => setIsExpenseRegistrationOpen(true)}
        onOpenStaffPerformanceReport={() => setIsStaffPerformanceReportOpen(true)}
        onOpenDataManager={() => setIsDataManagerOpen(true)}
        onOpenPartnerExcel={() => setIsPartnerExcelOpen(true)}
        onOpenProductExcel={() => setIsProductExcelOpen(true)}
        onOpenPurchaseLedgerExcel={() => setIsPurchaseLedgerExcelOpen(true)}
        onOpenSalesLedgerExcel={() => setIsSalesLedgerExcelOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLicense={() => setIsLicenseOpen(true)}
        onOpenInventoryAdjustment={() => setIsInventoryAdjustmentOpen(true)}
        onOpenInventoryMismatch={() => setIsInventoryMismatchOpen(true)}
        onOpenTaxReport={() => setIsTaxReportOpen(true)}
        onOpenPartnerMall={() => setCurrentView('shopping')}
        onOpenPlatformManager={() => setCurrentView('super_admin')}
        onOpenPartnerSpecialPriceManager={() => setIsPartnerSpecialPriceManagerOpen(true)}
      />
      <div className="main-content">
        <div className="dashboard-grid-layout" style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: 'auto',
          width: '100%',
          gridTemplateColumns: 'none',
          gridTemplateRows: 'none'
        }}>
          <div className="calendar-area" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Mobile Schedule List without Calendar Elements */}
            <div className="mobile-schedule-planner" style={{
              backgroundColor: 'transparent',
              borderRadius: '0',
              padding: '0',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: 'none'
            }}>
              {/* Clean Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                  오늘의 업무 일정
                </span>
                <button
                  onClick={() => setIsScheduleRegistrationOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                    borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white',
                    fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> 일정 추가
                </button>
              </div>


              {/* Schedule List Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  const dayStr = format(selectedDate, 'yyyy-MM-dd');
                  const filtered = schedules.filter(s => {
                    const sStart = s.startDate || s.date;
                    const sEnd = s.endDate || s.startDate || s.date;
                    return dayStr >= sStart && dayStr <= sEnd && !(hiddenScheduleTypes || []).includes(s.type);
                  }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                  if (filtered.length === 0) {
                    return (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '32px 16px', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #e2e8f0',
                        borderRadius: '12px'
                      }}>
                        <span>선택한 날짜에 일정이 없습니다.</span>
                      </div>
                    );
                  }

                  const getBadgeStyles = (type) => {
                    const match = scheduleTypes.find(t => t.name === type);
                    if (match) {
                      const baseColor = match.color;
                      return {
                        backgroundColor: `${baseColor}15`,
                        color: baseColor,
                        border: `1px solid ${baseColor}40`
                      };
                    }
                    return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
                  };

                  return filtered.map(schedule => {
                    const badge = getBadgeStyles(schedule.type);
                    const hasViewed = schedule.viewers && schedule.viewers.includes(currentUser?.name);
                    return (
                      <div 
                        key={schedule.id}
                        onClick={() => handleOpenScheduleDetail(schedule)}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: hasViewed ? '#f0fdf4' : '#f8fafc',
                          border: '1px solid',
                          borderColor: hasViewed ? '#bbf7d0' : '#e2e8f0',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px',
                              backgroundColor: badge.backgroundColor, color: badge.color, border: badge.border,
                              fontWeight: 700
                            }}>
                              {schedule.type}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                              {schedule.time || '하루 종일'}
                            </span>
                          </div>
                          {schedule.author && (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>작성자: {schedule.author}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', textAlign: 'left' }}>
                          {schedule.title}
                        </div>
                        {schedule.memo && (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                            {schedule.memo}
                          </p>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* right-side-grid is hidden per user request to simplify mobile view */}
          {false && (
            <div className="right-side-grid" style={{ gridRow: `span 3` }}>
              {(() => {
                const activeWidgets = dashboardConfig.widgets.filter(id => id !== 'Calendar' && id !== 'Favorites');
                const maxWidgets = 6;
                const displayWidgets = activeWidgets.slice(0, maxWidgets);
                
                return displayWidgets.map((widgetId) => {
                  return (
                    <div 
                      key={widgetId} 
                      className="grid-item" 
                      style={{ 
                        gridRow: 'span 1',
                        height: '100%',
                        minHeight: '290px',
                        maxHeight: '290px',
                        overflow: 'hidden'
                      }}
                    >
                      {renderWidget(widgetId, '')}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isWarehouseManagerOpen && <WarehouseManagement onClose={() => setIsWarehouseManagerOpen(false)} warehouses={warehouses} setWarehouses={setWarehouses} currentUser={currentUser} staffList={staffList} />}
      {isStaffManagerOpen && <StaffManagement onClose={() => setIsStaffManagerOpen(false)} staffList={staffList} setStaffList={setStaffList} warehouses={warehouses} currentUser={currentUser} staffZones={staffZones} setStaffZones={setStaffZones} staffJobTitles={staffJobTitles} setStaffJobTitles={setStaffJobTitles} />}
      {isInventoryTransferOpen && <InventoryTransfer 
        onClose={() => { setIsInventoryTransferOpen(false); setInventoryTransferInitialDate(null); }} 
        currentUser={currentUser} 
        warehouses={warehouses} 
        products={products}
        inventory={inventory}
        onMoveStock={onMoveStock}
        onDeleteMoveStock={onDeleteMoveStock}
        historyData={inventoryTransferHistory}
        setHistoryData={setInventoryTransferHistory}
        salesOrders={salesOrders}
        salesInvoices={salesInvoices}
        onOpenSalesInvoice={openSalesInvoice}
        onOpenSalesOrder={(order) => { setEditingOrder(order); setIsSalesOrderOpen(true); }}
        purchaseInvoices={purchaseInvoices}
        onOpenPurchaseInvoice={openPurchaseInvoice}
        initialDate={inventoryTransferInitialDate}
      />}
      {isPartnerManagerOpen && (
        <PartnerManagement 
          onClose={() => setIsPartnerManagerOpen(false)} 
          staffList={staffList} 
          partners={partners} 
          setPartners={setPartners} 
          onOrder={(p) => setOrderingPartner(p)} 
          warehouses={warehouses} 
          onOpenBulk={() => setIsPartnerBulkOpen(true)} 
          currentUser={currentUser}
          accounts={accounts}
        />
      )}
      {isProductManagerOpen && <ProductManagement onClose={() => setIsProductManagerOpen(false)} products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} onOpenBulk={() => setIsProductBulkOpen(true)} currentUser={currentUser} />}
      {isPartnerSpecialPriceManagerOpen && (
        <PartnerSpecialPriceManager 
          onClose={() => setIsPartnerSpecialPriceManagerOpen(false)} 
          partners={partners} 
          products={products} 
          specialPrices={specialPrices} 
          currentUser={currentUser}
        />
      )}
      {isAccountManagerOpen && <AccountManagement onClose={() => setIsAccountManagerOpen(false)} accounts={accounts} setAccounts={setAccounts} currentUser={currentUser} />}
      {isScheduleDetailOpen && (
        <ScheduleDetailModal 
          schedule={selectedScheduleForDetail} 
          onClose={() => { setIsScheduleDetailOpen(false); setSelectedScheduleForDetail(null); }} 
          currentUser={currentUser} 
          scheduleTypes={scheduleTypes}
          onUpdateSchedule={(updatedSched) => {
            setSchedules(prev => prev.map(s => String(s.id) === String(updatedSched.id) ? updatedSched : s));
            setSelectedScheduleForDetail(updatedSched);
          }}
        />
      )}
      
      {isScheduleListOpen && (
        <ScheduleList 
          onClose={() => setIsScheduleListOpen(false)} 
          schedules={schedules} 
          setSchedules={setSchedules} 
          currentUser={currentUser} 
          scheduleTypes={scheduleTypes}
          onAddSchedule={() => { setIsScheduleListOpen(false); setIsScheduleRegistrationOpen(true); }} 
          onCopy={(s) => {
            setCopiedSchedule(s);
            alert('일정이 복사되었습니다. 달력에서 날짜 선택 후 Ctrl+V를 누르면 붙여넣기 됩니다.');
          }}
          onEdit={(s) => { setEditingSchedule(s); setIsScheduleRegistrationOpen(true); }}
          onDelete={async (id) => {
            if (window.confirm('일정을 삭제하시겠습니까?')) {
              try {
                const companyId = currentUser?.companyId || 'default';
                await deleteDoc(doc(db, 'companies', companyId, 'schedules', String(id)));
                showToast('일정이 삭제되었습니다.', 'success');
              } catch (err) {
                console.error("Delete schedule error:", err);
                alert('삭제 중 오류가 발생했습니다.');
              }
            }
          }}
        />
      )}
      {isTypeManagementOpen && (
        <ScheduleTypeManagement
          onClose={() => setIsTypeManagementOpen(false)}
          scheduleTypes={scheduleTypes}
          onUpdateTypes={setScheduleTypes}
          currentUser={currentUser}
        />
      )}
      {isScheduleRegistrationOpen && (
        <ScheduleRegistration 
          selectedDate={selectedDate} 
          onClose={() => { setIsScheduleRegistrationOpen(false); setEditingSchedule(null); setIsManagingTypesOnOpen(false); }} 
          initialData={editingSchedule}
          initialIsManagingTypes={isManagingTypesOnOpen}
          scheduleTypes={scheduleTypes}
          onUpdateTypes={setScheduleTypes}
          currentUser={currentUser}
          onOpenTypeManagement={() => setIsTypeManagementOpen(true)}
          onSave={async (sd) => {
            try {
              const companyId = currentUser?.companyId || 'default';
              const docId = sd.id ? String(sd.id) : String(Date.now());
              const finalData = {
                ...sd,
                id: sd.id || Number(docId),
                author: sd.author || currentUser?.name || '알 수 없음',
                viewers: sd.viewers || [],
                companyId,
                updatedAt: new Date().toISOString()
              };
              delete finalData.date;
              await setDoc(doc(db, 'companies', companyId, 'schedules', docId), finalData);
              setEditingSchedule(null);
              setIsScheduleRegistrationOpen(false);
              setIsManagingTypesOnOpen(false);
            } catch (err) {
              console.error("Save schedule error:", err);
              alert('저장 중 오류가 발생했습니다.');
            }
          }} 
        />
      )}
      
      {isPurchaseInvoiceOpen && <PurchaseInvoice 
        themeColor={systemSettings.display?.purchaseThemeColor || '#3b82f6'}
        onClose={() => { setIsPurchaseInvoiceOpen(false); setEditingPurchaseInvoice(null); }} 
        selectedDate={selectedDate}
        products={products} 
        partners={partners} 
        staffList={staffList} 
        purchaseInvoices={purchaseInvoices}
        editingInvoice={editingPurchaseInvoice}
        onOpenLedger={() => setIsPurchaseLedgerOpen(true)}
        onDeleteInvoice={handleDeletePurchaseInvoice}
        warehouses={warehouses}
        onSave={handleSavePurchaseInvoice} 
      />}

      {isPurchaseLedgerOpen && <PurchaseLedger 
        onClose={() => setIsPurchaseLedgerOpen(false)} 
        purchaseInvoices={purchaseInvoices} 
        products={products} 
        partners={partners}
        currentUser={currentUser}
        onOpenInvoice={(inv) => openPurchaseInvoice(inv)} 
        onUpdateInvoice={async (inv) => {
          try {
            const companyId = currentUser?.companyId || 'default';
            await setDoc(doc(db, 'companies', companyId, 'purchaseInvoices', String(inv.id)), inv);
          } catch (err) { console.error(err); }
        }}
        zIndex={4000} 
      />}
      {isPurchaseOrderOpen && <PurchaseOrder 
        onClose={() => setIsPurchaseOrderOpen(false)} 
        partners={partners} 
        products={products} 
        purchaseOrders={purchaseOrders} 
        currentUser={currentUser}
        staffList={staffList}
        warehouses={warehouses}
        themeColor={systemSettings.display?.purchaseThemeColor || '#cbd5e1'}
        onTransferToInvoice={(invData) => { setIsPurchaseOrderOpen(false); openPurchaseInvoice(invData); }}
        onSave={async (od) => {
          try {
            const companyId = currentUser?.companyId || 'default';
            const id = od.id || Date.now();
            await setDoc(doc(db, 'companies', companyId, 'purchaseOrders', String(id)), { ...od, id: Number(id), companyId });
          } catch (err) { console.error(err); }
        }} 
      />}
      
      {isSalesLedgerOpen && <SalesLedger
        onClose={() => setIsSalesLedgerOpen(false)}
        salesInvoices={salesInvoices}
        products={products}
        partners={partners}
        onOpenInvoice={(inv) => openSalesInvoice(inv)}
        currentUser={currentUser}
        zIndex={activeSalesModal === 'ledger' ? 5000 : 4000}
        onUpdateInvoice={async (updatedInv) => {
          try {
            const companyId = currentUser?.companyId || 'default';
            await setDoc(doc(db, 'companies', companyId, 'salesInvoices', String(updatedInv.id)), updatedInv, { merge: true });
          } catch (err) { console.error(err); }
        }}
      />}

      {isSalesInvoiceListOpen && <SalesInvoiceList
        onClose={() => setIsSalesInvoiceListOpen(false)}
        salesInvoices={salesInvoices}
        products={products}
        onOpenInvoice={(inv) => openSalesInvoice(inv)}
        zIndex={activeSalesModal === 'invoice_list' ? 5500 : 4000}
        staffList={staffList}
      />}

      {isSalesInvoiceOpen && <SalesInvoice
        themeColor={systemSettings.display?.salesThemeColor || '#3b82f6'}
        zIndex={activeSalesModal === 'invoice' ? 6000 : 3000}
        onClose={() => { setIsSalesInvoiceOpen(false); setEditingInvoice(null); }}
        selectedDate={selectedDate}
        products={products}
        partners={partners}
        specialPrices={specialPrices}
        staffList={staffList}
        currentUser={currentUser}
        warehouses={warehouses}
        salesInvoices={salesInvoices}
        editingInvoice={editingInvoice}
        onOpenLedger={openSalesLedger}
        onDeleteInvoice={handleDeleteSalesInvoice}
        onPrintTaxInvoice={(invoice, isTaxFree) => setPrintingTaxInvoice({ invoice, isTaxFree })}
        onSave={handleSaveSalesInvoice}
        inventory={inventory}
        warnNoStock={systemSettings.salesInvoice?.warnNoStock !== false}
        saveMode={systemSettings.salesInvoice?.saveMode || 'auto'}
      />}

      {isSalesOrderOpen && <SalesOrder 
        themeColor={systemSettings.display?.orderThemeColor || '#3b82f6'}
        onClose={() => setIsSalesOrderOpen(false)} 
        partners={partners} 
        products={products} 
        salesOrders={salesOrders} 
        onSave={async (od) => {
          try {
            const companyId = currentUser?.companyId || 'default';
            const id = od.id || Date.now();
            await setDoc(doc(db, 'companies', companyId, 'salesOrders', String(id)), { ...od, id: Number(id), companyId });
            setEditingOrder(null);
          } catch (err) { console.error(err); }
        }} 
        onTransferToInvoice={(invData) => { setIsSalesOrderOpen(false); openSalesInvoice(invData); }}
        onOpenOrderList={() => { setIsOrderListOpen(true); }}
        currentUser={currentUser} 
        staffList={staffList} 
        warehouses={warehouses} 
        selectedDate={selectedDate} 
        editingOrder={editingOrder}
      />}

      {orderingPartner && (
        <SalesOrder 
          onClose={() => setOrderingPartner(null)} 
          partners={partners} 
          products={products} 
          salesOrders={salesOrders}
          currentUser={currentUser}
          staffList={staffList}
          initialPartner={orderingPartner}
          warehouses={warehouses}
          selectedDate={selectedDate}
          onSave={async (od) => {
            try {
              const companyId = currentUser?.companyId || 'default';
              const id = od.id || Date.now();
              await setDoc(doc(db, 'companies', companyId, 'salesOrders', String(id)), { ...od, id: Number(id), companyId });
              setEditingOrder(null);
              setOrderingPartner(null);
            } catch (err) { console.error(err); }
          }}
          onTransferToInvoice={(invData) => { setOrderingPartner(null); openSalesInvoice(invData); }}
          onOpenOrderList={() => { setOrderingPartner(null); setIsOrderListOpen(true); }}
        />
      )}

      {isOrderListOpen && <OrderList 
        onClose={() => { setIsOrderListOpen(false); setOrderListSelectedStaff('all'); }} 
        salesOrders={salesOrders} 
        products={products}
        selectedDate={selectedDate} 
        staffList={staffList} 
        currentUser={currentUser}
        initialSelectedStaff={orderListSelectedStaff}
        onEditOrder={(order) => { setEditingOrder(order); setIsSalesOrderOpen(true); }}
        onDeleteOrder={handleDeleteSalesOrder}
        onTransferToInvoice={(invData) => { openSalesInvoice(invData); }}
        onOpenInventoryMismatch={openMismatchFromOrder}
        onUpdateOrder={async (id, updates) => {
          try {
            const companyId = currentUser?.companyId || 'default';
            await setDoc(doc(db, 'companies', companyId, 'salesOrders', String(id)), updates, { merge: true });
          } catch (err) { console.error(err); }
        }}
        inventory={inventory}
        onMoveStock={onMoveStock}
        onRevertAutoMoveStock={onRevertAutoMoveStock}
      />}
      
      {isCashReportOpen && <CashReport onClose={() => setIsCashReportOpen(false)} purchaseInvoices={purchaseInvoices} salesInvoices={salesInvoices} staffList={staffList} defaultTab={cashReportTab} />}
      {isSalesReportOpen && <SalesReport onClose={() => setIsSalesReportOpen(false)} salesInvoices={salesInvoices} />}
       {isOrderReportOpen && <OrderReport 
        onClose={() => setIsOrderReportOpen(false)} 
        salesOrders={salesOrders} 
        staffList={staffList} 
        onEditOrder={(order) => {
          setEditingOrder(order);
          setIsSalesOrderOpen(true);
          setIsOrderReportOpen(false);
        }}
      />}
      {isInventoryReportOpen && <InventoryReport 
        onClose={() => setIsInventoryReportOpen(false)} 
        products={products} 
        categories={categories}
        setCategories={setCategories}
        currentUser={currentUser}
        warehouses={warehouses}
        inventory={inventory}
        historyData={inventoryTransferHistory}
        partners={partners}
        purchaseInvoices={purchaseInvoices}
        salesInvoices={salesInvoices}
        salesOrders={salesOrders}
        onOpenSalesInvoice={openSalesInvoice}
        onOpenSalesOrder={(order) => { setEditingOrder(order); setIsSalesOrderOpen(true); }}
        onOpenPurchaseInvoice={openPurchaseInvoice}
        onOpenInventoryTransfer={openInventoryTransfer}
        defaultTab={inventoryReportTab} 
      />}
      {isReceivablesReportOpen && <ReceivablesReport onClose={() => setIsReceivablesReportOpen(false)} partners={partners} salesInvoices={salesInvoices} setPartners={setPartners} staffList={staffList} />}
      {isEditDeleteReportOpen && <EditDeleteReport onClose={() => setIsEditDeleteReportOpen(false)} />}
      {isCashBookOpen && <CashBook onClose={() => setIsCashBookOpen(false)} />}
      {isExpenseRegistrationOpen && (
        <ExpenseRegistration 
          onClose={() => setIsExpenseRegistrationOpen(false)} 
          staffList={staffList} 
          expenses={expenses}
          onSave={async (newExp) => {
            try {
              const companyId = currentUser?.companyId || 'default';
              const id = Date.now();
              await setDoc(doc(db, 'companies', companyId, 'expenses', String(id)), { ...newExp, id, companyId });
            } catch (err) { console.error(err); }
          }}
        />
      )}
      {isStaffPerformanceReportOpen && <StaffPerformanceReport onClose={() => setIsStaffPerformanceReportOpen(false)} staffList={staffList} salesInvoices={salesInvoices} />}
      {isDataManagerOpen && (
        <DataManager 
          onClose={() => setIsDataManagerOpen(false)} 
          onSaveAll={() => {
            const data = { 
              staffList, 
              schedules, 
              scheduleTypes: typeof scheduleTypes !== 'undefined' ? scheduleTypes : [],
              products, 
              categories, 
              partners, 
              accounts, 
              purchaseInvoices, 
              purchaseOrders, 
              salesInvoices, 
              salesOrders, 
              warehouses, 
              inventory, 
              inventoryAdjustments, 
              inventoryTransferHistory,
              expenses: typeof expenses !== 'undefined' ? expenses : [],
              specialPrices,
              systemSettings,
              favoriteMenus,
              staffZones: typeof staffZones !== 'undefined' ? staffZones : [],
              staffJobTitles: typeof staffJobTitles !== 'undefined' ? staffJobTitles : []
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
          }}
          onRestoreAll={async (data) => {
            if (window.confirm('모든 현재 데이터가 덮어씌워집니다. 계속하시겠습니까?')) {
              try {
                const companyId = currentUser?.companyId || 'default';
                const batch = writeBatch(db);
                
                // Helper to add set operations to batch
                const addToBatch = (collectionName, items) => {
                  if (!Array.isArray(items)) return;
                  items.forEach(item => {
                    let docId = String(item.id || item._docId || Date.now() + Math.random());
                    if (collectionName === 'staffList' && item.userId) {
                      docId = `${companyId}_${item.userId}`;
                    } else if (collectionName === 'partners' && item.loginId) {
                      docId = `${companyId}_${item.loginId}`;
                    }
                    const cleanItem = { ...item };
                    delete cleanItem._docId; // clean up internal field
                    batch.set(doc(db, 'companies', companyId, collectionName, docId), {
                      ...cleanItem,
                      companyId
                    });
                  });
                };

                if (data.staffList) addToBatch('staffList', data.staffList);
                if (data.schedules) addToBatch('schedules', data.schedules);
                if (data.scheduleTypes) addToBatch('scheduleTypes', data.scheduleTypes);
                if (data.products) addToBatch('products', data.products);
                if (data.categories) addToBatch('categories', data.categories);
                if (data.partners) addToBatch('partners', data.partners);
                if (data.accounts) addToBatch('accounts', data.accounts);
                if (data.purchaseInvoices) addToBatch('purchaseInvoices', data.purchaseInvoices);
                if (data.purchaseOrders) addToBatch('purchaseOrders', data.purchaseOrders);
                if (data.salesInvoices) addToBatch('salesInvoices', data.salesInvoices);
                if (data.salesOrders) addToBatch('salesOrders', data.salesOrders);
                if (data.warehouses) addToBatch('warehouses', data.warehouses);
                if (data.inventoryAdjustments) addToBatch('inventoryAdjustments', data.inventoryAdjustments);
                if (data.inventoryTransferHistory) addToBatch('inventoryTransferHistory', data.inventoryTransferHistory);
                if (data.expenses) addToBatch('expenses', data.expenses);
                if (data.specialPrices) addToBatch('specialPrices', data.specialPrices);
                if (data.staffZones) addToBatch('staffZones', data.staffZones);
                if (data.staffJobTitles) addToBatch('staffJobTitles', data.staffJobTitles);
                
                // For single docs, write directly
                if (data.inventory) {
                  const val = data.inventory.value || data.inventory;
                  await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: val, companyId });
                  await setDoc(doc(db, 'companies', companyId, 'systemSettings', 'inventory'), { value: val, companyId });
                }
                if (data.systemSettings) {
                  const val = data.systemSettings.value || data.systemSettings;
                  await setDoc(doc(db, 'companies', companyId, 'settings', 'systemSettings'), { value: val, companyId });
                }
                if (data.favoriteMenus) {
                  const val = data.favoriteMenus.value || data.favoriteMenus;
                  await setDoc(doc(db, 'companies', companyId, 'settings', 'favoriteMenus'), { value: val, companyId });
                }
                
                await batch.commit();

                // Local states will be updated by the active onSnapshot real-time listener automatically
                alert('데이터를 성공적으로 불러왔습니다!');
                setIsDataManagerOpen(false);
              } catch (err) {
                console.error('Restore all error:', err);
                alert('데이터 복구 중 오류가 발생했습니다: ' + err.message);
              }
            }
          }}
          onDeleteAll={async () => {
            if (window.confirm('정말로 모든 데이터를 영구히 삭제하시겠습니까?\n이 작업은 데이터베이스와 로컬 스토리지 상의 모든 정보를 지우며 결코 되돌릴 수 없습니다.')) {
              try {
                const companyId = currentUser?.companyId || 'default';
                
                // 1. Clear database collections (비동기 병렬 처리)
                const collectionsToDelete = [
                  'staffList', 'schedules', 'scheduleTypes', 'products', 'categories', 
                  'partners', 'accounts', 'purchaseInvoices', 'purchaseOrders', 
                  'salesInvoices', 'salesOrders', 'warehouses', 'inventoryTransferHistory', 
                  'expenses', 'specialPrices', 'staffZones', 'staffJobTitles'
                ];
                
                console.log(`[Delete All] Clearing ${collectionsToDelete.length} collections for company: ${companyId}`);
                
                for (const colName of collectionsToDelete) {
                  const colRef = collection(db, 'companies', companyId, colName);
                  const snap = await getDocs(colRef);
                  if (snap.size > 0) {
                    await Promise.all(snap.docs.map(doc => deleteDoc(doc.ref)));
                  }
                }
                
                // 2. Clear settings single documents
                const settingsDocs = ['inventory', 'systemSettings', 'favoriteMenus', 'dashboardConfig'];
                for (const docName of settingsDocs) {
                  await deleteDoc(doc(db, 'companies', companyId, 'settings', docName));
                  await deleteDoc(doc(db, 'companies', companyId, 'systemSettings', docName)); // 구버전 경로 백업 삭제
                }
                
                // 3. Clear localStorage completely (보안 데이터 제외)
                const license = localStorage.getItem('licenseData');
                const user = localStorage.getItem('currentUser');
                
                localStorage.clear();
                
                if (license) localStorage.setItem('licenseData', license);
                if (user) localStorage.setItem('currentUser', user);

                alert('데이터베이스 및 로컬 스토리지 상의 모든 정보가 성공적으로 영구 삭제되었습니다. 시스템을 초기 상태로 재부팅합니다.');
                window.location.reload();
              } catch (err) {
                console.error('Delete all error:', err);
                alert('데이터 초기화 중 오류가 발생했습니다: ' + err.message);
              }
            }
          }}
        />
      )}
      {isPartnerBulkOpen && (
        <BulkEditor 
          type="partner"
          data={partners}
          onClose={() => setIsPartnerBulkOpen(false)}
          onSave={async (updatedData) => {
            try {
              const companyId = currentUser?.companyId || 'default';
              const batch = writeBatch(db);
              updatedData.forEach(partnerData => {
                const docId = partnerData.loginId ? `${companyId}_${partnerData.loginId}` : 
                              partnerData.email ? `${companyId}_${partnerData.email}` : 
                              String(partnerData.id || Date.now() + Math.random());
                const finalData = {
                  ...partnerData,
                  companyId,
                  manager: partnerData.manager || '-',
                  updatedAt: new Date().toISOString()
                };
                batch.set(doc(db, 'companies', companyId, 'partners', docId), finalData);
              });
              await batch.commit();

              setPartners(updatedData);

              // Sync new managers with StaffList
              if (setStaffList && staffList) {
                const currentStaffNames = new Set(staffList.map(s => s.name));
                const newManagers = [...new Set(updatedData.map(p => p.manager))].filter(name => name && name !== '-' && !currentStaffNames.has(name));
                
                if (newManagers.length > 0) {
                  const newStaffEntries = newManagers.map(name => ({
                    id: Date.now() + Math.random(),
                    name,
                    jobTitle: '자동등록담당자',
                    phone: '',
                    email: '',
                    memo: '거래처 일괄 편집을 통해 자동 등록됨'
                  }));
                  
                  const staffBatch = writeBatch(db);
                  newStaffEntries.forEach(staff => {
                    const staffCompositeId = `${companyId}_${staff.name}`;
                    staffBatch.set(doc(db, 'companies', companyId, 'staffList', staffCompositeId), {
                      ...staff,
                      companyId
                    });
                  });
                  await staffBatch.commit();
                  setStaffList(prev => [...prev, ...newStaffEntries]);
                }
              }

              alert('✅ 거래처 일괄 편집 사항이 파이어베이스에 성공적으로 저장되었습니다.');
              setIsPartnerBulkOpen(false);
            } catch (err) {
              console.error('Bulk save partners error:', err);
              alert('거래처 일괄 편집 저장 중 오류가 발생했습니다: ' + err.message);
            }
          }}
          staffList={staffList}
          warehouses={warehouses}
        />
      )}
      {isProductBulkOpen && (
        <BulkEditor 
          type="product"
          data={products}
          onClose={() => setIsProductBulkOpen(false)}
          onSave={async (updatedData) => {
            try {
              const companyId = currentUser?.companyId || 'default';
              const batch = writeBatch(db);
              updatedData.forEach(productData => {
                const productId = String(productData.id || Date.now() + Math.random());
                const finalData = {
                  ...productData,
                  companyId,
                  updatedAt: new Date().toISOString()
                };
                batch.set(doc(db, 'companies', companyId, 'products', productId), finalData);
              });
              await batch.commit();

              setProducts(updatedData);

              // Sync new categories with master list
              if (setCategories && categories) {
                const currentCatNames = new Set(categories.map(c => c.name));
                const newCats = [...new Set(updatedData.map(p => p.category))].filter(name => name && !currentCatNames.has(name));
                
                if (newCats.length > 0) {
                  const newCatEntries = newCats.map(name => ({
                    id: Date.now() + Math.random(),
                    name,
                    memo: '품목 일괄 편집을 통해 자동 등록됨'
                  }));
                  
                  const catBatch = writeBatch(db);
                  newCatEntries.forEach(cat => {
                    const catId = String(cat.id);
                    catBatch.set(doc(db, 'companies', companyId, 'categories', catId), {
                      ...cat,
                      companyId
                    });
                  });
                  await catBatch.commit();
                  setCategories(prev => [...prev, ...newCatEntries]);
                }
              }

              alert('✅ 품목 일괄 편집 사항이 파이어베이스에 성공적으로 저장되었습니다.');
              setIsProductBulkOpen(false);
            } catch (err) {
              console.error('Bulk save products error:', err);
              alert('품목 일괄 편집 저장 중 오류가 발생했습니다: ' + err.message);
            }
          }}
          categories={categories}
        />
      )}
      {isPartnerExcelOpen && <PartnerExcelManager onClose={() => setIsPartnerExcelOpen(false)} partners={partners} setPartners={setPartners} staffList={staffList} setStaffList={setStaffList} currentUser={currentUser} />}
      {isProductExcelOpen && <ProductExcelManager onClose={() => setIsProductExcelOpen(false)} products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} currentUser={currentUser} />}
      {isPurchaseLedgerExcelOpen && <PurchaseLedgerExcelManager onClose={() => setIsPurchaseLedgerExcelOpen(false)} purchaseInvoices={purchaseInvoices} setPurchaseInvoices={setPurchaseInvoices} />}
      {isSalesLedgerExcelOpen && <SalesLedgerExcelManager onClose={() => setIsSalesLedgerExcelOpen(false)} salesInvoices={salesInvoices} setSalesInvoices={setSalesInvoices} />}
      {isSettingsOpen && (
        <SettingsManager 
          onClose={() => setIsSettingsOpen(false)} 
          currentUser={currentUser} 
          settings={systemSettings}
          companySettings={companySettings}
          onSaveBranding={(newBranding) => {
            if (currentUser?.companyId) {
              updateDoc(doc(db, 'companies', currentUser.companyId), { theme: newBranding });
            }
          }}
          onSaveCompanyInfo={(info) => {
            if (currentUser?.companyId) {
              updateDoc(doc(db, 'companies', currentUser.companyId), info);
            }
          }}
          onSave={(newSettings) => {
            setSystemSettings(newSettings);
            if (currentUser?.companyId) {
              setDoc(doc(db, 'companies', currentUser.companyId, 'settings', 'systemSettings'), { value: newSettings });
            }
            setIsSettingsOpen(false);
          }}
        />
      )}
      {isLicenseOpen && (
        <LicenseManager 
          onClose={() => setIsLicenseOpen(false)} 
          currentUser={currentUser} 
          licenseData={licenseData} 
          onUpdateLicense={setLicenseData} 
        />
      )}
      {isDashboardSettingsOpen && (
        <DashboardSettingsModal 
          config={dashboardConfig}
          onClose={() => setIsDashboardSettingsOpen(false)}
          onSave={(newWidgets) => {
            setDashboardConfig({ ...dashboardConfig, widgets: newWidgets });
            setIsDashboardSettingsOpen(false);
            alert('변경사항이 적용 되었습니다.');
          }}
        />
      )}
      {isFavoriteSettingsOpen && (
        <FavoriteSettingsModal 
          currentMenus={favoriteMenus}
          onClose={() => setIsFavoriteSettingsOpen(false)}
          onSave={(newMenus) => {
            setFavoriteMenus(newMenus);
            // 로컬스토리지 저장
            localStorage.setItem('favoriteMenus', JSON.stringify(newMenus));
            // Firebase 저장
            if (currentUser?.companyId) {
              setDoc(doc(db, 'companies', currentUser.companyId, 'settings', 'favoriteMenus'), { value: newMenus })
                .catch(err => console.warn('Firebase favorite sync failed:', err));
            }
            setIsFavoriteSettingsOpen(false);
            showToast('자주 찾는 메뉴가 저장되었습니다.', 'success');
          }}
        />
      )}
      {selectedSystemNotice && (
        <WindowModal 
          title="시스템 공지사항 상세 안내" 
          onClose={() => setSelectedSystemNotice(null)}
          width="600px"
          height="450px"
        >
          <div style={{ padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                작성일자: {selectedSystemNotice.date}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                {selectedSystemNotice.title}
              </h2>
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#334155', 
              lineHeight: '1.6', 
              whiteSpace: 'pre-line',
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {selectedSystemNotice.content}
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setSelectedSystemNotice(null)}>확인</button>
            </div>
          </div>
        </WindowModal>
      )}
      {isInventoryAdjustmentOpen && (
        <InventoryAdjustment 
          onClose={() => setIsInventoryAdjustmentOpen(false)}
          products={products}
          partners={partners}
          warehouses={warehouses}
          currentUser={currentUser}
          onSave={handleSaveAdjustment}
        />
      )}
      {isInventoryMismatchOpen && (
        <InventoryMismatch 
          onClose={() => {
            setIsInventoryMismatchOpen(false);
            setMismatchInitialWarehouse('');
            setMismatchInitialSearchTerm('');
          }}
          products={products}
          categories={categories}
          warehouses={warehouses}
          inventory={inventory}
          currentUser={currentUser}
          onSaveAdjustments={handleSaveStocktakeAdjustments}
          initialWarehouse={mismatchInitialWarehouse}
          initialSearchTerm={mismatchInitialSearchTerm}
          physicalInventory={physicalInventory}
          onUpdatePhysicalCount={handleUpdatePhysicalCount}
        />
      )}
      {isTaxReportOpen && (
        <TaxReport 
          onClose={() => setIsTaxReportOpen(false)}
          salesInvoices={salesInvoices}
          purchaseInvoices={purchaseInvoices}
          expenses={expenses}
        />
      )}
      {printingTaxInvoice && (
        <TaxInvoiceDocument 
          invoice={printingTaxInvoice.invoice}
          isTaxFree={printingTaxInvoice.isTaxFree}
          supplier={{
            bizNum: systemSettings.bizNumber,
            name: systemSettings.companyName,
            owner: systemSettings.representative,
            address: systemSettings.address,
            type: systemSettings.businessType,
            item: systemSettings.businessCategory
          }}
          recipient={(() => {
            const p = partners.find(p => p.name === printingTaxInvoice.invoice.partner) || {};
            return {
              ...p,
              bizNum: p.businessNo,
              owner: p.ceo
            };
          })()}
          onClose={() => setPrintingTaxInvoice(null)}
        />
      )}
      {toast.message && (
        <div className={`global-toast ${toast.type}`} style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(30, 41, 59, 0.95)',
          color: 'white', padding: '16px 32px', borderRadius: '50px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          zIndex: 20000, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700,
          fontSize: '1rem', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)',
          animation: 'toast-in-top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <Info size={24} />}
          {toast.message}
        </div>
      )}
      <ChatAssistant context={getAgentContext()} />
    </div>
  );
};

const viewContent = renderAppView();

if (!isMobile) {
  return (
    <div className="mobile-device-simulator mobile-view-active">
      <div className="mobile-phone-frame">
        <div className="simulated-status-bar">
          <span>21:53</span>
          <div className="status-bar-icons">
            <span>LTE</span>
            <span>📶</span>
            <span>🔋 98%</span>
          </div>
        </div>
        <div className="mobile-phone-screen">
          {viewContent}
        </div>
      </div>
    </div>
  );
}

return (
  <div className="mobile-view-active">
    {viewContent}
  </div>
);
}

// ─────────────────────────────────────────────────────────
// FavoriteMenuBar – 달력 위 자주 찾는 메뉴 바
// ─────────────────────────────────────────────────────────
function FavoriteMenuBar({
  favoriteMenus, currentUser, db, setFavoriteMenus, showToast,
  SYSTEM_NOTICES, currentNoticeIdx, noticeFade, setSelectedSystemNotice,
  setIsFavoriteSettingsOpen, onMenuAction
}) {
  const [selectingSlot, setSelectingSlot] = useState(null); // 현재 선택 중인 슬롯 인덱스
  const [searchTerm, setSearchTerm] = useState('');
  const popupRef = React.useRef(null);

  // 팝업 바깥 클릭 시 닫기
  React.useEffect(() => {
    if (selectingSlot === null) return;
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setSelectingSlot(null);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectingSlot]);

  // Firebase + localStorage에 저장하는 함수
  const saveFavorites = (newMenus) => {
    setFavoriteMenus(newMenus);
    localStorage.setItem('favoriteMenus', JSON.stringify(newMenus));
    if (currentUser?.companyId) {
      setDoc(doc(db, 'companies', currentUser.companyId, 'settings', 'favoriteMenus'), { value: newMenus })
        .catch(err => console.warn('Firebase favorite sync failed:', err));
    }
  };

  // 슬롯에 메뉴 배정
  const assignMenuToSlot = (slotIdx, menuId) => {
    const next = [...favoriteMenus];
    // 7칸 보장
    while (next.length < 7) next.push(null);
    next[slotIdx] = menuId || null;
    saveFavorites(next);
    setSelectingSlot(null);
    setSearchTerm('');
    if (menuId) showToast('자주 찾는 메뉴에 추가되었습니다.', 'success');
  };

  // 슬롯 제거
  const removeSlot = (slotIdx) => {
    const next = [...favoriteMenus];
    while (next.length < 7) next.push(null);
    next[slotIdx] = null;
    saveFavorites(next);
    showToast('메뉴가 제거되었습니다.', 'info');
  };

  const filteredMenus = searchTerm
    ? ALL_FAVORITE_MENUS.filter(m =>
        m.name.includes(searchTerm) || m.category.includes(searchTerm)
      )
    : ALL_FAVORITE_MENUS;

  return (
    <div className="calendar-favorites-section" style={{
      backgroundColor: 'transparent',
      borderRadius: '0',
      padding: '0',
      boxShadow: 'none',
      border: 'none',
      marginBottom: '12px',
      position: 'relative'
    }}>
      {/* 헤더 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Star size={16} color="#f59e0b" fill="#f59e0b" />
          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>자주 찾는 메뉴</h4>
        </div>

        {/* 롤오버 공지사항 */}
        <div
          onClick={() => setSelectedSystemNotice(SYSTEM_NOTICES[currentNoticeIdx])}
          style={{
            flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center',
            backgroundColor: '#f1f5f9', borderRadius: '20px', padding: '4px 14px',
            cursor: 'pointer', height: '26px', transition: 'all 0.2s',
            opacity: noticeFade ? 1 : 0, transform: noticeFade ? 'none' : 'translateY(-2px)'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', marginRight: '8px', whiteSpace: 'nowrap' }}>NOTICE</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {SYSTEM_NOTICES[currentNoticeIdx]?.title}
          </span>
        </div>

        <button
          onClick={e => { e.stopPropagation(); setIsFavoriteSettingsOpen(true); }}
          style={{ padding: '4px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          title="전체 설정"
        >
          <SettingsIcon size={15} />
        </button>
      </div>

      {/* 7칸 메뉴 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {Array.from({ length: 7 }).map((_, idx) => {
          const menuId = (favoriteMenus || [])[idx] || null;
          const menuInfo = ALL_FAVORITE_MENUS.find(m => m.id === menuId);
          const isSelecting = selectingSlot === idx;

          if (!menuInfo) {
            // 빈 슬롯
            return (
              <div key={idx} style={{ position: 'relative' }}>
                <button
                  onClick={() => { setSelectingSlot(isSelecting ? null : idx); setSearchTerm(''); }}
                  style={{
                    width: '100%', height: '56px', border: '1.5px dashed #cbd5e1',
                    backgroundColor: isSelecting ? '#eff6ff' : '#f8fafc',
                    borderColor: isSelecting ? '#3b82f6' : '#cbd5e1',
                    borderRadius: '8px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '2px',
                    cursor: 'pointer', transition: 'all 0.18s'
                  }}
                  onMouseEnter={e => { if (!isSelecting) { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.borderColor = '#93c5fd'; } }}
                  onMouseLeave={e => { if (!isSelecting) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                  title="클릭하여 메뉴 추가"
                >
                  <Plus size={14} color={isSelecting ? '#3b82f6' : '#94a3b8'} />
                  <span style={{ fontSize: '0.6rem', color: isSelecting ? '#3b82f6' : '#94a3b8', fontWeight: 600 }}>메뉴 추가</span>
                </button>

                {/* 인라인 선택 팝업 */}
                {isSelecting && (
                  <div ref={popupRef} style={{
                    position: 'absolute', top: '78px', left: idx >= 4 ? 'auto' : '0',
                    right: idx >= 4 ? '0' : 'auto',
                    width: '260px', backgroundColor: 'white',
                    borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0', zIndex: 9999, overflow: 'hidden'
                  }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                        슬롯 {idx + 1} 메뉴 선택
                      </div>
                      <input
                        autoFocus
                        type="text"
                        placeholder="메뉴 검색..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%', padding: '6px 10px', borderRadius: '6px',
                          border: '1px solid #e2e8f0', fontSize: '0.8rem',
                          outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '6px 0' }}>
                      {searchTerm ? (
                        filteredMenus.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>검색 결과 없음</div>
                        ) : filteredMenus.map(opt => (
                          <button key={opt.id} onClick={() => assignMenuToSlot(idx, opt.id)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 14px', border: 'none', background: 'none',
                              cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span style={{ fontSize: '1rem' }}>{opt.emoji}</span>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{opt.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{opt.category}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        FAV_CATEGORIES.map(cat => {
                          const catMenus = ALL_FAVORITE_MENUS.filter(m => m.category === cat);
                          return (
                            <div key={cat}>
                              <div style={{ padding: '6px 14px 2px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {cat}
                              </div>
                              {catMenus.map(opt => (
                                <button key={opt.id} onClick={() => assignMenuToSlot(idx, opt.id)}
                                  style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '7px 14px', border: 'none', background: 'none',
                                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <span style={{ fontSize: '0.95rem', minWidth: '20px', textAlign: 'center' }}>{opt.emoji}</span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{opt.name}</span>
                                  {(favoriteMenus || []).includes(opt.id) && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700, backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '10px' }}>등록됨</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 메뉴가 있는 슬롯
          return (
            <div key={idx} style={{ position: 'relative' }}
              onMouseEnter={e => e.currentTarget.querySelector('.slot-remove-btn')?.style && (e.currentTarget.querySelector('.slot-remove-btn').style.opacity = '1')}
              onMouseLeave={e => e.currentTarget.querySelector('.slot-remove-btn')?.style && (e.currentTarget.querySelector('.slot-remove-btn').style.opacity = '0')}
            >
              <button
                onClick={() => { onMenuAction(menuId); }}
                style={{
                  width: '100%', height: '56px', border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc', borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '2px', cursor: 'pointer', transition: 'all 0.18s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={`${menuInfo.name} 열기`}
              >
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{menuInfo.emoji}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#334155', textAlign: 'center', wordBreak: 'keep-all', lineHeight: 1.2 }}>
                  {menuInfo.name}
                </span>
              </button>
              {/* X 버튼 – 호버 시 표시 */}
              <button
                className="slot-remove-btn"
                onClick={e => { e.stopPropagation(); removeSlot(idx); }}
                style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: '#ef4444', border: '2px solid white',
                  color: 'white', fontSize: '10px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s',
                  padding: 0, lineHeight: 1
                }}
                title="제거"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-component for Favorite Settings Modal
function FavoriteSettingsModal({ currentMenus, onClose, onSave }) {
  const [tempMenus, setTempMenus] = useState(() => {
    const base = (currentMenus || []).slice(0, 5);
    return [...base, ...Array(5 - base.length).fill(null)];
  });

  const ALL_AVAILABLE_OPTIONS = [
    { id: 'staff', name: '직원 관리', category: '기초자료등록' },
    { id: 'warehouse', name: '창고 관리', category: '기초자료등록' },
    { id: 'partner', name: '거래처 등록/관리', category: '기초자료등록' },
    { id: 'product', name: '품목 등록/관리', category: '기초자료등록' },
    { id: 'schedule', name: '일정 추가', category: '스마트지원' },
    { id: 'purchase_invoice', name: '매입전표 등록', category: '매입/발주관리' },
    { id: 'purchase_ledger', name: '매입전표 관리', category: '매입/발주관리' },
    { id: 'purchase_order', name: '발주 등록', category: '매입/발주관리' },
    { id: 'sales_invoice', name: '매출전표 등록', category: '매출/수주관리' },
    { id: 'sales_ledger', name: '매출원장', category: '매출/수주관리' },
    { id: 'sales_order', name: '간편수주 등록', category: '매출/수주관리' },
    { id: 'order_list', name: '수주 목록', category: '매출/수주관리' },
    { id: 'account', name: '계좌 관리', category: '입출금관리' },
    { id: 'cash_report_1', name: '결산 보고서', category: '입출금관리' },
    { id: 'cash_report_2', name: '일자별 입출금', category: '입출금관리' },
    { id: 'expense', name: '경비 등록', category: '입출금관리' },
    { id: 'sales_report', name: '매출 보고서', category: '스마트지원' },
    { id: 'inventory_report_1', name: '일자별 재고현황(창고별이동현황)', category: '스마트지원' },
    { id: 'inventory_report_2', name: '최종 재고 현황(창고별 최종재고현황)', category: '스마트지원' },
    { id: 'receivables', name: '미수금 보고서', category: '스마트지원' },
    { id: 'edit_delete', name: '수정삭제 보고서', category: '스마트지원' },
    { id: 'staff_perf', name: '직원 실적 보고', category: '스마트지원' },
    { id: 'tax_report', name: '부가세 신고 보고', category: '스마트지원' },
    { id: 'data_manager', name: '데이터 관리', category: '시스템관리' },
    { id: 'settings', name: '환경 설정', category: '환경설정&정품등록' },
    { id: 'license', name: '정품 등록', category: '환경설정&정품등록' },
  ];

  const updateSlot = (index, value) => {
    const next = [...tempMenus];
    next[index] = value;
    setTempMenus(next);
  };

  const getWidgetInfo = (id) => {
    switch(id) {
      case 'Schedule': return { name: '업무 일정/메모', icon: <ClipboardList size={18} color="#3b82f6" /> };
      case 'Inventory': return { name: '재고 현황', icon: <Package size={18} color="#10b981" /> };
      case 'Sales': return { name: '매출 현황', icon: <TrendingUp size={18} color="#3b82f6" /> };
      case 'Purchase': return { name: '매입 현황', icon: <ShoppingCart size={18} color="#ef4444" /> };
      case 'Partners': return { name: '거래처 현황', icon: <Users size={18} color="#8b5cf6" /> };
      case 'Warehouses': return { name: '창고 현황', icon: <Home size={18} color="#f59e0b" /> };
      case 'OrderReport': return { name: '수주 보고', icon: <ShoppingCart size={18} color="#06b6d4" /> };
      case 'CashReport': return { name: '입출금 보고', icon: <BarChart2 size={18} color="#ec4899" /> };
      case 'CashBook': return { name: '금전출납부', icon: <CreditCard size={18} color="#10b981" /> };
      case 'Expense': return { name: '경비출금', icon: <DollarSign size={18} color="#f43f5e" /> };
      case 'Receivables': return { name: '미수금관리', icon: <DollarSign size={18} color="#3b82f6" /> };
      case 'InventoryAdjustment': return { name: '재고조정', icon: <AlertTriangle size={18} color="#ef4444" /> };
      case 'TaxReport': return { name: '세금신고 지원', icon: <FileText size={18} color="#6366f1" /> };
      case 'Settings': return { name: '환경설정', icon: <SettingsIcon size={18} color="#64748b" /> };
      case 'License': return { name: '정품등록', icon: <Star size={18} color="#f59e0b" /> };
      case 'Favorites': return { name: '자주 찾는 메뉴', icon: <Star size={18} color="#f59e0b" /> };
      default: return { name: '위젯', icon: <Box size={18} /> };
    }
  };

  return (
    <WindowModal title="자주 찾는 메뉴 설정 (5칸)" onClose={onClose}>
      <div className="favorite-settings-modal" style={{ width: '100%', padding: '16px' }}>
        <p className="settings-hint" style={{ marginBottom: '16px' }}>각 슬롯(총 5개)에 배치할 메뉴를 선택하세요. 비워두려면 '없음'을 선택하세요.</p>
        
        <div className="settings-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {tempMenus.map((currentId, idx) => (
            <div key={idx} className="slot-config" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>슬롯 {idx + 1}</span>
              <select 
                value={currentId || ''} 
                onChange={(e) => updateSlot(idx, e.target.value || null)}
                style={{ 
                  padding: '6px', 
                  borderRadius: '6px', 
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">없음</option>
                {['기초자료등록', '매입/발주관리', '매출/주문관리', '입출금관리', '스마트지원', '시스템관리', '환경설정&정품등록'].map(cat => (
                  <optgroup key={cat} label={cat}>
                    {ALL_AVAILABLE_OPTIONS.filter(o => o.category === cat).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>취소</button>
          <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={() => onSave(tempMenus)}>설정 저장하기</button>
        </div>
      </div>
    </WindowModal>
  );
}

// Sub-component for Dashboard Settings Modal to manage local state
function DashboardSettingsModal({ config, onClose, onSave }) {
  const [tempWidgets, setTempWidgets] = useState(config.widgets.filter(id => id !== 'Calendar' && id !== 'Favorites'));

  const toggleWidget = (id) => {
    if (tempWidgets.includes(id)) {
      setTempWidgets(tempWidgets.filter(w => w !== id));
    } else {
      if (tempWidgets.length >= 6) {
        alert('최대 6개의 메뉴만 선택할 수 있습니다.');
        return;
      }
      setTempWidgets([...tempWidgets, id]);
    }
  };

  return (
    <WindowModal title="대시보드 위젯 설정" onClose={onClose}>
      <div className="dashboard-settings-modal" style={{ border: 'none', boxShadow: 'none', width: '100%' }}>
        <div className="modal-body">
          <p className="settings-hint">대시보드에 표시할 메뉴를 선택하세요. (최대 6개)</p>
          <div className="widget-options" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px',
            marginTop: '16px'
          }}>
            {[
              { id: 'Schedule', name: '업무 일정/메모', icon: <ClipboardList size={18} /> },
              { id: 'Inventory', name: '재고 현황', icon: <Package size={18} /> },
              { id: 'Sales', name: '매출 현황', icon: <TrendingUp size={18} /> },
              { id: 'Purchase', name: '매입 현황', icon: <ShoppingCart size={18} /> },
              { id: 'Partners', name: '거래처 현황', icon: <Users size={18} /> },
              { id: 'Warehouses', name: '창고 현황', icon: <Home size={18} /> },
              { id: 'OrderReport', name: '수주 보고', icon: <ShoppingCart size={18} /> },
              { id: 'CashReport', name: '입출금 보고', icon: <BarChart2 size={18} /> },
              { id: 'CashBook', name: '금전출납부', icon: <CreditCard size={18} /> },
              { id: 'Expense', name: '경비출금', icon: <DollarSign size={18} /> },
              { id: 'Receivables', name: '미수금관리', icon: <DollarSign size={18} /> },
              { id: 'InventoryAdjustment', name: '재고조정', icon: <AlertTriangle size={18} /> },
              { id: 'TaxReport', name: '세금신고 지원', icon: <FileText size={18} /> },
              { id: 'Settings', name: '환경설정', icon: <SettingsIcon size={18} /> },
              { id: 'License', name: '정품등록', icon: <Star size={18} /> }
            ].map(opt => (
              <label key={opt.id} className={`widget-option-label ${tempWidgets.includes(opt.id) ? 'active' : ''}`} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: tempWidgets.includes(opt.id) ? '#eff6ff' : 'white',
                borderColor: tempWidgets.includes(opt.id) ? '#3b82f6' : '#e2e8f0'
              }}>
                <input 
                  type="checkbox" 
                  checked={tempWidgets.includes(opt.id)}
                  onChange={() => toggleWidget(opt.id)}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tempWidgets.includes(opt.id) ? '#1e40af' : '#475569' }}>
                  {opt.icon}
                  <span style={{ fontSize: '0.85rem', fontWeight: tempWidgets.includes(opt.id) ? '600' : '500' }}>{opt.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer" style={{ marginTop: '24px' }}>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onSave(tempWidgets)}>저장 및 적용하기</button>
        </div>
      </div>
    </WindowModal>
  );
}

export default App;
