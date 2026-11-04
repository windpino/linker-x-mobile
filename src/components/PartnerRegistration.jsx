import React, { useState, useEffect } from 'react';
import { 
  Building2, Phone, Users, Contact, Lock, Save, MapPin, 
  FileText, ChevronDown, ChevronUp, Check, X, ShieldAlert
} from 'lucide-react';
import WindowModal from './WindowModal';

const PartnerRegistration = ({ onClose, initialData, onSave, staffList = [], warehouses = [], accounts = [] }) => {
  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  const isEditing = !!initialData;
  const titleText = isEditing ? "거래처 정보 수정" : "간편 거래처 등록";

  const [showExtraDetails, setShowExtraDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    no: '0',
    type: '매출처',
    name: '',
    barcode: '',
    abbreviation: '',
    ceo: '',
    businessNo: '',
    address: '',
    phone: '',
    mobile: '',
    fax: '',
    email: '',
    sequence: '',
    manager: '-',
    warehouse: '-',
    bankAccount: '선택안함',
    creditLimit: '0',
    receivables: '0',
    receivableBase: '0',
    grade: '1',
    loginId: '',
    password: '',
    loginId2: '',
    password2: '',
    loginId3: '',
    password3: '',
    isMain1: false,
    isMain2: false,
    isMain3: false,
    hidePrice1: false,
    hidePrice2: false,
    hidePrice3: false,
    hideOrderInfo: false,
    hideAmountInInvoice: false,
    memo: '',
    orderAccounts: [
      { loginId: '', password: '', isMain: true, hidePrice: false },
      { loginId: '', password: '', isMain: false, hidePrice: false },
      { loginId: '', password: '', isMain: false, hidePrice: false }
    ]
  });

  useEffect(() => {
    if (initialData) {
      const orderAccounts = [
        {
          loginId: initialData.contacts?.[0]?.loginId || initialData.orderAccounts?.[0]?.loginId || initialData.loginId || '',
          password: initialData.contacts?.[0]?.password || initialData.orderAccounts?.[0]?.password || initialData.password || '',
          isMain: initialData.contacts?.[0]?.isMain !== undefined ? Boolean(initialData.contacts[0].isMain) : (initialData.isMain1 !== undefined ? Boolean(initialData.isMain1) : true),
          hidePrice: Boolean(initialData.contacts?.[0]?.hidePrice || initialData.orderAccounts?.[0]?.hidePrice || initialData.hidePrice1)
        },
        {
          loginId: initialData.contacts?.[1]?.loginId || initialData.orderAccounts?.[1]?.loginId || initialData.loginId2 || '',
          password: initialData.contacts?.[1]?.password || initialData.orderAccounts?.[1]?.password || initialData.password2 || '',
          isMain: Boolean(initialData.contacts?.[1]?.isMain || initialData.isMain2),
          hidePrice: Boolean(initialData.contacts?.[1]?.hidePrice || initialData.orderAccounts?.[1]?.hidePrice || initialData.hidePrice2)
        },
        {
          loginId: initialData.contacts?.[2]?.loginId || initialData.orderAccounts?.[2]?.loginId || initialData.loginId3 || '',
          password: initialData.contacts?.[2]?.password || initialData.orderAccounts?.[2]?.password || initialData.password3 || '',
          isMain: Boolean(initialData.contacts?.[2]?.isMain || initialData.isMain3),
          hidePrice: Boolean(initialData.contacts?.[2]?.hidePrice || initialData.orderAccounts?.[2]?.hidePrice || initialData.hidePrice3)
        }
      ];

      setFormData(prev => ({
        ...prev,
        ...initialData,
        orderAccounts,
        no: initialData.no?.toString() || '0',
        type: initialData.type || '매출처',
        name: initialData.name || '',
        phone: initialData.phone || initialData.mobile || '',
        mobile: initialData.mobile || '',
        manager: (initialData.manager && initialData.manager !== '-') ? initialData.manager : (safeStaffList[0]?.name || '-'),
        warehouse: (initialData.warehouse && initialData.warehouse !== '-') ? initialData.warehouse : '-',
        bankAccount: initialData.bankAccount || '선택안함',
        creditLimit: initialData.creditLimit?.toString() || '0',
        receivables: initialData.receivables?.toString() || '0',
        receivableBase: initialData.receivableBase?.toString() || '0',
        grade: initialData.grade || '1'
      }));

      // If editing and has extra details, auto-expand
      if (initialData.businessNo || initialData.address || initialData.memo || initialData.bankAccount) {
        setShowExtraDetails(true);
      }
    } else {
      if (safeStaffList.length > 0) {
        setFormData(prev => ({ ...prev, manager: safeStaffList[0].name }));
      }
    }
  }, [initialData, safeStaffList]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData(prev => {
      const nextState = { ...prev, [name]: val };
      if (name === 'receivableBase') {
        const newBase = Number(val || 0);
        const oldBase = Number(prev.receivableBase || 0);
        const diff = newBase - oldBase;
        if (isEditing) {
          nextState.receivables = (Number(prev.receivables || 0) + diff).toString();
        } else {
          nextState.receivables = newBase.toString();
        }
      }
      return nextState;
    });
  };

  const handleAccountChange = (idx, field, value) => {
    setFormData(prev => {
      const nextAccounts = [...(prev.orderAccounts || [])];
      nextAccounts[idx] = { ...nextAccounts[idx], [field]: value };
      return {
        ...prev,
        orderAccounts: nextAccounts
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('거래처명을 입력해주세요.');
      return;
    }

    if (onSave) {
      onSave({
        ...formData,
        creditLimit: Number(formData.creditLimit || 0),
        receivables: Number(formData.receivables || 0),
        receivableBase: Number(formData.receivableBase || 0),
        grade: formData.grade || '1'
      });
    } else {
      onClose();
    }
  };

  return (
    <WindowModal 
      title={titleText} 
      onClose={onClose} 
      width="100%"
      contentPadding="0"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
        
        {/* Header Bar */}
        <div style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 color="#2563eb" size={19} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>{titleText}</h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>거래처명 기준으로 간소화 입력</span>
            </div>
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Save size={15} /> 저장
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* 1. 핵심: 거래처명 (상호명) - 최우선 대형 인풋 */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 3px 12px rgba(37, 99, 235, 0.08)'
          }}>
            <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
              🏢 거래처명 (상호명) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="거래처명을 입력하세요 (예: (주)한국상사)" 
              autoFocus
              style={{ 
                width: '100%', 
                height: '46px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                padding: '0 12px', 
                fontSize: '1.08rem', 
                fontWeight: 800, 
                color: '#0f172a',
                background: '#f8fafc',
                boxSizing: 'border-box' 
              }} 
            />
          </div>

          {/* 2. 거래처 구분 (매출처 / 매입처 / 혼합) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              거래처 구분 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: '매출처', label: '매출처', activeColor: '#2563eb', activeBg: '#eff6ff', activeBorder: '#3b82f6' },
                { id: '매입처', label: '매입처', activeColor: '#dc2626', activeBg: '#fef2f2', activeBorder: '#ef4444' },
                { id: '혼합', label: '매입매출처', activeColor: '#7e22ce', activeBg: '#faf5ff', activeBorder: '#a855f7' }
              ].map(item => {
                const isSelected = formData.type === item.id || (item.id === '혼합' && formData.type === '매입매출처');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: item.id }))}
                    style={{
                      flex: 1,
                      padding: '11px 0',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${item.activeBorder}` : '1px solid #cbd5e1',
                      background: isSelected ? item.activeBg : '#ffffff',
                      color: isSelected ? item.activeColor : '#64748b',
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 기본 연락처 및 담당 직원 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* 전화번호 & 휴대전화 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  연락처 (대표전화)
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="02-000-0000" 
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.88rem', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  휴대전화
                </label>
                <input 
                  type="tel" 
                  name="mobile" 
                  value={formData.mobile} 
                  onChange={handleChange} 
                  placeholder="010-0000-0000" 
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.88rem', boxSizing: 'border-box' }} 
                />
              </div>
            </div>

            {/* 담당 직원 & 대표자명 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  담당 직원
                </label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleChange}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="-">담당 미지정</option>
                  {safeStaffList.map(s => (
                    <option key={s.id || s.userId} value={s.name}>{s.name} ({s.jobTitle || '직원'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  대표자명
                </label>
                <input 
                  type="text" 
                  name="ceo" 
                  value={formData.ceo} 
                  onChange={handleChange} 
                  placeholder="대표자 이름" 
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.88rem', boxSizing: 'border-box' }} 
                />
              </div>
            </div>

            {/* 비고 (메모) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                비고 / 메모
              </label>
              <textarea
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                rows={2}
                placeholder="특이사항, 배송 요청 등 간편 메모"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'none' }}
              />
            </div>
          </div>

          {/* 4. 상세 정보 접이식 아코디언 버튼 */}
          <button
            type="button"
            onClick={() => setShowExtraDetails(!showExtraDetails)}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              border: '1px dashed #cbd5e1',
              background: showExtraDetails ? '#eff6ff' : '#ffffff',
              color: showExtraDetails ? '#1d4ed8' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span>{showExtraDetails ? '상세 정보 닫기' : '➕ 추가 정보 입력 (사업자번호, 주소, 계좌 등)'}</span>
            {showExtraDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* 5. 상세 정보 영역 (펼쳤을 때만 표시) */}
          {showExtraDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* 사업자등록번호 & 주소 */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  🏢 사업장 정보
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>사업자등록번호</label>
                  <input 
                    type="text" 
                    name="businessNo" 
                    value={formData.businessNo} 
                    onChange={handleChange} 
                    placeholder="000-00-00000" 
                    style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>사업장 주소</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    placeholder="사업장 상세 주소" 
                    style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>약칭</label>
                    <input type="text" name="abbreviation" value={formData.abbreviation} onChange={handleChange} placeholder="약칭" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>이메일</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="user@email.com" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* 결제 및 신용한도 */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  💰 결제 및 한도
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>기초 미수금 (원)</label>
                    <input type="number" name="receivableBase" value={formData.receivableBase} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', textAlign: 'right', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>신용한도 (원)</label>
                    <input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', textAlign: 'right', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                  <input type="checkbox" name="hideOrderInfo" checked={formData.hideOrderInfo} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                  숨김 거래처로 지정 (목록 기본 숨김)
                </label>
              </div>

            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '10px',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: '0 0 80px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '0.90rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Save size={18} /> {isEditing ? "거래처 수정 완료" : "거래처 간편 저장"}
          </button>
        </div>

      </form>
    </WindowModal>
  );
};

export default PartnerRegistration;
