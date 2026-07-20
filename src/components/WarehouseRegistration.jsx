import React, { useState, useEffect } from 'react';
import { Box, MapPin, FileText, Edit, User } from 'lucide-react';
import WindowModal from './WindowModal';

const WarehouseRegistration = ({ onClose, initialData, onSave, staffList = [] }) => {
  const isEditing = !!initialData;
  const titleText = isEditing ? "창고 정보 수정" : "신규 창고 등록";
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    memo: '',
    isMain: false,
    color: '#3b82f6', // Default blue
    manager: ''
  });

  const PRESET_COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Green', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Black', value: '#1e293b' },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        address: initialData.address || '',
        memo: initialData.memo || '',
        isMain: initialData.isMain || false,
        color: initialData.color || '#3b82f6',
        manager: initialData.manager || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave(formData);
    }
    alert(isEditing ? '창고 정보가 수정되었습니다.' : '신규 창고가 등록되었습니다.');
  };

  return (
    <WindowModal title="창고관리" onClose={onClose}>
      <div className="wh-reg-header">
        <h3 className="wh-reg-title">
          {isEditing ? <Edit color={formData.color} size={20} /> : <Box color={formData.color} size={20} />}
          {titleText}
        </h3>
      </div>

      <form className="wh-reg-form" onSubmit={handleSubmit}>
        <div className="wh-input-group">
          <label>창고명 <span className="required">*</span></label>
          <div className="wh-input-wrapper">
            <Box size={16} className="wh-input-icon" style={{ color: formData.color }} />
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="예: 제1 물류센터" 
              className="wh-input" 
              required
            />
          </div>
        </div>

        <div className="wh-input-group">
          <label>창고 식별 색상</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: c.value })}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  border: formData.color === c.value ? '3px solid #1e293b' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  transform: formData.color === c.value ? 'scale(1.1)' : 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="wh-input-group">
          <label>담당자</label>
          <div className="wh-input-wrapper select-wrapper">
            <User size={16} className="wh-input-icon" />
            <select 
              name="manager" 
              value={formData.manager} 
              onChange={handleChange} 
              className="wh-input wh-select"
            >
              <option value="">담당자 선택 안 함</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.name}>
                  {staff.name} {staff.jobTitle ? `(${staff.jobTitle})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="wh-input-group">
          <label>주소 <span className="required">*</span></label>
          <div className="wh-input-wrapper">
            <MapPin size={16} className="wh-input-icon" />
            <input 
              type="text" 
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="예: 서울특별시 강남구..." 
              className="wh-input" 
              required
            />
          </div>
        </div>

        <div className="wh-input-group">
          <label>설명 / 메모</label>
          <div className="wh-input-wrapper align-top">
            <FileText size={16} className="wh-input-icon mt-3" />
            <textarea 
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              placeholder="창고에 대한 추가 설명을 입력하세요." 
              className="wh-textarea" 
              rows="4"
            ></textarea>
          </div>
        </div>

        <div className="wh-checkbox-container">
          <label className="wh-checkbox-label">
            <input 
              type="checkbox" 
              name="isMain"
              checked={formData.isMain}
              onChange={handleChange}
              className="wh-checkbox-input" 
            />
            <span className="wh-checkbox-text">이 창고를 메인 창고로 설정합니다.</span>
          </label>
        </div>

        <div className="wh-reg-footer">
          <button type="button" className="btn-outline" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary"><FileText size={16} /> 저장하기</button>
        </div>
      </form>
    </WindowModal>
  );
};

export default WarehouseRegistration;
