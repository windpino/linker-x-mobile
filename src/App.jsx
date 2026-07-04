import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sliders, Search, ShoppingCart, ArrowLeftRight, Menu, X,
  User, LogOut, CheckCircle2, ChevronDown, ChevronUp, 
  DollarSign, Package, AlertCircle, Phone, MapPin, Truck,
  Cpu, Send, Calendar, Sparkles, Building2, Info, TrendingUp,
  MessageSquare, Lock, Check, Eye, EyeOff, Mail, Users,
  ArrowUpRight, ArrowDownLeft, FileText, Landmark, FileSpreadsheet, Settings, Database, BarChart2,
  UserPlus, Plus, PlusCircle, Compass, HelpCircle, Star
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, onSnapshot, setDoc, collection, 
  getDocs, getDoc, query, where, addDoc 
} from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAqx7nPiQ0mJGqnAGv28dO07C3-GQuqkpk",
  authDomain: "link-x-6606e.firebaseapp.com",
  projectId: "link-x-6606e",
  storageBucket: "link-x-6606e.firebasestorage.app",
  messagingSenderId: "236294239528",
  appId: "1:236294239528:web:8f735c42d36d6d1c434c1d",
  measurementId: "G-G8626RZH6X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 초성 검색 도우미 함수
const matchesInitialSound = (target, search) => {
  if (!search) return true;
  if (!target) return false;
  
  const searchClean = search.replace(/\s/g, "").toLowerCase();
  const targetClean = target.replace(/\s/g, "").toLowerCase();
  
  if (targetClean.includes(searchClean)) return true;
  
  const CHO = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  
  let result = "";
  for (let i = 0; i < targetClean.length; i++) {
    const code = targetClean.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11172) {
      result += CHO[Math.floor(code / 588)];
    } else {
      result += targetClean.charAt(i);
    }
  }
  return result.includes(searchClean);
};

// 4x4 Grid Option Definitions
const MENU_OPTIONS = [
  { id: 'dashboard', label: '홈 대시보드', icon: Sliders, color: 'text-indigo-400 bg-indigo-500/10' },
  { id: 'sales_order_new', label: '간편수주 등록', icon: ShoppingCart, color: 'text-emerald-450 bg-emerald-500/10' },
  { id: 'sales_order_list', label: '수주목록 (상차)', icon: Truck, color: 'text-blue-400 bg-blue-500/10' },
  { id: 'sales_invoice_list', label: '매출전표 내역', icon: DollarSign, color: 'text-amber-400 bg-amber-500/10' },
  { id: 'inventory_lookup', label: '실시간 재고', icon: Package, color: 'text-sky-400 bg-sky-500/10' },
  { id: 'inventory_transfer', label: '창고간 이동', icon: ArrowLeftRight, color: 'text-violet-400 bg-violet-500/10' },
  { id: 'purchase_invoice', label: '매입전표 등록', icon: ArrowDownLeft, color: 'text-red-400 bg-red-500/10' },
  { id: 'purchase_ledger', label: '매입전표 내역', icon: FileText, color: 'text-slate-400 bg-slate-500/10' },
  { id: 'account_mgmt', label: '계좌관리', icon: Landmark, color: 'text-teal-400 bg-teal-500/10' },
  { id: 'partner_mgmt', label: '거래처관리', icon: Users, color: 'text-rose-400 bg-rose-500/10' },
  { id: 'product_mgmt', label: '품목관리', icon: FileSpreadsheet, color: 'text-amber-550 bg-amber-600/10' },
  { id: 'staff_mgmt', label: '직원관리', icon: User, color: 'text-purple-400 bg-purple-500/10' },
  { id: 'warehouse_mgmt', label: '창고관리', icon: Building2, color: 'text-indigo-400 bg-indigo-500/10' },
  { id: 'agent_chat', label: 'AI 비서', icon: MessageSquare, color: 'text-violet-455 bg-violet-600/10' },
  { id: 'logout', label: '로그아웃', icon: LogOut, color: 'text-rose-500 bg-rose-600/10' },
  { id: 'none', label: '(비어있음)', icon: Plus, color: 'text-slate-650 bg-slate-900/60' }
];

export default function App() {
  // ---------------------------------------------------------
  // 1. 로그인 및 인증 관련 상태
  // ---------------------------------------------------------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [runtimeError, setRuntimeError] = useState(() => localStorage.getItem('last_runtime_error'));
  const [step, setStep] = useState(1);
  const [agencyInput, setAgencyInput] = useState('');
  const [agencyPassword, setAgencyPassword] = useState('');
  const [selectedAgency, setSelectedAgency] = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAgencyPassword, setShowAgencyPassword] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [devCommandInput, setDevCommandInput] = useState('');
  const [devCommands, setDevCommands] = useState([]);
  const [isSubmittingDevCmd, setIsSubmittingDevCmd] = useState(false);
  const [isAgentChatOpen, setIsAgentChatOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleMenuClick = (item) => {
    if (item.implemented) {
      navigateToView(item.id);
    } else {
      showToast(`"${item.title}" 기능은 준비 중입니다.\nPC 버전 마스터허브를 이용해 주세요.`, 'info');
    }
  };

  const menuStructure = [
    {
      id: 'basic',
      title: '기초자료등록',
      icon: 'Sliders',
      items: [
        { id: 'staff_mgmt', title: '직원관리', implemented: true },
        { id: 'warehouse_mgmt', title: '창고관리', implemented: true },
        { id: 'partner_mgmt', title: '거래처등록/관리', implemented: true },
        { id: 'product_mgmt', title: '품목등록/관리', implemented: true }
      ]
    },
    {
      id: 'purchase',
      title: '매입/발주 관리',
      icon: 'ArrowDownLeft',
      items: [
        { id: 'purchase_invoice', title: '매입전표 등록', implemented: true },
        { id: 'purchase_ledger', title: '매입전표 관리 (내역)', implemented: true },
        { id: 'purchase_ledger_raw', title: '매입원장', implemented: false },
        { id: 'purchase_unpaid', title: '매입처미지급현황', implemented: false },
        { id: 'purchase_order', title: '발주 등록', implemented: false }
      ]
    },
    {
      id: 'sales',
      title: '매출/수주 관리',
      icon: 'ArrowUpRight',
      items: [
        { id: 'sales_invoice_list', title: '매출전표 내역 (수금)', implemented: true },
        { id: 'sales_order_new', title: '간편수주 등록', implemented: true },
        { id: 'sales_order_list', title: '수주목록 (상차)', implemented: true },
        { id: 'sales_invoice_new', title: '매출전표등록', implemented: false },
        { id: 'sales_ledger', title: '매출원장', implemented: false }
      ]
    },
    {
      id: 'cash',
      title: '입출금관리',
      icon: 'DollarSign',
      items: [
        { id: 'account_mgmt', title: '계좌관리', implemented: true },
        { id: 'settlement_report', title: '결산보고서', implemented: false },
        { id: 'cash_flow_daily', title: '일자별 입출금 현황', implemented: false },
        { id: 'cash_flow_account', title: '계좌별 입출금 현황', implemented: false },
        { id: 'cash_book', title: '금전출납부', implemented: false },
        { id: 'expense_withdraw', title: '경비출금', implemented: false }
      ]
    },
    {
      id: 'inventory',
      title: '재고관리',
      icon: 'Package',
      items: [
        { id: 'inventory_lookup', title: '실시간 재고 조회', implemented: true },
        { id: 'inventory_transfer', title: '창고 간 재고 이동', implemented: true },
        { id: 'inventory_transfer_history', title: '재고 이동 현황 관리', implemented: false },
        { id: 'inventory_adjustment', title: '재고조정 (손실처리)', implemented: false },
        { id: 'inventory_mismatch', title: '재고 불일치 현황', implemented: false }
      ]
    },
    {
      id: 'inventory_report',
      title: '재고보고서',
      icon: 'BarChart2',
      items: [
        { id: 'inv_daily_status', title: '일자별 재고현황', implemented: false },
        { id: 'inv_final_status', title: '최종 재고 현황', implemented: false },
        { id: 'inv_partner_status', title: '매입처별 재고현황', implemented: false }
      ]
    },
    {
      id: 'smart',
      title: '스마트지원',
      icon: 'Sparkles',
      items: [
        { id: 'agent_chat', title: 'AI 비서 명령창', implemented: true },
        { id: 'schedule_add', title: '일정 관리', implemented: false },
        { id: 'sales_report', title: '매출보고서', implemented: false },
        { id: 'order_report', title: '수주보고서', implemented: false },
        { id: 'invoice_edit_delete_report', title: '전표수정/삭제 보고서', implemented: false },
        { id: 'staff_perf_report', title: '직원 실적 보고서', implemented: false },
        { id: 'receivables_mgmt', title: '미수금관리', implemented: false },
        { id: 'tax_report', title: '세금신고 지원 보고서', implemented: false },
        { id: 'partner_special_price', title: '거래처별 특별단가 관리', implemented: false }
      ]
    },
    {
      id: 'system',
      title: '시스템관리',
      icon: 'Database',
      items: [
        { id: 'sys_backup_restore', title: '데이터 전체 저장/불러오기', implemented: false },
        { id: 'sys_excel_partner', title: '거래처 엑셀파일 저장/불러오기', implemented: false },
        { id: 'sys_excel_product', title: '품목 엑셀파일 저장/불러오기', implemented: false },
        { id: 'sys_excel_sales_ledger', title: '매출처원장 저장/불러오기', implemented: false },
        { id: 'sys_excel_purchase_ledger', title: '매입처원장 저장/불러오기', implemented: false }
      ]
    },
    {
      id: 'config',
      title: '환경설정 & 정품',
      icon: 'Settings',
      items: [
        { id: 'cfg_settings', title: '환경설정', implemented: false },
        { id: 'cfg_license', title: '정품등록', implemented: false }
      ]
    }
  ];
  const [agentChatInput, setAgentChatInput] = useState('');
  const [activeSuccessPopup, setActiveSuccessPopup] = useState(null);
  const [lastProcessedCmdId, setLastProcessedCmdId] = useState(null);
  const [loginFontSize, setLoginFontSize] = useState(() => {
    const saved = localStorage.getItem('login_font_size');
    return saved ? parseInt(saved, 10) : 12;
  });

  useEffect(() => {
    localStorage.setItem('login_font_size', loginFontSize);
    const rootSize = (loginFontSize / 12) * 16;
    document.documentElement.style.fontSize = `${rootSize}px`;
  }, [loginFontSize]);
  
    useEffect(() => {
    if (devCommands.length > 0) {
      const latestCmd = devCommands[0];
      if (latestCmd.status === 'success' && latestCmd.id !== lastProcessedCmdId) {
        if (lastProcessedCmdId === null) {
          setLastProcessedCmdId(latestCmd.id);
        } else {
          setActiveSuccessPopup(latestCmd);
          setLastProcessedCmdId(latestCmd.id);
        }
      }
    }
  }, [devCommands, lastProcessedCmdId]);

  // ---------------------------------------------------------
  // 2. 메뉴 및 뷰 상태
  // ---------------------------------------------------------
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuDropdown, setActiveMenuDropdown] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Favorites Menu State
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('m_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse favorites:", e);
    }
    return ['sales_order_new', 'inventory_lookup', 'sales_order_list', 'sales_invoice_list', 'agent_chat'];
  });

  const toggleFavorite = (menuId) => {
    setFavorites(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const next = arr.includes(menuId) 
        ? arr.filter(id => id !== menuId) 
        : [...arr, menuId];
      localStorage.setItem('m_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Enforce role/permission-based menu access
  const hasMenuPermission = (menuId) => {
    if (!isLoggedIn || !currentUser) return false;
    
    // Super admins and system administrators get full access
    if (
      currentUser.role === 'super_admin' || 
      currentUser.userId === 'sadmin' || 
      currentUser.userId === 'madmin' || 
      currentUser.role === 'master' || 
      currentUser.role === 'admin'
    ) {
      return true;
    }

    const perms = currentUser.permissions;
    if (perms) {
      if (perms.ALL === true || perms.ALL === 'true') return true;
      if (Array.isArray(perms) && perms.includes('ALL')) return true;
    }

    const hasPerm = (title) => {
      if (!perms) return false;
      
      // Case 1: permissions is an Array
      if (Array.isArray(perms)) {
        return perms.some(p => p && typeof p === 'string' && p.includes(title));
      }
      
      // Case 2: permissions is a Map/Object
      return Object.keys(perms).some(key => {
        return key.includes(title) && (perms[key] === true || perms[key] === 'true');
      });
    };

    switch (menuId) {
      case 'dashboard':
        return true;
      case 'staff_mgmt':
        return hasPerm('직원') || hasPerm('직원관리') || currentUser.role === 'manager';
      case 'warehouse_mgmt':
        return hasPerm('창고') || hasPerm('창고관리') || currentUser.role === 'manager';
      case 'partner_mgmt':
        return hasPerm('거래처') || hasPerm('거래처등록') || currentUser.role === 'manager';
      case 'product_mgmt':
        return hasPerm('품목') || hasPerm('품목등록') || currentUser.role === 'manager';
      case 'purchase_invoice':
      case 'purchase_ledger':
        return hasPerm('매입') || hasPerm('매입전표') || hasPerm('매입원장');
      case 'sales_invoice_list':
        return hasPerm('매출') || hasPerm('매출전표') || hasPerm('매출원장');
      case 'sales_order_new':
      case 'sales_order_list':
        return hasPerm('수주') || hasPerm('상차');
      case 'account_mgmt':
        return hasPerm('계좌') || hasPerm('계좌관리') || hasPerm('입출금');
      case 'inventory_lookup':
      case 'inventory_transfer':
        return hasPerm('재고') || hasPerm('재고이동');
      case 'agent_chat':
        return hasPerm('비서') || hasPerm('AI') || hasPerm('AI 비서');
      case 'logout':
        return true;
      default:
        return false;
    }
  };

  // 4x4 Grid Customization States
  const [isGridSettingsOpen, setIsGridSettingsOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  
  // 16 slots default configuration
  const [gridConfig, setGridConfig] = useState(() => {
    const saved = localStorage.getItem('m_grid_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length === 10) return parsed;
    }
    return [
      'sales_order_new', 'sales_order_list', 'sales_invoice_list', 'inventory_lookup', 'inventory_transfer',
      'purchase_invoice', 'purchase_ledger', 'account_mgmt', 'agent_chat', 'logout'
    ];
  });

  const saveGridConfig = (newConfig) => {
    setGridConfig(newConfig);
    localStorage.setItem('m_grid_config', JSON.stringify(newConfig));
  };
  
  // ---------------------------------------------------------
  // 3. Firestore 데이터 상태
  // ---------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [partners, setPartners] = useState([]);
  const [specialPrices, setSpecialPrices] = useState([]);
  const [inventory, setInventory] = useState({});
  const [salesOrders, setSalesOrders] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [agentChats, setAgentChats] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // ---------------------------------------------------------
  // 4. 로컬 스토리지 자동 로그인 정보 로딩
  // ---------------------------------------------------------
  useEffect(() => {
    const isAutoSave = localStorage.getItem('autoSaveLogin') === 'true';
    const isAutoLogin = localStorage.getItem('autoLogin') === 'true' && !localStorage.getItem('last_runtime_error');
    setAutoSave(isAutoSave);
    setAutoLogin(isAutoLogin);

    if (isAutoSave) {
      const savedAgencyInput = localStorage.getItem('savedAgencyInput');
      const savedAgencyPw = localStorage.getItem('savedAgencyPw');
      if (savedAgencyInput) setAgencyInput(savedAgencyInput);
      if (savedAgencyPw) setAgencyPassword(savedAgencyPw);

      const savedAgency = localStorage.getItem('savedAgency');
      if (savedAgency) {
        const agency = JSON.parse(savedAgency);
        setSelectedAgency(agency);
        setStep(2);
        
        const savedEmail = localStorage.getItem('savedLoginId');
        const savedPw = localStorage.getItem('savedLoginPw');
        if (savedEmail) setEmail(savedEmail);
        if (savedPw) setPassword(savedPw);

        if (isAutoLogin && savedAgencyInput && savedAgencyPw && savedEmail && savedPw) {
          const performAutoLogin = async () => {
            setIsLoading(true);
            const agencyData = await findAgencyHelper(savedAgencyInput, savedAgencyPw);
            if (agencyData) {
              if (agencyData.isMaster) {
                setIsLoading(false);
                return;
              }
              const userSuccess = await loginHelper(savedEmail, savedPw, agencyData.id);
              if (userSuccess) {
                setIsLoggedIn(true);
              }
            }
            setIsLoading(false);
          };
          performAutoLogin();
        }
      }
    }
  }, []);

  // ---------------------------------------------------------
  // 5. 회원사 및 구성원 인증 헬퍼 함수
  // ---------------------------------------------------------
  const findAgencyHelper = async (idOrEmail, pwd) => {
    if ((idOrEmail === 'madmin' || idOrEmail === 'sadmin') && pwd === 'gdtop7818@@') {
      const ALL_PERMS = ['매입전표', '매입원장', '발주', '매출전표', '매출전표내역', '매출원장', '수주', '계좌관리', '입출금보고서', '금전출납부', '경비출금', '매출보고서', '전표수정/삭제 보고서', '직원 실적 보고서', '재고이동', '재고보고서', '특별단가관리', '데이터 전체 저장/불러오기', '거래처 엑셀파일로 저장/불러오기', '품목 엑셀파일로 저장/불러오기', '매출처원장 저장/불러오기', '매입처원장 저장/불러오기', '일정'];
      const masterUser = { 
        id: idOrEmail === 'madmin' ? 0 : -1, 
        userId: idOrEmail, 
        name: idOrEmail === 'madmin' ? '최고관리자' : '마스터관리자', 
        jobTitle: 'System Master', 
        role: 'super_admin', 
        permissions: ALL_PERMS 
      };
      setCurrentUser(masterUser);
      setIsLoggedIn(true);
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
  };

  const loginHelper = async (uid, pwd, companyId) => {
    if ((uid === 'madmin' || uid === 'sadmin') && pwd === 'gdtop7818@@') {
      const ALL_PERMS = ['매입전표', '매입원장', '발주', '매출전표', '매출전표내역', '매출원장', '수주', '계좌관리', '입출금보고서', '금전출납부', '경비출금', '매출보고서', '전표수정/삭제 보고서', '직원 실적 보고서', '재고이동', '재고보고서', '특별단가관리', '데이터 전체 저장/불러오기', '거래처 엑셀파일로 저장/불러오기', '품목 엑셀파일로 저장/불러오기', '매출처원장 저장/불러오기', '매입처원장 저장/불러오기', '일정'];
      const masterUser = { id: 0, userId: uid, name: '최고관리자', jobTitle: 'System Admin', role: 'super_admin', permissions: ALL_PERMS };
      setCurrentUser(masterUser);
      return true;
    }

    if (!companyId) return false;

    try {
      let u = null;
      const compositeId = `${companyId}_${uid}`;
      
      const staffDoc = await getDoc(doc(db, 'companies', companyId, 'staffList', compositeId));
      if (staffDoc.exists()) {
        const data = staffDoc.data();
        if (data.password === pwd) u = data;
      }
      
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
        setCurrentUser(u);
        return true;
      }
      return false;
    } catch (err) {
      console.error("User login error:", err);
      return false;
    }
  };

  const handleAgencySubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!agencyInput || !agencyPassword) {
      setAuthError('회원사 아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }
    
    setIsLoading(true);
    const agency = await findAgencyHelper(agencyInput, agencyPassword);
    
    if (agency) {
      if (agency.isMaster) {
        setIsLoading(false);
        return;
      }
      setSelectedAgency(agency);
      setStep(2);
      if (autoSave) {
        localStorage.setItem('autoSaveLogin', 'true');
        localStorage.setItem('savedAgencyInput', agencyInput);
        localStorage.setItem('savedAgencyPw', agencyPassword);
        localStorage.setItem('savedAgency', JSON.stringify(agency));
      }
    } else {
      setAuthError('회원사 정보를 찾을 수 없거나 비밀번호가 틀렸습니다.');
    }
    setIsLoading(false);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    
    setIsLoading(true);
    
    if (autoSave) {
      localStorage.setItem('savedLoginId', email);
      localStorage.setItem('savedLoginPw', password);
      localStorage.setItem('autoSaveLogin', 'true');
      localStorage.setItem('autoLogin', autoLogin ? 'true' : 'false');
      localStorage.setItem('savedAgencyInput', agencyInput);
      localStorage.setItem('savedAgencyPw', agencyPassword);
      localStorage.setItem('savedAgency', JSON.stringify(selectedAgency));
    } else {
      localStorage.removeItem('savedLoginId');
      localStorage.removeItem('savedLoginPw');
      localStorage.removeItem('autoLogin');
      localStorage.removeItem('savedAgencyInput');
      localStorage.removeItem('savedAgencyPw');
      localStorage.removeItem('savedAgency');
      localStorage.setItem('autoSaveLogin', 'false');
    }

    const success = await loginHelper(email, password, selectedAgency?.id);
    if (success) {
      setIsLoggedIn(true);
    } else {
      setAuthError('아이디 또는 비밀번호가 틀렸습니다.');
    }
    setIsLoading(false);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setAuthError('');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
    setCurrentUser(null);
    setStep(1);
    setCurrentView('dashboard');
  };

  // ---------------------------------------------------------
  // 6. Firestore 실시간 리스너 바인딩
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isLoggedIn || !selectedAgency?.id) return;
    const companyId = selectedAgency.id;

    const unsubscribes = [];

    // Products
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Categories
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Warehouses
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'warehouses'), (snap) => {
      setWarehouses(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Partners
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'partners'), (snap) => {
      setPartners(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Special Prices
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'specialPrices'), (snap) => {
      setSpecialPrices(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Inventory
    unsubscribes.push(onSnapshot(doc(db, 'companies', companyId, 'settings', 'inventory'), (snap) => {
      if (snap.exists()) setInventory(snap.data().value || {});
    }));

    // Sales Orders
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'salesOrders'), (snap) => {
      setSalesOrders(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Sales Invoices
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'salesInvoices'), (snap) => {
      setSalesInvoices(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Purchase Invoices
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'purchaseInvoices'), (snap) => {
      setPurchaseInvoices(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Accounts
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'accounts'), (snap) => {
      setAccounts(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Staff List
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'staffList'), (snap) => {
      setStaffList(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Schedules
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'schedules'), (snap) => {
      setSchedules(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Agent Chats
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'agentChats'), (snap) => {
      setAgentChats(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })));
    }));

    // Dev Commands
    unsubscribes.push(onSnapshot(collection(db, 'companies', companyId, 'devCommands'), (snap) => {
      setDevCommands(snap.docs.map(doc => ({ ...doc.data(), _docId: doc.id })).sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || 0));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isLoggedIn, selectedAgency]);

  const companyId = selectedAgency?.id || 'DMK';

  // ---------------------------------------------------------
  // 7. 대시보드 화면
  // ---------------------------------------------------------
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleContent, setScheduleContent] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) return;
    setIsSubmittingSchedule(true);
    try {
      const sId = `SCH-${Date.now()}`;
      const newSchedule = {
        id: sId,
        title: scheduleTitle.trim(),
        date: scheduleDate,
        content: scheduleContent.trim(),
        type: '일반',
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'schedules', sId), newSchedule);
      alert('새 일정이 등록되었습니다.');
      setScheduleTitle('');
      setScheduleContent('');
      setShowAddScheduleModal(false);
    } catch (err) {
      console.error(err);
      alert('일정 추가 에러');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleSlotClick = (idx) => {
    setSelectedSlotIndex(idx);
    setIsGridSettingsOpen(true);
  };

  const assignMenuToSlot = (menuId) => {
    const nextConfig = [...gridConfig];
    nextConfig[selectedSlotIndex] = menuId;
    saveGridConfig(nextConfig);
    setIsGridSettingsOpen(false);
  };

  const handleGridMenuClick = (menuId) => {
    if (menuId === 'none') return;
    if (menuId === 'logout') {
      handleLogout();
      return;
    }
    setCurrentView(menuId);
  };

  const renderDashboard = () => {
    // Generate exactly 10 slots (5 columns * 2 rows), filtering by user permissions
    const favs = Array.isArray(favorites) ? favorites : [];
    const gridSlots = Array.from({ length: 10 }, (_, i) => {
      const favId = favs[i];
      if (favId && hasMenuPermission(favId)) return favId;
      return 'none';
    });

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* 1. 즐겨찾기 메뉴판 (5x2 Flat Launcher) */}
        <div className="grid grid-cols-5 gap-y-5 gap-x-1.5 pt-1.5 pb-4 px-1">
          {gridSlots.map((menuId, idx) => {
            const opt = MENU_OPTIONS.find(o => o.id === menuId) || MENU_OPTIONS[15];
            const IconComponent = opt.icon;
            return (
              <div key={idx} className="relative flex flex-col items-center group">
                <button 
                  onClick={() => {
                    if (menuId === 'none') {
                      setIsMenuOpen(true);
                      showToast("메뉴 서랍의 별표(★)를 눌러 즐겨찾기를 등록해 주세요!");
                    } else {
                      handleGridMenuClick(menuId);
                    }
                  }}
                  className="w-full flex flex-col items-center justify-center py-2 px-1 hover:bg-slate-900/40 rounded-xl transition-all border-none bg-transparent"
                >
                  {opt.id === 'none' ? (
                    <div className="w-12 h-12 flex items-center justify-center text-slate-700 hover:text-slate-500 transition-all">
                      <Plus size={30} />
                    </div>
                  ) : (
                    <IconComponent size={34} className={opt.color} />
                  )}
                  <span className="text-[10px] text-slate-300 font-bold mt-2 text-center leading-tight truncate w-full px-0.5">
                    {opt.id === 'none' ? '즐겨찾기' : opt.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  // ---------------------------------------------------------
  // 8. 기초자료등록 - 직원관리 화면
  // ---------------------------------------------------------
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffId, setNewStaffId] = useState('');
  const [newStaffPw, setNewStaffPw] = useState('');
  const [newStaffTitle, setNewStaffTitle] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('staff');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);

  const handleSubmitStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffId || !newStaffPw) {
      alert('필수 사원 정보를 채워주세요.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const compositeId = `${companyId}_${newStaffId.trim()}`;
      const newStaffDoc = {
        id: compositeId,
        userId: newStaffId.trim(),
        name: newStaffName,
        password: newStaffPw,
        jobTitle: newStaffTitle || '사원',
        role: newStaffRole,
        permissions: ['매입전표', '매출전표', '수주', '재고이동', '일정'],
        companyId
      };

      await setDoc(doc(db, 'companies', companyId, 'staffList', compositeId), newStaffDoc);
      alert('새로운 사원이 성공적으로 등록되었습니다.');
      setNewStaffName('');
      setNewStaffId('');
      setNewStaffPw('');
      setNewStaffTitle('');
      setShowStaffForm(false);
    } catch (err) {
      console.error(err);
      alert('사원 등록 에러');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const renderStaffMgmt = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <div className="flex justify-between items-center">
          <h3 className="text-white text-lg font-black">사원(직원) 관리</h3>
          <button 
            onClick={() => setShowStaffForm(!showStaffForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 shadow-md shadow-blue-500/10"
          >
            {showStaffForm ? '사원 목록' : '+ 신규 사원 추가'}
          </button>
        </div>

        {showStaffForm ? (
          <form onSubmit={handleSubmitStaff} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <div className="text-slate-400 text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5"><UserPlus size={14}/> 신규 직원 사원 등록</div>
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold">사원 이름</span>
                  <input type="text" placeholder="홍길동" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold">직책 / 부서</span>
                  <input type="text" placeholder="예: 대리" value={newStaffTitle} onChange={e => setNewStaffTitle(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold">사원 로그인 ID</span>
                  <input type="text" placeholder="login_id" value={newStaffId} onChange={e => setNewStaffId(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold">비밀번호</span>
                  <input type="password" placeholder="비밀번호" value={newStaffPw} onChange={e => setNewStaffPw(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold">권한 역할 구분</span>
                <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="staff">일반 사원 (정직원)</option>
                  <option value="driver">물류 배송 사원 (기사)</option>
                  <option value="manager">관리자 (매니저)</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={isSubmittingStaff} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs">
              {isSubmittingStaff ? '사원 추가 처리 중...' : '사원 등록 완료'}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            {staffList.map(staff => (
              <div key={staff.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{staff.name}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">{staff.jobTitle}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">ID: {staff.userId}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  staff.role === 'super_admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : staff.role === 'manager' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-850 text-slate-400'
                }`}>{staff.role}</span>
              </div>
            ))}
            {staffList.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">등록된 사원이 없습니다.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------
  // 8-2. 기초자료등록 - 창고관리 화면
  // ---------------------------------------------------------
  const [newWhName, setNewWhName] = useState('');
  const [newWhColor, setNewWhColor] = useState('#3b82f6');
  const [isSubmittingWh, setIsSubmittingWh] = useState(false);

  const colorsPalette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const handleSubmitWarehouse = async (e) => {
    e.preventDefault();
    if (!newWhName.trim()) return;

    setIsSubmittingWh(true);
    try {
      const whId = `WH-${Date.now()}`;
      const newWhDoc = {
        id: whId,
        name: newWhName.trim(),
        color: newWhColor,
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'warehouses', whId), newWhDoc);
      alert('신규 창고가 정상 등록되었습니다.');
      setNewWhName('');
    } catch (err) {
      console.error(err);
      alert('창고 등록 에러');
    } finally {
      setIsSubmittingWh(false);
    }
  };

  const renderWarehouseMgmt = () => {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">창고 등록 및 현황</h3>

        <form onSubmit={handleSubmitWarehouse} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
          <div className="text-slate-400 text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5"><Building2 size={14}/> 신규 물류 창고 등록</div>
          
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-550 font-bold block">창고 명칭</span>
            <input type="text" placeholder="예: 부산 2창고" value={newWhName} onChange={e => setNewWhName(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500" required />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-550 font-bold block">창고 대표 색상 (맵 식별용)</span>
            <div className="flex gap-2">
              {colorsPalette.map(color => (
                <button 
                  key={color}
                  type="button" 
                  onClick={() => setNewWhColor(color)}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${
                    newWhColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button type="submit" disabled={isSubmittingWh} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md">
            {isSubmittingWh ? '저장 중...' : '창고 추가'}
          </button>
        </form>

        <div className="space-y-2">
          {warehouses.map(wh => (
            <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <span className="text-white font-bold text-sm flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ backgroundColor: wh.color || '#3b82f6' }} />
                {wh.name}
              </span>
              <span className="text-slate-505 text-[10px] font-bold uppercase">{wh.id}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 8-3. 기초자료등록 - 거래처등록/관리 화면
  // ---------------------------------------------------------
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerType, setNewPartnerType] = useState('매출처');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerAddress, setNewPartnerAddress] = useState('');
  const [newPartnerReceivables, setNewPartnerReceivables] = useState('0');
  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);
  const [expandedPartnerId, setExpandedPartnerId] = useState(null);

  const filteredPartnersList = useMemo(() => {
    return partners.filter(p => {
      return !partnerSearch || matchesInitialSound(p.name, partnerSearch) || matchesInitialSound(p.phone || '', partnerSearch);
    });
  }, [partners, partnerSearch]);

  const handleSubmitPartner = async (e) => {
    e.preventDefault();
    if (!newPartnerName.trim()) return;

    setIsSubmittingPartner(true);
    try {
      const partId = `PART-${Date.now()}`;
      const newPartDoc = {
        id: partId,
        name: newPartnerName.trim(),
        type: newPartnerType,
        phone: newPartnerPhone.trim(),
        address: newPartnerAddress.trim(),
        receivables: Number(newPartnerReceivables) || 0,
        companyId
      };

      await setDoc(doc(db, 'companies', companyId, 'partners', partId), newPartDoc);
      alert('신규 거래처가 성공적으로 등록되었습니다.');
      setNewPartnerName('');
      setNewPartnerPhone('');
      setNewPartnerAddress('');
      setNewPartnerReceivables('0');
      setShowPartnerForm(false);
    } catch (err) {
      console.error(err);
      alert('거래처 등록 실패');
    } finally {
      setIsSubmittingPartner(false);
    }
  };

  const renderPartnerMgmt = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <div className="flex justify-between items-center">
          <h3 className="text-white text-lg font-black">거래처 등록/관리</h3>
          <button 
            onClick={() => setShowPartnerForm(!showPartnerForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 shadow-md shadow-blue-500/10"
          >
            {showPartnerForm ? '거래처 목록' : '+ 신규 거래처 추가'}
          </button>
        </div>

        {showPartnerForm ? (
          <form onSubmit={handleSubmitPartner} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <div className="text-slate-400 text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5"><Users size={14}/> 신규 비즈니스 거래처 등록</div>
            
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">거래처명</span>
                  <input type="text" placeholder="주식회사 동명" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">거래처 종류</span>
                  <select value={newPartnerType} onChange={e => setNewPartnerType(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="매출처">매출처 (수주처)</option>
                    <option value="매입처">매입처 (공급처)</option>
                    <option value="공통">공통 거래처</option>
                    <option value="혼합">혼합 거래처</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">대표 연락처</span>
                  <input type="tel" placeholder="010-1234-5678" value={newPartnerPhone} onChange={e => setNewPartnerPhone(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">초기 미수금 잔액</span>
                  <input type="number" value={newPartnerReceivables} onChange={e => setNewPartnerReceivables(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-550 font-bold">주소지 (배송지)</span>
                <input type="text" placeholder="상세 배송 주소를 입력하세요" value={newPartnerAddress} onChange={e => setNewPartnerAddress(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <button type="submit" disabled={isSubmittingPartner} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md">
              {isSubmittingPartner ? '거래처 등록 중...' : '거래처 등록 완료'}
            </button>
          </form>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="거래처명, 초성 또는 전화번호 검색" 
                value={partnerSearch}
                onChange={e => setPartnerSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 w-full text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredPartnersList.map(p => {
                const isExpanded = expandedPartnerId === p.id;
                return (
                  <div 
                    key={p.id}
                    onClick={() => setExpandedPartnerId(isExpanded ? null : p.id)}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 space-y-2 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          p.type === '매출처' ? 'bg-emerald-500/10 text-emerald-450' : p.type === '매입처' ? 'bg-red-500/10 text-red-450' : 'bg-slate-850 text-slate-400'
                        }`}>{p.type}</span>
                        <h4 className="text-white font-bold text-sm">{p.name}</h4>
                      </div>
                      <span className="text-white text-xs font-extrabold">{Number(p.receivables || 0).toLocaleString()}원</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-850 space-y-2 text-xs text-slate-400 animate-fadeIn">
                        <div className="flex items-center gap-1.5"><Phone size={12}/> 전화: {p.phone || '연락처 미등록'}</div>
                        <div className="flex items-center gap-1.5"><MapPin size={12}/> 주소: {p.address || '주소 미등록'}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredPartnersList.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">해당 거래처가 존재하지 않습니다.</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------
  // 8-4. 기초자료등록 - 품목등록/관리 화면
  // ---------------------------------------------------------
  const [productSearch, setProductSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSpec, setNewProdSpec] = useState('');
  const [newProdLargeCat, setNewProdLargeCat] = useState('');
  const [newProdSalesPrice, setNewProdSalesPrice] = useState('');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState('');
  const [newProdSafetyStock, setNewProdSafetyStock] = useState('100');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [expandedProdId, setExpandedProdId] = useState(null);

  const filteredProductsList = useMemo(() => {
    return products.filter(p => {
      return !productSearch || matchesInitialSound(p.name, productSearch) || matchesInitialSound(p.barcode || '', productSearch);
    });
  }, [products, productSearch]);

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdLargeCat) {
      alert('품목명과 대분류를 정확히 기입해주세요.');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const prodId = `PROD-${Date.now()}`;
      const newProdDoc = {
        id: prodId,
        name: newProdName.trim(),
        spec: newProdSpec.trim(),
        categoryLarge: newProdLargeCat,
        salesPrice: Number(newProdSalesPrice) || 0,
        purchasePrice: Number(newProdPurchasePrice) || 0,
        optimalStock: Number(newProdSafetyStock) || 0,
        initialStock: 0,
        companyId
      };

      await setDoc(doc(db, 'companies', companyId, 'products', prodId), newProdDoc);
      alert('신규 물류 품목이 성공적으로 등록되었습니다.');
      setNewProdName('');
      setNewProdSpec('');
      setNewProdLargeCat('');
      setNewProdSalesPrice('');
      setNewProdPurchasePrice('');
      setNewProdSafetyStock('100');
      setShowProductForm(false);
    } catch (err) {
      console.error(err);
      alert('품목 추가 실패');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const renderProductMgmt = () => {
    const catsLarge = Array.from(new Set(categories.filter(c => c.level === 1 || !c.parentId).map(c => c.name)));
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <div className="flex justify-between items-center">
          <h3 className="text-white text-lg font-black">품목 등록/관리</h3>
          <button 
            onClick={() => setShowProductForm(!showProductForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 shadow-md shadow-blue-500/10"
          >
            {showProductForm ? '품목 목록' : '+ 신규 품목 추가'}
          </button>
        </div>

        {showProductForm ? (
          <form onSubmit={handleSubmitProduct} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <div className="text-slate-400 text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5"><Package size={14}/> 신규 물류/생산 품목 등록</div>
            
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">품목명</span>
                  <input type="text" placeholder="예: 통밀가루 10kg" value={newProdName} onChange={e => setNewProdName(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">규격 (Spec)</span>
                  <input type="text" placeholder="예: 10kg/포대" value={newProdSpec} onChange={e => setNewProdSpec(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">대분류 카테고리</span>
                  <select value={newProdLargeCat} onChange={e => setNewProdLargeCat(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required>
                    <option value="">-- 분류 선택 --</option>
                    {catsLarge.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">안전재고 (안전재고 기준)</span>
                  <input type="number" value={newProdSafetyStock} onChange={e => setNewProdSafetyStock(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">매입단가 (원)</span>
                  <input type="number" placeholder="공급가" value={newProdPurchasePrice} onChange={e => setNewProdPurchasePrice(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-505 font-bold">표준매출단가 (원)</span>
                  <input type="number" placeholder="소비자가" value={newProdSalesPrice} onChange={e => setNewProdSalesPrice(e.target.value)} className="bg-white border border-slate-300 rounded-lg p-2.5 w-full text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmittingProduct} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-md">
              {isSubmittingProduct ? '품목 추가 중...' : '품목 등록 완료'}
            </button>
          </form>
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="품목명, 초성 또는 바코드 검색" 
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 w-full text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredProductsList.map(p => {
                const isExpanded = expandedProdId === p.id;
                return (
                  <div 
                    key={p.id}
                    onClick={() => setExpandedProdId(isExpanded ? null : p.id)}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 space-y-2 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-slate-505 text-[10px] font-bold uppercase">{p.categoryLarge}</span>
                        <h4 className="text-white font-bold text-sm mt-0.5">{p.name}</h4>
                      </div>
                      <span className="text-white text-xs font-bold">{p.spec}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-850 space-y-2 text-xs text-slate-400 animate-fadeIn">
                        <div className="flex justify-between">
                          <span>매출 표준 단가:</span>
                          <span className="text-white font-bold">{Number(p.salesPrice || 0).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span>매입 공급 단가:</span>
                          <span className="text-white font-bold">{Number(p.purchasePrice || 0).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span>안전(안전재고) 수준:</span>
                          <span className="text-white font-bold">{Number(p.optimalStock || 0).toLocaleString()}개</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredProductsList.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">일치하는 품목이 없습니다.</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------
  // 12. 매입/발주 관리 - 매입전표 등록 화면
  // ---------------------------------------------------------
  const [purchasePartner, setPurchasePartner] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([{ productName: '', qty: 1, price: 0 }]);
  const [purchaseWarehouse, setPurchaseWarehouse] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const activeSuppliers = useMemo(() => {
    return partners.filter(p => p.type === '매입처' || p.type === '공통');
  }, [partners]);

  const handleAddPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { productName: '', qty: 1, price: 0 }]);
  };

  const handleRemovePurchaseItem = (idx) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handlePurchaseItemChange = (idx, field, value) => {
    const updated = [...purchaseItems];
    updated[idx][field] = value;
    
    if (field === 'productName') {
      const prod = products.find(p => p.name === value);
      if (prod) {
        updated[idx].price = prod.purchasePrice || 0;
      }
    }
    setPurchaseItems(updated);
  };

  const purchaseTotalAmount = useMemo(() => {
    return purchaseItems.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
  }, [purchaseItems]);

  const handleSubmitPurchaseInvoice = async (e) => {
    e.preventDefault();
    if (!purchasePartner || !purchaseWarehouse) {
      alert('공급처와 입고창고를 지정해 주세요.');
      return;
    }
    if (purchaseItems.some(i => !i.productName || i.qty <= 0)) {
      alert('정확한 품목명과 수량을 채워주세요.');
      return;
    }

    setIsSubmittingPurchase(true);
    try {
      const invoiceId = `PI-${Date.now()}`;
      
      const newInvoice = {
        id: invoiceId,
        date: new Date().toISOString().split('T')[0],
        partner: purchasePartner,
        warehouse: purchaseWarehouse,
        totalAmount: purchaseTotalAmount,
        receivedAmount: 0,
        items: purchaseItems.map(item => ({
          name: item.productName,
          qty: item.qty,
          price: item.price
        })),
        createdAt: new Date().toISOString(),
        companyId
      };

      await setDoc(doc(db, 'companies', companyId, 'purchaseInvoices', invoiceId), newInvoice);

      const nextInv = { ...inventory };
      if (!nextInv[purchaseWarehouse]) nextInv[purchaseWarehouse] = {};
      purchaseItems.forEach(item => {
        nextInv[purchaseWarehouse][item.productName] = (Number(nextInv[purchaseWarehouse][item.productName]) || 0) + Number(item.qty);
      });
      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });

      setPurchaseSuccess(true);
      setPurchasePartner('');
      setPurchaseWarehouse('');
      setPurchaseItems([{ productName: '', qty: 1, price: 0 }]);
      setTimeout(() => setPurchaseSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('매입전표 저장 중 실패했습니다.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const renderPurchaseInvoiceNew = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">신규 매입 전표</h3>

        {purchaseSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-500 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> 매입전표와 입고재고가 성공적으로 등록되었습니다.
          </div>
        )}

        <form onSubmit={handleSubmitPurchaseInvoice} className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-bold">공급처 (매입처) 선택</label>
              <select 
                value={purchasePartner}
                onChange={e => setPurchasePartner(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              >
                <option value="">-- 거래처 선택 --</option>
                {activeSuppliers.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-bold">입고 창고 선택</label>
              <select 
                value={purchaseWarehouse}
                onChange={e => setPurchaseWarehouse(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              >
                <option value="">-- 입고창고 선택 --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-slate-400 text-xs font-bold block mb-1">매입 품목 목록</label>
            {purchaseItems.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2 bg-slate-955 border border-slate-800 p-3 rounded-lg relative">
                <select
                  value={item.productName}
                  onChange={e => handlePurchaseItemChange(idx, 'productName', e.target.value)}
                  className="bg-slate-900 border border-slate-850 rounded-md p-1.5 w-full text-xs text-white focus:outline-none"
                >
                  <option value="">-- 품목 선택 --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.spec})</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-505">매입단가</span>
                    <input 
                      type="number"
                      value={item.price}
                      onChange={e => handlePurchaseItemChange(idx, 'price', parseInt(e.target.value) || 0)}
                      className="bg-slate-900 border border-slate-850 rounded-md p-1.5 w-full text-xs text-white font-bold"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <span className="text-[10px] text-slate-505">수량</span>
                    <input 
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => handlePurchaseItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                      className="bg-slate-900 border border-slate-800 rounded-md p-1.5 w-full text-center text-xs text-white font-bold"
                    />
                  </div>
                </div>

                {purchaseItems.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemovePurchaseItem(idx)}
                    className="absolute right-2 top-2 px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] rounded hover:bg-red-500/20"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={handleAddPurchaseItem}
              className="text-blue-500 text-xs font-bold hover:underline flex items-center gap-1 pt-1"
            >
              + 매입 품목 추가
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-md">
            <span className="text-slate-550 text-xs font-bold">합계 예상금액</span>
            <span className="text-white text-base font-black">{purchaseTotalAmount.toLocaleString()}원</span>
          </div>

          <button
            type="submit"
            disabled={isSubmittingPurchase}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-md shadow-blue-500/10"
          >
            {isSubmittingPurchase ? '저장 중...' : '매입전표 등록 완료'}
          </button>
        </form>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 12-2. 매입/발주 관리 - 매입전표 관리 내역 화면
  // ---------------------------------------------------------
  const renderPurchaseLedger = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">매입전표 내역</h3>
        
        {purchaseInvoices.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            등록된 매입전표 내역이 존재하지 않습니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {purchaseInvoices.map(inv => {
              const unpaid = (Number(inv.totalAmount) || 0) - (Number(inv.receivedAmount) || 0);
              const isPaid = unpaid <= 0;
              return (
                <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>{inv.id} | {inv.date}</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      isPaid ? 'bg-emerald-500/10 text-emerald-450' : 'bg-red-500/10 text-red-450'
                    }`}>
                      {isPaid ? '지급완료' : '미지급'}
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-sm">{inv.partner}</h4>
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-850">
                    <span>창고: {inv.warehouse}</span>
                    <span className="text-white font-extrabold">{Number(inv.totalAmount).toLocaleString()}원</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------
  // 13. 입출금 관리 - 계좌관리 화면
  // ---------------------------------------------------------
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accountName || !accountNumber || !accountBalance) {
      alert('모든 항목을 입력하세요.');
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const accId = `ACC-${Date.now()}`;
      const newAcc = {
        id: accId,
        name: accountName,
        number: accountNumber,
        balance: Number(accountBalance) || 0,
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'accounts', accId), newAcc);
      setAccountName('');
      setAccountNumber('');
      setAccountBalance('');
      alert('신규 은행계좌가 등록되었습니다.');
    } catch (err) {
      console.error(err);
      alert('계좌 등록 에러');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const renderAccountMgmt = () => {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">실시간 은행 계좌 관리</h3>

        <form onSubmit={handleAddAccount} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="text-slate-400 text-xs font-bold border-b border-slate-800 pb-2 flex items-center gap-1.5"><Landmark size={14} /> 신규 계좌 등록</div>
          
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text" 
              placeholder="은행/계좌명 (예: 국민은행)" 
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none"
            />
            <input 
              type="text" 
              placeholder="계좌번호" 
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <input 
            type="number" 
            placeholder="초기 잔액 입력" 
            value={accountBalance}
            onChange={e => setAccountBalance(e.target.value)}
            className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
          />

          <button 
            type="submit" 
            disabled={isSubmittingAccount}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs"
          >
            {isSubmittingAccount ? '저장 중...' : '계좌 등록'}
          </button>
        </form>

        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-md">
              <div className="space-y-1">
                <span className="text-white font-bold text-sm">{acc.name}</span>
                <p className="text-[10px] text-slate-500">{acc.number}</p>
              </div>
              <span className="text-white text-base font-black">{Number(acc.balance).toLocaleString()}원</span>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">등록된 계좌가 없습니다.</div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 14. 재고조회 & 창고 간 이동 화면
  // ---------------------------------------------------------
  const [stockSearch, setStockSearch] = useState('');
  const [selectedLargeCat, setSelectedLargeCat] = useState('전체');
  const [expandedProduct, setExpandedProduct] = useState(null);

  const [tfFrom, setTfFrom] = useState('');
  const [tfTo, setTfTo] = useState('');
  const [tfProduct, setTfProduct] = useState('');
  const [tfQty, setTfQty] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedLargeCat === '전체' || p.categoryLarge === selectedLargeCat;
      const matchesSearch = !stockSearch || matchesInitialSound(p.name, stockSearch) || matchesInitialSound(p.barcode || '', stockSearch);
      return matchesCat && matchesSearch;
    });
  }, [products, stockSearch, selectedLargeCat]);

  const largeCatList = useMemo(() => {
    const list = new Set(categories.filter(c => c.level === 1 || !c.parentId).map(c => c.name));
    return ['전체', ...Array.from(list)];
  }, [categories]);

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!tfFrom || !tfTo || !tfProduct || !tfQty) {
      alert('모든 입력 항목을 완성해 주세요.');
      return;
    }
    if (tfFrom === tfTo) {
      alert('출고창고와 입고창고는 달라야 합니다.');
      return;
    }
    const qty = parseInt(tfQty) || 0;
    if (qty <= 0) {
      alert('수량은 0보다 커야 합니다.');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const nextInv = { ...inventory };
      if (!nextInv[tfFrom]) nextInv[tfFrom] = {};
      if (!nextInv[tfTo]) nextInv[tfTo] = {};
      
      nextInv[tfFrom] = { ...nextInv[tfFrom], [tfProduct]: (Number(nextInv[tfFrom][tfProduct]) || 0) - qty };
      nextInv[tfTo] = { ...nextInv[tfTo], [tfProduct]: (Number(nextInv[tfTo][tfProduct]) || 0) + qty };
      
      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });

      const prod = products.find(p => p.name === tfProduct);
      const historyId = Date.now() + Math.random();
      const newEntry = {
        id: historyId,
        date: new Date().toISOString().split('T')[0],
        from: tfFrom,
        to: tfTo,
        item: tfProduct,
        spec: prod?.spec || '',
        qty,
        processedAt: new Date().toLocaleTimeString(),
        operator: currentUser?.name || '모바일',
        memo: '수동이동',
        companyId
      };

      await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), newEntry);
      
      setTransferSuccess(true);
      setTfProduct('');
      setTfQty('');
      setTimeout(() => setTransferSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('재고이동 처리 도중 실패했습니다.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const renderInventoryLookup = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="품목명, 초성 또는 바코드 검색" 
            value={stockSearch}
            onChange={e => setStockSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 w-full text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {largeCatList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedLargeCat(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                selectedLargeCat === cat 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                  : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredProducts.map(p => {
            const baseStock = p.initialStock || 0;
            const totalStock = baseStock + Object.values(inventory).reduce((sum, whStocks) => sum + (whStocks[p.name] || 0), 0);
            const isLow = totalStock < (p.optimalStock || 0);
            const isExpanded = expandedProduct === p.name;

            return (
              <div 
                key={p.id}
                onClick={() => setExpandedProduct(isExpanded ? null : p.name)}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
                  isExpanded ? 'border-blue-500/80 shadow-md shadow-blue-500/5' : 'border-slate-800/80'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{p.categoryLarge}</span>
                    <h4 className="text-white font-bold text-sm mt-0.5">{p.name}</h4>
                    <p className="text-slate-400 text-xs mt-0.5">{p.spec || '규격 없음'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      isLow ? 'bg-red-500/10 text-red-505 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-505 border border-emerald-500/20'
                    }`}>
                      {isLow ? '재고부족' : '적정'}
                    </span>
                    <div className="text-white text-base font-extrabold mt-1">
                      {totalStock.toLocaleString()}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-850 space-y-2.5 animate-fadeIn">
                    <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1"><Info size={12}/> 창고별 실시간 재고</span>
                    <div className="grid grid-cols-2 gap-2">
                      {warehouses.map(w => {
                        const whStock = inventory[w.name]?.[p.name] || 0;
                        return (
                          <div key={w.id} className="bg-slate-950 rounded-lg p-2.5 flex justify-between items-center border border-slate-850">
                            <span className="text-slate-355 text-xs flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color || '#3b82f6' }}></span>
                              {w.name}
                            </span>
                            <span className="text-white text-xs font-bold">{whStock.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">일치하는 재고 품목이 없습니다.</div>
          )}
        </div>
      </div>
    );
  };

  const renderInventoryTransfer = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">창고 간 재고 이동</h3>
        <form onSubmit={handleExecuteTransfer} className="space-y-4 max-w-md mx-auto">
          {transferSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-500 text-xs font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle2 size={16} /> 재고가 정상적으로 이동 완료되었습니다.
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs font-bold">출고 창고 (보내는 곳)</label>
              <select 
                value={tfFrom} 
                onChange={e => setTfFrom(e.target.value)}
                className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              >
                <option value="">-- 출고창고 선택 --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs font-bold">입고 창고 (받는 곳)</label>
              <select 
                value={tfTo} 
                onChange={e => setTfTo(e.target.value)}
                className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              >
                <option value="">-- 입고창고 선택 --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs font-bold">이동 품목</label>
              <select 
                value={tfProduct} 
                onChange={e => setTfProduct(e.target.value)}
                className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              >
                <option value="">-- 품목 선택 --</option>
                {products.map(p => {
                  const avail = tfFrom ? (inventory[tfFrom]?.[p.name] || 0) : 0;
                  return (
                    <option key={p.id} value={p.name}>{p.name} (현재고: {avail.toLocaleString()})</option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs font-bold">이동 수량</label>
              <input 
                type="number" 
                min="1" 
                placeholder="이동 수량을 입력하세요." 
                value={tfQty}
                onChange={e => setTfQty(e.target.value)}
                className="bg-slate-955 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingTransfer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-md shadow-blue-500/10"
          >
            {isSubmittingTransfer ? '처리 중...' : '재고 이동 실행'}
          </button>
        </form>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 15. 매출/수주 관리 - 간편수주 등록 화면
  // ---------------------------------------------------------
  const [selectedPartner, setSelectedPartner] = useState('');
  const [orderItems, setOrderItems] = useState([{ productName: '', qty: 1 }]);
  const [orderRemarks, setOrderRemarks] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const activePartners = useMemo(() => {
    return partners.filter(p => p.type === '매출처' || p.type === '공통');
  }, [partners]);

  const handleAddOrderItem = () => {
    setOrderItems([...orderItems, { productName: '', qty: 1 }]);
  };

  const handleRemoveOrderItem = (idx) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleOrderItemChange = (idx, field, value) => {
    const updated = [...orderItems];
    updated[idx][field] = value;
    setOrderItems(updated);
  };

  const getProductPriceForPartner = (prodName, partnerName) => {
    const prod = products.find(p => p.name === prodName);
    if (!prod) return 0;
    
    const sp = specialPrices.find(s => 
      s.partnerName === partnerName && 
      String(s.productId) === String(prod.id)
    );
    if (sp) return sp.specialPrice;
    return prod.salesPriceSingle || prod.salesPrice || 0;
  };

  const orderTotalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      const price = getProductPriceForPartner(item.productName, selectedPartner);
      return sum + (price * (item.qty || 0));
    }, 0);
  }, [orderItems, selectedPartner, products, specialPrices]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedPartner) {
      alert('거래처를 지정해야 합니다.');
      return;
    }
    if (orderItems.some(i => !i.productName || i.qty <= 0)) {
      alert('품목과 정확한 수량을 지정해 주세요.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const itemsText = orderItems.map(i => `${i.productName} ${i.qty}`).join('\n');
      const orderId = `SO-${Date.now()}`;
      
      const structuredItems = orderItems.map(item => {
        const prod = products.find(p => p.name === item.productName);
        return {
          name: item.productName,
          qty: item.qty,
          price: getProductPriceForPartner(item.productName, selectedPartner),
          loaded: false,
          spec: prod?.spec || ''
        };
      });

      const newOrder = {
        id: orderId,
        date: new Date().toISOString().split('T')[0],
        partner: selectedPartner,
        itemsText,
        items: structuredItems,
        totalPrice: orderTotalAmount,
        status: '대기',
        operator: currentUser?.name || '모바일',
        outWarehouse: warehouses[0]?.name || '본사창고',
        inWarehouse: '차량창고',
        createdAt: new Date().toISOString(),
        remarks: orderRemarks,
        companyId
      };
      
      await setDoc(doc(db, 'companies', companyId, 'salesOrders', orderId), newOrder);
      setOrderSuccess(true);
      setOrderItems([{ productName: '', qty: 1 }]);
      setSelectedPartner('');
      setOrderRemarks('');
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('수주 주문 생성 도중 에러가 발생했습니다.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const renderSalesOrderNew = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">신규 간편 수주</h3>

        {orderSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-500 text-xs font-bold flex items-center gap-2 animate-pulse">
            <CheckCircle2 size={16} /> 신규 수주가 성공적으로 등록되었습니다.
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="text-slate-400 text-xs font-bold">고객사 (매출처) 선택</label>
            <select 
              value={selectedPartner}
              onChange={e => setSelectedPartner(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
            >
              <option value="">-- 거래처 선택 --</option>
              {activePartners.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-slate-400 text-xs font-bold block mb-1">수주 품목 목록</label>
            {orderItems.map((item, idx) => {
              const currentPrice = getProductPriceForPartner(item.productName, selectedPartner);
              return (
                <div key={idx} className="flex gap-2 items-center bg-slate-955 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex-1 space-y-1.5">
                    <select
                      value={item.productName}
                      onChange={e => handleOrderItemChange(idx, 'productName', e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-md p-1.5 w-full text-xs text-white focus:outline-none"
                    >
                      <option value="">-- 품목 선택 --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.name}>{p.name} ({p.spec})</option>
                      ))}
                    </select>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                      <span>단가: {currentPrice.toLocaleString()}원</span>
                      <span className="font-bold text-slate-400">계: {(currentPrice * (item.qty || 0)).toLocaleString()}원</span>
                    </div>
                  </div>
                  <input 
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={e => handleOrderItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                    className="w-14 bg-slate-900 border border-slate-800 rounded-md p-1.5 text-center text-xs text-white font-bold"
                  />
                  {orderItems.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveOrderItem(idx)}
                      className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
                    >
                      삭제
                    </button>
                  )}
                </div>
              );
            })}
            <button 
              type="button" 
              onClick={handleAddOrderItem}
              className="text-blue-500 text-xs font-bold hover:underline flex items-center gap-1 pt-1"
            >
              + 수주 품목 추가
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-550 text-xs font-bold">합계 예상금액</span>
              <span className="text-white text-base font-black">{orderTotalAmount.toLocaleString()}원</span>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-1">수주 특이사항</label>
              <textarea 
                value={orderRemarks}
                onChange={e => setOrderRemarks(e.target.value)}
                placeholder="지시사항이나 배송요청 등을 남겨주세요."
                rows="2"
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 w-full text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingOrder}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-md shadow-blue-500/10"
          >
            {isSubmittingOrder ? '저장 중...' : '간편 수주 완료'}
          </button>
        </form>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 16. 매출/수주 관리 - 수주 목록 및 납품 상차 화면
  // ---------------------------------------------------------
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      await setDoc(doc(db, 'companies', companyId, 'salesOrders', orderId), {
        status: nextStatus
      }, { merge: true });
    } catch (err) {
      console.error(err);
      alert('상태 업데이트 실패');
    }
  };

  const handleToggleItemLoad = async (order, item, itemIdx) => {
    const fromWh = order.outWarehouse || '본사창고';
    const toWh = order.inWarehouse || '차량창고';
    
    const currentItems = order.items || [];
    if (currentItems.length === 0) return;

    const updatedItems = [...currentItems];
    const isNowLoaded = !updatedItems[itemIdx].loaded;
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], loaded: isNowLoaded };

    try {
      const nextInv = { ...inventory };
      if (!nextInv[fromWh]) nextInv[fromWh] = {};
      if (!nextInv[toWh]) nextInv[toWh] = {};
      
      const qty = Number(item.qty) || 0;
      if (isNowLoaded) {
        nextInv[fromWh] = { ...nextInv[fromWh], [item.name]: (Number(nextInv[fromWh][item.name]) || 0) - qty };
        nextInv[toWh] = { ...nextInv[toWh], [item.name]: (Number(nextInv[toWh][item.name]) || 0) + qty };
      } else {
        nextInv[fromWh] = { ...nextInv[fromWh], [item.name]: (Number(nextInv[fromWh][item.name]) || 0) + qty };
        nextInv[toWh] = { ...nextInv[toWh], [item.name]: (Number(nextInv[toWh][item.name]) || 0) - qty };
      }

      await setDoc(doc(db, 'companies', companyId, 'settings', 'inventory'), { value: nextInv });

      const prod = products.find(p => p.name === item.name);
      const historyId = Date.now() + Math.random();
      const newEntry = {
        id: historyId,
        date: order.date || new Date().toISOString().split('T')[0],
        from: isNowLoaded ? fromWh : toWh,
        to: isNowLoaded ? toWh : fromWh,
        item: item.name,
        spec: prod?.spec || '',
        qty,
        processedAt: new Date().toLocaleTimeString(),
        operator: currentUser?.name || '모바일',
        memo: isNowLoaded ? '상차(자동이동)' : '상차취소(자동이동)',
        salesOrderId: String(order.id),
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'inventoryTransferHistory', String(historyId)), newEntry);

      await setDoc(doc(db, 'companies', companyId, 'salesOrders', order.id), {
        items: updatedItems
      }, { merge: true });

    } catch (err) {
      console.error(err);
      alert('상차 처리 도중 에러가 발생했습니다.');
    }
  };

  const renderSalesOrderList = () => {
    return (
      <div className="space-y-4 animate-fadeIn pb-12">
        <h3 className="text-white text-lg font-black">수주 목록 및 상차 관리</h3>
        
        {salesOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            접수된 수주가 존재하지 않습니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {salesOrders.map(order => {
              const isExpanded = expandedOrderId === order.id;
              const itemsList = order.items || [];
              const loadedCount = itemsList.filter(i => i.loaded).length;
              const allLoaded = itemsList.length > 0 && loadedCount === itemsList.length;

              return (
                <div 
                  key={order.id}
                  className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${
                    isExpanded ? 'border-blue-500/80 shadow-md shadow-blue-500/5' : 'border-slate-800/80'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="p-4 cursor-pointer hover:bg-slate-800/40 flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{order.id}</span>
                        <span className="text-[10px] text-slate-550">{order.date}</span>
                      </div>
                      <h4 className="text-white font-bold text-sm">{order.partner}</h4>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>합계: {Number(order.totalPrice || 0).toLocaleString()}원</span>
                        <span>|</span>
                        <span className="text-blue-400 font-bold">상차 ({loadedCount}/{itemsList.length})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.status === '완료' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      }`}>{order.status || '대기'}</span>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-850 bg-slate-950 p-4 space-y-4 animate-fadeIn">
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex justify-between items-center text-[10px] text-slate-400">
                        <span>출고지: {order.outWarehouse || '본사창고'}</span>
                        <span>➔</span>
                        <span>입고지: {order.inWarehouse || '차량창고'}</span>
                      </div>

                      <div className="space-y-2">
                        {itemsList.map((item, idx) => {
                          const whStock = inventory[order.outWarehouse || '본사창고']?.[item.name] || 0;
                          return (
                            <div key={idx} className="bg-slate-900 border border-slate-850 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <span className="text-white font-bold text-xs">{item.name}</span>
                                <div className="text-[10px] text-slate-500 mt-0.5">창고재고: {whStock.toLocaleString()}개</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-400 mr-1">{item.qty}개</span>
                                <button
                                  type="button" 
                                  onClick={() => handleToggleItemLoad(order, item, idx)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                    item.loaded 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                                      : 'bg-blue-600 text-white border-blue-600'
                                  }`}
                                >
                                  {item.loaded ? '상차완료' : '상차하기'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-850">
                        {order.status !== '승인' && (
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, '승인')}
                            className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-350 font-bold py-2 rounded-xl text-xs border border-slate-700"
                          >
                            주문 승인
                          </button>
                        )}
                        <button 
                          disabled={!allLoaded}
                          onClick={() => handleUpdateOrderStatus(order.id, '완료')}
                          className={`flex-1 font-bold py-2 rounded-xl text-xs transition-all ${
                            allLoaded ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-650 cursor-not-allowed'
                          }`}
                        >
                          전체 납품 완료
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------
  // 17. 매출/수주 관리 - 매출전표내역 및 수금 현황 화면
  // ---------------------------------------------------------
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState('account');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  const handleRegisterDeposit = async (e, invoice) => {
    e.preventDefault();
    const amt = Number(depositAmount) || 0;
    if (amt <= 0) {
      alert('정확한 입금액을 입력하세요.');
      return;
    }

    const unpaid = (Number(invoice.totalAmount) || 0) - (Number(invoice.receivedAmount) || 0) - (Number(invoice.discount) || 0);
    if (amt > unpaid) {
      alert(`입금액은 남은 미수금(${unpaid.toLocaleString()}원)보다 작거나 같아야 합니다.`);
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      const nextReceived = (Number(invoice.receivedAmount) || 0) + amt;
      const nextPayments = {
        cash: Number(invoice.payments?.cash) || 0,
        card: Number(invoice.payments?.card) || 0,
        account: Number(invoice.payments?.account) || 0,
        bill: Number(invoice.payments?.bill) || 0,
      };

      if (depositType === 'cash') nextPayments.cash += amt;
      else if (depositType === 'card') nextPayments.card += amt;
      else if (depositType === 'account') nextPayments.account += amt;

      await setDoc(doc(db, 'companies', companyId, 'salesInvoices', invoice.id), {
        receivedAmount: nextReceived,
        payments: nextPayments
      }, { merge: true });

      const pDoc = partners.find(p => p.name === invoice.partner);
      if (pDoc) {
        const nextReceivables = Math.max(0, (Number(pDoc.receivables) || 0) - amt);
        await setDoc(doc(db, 'companies', companyId, 'partners', pDoc.id), {
          receivables: nextReceivables
        }, { merge: true });
      }

      alert('수금 처리가 성공적으로 등록되었습니다.');
      setDepositAmount('');
      setExpandedInvoiceId(null);
    } catch (err) {
      console.error(err);
      alert('수금 처리 도중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // ---------------------------------------------------------
  // 18. 스마트지원 - AI 비서 명령창 화면
  // ---------------------------------------------------------
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentChats]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    setChatInput('');
    const messageId = `msg_u_${Date.now()}`;

    try {
      await setDoc(doc(db, 'companies', companyId, 'agentChats', messageId), {
        id: messageId,
        timestamp: new Date().toISOString(),
        sender: "User",
        senderName: "사용자",
        text,
        status: "pending"
      });
    } catch (err) {
      console.error(err);
      alert('메시지 전송 실패');
    }
  };

  const renderAgentChat = () => {
    const sortedChats = [...agentChats].sort((a, b) => a.timestamp?.localeCompare(b.timestamp) || 0);

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-fadeIn">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 space-y-2 flex-shrink-0">
          <h4 className="text-white text-xs font-bold flex items-center gap-1.5"><Sparkles size={14} className="text-blue-500"/> AI 모바일 명령 단축키</h4>
          <p className="text-[10px] text-slate-400">데이터 조회를 위해 단축키를 입력창에 적어 전송해 보세요.</p>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-bold text-blue-400">
            <div className="bg-slate-955 p-2 rounded-lg border border-slate-850">!매출</div>
            <div className="bg-slate-955 p-2 rounded-lg border border-slate-850">!재고</div>
            <div className="bg-slate-955 p-2 rounded-lg border border-slate-850">!미수금</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
          {sortedChats.map((chat, idx) => {
            const isMe = chat.sender === "User";
            const time = chat.timestamp 
              ? new Date(chat.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div key={idx} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-blue-400 text-[10px]">AI</div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-slate-500 font-bold mb-0.5">{chat.senderName || 'AI 비서'}</span>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-xs max-w-[240px] md:max-w-md shadow-sm leading-relaxed ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    {chat.text.split('\n').map((line, i) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                  </div>
                  <span className="text-[8px] text-slate-655 mt-1 font-bold">{time}</span>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChat} className="mt-4 flex gap-2 flex-shrink-0">
          <input 
            type="text" 
            placeholder="비서에게 내릴 명령을 적어주세요..." 
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Send size={16}/>
          </button>
        </form>
      </div>
    );
  };

  // ---------------------------------------------------------
  // 19. 로그인 화면 렌더링
  // ---------------------------------------------------------
  if (!isLoggedIn) {
    const baseFontSize = `${loginFontSize}px`;
    const labelFontSize = `${Math.max(10, loginFontSize - 2)}px`;
    const titleFontSize = `${loginFontSize + 4}px`;
    const subTitleFontSize = `${loginFontSize + 2}px`;

    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center items-center p-4 text-white">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Font Size Adjuster Buttons */}
          <div className="flex justify-between items-center px-6 pt-4 bg-slate-900 border-b border-slate-850 pb-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Font Options</span>
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={() => setLoginFontSize(Math.max(10, loginFontSize - 1))}
                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center font-bold text-xs transition-all"
                title="글자 작게"
              >
                -
              </button>
              <span className="text-[11px] text-slate-300 font-extrabold w-5 text-center">{loginFontSize}px</span>
              <button 
                type="button"
                onClick={() => setLoginFontSize(Math.min(24, loginFontSize + 1))}
                className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center font-bold text-xs transition-all"
                title="글자 크게"
              >
                +
              </button>
            </div>
          </div>

          <div className="px-6 py-5 flex flex-col items-center text-center relative overflow-hidden" style={{
            background: step === 1 
              ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' 
              : 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            transition: 'all 0.5s ease'
          }}>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3">
              {step === 1 ? <Building2 size={24} color="#ffffff" strokeWidth={1.5} /> : <Users size={24} color="#ffffff" strokeWidth={1.5} />}
            </div>
            <h1 className="text-white font-black tracking-tight leading-none" style={{ fontSize: titleFontSize }}>Link X Mobile</h1>
            <h2 className="text-white/80 font-bold mt-1.5 tracking-wider uppercase" style={{ fontSize: labelFontSize }}>
              {step === 1 ? '회원사(사업장) 인증' : '구성원 로그인'}
            </h2>
            <p className="text-white/60 mt-2 font-medium" style={{ fontSize: labelFontSize }}>
              {step === 1 
                ? '비즈니스 파트너 인증 단계' 
                : selectedAgency?.name || '시스템'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-500 font-semibold flex items-start gap-2 animate-fadeIn" style={{ fontSize: labelFontSize }}>
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleAgencySubmit} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-650 text-white px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase">STEP 01</span>
                  <h3 className="text-white font-bold" style={{ fontSize: subTitleFontSize }}>회원사 식별</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>회원사 식별 아이디</label>
                  <div className="relative">
                    <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <input 
                      type="text" 
                      value={agencyInput}
                      onChange={e => { setAgencyInput(e.target.value); if (authError) setAuthError(''); }}
                      placeholder="회원사 아이디 또는 이메일"
                      className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                      style={{ fontSize: baseFontSize }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>회원사 비밀번호</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <input 
                      type={showAgencyPassword ? "text" : "password"}
                      value={agencyPassword}
                      onChange={e => { setAgencyPassword(e.target.value); if (authError) setAuthError(''); }}
                      placeholder="회원사 비밀번호를 입력하세요"
                      className="bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                      style={{ fontSize: baseFontSize }}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowAgencyPassword(!showAgencyPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 z-10"
                    >
                      {showAgencyPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-1">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setAutoSave(!autoSave)}>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                      autoSave ? 'bg-indigo-600 border-indigo-650' : 'bg-slate-800 border-slate-700'
                    }`}>
                      {autoSave && <Check size={10} color="#fff" strokeWidth={4} />}
                    </div>
                    <span className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>아이디 저장</span>
                  </div>

                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => {
                    if (!autoSave) setAutoSave(true);
                    setAutoLogin(!autoLogin);
                  }}>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                      autoLogin ? 'bg-indigo-600 border-indigo-655' : 'bg-slate-800 border-slate-700'
                    }`}>
                      {autoLogin && <Check size={10} color="#fff" strokeWidth={4} />}
                    </div>
                    <span className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>자동 로그인</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10"
                  style={{ fontSize: baseFontSize }}
                >
                  {isLoading ? '인증 중...' : '다음 단계'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUserSubmit} className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center bg-slate-955 border border-slate-800 p-2.5 rounded-xl text-[10px]">
                  <span className="text-slate-400 font-bold" style={{ fontSize: labelFontSize }}>인증 회사</span>
                  <span className="text-sky-450 font-extrabold" style={{ fontSize: labelFontSize }}>{selectedAgency?.name}</span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-sky-600 text-white px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase">STEP 02</span>
                  <h3 className="text-white font-bold" style={{ fontSize: subTitleFontSize }}>사용자 로그인</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>사용자 ID</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <input 
                      type="text" 
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (authError) setAuthError(''); }}
                      placeholder="아이디 또는 이메일 입력"
                      className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
                      style={{ fontSize: baseFontSize }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>비밀번호</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); if (authError) setAuthError(''); }}
                      placeholder="사용자 비밀번호를 입력하세요"
                      className="bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
                      style={{ fontSize: baseFontSize }}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 z-10"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-1">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => setAutoSave(!autoSave)}>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                      autoSave ? 'bg-sky-600 border-sky-650' : 'bg-slate-800 border-slate-700'
                    }`}>
                      {autoSave && <Check size={10} color="#fff" strokeWidth={4} />}
                    </div>
                    <span className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>아이디 저장</span>
                  </div>

                  <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => {
                    if (!autoSave) setAutoSave(true);
                    setAutoLogin(!autoLogin);
                  }}>
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                      autoLogin ? 'bg-sky-600 border-sky-655' : 'bg-slate-800 border-slate-700'
                    }`}>
                      {autoLogin && <Check size={10} color="#fff" strokeWidth={4} />}
                    </div>
                    <span className="text-slate-300 font-bold" style={{ fontSize: labelFontSize }}>자동 로그인</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all"
                    style={{ fontSize: baseFontSize }}
                  >
                    이전 단계
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/10"
                    style={{ fontSize: baseFontSize }}
                  >
                    {isLoading ? '로그인 중...' : '시스템 접속'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }



  // ---------------------------------------------------------
  // 20. 메인 ERP 레이아웃 렌더링
  // ---------------------------------------------------------
  const handleSubmitDevCmd = async (e) => {
    e.preventDefault();
    const text = devCommandInput.trim();
    if (!text) return;
    setIsSubmittingDevCmd(true);
    try {
      const cmdId = `cmd_${Date.now()}`;
      const newCmd = {
        id: cmdId,
        command: text,
        status: 'pending',
        createdAt: new Date().toLocaleString(),
        log: '',
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'devCommands', cmdId), newCmd);
      setDevCommandInput('');
      alert('개발 명령이 전송되었습니다. 에이전트가 즉시 코드 수정을 수행합니다.');
    } catch (err) {
      console.error(err);
      alert('명령 전송 에러');
    } finally {
      setIsSubmittingDevCmd(false);
    }
  };

  const renderDevConsole = () => {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-white text-sm font-black flex items-center gap-1.5">
              <Cpu size={16} className="text-violet-500 animate-pulse" />
              개발모드 콘솔 (에이전트 실시간 지시)
            </h3>
            <span className="text-[10px] text-violet-400 font-extrabold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/25">
              관리자 전용
            </span>
          </div>

          <form onSubmit={handleSubmitDevCmd} className="space-y-3">
            <label className="text-slate-400 text-xs font-bold block">코드 수정 및 기능 구현 명령</label>
            <textarea 
              value={devCommandInput}
              onChange={e => setDevCommandInput(e.target.value)}
              placeholder="예: 일정 리스트 각 일정 우측에 빨간색 '삭제' 버튼을 달아주고, 누르면 파이어베이스에서 일정이 삭제되게 해줘."
              rows="3"
              className="bg-white border border-slate-300 rounded-xl p-3 w-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 shadow-inner"
              required
            />
            <button 
              type="submit" 
              disabled={isSubmittingDevCmd}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-lg shadow-violet-500/15"
            >
              <Send size={14}/> 명령 전송 (즉시 코드 반영 실행)
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <span className="text-slate-500 text-xs font-bold block uppercase tracking-wider">이전 개발 명령 히스토리</span>
          <div className="space-y-2.5 font-sans">
            {devCommands.map(cmd => (
              <div key={cmd.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-505">
                  <span>{cmd.createdAt}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    cmd.status === 'success' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                    cmd.status === 'failed' ? 'bg-red-500/10 text-red-450 border-red-500/20' :
                    cmd.status === 'running' ? 'bg-blue-500/10 text-blue-450 border-blue-500/20 animate-pulse' :
                    'bg-slate-850 text-slate-400'
                  }`}>
                    {cmd.status === 'success' ? '성공' :
                     cmd.status === 'failed' ? '실패' :
                     cmd.status === 'running' ? '반영중' : '대기중'}
                  </span>
                </div>
                <p className="text-white text-xs font-bold">{cmd.command}</p>
                {cmd.log && (
                  <pre className="bg-slate-955 p-2.5 rounded-lg border border-slate-850 text-[9px] text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono">
                    {cmd.log}
                  </pre>
                )}
              </div>
            ))}
            {devCommands.length === 0 && (
              <div className="text-center py-12 text-slate-600 text-xs bg-slate-900 border border-slate-800 rounded-2xl">전송된 개발 명령이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSendAgentCmd = async (e) => {
    e.preventDefault();
    const text = agentChatInput.trim();
    if (!text) return;
    setChatInput('');
    setAgentChatInput('');
    try {
      const cmdId = `cmd_${Date.now()}`;
      const newCmd = {
        id: cmdId,
        command: text,
        status: 'pending',
        createdAt: new Date().toLocaleString(),
        log: '',
        progress: '',
        companyId
      };
      await setDoc(doc(db, 'companies', companyId, 'devCommands', cmdId), newCmd);
    } catch (err) {
      console.error(err);
      alert('명령 전송 실패');
    }
  };

  const renderAgentControlDrawer = () => {
    if (!isAgentChatOpen) return null;

    const chatFeed = [...devCommands].sort((a, b) => a.createdAt?.localeCompare(b.createdAt) || 0);

    return (
      <div className="fixed inset-0 z-[9999] flex justify-end items-end p-0 md:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
        <div className="absolute inset-0" onClick={() => setIsAgentChatOpen(false)} />
        
        <div className="relative w-full md:max-w-md h-[85vh] bg-[#0c101b] border-t md:border border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden animate-slideUp font-sans">
          
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#070a13]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-650/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Cpu size={16} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-white text-xs font-black leading-tight">Antigravity 통제 콘솔</h3>
                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  실시간 코드 에이전트 연동 중
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsAgentChatOpen(false)}
              className="p-1 text-slate-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none bg-[#090c15]">
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-violet-400 text-[10px]">AI</div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-slate-500 font-bold mb-0.5">Antigravity</span>
                <div className="rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed max-w-[85%]">
                  안녕하세요 대표님! 링커엑스 모바일 에이전트 통제 콘솔입니다. 수정하고 싶으신 UI 디자인, 버그 수정, 새 기능 추가 지시사항을 말씀해 주세요.
                </div>
              </div>
            </div>

            {chatFeed.map((cmd, idx) => (
              <div key={cmd.id || idx} className="space-y-4">
                <div className="flex gap-2.5 justify-end">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-500 font-bold mb-0.5">대표님</span>
                    <div className="rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs bg-violet-600 text-white shadow-sm leading-relaxed max-w-[85%]">
                      {cmd.command}
                    </div>
                    <span className="text-[8px] text-slate-650 mt-1 font-bold">{cmd.createdAt?.split(' ')[1] || ''}</span>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-start animate-fadeIn">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-violet-400 text-[10px]">AI</div>
                  <div className="flex flex-col items-start w-[85%]">
                    <span className="text-[9px] text-slate-500 font-bold mb-0.5">Antigravity</span>
                    
                    <div className={`rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs leading-relaxed w-full border ${
                      cmd.status === 'success' ? 'bg-slate-900/60 border-slate-800 text-slate-200' :
                      cmd.status === 'failed' ? 'bg-red-950/20 border-red-900/30 text-red-200' :
                      'bg-slate-900 border-slate-800 text-slate-200'
                    }`}>
                      {cmd.status === 'pending' && (
                        <div className="flex items-center gap-2 text-slate-400 font-medium">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span>지시사항을 확인하고 깨어나는 중...</span>
                        </div>
                      )}
                      {cmd.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-violet-400 font-bold">
                            <span className="w-2 h-2 bg-violet-500 rounded-full animate-ping" />
                            <span>작업 분석 및 실시간 코딩 중...</span>
                          </div>
                          {cmd.progress && (
                            <pre className="bg-slate-955 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono max-h-36">
                              {cmd.progress}
                            </pre>
                          )}
                        </div>
                      )}
                      {cmd.status === 'success' && (
                        <div className="space-y-2">
                          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            <span>코드 수정 및 배포 완료!</span>
                          </div>
                          {cmd.log && (
                            <details className="cursor-pointer group">
                              <summary className="text-[10px] text-slate-400 hover:text-slate-200 font-bold list-none flex items-center gap-1">
                                <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                                빌드 및 배포 로그 보기
                              </summary>
                              <pre className="mt-2 bg-slate-955 p-2.5 rounded-xl border border-slate-800 text-[9px] text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono max-h-36">
                                {cmd.log}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                      {cmd.status === 'failed' && (
                        <div className="space-y-2">
                          <div className="text-red-400 font-bold flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            <span>코드 반영 중 오류 발생</span>
                          </div>
                          {cmd.log && (
                            <pre className="bg-slate-955 p-2.5 rounded-xl border border-red-955/40 text-[9px] text-red-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-36">
                              {cmd.log}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendAgentCmd} className="p-4 border-t border-slate-800 bg-[#070a13]/60 flex gap-2 flex-shrink-0">
            <input 
              type="text" 
              placeholder="수정할 내용이나 지시사항 입력..." 
              value={agentChatInput}
              onChange={e => setAgentChatInput(e.target.value)}
              className="flex-1 bg-white border border-slate-350 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 shadow-inner"
              required
            />
            <button 
              type="submit" 
              className="bg-violet-600 hover:bg-violet-750 text-white font-bold p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/10"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  const navigateToView = (viewName) => {
    setCurrentView(viewName);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col font-sans select-none relative">
      {runtimeError && (
        <div className="bg-red-950/95 border-b border-red-500 text-red-200 p-4 text-[10px] font-mono whitespace-pre-wrap relative z-[100000] shadow-2xl">
          <div className="font-extrabold text-xs mb-1 flex justify-between items-center">
            <span>⚠️ Runtime Error Captured</span>
            <button 
              onClick={() => {
                localStorage.removeItem('last_runtime_error');
                setRuntimeError(null);
                window.location.reload();
              }}
              className="bg-red-800 hover:bg-red-700 px-2 py-0.5 text-white font-bold rounded"
            >
              Clear & Retry
            </button>
          </div>
          {runtimeError}
        </div>
      )}
      
      {/* Slide-out Menu Drawer Backdrop */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-all animate-fadeIn"
          style={{ zIndex: 9998 }}
        />
      )}

      {/* Slide-out Menu Drawer Container */}
      <div 
        className={`fixed top-0 bottom-0 left-0 w-4/5 max-w-[280px] bg-[#0c101b] border-r border-slate-800/50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: 9999 }}
      >
        <div className="overflow-y-auto flex-1">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800/50 flex justify-between items-center bg-[#070a13]/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs">X</div>
              <span className="font-extrabold text-xs tracking-tight">LinkerX 전체메뉴</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Drawer Menu List */}
          <div className="p-4 space-y-3.5">
            <button 
              onClick={() => navigateToView('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
              }`}
            >
              <Sliders size={16} />
              <span>대시보드 홈</span>
            </button>

            {menuStructure.map((cat) => {
              // Filter sub-items by user permissions
              const permittedItems = cat.items.filter(item => hasMenuPermission(item.id));
              if (permittedItems.length === 0) return null;
              const IconComponent = 
                cat.icon === 'Sliders' ? Sliders :
                cat.icon === 'ArrowDownLeft' ? ArrowDownLeft :
                cat.icon === 'ArrowUpRight' ? ArrowUpRight :
                cat.icon === 'DollarSign' ? DollarSign :
                cat.icon === 'Package' ? Package :
                cat.icon === 'BarChart2' ? BarChart2 :
                cat.icon === 'Sparkles' ? Sparkles :
                cat.icon === 'Database' ? Database :
                cat.icon === 'Settings' ? Settings : Sliders;

              const isExpanded = activeMenuDropdown === cat.id;

              return (
                <div key={cat.id} className="space-y-1">
                  <button 
                    onClick={() => setActiveMenuDropdown(isExpanded ? null : cat.id)}
                    className="w-full flex justify-between items-center px-3 py-2 text-slate-350 hover:text-white font-bold text-xs"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconComponent size={16} className="text-blue-400" />
                      {cat.title}
                    </span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="pl-6 space-y-1.5 mt-1 border-l border-slate-800/30 ml-5 py-1">
                      {permittedItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center w-full py-1">
                          <button 
                            onClick={() => handleMenuClick(item)}
                            className={`flex-1 text-left text-[11px] font-bold block transition-all ${
                              item.implemented 
                                ? currentView === item.id 
                                  ? 'text-blue-450 font-extrabold'
                                  : 'text-slate-400 hover:text-white' 
                                : 'text-slate-505 hover:text-slate-400 cursor-pointer'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {item.title}
                              {!item.implemented && (
                                <span className="text-[7.5px] px-1 py-0.2 bg-slate-850/60 text-slate-500 border border-slate-800/30 rounded scale-90 origin-left">PC 전용</span>
                              )}
                            </span>
                          </button>
                          {item.implemented && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                              className="p-1 text-slate-500 hover:text-yellow-450 transition-all"
                            >
                              <Star size={12} className={(Array.isArray(favorites) && favorites.includes(item.id)) ? "text-yellow-500 fill-yellow-500" : "text-slate-700"} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Drawer Bottom Info */}
        <div className="p-4 border-t border-slate-800/50 bg-[#070a13]/40 flex flex-col gap-1.5 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold">
            <User size={12} />
            <span>{currentUser?.name || '구성원'} ({currentUser?.jobTitle || '사원'})</span>
          </div>
          <p>회원사 ID: {companyId}</p>
        </div>
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-900/60 px-5 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-all focus:outline-none"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/10">X</div>
            <span className="font-extrabold text-sm tracking-tight">LinkerX Mobile</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
            {companyId}
          </span>
          {(currentUser?.role === 'super_admin' || currentUser?.userId === 'sadmin' || currentUser?.userId === 'madmin' || currentUser?.role === 'admin' || currentUser?.role === 'master') && (
            <button 
              onClick={() => {
                if (currentView === 'dev_console') {
                  setCurrentView('dashboard');
                } else {
                  setCurrentView('dev_console');
                }
              }}
              className={`p-1.5 rounded border transition-all ${
                currentView === 'dev_console' 
                  ? 'bg-violet-650 text-white border-violet-500 shadow-md shadow-violet-500/10' 
                  : 'bg-slate-900 text-slate-400 hover:text-violet-400 border-slate-800'
              }`}
              title="개발모드 콘솔"
            >
              <Cpu size={12} className={currentView === 'dev_console' ? 'animate-pulse' : ''} />
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="p-1.5 bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded border border-slate-800 transition-all"
            title="로그아웃"
          >
            <LogOut size={12} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-5 pt-0 pb-4 overflow-y-auto pb-[calc(76px+env(safe-area-inset-bottom))]">
        {currentView === 'dashboard' && renderDashboard()}
        
        {/* Master Data Module */}
        {currentView === 'staff_mgmt' && renderStaffMgmt()}
        {currentView === 'warehouse_mgmt' && renderWarehouseMgmt()}
        {currentView === 'partner_mgmt' && renderPartnerMgmt()}
        {currentView === 'product_mgmt' && renderProductMgmt()}

        {/* Purchase Module */}
        {currentView === 'purchase_invoice' && renderPurchaseInvoiceNew()}
        {currentView === 'purchase_ledger' && renderPurchaseLedger()}
        
        {/* Sales/Order Module */}
        {currentView === 'sales_invoice_list' && renderSalesInvoiceList()}
        {currentView === 'sales_order_new' && renderSalesOrderNew()}
        {currentView === 'sales_order_list' && renderSalesOrderList()}
        
        {/* Cash Module */}
        {currentView === 'account_mgmt' && renderAccountMgmt()}

        {/* Inventory Module */}
        {currentView === 'inventory_lookup' && renderInventoryLookup()}
        {currentView === 'inventory_transfer' && renderInventoryTransfer()}

        {/* Smart Support / Chatbot */}
        {currentView === 'agent_chat' && renderAgentChat()}
      
        {/* Developer Console Module */}
        {currentView === 'dev_console' && renderDevConsole()}
      </main>

      {/* Bottom Shortcuts Quick Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-45 bg-[#0b0f19]/90 backdrop-blur-lg border-t border-slate-900/80 px-2 py-2 flex justify-around items-center pb-[calc(8px+env(safe-area-inset-bottom))] shadow-xl">
        <button 
          onClick={() => setCurrentView('dashboard')} 
          className={`flex flex-col items-center gap-1 transition-all ${
            currentView === 'dashboard' ? 'text-blue-500 font-extrabold' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <Sliders size={22} />
          <span className="text-[9px] font-bold">홈</span>
        </button>
        <button 
          onClick={() => setCurrentView('sales_order_new')} 
          className={`flex flex-col items-center gap-1 transition-all ${
            currentView === 'sales_order_new' ? 'text-blue-500 font-extrabold' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <ShoppingCart size={22} />
          <span className="text-[9px] font-bold">수주</span>
        </button>
        <button 
          onClick={() => setCurrentView('inventory_lookup')} 
          className={`flex flex-col items-center gap-1 transition-all ${
            currentView === 'inventory_lookup' || currentView === 'inventory_transfer' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <Package size={22} />
          <span className="text-[9px] font-bold">재고</span>
        </button>
        <button 
          onClick={() => setCurrentView('agent_chat')} 
          className={`flex flex-col items-center gap-1 transition-all ${
            currentView === 'agent_chat' ? 'text-blue-500 font-extrabold' : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <MessageSquare size={22} />
          <span className="text-[9px] font-bold">비서</span>
        </button>
        <button 
          onClick={() => setIsMenuOpen(true)} 
          className="flex flex-col items-center gap-1 transition-all text-slate-500 hover:text-slate-400"
        >
          <Menu size={22} />
          <span className="text-[9px] font-bold">메뉴</span>
        </button>
      
            {/* Floating Action Button for Agent Control */}
      {(currentUser?.role === 'super_admin' || currentUser?.userId === 'sadmin' || currentUser?.userId === 'madmin' || currentUser?.role === 'admin' || currentUser?.role === 'master') && isLoggedIn && (
        <button
          onClick={() => setIsAgentChatOpen(true)}
          className="fixed bottom-[85px] right-5 z-40 w-12 h-12 rounded-full bg-violet-650 hover:bg-violet-700 text-white flex items-center justify-center border border-violet-500/35 shadow-lg shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
          title="에이전트 제어 콘솔"
        >
          <Sparkles size={20} className="animate-pulse" />
        </button>
      )}

      {/* Agent Control Drawer */}
      {renderAgentControlDrawer()}

      {/* Toast Alert Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] w-[90%] max-w-[320px] bg-slate-900/95 border border-slate-800/80 text-white rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-slideDown">
          <Info size={18} className="text-blue-400 flex-shrink-0" />
          <div className="text-[11px] font-bold leading-relaxed whitespace-pre-line text-slate-200">
            {toast.message}
          </div>
        </div>
      )}

      {/* Dev Command Success Modal Popup */}
      {activeSuccessPopup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 font-sans">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-450 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-white text-base font-extrabold">코드 수정 반영 완료!</h4>
              <p className="text-slate-455 text-[10px] font-semibold">대표님의 지시사항이 서버에 즉시 배포되었습니다.</p>
            </div>
            <div className="bg-slate-955 p-3.5 rounded-xl border border-slate-850/80 text-left">
              <span className="text-[10px] text-violet-400 font-extrabold block mb-1">실행된 명령</span>
              <p className="text-white text-xs font-bold leading-relaxed">{activeSuccessPopup.command}</p>
            </div>
            <button
              onClick={() => setActiveSuccessPopup(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10"
            >
              확인
            </button>
          </div>
        </div>
      )}

      </nav>
    </div>
  );
}