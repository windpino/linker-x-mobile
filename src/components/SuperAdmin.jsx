import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDocs, query, where, writeBatch, getDoc, orderBy } from 'firebase/firestore';
import { 
  Building2, Calendar, ShieldCheck, X, Search, Plus, Trash2, Edit2, Lock, 
  MessageSquare, Bell, LayoutDashboard, Users, Clock, AlertCircle, ExternalLink,
  ChevronRight, Save, Phone, Send, ChevronDown, ChevronLeft, Filter, BookOpen, Settings,
  Globe
} from 'lucide-react';
import ScheduleTypeManagement from './ScheduleTypeManagement';
import ChatAssistant from './ChatAssistant';

const SuperAdmin = ({ onClose, onEnterCompany }) => {
  const [activeTab, setActiveTab] = useState('schedules');
  const [mobileScheduleView, setMobileScheduleView] = useState('calendar');
  const [companies, setCompanies] = useState([]);
  const [csHistory, setCsHistory] = useState([]);
  const [notices, setNotices] = useState([]);
  const [masterSchedules, setMasterSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [agencyCategories, setAgencyCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(-1);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  
  // Modal states
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isCsModalOpen, setIsCsModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isCategoryManageModalOpen, setIsCategoryManageModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTypeManagementOpen, setIsTypeManagementOpen] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const typeFilterRef = useRef(null);
  const [masterScheduleTypes, setMasterScheduleTypes] = useState([]);
  const [masterTodos, setMasterTodos] = useState([]);
  const [todoText, setTodoText] = useState('');
  const [todoPriority, setTodoPriority] = useState('보통');
  
  const [agencyForm, setAgencyForm] = useState({ id: '', name: '', ceo: '', email: '', password: '', expiryDate: '', status: 'active', managerContact: '', category: '' });
  
  // Linker X Homepage CMS & Inquiries states
  const [agencyInquiries, setAgencyInquiries] = useState([]);
  const [homepageContent, setHomepageContent] = useState({});
  const [cmsHeroBadge, setCmsHeroBadge] = useState("");
  const [cmsHeroTitle, setCmsHeroTitle] = useState("");
  const [cmsHeroSubtitle, setCmsHeroSubtitle] = useState("");
  const [cmsHeroCtaText, setCmsHeroCtaText] = useState("");
  const [cmsHeroSecondaryCtaText, setCmsHeroSecondaryCtaText] = useState("");

  const [originalAgencyId, setOriginalAgencyId] = useState(null);
  const [deletingAgency, setDeletingAgency] = useState(null); // { id, name }
  const [deletingNotice, setDeletingNotice] = useState(null); // { id, title }
  const [deletingCs, setDeletingCs] = useState(null); // { id, companyName }
  const [deletingSchedule, setDeletingSchedule] = useState(null); // { id, title }
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [csForm, setCsForm] = useState({ companyId: '', companyName: '', type: '일반상담', content: '', status: '완료', contact: '' });
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', type: 'info', isActive: true, targetCategory: '전체' });
  const [scheduleForm, setScheduleForm] = useState({ id: '', title: '', date: new Date().toISOString().split('T')[0], companyId: '', type: '업무', content: '', startTime: '', endTime: '', priority: '보통', category: '' });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [hiddenMasterTypes, setHiddenMasterTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('hiddenMasterTypes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Splitter state for Resizable Calendar & List
  const containerRef = React.useRef(null);
  const [leftWidth, setLeftWidth] = useState(48);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp left width between 25% and 75%
      newPercent = Math.max(25, Math.min(75, newPercent));
      setLeftWidth(newPercent);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCs = onSnapshot(query(collection(db, 'cs_history'), orderBy('createdAt', 'desc')), (snapshot) => {
      setCsHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubNotices = onSnapshot(query(collection(db, 'system_notices'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSchedules = onSnapshot(query(collection(db, 'master_schedules'), orderBy('date', 'asc')), (snapshot) => {
      setMasterSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCategories = onSnapshot(doc(db, 'settings', 'agencyCategories'), (docSnap) => {
      if (docSnap.exists()) {
        setAgencyCategories(docSnap.data().categories || []);
      } else {
        setAgencyCategories([]);
      }
    });
    const unsubMasterTypes = onSnapshot(collection(db, 'master_schedule_types'), async (snapshot) => {
      let typesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (typesList.length === 0) {
        const defaultTypes = [
          { name: '업무', color: '#3b82f6', userId: 'system' },
          { name: '미팅', color: '#f59e0b', userId: 'system' },
          { name: '점검', color: '#10b981', userId: 'system' },
          { name: '라이선스', color: '#ef4444', userId: 'system' },
          { name: '기타', color: '#8b5cf6', userId: 'system' }
        ];
        for (const dt of defaultTypes) {
          await setDoc(doc(db, 'master_schedule_types', dt.name), dt);
        }
        typesList = defaultTypes;
      }
      setMasterScheduleTypes(typesList);
    });

    const unsubInquiries = onSnapshot(query(collection(db, 'agency_inquiries'), orderBy('appliedAt', 'desc')), (snapshot) => {
      setAgencyInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubHomepageContent = onSnapshot(doc(db, 'settings', 'homepage_content'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHomepageContent(data);
        const hero = data.hero || {};
        setCmsHeroBadge(hero.badge || "");
        setCmsHeroTitle(hero.title || "");
        setCmsHeroSubtitle(hero.subtitle || "");
        setCmsHeroCtaText(hero.ctaText || "");
        setCmsHeroSecondaryCtaText(hero.secondaryCtaText || "");
      }
    });

    const unsubTodos = onSnapshot(query(collection(db, 'master_todos'), orderBy('createdAt', 'desc')), (snapshot) => {
      setMasterTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubCompanies();
      unsubCs();
      unsubNotices();
      unsubSchedules();
      unsubCategories();
      unsubMasterTypes();
      unsubInquiries();
      unsubHomepageContent();
      unsubTodos();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (typeFilterRef.current && !typeFilterRef.current.contains(e.target)) {
        setShowTypeFilter(false);
      }
    };
    if (showTypeFilter) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTypeFilter]);

  const handleGitPush = async () => {
    if (!window.confirm('현재 로컬에서 변경된 모든 코드와 설정을 깃허브(GitHub)로 전송하시겠습니까?')) return;
    setIsPushing(true);
    try {
      const response = await fetch('/api/git-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert('성공적으로 깃허브 전송(Push)이 완료되었습니다!\n\n' + data.output);
      } else {
        alert('깃허브 전송 실패:\n\n' + (data.error || data.message || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('서버 통신 오류: ' + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  const handleUpdateStatus = async (companyId, newStatus) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), { status: newStatus });
    } catch (err) { alert('상태 변경 실패: ' + err.message); }
  };

  const handleUpdateExpiryDate = async (companyId, newDate) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), { expiryDate: newDate });
    } catch (err) { alert('만료일 변경 실패: ' + err.message); }
  };

  const handleDeleteCompany = async () => {
    if (!deletingAgency) return;
    const { id: companyId, name: companyName } = deletingAgency;
    
    setIsDeleting(true);
    console.log('--- START DELETION PROCESS ---', companyId);
    
    try {
      // 1. Delete the company record FIRST
      await deleteDoc(doc(db, 'companies', companyId));
      
      // 2. Cleanup associated data
      const collectionsToClean = [
        'staffList', 'schedules', 'products', 'categories', 'partners', 
        'accounts', 'purchaseInvoices', 'purchaseOrders', 'salesInvoices', 
        'salesOrders', 'warehouses', 'expenses', 'inventoryAdjustments', 
        'inventoryTransferHistory', 'specialPrices', 'schedule_types', 
        'settings', 'cs_history'
      ];

      for (const collName of collectionsToClean) {
        try {
          let q;
          if (collName === 'cs_history') {
            q = query(collection(db, 'cs_history'), where('companyId', '==', companyId));
          } else {
            // Target the sub-collection directly
            q = collection(db, 'companies', companyId, collName);
          }
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const docs = snapshot.docs;
            for (let i = 0; i < docs.length; i += 500) {
              const batch = writeBatch(db);
              const chunk = docs.slice(i, i + 500);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
        } catch (e) { console.warn(`Cleanup failed: ${collName}`, e); }
      }

      // 3. Cleanup settings
      try {
        const settingsSnap = await getDocs(collection(db, `settings_${companyId}`));
        if (!settingsSnap.empty) {
          const batch = writeBatch(db);
          settingsSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {}

      // 4. Local storage
      Object.keys(localStorage).forEach(key => {
        if (key.includes(companyId)) localStorage.removeItem(key);
      });
      
      console.log('--- DELETION COMPLETE ---');
      setDeletingAgency(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Agency Management ---
  const handleSaveAgency = async () => {
    if (!agencyForm.id || !agencyForm.name || !agencyForm.password) return alert('필수 항목을 입력하세요.');
    try {
      // Check for duplicate ID if it's a NEW agency
      if (!originalAgencyId) {
        const checkSnap = await getDoc(doc(db, 'companies', agencyForm.id));
        if (checkSnap.exists()) {
          return alert('이미 존재하는 회사 ID입니다. 다른 ID를 사용해 주세요.');
        }
      }

      // If ID changed during edit, move the document
      if (originalAgencyId && originalAgencyId !== agencyForm.id) {
        if (!confirm(`아이디를 [${originalAgencyId}]에서 [${agencyForm.id}](으)로 변경하시겠습니까?\n기존 아이디의 데이터가 새 아이디로 연결됩니다.`)) return;
        
        // 1. Create new doc
        await setDoc(doc(db, 'companies', agencyForm.id), {
          ...agencyForm,
          updatedAt: new Date().toISOString(),
          createdAt: agencyForm.createdAt || new Date().toISOString()
        });
        
        // 2. Delete old doc
        await deleteDoc(doc(db, 'companies', originalAgencyId));
        console.log(`Agency ID migrated from ${originalAgencyId} to ${agencyForm.id}`);
      } else {
        await setDoc(doc(db, 'companies', agencyForm.id), {
          ...agencyForm,
          updatedAt: new Date().toISOString(),
          createdAt: agencyForm.createdAt || new Date().toISOString()
        }, { merge: true });
      }
      
      // Create admin staff if new
      const adminRef = doc(db, 'companies', agencyForm.id, 'staffList', `${agencyForm.id}_admin`);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          id: Date.now(),
          userId: 'admin',
          password: '123456',
          name: agencyForm.name, // 회사명
          jobTitle: '관리자', // 관리자 직급
          role: 'admin',
          companyId: agencyForm.id,
          permissions: { ALL: true },
          createdAt: new Date().toISOString()
        });
      }
      
      alert(originalAgencyId ? '회원사 정보가 수정되었습니다.' : '신규 회원사가 등록되었습니다.');
      setIsAgencyModalOpen(false);
      setAgencyForm({ id: '', name: '', ceo: '', email: '', password: '', expiryDate: '', status: 'active', managerContact: '', category: '' });
      setOriginalAgencyId(null);
    } catch (err) { 
      console.error('Save error:', err);
      alert('저장 실패: ' + err.message); 
    }
  };

  // --- CS Management ---
  const handleSaveCs = async () => {
    if (!csForm.companyId || !csForm.content) return alert('상담 업체와 내용을 입력하세요.');
    try {
      const logId = csForm.id || Date.now().toString();
      await setDoc(doc(db, 'cs_history', logId), {
        ...csForm,
        createdAt: csForm.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsCsModalOpen(false);
      setCsForm({ companyId: '', companyName: '', type: '일반상담', content: '', status: '완료', contact: '' });
    } catch (err) { alert('상담 기록 실패: ' + err.message); }
  };

  const handleDeleteCs = async () => {
    if (!deletingCs) return;
    try {
      await deleteDoc(doc(db, 'cs_history', deletingCs.id));
      setDeletingCs(null);
    } catch (err) {
      alert('상담 기록 삭제 실패: ' + err.message);
    }
  };

  // --- Notice Management ---
  const handleSaveNotice = async () => {
    if (!noticeForm.title || !noticeForm.content) return alert('제목과 내용을 입력하세요.');
    try {
      const noticeId = Date.now().toString();
      await setDoc(doc(db, 'system_notices', noticeId), {
        ...noticeForm,
        createdAt: new Date().toISOString()
      });
      setIsNoticeModalOpen(false);
      setNoticeForm({ title: '', content: '', type: 'info', isActive: true });
    } catch (err) { alert('공지 배포 실패: ' + err.message); }
  };

  const handleDeleteNotice = async () => {
    if (!deletingNotice) return;
    try {
      await deleteDoc(doc(db, 'system_notices', deletingNotice.id));
      setDeletingNotice(null);
    } catch (err) {
      console.error('Notice delete error:', err);
      alert('공지 삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleToggleNoticeStatus = async (noticeId, isActive) => {
    try {
      await updateDoc(doc(db, 'system_notices', noticeId), { isActive });
    } catch (err) {
      alert('공지 상태 변경 실패: ' + err.message);
    }
  };

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const diff = new Date(date) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  // --- Master Schedule Management ---
  const handleSaveSchedule = async () => {
    if (!scheduleForm.title || !scheduleForm.date) return alert('제목과 날짜를 입력하세요.');
    try {
      const scheduleId = scheduleForm.id || Date.now().toString();
      await setDoc(doc(db, 'master_schedules', scheduleId), {
        ...scheduleForm,
        id: scheduleId,
        createdAt: scheduleForm.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsScheduleModalOpen(false);
      setScheduleForm({ id: '', title: '', date: new Date().toISOString().split('T')[0], category: '', type: '업무', content: '', startTime: '', endTime: '', priority: '보통' });
    } catch (err) { alert('일정 저장 실패: ' + err.message); }
  };

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule) return;
    try {
      await deleteDoc(doc(db, 'master_schedules', deletingSchedule.id));
      setDeletingSchedule(null);
    } catch (err) { alert('일정 삭제 실패: ' + err.message); }
  };

  // --- Master Todo Management ---
  const handleSaveTodo = async (e) => {
    if (e) e.preventDefault();
    if (!todoText.trim()) return alert('할일 내용을 입력하세요.');
    try {
      const todoId = Date.now().toString();
      await setDoc(doc(db, 'master_todos', todoId), {
        id: todoId,
        title: todoText.trim(),
        completed: false,
        priority: todoPriority,
        createdAt: new Date().toISOString()
      });
      setTodoText('');
      setTodoPriority('보통');
    } catch (err) {
      alert('할일 추가 실패: ' + err.message);
    }
  };

  const handleToggleTodoComplete = async (todo) => {
    try {
      await updateDoc(doc(db, 'master_todos', todo.id), {
        completed: !todo.completed,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      alert('할일 상태 변경 실패: ' + err.message);
    }
  };

  const handleDeleteTodo = async (todoId) => {
    if (!window.confirm('이 할일을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'master_todos', todoId));
    } catch (err) {
      alert('할일 삭제 실패: ' + err.message);
    }
  };

  // Get days in a month helper
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month helper (0: Sunday, 6: Saturday)
  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const updated = [...new Set([...agencyCategories, newCategoryName.trim()])];
      await setDoc(doc(db, 'settings', 'agencyCategories'), { categories: updated }, { merge: true });
      setNewCategoryName('');
    } catch (e) { alert('카테고리 추가 실패: ' + e.message); }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`'${cat}' 카테고리를 삭제하시겠습니까?`)) return;
    try {
      const updated = agencyCategories.filter(c => c !== cat);
      await setDoc(doc(db, 'settings', 'agencyCategories'), { categories: updated }, { merge: true });
    } catch (e) { alert('카테고리 삭제 실패: ' + e.message); }
  };

  const handleEditCategory = async (index) => {
    if (!editingCategoryValue.trim()) return;
    try {
      const updated = [...agencyCategories];
      const oldCat = updated[index];
      const newCat = editingCategoryValue.trim();
      updated[index] = newCat;
      
      await setDoc(doc(db, 'settings', 'agencyCategories'), { categories: updated }, { merge: true });
      
      // Update companies with oldCat to newCat
      const companiesToUpdate = companies.filter(c => c.category === oldCat);
      const batch = writeBatch(db);
      companiesToUpdate.forEach(c => {
        batch.update(doc(db, 'companies', c.id), { category: newCat });
      });
      if (companiesToUpdate.length > 0) {
        await batch.commit();
      }

      setEditingCategoryIndex(-1);
      setEditingCategoryValue('');
    } catch (e) { alert('카테고리 수정 실패: ' + e.message); }
  };

  const handleSaveCMS = async () => {
    try {
      await setDoc(doc(db, 'settings', 'homepage_content'), {
        hero: {
          badge: cmsHeroBadge,
          title: cmsHeroTitle,
          subtitle: cmsHeroSubtitle,
          ctaText: cmsHeroCtaText,
          secondaryCtaText: cmsHeroSecondaryCtaText
        }
      }, { merge: true });
      alert('홈페이지 CMS 설정이 저장되었습니다.');
    } catch (err) {
      console.error('CMS Save error:', err);
      alert('CMS 저장 실패: ' + err.message);
    }
  };

  const handleApproveInquiry = async (inquiry) => {
    if (!window.confirm(`[${inquiry.companyName}] 대리점 가입 신청을 승인하시겠습니까?\n승인 시 즉시 회원사로 등록되며 관리자 계정이 생성됩니다.`)) return;
    try {
      const email = inquiry.email || '';
      let baseId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!baseId) {
        baseId = inquiry.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      if (!baseId) {
        baseId = 'agency';
      }
      let companyId = baseId;
      let exists = true;
      let counter = 0;
      while (exists) {
        const checkSnap = await getDoc(doc(db, 'companies', companyId));
        if (checkSnap.exists()) {
          counter++;
          companyId = `${baseId}${counter}`;
        } else {
          exists = false;
        }
      }

      const companyData = {
        id: companyId,
        name: inquiry.companyName,
        ceo: inquiry.ceoName,
        email: inquiry.email,
        password: inquiry.password,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        managerContact: inquiry.contact,
        category: inquiry.category || '유통업',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'companies', companyId), companyData);

      const adminRef = doc(db, 'companies', companyId, 'staffList', `${companyId}_admin`);
      await setDoc(adminRef, {
        id: Date.now(),
        userId: 'admin',
        password: inquiry.password,
        name: inquiry.ceoName,
        jobTitle: '관리자',
        role: 'admin',
        companyId: companyId,
        permissions: { ALL: true },
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'agency_inquiries', inquiry.id), {
        ...inquiry,
        status: 'approved',
        approvedCompanyId: companyId,
        processedAt: new Date().toISOString()
      });

      alert(`[${inquiry.companyName}] 대리점 가입 승인이 완료되었습니다!\n발급된 회사 ID: ${companyId}\n관리자 ID: admin`);
    } catch (err) {
      console.error('Approve error:', err);
      alert('승인 처리 실패: ' + err.message);
    }
  };

  const handleRejectInquiry = async (inquiry) => {
    if (!window.confirm(`[${inquiry.companyName}] 대리점 가입 신청을 반려하시겠습니까?`)) return;
    try {
      await setDoc(doc(db, 'agency_inquiries', inquiry.id), {
        ...inquiry,
        status: 'rejected',
        processedAt: new Date().toISOString()
      });
      alert('신청서가 반려 처리되었습니다.');
    } catch (err) {
      console.error('Reject error:', err);
      alert('반려 처리 실패: ' + err.message);
    }
  };

  const getSuperAdminContext = () => {
    return {
      currentView: 'super_admin',
      activeTab,
      currentUser: { name: '마스터 관리자', role: 'super_admin' },
      stats: {
        companyCount: companies?.length || 0,
        csCount: csHistory?.length || 0,
        noticeCount: notices?.length || 0,
        masterScheduleCount: masterSchedules?.length || 0,
        masterTodoCount: masterTodos?.length || 0
      }
    };
  };

  return (
    <div className="sa-wrapper" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0f172a', zIndex: 9999, display: 'flex', flexDirection: 'column',
      padding: '16px'
    }}>
      {/* Top Navigation Header */}
      <div className="sa-header-nav" style={{
        backgroundColor: '#1e293b', borderRadius: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', color: 'white', marginBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        {/* Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#3b82f6', padding: '8px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
            <ShieldCheck size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Master Hub</h2>
            <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.5, lineHeight: 1 }}>Link X Operations</p>
          </div>
        </div>

        {/* Horizontal Navigation Menu Tabs */}
        <nav className="sa-header-tabs" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { id: 'schedules', icon: Calendar, label: '일정 및 대리점' },
            { id: 'agencies', icon: Building2, label: '회원사 관리' },
            { id: 'cs', icon: MessageSquare, label: 'CS/상담 관리' },
            { id: 'notices', icon: Bell, label: '시스템 공지' },
            { id: 'linkerx_home', icon: Globe, label: '링커엑스 홈페이지' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => {
                if (item.id === 'linkerx_home') {
                  window.open('./?home=true', '_blank');
                }
                setActiveTab(item.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                borderRadius: '10px', border: 'none', cursor: 'pointer',
                backgroundColor: activeTab === item.id ? '#3b82f6' : 'transparent',
                color: activeTab === item.id ? 'white' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s'
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Top Summary Stats */}
        <div className="sa-header-stats" style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ color: '#94a3b8' }}>회원사</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{companies.length}</span>
          </div>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ color: '#94a3b8' }}>대기CS</span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{csHistory.filter(h => h.status === '대기').length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="sa-main" style={{
        flex: 1, backgroundColor: '#f8fafc', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 4px 30px rgba(0,0,0,0.02)'
      }}>
        <div className="sa-top-bar" style={{
          padding: '20px 40px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, whiteSpace: 'nowrap' }}>
              {activeTab === 'agencies' && '회원사 통합 관리'}
              {activeTab === 'schedules' && '일정 및 대리점 관리 (마스터 달력)'}
              {activeTab === 'cs' && '고객 지원 및 상담 내역'}
              {activeTab === 'notices' && '시스템 공지 사항'}
              {activeTab === 'linkerx_home' && '링커엑스 홈페이지'}
            </h1>
            
            {activeTab === 'agencies' && (
              <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc', fontSize: '0.9rem', outline: 'none', minWidth: '120px'
                  }}
                >
                  <option value="">전체 카테고리</option>
                  {agencyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="회원사명 또는 ID로 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 16px 10px 44px', borderRadius: '12px',
                      border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                      fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {activeTab === 'agencies' && (
              <>
                <button 
                  onClick={handleGitPush}
                  disabled={isPushing}
                  style={{ 
                    padding: '10px 18px', 
                    backgroundColor: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '10px', 
                    fontWeight: 700, 
                    cursor: isPushing ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    transition: 'all 0.2s',
                    opacity: isPushing ? 0.7 : 1
                  }}
                  onMouseEnter={e => { if(!isPushing) e.currentTarget.style.backgroundColor = '#059669'; }}
                  onMouseLeave={e => { if(!isPushing) e.currentTarget.style.backgroundColor = '#10b981'; }}
                >
                  <Send size={16} />
                  {isPushing ? '전송 중...' : '깃허브로 전송'}
                </button>
                <button 
                  onClick={() => setIsCategoryManageModalOpen(true)}
                  style={{ padding: '10px 16px', backgroundColor: 'white', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  카테고리 관리
                </button>
                <button 
                  onClick={() => { 
                  setAgencyForm({ id: '', name: '', ceo: '', email: '', password: '', expiryDate: '', status: 'active', managerContact: '', category: '' }); 
                  setOriginalAgencyId(null);
                  setIsAgencyModalOpen(true); 
                }}
                style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> 신규 회원사 등록
                </button>
              </>
            )}
            {activeTab === 'cs' && (
              <button 
                onClick={() => { setCsForm({ companyId: '', companyName: '', type: '일반상담', content: '', status: '완료', contact: '' }); setIsCsModalOpen(true); }}
                style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> 상담 일지 작성
              </button>
            )}
            {activeTab === 'notices' && (
              <button 
                onClick={() => { setNoticeForm({ title: '', content: '', type: 'info', isActive: true }); setIsNoticeModalOpen(true); }}
                style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Bell size={18} /> 신규 공지 배포
              </button>
            )}
            <button onClick={onClose} style={{ padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
              <X size={20} color="#64748b" />
            </button>
          </div>
        </div>

        <div className="sa-view-content" style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          {activeTab === 'agencies' && (
            <>
              <div className="sa-desktop-table" style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '20px' }}>회원사 정보</th>
                      <th style={{ padding: '20px' }}>만료일</th>
                      <th style={{ padding: '20px' }}>운영 상태</th>
                      <th style={{ padding: '20px', textAlign: 'center' }}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.filter(c => 
                      (categoryFilter === '' || c.category === categoryFilter) &&
                      ((c.name || '').toLowerCase().includes(search.toLowerCase()) || 
                       (c.id || '').toLowerCase().includes(search.toLowerCase()) ||
                       (c.ceo || '').toLowerCase().includes(search.toLowerCase()))
                    ).map(c => {
                      const expiring = isExpiringSoon(c.expiryDate);
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: expiring ? '#fff1f2' : 'transparent' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {c.name}
                              {c.category && <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{c.category}</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.id} | {c.ceo} | {c.email}</div>
                            {c.managerContact && <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} /> {c.managerContact}</div>}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Calendar size={14} color={expiring ? '#e11d48' : '#64748b'} />
                              <input 
                                type="date" 
                                value={c.expiryDate || ''} 
                                onChange={(e) => handleUpdateExpiryDate(c.id, e.target.value)}
                                style={{ 
                                  padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                  fontSize: '0.85rem', color: expiring ? '#e11d48' : '#1e293b',
                                  fontWeight: expiring ? 700 : 400,
                                  backgroundColor: expiring ? '#fff1f2' : 'transparent',
                                  outline: 'none'
                                }}
                              />
                              {expiring && <button 
                                onClick={() => { setCsForm({ ...csForm, companyId: c.id, companyName: c.name, type: '연장상담', content: '라이선스 만료 예정 안내' }); setIsCsModalOpen(true); }}
                                style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >CS 등록</button>}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <select 
                              value={c.status || 'active'} 
                              onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                              style={{ 
                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                backgroundColor: c.status === 'active' ? '#dcfce7' : c.status === 'suspended' ? '#fee2e2' : '#f1f5f9',
                                color: c.status === 'active' ? '#166534' : c.status === 'suspended' ? '#991b1b' : '#475569',
                                border: 'none', cursor: 'pointer', outline: 'none'
                              }}
                            >
                              <option value="active">정상 운영</option>
                              <option value="suspended">운영 정지</option>
                              <option value="expired">기간 만료</option>
                            </select>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              <button 
                                onClick={() => onEnterCompany(c.id)}
                                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                                title="사용자 뷰 접속"
                              >
                                <ExternalLink size={14} color="#3b82f6" /> 사용자 뷰
                              </button>
                              <button 
                                onClick={() => { 
                                  setAgencyForm(c); 
                                  setOriginalAgencyId(c.id);
                                  setIsAgencyModalOpen(true); 
                                }}
                                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer' }}
                                title="정보 수정"
                              >
                                <Edit2 size={14} color="#64748b" />
                              </button>
                              <button 
                                onClick={() => setDeletingAgency({ id: c.id, name: c.name })}
                                style={{ padding: '6px 12px', border: '1px solid #fee2e2', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer' }}
                                title="회원사 삭제"
                              >
                                <Trash2 size={14} color="#ef4444" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="sa-mobile-cards" style={{ display: 'none' }}>
                {companies.filter(c => 
                  (categoryFilter === '' || c.category === categoryFilter) &&
                  ((c.name || '').toLowerCase().includes(search.toLowerCase()) || 
                   (c.id || '').toLowerCase().includes(search.toLowerCase()) ||
                   (c.ceo || '').toLowerCase().includes(search.toLowerCase()))
                ).map(c => {
                  const expiring = isExpiringSoon(c.expiryDate);
                  return (
                    <div key={c.id} className="sa-mobile-card" style={{ backgroundColor: expiring ? '#fff1f2' : 'white' }}>
                      <div className="card-header">
                        <div className="card-title">
                          <ShieldCheck size={16} color="#3b82f6" />
                          <span>{c.name}</span>
                          {c.category && <span className="category-badge">{c.category}</span>}
                        </div>
                        <select 
                          value={c.status || 'active'} 
                          onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                          className="status-select"
                          style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: c.status === 'active' ? '#dcfce7' : c.status === 'suspended' ? '#fee2e2' : '#f1f5f9',
                            color: c.status === 'active' ? '#166534' : c.status === 'suspended' ? '#991b1b' : '#475569',
                            border: 'none', cursor: 'pointer', outline: 'none'
                          }}
                        >
                          <option value="active">정상 운영</option>
                          <option value="suspended">운영 정지</option>
                          <option value="expired">기간 만료</option>
                        </select>
                      </div>
                      <div className="card-body">
                        <div><strong>ID:</strong> {c.id}</div>
                        <div><strong>대표자:</strong> {c.ceo}</div>
                        <div><strong>이메일:</strong> {c.email}</div>
                        {c.managerContact && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}><Phone size={12} /> {c.managerContact}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <strong>만료일:</strong>
                          <Calendar size={14} color={expiring ? '#e11d48' : '#64748b'} />
                          <input 
                            type="date" 
                            value={c.expiryDate || ''} 
                            onChange={(e) => handleUpdateExpiryDate(c.id, e.target.value)}
                            style={{ 
                              padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                              fontSize: '0.85rem', color: expiring ? '#e11d48' : '#1e293b',
                              fontWeight: expiring ? 700 : 400,
                              backgroundColor: expiring ? '#fff1f2' : 'transparent',
                              outline: 'none'
                            }}
                          />
                          {expiring && <button 
                            onClick={() => { setCsForm({ ...csForm, companyId: c.id, companyName: c.name, type: '연장상담', content: '라이선스 만료 예정 안내' }); setIsCsModalOpen(true); }}
                            style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >CS 등록</button>}
                        </div>
                      </div>
                      <div className="card-actions">
                        <button 
                          onClick={() => onEnterCompany(c.id)}
                          className="action-btn"
                          style={{ color: '#3b82f6' }}
                          title="사용자 뷰 접속"
                        >
                          <ExternalLink size={14} /> 사용자 뷰
                        </button>
                        <button 
                          onClick={() => { 
                            setAgencyForm(c); 
                            setOriginalAgencyId(c.id);
                            setIsAgencyModalOpen(true); 
                          }}
                          className="action-btn"
                          style={{ color: '#64748b' }}
                          title="정보 수정"
                        >
                          <Edit2 size={14} /> 수정
                        </button>
                        <button 
                          onClick={() => setDeletingAgency({ id: c.id, name: c.name })}
                          className="action-btn"
                          style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                          title="회원사 삭제"
                        >
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'schedules' && (
            <>
              {/* Mobile View Toggle Bar */}
              <div className="sa-mobile-schedule-toggle" style={{ display: 'none', margin: '0 0 16px 0', gap: '8px' }}>
                <button 
                  onClick={() => setMobileScheduleView('calendar')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '0.85rem',
                    backgroundColor: mobileScheduleView === 'calendar' ? '#3b82f6' : '#eff6ff',
                    color: mobileScheduleView === 'calendar' ? 'white' : '#3b82f6',
                    cursor: 'pointer', boxShadow: mobileScheduleView === 'calendar' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  📅 달력 보기
                </button>
                <button 
                  onClick={() => setMobileScheduleView('list')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '0.85rem',
                    backgroundColor: mobileScheduleView === 'list' ? '#3b82f6' : '#eff6ff',
                    color: mobileScheduleView === 'list' ? 'white' : '#3b82f6',
                    cursor: 'pointer', boxShadow: mobileScheduleView === 'list' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 일정 목록 ({masterSchedules.length})
                </button>
              </div>

              <div ref={containerRef} className="sa-schedules-container" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 220px)', overflow: 'hidden', userSelect: isResizing ? 'none' : 'auto' }}>
                {/* Left Column: Pure React Grid Calendar */}
                <div className={`sa-schedules-left ${mobileScheduleView === 'calendar' ? 'mobile-visible' : 'mobile-hidden'}`} style={{ width: `${leftWidth}%`, backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                      {calendarDate.getFullYear()}년 {calendarDate.getMonth() + 1}월 {calendarDate.getDate()}일
                    </h3>
                    
                    {/* 일정 유형 필터 드롭다운 영역 */}
                    <div ref={typeFilterRef} className="schedule-type-filters" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTypeFilter(!showTypeFilter);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: '#3b82f6',
                          cursor: 'pointer',
                          backgroundColor: '#eff6ff',
                          border: '1.5px solid #3b82f6',
                          padding: '5px 12px',
                          borderRadius: '16px',
                          transition: 'all 0.15s',
                          height: '28px',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                        title="일정 유형 필터 및 편집 관리"
                      >
                        <Filter size={12} />
                        일정 유형 {hiddenMasterTypes.length > 0 ? `(${masterScheduleTypes.length - hiddenMasterTypes.length})` : ''}
                        <ChevronDown size={12} style={{ transform: showTypeFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      </button>
                      
                      {showTypeFilter && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            padding: '12px',
                            minWidth: '200px',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '4px' }}>
                            보여줄 일정 유형 선택
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                            {masterScheduleTypes.map(typeObj => {
                              const name = typeObj.name;
                              const color = typeObj.color || '#64748b';
                              const isChecked = !hiddenMasterTypes.includes(name);

                              return (
                                <label 
                                  key={name}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: isChecked ? '#1e293b' : '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: isChecked ? `${color}10` : 'transparent',
                                    transition: 'background-color 0.15s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isChecked ? `${color}20` : '#f1f5f9';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isChecked ? `${color}10` : 'transparent';
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setHiddenMasterTypes(prev => {
                                        const next = prev.includes(name)
                                          ? prev.filter(t => t !== name)
                                          : [...prev, name];
                                        localStorage.setItem('hiddenMasterTypes', JSON.stringify(next));
                                        return next;
                                      });
                                    }}
                                    style={{
                                      margin: 0,
                                      cursor: 'pointer',
                                      accentColor: color
                                    }}
                                  />
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}></span>
                                  <span>{name}</span>
                                </label>
                              );
                            })}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTypeFilter(false);
                              setIsTypeManagementOpen(true);
                            }}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              padding: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: '#3b82f6',
                              backgroundColor: '#eff6ff',
                              border: '1.5px solid #3b82f6',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          >
                            <Settings size={12} />
                            유형 편집 / 관리
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                      style={{ padding: '6px 12px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >이전달</button>
                    <button 
                      onClick={() => setCalendarDate(new Date())}
                      style={{ padding: '6px 12px', border: '1px solid #3b82f6', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >오늘</button>
                    <button 
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                      style={{ padding: '6px 12px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >다음달</button>
                    <button 
                      onClick={() => { setScheduleForm({ id: '', title: '', date: new Date().toISOString().split('T')[0], companyId: '', type: '업무', content: '', startTime: '', endTime: '', priority: '보통', category: '' }); setIsScheduleModalOpen(true); }}
                      style={{ 
                        padding: '6px 14px', 
                        backgroundColor: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontSize: '0.8rem', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                        transition: 'all 0.2s',
                        marginLeft: '8px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    >
                      <Plus size={14} /> 신규 일정 추가
                    </button>
                  </div>
                </div>
                
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div key={d} style={{ fontSize: '0.8rem', fontWeight: 800, color: i === 0 ? '#ef4444' : i === 6 ? '#2563eb' : '#64748b', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>{d}</div>
                  ))}
                </div>
                
                {/* Calendar Days grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                  {(() => {
                    const year = calendarDate.getFullYear();
                    const month = calendarDate.getMonth();
                    const daysInMonth = getDaysInMonth(calendarDate);
                    const firstDay = getFirstDayOfMonth(calendarDate);
                    const days = [];
                    
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<div key={`empty-${i}`} style={{ minHeight: '80px', borderBottom: '1px solid #f8fafc', borderRight: '1px solid #f8fafc', backgroundColor: '#fafbfe' }}></div>);
                    }
                    
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const daySchedules = masterSchedules.filter(s => s.date === dateStr && !hiddenMasterTypes.includes(s.type));
                      
                      const todayObj = new Date();
                      const isToday = todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === day;
                      
                      days.push(
                        <div 
                          key={day} 
                          onClick={() => {
                            setCalendarDate(new Date(year, month, day));
                            setScheduleForm({ id: '', title: '', date: dateStr, category: '', type: '업무', content: '', startTime: '', endTime: '', priority: '보통' });
                            setIsScheduleModalOpen(true);
                          }}
                          className="calendar-day-cell"
                          style={{ 
                            minHeight: '80px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', 
                            padding: '6px', cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
                            backgroundColor: 'white', display: 'flex', flexDirection: 'column'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <span style={{ 
                            fontSize: isToday ? '1.1rem' : '0.8rem', 
                            fontWeight: 800, 
                            color: isToday ? '#3b82f6' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: isToday ? '24px' : 'auto',
                            height: isToday ? '24px' : 'auto',
                            borderRadius: isToday ? '50%' : '0',
                            backgroundColor: isToday ? '#eff6ff' : 'transparent',
                            margin: '2px 0 0 2px'
                          }}>{day}</span>
                          <div className="day-schedule-texts" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', overflowY: 'hidden', flex: 1 }}>
                            {daySchedules.slice(0, 3).map(s => {
                              const typeObj = masterScheduleTypes.find(t => t.name === s.type);
                              const typeColor = typeObj ? typeObj.color : '#64748b';
                              
                              return (
                                <div 
                                  key={s.id} 
                                  title={`${s.title} (${s.type})${s.category ? ` - ${s.category}` : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const sDate = s.date ? new Date(s.date) : null;
                                    if (sDate && !isNaN(sDate.getTime())) {
                                      setCalendarDate(sDate);
                                    }
                                    setScheduleForm(s);
                                    setIsScheduleModalOpen(true);
                                  }}
                                  style={{ 
                                    fontSize: '0.62rem', padding: '1px 4px', borderRadius: '3px', 
                                    backgroundColor: `${typeColor}12`, color: typeColor, border: `1px solid ${typeColor}22`,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.priority === '높음' && <span style={{ flexShrink: 0 }}>🚨</span>}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {s.category ? `[${s.category}] ` : ''}
                                      {s.startTime ? `(${s.startTime}) ` : ''}
                                      {s.title}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {daySchedules.length > 3 && (
                              <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>+{daySchedules.length - 3}개 더보기</div>
                            )}
                          </div>
                          <div className="day-schedule-dots" style={{ display: 'none', justifyContent: 'center', gap: '2px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {daySchedules.map(s => {
                              const typeObj = masterScheduleTypes.find(t => t.name === s.type);
                              const typeColor = typeObj ? typeObj.color : '#64748b';
                              return (
                                <span 
                                  key={s.id} 
                                  style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: typeColor }}
                                  title={`${s.title} (${s.type})`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    
                    const totalSlots = days.length;
                    const remainingSlots = (7 - (totalSlots % 7)) % 7;
                    for (let i = 0; i < remainingSlots; i++) {
                      days.push(<div key={`empty-end-${i}`} style={{ minHeight: '80px', borderBottom: '1px solid #f8fafc', borderRight: '1px solid #f8fafc', backgroundColor: '#fafbfe' }}></div>);
                    }
                    return days;
                  })()}
                </div>
              </div>

              {/* Splitter Handle Bar */}
              <div 
                className="sa-schedules-splitter"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
                style={{
                  width: '8px',
                  height: '100%',
                  cursor: 'col-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isResizing ? '#3b82f6' : 'transparent',
                  opacity: isResizing ? 0.3 : 1,
                  borderRadius: '4px',
                  margin: '0 4px',
                  transition: 'background-color 0.2s, opacity 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={e => { if (!isResizing) { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; } }}
                onMouseLeave={e => { if (!isResizing) { e.currentTarget.style.backgroundColor = 'transparent'; } }}
              >
                <div style={{ width: '4px', height: '24px', borderRadius: '2px', backgroundColor: isResizing ? '#ffffff' : '#cbd5e1' }}></div>
              </div>

              {/* Right Column: Schedule Management Panel */}
              <div className={`sa-schedules-right ${mobileScheduleView === 'list' ? 'mobile-visible' : 'mobile-hidden'}`} style={{ width: `${100 - leftWidth - 1}%`, display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                {/* Stats row */}
                <div className="sa-stats-grid" style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  {[
                    { label: '이번달 전체 일정', value: masterSchedules.filter(s => s.date?.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`)).length, color: '#3b82f6' },
                    { label: '카테고리 지정 일정', value: masterSchedules.filter(s => !!s.category).length, color: '#f59e0b' },
                    { label: '시스템 점검/점수', value: masterSchedules.filter(s => s.type === '점검' || s.type === '라이선스').length, color: '#10b981' }
                  ].map(stat => (
                    <div key={stat.label} style={{ borderLeft: `4px solid ${stat.color}`, paddingLeft: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>{stat.label}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{stat.value}건</div>
                    </div>
                  ))}
                </div>

                {/* Schedule list container */}
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>일정 목록</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>총 {masterSchedules.length}개의 일정이 있습니다.</span>
                  </div>
                  
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                    {masterSchedules.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        등록된 마스터 일정이 없습니다.<br />달력을 클릭하여 신규 일정을 등록해 보세요.
                      </div>
                    ) : (
                      masterSchedules
                        .filter(s => !hiddenMasterTypes.includes(s.type))
                        .map(s => {
                        const typeObj = masterScheduleTypes.find(t => t.name === s.type);
                        const typeColor = typeObj ? typeObj.color : '#64748b';
                        
                        return (
                          <div 
                            key={s.id} 
                            style={{ 
                              padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9', 
                              backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                              gap: '16px', transition: 'transform 0.2s', cursor: 'pointer'
                            }}
                            onClick={() => {
                              setScheduleForm(s);
                              setIsScheduleModalOpen(true);
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, backgroundColor: `${typeColor}15`, color: typeColor }}>
                                  {s.type}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} /> {s.date} {s.startTime ? `(${s.startTime}${s.endTime ? ` ~ ${s.endTime}` : ''})` : ''}
                                </span>
                                {s.category && (
                                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, backgroundColor: '#f1f5f9', color: '#475569' }}>
                                    카테고리: {s.category}
                                  </span>
                                )}
                                {s.priority && (
                                  <span style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.65rem', 
                                    fontWeight: 800, 
                                    backgroundColor: s.priority === '높음' ? '#fee2e2' : s.priority === '낮음' ? '#f1f5f9' : '#fef3c7', 
                                    color: s.priority === '높음' ? '#ef4444' : s.priority === '낮음' ? '#64748b' : '#d97706'
                                  }}>
                                    중요도: {s.priority}
                                  </span>
                                )}
                              </div>
                              <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {s.priority === '높음' && <span>🚨</span>}
                                {s.title}
                              </h4>
                              {s.content && <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>{s.content}</p>}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '4px', alignSelf: 'center' }} onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={() => {
                                  setScheduleForm(s);
                                  setIsScheduleModalOpen(true);
                                }}
                                style={{ padding: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer' }}
                                title="수정"
                              >
                                <Edit2 size={12} color="#64748b" />
                              </button>
                              <button 
                                onClick={() => setDeletingSchedule(s)}
                                style={{ padding: '6px', border: '1px solid #fee2e2', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer' }}
                                title="삭제"
                              >
                                <Trash2 size={12} color="#ef4444" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Todo List Container */}
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px 24px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>할일 목록 (Todo)</h3>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        미완료 {masterTodos.filter(t => !t.completed).length}건
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>총 {masterTodos.length}개의 할일</span>
                  </div>

                  {/* Todo Quick Input Form */}
                  <form onSubmit={handleSaveTodo} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input 
                      type="text" 
                      placeholder="새로운 할일 계획을 입력하세요..." 
                      value={todoText} 
                      onChange={e => setTodoText(e.target.value)} 
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} 
                    />
                    <select 
                      value={todoPriority} 
                      onChange={e => setTodoPriority(e.target.value)} 
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <option value="높음">🚨 높음</option>
                      <option value="보통">⚡ 보통</option>
                      <option value="낮음">💤 낮음</option>
                    </select>
                    <button 
                      type="submit" 
                      style={{ 
                        padding: '10px 16px', 
                        backgroundColor: '#10b981', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontSize: '0.85rem', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10b981'}
                    >
                      <Plus size={14} /> 할일 추가
                    </button>
                  </form>

                  {/* Todo List Scroll Area */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                    {masterTodos.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        등록된 할일이 없습니다.<br />위 입력창을 통해 마스터 할일 일정을 등록해 보세요.
                      </div>
                    ) : (
                      masterTodos.map(todo => {
                        const dateFormatted = todo.createdAt ? new Date(todo.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                        return (
                          <div 
                            key={todo.id} 
                            style={{ 
                              padding: '12px 16px', 
                              borderRadius: '12px', 
                              border: '1px solid #f1f5f9', 
                              backgroundColor: todo.completed ? '#f8fafc' : '#ffffff', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              gap: '12px',
                              opacity: todo.completed ? 0.7 : 1,
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              {/* Complete Checkbox Circle Button */}
                              <button 
                                onClick={() => handleToggleTodoComplete(todo)} 
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  padding: 0, 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  outline: 'none'
                                }}
                                title={todo.completed ? '미완료로 변경' : '완료로 변경'}
                              >
                                {todo.completed ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                  </svg>
                                ) : (
                                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #cbd5e1', flexShrink: 0 }} />
                                )}
                              </button>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span 
                                  style={{ 
                                    fontSize: '0.85rem', 
                                    fontWeight: todo.completed ? 500 : 700, 
                                    color: todo.completed ? '#94a3b8' : '#1e293b',
                                    textDecoration: todo.completed ? 'line-through' : 'none',
                                    wordBreak: 'break-all'
                                  }}
                                >
                                  {todo.title}
                                </span>
                                {dateFormatted && (
                                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>
                                    등록일: {dateFormatted}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {/* Priority Badge */}
                              <span 
                                style={{ 
                                  padding: '2px 6px', 
                                  borderRadius: '4px', 
                                  fontSize: '0.6rem', 
                                  fontWeight: 800, 
                                  backgroundColor: todo.priority === '높음' ? '#fee2e2' : todo.priority === '낮음' ? '#f1f5f9' : '#fef3c7', 
                                  color: todo.priority === '높음' ? '#ef4444' : todo.priority === '낮음' ? '#64748b' : '#d97706'
                                }}
                              >
                                {todo.priority}
                              </span>

                              {/* Actions: Toggle and Delete */}
                              <button 
                                onClick={() => handleToggleTodoComplete(todo)} 
                                style={{ 
                                  padding: '4px 10px', 
                                  border: 'none', 
                                  borderRadius: '6px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 700, 
                                  backgroundColor: todo.completed ? '#f1f5f9' : '#eff6ff', 
                                  color: todo.completed ? '#64748b' : '#3b82f6', 
                                  cursor: 'pointer',
                                  transition: 'all 0.15s' 
                                }}
                              >
                                {todo.completed ? '복원' : '완료'}
                              </button>

                              <button 
                                onClick={() => handleDeleteTodo(todo.id)} 
                                style={{ 
                                  padding: '6px', 
                                  border: 'none', 
                                  backgroundColor: 'transparent', 
                                  cursor: 'pointer',
                                  color: '#94a3b8',
                                  display: 'flex',
                                  alignItems: 'center' 
                                }}
                                title="삭제"
                              >
                                <Trash2 size={14} color="#ef4444" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
            </>
          )}

          {activeTab === 'cs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="sa-stats-grid" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {[
                  { label: '전체 상담', value: csHistory.length, color: '#3b82f6' },
                  { label: '미해결건', value: csHistory.filter(h => h.status === '대기').length, color: '#f59e0b' },
                  { label: '오늘 상담', value: csHistory.filter(h => h.createdAt?.startsWith(new Date().toISOString().split('T')[0])).length, color: '#10b981' },
                  { label: '라이선스 문의', value: csHistory.filter(h => h.type === '연장상담').length, color: '#ef4444' }
                ].map(stat => (
                  <div key={stat.label} style={{ borderLeft: `4px solid ${stat.color}`, paddingLeft: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="sa-desktop-table" style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '20px' }}>날짜/시간</th>
                      <th style={{ padding: '20px' }}>업체명</th>
                      <th style={{ padding: '20px' }}>유형/상태</th>
                      <th style={{ padding: '20px' }}>상담 내용</th>
                      <th style={{ padding: '20px' }}>연락처</th>
                      <th style={{ padding: '20px', textAlign: 'center' }}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csHistory.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.createdAt?.split('T')[0]}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{log.createdAt?.split('T')[1]?.substring(0, 5)}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>{log.companyName}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>{log.type}</div>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: log.status === '대기' ? '#fff7ed' : '#f0fdf4', color: log.status === '대기' ? '#c2410c' : '#15803d', fontWeight: 700 }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.9rem', color: '#1e293b', maxWidth: '300px' }}>{log.content}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>{log.contact || '-'}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button 
                              onClick={() => { setCsForm(log); setIsCsModalOpen(true); }}
                              style={{ padding: '6px 12px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer' }}
                              title="상담 수정"
                            >
                              <Edit2 size={14} color="#64748b" />
                            </button>
                            <button 
                              onClick={() => setDeletingCs({ id: log.id, companyName: log.companyName })}
                              style={{ padding: '6px 12px', border: '1px solid #fee2e2', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer' }}
                              title="상담 삭제"
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View for CS logs */}
              <div className="sa-mobile-cards" style={{ display: 'none' }}>
                {csHistory.map(log => (
                  <div key={log.id} className="sa-mobile-card">
                    <div className="card-header">
                      <div className="card-title">
                        <span>{log.companyName}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', 
                        backgroundColor: log.status === '대기' ? '#fff7ed' : '#f0fdf4', 
                        color: log.status === '대기' ? '#c2410c' : '#15803d', 
                        fontWeight: 700 
                      }}>
                        {log.status}
                      </span>
                    </div>
                    <div className="card-body">
                      <div><strong>상담 유형:</strong> {log.type}</div>
                      <div><strong>등록 일시:</strong> {log.createdAt?.split('T')[0]} {log.createdAt?.split('T')[1]?.substring(0, 5)}</div>
                      {log.contact && <div><strong>연락처:</strong> {log.contact}</div>}
                      <div style={{ 
                        marginTop: '8px', padding: '12px', backgroundColor: '#f8fafc', 
                        borderRadius: '8px', borderLeft: '3px solid #3b82f6', 
                        fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 
                      }}>
                        {log.content}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        onClick={() => { setCsForm(log); setIsCsModalOpen(true); }}
                        className="action-btn"
                        style={{ color: '#64748b' }}
                        title="상담 수정"
                      >
                        <Edit2 size={14} /> 수정
                      </button>
                      <button 
                        onClick={() => setDeletingCs({ id: log.id, companyName: log.companyName })}
                        className="action-btn"
                        style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                        title="상담 삭제"
                      >
                        <Trash2 size={14} /> 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notices' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {notices.map(notice => (
                <div key={notice.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', backgroundColor: notice.type === 'alert' ? '#fee2e2' : '#e0f2fe', color: notice.type === 'alert' ? '#ef4444' : '#0ea5e9' }}>
                        {notice.type === 'alert' ? '긴급' : '안내'}
                      </span>
                      {notice.targetCategory && notice.targetCategory !== '전체' && (
                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569' }}>
                          대상: {notice.targetCategory}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{notice.createdAt?.split('T')[0]}</span>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>{notice.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>{notice.content}</p>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleToggleNoticeStatus(notice.id, !notice.isActive)}
                      style={{ 
                        flex: 1, padding: '8px', border: '1px solid #e2e880', borderRadius: '8px', 
                        backgroundColor: notice.isActive ? 'transparent' : '#f1f5f9', 
                        color: notice.isActive ? '#64748b' : '#94a3b8', 
                        fontSize: '0.8rem', cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                    >
                      {notice.isActive ? '공지 숨김' : '공지 게시'}
                    </button>
                    <button 
                      onClick={() => setDeletingNotice({ id: notice.id, title: notice.title })}
                      style={{ padding: '8px', border: 'none', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fecaca'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                    ><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'linkerx_home' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              minHeight: 'calc(100vh - 200px)',
              color: 'white',
              alignItems: 'start'
            }}>
              {/* Left Column: CMS Editor */}
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} /> 홈페이지 히어로 배너 CMS 설정
                  </h3>
                  <button 
                    onClick={() => window.open('./?home=true', '_blank')}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      padding: '6px 12px', border: '1px solid rgba(59, 130, 246, 0.4)', 
                      borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                      color: '#60a5fa', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                  >
                    홈페이지 바로가기 <ExternalLink size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>히어로 배지 텍스트</label>
                    <input 
                      type="text" 
                      value={cmsHeroBadge} 
                      onChange={e => setCmsHeroBadge(e.target.value)} 
                      placeholder="예: 차세대 스마트 물류·유통 ERP 플랫폼"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>히어로 메인 타이틀</label>
                    <input 
                      type="text" 
                      value={cmsHeroTitle} 
                      onChange={e => setCmsHeroTitle(e.target.value)} 
                      placeholder="예: 연결을 혁신하는 비즈니스 통합 솔루션, Linker X"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '2px', display: 'block' }}>* 콤마(,) 기준 앞부분은 흰색, 뒷부분은 하늘색 그라데이션으로 타이틀이 쪼개져 렌더링됩니다.</small>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>히어로 서브 타이틀 (설명란)</label>
                    <textarea 
                      value={cmsHeroSubtitle} 
                      onChange={e => setCmsHeroSubtitle(e.target.value)} 
                      placeholder="설명 글을 입력해 주세요."
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>기본 CTA 버튼 문구</label>
                      <input 
                        type="text" 
                        value={cmsHeroCtaText} 
                        onChange={e => setCmsHeroCtaText(e.target.value)} 
                        placeholder="예: 무료 데모 신청하기"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>보조 CTA 버튼 문구</label>
                      <input 
                        type="text" 
                        value={cmsHeroSecondaryCtaText} 
                        onChange={e => setCmsHeroSecondaryCtaText(e.target.value)} 
                        placeholder="예: 대리점 가입 신청"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveCMS}
                  style={{
                    backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px',
                    padding: '12px', fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.2s',
                    fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    marginTop: '8px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  <Save size={16} /> CMS 설정 저장하기
                </button>
              </div>

              {/* Right Column: Agency Inquiries List */}
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto'
              }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} /> 대리점 가입 및 도입 신청 관리 ({agencyInquiries.length}건)
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {agencyInquiries.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '0.9rem' }}>
                      접수된 가입 또는 도입 신청서가 없습니다.
                    </div>
                  ) : (
                    agencyInquiries.map((inq) => (
                      <div 
                        key={inq.id}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ 
                              backgroundColor: inq.type === 'agency' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: inq.type === 'agency' ? '#60a5fa' : '#34d399',
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, marginRight: '8px'
                            }}>
                              {inq.type === 'agency' ? '대리점 가입' : '일반 도입'}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{inq.companyName}</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '8px' }}>대표: {inq.ceoName}</span>
                          </div>
                          
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {inq.appliedAt ? inq.appliedAt.split('T')[0] : ''}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                          <div>📧 이메일: <span style={{ color: 'white' }}>{inq.email}</span></div>
                          <div>📞 연락처: <span style={{ color: 'white' }}>{inq.contact}</span></div>
                          {inq.type === 'agency' && (
                            <>
                              <div>🗂️ 카테고리: <span style={{ color: 'white' }}>{inq.category || '지정 안 됨'}</span></div>
                              <div>🔑 비밀번호: <span style={{ color: 'white', fontFamily: 'monospace' }}>{inq.password}</span></div>
                            </>
                          )}
                        </div>

                        {inq.content && (
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                            {inq.content}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                          {inq.status === 'pending' || inq.status === 'received' ? (
                            <>
                              {inq.type === 'agency' ? (
                                <button 
                                  onClick={() => handleApproveInquiry(inq)}
                                  style={{
                                    backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px',
                                    padding: '6px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10b981'}
                                >
                                  가입 승인
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    if (window.confirm('도입 문의 확인 처리를 완료하시겠습니까?')) {
                                      setDoc(doc(db, 'agency_inquiries', inq.id), { ...inq, status: 'checked' }, { merge: true });
                                    }
                                  }}
                                  style={{
                                    backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
                                    padding: '6px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                >
                                  상담 완료
                                </button>
                              )}
                              <button 
                                onClick={() => handleRejectInquiry(inq)}
                                style={{
                                  backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px',
                                  padding: '6px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                              >
                                반려/거절
                              </button>
                            </>
                          ) : (
                            <span style={{ 
                              fontSize: '0.8rem', fontWeight: 800,
                              color: inq.status === 'approved' || inq.status === 'checked' ? '#34d399' : '#f87171' 
                            }}>
                              {inq.status === 'approved' && `승인 완료 (ID: ${inq.approvedCompanyId})`}
                              {inq.status === 'checked' && '처리 완료'}
                              {inq.status === 'rejected' && '반려됨'}
                            </span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}


        </div>
      </div>

      {/* Agency Modal */}
      {isAgencyModalOpen && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '20px', width: '480px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px', fontWeight: 800 }}>회원사 정보 관리</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>회사 ID (로그인 아이디)</label>
                  <input 
                    type="text" 
                    placeholder="회사 ID" 
                    value={agencyForm.id} 
                    onChange={e => setAgencyForm({...agencyForm, id: e.target.value.trim()})} 
                    disabled={!!originalAgencyId}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: !!originalAgencyId ? '#f8fafc' : 'white' }} 
                  />
                  {!originalAgencyId && <small style={{ fontSize: '0.7rem', color: '#94a3b8' }}>* 공백 없이 입력해 주세요.</small>}
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>회원사명</label>
                  <input type="text" placeholder="회원사명" value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>카테고리</label>
                  <select 
                    value={agencyForm.category || ''} 
                    onChange={e => setAgencyForm({...agencyForm, category: e.target.value})} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                  >
                    <option value="">카테고리 선택 없음</option>
                    {agencyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>대표자명</label>
                  <input type="text" placeholder="대표자명" value={agencyForm.ceo} onChange={e => setAgencyForm({...agencyForm, ceo: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>이메일 (비즈니스)</label>
                  <input type="text" placeholder="이메일" value={agencyForm.email} onChange={e => setAgencyForm({...agencyForm, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>비밀번호</label>
                  <input type="password" placeholder="비밀번호" value={agencyForm.password} onChange={e => setAgencyForm({...agencyForm, password: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>담당자 연락처</label>
                  <input type="text" placeholder="연락처" value={agencyForm.managerContact} onChange={e => setAgencyForm({...agencyForm, managerContact: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>서비스 만료일</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="date" value={agencyForm.expiryDate} onChange={e => setAgencyForm({...agencyForm, expiryDate: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { label: '1달', months: 1 },
                      { label: '3달', months: 3 },
                      { label: '6개월', months: 6 },
                      { label: '1년', months: 12 }
                    ].map(opt => (
                      <button 
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          const baseDate = agencyForm.expiryDate ? new Date(agencyForm.expiryDate) : new Date();
                          const newDate = new Date(baseDate);
                          newDate.setMonth(newDate.getMonth() + opt.months);
                          setAgencyForm({...agencyForm, expiryDate: newDate.toISOString().split('T')[0]});
                        }}
                        style={{
                          flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
                          borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.borderColor = '#cbd5e1'; }}
                        onMouseLeave={e => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleSaveAgency} style={{ flex: 1, padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>저장하기</button>
                <button onClick={() => { setIsAgencyModalOpen(false); setOriginalAgencyId(null); }} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirm Modal */}
      {deletingAgency && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '24px', width: '420px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Trash2 size={40} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>회원사 영구 삭제</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              <strong style={{ color: '#0f172a' }}>[{deletingAgency.name}]</strong> 회원사와 관련된 모든 데이터를 삭제하시겠습니까?<br/>이 작업은 절대로 되돌릴 수 없습니다.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={isDeleting}
                onClick={handleDeleteCompany} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isDeleting ? '데이터 정리 중...' : '네, 삭제하겠습니다'}
              </button>
              <button 
                disabled={isDeleting}
                onClick={() => setDeletingAgency(null)} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {isCsModalOpen && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '20px', width: '520px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px', fontWeight: 800 }}>상담 내용 기록</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <select 
                value={csForm.companyId} 
                onChange={e => {
                  const selected = companies.find(c => c.id === e.target.value);
                  setCsForm({...csForm, companyId: e.target.value, companyName: selected?.name || ''});
                }}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              >
                <option value="">업체 선택</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select value={csForm.type} onChange={e => setCsForm({...csForm, type: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <option value="일반상담">일반상담</option>
                  <option value="연장상담">연장상담</option>
                  <option value="기능문의">기능문의</option>
                  <option value="오류보고">오류보고</option>
                </select>
                <select value={csForm.status} onChange={e => setCsForm({...csForm, status: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <option value="대기">처리 대기</option>
                  <option value="완료">상담 완료</option>
                </select>
              </div>
              <input type="text" placeholder="연락처 (담당자/전화번호)" value={csForm.contact} onChange={e => setCsForm({...csForm, contact: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <textarea placeholder="상담 상세 내용" rows={5} value={csForm.content} onChange={e => setCsForm({...csForm, content: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleSaveCs} style={{ flex: 1, padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={18} /> 기록 저장
                </button>
                <button onClick={() => setIsCsModalOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px' }}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CS Deletion Confirm Modal */}
      {deletingCs && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '24px', width: '420px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Trash2 size={40} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>상담 기록 삭제</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              <strong style={{ color: '#0f172a' }}>[{deletingCs.companyName}]</strong>의 상담 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleDeleteCs} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                네, 삭제합니다
              </button>
              <button 
                onClick={() => setDeletingCs(null)} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Deletion Confirm Modal */}
      {deletingNotice && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '24px', width: '420px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Trash2 size={40} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>공지사항 삭제</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              <strong style={{ color: '#0f172a' }}>[{deletingNotice.title}]</strong> 공지사항을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleDeleteNotice} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                네, 삭제합니다
              </button>
              <button 
                onClick={() => setDeletingNotice(null)} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryManageModalOpen && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '20px', width: '420px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px', fontWeight: 800 }}>카테고리 관리</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="새 카테고리명" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
              />
              <button 
                onClick={handleAddCategory} 
                style={{ padding: '0 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                추가
              </button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {agencyCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>등록된 카테고리가 없습니다.</div>
              ) : (
                agencyCategories.map((cat, index) => {
                  const isEditing = editingCategoryIndex === index;
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '8px' }}>
                      {isEditing ? (
                        <>
                          <input 
                            type="text" 
                            value={editingCategoryValue} 
                            onChange={e => setEditingCategoryValue(e.target.value)} 
                            style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={() => handleEditCategory(index)} 
                              style={{ padding: '4px 8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              저장
                            </button>
                            <button 
                              onClick={() => setEditingCategoryIndex(-1)} 
                              style={{ padding: '4px 8px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              취소
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 600, color: '#334155', flex: 1 }}>{cat}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => {
                                setEditingCategoryIndex(index);
                                setEditingCategoryValue(cat);
                              }} 
                              style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
                              title="수정"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(cat)} 
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ marginTop: '24px' }}>
              <button onClick={() => setIsCategoryManageModalOpen(false)} style={{ width: '100%', padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Modal */}
      {isNoticeModalOpen && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '20px', width: '520px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px', fontWeight: 800 }}>시스템 공지 배포</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="공지 제목" value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <select value={noticeForm.type} onChange={e => setNoticeForm({...noticeForm, type: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <option value="info">일반 공지</option>
                  <option value="alert">긴급 공지 (강조)</option>
                </select>
                <select value={noticeForm.targetCategory} onChange={e => setNoticeForm({...noticeForm, targetCategory: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <option value="전체">전체 대상</option>
                  {agencyCategories.map(cat => <option key={cat} value={cat}>{cat} 대상</option>)}
                </select>
              </div>
              <textarea placeholder="공지 내용" rows={8} value={noticeForm.content} onChange={e => setNoticeForm({...noticeForm, content: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleSaveNotice} style={{ flex: 1, padding: '14px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Bell size={18} /> {noticeForm.targetCategory === '전체' ? '전체 공지 배포' : `${noticeForm.targetCategory} 공지 배포`}
                </button>
                <button onClick={() => setIsNoticeModalOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px' }}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '20px', width: '500px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px', fontWeight: 800 }}>{scheduleForm.id ? '마스터 일정 수정' : '신규 마스터 일정 등록'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>일정 제목</label>
                <input type="text" placeholder="일정 제목 입력" value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>일정 날짜</label>
                  <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>일정 유형</label>
                  <select value={scheduleForm.type} onChange={e => setScheduleForm({...scheduleForm, type: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                    {masterScheduleTypes.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>시작 시간</label>
                  <input type="time" value={scheduleForm.startTime || ''} onChange={e => setScheduleForm({...scheduleForm, startTime: e.target.value})} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>종료 시간</label>
                  <input type="time" value={scheduleForm.endTime || ''} onChange={e => setScheduleForm({...scheduleForm, endTime: e.target.value})} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>중요도</label>
                <select value={scheduleForm.priority || '보통'} onChange={e => setScheduleForm({...scheduleForm, priority: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                  <option value="높음">🚨 높음 (High)</option>
                  <option value="보통">⚡ 보통 (Medium)</option>
                  <option value="낮음">💤 낮음 (Low)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>일정 카테고리 (직접 입력 또는 선택)</label>
                <input 
                  type="text" 
                  list="master-schedule-categories"
                  placeholder="카테고리명 직접 입력 또는 선택" 
                  value={scheduleForm.category || ''} 
                  onChange={e => setScheduleForm({...scheduleForm, category: e.target.value})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <datalist id="master-schedule-categories">
                  {(() => {
                    const scheduleCats = masterSchedules.map(s => s.category).filter(Boolean);
                    const merged = [...new Set([...scheduleCats, ...agencyCategories])];
                    return merged.map(cat => <option key={cat} value={cat} />);
                  })()}
                </datalist>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>상세 설명</label>
                <textarea placeholder="일정 및 계획 상세 기록" rows={5} value={scheduleForm.content} onChange={e => setScheduleForm({...scheduleForm, content: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleSaveSchedule} style={{ flex: 1, padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={18} /> 일정 저장
                </button>
                <button onClick={() => { setIsScheduleModalOpen(false); setScheduleForm({ id: '', title: '', date: new Date().toISOString().split('T')[0], category: '', type: '업무', content: '', startTime: '', endTime: '', priority: '보통' }); }} style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px' }}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Deletion Confirm Modal */}
      {deletingSchedule && (
        <div className="sa-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div className="sa-modal-card" style={{ backgroundColor: 'white', borderRadius: '24px', width: '420px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Trash2 size={40} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>마스터 일정 삭제</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
              <strong style={{ color: '#0f172a' }}>[{deletingSchedule.title}]</strong> 일정을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleDeleteSchedule} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                네, 삭제합니다
              </button>
              <button 
                onClick={() => setDeletingSchedule(null)} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {isTypeManagementOpen && (
        <ScheduleTypeManagement 
          onClose={() => setIsTypeManagementOpen(false)}
          scheduleTypes={masterScheduleTypes}
          onUpdateTypes={setMasterScheduleTypes}
          isMaster={true}
        />
      )}

      <style>{`
        .sa-sidebar button:hover {
          background-color: rgba(255,255,255,0.05) !important;
          color: white !important;
        }
        .sa-row:hover {
          background-color: #f8fafc !important;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .sa-wrapper {
            padding: 8px !important;
          }
          
          .sa-header-nav {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 16px !important;
            gap: 12px !important;
          }
          
          .sa-header-tabs {
            overflow-x: auto !important;
            width: 100% !important;
            padding-bottom: 8px !important;
            display: flex !important;
            gap: 6px !important;
            scrollbar-width: none;
          }
          .sa-header-tabs::-webkit-scrollbar {
            display: none;
          }
          
          .sa-header-tabs button {
            flex-shrink: 0 !important;
            white-space: nowrap !important;
            padding: 8px 14px !important;
            font-size: 0.8rem !important;
          }
          
          .sa-header-stats {
            display: none !important;
          }
          
          .sa-top-bar {
            padding: 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          
          .sa-top-bar h1 {
            font-size: 1.15rem !important;
            white-space: normal !important;
          }
          
          .sa-view-content {
            padding: 12px !important;
          }
          
          .sa-schedules-container {
            flex-direction: column !important;
            height: auto !important;
            min-height: calc(100vh - 280px) !important;
            overflow-y: auto !important;
          }
          
          .sa-schedules-left {
            width: 100% !important;
            padding: 16px !important;
            margin-bottom: 12px !important;
          }
          
          .sa-schedules-right {
            width: 100% !important;
            margin-top: 12px !important;
          }
          
          .sa-schedules-splitter {
            display: none !important;
          }
          
          .sa-schedules-left.mobile-hidden {
            display: none !important;
          }
          .sa-schedules-left.mobile-visible {
            display: flex !important;
          }
          .sa-schedules-right.mobile-hidden {
            display: none !important;
          }
          .sa-schedules-right.mobile-visible {
            display: flex !important;
          }
          
          .calendar-day-cell {
            min-height: 50px !important;
            padding: 4px !important;
          }
          
          .calendar-day-cell span {
            font-size: 0.75rem !important;
            margin: 0 !important;
          }
          
          .day-schedule-texts {
            display: none !important;
          }
          
          .day-schedule-dots {
            display: flex !important;
          }
          
          .sa-mobile-schedule-toggle {
            display: flex !important;
            width: 100% !important;
          }
          .sa-mobile-schedule-toggle button {
            flex: 1 !important;
            text-align: center !important;
          }

          .sa-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            padding: 16px !important;
          }
          
          .sa-desktop-table {
            display: none !important;
          }
          
          .sa-mobile-cards {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 4px !important;
          }
          
          .sa-mobile-card {
            border-radius: 12px !important;
            padding: 16px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
            border: 1px solid #e2e8f0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          
          .sa-mobile-card .card-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 8px !important;
          }
          
          .sa-mobile-card .card-title {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            font-size: 0.95rem !important;
          }
          
          .sa-mobile-card .category-badge {
            font-size: 0.65rem !important;
            background-color: #e2e8f0 !important;
            color: #475569 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          
          .sa-mobile-card .card-body {
            font-size: 0.8rem !important;
            color: #64748b !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
          }
          
          .sa-mobile-card .card-actions {
            display: flex !important;
            justify-content: flex-end !important;
            gap: 8px !important;
            border-top: 1px solid #f1f5f9 !important;
            padding-top: 10px !important;
          }
          
          .sa-mobile-card .action-btn {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 6px 12px !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
            background: white !important;
            cursor: pointer !important;
          }
          
          .sa-modal-card {
            width: 95% !important;
            max-width: 480px !important;
            padding: 20px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>
      <ChatAssistant context={getSuperAdminContext()} />
    </div>
  );
};

export default SuperAdmin;
