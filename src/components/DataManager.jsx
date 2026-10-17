import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Save, Upload, Trash2, Download, FileJson, 
  AlertTriangle, Lock, Eye, EyeOff, Calendar, Cloud, 
  CloudUpload, RefreshCw, CheckCircle, Clock, Database, 
  Search, ShieldAlert, Sparkles, FolderUp, Check
} from 'lucide-react';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { saveBundle } from '../utils/bundleSyncManager';
import { 
  saveServerBackup, 
  fetchServerBackups, 
  loadServerBackupData, 
  deleteServerBackup, 
  getBackupSettings, 
  saveBackupSettings, 
  formatBytes,
  extractRecordCounts 
} from '../utils/serverBackupUtils';
import './DataManager.css';

const DataManager = ({ onClose, onSaveAll, onRestoreAll, onDeleteAll, currentUser, fullData }) => {
  const fileInputRef = useRef(null);
  const serverUploadFileInputRef = useRef(null);

  const companyId = currentUser?.companyId || 'default';

  // 비밀번호 인증 모달 관련 상태
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 기간별 부분삭제 관련 상태
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfYear = `${new Date().getFullYear()}-01-01`;
  const [deleteMode, setDeleteMode] = useState('all'); // 'all' | 'period'
  const [deleteStartDate, setDeleteStartDate] = useState(firstDayOfYear);
  const [deleteEndDate, setDeleteEndDate] = useState(todayStr);

  // --- 서버 백업 관리 상태 ---
  const [serverBackups, setServerBackups] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [isRestoringServer, setIsRestoringServer] = useState(false);
  const [backupSettings, setBackupSettingsState] = useState({
    autoBackupCycle: 'daily',
    lastAutoBackupDate: null,
    lastAutoBackupTime: null
  });
  const [isSavingCycle, setIsSavingCycle] = useState(false);
  const [cycleSaveSuccess, setCycleSaveSuccess] = useState(false);

  // 서버 백업 필터 & 검색
  const [backupDateFilter, setBackupDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [backupSearchQuery, setBackupSearchQuery] = useState('');

  // 관리자 여부 확인
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'super_admin' || 
                  currentUser?.userId === 'admin' || 
                  currentUser?.userId === 'madmin' || 
                  currentUser?.userId === 'sadmin' ||
                  currentUser?.jobTitle === '대표' ||
                  currentUser?.jobTitle === '관리자';

  // 서버 백업 목록 및 주기 설정 불러오기
  const loadBackupsAndSettings = async () => {
    if (!companyId) return;
    setIsLoadingBackups(true);
    try {
      const [list, settings] = await Promise.all([
        fetchServerBackups(companyId),
        getBackupSettings(companyId)
      ]);
      setServerBackups(list || []);
      setBackupSettingsState(settings);
    } catch (err) {
      console.error('[DataManager] Load server backups error:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackupsAndSettings();
  }, [companyId]);

  // 백업 주기 변경 및 저장
  const handleCycleChange = async (e) => {
    const newCycle = e.target.value;
    if (!isAdmin) {
      alert('백업 주기 설정은 관리자만 변경할 수 있습니다.');
      return;
    }
    setIsSavingCycle(true);
    try {
      const updated = {
        ...backupSettings,
        autoBackupCycle: newCycle
      };
      await saveBackupSettings(companyId, updated);
      setBackupSettingsState(updated);
      setCycleSaveSuccess(true);
      setTimeout(() => setCycleSaveSuccess(false), 2500);
    } catch (err) {
      alert('백업 주기 저장에 실패했습니다: ' + err.message);
    } finally {
      setIsSavingCycle(false);
    }
  };

  // 서버에 현재 데이터 백업 저장하기
  const handleSaveToServer = async () => {
    if (!isAdmin) {
      alert('서버 백업 저장은 관리자 권한이 필요합니다.');
      return;
    }

    const defaultTitle = `${todayStr} 전체 정기 백업`;
    const userTitle = window.prompt('저장할 서버 백업 명칭(메모)을 입력해 주세요:', defaultTitle);
    if (userTitle === null) return; // 취소

    const targetData = fullData || {};
    setIsSavingServer(true);
    try {
      const res = await saveServerBackup(companyId, targetData, {
        title: userTitle.trim() || defaultTitle,
        creator: currentUser?.name || '관리자',
        creatorId: currentUser?.userId || 'admin',
        cycleType: 'manual'
      });

      alert(`[서버 백업 완료]\n총 ${res.totalCount.toLocaleString()}건의 데이터(${res.sizeFormatted})가 서버에 안전하게 저장되었습니다.`);
      await loadBackupsAndSettings();
    } catch (err) {
      console.error('[DataManager] Save to server error:', err);
      alert('서버 백업 저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSavingServer(false);
    }
  };

  // 로컬 백업 파일(.json)을 서버 보관함에 업로드 등록
  const handleUploadFileToServer = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isAdmin) {
      alert('서버 백업 업로드는 관리자 권한이 필요합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object') {
          alert('올바른 백업 데이터 파일이 아닙니다.');
          return;
        }

        const counts = extractRecordCounts(parsed);
        const fileName = file.name.replace(/\.json$/i, '');
        const promptTitle = window.prompt(
          `선택한 파일(${file.name}, 약 ${counts.total.toLocaleString()}건)을 서버 백업 보관함에 등록합니다.\n\n백업 명칭을 지정해 주세요:`,
          `[파일 업로드] ${fileName}`
        );
        if (promptTitle === null) return;

        setIsSavingServer(true);
        const res = await saveServerBackup(companyId, parsed, {
          title: promptTitle.trim() || `[파일 업로드] ${fileName}`,
          memo: `로컬 파일(${file.name}) 업로드 백업`,
          creator: currentUser?.name || '관리자',
          creatorId: currentUser?.userId || 'admin',
          cycleType: 'file_upload'
        });

        alert(`[서버 업로드 완료]\n${res.title} 백업(${res.sizeFormatted})이 서버에 정상 보관되었습니다.`);
        await loadBackupsAndSettings();
      } catch (err) {
        console.error('[DataManager] Upload file error:', err);
        alert('백업 파일 업로드 중 오류가 발생했습니다: ' + err.message);
      } finally {
        setIsSavingServer(false);
        if (serverUploadFileInputRef.current) serverUploadFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 서버 백업에서 바로 불러오기 (원클릭 복원)
  const handleRestoreFromServer = async (backup) => {
    if (!isAdmin) {
      alert('데이터 복원은 관리자 권한이 필요합니다.');
      return;
    }

    const confirmMsg = `[서버 백업 복원]\n\n` +
      `선택한 백업: "${backup.title}" (${backup.date} ${backup.time})\n` +
      `총 데이터 건수: ${backup.totalCount?.toLocaleString()}건 (${backup.sizeFormatted})\n\n` +
      `⚠️ 주의: 현재 시스템의 모든 데이터가 이 백업 시점의 데이터로 완전히 대체됩니다.\n` +
      `정말 이 백업으로 복원하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    setIsRestoringServer(true);
    try {
      const backupData = await loadServerBackupData(companyId, backup.id);
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('백업 데이터 내용을 읽어올 수 없습니다.');
      }

      await onRestoreAll(backupData, true);
    } catch (err) {
      console.error('[DataManager] Restore from server error:', err);
      alert('서버 백업 복원 중 오류가 발생했습니다: ' + err.message);
      setIsRestoringServer(false);
    }
  };

  // 서버 백업을 내 PC로 다운로드
  const handleDownloadServerBackup = async (backup) => {
    try {
      const backupData = await loadServerBackupData(companyId, backup.id);
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `server_backup_${backup.date}_${backup.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('백업 다운로드 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 서버 백업 삭제
  const handleDeleteServerBackup = async (backup) => {
    if (!isAdmin) {
      alert('서버 백업 삭제는 관리자 권한이 필요합니다.');
      return;
    }

    if (!window.confirm(`[${backup.title}] (${backup.date}) 서버 백업 파일을 클라우드에서 영구 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteServerBackup(companyId, backup.id);
      setServerBackups(prev => prev.filter(b => b.id !== backup.id));
      alert('선택한 서버 백업이 성공적으로 삭제되었습니다.');
    } catch (err) {
      alert('백업 삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 서버 백업 목록 필터링
  const filteredServerBackups = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const thisMonthStr = `${curYear}-${curMonth}`;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    return serverBackups.filter(b => {
      // 1. 날짜 필터
      if (backupDateFilter === 'today' && b.date !== todayStr) return false;
      if (backupDateFilter === 'week' && b.date < oneWeekAgoStr) return false;
      if (backupDateFilter === 'month' && !b.date?.startsWith(thisMonthStr)) return false;

      // 2. 검색어 필터
      if (backupSearchQuery.trim()) {
        const q = backupSearchQuery.trim().toLowerCase();
        const tMatch = (b.title || '').toLowerCase().includes(q);
        const mMatch = (b.memo || '').toLowerCase().includes(q);
        const cMatch = (b.creator || '').toLowerCase().includes(q);
        const dMatch = (b.date || '').includes(q);
        if (!tMatch && !mMatch && !cMatch && !dMatch) return false;
      }

      return true;
    });
  }, [serverBackups, backupDateFilter, backupSearchQuery, todayStr]);

  // 카테고리별 개별 삭제
  const handleDeleteCategory = async (catKey, catLabel) => {
    if (!isAdmin) {
      alert(`${catLabel} 삭제는 관리자 권한이 필요합니다.`);
      return;
    }
    const isPeriod = deleteMode === 'period';
    if (isPeriod && (!deleteStartDate || !deleteEndDate)) {
      alert('삭제할 기간(시작일과 종료일)을 올바르게 선택해 주세요.');
      return;
    }
    if (isPeriod && (catKey === 'partner' || catKey === 'product')) {
      if (!window.confirm(`[${catLabel}] 기본 마스터 정보는 날짜 구분이 없어 기간 지정이 아닌 '전체 삭제'로 진행됩니다.\n계속 진행하시겠습니까?`)) {
        return;
      }
    }

    const effectivePeriod = isPeriod && catKey !== 'partner' && catKey !== 'product';
    const periodText = effectivePeriod ? `${deleteStartDate} ~ ${deleteEndDate}` : '전체 기간';

    if (!window.confirm(`정말 [${catLabel}] (${periodText}) 데이터를 시스템 및 DB에서 영구 삭제하시겠습니까?\n\n※ 전표 삭제 시 현재 최종재고(실시간 재고)는 변동 없이 보존됩니다.\n※ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    const keyword = catLabel.replace(/\s+/g, '');
    const entered = window.prompt(`정말 삭제하시려면 '${keyword}삭제'를 정확히 입력해 주세요.`);
    if (entered !== `${keyword}삭제`) {
      alert('입력값이 일치하지 않아 취소되었습니다.');
      return;
    }

    setIsDeleting(true);
    try {
      const colMap = {
        partner: ['partners'],
        product: ['products'],
        salesLedger: ['salesInvoices'],
        purchaseLedger: ['purchaseInvoices'],
        orders: ['salesOrders', 'purchaseOrders'],
        quotations: ['quotations'],
        inventoryTransfer: ['inventoryTransferHistory'],
        actionLogs: ['actionLogs'],
        schedules: ['schedules', 'actionLogs']
      };
      const collections = colMap[catKey] || [catKey];
      let totalDeletedCount = 0;

      for (const col of collections) {
        const snap = await getDocs(collection(db, 'companies', companyId, col));
        const allDocs = snap.docs;
        
        let docsToDelete = allDocs;
        if (effectivePeriod) {
          docsToDelete = allDocs.filter(d => {
            const data = d.data();
            const dateVal = data.date || data.orderDate || (data.start ? data.start.slice(0, 10) : '') || (data.createdAt ? data.createdAt.slice(0, 10) : '');
            return dateVal && dateVal >= deleteStartDate && dateVal <= deleteEndDate;
          });
        }

        if (docsToDelete.length === 0) continue;

        totalDeletedCount += docsToDelete.length;
        const CHUNK_SIZE = 400;
        for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
          const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }

        try {
          if (effectivePeriod) {
            const deletedIds = new Set(docsToDelete.map(d => d.id));
            const remainingDocs = allDocs
              .filter(d => !deletedIds.has(d.id))
              .map(d => ({ ...d.data(), id: d.id }));
            await saveBundle(companyId, col, remainingDocs);
            localStorage.setItem(`${col}_${companyId}`, JSON.stringify(remainingDocs));
          } else {
            await saveBundle(companyId, col, []);
            localStorage.removeItem(`${col}_${companyId}`);
          }
        } catch (e) {
          console.warn('Bundle update error during category delete:', e);
        }
      }

      alert(`[${catLabel}] (${periodText}) 데이터 ${totalDeletedCount}건이 성공적으로 삭제되었습니다.\n(최종재고는 변동 없이 보존되었습니다.)\n\n화면을 새로고침합니다.`);
      window.location.reload();
    } catch (err) {
      console.error(`Delete ${catLabel} error:`, err);
      alert(`${catLabel} 삭제 중 오류가 발생했습니다: ' + err.message`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    onSaveAll();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onRestoreAll(data);
        } catch (err) {
          alert('올바른 데이터 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClickDelete = () => {
    if (!isAdmin) {
      alert('전체 데이터 초기화는 관리자(Admin) 계정으로 로그인한 경우에만 진행할 수 있습니다.');
      return;
    }
    setAdminPassword('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const trimmed = adminPassword.trim();
    if (!trimmed) {
      setPasswordError('관리자 비밀번호를 입력해 주세요.');
      return;
    }

    setIsDeleting(true);
    setPasswordError('');

    const timeoutId = setTimeout(() => {
      setIsDeleting(false);
      setPasswordError('처리 시간이 초과되었습니다. 네트워크 연결 상태를 확인 후 다시 시도해 주세요.');
    }, 45000);

    try {
      const res = await onDeleteAll(trimmed);
      clearTimeout(timeoutId);
      if (res && res.success === false) {
        setPasswordError(res.message || '비밀번호가 일치하지 않습니다.');
        setIsDeleting(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Delete all error:", err);
      setPasswordError('데이터 삭제 중 오류가 발생했습니다: ' + (err.message || String(err)));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <WindowModal title="데이터 전체 저장/불러오기/삭제 및 서버 백업 관리" onClose={onClose} width="1120px">
        <div className="data-header">
          <div className="data-title-section">
            <div className="data-icon-bg"><Database size={24} color="#2563eb" /></div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="data-title">데이터 전체 저장/불러오기/삭제 & 서버 백업 관리</h2>
                {isAdmin ? (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    backgroundColor: '#dcfce7', 
                    color: '#15803d', 
                    fontWeight: 700 
                  }}>
                    관리자 인증됨
                  </span>
                ) : (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    backgroundColor: '#fee2e2', 
                    color: '#b91c1c', 
                    fontWeight: 700 
                  }}>
                    일반 직원 모드
                  </span>
                )}
              </div>
              <p className="data-desc">시스템의 전체 데이터를 클라우드 서버 또는 로컬 파일로 백업/복원하고, 주기적 백업 관리 및 초기화(영구삭제)를 수행합니다.</p>
            </div>
          </div>
        </div>

        {/* --- 1. 상단 4개 주요 기능 카드 그리드 --- */}
        <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          
          {/* Card 1: 서버에 즉시 백업 저장 (신규) */}
          <div className="data-card" style={{ borderColor: '#bfdbfe', background: '#f8fafc' }}>
            <div className="card-icon blue"><CloudUpload size={32} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 className="card-title">서버 백업 저장</h3>
              <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>추천</span>
            </div>
            <p className="card-desc">
              별도 파일 다운로드 없이 파이어베이스 클라우드 서버에 현재 시스템 전체 데이터를 안전하게 즉시 백업 저장합니다.
            </p>
            <button 
              className="btn-data blue" 
              onClick={handleSaveToServer}
              disabled={isSavingServer || isDeleting}
            >
              {isSavingServer ? <RefreshCw size={18} className="animate-spin" /> : <CloudUpload size={18} />} 
              {isSavingServer ? '서버 저장 중...' : '전체 데이터 백업 서버에 저장하기'}
            </button>
          </div>

          {/* Card 2: 로컬 파일로 다운로드 (PC 백업) */}
          <div className="data-card">
            <div className="card-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}><Download size={32} /></div>
            <h3 className="card-title">PC 파일 백업 (.json)</h3>
            <p className="card-desc">
              회원사 전체 데이터를 사용자의 PC 컴퓨터에 단일 JSON 파일 형태로 즉시 내려받아 영구 보관합니다.
            </p>
            <button className="btn-data" style={{ backgroundColor: '#475569', color: '#fff' }} onClick={handleDownload}>
              <Download size={18} /> PC에 파일 다운로드
            </button>
          </div>

          {/* Card 3: 로컬 파일에서 복구 */}
          <div className="data-card">
            <div className="card-icon green"><Upload size={32} /></div>
            <h3 className="card-title">PC 백업 파일 복원</h3>
            <p className="card-desc">
              PC에 보관 중인 백업 JSON 파일을 업로드하여 시스템의 모든 상태를 손쉽게 완벽 복원합니다.
            </p>
            <div className="warning-box yellow" style={{ marginBottom: '12px' }}>
              <AlertTriangle size={14} />
              <span>주의: 복원 시 현재 데이터가 파일 데이터로 덮어씌워집니다.</span>
            </div>
            <button className="btn-data-outline" onClick={() => fileInputRef.current.click()}>
              <Upload size={18} /> PC 파일 선택 후 복원
            </button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
          </div>

          {/* Card 4: 모든 데이터 삭제 (전체 초기화) */}
          <div className="data-card" style={{ borderColor: '#fecaca' }}>
            <div className="card-icon red"><Trash2 size={32} /></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h3 className="card-title" style={{ margin: 0 }}>모든 데이터 삭제</h3>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                color: '#ef4444', 
                backgroundColor: '#fee2e2', 
                padding: '2px 6px', 
                borderRadius: '4px' 
              }}>
                관리자 전용
              </span>
            </div>
            <p className="card-desc" style={{ marginTop: '8px' }}>
              거래처, 상품, 매출/매입, 발주/수주, 주문서, 재고이동, 최근현황 등 파이어베이스에 저장된 모든 데이터를 실제로 영구 삭제합니다.
            </p>
            <div className="warning-box red" style={{ marginBottom: '12px' }}>
              <AlertTriangle size={14} />
              <span>경고: 파이어베이스 DB 문서 및 번들이 완전히 영구 삭제됩니다.</span>
            </div>
            <button 
              className="btn-data red" 
              onClick={handleClickDelete}
              style={{
                opacity: isAdmin ? 1 : 0.65,
                cursor: isAdmin ? 'pointer' : 'not-allowed'
              }}
            >
              <Trash2 size={18} /> 전체 데이터 초기화
            </button>
          </div>

        </div>

        {/* --- 2. 날짜별 서버 백업 파일 보관함 & 자동 백업 주기 설정 섹션 --- */}
        <div style={{
          margin: '0 32px 24px 32px',
          padding: '22px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid #bfdbfe',
          boxShadow: '0 4px 12px rgba(37,99,235,0.06)'
        }}>
          {/* Header & Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a' }}>
                  ☁️ 날짜별 서버 백업 보관함 & 자동 백업 관리
                </h3>
                <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  총 {serverBackups.length}개 보관 중
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                파이어베이스 서버에 안전하게 보관된 날짜별 백업본을 언제든지 확인하고, 클릭 한 번으로 서버에서 즉시 불러와 복원할 수 있습니다.
              </p>
            </div>

            {/* Actions: 백업 주기 선택 + 로컬 파일 업로드 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              
              {/* 백업 주기 선택 드롭다운 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <Clock size={16} color="#64748b" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>백업 주기:</span>
                <select
                  value={backupSettings.autoBackupCycle || 'daily'}
                  onChange={handleCycleChange}
                  disabled={isSavingCycle || !isAdmin}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="daily">매일 1회 자동 백업 (권장)</option>
                  <option value="weekly">매주 1회 자동 백업 (월요일)</option>
                  <option value="monthly">매월 1회 자동 백업 (1일)</option>
                  <option value="manual">수동 백업만 사용</option>
                </select>
                {cycleSaveSuccess && (
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Check size={13} /> 저장됨
                  </span>
                )}
              </div>

              {/* PC 백업 파일 업로드하여 서버에 보관하기 버튼 */}
              <button
                type="button"
                onClick={() => serverUploadFileInputRef.current && serverUploadFileInputRef.current.click()}
                disabled={isSavingServer || !isAdmin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #93c5fd',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isAdmin ? 'pointer' : 'not-allowed'
                }}
              >
                <FolderUp size={16} /> PC 파일 업로드하여 서버에 보관
              </button>
              <input
                type="file"
                ref={serverUploadFileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleUploadFileToServer}
              />

              {/* 새로고침 */}
              <button
                type="button"
                onClick={loadBackupsAndSettings}
                disabled={isLoadingBackups}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  color: '#475569'
                }}
                title="새로고침"
              >
                <RefreshCw size={15} className={isLoadingBackups ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'all', label: '전체 백업' },
                { id: 'today', label: '오늘' },
                { id: 'week', label: '최근 7일' },
                { id: 'month', label: '이번 달' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setBackupDateFilter(f.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: backupDateFilter === f.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: backupDateFilter === f.id ? '#2563eb' : '#fff',
                    color: backupDateFilter === f.id ? '#fff' : '#64748b'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="백업 명칭, 생성자, 날짜 검색..."
                value={backupSearchQuery}
                onChange={(e) => setBackupSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Backup List Table / Cards */}
          {isLoadingBackups ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              서버 백업 목록을 조회 중입니다...
            </div>
          ) : filteredServerBackups.length === 0 ? (
            <div style={{
              padding: '36px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <Cloud size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>저장된 서버 백업 파일이 없습니다.</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                위의 <strong>'전체 데이터 백업 서버에 저장하기'</strong> 버튼을 클릭하여 첫 번째 백업을 생성해 보세요!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredServerBackups.map((bk) => (
                <div
                  key={bk.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {bk.title}
                      </span>
                      <span style={{
                        padding: '1px 7px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: bk.cycleType === 'daily' || bk.cycleType === 'weekly' || bk.cycleType === 'monthly' ? '#f0fdf4' : (bk.cycleType === 'file_upload' ? '#f5f3ff' : '#eff6ff'),
                        color: bk.cycleType === 'daily' || bk.cycleType === 'weekly' || bk.cycleType === 'monthly' ? '#15803d' : (bk.cycleType === 'file_upload' ? '#7c3aed' : '#1d4ed8')
                      }}>
                        {bk.cycleType === 'daily' ? '매일자동' : bk.cycleType === 'weekly' ? '매주자동' : bk.cycleType === 'monthly' ? '매월자동' : (bk.cycleType === 'file_upload' ? '파일업로드' : '수동백업')}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        📅 {bk.date} {bk.time}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        작업자: {bk.creator}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                        {bk.sizeFormatted} ({bk.totalCount?.toLocaleString()}건)
                      </span>
                    </div>

                    {/* Breakdown counts pills */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {bk.recordCounts?.partners > 0 && <span style={{ fontSize: '0.72rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '3px', color: '#475569' }}>거래처 {bk.recordCounts.partners}</span>}
                      {bk.recordCounts?.products > 0 && <span style={{ fontSize: '0.72rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '3px', color: '#475569' }}>품목 {bk.recordCounts.products}</span>}
                      {bk.recordCounts?.salesInvoices > 0 && <span style={{ fontSize: '0.72rem', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '3px', color: '#047857' }}>매출전표 {bk.recordCounts.salesInvoices}</span>}
                      {bk.recordCounts?.purchaseInvoices > 0 && <span style={{ fontSize: '0.72rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: '3px', color: '#1d4ed8' }}>매입전표 {bk.recordCounts.purchaseInvoices}</span>}
                      {bk.recordCounts?.salesOrders > 0 && <span style={{ fontSize: '0.72rem', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '3px', color: '#b45309' }}>수주 {bk.recordCounts.salesOrders}</span>}
                      {bk.recordCounts?.purchaseOrders > 0 && <span style={{ fontSize: '0.72rem', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '3px', color: '#b45309' }}>발주 {bk.recordCounts.purchaseOrders}</span>}
                      {bk.recordCounts?.quotations > 0 && <span style={{ fontSize: '0.72rem', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '1px 5px', borderRadius: '3px', color: '#6d28d9' }}>주문서 {bk.recordCounts.quotations}</span>}
                      {bk.recordCounts?.inventoryTransfers > 0 && <span style={{ fontSize: '0.72rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '3px', color: '#475569' }}>재고이동 {bk.recordCounts.inventoryTransfers}</span>}
                      {bk.recordCounts?.actionLogs > 0 && <span style={{ fontSize: '0.72rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '3px', color: '#475569' }}>최근로그 {bk.recordCounts.actionLogs}</span>}
                    </div>
                  </div>

                  {/* Actions for this backup */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* 서버에서 바로 불러오기 (원클릭 복원) */}
                    <button
                      type="button"
                      onClick={() => handleRestoreFromServer(bk)}
                      disabled={isRestoringServer || !isAdmin}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: isAdmin ? 'pointer' : 'not-allowed',
                        boxShadow: '0 1px 3px rgba(37,99,235,0.3)'
                      }}
                      title="서버에서 바로 파일 불러와서 시스템 복원"
                    >
                      <Sparkles size={14} /> 서버에서 바로 불러오기
                    </button>

                    {/* PC 다운로드 */}
                    <button
                      type="button"
                      onClick={() => handleDownloadServerBackup(bk)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="PC로 파일 다운로드"
                    >
                      <Download size={14} /> 다운로드
                    </button>

                    {/* 삭제 */}
                    <button
                      type="button"
                      onClick={() => handleDeleteServerBackup(bk)}
                      disabled={!isAdmin}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '7px 9px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isAdmin ? 'pointer' : 'not-allowed'
                      }}
                      title="서버 백업 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- 3. 데이터별 개별 삭제 섹션 --- */}
        <div style={{
          margin: '0 32px 24px 32px',
          padding: '20px',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #fee2e2',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={20} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#991b1b' }}>데이터별 개별 삭제 (카테고리별)</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              전체 초기화 없이 원하는 데이터만 안전하게 선별 삭제
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 14px 0' }}>
            전체 초기화 대신 특정 영역의 데이터만 영구 삭제하고 초기 상태로 되돌립니다. 삭제 전 반드시 위에서 백업(서버 저장 또는 파일 저장)을 진행해 주세요.
          </p>

          {/* 기간 선택 컨트롤 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#fff',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>삭제 대상 기간:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', fontWeight: deleteMode === 'all' ? 700 : 500, color: deleteMode === 'all' ? '#dc2626' : '#64748b' }}>
                <input 
                  type="radio" 
                  name="dataManagerDeleteMode" 
                  checked={deleteMode === 'all'} 
                  onChange={() => setDeleteMode('all')} 
                />
                전체 기간
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', fontWeight: deleteMode === 'period' ? 700 : 500, color: deleteMode === 'period' ? '#dc2626' : '#64748b' }}>
                <input 
                  type="radio" 
                  name="dataManagerDeleteMode" 
                  checked={deleteMode === 'period'} 
                  onChange={() => setDeleteMode('period')} 
                />
                기간 지정 삭제
              </label>
            </div>

            {deleteMode === 'period' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#64748b" />
                <input 
                  type="date" 
                  value={deleteStartDate} 
                  onChange={(e) => setDeleteStartDate(e.target.value)} 
                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>~</span>
                <input 
                  type="date" 
                  value={deleteEndDate} 
                  onChange={(e) => setDeleteEndDate(e.target.value)} 
                  style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🛡️ 전표 삭제 시 실시간 최종재고(현재고)는 변동되지 않고 안전하게 보존됩니다.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('partner', '거래처')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 거래처 데이터 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('product', '품목')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 품목 데이터 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('salesLedger', '매출처원장')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 매출원장/전표 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('purchaseLedger', '매입처원장')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 매입원장/전표 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('orders', '수주 및 발주')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 수주/발주 데이터 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('quotations', '주문서/견적서')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 주문서/견적서 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('inventoryTransfer', '재고이동내역')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 재고이동내역 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('actionLogs', '최근처리현황')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 최근처리현황 로그 삭제
            </button>
            <button 
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteCategory('schedules', '일정 및 로그')}
              style={{
                padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Trash2 size={14} /> 일정/로그 데이터 삭제
            </button>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="data-guide-footer">
          <div className="guide-title">
            <ShieldAlert size={20} color="#3b82f6" />
            <span>안전한 클라우드 백업 및 데이터 관리 가이드</span>
          </div>
          <ul className="guide-list">
            <li><strong>클라우드 서버 백업:</strong> 파이어베이스 클라우드 서버에 전체 데이터를 실시간으로 보관하여 PC 기기 변경이나 분실 시에도 즉시 복원할 수 있습니다.</li>
            <li><strong>자동 백업 주기:</strong> '매일 1회' 설정 시 관리자가 로그인할 때 하루 1회 자동으로 백업본을 클라우드 서버에 생성합니다.</li>
            <li><strong>원클릭 서버 복원:</strong> 백업 목록에서 '서버에서 바로 불러오기' 버튼을 누르면 다운로드나 파일 업로드 없이 클라우드에서 즉시 1초 만에 복원됩니다.</li>
            <li><strong>전체 데이터 삭제:</strong> 파이어베이스에 저장된 모든 데이터(거래처, 품목, 매출/매입, 입금/출금, 수주/발주, 주문서, 재고이동, 최근현황, 번들)를 영구 삭제합니다.</li>
          </ul>
        </div>
      </WindowModal>

      {/* 비밀번호 확인 모달 */}
      {isPasswordModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626'
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>
                  전체 데이터 영구 삭제 인증
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  시스템 관리자 확인이 필요합니다
                </span>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: '#991b1b',
              lineHeight: 1.5
            }}>
              ⚠️ <strong>경고:</strong> 모든 거래처, 상품, 매출/매입전표, 수주/발주, 주문서, 재고이동내역, 최근처리현황 및 파이어베이스에 저장된 모든 데이터가 영구 삭제됩니다. 삭제 후 결코 되돌릴 수 없습니다.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                관리자 비밀번호 입력
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="관리자 계정 비밀번호를 입력하세요"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmDelete();
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '8px',
                    border: passwordError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px', fontWeight: 600 }}>
                  {passwordError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setAdminPassword('');
                  setPasswordError('');
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1.5,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? '영구 삭제 진행 중...' : '확인 (영구 삭제)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataManager;
