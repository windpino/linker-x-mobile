import React, { useState } from 'react';
import { Calendar as CalendarIcon, Bell, FileText, Save, ArrowRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const roundToNext10Min = (date) => {
  const coeff = 1000 * 60 * 10;
  return new Date(Math.ceil(date.getTime() / coeff) * coeff);
};

const ScheduleRegistration = ({ onClose, selectedDate, onSave, initialData = null, scheduleTypes = [], onUpdateTypes, currentUser, onOpenTypeManagement }) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;

  const getInitialTimes = () => {
    if (initialData) {
      return {
        startDate: initialData.startDate || format(selectedDate || new Date(), 'yyyy-MM-dd'),
        startTime: initialData.startTime || initialData.time || '10:00',
        endDate: initialData.endDate || format(selectedDate || new Date(), 'yyyy-MM-dd'),
        endTime: initialData.endTime || '11:00'
      };
    }

    const now = new Date();
    const isToday = (selectedDate || new Date()).toDateString() === now.toDateString();
    
    let start;
    if (isToday) {
      start = roundToNext10Min(now);
    } else {
      start = new Date(selectedDate);
      start.setHours(9, 0, 0, 0);
    }
    
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const startStr = format(start, 'yyyy-MM-dd');
    return {
      startDate: startStr,
      startTime: format(start, 'HH:mm'),
      endDate: startStr, // Always match startDate initially to prevent late-night crossover spanning to the next day
      endTime: format(end, 'HH:mm')
    };
  };

  const initialTimes = getInitialTimes();

  const [formData, setFormData] = useState({
    ...initialTimes,
    notification: initialData?.notification || '10분 전',
    type: initialData?.type || (scheduleTypes.length > 0 ? (typeof scheduleTypes[0] === 'object' ? scheduleTypes[0].name : scheduleTypes[0]) : '기타'),
    description: initialData?.description || '',
    id: initialData?.id || null,
  });

  const [showTypes, setShowTypes] = useState(false);

  const handleStartChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      try {
        const currentStart = new Date(`${newData.startDate}T${newData.startTime}`);
        const newEnd = new Date(currentStart.getTime() + 60 * 60 * 1000);
        
        // Always keep endDate the same as startDate by default for single-day convenience
        // unless it was already a multi-day event or user manually changes it later.
        return {
          ...newData,
          endDate: newData.startDate, // Match start date string
          endTime: format(newEnd, 'HH:mm')
        };
      } catch (e) {
        return newData;
      }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...formData,
        time: formData.startTime
      });
    }
    alert(formData.id ? '일정이 수정되었습니다.' : '일정이 성공적으로 추가되었습니다.');
    onClose();
  };

  return (
    <WindowModal 
      title={formData.id ? "일정 수정" : "일정 추가"} 
      onClose={onClose}
      style={isMobileView ? {
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0'
      } : {}}
      contentPadding={isMobileView ? "16px" : undefined}
    >
      <div style={{ paddingBottom: '16px', borderBottom: isMobileView ? '1px solid #e2e8f0' : '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#1e293b', margin: 0 }}>
          <CalendarIcon color={'#3b82f6'} size={20} />
          {formData.id ? "일정 정보 수정" : "신규 일정 등록"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: isMobileView ? '#cbd5e1' : '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              일정 유형 <span style={{ color: '#dc2626' }}>*</span>
              <button
                type="button"
                onClick={() => setShowTypes(!showTypes)}
                style={{
                  fontSize: '0.75rem',
                  color: '#3b82f6',
                  background: isMobileView ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                  border: isMobileView ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #dbeafe',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  marginLeft: '6px'
                }}
              >
                {showTypes ? '가리기' : '펼치기'}
              </button>
            </label>
            <button 
              type="button" 
              onClick={() => onOpenTypeManagement && onOpenTypeManagement()}
              style={{ fontSize: '0.75rem', color: isMobileView ? 'var(--primary)' : '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              유형 관리
            </button>
          </div>

          {!showTypes ? (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 12px', 
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                width: 'fit-content',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
              onClick={() => setShowTypes(true)}
              title="클릭하여 유형 전체 보기"
            >
              {(() => {
                const matched = scheduleTypes.find(t => (typeof t === 'object' ? t.name : t) === formData.type);
                const color = matched && typeof matched === 'object' ? matched.color : '#64748b';
                return (
                  <>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }}></span>
                    <span>{formData.type || '선택 없음'}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '4px', fontWeight: 500 }}>(클릭하여 펼치기)</span>
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {scheduleTypes.map(typeObj => {
                const name = typeof typeObj === 'object' ? typeObj.name : typeObj;
                const color = typeof typeObj === 'object' ? typeObj.color : '#64748b';
                const isSelected = formData.type === name;
                
                return (
                  <div key={name} className="type-item-group" style={{ 
                    display: 'flex', 
                    alignItems: 'stretch', 
                    backgroundColor: isSelected 
                      ? (color === '#ffffff' ? '#e2e8f0' : `${color}15`)
                      : '#f8fafc',
                    border: isSelected ? `1.5px solid ${color}` : '1px solid #e2e8f0',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    height: '32px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, type: name }));
                        setShowTypes(false); // Collapses the type list when selected!
                      }}
                      style={{
                        padding: '0 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: isSelected 
                          ? (color === '#ffffff' ? '#1e293b' : color) 
                          : '#64748b',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, border: '1px solid rgba(0,0,0,0.08)' }}></span>
                      {name}
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => onOpenTypeManagement && onOpenTypeManagement()}
                style={{
                  padding: '0 12px',
                  backgroundColor: isMobileView ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                  border: isMobileView ? '1.5px dashed var(--primary)' : '1.5px dashed #3b82f6',
                  borderRadius: '20px',
                  color: isMobileView ? 'var(--primary)' : '#3b82f6',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '32px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isMobileView ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isMobileView ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Plus size={14} /> 유형 추가
              </button>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          backgroundColor: '#f8fafc', 
          padding: '16px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobileView ? 'wrap' : 'nowrap' }}>
            <div style={{ flex: 1, minWidth: isMobileView ? '100%' : 'auto' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>시작 일시</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="date" 
                  value={formData.startDate} 
                  onChange={(e) => handleStartChange('startDate', e.target.value)}
                  style={{ 
                    flex: 2, 
                    padding: '8px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    backgroundColor: '#ffffff',
                    color: '#334155'
                  }}
                />
                <input 
                  type="time" 
                  value={formData.startTime} 
                  onChange={(e) => handleStartChange('startTime', e.target.value)}
                  step="300"
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    backgroundColor: '#ffffff',
                    color: '#334155'
                  }}
                />
              </div>
            </div>
            {!isMobileView && <ArrowRight size={20} color="#94a3b8" style={{ marginTop: '20px' }} />}
            <div style={{ flex: 1, minWidth: isMobileView ? '100%' : 'auto' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>종료 일시</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="date" 
                  name="endDate"
                  value={formData.endDate} 
                  onChange={handleChange}
                  style={{ 
                    flex: 2, 
                    padding: '8px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    backgroundColor: '#ffffff',
                    color: '#334155'
                  }}
                />
                <input 
                  type="time" 
                  name="endTime"
                  value={formData.endTime} 
                  onChange={handleChange}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    backgroundColor: '#ffffff',
                    color: '#334155'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>알림 설정</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Bell size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', zIndex: 1 }} />
              <select 
                name="notification" 
                value={formData.notification} 
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '10px 12px 10px 32px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  outline: 'none', 
                  appearance: 'none', 
                  backgroundColor: '#ffffff', 
                  color: '#334155', 
                  fontFamily: 'inherit', 
                  position: 'relative' 
                }}
              >
                <option value="설정 안함" style={{ backgroundColor: '#ffffff', color: '#334155' }}>설정 안함</option>
                <option value="5분 전" style={{ backgroundColor: '#ffffff', color: '#334155' }}>5분 전</option>
                <option value="10분 전" style={{ backgroundColor: '#ffffff', color: '#334155' }}>10분 전</option>
                <option value="30분 전" style={{ backgroundColor: '#ffffff', color: '#334155' }}>30분 전</option>
                <option value="1시간 전" style={{ backgroundColor: '#ffffff', color: '#334155' }}>1시간 전</option>
              </select>
              <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', fontSize: '10px', color: '#94a3b8' }}>▼</div>
            </div>
          </div>
          <div style={{ flex: 1 }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>일정 설명 <span style={{ color: '#dc2626' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <FileText size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="일정의 상세 내용을 입력하세요."
              required
              rows="4"
              style={{ 
                width: '100%', 
                padding: '10px 12px 10px 32px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                outline: 'none', 
                resize: 'vertical', 
                fontFamily: 'inherit', 
                color: '#334155', 
                backgroundColor: '#ffffff' 
              }} 
            ></textarea>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              padding: '10px 16px', 
              backgroundColor: 'white', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              color: '#475569', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            취소
          </button>
          <button 
            type="submit" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 24px', 
              backgroundColor: isMobileView ? 'var(--primary)' : '#3b82f6', 
              border: 'none', 
              borderRadius: '6px', 
              color: 'white', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            <Save size={16} />
            저장하기
          </button>
        </div>
      </form>
    </WindowModal>
  );
};

export default ScheduleRegistration;
