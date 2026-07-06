import React, { useState, useEffect } from 'react';
import { UserPlus, User, Lock, Phone, Building2, Check, Edit, Eye, EyeOff, Copy, Trash2, Plus, X } from 'lucide-react';
import WindowModal from './WindowModal';

const MENU_PERMISSIONS = [
  {
    category: '기초자료등록',
    items: ['재고이동', '직원관리', '창고관리', '거래처등록', '거래처관리', '품목등록', '품목관리', '특별단가관리']
  },
  {
    category: '매입/발주관리',
    items: ['매입전표', '매입원장', '발주']
  },
  {
    category: '매출/수주관리',
    items: ['매출전표', '매출전표내역', '매출원장', '수주']
  },
  {
    category: '입출금관리',
    items: ['계좌관리', '입출금보고서', '금전출납부', '경비출금']
  },
  {
    category: '스마트지원',
    items: ['일정', '매출보고서', '재고보고서', '전표수정/삭제 보고서', '직원 실적 보고서']
  },
  {
    category: '시스템관리',
    items: ['데이터 전체 저장/불러오기', '거래처 엑셀파일로 저장/불러오기', '품목 엑셀파일로 저장/불러오기', '매출처원장 저장/불러오기', '매입처원장 저장/불러오기', '구글스프레드시트 연동']
  },
  {
    category: '환경설정&정품등록',
    items: ['환경설정', '정품등록']
  }
];

const StaffRegistration = ({ onClose, initialData, onSave, warehouses = [], nextSequence, staffZones = [], setStaffZones, staffJobTitles = [], setStaffJobTitles, currentUser }) => {
  const mainWH = warehouses.find(w => w.isMain)?.name || '메인창고';
  const isEditing = !!initialData;
  const titleText = isEditing ? "직원 정보 수정" : "신규 직원 등록";
  
  const [showPassword, setShowPassword] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    name: '',
    phone: '',
    sequence: isEditing ? '' : (nextSequence || ''),
    warehouse: mainWH,
    jobTitle: isEditing ? (initialData.jobTitle || '사원') : (staffJobTitles[0] || '사원'),
    address: '',
    zone: '',
    viewAllInventoryMovements: false,
    allowSpecialPriceSave: false,
    allowAllEditDelete: false,
    viewOtherWarehouseOrders: false,
    permissions: {} // { '재고이동': true, ... }
  });

  const [mgmtModalType, setMgmtModalType] = useState(null); // 'zone' | 'jobTitle' | null

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        name: initialData.name || '',
        phone: initialData.phone || '',
        sequence: initialData.sequence || '',
        warehouse: initialData.warehouse || mainWH,
        jobTitle: initialData.jobTitle || (staffJobTitles[0] || '사원'),
        address: initialData.address || '',
        zone: initialData.zone || '',
        userId: initialData.userId || '', 
        password: initialData.password || '',
        viewAllInventoryMovements: initialData.viewAllInventoryMovements || false,
        allowSpecialPriceSave: initialData.allowSpecialPriceSave || false,
        allowAllEditDelete: initialData.allowAllEditDelete || false,
        viewOtherWarehouseOrders: initialData.viewOtherWarehouseOrders || false,
        permissions: initialData.permissions || {}
      });
    } else {
      setFormData(prev => ({
        ...prev,
        jobTitle: staffJobTitles[0] || '사원'
      }));
    }
  }, [initialData, mainWH, staffJobTitles]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePermissionChange = (itemName, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [itemName]: checked
      }
    }));
  };

  const handleCategoryToggle = (category, checked) => {
    const categoryItems = MENU_PERMISSIONS.find(g => g.category === category).items;
    const newPermissions = { ...formData.permissions };
    categoryItems.forEach(item => {
      newPermissions[item] = checked;
    });
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      // If isCloning is true, we treat it as a new registration by ignoring the original ID
      if (isCloning) {
        onSave({ ...formData, id: Date.now() });
      } else {
        onSave(formData);
      }
    } else {
      onClose();
    }
  };

  const handleCloneToNew = () => {
    setFormData(prev => ({
      ...prev,
      id: undefined,
      userId: '',
      password: '',
      name: '',
      phone: '',
      sequence: nextSequence || '',
      address: '',
      zone: ''
    }));
    setIsCloning(true);
    setShowPassword(false);
  };

  return (
    <WindowModal title="직원관리" onClose={onClose}>
      <div className="staff-reg-header">
        <h3 className="staff-reg-title">
          {isEditing && !isCloning ? <Edit color="#3b82f6" size={20} /> : <UserPlus color="#3b82f6" size={20} />}
          {isCloning ? "새 직원 추가 (권한 복사됨)" : titleText}
        </h3>
      </div>

      <form className="staff-reg-form" onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="form-row">
          <div className="staff-input-group" style={{ flex: '0 0 80px' }}>
            <label>순번</label>
            <div className="staff-input-wrapper">
              <input type="text" name="sequence" value={formData.sequence} onChange={handleChange} placeholder="1" className="staff-input pl-3" />
            </div>
          </div>
          <div className="staff-input-group" style={{ flex: 1 }}>
            <label>아이디 <span className="required">*</span></label>
            <div className="staff-input-wrapper">
              <User size={16} className="staff-input-icon" />
              <input type="text" name="userId" value={formData.userId} onChange={handleChange} placeholder="로그인 아이디" className="staff-input" required autoComplete="off" />
            </div>
          </div>
          <div className="staff-input-group">
            <label>패스워드 <span className="required">*</span></label>
            <div className="staff-input-wrapper">
              <Lock size={16} className="staff-input-icon" />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="로그인 비밀번호" 
                className="staff-input pr-10" 
                required={!isEditing} 
                autoComplete="new-password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="staff-input-group">
            <label>성명 <span className="required">*</span></label>
            <div className="staff-input-wrapper">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="직원 성명" className="staff-input pl-3" required />
            </div>
          </div>
          <div className="staff-input-group">
            <label>전화번호</label>
            <div className="staff-input-wrapper">
              <Phone size={16} className="staff-input-icon" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="010-0000-0000" className="staff-input" />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="staff-input-group">
            <label>직책</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="staff-input-wrapper select-wrapper" style={{ flex: 1 }}>
                <select 
                  name="jobTitle" 
                  value={formData.jobTitle} 
                  onChange={handleChange} 
                  className="staff-input staff-select pl-3"
                  style={{ width: '100%' }}
                >
                  {!staffJobTitles.includes(formData.jobTitle) && formData.jobTitle && (
                    <option value={formData.jobTitle}>{formData.jobTitle}</option>
                  )}
                  {staffJobTitles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
              <button 
                type="button" 
                className="btn-outline staff-btn" 
                onClick={() => setMgmtModalType('jobTitle')}
                style={{ height: '38px', padding: '0 12px', fontSize: '0.85rem', whiteSpace: 'nowrap', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                관리
              </button>
            </div>
          </div>
          <div className="staff-input-group">
            <label>담당구역 및 지역</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="staff-input-wrapper select-wrapper" style={{ flex: 1 }}>
                <select 
                  name="zone" 
                  value={formData.zone} 
                  onChange={handleChange} 
                  className="staff-input staff-select pl-3"
                  style={{ width: '100%' }}
                >
                  <option value="">지역 선택 안 함</option>
                  {formData.zone && !staffZones.includes(formData.zone) && (
                    <option value={formData.zone}>{formData.zone}</option>
                  )}
                  {staffZones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <button 
                type="button" 
                className="btn-outline staff-btn" 
                onClick={() => setMgmtModalType('zone')}
                style={{ height: '38px', padding: '0 12px', fontSize: '0.85rem', whiteSpace: 'nowrap', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                관리
              </button>
            </div>
          </div>
        </div>

        <div className="staff-input-group">
          <label>주소</label>
          <div className="staff-input-wrapper">
            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="거주지 주소 입력" className="staff-input pl-3" />
          </div>
        </div>

        <div className="staff-input-group">
          <label>기본 창고 <span className="required">*</span></label>
          <div className="staff-input-wrapper select-wrapper">
            <Building2 size={16} className="staff-input-icon" />
            <select name="warehouse" value={formData.warehouse} onChange={handleChange} className="staff-input staff-select">
              {warehouses.length > 0 ? (
                warehouses.map(wh => (
                  <option key={wh.id} value={wh.name}>{wh.name}</option>
                ))
              ) : (
                <option value="본사">본사</option>
              )}
            </select>
          </div>
        </div>

        {/* Additional Permissions */}
        <div className="permission-section">
          <h4 className="permission-title">추가 권한 설정</h4>
          <div className="permission-box mb-4">
            <label className="checkbox-label">
              <input type="checkbox" name="viewAllInventoryMovements" checked={formData.viewAllInventoryMovements} onChange={handleChange} />
              <div className="checkbox-text-group">
                <span className="checkbox-main-text">전체 재고이동 목록 보기 (관리자 권한)</span>
                <span className="checkbox-sub-text">체크 시 본인이 작성하지 않은 다른 직원의 재고이동 내역도 모두 조회할 수 있습니다.</span>
              </div>
            </label>
          </div>
          <div className="permission-box mb-4">
            <label className="checkbox-label">
              <input type="checkbox" name="allowSpecialPriceSave" checked={formData.allowSpecialPriceSave || false} onChange={handleChange} />
              <div className="checkbox-text-group">
                <span className="checkbox-main-text">직원별 특별단가관리 (매출전표 단가 수정 시 특별단가 저장 허용)</span>
                <span className="checkbox-sub-text">매출전표에서 품목 단가 수정 시 해당 단가를 거래처 특별단가로 저장할지 묻는 팝업을 표시하고 저장할 수 있습니다.</span>
              </div>
            </label>
          </div>
          <div className="permission-box mb-4">
            <label className="checkbox-label">
              <input type="checkbox" name="allowAllEditDelete" checked={formData.allowAllEditDelete || false} onChange={handleChange} />
              <div className="checkbox-text-group">
                <span className="checkbox-main-text">모든 데이터 삭제/수정 권한 부여</span>
                <span className="checkbox-sub-text">체크 시 매출/매입전표, 품목, 거래처, 계좌 등 시스템 내 모든 마스터 데이터를 수정하고 삭제할 수 있습니다. (미체크 시 본인이 작성한 데이터만 관리 가능)</span>
              </div>
            </label>
          </div>
        </div>

        {/* Menu Access Permissions */}
        <div className="permission-section menu-permissions">
          <h4 className="permission-title">메뉴 접근 권한</h4>
          <p className="permission-desc">직원이 접근할 수 있는 메뉴를 선택하세요.</p>
          
          <div className="menu-permission-list">
            {MENU_PERMISSIONS.map((group) => {
              const allChecked = group.items.every(item => formData.permissions[item]);
              const someChecked = group.items.some(item => formData.permissions[item]);
              
              return (
                <div key={group.category} className="menu-group-card">
                  <div className="menu-group-header">
                    <label className="checkbox-label category-label">
                      <input 
                        type="checkbox" 
                        checked={allChecked} 
                        ref={input => {
                          if (input) {
                            input.indeterminate = someChecked && !allChecked;
                          }
                        }}
                        onChange={(e) => handleCategoryToggle(group.category, e.target.checked)} 
                      />
                      <span className="category-text">{group.category}</span>
                    </label>
                    <span className="item-count">{group.items.length}개 메뉴</span>
                  </div>
                  
                  <div className="menu-items-grid">
                    {group.items.map(item => (
                      <label key={item} className="checkbox-label item-label">
                        <input 
                          type="checkbox" 
                          checked={formData.permissions[item] || false} 
                          onChange={(e) => handlePermissionChange(item, e.target.checked)} 
                        />
                        <span className="item-text">{item}</span>
                      </label>
                    ))}
                    {group.category === '매출/수주관리' && (
                      <label className="checkbox-label item-label" style={{ gridColumn: 'span 2', color: '#2563eb', fontWeight: 'bold', borderTop: '1px dotted #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                        <input 
                          type="checkbox" 
                          name="viewOtherWarehouseOrders" 
                          checked={formData.viewOtherWarehouseOrders || false} 
                          onChange={handleChange} 
                        />
                        <span className="item-text">★ 타창고주문확인 (타직원 주문 조회 허용)</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="staff-reg-footer">
          {isEditing && !isCloning && (
            <div style={{ marginRight: 'auto' }}>
              <button 
                type="button" 
                className="btn-clone" 
                onClick={handleCloneToNew}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 16px', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  color: '#475569', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Copy size={16} /> 이 권한으로 신규 등록
              </button>
            </div>
          )}
          <button type="button" className="btn-outline" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary">{isCloning ? "신규 직원으로 저장" : "저장하기"}</button>
        </div>
      </form>

      {mgmtModalType === 'zone' && (
        <CategoryManagerModal 
          title="담당구역 및 지역 관리"
          items={staffZones}
          onAdd={(newZone) => {
            const nextZones = [...staffZones, newZone];
            setStaffZones(nextZones);
          }}
          onDelete={(zoneToDelete) => {
            if (window.confirm(`'${zoneToDelete}' 지역을 삭제하시겠습니까?`)) {
              const nextZones = staffZones.filter(z => z !== zoneToDelete);
              setStaffZones(nextZones);
            }
          }}
          onClose={() => setMgmtModalType(null)}
        />
      )}

      {mgmtModalType === 'jobTitle' && (
        <CategoryManagerModal 
          title="직책 관리"
          items={staffJobTitles}
          onAdd={(newTitle) => {
            const nextTitles = [...staffJobTitles, newTitle];
            setStaffJobTitles(nextTitles);
          }}
          onDelete={(titleToDelete) => {
            if (window.confirm(`'${titleToDelete}' 직책을 삭제하시겠습니까?`)) {
              const nextTitles = staffJobTitles.filter(t => t !== titleToDelete);
              setStaffJobTitles(nextTitles);
            }
          }}
          onClose={() => setMgmtModalType(null)}
        />
      )}
    </WindowModal>
  );
};

const CategoryManagerModal = ({ title, items = [], onAdd, onDelete, onClose }) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (!newItem.trim()) return;
    if (items.includes(newItem.trim())) {
      alert('이미 존재하는 항목입니다.');
      return;
    }
    onAdd(newItem.trim());
    setNewItem('');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{title}</h4>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Add Form */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={newItem} 
              onChange={(e) => setNewItem(e.target.value)} 
              placeholder="새 항목 이름 입력"
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                color: '#334155'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <button 
              type="button" 
              onClick={handleAdd}
              style={{
                padding: '10px 16px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              <Plus size={16} /> 추가
            </button>
          </div>

          {/* List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '8px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>등록된 항목 목록 ({items.length})</span>
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              maxHeight: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {items.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  등록된 항목이 없습니다.
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: index === items.length - 1 ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    color: '#334155'
                  }}>
                    <span>{item}</span>
                    <button 
                      type="button" 
                      onClick={() => onDelete(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc'
        }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffRegistration;
