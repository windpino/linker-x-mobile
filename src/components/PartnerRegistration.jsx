import React, { useState, useEffect } from 'react';
import { Building2, ScanBarcode, Phone, Users, Edit, Contact, Lock, Save } from 'lucide-react';
import WindowModal from './WindowModal';

const PartnerRegistration = ({ onClose, initialData, onSave, staffList = [], warehouses = [], accounts = [] }) => {
  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  const isEditing = !!initialData;
  const titleText = isEditing ? "거래처 정보 수정" : "신규 거래처 등록";
  
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
    sequence: '', // 순번 추가
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
    memo: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        no: initialData.no?.toString() || '0',
        type: initialData.type || '매출처',
        name: initialData.name || '',
        phone: initialData.phone || '',
        manager: (initialData.manager && initialData.manager !== '-') ? initialData.manager : '임지훈',
        warehouse: initialData.warehouse || '-',
        receivables: initialData.receivables?.toString() || '0',
        loginId: initialData.loginId || '',
        password: initialData.password || '',
        loginId2: initialData.loginId2 || '',
        password2: initialData.password2 || '',
        loginId3: initialData.loginId3 || '',
        password3: initialData.password3 || '',
        isMain1: initialData.isMain1 || false,
        isMain2: initialData.isMain2 || false,
        isMain3: initialData.isMain3 || false,
        hidePrice1: initialData.hidePrice1 || false,
        hidePrice2: initialData.hidePrice2 || false,
        hidePrice3: initialData.hidePrice3 || false,
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const nextState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // 대표계정 체크 시 타 계정 대표 해제
      if (type === 'checkbox' && checked) {
        if (name === 'isMain1') {
          nextState.isMain2 = false;
          nextState.isMain3 = false;
        } else if (name === 'isMain2') {
          nextState.isMain1 = false;
          nextState.isMain3 = false;
        } else if (name === 'isMain3') {
          nextState.isMain1 = false;
          nextState.isMain2 = false;
        }
      }
      
      if (name === 'receivableBase') {
        const newBase = Number(value) || 0;
        if (isEditing && initialData) {
          const origBase = Number(initialData.receivableBase) || 0;
          const origReceivables = Number(initialData.receivables) || 0;
          const slipReceivables = origReceivables - origBase;
          nextState.receivables = (slipReceivables + newBase).toString();
        } else {
          nextState.receivables = newBase.toString();
        }
      }
      
      return nextState;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
    <WindowModal title="거래처관리" onClose={onClose} width="100%">
      <form className="partner-reg-form" onSubmit={handleSubmit} style={{ padding: '8px' }}>
        <div className="partner-reg-scroll-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div className="partner-reg-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '4px' }}>
            <h3 className="partner-reg-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Contact color="#3b82f6" size={20} />
              {titleText}
            </h3>
          </div>

          {/* Section 1: Basic Info */}
          <div className="form-section" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ef4444', paddingBottom: '6px', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} color="#ef4444" /> 기본 정보
              </h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>
                <input type="checkbox" name="hideOrderInfo" checked={formData.hideOrderInfo} onChange={handleChange} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                관리안함(숨김)
              </label>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 구분 */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                  구분 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {['매출처', '매입처', '혼합'].map((t) => (
                    <label 
                      key={t} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.85rem', 
                        fontWeight: formData.type === t ? 700 : 500,
                        color: formData.type === t ? '#2563eb' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="type" 
                        value={t} 
                        checked={formData.type === t} 
                        onChange={handleChange} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {t === '혼합' ? '혼합(매입/매출)' : t}
                    </label>
                  ))}
                </div>
              </div>

              {/* 순번 & 상호명 */}
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>순번</label>
                  <input type="text" name="sequence" value={formData.sequence} onChange={handleChange} placeholder="2-1" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>
                    상호명 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="거래처 상호명 입력" required style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
              </div>

              {/* 약칭 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>약칭</label>
                <input type="text" name="abbreviation" value={formData.abbreviation} onChange={handleChange} placeholder="예: (주)링크" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
              </div>

              {/* 바코드 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>바코드</label>
                <div style={{ position: 'relative' }}>
                  <ScanBarcode size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="스캔 또는 직접 입력" style={{ width: '100%', padding: '7px 8px 7px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
              </div>

              {/* 대표자 & 사업자번호 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>대표자</label>
                  <input type="text" name="ceo" value={formData.ceo} onChange={handleChange} placeholder="대표자명" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>사업자번호</label>
                  <input type="text" name="businessNo" value={formData.businessNo} onChange={handleChange} placeholder="000-00-00000" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
              </div>

              {/* 주소 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>주소</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="사업장 주소 입력" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Info */}
          <div className="form-section" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <Phone size={16} color="#3b82f6" /> 연락처 정보
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 일반전화 & 휴대전화 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>일반전화</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="02-000-0000" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>휴대전화</label>
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="010-0000-0000" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
              </div>

              {/* 팩스번호 & 이메일 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>팩스번호</label>
                  <input type="text" name="fax" value={formData.fax} onChange={handleChange} placeholder="02-000-0000" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>이메일</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@domain.com" style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Management & Settings */}
          <div className="form-section" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <Users size={16} color="#3b82f6" /> 관리 및 설정
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 담당자 & 관리창고 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>담당자 (직원)</label>
                  <select name="manager" value={formData.manager} onChange={handleChange} style={{ width: '100%', padding: '7px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff' }}>
                    <option value="-">선택안함</option>
                    {safeStaffList.map((staff) => (
                      <option key={staff.id} value={staff.name}>
                        {staff.name} {staff.warehouse ? `(${staff.warehouse})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>관리 창고</label>
                  <select name="warehouse" value={formData.warehouse} onChange={handleChange} style={{ width: '100%', padding: '7px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff' }}>
                    <option value="-">선택안함</option>
                    {safeWarehouses.map((wh) => (
                      <option key={wh.id} value={wh.name}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 거래통장 지정 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>거래통장 지정</label>
                <select name="bankAccount" value={formData.bankAccount} onChange={handleChange} style={{ width: '100%', padding: '7px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff' }}>
                  <option value="선택안함">선택안함</option>
                  {safeAccounts.map(acc => {
                    const displayVal = acc.accountAlias 
                      ? `${acc.bankName} (${acc.accountNumber}) - ${acc.accountAlias}`
                      : `${acc.bankName} (${acc.accountNumber})`;
                    const valueVal = `${acc.bankName} (${acc.accountNumber})`;
                    return (
                      <option key={acc.id || acc.accountNumber} value={valueVal}>
                        {displayVal} {acc.depositor ? `[예금주: ${acc.depositor}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 거래한도 & 기초미수금 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>거래한도 (원)</label>
                  <input type="text" name="creditLimit" value={formData.creditLimit} onChange={handleChange} style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', textAlign: 'right' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>기초미수금 (원)</label>
                  <input type="text" name="receivableBase" value={formData.receivableBase} onChange={handleChange} style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', textAlign: 'right' }} />
                </div>
              </div>

              {/* 누적 미수금 & 거래처 등급 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>누적 미수금 (원)</label>
                  <input 
                    type="text" 
                    name="receivables" 
                    value={formData.receivables} 
                    readOnly 
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', textAlign: 'right', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>거래처 등급</label>
                  <select name="grade" value={formData.grade} onChange={handleChange} style={{
                    width: '100%',
                    padding: '7px 6px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    background: formData.grade === '1' ? '#eff6ff' : formData.grade === '2' ? '#fffbeb' : '#fef2f2',
                    color: formData.grade === '1' ? '#1d4ed8' : formData.grade === '2' ? '#b45309' : '#dc2626',
                    fontWeight: 700
                  }}>
                    <option value="1">★ 1등급 (안전)</option>
                    <option value="2">★★ 2등급 (주의)</option>
                    <option value="3">★★★ 3등급 (위험)</option>
                  </select>
                </div>
              </div>

              {/* 전표출력시 금액가리기 */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>
                  <input type="checkbox" name="hideAmountInInvoice" checked={formData.hideAmountInInvoice} onChange={handleChange} style={{ width: '15px', height: '15px' }} />
                  전표출력시 금액가리기 (수량만 표시)
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Order Login Info */}
          <div className="form-section" style={{ border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '12px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} color="#2563eb" /> 주문 접속 계정 <span style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#64748b' }}>(최대 3개)</span>
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 계정 1 */}
              <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#2563eb', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>● 주문 계정 1</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                    <input type="checkbox" name="isMain1" checked={formData.isMain1} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                    대표
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>아이디</label>
                    <input type="text" name="loginId" value={formData.loginId} onChange={handleChange} style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>패스워드</label>
                    <input type="text" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#f43f5e' }}>
                  <input type="checkbox" name="hidePrice1" checked={formData.hidePrice1} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                  주문몰내 물품가격 표시안함
                </label>
              </div>

              {/* 계정 2 */}
              <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#2563eb', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>● 주문 계정 2</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                    <input type="checkbox" name="isMain2" checked={formData.isMain2} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                    대표
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>아이디</label>
                    <input type="text" name="loginId2" value={formData.loginId2} onChange={handleChange} style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>패스워드</label>
                    <input type="text" name="password2" value={formData.password2} onChange={handleChange} style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#f43f5e' }}>
                  <input type="checkbox" name="hidePrice2" checked={formData.hidePrice2} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                  주문몰내 물품가격 표시안함
                </label>
              </div>

              {/* 계정 3 */}
              <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#2563eb', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>● 주문 계정 3</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                    <input type="checkbox" name="isMain3" checked={formData.isMain3} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                    대표
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>아이디</label>
                    <input type="text" name="loginId3" value={formData.loginId3} onChange={handleChange} style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>패스워드</label>
                    <input type="text" name="password3" value={formData.password3} onChange={handleChange} style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#f43f5e' }}>
                  <input type="checkbox" name="hidePrice3" checked={formData.hidePrice3} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                  주문몰내 물품가격 표시안함
                </label>
              </div>
            </div>

            {/* 메모 */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '3px', display: 'block' }}>메모</label>
              <textarea name="memo" value={formData.memo} onChange={handleChange} placeholder="거래처 특이사항 입력" style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }} />
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              취소
            </button>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}>
              <Save size={16} /> {isEditing ? "수정하기" : "저장하기"}
            </button>
          </div>
        </div>
      </form>
    </WindowModal>
  );
};

export default PartnerRegistration;
