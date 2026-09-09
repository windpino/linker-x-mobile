import React, { useState, useEffect } from 'react';
import { Building2, ScanBarcode, Phone, Users, Contact, Lock, Save, MapPin } from 'lucide-react';
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
        manager: (initialData.manager && initialData.manager !== '-') ? initialData.manager : (safeStaffList[0]?.name || '-'),
        warehouse: (initialData.warehouse && initialData.warehouse !== '-') ? initialData.warehouse : '-',
        bankAccount: initialData.bankAccount || '선택안함',
        creditLimit: initialData.creditLimit?.toString() || '0',
        receivables: initialData.receivables?.toString() || '0',
        receivableBase: initialData.receivableBase?.toString() || '0',
        grade: initialData.grade || '1',
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
        hideOrderInfo: initialData.hideOrderInfo || false,
        hideAmountInInvoice: initialData.hideAmountInInvoice || false,
        memo: initialData.memo || ''
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
    <WindowModal 
      title={isEditing ? "거래처 정보 수정" : "신규 거래처 등록"} 
      onClose={onClose} 
      width="100%"
      contentPadding="0"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Contact color="#3b82f6" size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#1e293b' }}>{titleText}</h3>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fee2e2' }}>
            <input type="checkbox" name="hideOrderInfo" checked={formData.hideOrderInfo} onChange={handleChange} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
            숨김 거래처
          </label>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <Building2 size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>기본 정보</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  거래처 구분 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '6px', height: '36px' }}>
                  {['매출처', '매입처', '혼합'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                      style={{
                        flex: 1,
                        borderRadius: '6px',
                        border: formData.type === t ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        background: formData.type === t ? '#eff6ff' : '#ffffff',
                        color: formData.type === t ? '#1d4ed8' : '#475569',
                        fontWeight: formData.type === t ? 800 : 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t === '혼합' ? '혼합' : t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: '0 0 75px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>순번</label>
                  <input type="text" name="sequence" value={formData.sequence} onChange={handleChange} placeholder="2-1" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    상호명 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="상호명 입력" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.88rem', fontWeight: 700, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>약칭</label>
                  <input type="text" name="abbreviation" value={formData.abbreviation} onChange={handleChange} placeholder="예: (주)링크" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>바코드</label>
                  <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="스캔/입력" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>대표자</label>
                  <input type="text" name="ceo" value={formData.ceo} onChange={handleChange} placeholder="대표자명" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>사업자번호</label>
                  <input type="text" name="businessNo" value={formData.businessNo} onChange={handleChange} placeholder="000-00-00000" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>사업장 주소</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="사업장 주소 입력" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', paddingLeft: '30px', paddingRight: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <Phone size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>연락처 정보</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>일반전화</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="02-0000-0000" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>휴대전화</label>
                <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="010-0000-0000" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>팩스번호</label>
                <input type="text" name="fax" value={formData.fax} onChange={handleChange} placeholder="02-0000-0000" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>이메일</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="이메일 주소" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <Users size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>관리 및 여신 설정</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>담당자 (직원)</label>
                <select name="manager" value={formData.manager} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.82rem', background: '#fff' }}>
                  <option value="-">선택안함</option>
                  {safeStaffList.map((staff) => (
                    <option key={staff._docId || staff.id || staff.userId} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>관리 창고</label>
                <select name="warehouse" value={formData.warehouse} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.82rem', background: '#fff' }}>
                  <option value="-">선택안함</option>
                  {safeWarehouses.map((wh) => (
                    <option key={wh._docId || wh.id} value={wh.name}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>거래통장 지정</label>
                <select name="bankAccount" value={formData.bankAccount} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.82rem', background: '#fff' }}>
                  <option value="선택안함">선택안함</option>
                  {safeAccounts.map(acc => {
                    const valueVal = `${acc.bankName} (${acc.accountNumber})`;
                    return (
                      <option key={acc._docId || acc.id || acc.accountNumber} value={valueVal}>
                        {acc.bankName} ({acc.accountNumber})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>거래한도 (원)</label>
                <input type="text" name="creditLimit" value={formData.creditLimit} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>기초미수금 (원)</label>
                <input type="text" name="receivableBase" value={formData.receivableBase} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>누적 미수금 (원)</label>
                <input type="text" name="receivables" value={Number(formData.receivables || 0).toLocaleString()} readOnly style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0 8px', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right', boxSizing: 'border-box', background: '#f1f5f9', color: '#2563eb' }} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>거래처 등급 (미수금 신호등)</label>
                <select 
                  name="grade" 
                  value={formData.grade} 
                  onChange={handleChange} 
                  style={{
                    width: '100%',
                    height: '36px', 
                    borderRadius: '6px', 
                    border: '1px solid #cbd5e1',
                    padding: '0 8px', 
                    fontSize: '0.84rem', 
                    background: formData.grade === '1' ? '#eff6ff' : formData.grade === '2' ? '#fffbeb' : '#fef2f2',
                    color: formData.grade === '1' ? '#1d4ed8' : formData.grade === '2' ? '#b45309' : '#dc2626',
                    fontWeight: 700
                  }}
                >
                  <option value="1">🟢 1등급 (정상 / 우수 거래처)</option>
                  <option value="2">🟡 2등급 (주의 / 관리 거래처)</option>
                  <option value="3">🔴 3등급 (경고 / 거래제한 거래처)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 4: B2B 주문몰 계정 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <Lock size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>B2B 온라인 주문몰 계정</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[0, 1, 2].map((idx) => {
                const acc = (formData.orderAccounts && formData.orderAccounts[idx]) || { loginId: '', password: '', isMain: idx === 0, hidePrice: false };
                return (
                  <div key={idx} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                      계정 {idx + 1} {acc.isMain && <span style={{ color: '#2563eb' }}>(대표)</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>아이디</label>
                        <input
                          type="text"
                          value={acc.loginId || ''}
                          onChange={(e) => handleAccountChange(idx, 'loginId', e.target.value)}
                          placeholder="아이디"
                          style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>비밀번호</label>
                        <input
                          type="password"
                          value={acc.password || ''}
                          onChange={(e) => handleAccountChange(idx, 'password', e.target.value)}
                          placeholder="비밀번호"
                          style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={!!acc.hidePrice}
                        onChange={(e) => handleAccountChange(idx, 'hidePrice', e.target.checked)}
                        style={{ width: '14px', height: '14px', accentColor: '#3b82f6' }}
                      />
                      주문몰 단가(금액) 숨김
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 5: 특이사항 & 메모 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <FileText size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>관리 메모</h4>
            </div>
            <textarea
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              rows={3}
              placeholder="거래처 특이사항, 배송 요청사항 등을 입력하세요."
              style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
            >
              <Save size={16} /> {isEditing ? "수정하기" : "저장하기"}
            </button>
          </div>
        </div>
      </form>
    </WindowModal>
  );
};

export default PartnerRegistration;
