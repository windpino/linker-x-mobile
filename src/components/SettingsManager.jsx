import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Building2, UserCircle, Users, UserPlus, Monitor, ShieldCheck, Bell, Save, X, Globe, Printer, Database, FileText, AlertTriangle, Mail, CheckCircle2, CreditCard } from 'lucide-react';
import WindowModal from './WindowModal';
import { callAuth } from '../auth/client';
import PaidSubscriptionModal from './common/PaidSubscriptionModal';
import './SettingsManager.css';

const SettingsManager = ({ onClose, currentUser, settings, onSave, companySettings, onSaveBranding, onSaveCompanyInfo, staffList = [] }) => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(() => {
    const initial = { ...settings };
    if (!initial.display) initial.display = {};
    if (initial.display.showMenuIcons === undefined) initial.display.showMenuIcons = true;
    if (!initial.company) initial.company = {};
    if (!initial.salesInvoice) initial.salesInvoice = { warnNoStock: true, saveMode: 'auto' };
    if (!initial.salesInvoice.saveMode) initial.salesInvoice.saveMode = 'auto';

    // 최초 가입 시 입력한 정보(회사명, 사업자등록번호, 대표자명, 연락처, 이메일 등) 자동 매핑
    const autoName = companySettings?.name || companySettings?.companyName || currentUser?.companyName || currentUser?.company || '';
    const autoBizNum = companySettings?.businessNo || companySettings?.bizNum || companySettings?.businessNumber || companySettings?.bno || currentUser?.businessNo || currentUser?.bizNum || '';
    const autoCeo = companySettings?.ceo || companySettings?.representative || companySettings?.manager || currentUser?.name || currentUser?.ceo || '';
    const autoAddress = companySettings?.address || companySettings?.addr || '';
    const autoTel = companySettings?.phone || companySettings?.managerContact || companySettings?.tel || companySettings?.contact || currentUser?.phone || currentUser?.tel || '';
    const autoEmail = companySettings?.email || currentUser?.email || '';
    const autoType = companySettings?.type || companySettings?.businessType || '';

    initial.company.name = initial.company.name || autoName;
    initial.company.bizNum = initial.company.bizNum || autoBizNum;
    initial.company.ceo = initial.company.ceo || autoCeo;
    initial.company.address = initial.company.address || autoAddress;
    initial.company.tel = initial.company.tel || autoTel;
    initial.company.email = initial.company.email || autoEmail;
    initial.company.type = initial.company.type || autoType;
    return initial;
  });

  const canEditCompany = Boolean(
    currentUser?.role === '슈퍼관리자' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'representative' ||
    currentUser?.role === 'ceo' ||
    currentUser?.role === 'owner' ||
    currentUser?.role === 'company' ||
    currentUser?.authRole === 'tenant_admin' ||
    currentUser?.isCompanyAdmin === true ||
    currentUser?.isMasterAdmin === true ||
    currentUser?.isTenantAdmin === true ||
    currentUser?.jobTitle === '대표' ||
    currentUser?.jobTitle === '대표자' ||
    currentUser?.jobTitle === '대표이사' ||
    currentUser?.userId === 'admin' ||
    currentUser?.userId === 'sadmin' ||
    currentUser?.userId === 'madmin' ||
    (currentUser?.companyId && currentUser?.userId && String(currentUser.userId).trim().toLowerCase() === String(currentUser.companyId).trim().toLowerCase())
  );

  // companySettings 또는 currentUser 비동기 로드 완료 시 빈 필드 자동 보정
  useEffect(() => {
    setLocalSettings(prev => {
      const currentComp = prev.company || {};
      const autoName = companySettings?.name || companySettings?.companyName || currentUser?.companyName || currentUser?.company || '';
      const autoBizNum = companySettings?.businessNo || companySettings?.bizNum || companySettings?.businessNumber || companySettings?.bno || currentUser?.businessNo || currentUser?.bizNum || '';
      const autoCeo = companySettings?.ceo || companySettings?.representative || companySettings?.manager || currentUser?.name || currentUser?.ceo || '';
      const autoAddress = companySettings?.address || companySettings?.addr || '';
      const autoTel = companySettings?.phone || companySettings?.managerContact || companySettings?.tel || companySettings?.contact || currentUser?.phone || currentUser?.tel || '';
      const autoEmail = companySettings?.email || currentUser?.email || '';
      const autoType = companySettings?.type || companySettings?.businessType || '';

      let changed = false;
      const nextComp = { ...currentComp };

      if (!nextComp.name && autoName) { nextComp.name = autoName; changed = true; }
      if (!nextComp.bizNum && autoBizNum) { nextComp.bizNum = autoBizNum; changed = true; }
      if (!nextComp.ceo && autoCeo) { nextComp.ceo = autoCeo; changed = true; }
      if (!nextComp.address && autoAddress) { nextComp.address = autoAddress; changed = true; }
      if (!nextComp.tel && autoTel) { nextComp.tel = autoTel; changed = true; }
      if (!nextComp.email && autoEmail) { nextComp.email = autoEmail; changed = true; }
      if (!nextComp.type && autoType) { nextComp.type = autoType; changed = true; }

      return changed ? { ...prev, company: nextComp } : prev;
    });
  }, [companySettings, currentUser]);
  const [localBranding, setLocalBranding] = useState(companySettings?.theme || { primaryColor: '#3b82f6', logoUrl: null });
  const themeColors = ['#3b82f6', '#8b5cf6', '#f97316', '#14b8a6', '#22c55e', '#334155', '#ec4899', '#eab308'];
  const [purchaseThemeColor, setPurchaseThemeColor] = useState(
    settings?.display?.purchaseThemeColor || '#3b82f6'
  );
  const [salesThemeColor, setSalesThemeColor] = useState(
    settings?.display?.salesThemeColor || '#3b82f6'
  );
  const [orderThemeColor, setOrderThemeColor] = useState(
    settings?.display?.orderThemeColor || '#3b82f6'
  );

  // 직원 초대 관리 상태
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    selectedStaffId: '',
    staffName: '',
    phone: '',
    targetEmail: '',
    permissions: {
      orders: true,
      loading: true,
      delivery: true,
      invoices: false,
      inventory: true,
      catalog: false,
      reports: false
    }
  });
  const [invitations, setInvitations] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadInvitations = useCallback(() => {
    const cid = currentUser?.companyId;
    if (!cid) return;
    const all = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
    setInvitations(all.filter(i => i.companyId === cid && i.type === 'staff'));
  }, [currentUser?.companyId]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.targetEmail.trim()) {
      alert('직원 이메일을 입력해 주세요.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await callAuth('createStaffInvitation', {
        companyId: currentUser?.companyId,
        companyName: currentUser?.companyName,
        targetEmail: inviteForm.targetEmail.trim(),
        staffName: inviteForm.staffName.trim(),
        phone: inviteForm.phone.trim(),
        staffId: inviteForm.selectedStaffId || `staff_${Date.now()}`,
        permissions: inviteForm.permissions
      });
      alert(`[${res.targetEmail}] 주소로 직원 초대가 발송되었습니다.\n직원이 자기 이메일 계정으로 로그인 후 초대를 수락하면 연결됩니다.`);
      setShowInviteModal(false);
      setInviteForm({
        selectedStaffId: '',
        staffName: '',
        phone: '',
        targetEmail: '',
        permissions: { orders: true, loading: true, delivery: true, invoices: false, inventory: true, catalog: false, reports: false }
      });
      loadInvitations();
    } catch (err) {
      alert('초대 발송 실패: ' + (err.message || '오류가 발생했습니다.'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = (invId) => {
    if (!window.confirm('해당 직원 초대를 취소하시겠습니까?')) return;
    const all = JSON.parse(localStorage.getItem('dev_invitations') || '[]');
    const next = all.filter(i => i.id !== invId);
    localStorage.setItem('dev_invitations', JSON.stringify(next));
    loadInvitations();
  };

  const handleSave = () => {
    const updatedSettings = {
      ...localSettings,
      display: {
        ...localSettings.display,
        purchaseThemeColor,
        salesThemeColor,
        orderThemeColor
      }
    };

    onSave(updatedSettings);
    if (onSaveBranding) {
      onSaveBranding(localBranding);
    }
    if (onSaveCompanyInfo) {
      onSaveCompanyInfo({
        name: localSettings.company.name,
        companyName: localSettings.company.name,
        businessNo: localSettings.company.bizNum,
        bizNum: localSettings.company.bizNum,
        ceo: localSettings.company.ceo,
        address: localSettings.company.address,
        phone: localSettings.company.tel,
        tel: localSettings.company.tel,
        managerContact: localSettings.company.tel,
        email: localSettings.company.email,
        type: localSettings.company.type
      });
    }
    alert('변경사항이 적용 되었습니다.');
  };

  const updateCompany = (field, value) => {
    setLocalSettings({
      ...localSettings,
      company: { ...localSettings.company, [field]: value }
    });
  };

  const updateDisplay = (field, value) => {
    setLocalSettings({
      ...localSettings,
      display: { ...localSettings.display, [field]: value }
    });
  };

  const updateTransaction = (field, value) => {
    setLocalSettings({
      ...localSettings,
      transaction: { ...localSettings.transaction, [field]: value }
    });
  };

  const updateSalesInvoice = (field, value) => {
    setLocalSettings({
      ...localSettings,
      salesInvoice: { ...localSettings.salesInvoice, [field]: value }
    });
  };

  const categories = [
    { id: 'general', label: '기본 정보', icon: Building2 },
    { id: 'members', label: '구성원 관리 (직원 초대)', icon: Users },
    { id: 'user', label: '사용자 설정', icon: UserCircle },
    { id: 'system', label: '시스템/테마', icon: Monitor },
    { id: 'transaction', label: '거래/서식', icon: Printer },
    { id: 'salesInvoice', label: '매출전표', icon: FileText },
    { id: 'margin', label: '마진율 설정', icon: Database },
    { id: 'security', label: '보안/권한', icon: ShieldCheck },
    { id: 'notification', label: '알림 설정', icon: Bell },
  ];

  return (
    <WindowModal title="환경설정" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div className="settings-container">
        {/* Category Tabs */}
        <div className="settings-sidebar">
          {categories.map(cat => (
            <div 
              key={cat.id} 
              className={`settings-sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <cat.icon size={15} />
              <span>{cat.label}</span>
            </div>
          ))}
          <div
            className="settings-sidebar-item"
            onClick={() => setPaidModalOpen(true)}
            style={{ color: '#d97706', fontWeight: 800, marginTop: '8px', borderTop: '1px dashed #cbd5e1' }}
          >
            <CreditCard size={15} />
            <span>유료 전환 / 계약</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="settings-content">
          {activeCategory === 'general' && (
            <div className="category-view">
              <div className="settings-title-group">
                <h2 className="settings-title">기본 정보 설정</h2>
                <p className="settings-subtitle">회사 정보 및 비즈니스 기본 설정을 관리합니다.</p>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">회사 프로필</h3>
                <div className="settings-grid">
                  <div className="settings-field">
                    <label>상호명</label>
                    <input 
                      type="text" 
                      value={localSettings.company.name} 
                      onChange={e => updateCompany('name', e.target.value)} 
                      disabled={!canEditCompany} 
                    />
                  </div>
                  <div className="settings-field">
                    <label>사업자 등록번호</label>
                    <input type="text" value={localSettings.company.bizNum} onChange={e => updateCompany('bizNum', e.target.value)} disabled={!canEditCompany} />
                  </div>
                  <div className="settings-field">
                    <label>대표자명</label>
                    <input type="text" value={localSettings.company.ceo} onChange={e => updateCompany('ceo', e.target.value)} disabled={!canEditCompany} />
                  </div>
                  <div className="settings-field">
                    <label>업태/종목</label>
                    <input type="text" value={localSettings.company.type} onChange={e => updateCompany('type', e.target.value)} disabled={!canEditCompany} />
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">연락처 및 주소</h3>
                <div className="settings-grid">
                  <div className="settings-field" style={{ gridColumn: 'span 2' }}>
                    <label>본사 주소</label>
                    <input type="text" value={localSettings.company.address} onChange={e => updateCompany('address', e.target.value)} disabled={!canEditCompany} />
                  </div>
                  <div className="settings-field">
                    <label>대표 전화</label>
                    <input type="text" value={localSettings.company.tel} onChange={e => updateCompany('tel', e.target.value)} disabled={!canEditCompany} />
                  </div>
                  <div className="settings-field">
                    <label>대표 이메일</label>
                    <input type="email" value={localSettings.company.email} onChange={e => updateCompany('email', e.target.value)} disabled={!canEditCompany} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'members' && (
            <div className="category-view">
              <div className="settings-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <h2 className="settings-title">구성원 관리 (직원 초대)</h2>
                  <p className="settings-subtitle">회사의 직원을 초대하고 담당 업무 권한을 지정합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                  }}
                >
                  <UserPlus size={16} /> 새 직원 초대하기
                </button>
              </div>

              {/* 모바일 직원 초대 발송 모달 */}
              {showInviteModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '16px'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '440px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '20px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                          <UserPlus size={16} />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>새 직원 초대 발송</h3>
                      </div>
                      <button onClick={() => setShowInviteModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSendInvite}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>기존 등록 직원 선택 (선택)</label>
                          <select
                            value={inviteForm.selectedStaffId}
                            onChange={(e) => {
                              const sId = e.target.value;
                              const found = staffList.find(s => (s.id || s.staffId) === sId);
                              if (found) {
                                setInviteForm(prev => ({
                                  ...prev,
                                  selectedStaffId: sId,
                                  staffName: found.name || found.staffName || '',
                                  phone: found.phone || '',
                                  targetEmail: found.email || prev.targetEmail
                                }));
                              } else {
                                setInviteForm(prev => ({
                                  ...prev,
                                  selectedStaffId: '',
                                  staffName: '',
                                  phone: ''
                                }));
                              }
                            }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          >
                            <option value="">직접 입력 (신규 직원)</option>
                            {staffList.map((s, idx) => (
                              <option key={s.id || s.staffId || idx} value={s.id || s.staffId}>
                                {s.name || s.staffName} ({s.position || '직원'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>직원 성명 *</label>
                          <input
                            type="text"
                            required
                            value={inviteForm.staffName}
                            onChange={e => setInviteForm(prev => ({ ...prev, staffName: e.target.value }))}
                            placeholder="홍길동"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>전화번호</label>
                          <input
                            type="tel"
                            value={inviteForm.phone}
                            onChange={e => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="010-0000-0000"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>직원 개인 이메일 * (로그인 계정)</label>
                          <input
                            type="email"
                            required
                            value={inviteForm.targetEmail}
                            onChange={e => setInviteForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                            placeholder="staff@example.com"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0 0' }}>
                            ※ 공용 계정/비밀번호 발급 없이, 본인 이메일로 로그인 후 수락합니다.
                          </p>
                        </div>

                        {/* 업무 권한 지정 */}
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>업무 권한 부여</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {[
                              { id: 'orders', label: '주문 관리 (접수/조회)' },
                              { id: 'loading', label: '상차 검수 (바코드/패킹)' },
                              { id: 'delivery', label: '배송 현황 관리' },
                              { id: 'invoices', label: '전표/매출 발행' },
                              { id: 'inventory', label: '재고/창고 관리' },
                              { id: 'catalog', label: '품목/카탈로그 관리' },
                              { id: 'reports', label: '통계/경영 리포트' },
                            ].map(p => (
                              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={!!inviteForm.permissions[p.id]}
                                  onChange={e => setInviteForm(prev => ({
                                    ...prev,
                                    permissions: { ...prev.permissions, [p.id]: e.target.checked }
                                  }))}
                                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                                />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            disabled={inviteLoading}
                            style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            {inviteLoading ? '발송 중...' : '초대장 발송'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 발송된 초대 목록 */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <Mail size={16} style={{ display: 'inline', marginRight: '6px', color: '#2563eb', verticalAlign: 'middle' }} />
                  초대 진행 상태 ({invitations.length}건)
                </h3>
                {invitations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    대기 중인 직원 초대가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invitations.map(inv => (
                      <div key={inv.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{inv.targetEmail}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{inv.staffName || '이름 미기재'}</div>
                          </div>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: inv.status === 'accepted' ? '#dcfce7' : '#fef3c7',
                            color: inv.status === 'accepted' ? '#166534' : '#92400e'
                          }}>
                            {inv.status === 'accepted' ? '수락 완료' : '대기중'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {Object.entries(inv.permissions || {}).filter(([_, v]) => v).map(([k]) => (
                            <span key={k} style={{ fontSize: '0.68rem', padding: '1px 5px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '4px' }}>
                              {k === 'orders' ? '주문' : k === 'loading' ? '상차' : k === 'delivery' ? '배송' : k === 'invoices' ? '전표' : k === 'inventory' ? '재고' : k === 'catalog' ? '카탈로그' : k}
                            </span>
                          ))}
                        </div>
                        {inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelInvite(inv.id)}
                            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#dc2626', cursor: 'pointer' }}
                          >
                            초대 취소
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 기존 직원 목록 */}
              <div className="settings-section">
                <h3 className="settings-section-title">
                  <Users size={16} style={{ display: 'inline', marginRight: '6px', color: '#475569', verticalAlign: 'middle' }} />
                  기존 직원 목록 ({staffList.length}명)
                </h3>
                {staffList.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    등록된 직원 데이터가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {staffList.map((s, idx) => {
                      const linked = invitations.find(i => (i.staffId === (s.id || s.staffId) || i.targetEmail === s.email) && i.status === 'accepted');
                      return (
                        <div key={s.id || s.staffId || idx} style={{ padding: '10px 12px', border: '1px solid #f1f5f9', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>{s.name || s.staffName} ({s.position || '직원'})</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.phone || '-'}</div>
                          </div>
                          <div>
                            {linked ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700 }}>
                                <CheckCircle2 size={12} /> 연동됨
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>미연결</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === 'user' && (
            <div className="category-view">
              <div className="settings-title-group">
                <h2 className="settings-title">사용자 개인 설정</h2>
                <p className="settings-subtitle">로그인 정보 및 프로필을 관리합니다.</p>
              </div>
              <div className="settings-section">
                <h3 className="settings-section-title">내 프로필</h3>
                <div className="settings-grid">
                  <div className="settings-field">
                    <label>이름</label>
                    <input type="text" defaultValue={currentUser?.name} />
                  </div>
                  <div className="settings-field">
                    <label>아이디</label>
                    <input type="text" defaultValue={currentUser?.userId} disabled />
                  </div>
                  <div className="settings-field">
                    <label>직급</label>
                    <input type="text" defaultValue={currentUser?.jobTitle} />
                  </div>
                  <div className="settings-field">
                    <label>현재 비밀번호</label>
                    <input type="password" placeholder="********" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'system' && (
            <div className="category-view">
              <div className="settings-title-group">
                <h2 className="settings-title">시스템 및 테마</h2>
                <p className="settings-subtitle">애플리케이션의 시각적 및 기능적 환경을 설정합니다.</p>
              </div>
              <div className="settings-section">
                <h3 className="settings-section-title">디스플레이 설정</h3>
                <div className="toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>효과음 재생</h4>
                      <p>메뉴 클릭 및 알림 시 효과음을 재생합니다.</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={localSettings.display.soundEffects} onChange={e => updateDisplay('soundEffects', e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>대시보드 실시간 업데이트</h4>
                      <p>데이터 변경 시 대시보드를 즉시 갱신합니다.</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={localSettings.display.realTimeUpdate} onChange={e => updateDisplay('realTimeUpdate', e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>하위 메뉴 아이콘 표시</h4>
                      <p>메뉴 내 각 하위 메뉴 앞에 아이콘을 표시합니다.</p>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={localSettings.display.showMenuIcons ?? true} 
                        onChange={e => updateDisplay('showMenuIcons', e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">지역 및 언어</h3>
                <div className="settings-grid">
                  <div className="settings-field">
                    <label>표시 언어</label>
                    <select value={localSettings.language} onChange={e => setLocalSettings({...localSettings, language: e.target.value})}>
                      <option>한국어 (Korean)</option>
                      <option>English (US)</option>
                      <option>日本語 (Japanese)</option>
                    </select>
                  </div>
                  <div className="settings-field">
                    <label>시간대 (Timezone)</label>
                    <select value={localSettings.timezone} onChange={e => setLocalSettings({...localSettings, timezone: e.target.value})}>
                      <option>(GMT+09:00) Seoul</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">시스템 UI 테마 색상 (주문창 및 전표창)</h3>
                <div className="settings-grid">
                  <div className="settings-field" style={{ gridColumn: 'span 2', marginBottom: '16px' }}>
                    <label>매입전표 테마 색상</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      {themeColors.map(c => (
                        <div 
                          key={c} 
                          onClick={() => setPurchaseThemeColor(c)}
                          style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            backgroundColor: c, 
                            cursor: 'pointer', 
                            border: purchaseThemeColor === c ? '3px solid #1e293b' : '2px solid transparent', 
                            boxShadow: purchaseThemeColor === c ? '0 0 0 2px #fff inset' : 'none',
                            transition: 'all 0.2s'
                          }}
                          title="매입전표 테마 색상 선택"
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="settings-field" style={{ gridColumn: 'span 2', marginBottom: '16px' }}>
                    <label>매출전표 테마 색상</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      {themeColors.map(c => (
                        <div 
                          key={c} 
                          onClick={() => setSalesThemeColor(c)}
                          style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            backgroundColor: c, 
                            cursor: 'pointer', 
                            border: salesThemeColor === c ? '3px solid #1e293b' : '2px solid transparent', 
                            boxShadow: salesThemeColor === c ? '0 0 0 2px #fff inset' : 'none',
                            transition: 'all 0.2s'
                          }}
                          title="매출전표 테마 색상 선택"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="settings-field" style={{ gridColumn: 'span 2' }}>
                    <label>주문서 테마 색상</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      {themeColors.map(c => (
                        <div 
                          key={c} 
                          onClick={() => setOrderThemeColor(c)}
                          style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            backgroundColor: c, 
                            cursor: 'pointer', 
                            border: orderThemeColor === c ? '3px solid #1e293b' : '2px solid transparent', 
                            boxShadow: orderThemeColor === c ? '0 0 0 2px #fff inset' : 'none',
                            transition: 'all 0.2s'
                          }}
                          title="주문서 테마 색상 선택"
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                      선택한 색상은 각 전표 및 주문창의 전체 테마 색상으로 개별 적용됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">테넌트 브랜딩 (고급 설정)</h3>
                <div className="settings-grid">
                  <div className="settings-field">
                    <label>브랜드 테마 색상 (Primary Color)</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={localBranding.primaryColor} 
                        onChange={e => setLocalBranding({...localBranding, primaryColor: e.target.value})} 
                        style={{ width: '50px', height: '40px', padding: '2px' }}
                      />
                      <input 
                        type="text" 
                        value={localBranding.primaryColor} 
                        onChange={e => setLocalBranding({...localBranding, primaryColor: e.target.value})}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>회사 로고 이미지 URL (HTTPS 권장)</label>
                    <input 
                      type="text" 
                      placeholder="https://example.com/logo.png" 
                      value={localBranding.logoUrl || ''} 
                      onChange={e => setLocalBranding({...localBranding, logoUrl: e.target.value})} 
                    />
                  </div>
                </div>
                {localBranding.logoUrl && (
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>로고 미리보기</p>
                    <img src={localBranding.logoUrl} alt="Preview" style={{ maxHeight: '40px', objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === 'transaction' && (
            <div className="category-view">
              <div className="settings-title-group">
                <h2 className="settings-title">거래 및 서식 설정</h2>
                <p className="settings-subtitle">전표 및 보고서 인쇄 양식의 기본값을 설정합니다.</p>
              </div>
              <div className="settings-section">
                <h3 className="settings-section-title">세금 및 소수점</h3>
                <div className="settings-grid">
                  <div className="settings-field">
                    <label>기본 부가세율 (%)</label>
                    <input type="number" value={localSettings.transaction.defaultVat} onChange={e => updateTransaction('defaultVat', Number(e.target.value))} />
                  </div>
                  <div className="settings-field">
                    <label>금액 소수점 표시</label>
                    <select value={localSettings.transaction.decimalPlaces} onChange={e => updateTransaction('decimalPlaces', Number(e.target.value))}>
                      <option value={0}>표시 안 함 (0)</option>
                      <option value={1}>1자리</option>
                      <option value={2}>2자리</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="settings-section">
                <h3 className="settings-section-title">자동 번호 생성</h3>
                <div className="toggle-group">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>전표 번호 자동 생성</h4>
                      <p>날짜 기반의 전표 번호를 자동으로 부여합니다.</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={localSettings.transaction.autoNumbering} onChange={e => updateTransaction('autoNumbering', e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'salesInvoice' && (
            <div className="category-view">
              <div className="settings-title-group">
                <h2 className="settings-title">매출전표 설정</h2>
                <p className="settings-subtitle">매출전표 발행 시 동작 방식을 설정합니다.</p>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px', color: '#f59e0b', verticalAlign: 'middle' }} />
                  재고 관리 옵션
                </h3>
                <div className="toggle-group">
                  <div className="toggle-item" style={{ alignItems: 'flex-start', gap: '16px' }}>
                    <div className="toggle-info">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        재고 없음 경고 메시지 표시
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                          backgroundColor: (localSettings.salesInvoice?.warnNoStock !== false) ? '#fef3c7' : '#f1f5f9',
                          color: (localSettings.salesInvoice?.warnNoStock !== false) ? '#92400e' : '#94a3b8',
                          borderRadius: '20px', border: '1px solid',
                          borderColor: (localSettings.salesInvoice?.warnNoStock !== false) ? '#fde68a' : '#e2e8f0'
                        }}>
                          {(localSettings.salesInvoice?.warnNoStock !== false) ? '활성화' : '비활성화'}
                        </span>
                      </h4>
                      <p style={{ marginTop: '6px' }}>
                        매출전표 품목 추가 시, 해당 창고의 재고량이 <strong>0 이하</strong>(재고 없음)일 때
                        &ldquo;현재 재고가 없습니다. 그래도 전표를 발행할까요?&rdquo; 확인 메시지를 표시합니다.
                      </p>
                    </div>
                    <label className="switch" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <input
                        type="checkbox"
                        checked={localSettings.salesInvoice?.warnNoStock !== false}
                        onChange={e => updateSalesInvoice('warnNoStock', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

          <div className="settings-footer">
            <button className="btn-settings-cancel" onClick={onClose}>취소</button>
            <button className="btn-settings-save" onClick={handleSave}>변경 사항 저장</button>
          </div>
        </div>
      </div>

      <PaidSubscriptionModal
        isOpen={paidModalOpen}
        onClose={() => setPaidModalOpen(false)}
        currentUser={currentUser}
        isMobile={true}
      />
    </WindowModal>
  );
};

export default SettingsManager;
