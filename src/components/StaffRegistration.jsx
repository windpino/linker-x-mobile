import React, { useState, useEffect } from 'react';
import { UserPlus, User, Lock, Phone, Building2, Check, Edit, Eye, EyeOff, Copy, Trash2, Plus, X, Calendar } from 'lucide-react';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { MENU_PERMISSIONS, MOBILE_CORE_MENUS, normalizeMenuPermissions, enrichMenuPermissions } from '../utils/menuPermissions';

const StaffRegistration = ({ onClose, initialData, onSave, warehouses = [], nextSequence, staffZones = [], setStaffZones, staffJobTitles = [], setStaffJobTitles, currentUser, onDeleteStaff }) => {
  const mainWH = warehouses.find(w => w.isMain)?.name || warehouses[0]?.name || '메인창고';
  const isEditing = !!initialData;
  const titleText = isEditing ? "직원 정보 수정" : "신규 직원 등록";
  
  const isRepTitle = (title) => {
    return title === '대표' || title === '대표자' || title === '대표이사';
  };

  const isRepUser = (user) => {
    if (!user) return false;
    const uid = String(user.userId || '').trim().toLowerCase();
    const cid = String(user.companyId || currentUser?.companyId || '').trim().toLowerCase();
    return user.role === 'admin' || 
           user.role === 'super_admin' || 
           user.role === 'company' ||
           user.role === 'owner' ||
           user.role === 'representative' || 
           user.role === 'ceo' ||
           user.isCompanyAdmin === true ||
           user.isMasterAdmin === true ||
           uid === 'admin' ||
           uid === 'sadmin' ||
           uid === 'madmin' ||
           (cid && uid && uid === cid) ||
           isRepTitle(user.jobTitle);
  };

  const [showPassword, setShowPassword] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    name: '',
    phone: '',
    sequence: isEditing ? '' : (nextSequence || ''),
    warehouse: isEditing ? (initialData?.warehouse || '') : (mainWH || ''),
    jobTitle: isEditing ? (initialData.jobTitle || '사원') : (staffJobTitles.includes('사원') ? '사원' : (staffJobTitles[0] || '사원')),
    hireDate: isEditing ? (initialData?.hireDate || '') : '',
    address: '',
    zone: '',
    viewAllInventoryMovements: false,
    allowSpecialPriceSave: false,
    allowAllEditDelete: false,
    viewOtherWarehouseOrders: false,
    viewRecentActivity: false,
    deleteRecentActivity: false,
    restrictPartnerSearch: false,
    allowPastDateSlip: false,
    allowPastDateDeposit: false,
    showPurchasePrice: isEditing ? (
      initialData?.showPurchasePrice !== undefined 
        ? Boolean(initialData.showPurchasePrice) 
        : (initialData?.permissions?.['상품금액노출'] !== undefined 
            ? Boolean(initialData.permissions['상품금액노출']) 
            : (initialData?.permissions?.['발주_상품금액노출'] !== undefined 
                ? Boolean(initialData.permissions['발주_상품금액노출']) 
                : isRepUser(initialData)))
    ) : false,
    permissions: normalizeMenuPermissions(initialData?.permissions)
  });

  // 대표 관리자 아이디 여부 판별 (최초 가입 계정 또는 최고 관리자)
  const isRepAdmin = Boolean(
    (isEditing && !isCloning && (
      isRepUser(initialData) ||
      (currentUser?.companyId && initialData?.userId && String(initialData.userId).trim().toLowerCase() === String(currentUser.companyId).trim().toLowerCase())
    )) ||
    (formData?.userId && (
      String(formData.userId).trim().toLowerCase() === 'admin' ||
      (currentUser?.companyId && String(formData.userId).trim().toLowerCase() === String(currentUser.companyId).trim().toLowerCase())
    )) ||
    isRepTitle(formData?.jobTitle)
  );

  const [mgmtModalType, setMgmtModalType] = useState(null); // 'zone' | 'jobTitle' | null

  useEffect(() => {
    if (initialData) {
      const isTargetRep = isRepUser(initialData);
      const initialShowPrice = initialData.showPurchasePrice !== undefined 
        ? Boolean(initialData.showPurchasePrice) 
        : (initialData.permissions?.['상품금액노출'] !== undefined 
            ? Boolean(initialData.permissions['상품금액노출']) 
            : (initialData.permissions?.['발주_상품금액노출'] !== undefined 
                ? Boolean(initialData.permissions['발주_상품금액노출']) 
                : isTargetRep));

      setFormData({
        ...initialData,
        name: initialData.name || '',
        phone: initialData.phone || '',
        sequence: initialData.sequence !== undefined && initialData.sequence !== null ? initialData.sequence : '',
        warehouse: initialData.warehouse || mainWH,
        jobTitle: initialData.jobTitle || (staffJobTitles.includes('사원') ? '사원' : (staffJobTitles[0] || '사원')),
        hireDate: initialData.hireDate || '',
        address: initialData.address || '',
        zone: initialData.zone || '',
        userId: initialData.userId || '', 
        password: initialData.password || '',
        viewAllInventoryMovements: initialData.viewAllInventoryMovements || false,
        allowSpecialPriceSave: initialData.allowSpecialPriceSave || false,
        allowAllEditDelete: initialData.allowAllEditDelete || false,
        viewOtherWarehouseOrders: initialData.viewOtherWarehouseOrders || false,
        viewRecentActivity: Boolean(initialData.viewRecentActivity || initialData.permissions?.viewRecentActivity || initialData.permissions?.['최근 처리 현황'] || initialData.permissions?.['최근 처리 현황 보고서']),
        deleteRecentActivity: Boolean(initialData.deleteRecentActivity || initialData.permissions?.deleteRecentActivity || initialData.permissions?.['최근 처리 이력 삭제 권한']),
        restrictPartnerSearch: initialData.restrictPartnerSearch || false,
        allowPastDateSlip: Boolean(initialData.allowPastDateSlip || initialData.permissions?.allowPastDateSlip || initialData.permissions?.['과거일자 전표발행']),
        allowPastDateDeposit: Boolean(initialData.allowPastDateDeposit || initialData.permissions?.allowPastDateDeposit || initialData.permissions?.['과거일자 입금전표발행']),
        showPurchasePrice: initialShowPrice,
        permissions: normalizeMenuPermissions(initialData?.permissions)
      });
    } else {
      setFormData({
        userId: '',
        password: '',
        name: '',
        phone: '',
        sequence: nextSequence || '',
        warehouse: mainWH || '',
        jobTitle: staffJobTitles.includes('사원') ? '사원' : (staffJobTitles[0] || '사원'),
        hireDate: '',
        address: '',
        zone: '',
        viewAllInventoryMovements: false,
        allowSpecialPriceSave: false,
        allowAllEditDelete: false,
        viewOtherWarehouseOrders: false,
        viewRecentActivity: false,
        deleteRecentActivity: false,
        restrictPartnerSearch: false,
        allowPastDateSlip: false,
        allowPastDateDeposit: false,
        showPurchasePrice: false,
        permissions: {}
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'jobTitle') {
      const isRep = isRepTitle(value);
      setFormData(prev => ({
        ...prev,
        jobTitle: value,
        showPurchasePrice: isRep ? true : prev.showPurchasePrice,
        permissions: {
          ...prev.permissions,
          ...(isRep ? { '상품금액노출': true, '발주_상품금액노출': true } : {})
        }
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const syncMobileKeysWithDesktop = (perms, changedItems = null) => {
    const next = { ...perms };
    const shouldSync = (desktopKeys) => !changedItems || desktopKeys.some(k => changedItems.includes(k));
    if (shouldSync(['수주 등록', '수주목록', '수주'])) {
      next['모바일_수주'] = Boolean(next['수주 등록'] || next['수주목록']);
    }
    if (shouldSync(['수주목록', '수주', '재고이동'])) {
      next['모바일_상차'] = Boolean(next['수주목록'] || next['재고이동']);
    }
    if (shouldSync(['재고이동'])) {
      next['모바일_재고이동'] = Boolean(next['재고이동']);
    }
    if (shouldSync(['매출 전표', '매출전표내역', '매출전표'])) {
      next['모바일_매출전표발행'] = Boolean(next['매출 전표'] || next['매출전표내역']);
    }
    if (shouldSync(['품목등록/관리', '품목등록', '품목관리'])) {
      next['모바일_상품등록'] = Boolean(next['품목등록/관리']);
    }
    if (shouldSync(['거래처등록/관리', '거래처등록', '거래처관리'])) {
      next['모바일_거래처등록'] = Boolean(next['거래처등록/관리']);
    }
    return next;
  };

  const handlePermissionChange = (itemName, checked) => {
    setFormData(prev => {
      const updated = {
        ...prev.permissions,
        [itemName]: checked
      };
      return {
        ...prev,
        permissions: syncMobileKeysWithDesktop(updated, [itemName])
      };
    });
  };

  const handleMobilePermissionChange = (mobileMenu, checked) => {
    setFormData(prev => {
      const updated = {
        ...prev.permissions,
        [mobileMenu.permKey]: checked
      };
      // 모바일 메뉴를 켤 때 데스크탑의 필수 기본 메뉴도 유기적으로 활성화 (원할 경우 개별 해제 가능)
      if (checked && Array.isArray(mobileMenu.desktopLinkedKeys) && mobileMenu.desktopLinkedKeys[0]) {
        const primaryDesktopKey = mobileMenu.desktopLinkedKeys[0];
        if (!updated[primaryDesktopKey]) {
          updated[primaryDesktopKey] = true;
        }
      }
      return {
        ...prev,
        permissions: updated
      };
    });
  };

  const handleAllMobileToggle = (checked) => {
    setFormData(prev => {
      const updated = { ...prev.permissions };
      MOBILE_CORE_MENUS.forEach(m => {
        updated[m.permKey] = checked;
      });
      return { ...prev, permissions: updated };
    });
  };

  const handleSyncMobileFromDesktop = () => {
    setFormData(prev => ({
      ...prev,
      permissions: syncMobileKeysWithDesktop(prev.permissions, null)
    }));
  };

  const handleAllCategoriesToggle = (checked) => {
    const newPermissions = { ...formData.permissions };
    MENU_PERMISSIONS.forEach(group => {
      group.items.forEach(item => {
        newPermissions[item] = checked;
      });
    });
    MOBILE_CORE_MENUS.forEach(m => {
      newPermissions[m.permKey] = checked;
    });
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  const handleCategoryToggle = (category, checked) => {
    const categoryGroup = MENU_PERMISSIONS.find(g => g.category === category);
    if (!categoryGroup) return;
    const categoryItems = categoryGroup.items;
    const newPermissions = { ...formData.permissions };
    categoryItems.forEach(item => {
      newPermissions[item] = checked;
    });
    setFormData(prev => ({ ...prev, permissions: syncMobileKeysWithDesktop(newPermissions, categoryItems) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      const isDeleteActivity = Boolean(
        formData.deleteRecentActivity || 
        formData.permissions?.deleteRecentActivity || 
        formData.permissions?.['최근 처리 이력 삭제 권한']
      );
      const isViewActivity = Boolean(
        formData.viewRecentActivity || 
        formData.permissions?.viewRecentActivity || 
        formData.permissions?.['최근 처리 현황 보고서'] || 
        formData.permissions?.['최근 처리 현황']
      );

      const isShowPurchasePrice = Boolean(
        formData.showPurchasePrice || 
        formData.permissions?.['상품금액노출'] || 
        formData.permissions?.['발주_상품금액노출']
      );

      const isAllowPastDateSlip = Boolean(
        formData.allowPastDateSlip || 
        formData.permissions?.allowPastDateSlip || 
        formData.permissions?.['과거일자 전표발행']
      );
      const isAllowPastDateDeposit = Boolean(
        formData.allowPastDateDeposit || 
        formData.permissions?.allowPastDateDeposit || 
        formData.permissions?.['과거일자 입금전표발행']
      );

      const enrichedPermissions = enrichMenuPermissions({
        ...(formData.permissions || {}),
        deleteRecentActivity: isRepAdmin ? true : isDeleteActivity,
        '최근 처리 이력 삭제 권한': isRepAdmin ? true : isDeleteActivity,
        viewRecentActivity: isRepAdmin ? true : isViewActivity,
        '최근 처리 현황 보고서': isRepAdmin ? true : isViewActivity,
        '최근 처리 현황': isRepAdmin ? true : isViewActivity,
        '최근 처리 현황 권한': isRepAdmin ? true : isViewActivity,
        '상품금액노출': isRepAdmin ? true : isShowPurchasePrice,
        '발주_상품금액노출': isRepAdmin ? true : isShowPurchasePrice,
        showPurchasePrice: isRepAdmin ? true : isShowPurchasePrice,
        allowPastDateSlip: isRepAdmin ? true : isAllowPastDateSlip,
        '과거일자 전표발행': isRepAdmin ? true : isAllowPastDateSlip,
        allowPastDateDeposit: isRepAdmin ? true : isAllowPastDateDeposit,
        '과거일자 입금전표발행': isRepAdmin ? true : isAllowPastDateDeposit
      });

      if (isRepAdmin) {
        MENU_PERMISSIONS.forEach(g => {
          g.items.forEach(item => {
            enrichedPermissions[item] = true;
          });
        });
        MOBILE_CORE_MENUS.forEach(m => {
          enrichedPermissions[m.permKey] = true;
        });
        enrichedPermissions['ALL'] = true;
        enrichedPermissions['상품금액노출'] = true;
        enrichedPermissions['발주_상품금액노출'] = true;
        enrichedPermissions['타창고주문확인'] = true;
      }

      if (isCloning) {
        if (!formData.userId || !formData.userId.trim()) {
          alert('아이디를 입력해주세요.');
          return;
        }
        if (!formData.password || !formData.password.trim()) {
          alert('비밀번호를 입력해주세요.');
          return;
        }
        const { _docId, ...cleanForm } = formData;
        onSave({ 
          ...cleanForm, 
          showPurchasePrice: isShowPurchasePrice,
          deleteRecentActivity: isDeleteActivity,
          viewRecentActivity: isViewActivity,
          allowPastDateSlip: isAllowPastDateSlip,
          allowPastDateDeposit: isAllowPastDateDeposit,
          permissions: enrichedPermissions,
          id: Date.now() 
        }, true);
      } else {
        const payload = {
          ...formData,
          showPurchasePrice: isRepAdmin ? true : isShowPurchasePrice,
          deleteRecentActivity: isRepAdmin ? true : isDeleteActivity,
          viewRecentActivity: isRepAdmin ? true : isViewActivity,
          allowPastDateSlip: isRepAdmin ? true : isAllowPastDateSlip,
          allowPastDateDeposit: isRepAdmin ? true : isAllowPastDateDeposit,
          allowAllEditDelete: isRepAdmin ? true : Boolean(formData.allowAllEditDelete),
          allowSpecialPriceSave: isRepAdmin ? true : Boolean(formData.allowSpecialPriceSave),
          viewAllInventoryMovements: isRepAdmin ? true : Boolean(formData.viewAllInventoryMovements),
          viewOtherWarehouseOrders: isRepAdmin ? true : Boolean(formData.viewOtherWarehouseOrders),
          restrictPartnerSearch: isRepAdmin ? false : Boolean(formData.restrictPartnerSearch),
          password: formData.password || initialData?.password || '',
          permissions: enrichedPermissions
        };
        onSave(payload, false);
      }
    } else {
      onClose();
    }
  };

  const handleCloneToNew = () => {
    setFormData(prev => {
      const { _docId, ...rest } = prev;
      return {
        ...rest,
        id: Date.now(),
        userId: '',
        password: '',
        name: '',
        phone: '',
        sequence: nextSequence || '',
        address: '',
        zone: ''
      };
    });
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
            <label>아이디 {(!isEditing || isCloning) && <span className="required">*</span>}</label>
            <div className="staff-input-wrapper">
              <User size={16} className="staff-input-icon" />
              <input type="text" name="userId" value={formData.userId} onChange={handleChange} placeholder="로그인 아이디" className="staff-input" required={!isEditing || isCloning} autoComplete="off" />
            </div>
          </div>
          <div className="staff-input-group">
            <label>패스워드 {(!isEditing || isCloning) && <span className="required">*</span>}</label>
            <div className="staff-input-wrapper">
              <Lock size={16} className="staff-input-icon" />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder={isEditing && !isCloning ? "변경 시 새 비밀번호 입력" : "로그인 비밀번호"} 
                className="staff-input pr-10" 
                required={!isEditing || isCloning} 
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
          <div className="staff-input-group">
            <label>입사일</label>
            <div className="staff-input-wrapper">
              <Calendar size={16} className="staff-input-icon" />
              <input 
                type="date" 
                name="hireDate" 
                value={formData.hireDate || ''} 
                onChange={handleChange} 
                className="staff-input" 
                style={{ width: '100%', cursor: 'pointer' }} 
              />
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
          <label>기본 창고 / 차량 창고 <span className="required">*</span></label>
          <div className="staff-input-wrapper select-wrapper">
            <Building2 size={16} className="staff-input-icon" />
            <select name="warehouse" value={formData.warehouse || ''} onChange={handleChange} className="staff-input staff-select">
              <option value="">기본 창고 선택 안 함</option>
              {warehouses.length > 0 ? (
                warehouses.map(wh => {
                  const isVeh = wh.isVehicle || wh.name?.includes('차량');
                  return (
                    <option key={wh.id} value={wh.name}>
                      {wh.name}{isVeh ? ' [차량]' : ''}{wh.isMain ? ' (메인)' : ''}
                    </option>
                  );
                })
              ) : null}
            </select>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
            * 해당 직원이 수주 및 매출전표 발행 시 기본 출고 창고(차량 또는 창고)로 자동 지정됩니다.
          </span>
        </div>

        {/* Additional Permissions */}
        {isRepAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '8px',
            color: '#1e40af'
          }}>
            <Lock size={20} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1d4ed8', marginBottom: '2px' }}>
                👑 대표 관리자 계정 (모든 시스템 권한 자동 보유)
              </div>
              <div style={{ fontSize: '0.76rem', color: '#3b82f6', fontWeight: 500, lineHeight: 1.4 }}>
                최초 가입된 대표 관리자 아이디는 시스템 내 모든 메뉴 및 데이터에 대한 최고 권한을 항상 보유하므로, 별도의 권한 설정이 필요하지 않아 체크박스가 비활성화됩니다.
              </div>
            </div>
          </div>
        )}

        <div className="permission-section">
          <h4 className="permission-title" style={{ marginBottom: '12px' }}>추가 권한 설정</h4>
          <div className="additional-permissions-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 본인이 작성하지 않은 다른 직원의 재고이동 내역도 모두 조회할 수 있습니다.">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="viewAllInventoryMovements" checked={isRepAdmin ? true : Boolean(formData.viewAllInventoryMovements)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>전체 재고이동 목록 보기</span>
              </label>
            </div>
            
            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="매출전표에서 품목 단가 수정 시 해당 단가를 거래처 특별단가로 저장할지 묻는 팝업을 표시하고 저장할 수 있습니다.">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="allowSpecialPriceSave" checked={isRepAdmin ? true : Boolean(formData.allowSpecialPriceSave)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>직원별 특별단가관리</span>
              </label>
            </div>
            
            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 대시보드에서 최근 전표 등록, 변경, 이동, 삭제 등 처리 이력 위젯을 조회할 수 있습니다.">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="viewRecentActivity" checked={isRepAdmin ? true : Boolean(formData.viewRecentActivity)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>최근 처리 현황 권한</span>
              </label>
            </div>

            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 최근 처리 현황 보고서 및 작업 이력에서 개별 처리 이력 내역을 삭제할 수 있습니다.">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="deleteRecentActivity" checked={isRepAdmin ? true : Boolean(formData.deleteRecentActivity)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>최근 처리 이력 삭제 권한</span>
              </label>
            </div>
            
            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 해당 직원은 본인이 담당자로 지정된 거래처만 검색 및 조회할 수 있도록 제한됩니다. (미체크 시 전체 거래처 검색 가능)">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="restrictPartnerSearch" checked={isRepAdmin ? false : Boolean(formData.restrictPartnerSearch)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>전체 거래처 검색제한</span>
              </label>
            </div>
            
            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 매출/매입전표, 품목, 거래처, 계좌 등 시스템 내 모든 마스터 데이터를 수정하고 삭제할 수 있습니다. (미체크 시 본인이 작성한 데이터만 관리 가능)">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="allowAllEditDelete" checked={isRepAdmin ? true : Boolean(formData.allowAllEditDelete)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>모든 데이터 삭제/수정 권한</span>
              </label>
            </div>

            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 당일 이전(과거 일자)으로 수주, 견적서, 매출전표를 발행할 수 있습니다. (미체크 시 당일 및 미래 일자만 발행 가능)">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="allowPastDateSlip" checked={isRepAdmin ? true : Boolean(formData.allowPastDateSlip)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>과거일자 전표발행</span>
              </label>
            </div>

            <div className="permission-box" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', minHeight: '48px', backgroundColor: isRepAdmin ? '#f1f5f9' : '#f8fafc', cursor: isRepAdmin ? 'not-allowed' : 'default', opacity: isRepAdmin ? 0.85 : 1 }} title="체크 시 당일 이전(과거 일자)으로 입금전표를 발행할 수 있습니다. (미체크 시 당일 및 미래 일자만 발행 가능)">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', width: '100%' }}>
                <input type="checkbox" name="allowPastDateDeposit" checked={isRepAdmin ? true : Boolean(formData.allowPastDateDeposit)} disabled={isRepAdmin} onChange={handleChange} style={{ margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                <span className="checkbox-main-text" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', whiteSpace: 'normal', wordBreak: 'keep-all' }}>과거일자 입금전표발행</span>
              </label>
            </div>
          </div>
        </div>

        {/* 📱 모바일 전용 6대 핵심 메뉴 제어 (데스크탑 권한과 유기적 연동) */}
        <div className="permission-section mobile-menu-permissions" style={{
          marginTop: '12px',
          backgroundColor: '#f0f9ff',
          border: '1.5px solid #bae6fd',
          borderRadius: '12px',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.05rem' }}>📱</span>
                <h4 className="permission-title" style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0369a1' }}>
                  모바일 전용 메뉴 제어 (6대 핵심 기능)
                </h4>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#0284c7',
                  backgroundColor: '#e0f2fe',
                  border: '1px solid #7dd3fc',
                  padding: '2px 7px',
                  borderRadius: '999px'
                }}>
                  데스크탑 연동됨
                </span>
              </div>
              <p className="permission-desc" style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>
                모바일 접속 시 노출할 6대 필수 현장 기능(수주, 상차, 재고이동, 매출전표발행, 상품등록, 거래처등록)을 개별 제어합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isRepAdmin}
                onClick={handleSyncMobileFromDesktop}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  color: isRepAdmin ? '#94a3b8' : '#0369a1',
                  backgroundColor: '#ffffff',
                  border: '1px solid #7dd3fc',
                  borderRadius: '6px',
                  cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                  opacity: isRepAdmin ? 0.6 : 1
                }}
                title="아래 데스크탑 메뉴 체크 상태에 맞춰 모바일 6대 메뉴를 자동 동기화합니다"
              >
                🔗 데스크탑 권한 동기화
              </button>
              <button
                type="button"
                disabled={isRepAdmin}
                onClick={() => handleAllMobileToggle(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  color: isRepAdmin ? '#94a3b8' : '#ffffff',
                  backgroundColor: isRepAdmin ? '#cbd5e1' : '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                  opacity: isRepAdmin ? 0.6 : 1
                }}
              >
                ✓ 모바일 전체 허용
              </button>
              <button
                type="button"
                disabled={isRepAdmin}
                onClick={() => handleAllMobileToggle(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  color: '#64748b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                  opacity: isRepAdmin ? 0.6 : 1
                }}
              >
                ✕ 전체 해제
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
            gap: '8px'
          }}>
            {MOBILE_CORE_MENUS.map((m) => {
              const isChecked = isRepAdmin ? true : Boolean(formData?.permissions?.[m.permKey]);
              return (
                <label
                  key={m.permKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    backgroundColor: isChecked ? '#ffffff' : '#f8fafc',
                    border: isChecked ? `1.5px solid ${m.color}` : '1px solid #cbd5e1',
                    boxShadow: isChecked ? '0 2px 6px rgba(2, 132, 199, 0.1)' : 'none',
                    cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isRepAdmin}
                    onChange={(e) => handleMobilePermissionChange(m, e.target.checked)}
                    style={{
                      width: '15px',
                      height: '15px',
                      accentColor: m.color,
                      margin: 0,
                      cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{m.emoji}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: isChecked ? '#0f172a' : '#64748b',
                      lineHeight: 1.2
                    }}>
                      {m.label}
                    </span>
                    <span style={{
                      fontSize: '0.67rem',
                      fontWeight: 600,
                      color: isChecked ? m.color : '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {m.subLabel}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Menu Access Permissions (데스크탑 상세 필터 형태 카드 구성) */}
        <div className="permission-section menu-permissions" style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 className="permission-title" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                🖥️ 데스크탑 전체 메뉴 접근 권한 설정
              </h4>
              <p className="permission-desc" style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                데스크탑 버전에서 직원이 접근할 수 있는 상세 메뉴를 선택하세요. (선택 시 상단 모바일 6대 핵심 메뉴와 자동 연동됩니다)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={isRepAdmin}
                onClick={() => handleAllCategoriesToggle(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: isRepAdmin ? '#94a3b8' : '#2563eb',
                  backgroundColor: isRepAdmin ? '#f1f5f9' : '#eff6ff',
                  border: isRepAdmin ? '1px solid #cbd5e1' : '1px solid #bfdbfe',
                  borderRadius: '6px',
                  cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                  opacity: isRepAdmin ? 0.6 : 1
                }}
              >
                ✓ 전체 메뉴 선택
              </button>
              <button
                type="button"
                disabled={isRepAdmin}
                onClick={() => handleAllCategoriesToggle(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                  opacity: isRepAdmin ? 0.6 : 1
                }}
              >
                ✕ 전체 선택 해제
              </button>
            </div>
          </div>
          
          <div 
            className="menu-permission-cards-grid" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px'
            }}
          >
            {MENU_PERMISSIONS.map((group) => {
              const currentPermissions = formData?.permissions || {};
              const allChecked = group.items.every(item => Boolean(currentPermissions[item]));
              const someChecked = group.items.some(item => Boolean(currentPermissions[item]));
              
              return (
                <div 
                  key={group.category} 
                  style={{
                    backgroundColor: isRepAdmin ? '#f8fafc' : '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    overflow: 'hidden',
                    opacity: isRepAdmin ? 0.9 : 1
                  }}
                >
                  {/* Card Header (Category Title & 전체 선택) */}
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                      {group.category}
                    </span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: isRepAdmin ? 'not-allowed' : 'pointer', fontSize: '0.74rem', color: isRepAdmin ? '#94a3b8' : '#64748b', fontWeight: 600, userSelect: 'none' }}>
                      <input 
                        type="checkbox" 
                        checked={isRepAdmin ? true : allChecked} 
                        disabled={isRepAdmin}
                        ref={input => {
                          if (input) {
                            input.indeterminate = !isRepAdmin && someChecked && !allChecked;
                          }
                        }}
                        onChange={(e) => handleCategoryToggle(group.category, e.target.checked)} 
                        style={{ width: '13px', height: '13px', cursor: isRepAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb' }}
                      />
                      <span>전체 선택</span>
                    </label>
                  </div>
                  
                  {/* Card Body (Vertical Checkbox List) */}
                  <div style={{
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    flex: 1
                  }}>
                    {group.items.map(item => {
                      const isChecked = isRepAdmin ? true : Boolean(formData?.permissions?.[item]);
                      if (item === '발주' || item === '발주 등록') {
                        return (
                          <div key={item} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', color: isChecked ? '#1e293b' : '#475569', fontWeight: isChecked ? 600 : 500, cursor: isRepAdmin ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                disabled={isRepAdmin}
                                onChange={(e) => handlePermissionChange(item, e.target.checked)} 
                                style={{ width: '14px', height: '14px', cursor: isRepAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb', margin: 0 }}
                              />
                              <span>{item}</span>
                            </label>
                            <label 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                padding: '2px 6px', 
                                marginLeft: '21px',
                                background: isRepAdmin ? '#eff6ff' : (formData.showPurchasePrice ? '#fff7ed' : '#f8fafc'), 
                                border: isRepAdmin ? '1px solid #bfdbfe' : (formData.showPurchasePrice ? '1px solid #fed7aa' : '1px solid #cbd5e1'), 
                                borderRadius: '4px', 
                                cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                                fontSize: '0.72rem',
                                color: isRepAdmin ? '#1d4ed8' : (formData.showPurchasePrice ? '#c2410c' : '#64748b'),
                                fontWeight: 700,
                                userSelect: 'none',
                                width: 'fit-content'
                              }}
                              title="발주 등록 시 품목 단가, 금액 및 총액 노출 여부 (대표자 외 기본 가리기)"
                            >
                              <input 
                                type="checkbox" 
                                checked={isRepAdmin ? true : Boolean(formData.showPurchasePrice || formData.permissions?.['상품금액노출'] || formData.permissions?.['발주_상품금액노출'])} 
                                disabled={isRepAdmin}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFormData(prev => ({
                                    ...prev,
                                    showPurchasePrice: checked,
                                    permissions: {
                                      ...prev.permissions,
                                      '상품금액노출': checked,
                                      '발주_상품금액노출': checked
                                    }
                                  }));
                                }} 
                                style={{ width: '12px', height: '12px', margin: 0, cursor: isRepAdmin ? 'not-allowed' : 'pointer', accentColor: '#ea580c' }}
                              />
                              <span>상품금액노출</span>
                            </label>
                          </div>
                        );
                      }
                      return (
                        <label 
                          key={item} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '7px', 
                            fontSize: '0.8rem', 
                            color: isChecked ? '#1e293b' : '#475569', 
                            fontWeight: isChecked ? 600 : 500, 
                            cursor: isRepAdmin ? 'not-allowed' : 'pointer', 
                            userSelect: 'none' 
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            disabled={isRepAdmin}
                            onChange={(e) => handlePermissionChange(item, e.target.checked)} 
                            style={{ width: '14px', height: '14px', cursor: isRepAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb', margin: 0 }}
                          />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                    {(group.category === '매출/주문관리' || group.category === '매출/수주관리') && (
                      <label 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          color: '#2563eb', 
                          fontWeight: 700, 
                          borderTop: '1px dotted #e2e8f0', 
                          paddingTop: '6px', 
                          marginTop: '2px', 
                          fontSize: '0.76rem',
                          cursor: isRepAdmin ? 'not-allowed' : 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          name="viewOtherWarehouseOrders" 
                          checked={isRepAdmin ? true : (formData.viewOtherWarehouseOrders || false)} 
                          disabled={isRepAdmin}
                          onChange={handleChange} 
                          style={{ width: '14px', height: '14px', cursor: isRepAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb', margin: 0 }}
                        />
                        <span>★ 타창고주문확인 (타직원 주문 조회)</span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="staff-reg-footer" style={{ flexWrap: 'wrap' }}>
          {isEditing && !isCloning && (
            <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn-clone" 
                onClick={handleCloneToNew}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '9px 14px', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  color: '#475569', 
                  fontWeight: '600', 
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Copy size={15} /> 이 권한으로 신규 등록
              </button>
              {onDeleteStaff && !isRepAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteStaff(initialData);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={15} /> 직원 삭제
                </button>
              )}
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
          onAdd={async (newZone) => {
            const nextZones = [...staffZones, newZone];
            setStaffZones(nextZones);
            setFormData(prev => ({ ...prev, zone: newZone }));
            const companyId = currentUser?.companyId || 'default';
            localStorage.setItem(`staffZones_${companyId}`, JSON.stringify(nextZones));
            localStorage.setItem('staffZones', JSON.stringify(nextZones));
            try {
              await setDoc(doc(db, 'companies', companyId, 'settings', 'staffZones'), { value: nextZones, updatedAt: new Date().toISOString() }, { merge: true });
            } catch (e) {
              console.warn('Failed to save staffZones:', e);
            }
          }}
          onDelete={async (zoneToDelete) => {
            if (window.confirm(`'${zoneToDelete}' 지역을 삭제하시겠습니까?`)) {
              const nextZones = staffZones.filter(z => z !== zoneToDelete);
              setStaffZones(nextZones);
              if (formData.zone === zoneToDelete) {
                setFormData(prev => ({ ...prev, zone: '' }));
              }
              const companyId = currentUser?.companyId || 'default';
              localStorage.setItem(`staffZones_${companyId}`, JSON.stringify(nextZones));
              localStorage.setItem('staffZones', JSON.stringify(nextZones));
              try {
                await setDoc(doc(db, 'companies', companyId, 'settings', 'staffZones'), { value: nextZones, updatedAt: new Date().toISOString() }, { merge: true });
              } catch (e) {
                console.warn('Failed to save staffZones:', e);
              }
            }
          }}
          onClose={() => setMgmtModalType(null)}
        />
      )}

      {mgmtModalType === 'jobTitle' && (
        <CategoryManagerModal 
          title="직책 관리"
          items={staffJobTitles}
          onAdd={async (newTitle) => {
            const nextTitles = [...staffJobTitles, newTitle];
            setStaffJobTitles(nextTitles);
            setFormData(prev => ({ ...prev, jobTitle: newTitle }));
            const companyId = currentUser?.companyId || 'default';
            localStorage.setItem(`staffJobTitles_${companyId}`, JSON.stringify(nextTitles));
            localStorage.setItem('staffJobTitles', JSON.stringify(nextTitles));
            try {
              await setDoc(doc(db, 'companies', companyId, 'settings', 'staffJobTitles'), { value: nextTitles, updatedAt: new Date().toISOString() }, { merge: true });
            } catch (e) {
              console.warn('Failed to save staffJobTitles:', e);
            }
          }}
          onDelete={async (titleToDelete) => {
            if (window.confirm(`'${titleToDelete}' 직책을 삭제하시겠습니까?`)) {
              const nextTitles = staffJobTitles.filter(t => t !== titleToDelete);
              setStaffJobTitles(nextTitles);
              if (formData.jobTitle === titleToDelete) {
                setFormData(prev => ({ ...prev, jobTitle: nextTitles[0] || '사원' }));
              }
              const companyId = currentUser?.companyId || 'default';
              localStorage.setItem(`staffJobTitles_${companyId}`, JSON.stringify(nextTitles));
              localStorage.setItem('staffJobTitles', JSON.stringify(nextTitles));
              try {
                await setDoc(doc(db, 'companies', companyId, 'settings', 'staffJobTitles'), { value: nextTitles, updatedAt: new Date().toISOString() }, { merge: true });
              } catch (e) {
                console.warn('Failed to save staffJobTitles:', e);
              }
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
