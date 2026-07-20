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
    <WindowModal title="거래처관리" onClose={onClose}>
      <form className="partner-reg-form" onSubmit={handleSubmit}>
        <div className="partner-reg-scroll-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div className="partner-reg-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <h3 className="partner-reg-title">
              <Contact color="#3b82f6" size={20} />
              {titleText}
            </h3>
          </div>

        
        {/* Section 1: Basic Info */}
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ef4444', marginBottom: '12px' }}>
            <h4 className="form-section-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: '6px' }}><Building2 size={16} /> 기본 정보</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', paddingBottom: '6px' }}>
              <input type="checkbox" name="hideOrderInfo" checked={formData.hideOrderInfo} onChange={handleChange} style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
              관리안함(숨김)
            </label>
          </div>
          
          <div className="form-row-multi">
            <div className="partner-input-group flex-1">
              <label>구분 <span className="required" style={{color: '#ef4444'}}>*</span></label>
              <div style={{ display: 'flex', gap: '16px', height: '41px', alignItems: 'center', padding: '0 4px' }}>
                {['매출처', '매입처', '혼합'].map((t) => (
                  <label 
                    key={t} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '0.95rem', 
                      fontWeight: formData.type === t ? 600 : 500,
                      color: formData.type === t ? '#2563eb' : '#475569',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="type" 
                      value={t} 
                      checked={formData.type === t} 
                      onChange={handleChange} 
                      style={{
                        appearance: 'none',
                        width: '18px',
                        height: '18px',
                        border: formData.type === t ? '6px solid #2563eb' : '2px solid #cbd5e1',
                        borderRadius: '50%',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: '#fff'
                      }}
                    />
                    {t === '혼합' ? '혼합 (매입매출처)' : t}
                  </label>
                ))}
              </div>
            </div>
            <div className="partner-input-group" style={{ flex: '0 0 80px' }}>
              <label>순번</label>
              <input type="text" name="sequence" value={formData.sequence} onChange={handleChange} placeholder="2-1" className="partner-input" />
            </div>
            <div className="partner-input-group flex-1">
              <label>상호명 <span className="required" style={{color: '#ef4444'}}>*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="partner-input" required />
            </div>
            <div className="partner-input-group flex-1">
              <label>약칭</label>
              <input type="text" name="abbreviation" value={formData.abbreviation} onChange={handleChange} placeholder="예: (주)링크" className="partner-input" />
            </div>
          </div>

          <div className="form-row-multi">
            <div className="partner-input-group flex-1">
              <label>바코드</label>
              <div className="barcode-input-wrapper">
                <ScanBarcode size={16} className="input-icon-left" />
                <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="스캔 또는 입력" className="partner-input pl-10" style={{borderRadius: '6px'}} />
              </div>
            </div>
            <div className="partner-input-group flex-1">
              <label>대표자</label>
              <input type="text" name="ceo" value={formData.ceo} onChange={handleChange} className="partner-input" />
            </div>
            <div className="partner-input-group flex-1">
              <label>사업자번호</label>
              <input type="text" name="businessNo" value={formData.businessNo} onChange={handleChange} placeholder="000-00-00000" className="partner-input" />
            </div>
          </div>

          <div className="form-row-multi">
            <div className="partner-input-group" style={{ flex: 1 }}>
              <label>주소</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="partner-input" />
            </div>
          </div>
        </div>

        <hr className="section-divider" />

        {/* Section 2: Contact Info */}
        <div className="form-section">
          <h4 className="form-section-title"><Phone size={16} /> 연락처 정보</h4>
          
          <div className="form-row-multi">
            <div className="partner-input-group flex-1">
              <label>일반전화</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="partner-input" />
            </div>
            <div className="partner-input-group flex-1">
              <label>휴대전화</label>
              <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="partner-input" />
            </div>
            <div className="partner-input-group flex-1">
              <label>팩스번호</label>
              <input type="text" name="fax" value={formData.fax} onChange={handleChange} className="partner-input" />
            </div>
          </div>

          <div className="form-row-multi">
            <div className="partner-input-group" style={{ flex: 1, maxWidth: '33.33%' }}>
              <label>이메일</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="partner-input" />
            </div>
          </div>
        </div>

        <hr className="section-divider" />

        {/* Section 3: Management & Settings */}
        <div className="form-section">
          <h4 className="form-section-title"><Users size={16} /> 관리 및 설정</h4>
          
          <div className="form-row-multi">
            <div className="partner-input-group flex-1">
              <label>담당자 (직원)</label>
              <div className="partner-select-wrapper">
                <select name="manager" value={formData.manager} onChange={handleChange} className="partner-select">
                  <option value="-">선택안함</option>
                  {safeStaffList.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name} {staff.warehouse ? `(${staff.warehouse})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="partner-input-group flex-1">
              <label>관리 창고</label>
              <div className="partner-select-wrapper">
                <select name="warehouse" value={formData.warehouse} onChange={handleChange} className="partner-select">
                  <option value="-">선택안함</option>
                  {safeWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.name}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="partner-input-group flex-1">
              <label>거래통장 지정</label>
              <div className="partner-select-wrapper">
                <select name="bankAccount" value={formData.bankAccount} onChange={handleChange} className="partner-select">
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
            </div>
            <div className="partner-input-group flex-1">
              <label>거래한도 (원)</label>
              <input type="text" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className="partner-input text-right" />
              <span className="input-hint">* 초과 시 매출전표 발행 제한</span>
            </div>
          </div>

          <div className="form-row-multi">
            <div className="partner-input-group flex-1">
              <label>누적 미수금 (원)</label>
              <input 
                type="text" 
                name="receivables" 
                value={formData.receivables} 
                className="partner-input text-right" 
                readOnly 
                style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
              />
              <span className="input-hint">* 기초미수금 + 이미 발행된 전표상의 누적 미수금</span>
            </div>
            <div className="partner-input-group flex-1">
              <label>기초미수금 (원)</label>
              <input type="text" name="receivableBase" value={formData.receivableBase} onChange={handleChange} className="partner-input text-right" />
              <span className="input-hint">* 거래처 거래 개시 시점 또는 기준 미수금</span>
            </div>
            <div className="partner-input-group flex-1">
              <label>거래처 등급</label>
              <div className="partner-select-wrapper">
                <select name="grade" value={formData.grade} onChange={handleChange} className="partner-select" style={{
                  background: formData.grade === '1' ? '#eff6ff' : formData.grade === '2' ? '#fffbeb' : '#fef2f2',
                  color: formData.grade === '1' ? '#1d4ed8' : formData.grade === '2' ? '#b45309' : '#dc2626',
                  fontWeight: 700
                }}>
                  <option value="1">★ 1등급 (안전 / 파란불)</option>
                  <option value="2">★★ 2등급 (주의 / 노란불)</option>
                  <option value="3">★★★ 3등급 (위험 / 빨간불)</option>
                </select>
              </div>
              <span className="input-hint">* 미수금 신호등과 자동 연동</span>
            </div>
          </div>

          <div className="form-row-multi" style={{ marginTop: '12px' }}>
            <div className="partner-input-group flex-1">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#ef4444' }}>
                <input type="checkbox" name="hideAmountInInvoice" checked={formData.hideAmountInInvoice} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                전표출력시 금액가리기 (수량만 표시)
              </label>
            </div>
          </div>
        </div>

        <hr className="section-divider" />

        {/* Section 4: Order Login Info */}
        <div className="form-section" style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
          <h4 className="form-section-title" style={{ borderBottom: 'none', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} /> 주문 접속 정보 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>(최대 3개 계정 등록 가능)</span>
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* 계정 1 */}
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                  주문 계정 1
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>
                  <input type="checkbox" name="isMain1" checked={formData.isMain1} onChange={handleChange} style={{ width: '13px', height: '13px', cursor: 'pointer' }} />
                  대표
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="partner-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>아이디</label>
                  <input type="text" name="loginId" value={formData.loginId} onChange={handleChange} className="partner-input" style={{ fontSize: '0.85rem', padding: '6px 10px' }} />
                </div>
                <div className="partner-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>패스워드</label>
                  <input type="text" name="password" value={formData.password} onChange={handleChange} className="partner-input" style={{ fontSize: '0.85rem', padding: '6px 10px' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e', marginTop: '4px' }}>
                  <input type="checkbox" name="hidePrice1" checked={formData.hidePrice1} onChange={handleChange} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                  주문몰내 물품가격 표시안함
                </label>
              </div>
            </div>

            {/* 계정 2 */}
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                  주문 계정 2
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>
                  <input type="checkbox" name="isMain2" checked={formData.isMain2} onChange={handleChange} style={{ width: '13px', height: '13px', cursor: 'pointer' }} />
                  대표
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="partner-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>아이디</label>
                  <input type="text" name="loginId2" value={formData.loginId2} onChange={handleChange} className="partner-input" style={{ fontSize: '0.85rem', padding: '6px 10px' }} />
                </div>
                <div className="partner-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>패스워드</label>
                  <input type="text" name="password2" value={formData.password2} onChange={handleChange} className="partner-input" style={{ fontSize: '0.85rem', padding: '6px 10px' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e', marginTop: '4px' }}>
                  <input type="checkbox" name="hidePrice2" checked={formData.hidePrice2} onChange={handleChange} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                  주문몰내 물품가격 표시안함
                </label>
              </div>
            </div>

            {/* 계정 3 */}
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                  주문 계정 3
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>
                  <input type="checkbox" name="isMain3" checked={formData.isMain3} onChange={handleChange} style={{ width: '13px', height: '13px', cursor: 'pointer' }} />
                  대표
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="partner-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>아이디</label>
                  <input type="text" name="loginId3" value={formData.loginId3} onChange={handleChange} className="partner-input" style={{ fontSize: '0.85rem', padding: '6px 10px' }} />
                </div>
                <div className="partner-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b' }}>패스워드</label>
                  <input type="text" name="password3" value={formData.password3} onChange={handleChange} className="partner-input" style={{ fontSize: '0.85rem', padding: '6px 10px' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e', marginTop: '4px' }}>
                  <input type="checkbox" name="hidePrice3" checked={formData.hidePrice3} onChange={handleChange} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                  주문몰내 물품가격 표시안함
                </label>
              </div>
            </div>
          </div>

          <div className="form-row-multi" style={{ marginTop: '16px' }}>
            <div className="partner-input-group" style={{ flex: 1 }}>
              <label>메모</label>
              <textarea name="memo" value={formData.memo} onChange={handleChange} className="partner-textarea" placeholder="특이사항 입력" />
            </div>
          </div>
        </div>

          <div className="partner-reg-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
            <button type="button" className="btn-text" onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: '8px 16px', fontWeight: '600' }}>취소</button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> {isEditing ? "수정하기" : "저장하기"}
            </button>
          </div>
        </div>
      </form>
    </WindowModal>
  );
};

export default PartnerRegistration;
