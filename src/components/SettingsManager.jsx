import React, { useState } from 'react';
import { Settings, Building2, UserCircle, Monitor, ShieldCheck, Bell, Save, X, Globe, Printer, Database, FileText, AlertTriangle } from 'lucide-react';
import WindowModal from './WindowModal';
import './SettingsManager.css';

const SettingsManager = ({ onClose, currentUser, settings, onSave, companySettings, onSaveBranding, onSaveCompanyInfo }) => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [localSettings, setLocalSettings] = useState(() => {
    const initial = { ...settings };
    if (!initial.company) initial.company = {};
    if (!initial.salesInvoice) initial.salesInvoice = { warnNoStock: true, saveMode: 'auto' };
    if (!initial.salesInvoice.saveMode) initial.salesInvoice.saveMode = 'auto';
    // Sync company info from onboarding (companySettings) with fallback to existing settings
    initial.company.name = companySettings?.name || initial.company.name || '';
    initial.company.bizNum = companySettings?.businessNo || initial.company.bizNum || '';
    initial.company.ceo = companySettings?.ceo || initial.company.ceo || '';
    initial.company.address = companySettings?.address || initial.company.address || '';
    initial.company.tel = companySettings?.phone || initial.company.tel || '';
    initial.company.email = companySettings?.email || initial.company.email || '';
    initial.company.type = companySettings?.type || initial.company.type || '';
    return initial;
  });
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
        businessNo: localSettings.company.bizNum,
        ceo: localSettings.company.ceo,
        address: localSettings.company.address,
        phone: localSettings.company.tel,
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
    { id: 'user', label: '사용자 설정', icon: UserCircle },
    { id: 'system', label: '시스템/테마', icon: Monitor },
    { id: 'transaction', label: '거래/서식', icon: Printer },
    { id: 'salesInvoice', label: '매출전표', icon: FileText },
    { id: 'margin', label: '마진율 설정', icon: Database },
    { id: 'security', label: '보안/권한', icon: ShieldCheck },
    { id: 'notification', label: '알림 설정', icon: Bell },
  ];

  return (
    <WindowModal title="환경설정" onClose={onClose} width="1100px">
      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {categories.map(cat => (
            <div 
              key={cat.id} 
              className={`settings-sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <cat.icon size={20} />
              {cat.label}
            </div>
          ))}
          <div style={{ marginTop: 'auto', padding: '20px 24px', fontSize: '0.8rem', color: '#94a3b8' }}>
            시스템 버전: v2.4.0 (Stable)
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
                    <input type="text" value={localSettings.company.name} onChange={e => updateCompany('name', e.target.value)} disabled={currentUser?.role !== '슈퍼관리자'} />
                  </div>
                  <div className="settings-field">
                    <label>사업자 등록번호</label>
                    <input type="text" value={localSettings.company.bizNum} onChange={e => updateCompany('bizNum', e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label>대표자명</label>
                    <input type="text" value={localSettings.company.ceo} onChange={e => updateCompany('ceo', e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label>업태/종목</label>
                    <input type="text" value={localSettings.company.type} onChange={e => updateCompany('type', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 className="settings-section-title">연락처 및 주소</h3>
                <div className="settings-grid">
                  <div className="settings-field" style={{ gridColumn: 'span 2' }}>
                    <label>본사 주소</label>
                    <input type="text" value={localSettings.company.address} onChange={e => updateCompany('address', e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label>대표 전화</label>
                    <input type="text" value={localSettings.company.tel} onChange={e => updateCompany('tel', e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label>대표 이메일</label>
                    <input type="email" value={localSettings.company.email} onChange={e => updateCompany('email', e.target.value)} />
                  </div>
                </div>
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
                      <h4>다크 모드 사용</h4>
                      <p>어두운 테마로 눈의 피로를 줄입니다.</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={localSettings.display.darkMode} onChange={e => updateDisplay('darkMode', e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                  </div>
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

              <div className="settings-section">
                <h3 className="settings-section-title">
                  <FileText size={16} style={{ display: 'inline', marginRight: '6px', color: '#10b981', verticalAlign: 'middle' }} />
                  전표 저장 및 발행 옵션
                </h3>
                <div className="toggle-group">
                  <div className="toggle-item" style={{ alignItems: 'flex-start', gap: '16px' }}>
                    <div className="toggle-info">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        실시간 자동 저장
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                          backgroundColor: (localSettings.salesInvoice?.saveMode !== 'manual') ? '#d1fae5' : '#f1f5f9',
                          color: (localSettings.salesInvoice?.saveMode !== 'manual') ? '#065f46' : '#94a3b8',
                          borderRadius: '20px', border: '1px solid',
                          borderColor: (localSettings.salesInvoice?.saveMode !== 'manual') ? '#a7f3d0' : '#e2e8f0'
                        }}>
                          {(localSettings.salesInvoice?.saveMode !== 'manual') ? '활성화' : '비활성화'}
                        </span>
                      </h4>
                      <p style={{ marginTop: '6px' }}>
                        활성화 시 매출전표 품목 추가, 수정, 삭제 시 즉시 데이터베이스에 자동으로 반영(저장)합니다.<br />
                        <strong>비활성화 시:</strong> 품목 추가 시 자동 저장되지 않으며, 우하단의 <strong>&ldquo;전표 저장하기&rdquo;</strong> 버튼을 눌러 수동 저장합니다.
                      </p>
                    </div>
                    <label className="switch" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <input
                        type="checkbox"
                        checked={localSettings.salesInvoice?.saveMode !== 'manual'}
                        onChange={e => {
                          updateSalesInvoice('saveMode', e.target.checked ? 'auto' : 'manual');
                        }}
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
    </WindowModal>
  );
};

export default SettingsManager;
