import React, { useState } from 'react';
import { Calendar as CalendarIcon, Bell, FileText, Save, ArrowRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const roundToNext5Min = (date) => {
  const coeff = 1000 * 60 * 5;
  return new Date(Math.ceil(date.getTime() / coeff) * coeff);
};

const ScheduleRegistration = ({ onClose, selectedDate, onSave, initialData = null, scheduleTypes = [], onUpdateTypes, currentUser, onOpenTypeManagement }) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = true;

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
      start = roundToNext5Min(now);
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
        backgroundColor: '#0a0f1d',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      } : {}}
      contentPadding={isMobileView ? "16px" : undefined}
    >
      <div style={{ paddingBottom: '16px', borderBottom: isMobileView ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: isMobileView ? '#f8fafc' : '#1e293b', margin: 0 }}>
          <CalendarIcon color={isMobileView ? 'var(--primary)' : '#3b82f6'} size={20} />
          {formData.id ? "일정 정보 수정" : "신규 일정 등록"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: isMobileView ? '#cbd5e1' : '#475569' }}>일정 유형 <span style={{ color: '#dc2626' }}>*</span></label>
            <button 
              type="button" 
              onClick={() => onOpenTypeManagement && onOpenTypeManagement()}
              style={{ fontSize: '0.75rem', color: isMobileView ? 'var(--primary)' : '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              유형 관리
            </button>
          </div>

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
                    ? (isMobileView ? `color-mix(in srgb, ${color} 20%, transparent)` : `${color}15`)
                    : (isMobileView ? '#1e293b' : '#f8fafc'),
                  border: isSelected ? `1.5px solid ${color}` : (isMobileView ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'),
                  borderRadius: '20px',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  height: '32px'
                }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: name }))}
                    style={{
                      padding: '0 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: isSelected 
                        ? (color === '#ffffff' ? (isMobileView ? '#f8fafc' : '#1e293b') : color) 
                        : (isMobileView ? '#94a3b8' : '#64748b'),
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
        </div>

        {/* ── 시작/종료 일시 + 알람 설정: 컴팩트 한 블록 ── */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          backgroundColor: isMobileView ? 'rgba(255,255,255,0.03)' : '#f1f5f9', 
          padding: isMobileView ? '10px 12px' : '10px 14px', 
          borderRadius: '10px', 
          border: isMobileView ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0' 
        }}>
          {/* 시작 → 종료 한 행 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: isMobileView ? 'wrap' : 'nowrap' }}>
            {/* 시작 일시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: isMobileView ? '1 1 100%' : 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isMobileView ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap' }}>시작</span>
              <input 
                type="date" 
                value={formData.startDate} 
                onChange={(e) => handleStartChange('startDate', e.target.value)}
                style={{ 
                  flex: 2, 
                  padding: '5px 6px', 
                  fontSize: '0.78rem',
                  border: isMobileView ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  backgroundColor: isMobileView ? '#0f172a' : '#ffffff',
                  color: isMobileView ? '#e2e8f0' : '#334155'
                }}
              />
              <input 
                type="time" 
                value={formData.startTime} 
                onChange={(e) => handleStartChange('startTime', e.target.value)}
                step="300"
                style={{ 
                  flex: 1, 
                  padding: '5px 6px', 
                  fontSize: '0.78rem',
                  border: isMobileView ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  backgroundColor: isMobileView ? '#0f172a' : '#ffffff',
                  color: isMobileView ? '#e2e8f0' : '#334155'
                }}
              />
            </div>

            <ArrowRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />

            {/* 종료 일시 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: isMobileView ? '1 1 100%' : 1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isMobileView ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap' }}>종료</span>
              <input 
                type="date" 
                name="endDate"
                value={formData.endDate} 
                onChange={handleChange}
                style={{ 
                  flex: 2, 
                  padding: '5px 6px', 
                  fontSize: '0.78rem',
                  border: isMobileView ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  backgroundColor: isMobileView ? '#0f172a' : '#ffffff',
                  color: isMobileView ? '#e2e8f0' : '#334155'
                }}
              />
              <input 
                type="time" 
                name="endTime"
                value={formData.endTime} 
                onChange={handleChange}
                style={{ 
                  flex: 1, 
                  padding: '5px 6px', 
                  fontSize: '0.78rem',
                  border: isMobileView ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  backgroundColor: isMobileView ? '#0f172a' : '#ffffff',
                  color: isMobileView ? '#e2e8f0' : '#334155'
                }}
              />
            </div>
          </div>

          {/* 알람 설정 — 한 행 인라인 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bell size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isMobileView ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap' }}>알람</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
              <select 
                name="notification" 
                value={formData.notification} 
                onChange={handleChange}
                style={{ 
                  padding: '4px 24px 4px 8px', 
                  fontSize: '0.75rem',
                  border: isMobileView ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  outline: 'none', 
                  appearance: 'none', 
                  backgroundColor: isMobileView ? '#0f172a' : '#ffffff', 
                  color: isMobileView ? '#e2e8f0' : '#334155', 
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="설정 안함">설정 안함</option>
                <option value="5분 전">5분 전</option>
                <option value="10분 전">10분 전</option>
                <option value="30분 전">30분 전</option>
                <option value="1시간 전">1시간 전</option>
              </select>
              <div style={{ position: 'absolute', right: '7px', pointerEvents: 'none', fontSize: '9px', color: '#94a3b8' }}>▼</div>
            </div>
          </div>
        </div>

        {/* ── 내용 입력: 눈에 확 들어오게 강조 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ 
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '1rem', fontWeight: 700, 
            color: isMobileView ? '#f1f5f9' : '#1e293b' 
          }}>
            <FileText size={17} color={isMobileView ? 'var(--primary)' : '#3b82f6'} />
            내용 입력
            <span style={{ 
              fontSize: '0.7rem', fontWeight: 600,
              color: '#dc2626', 
              backgroundColor: isMobileView ? 'rgba(220,38,38,0.12)' : '#fee2e2',
              padding: '1px 6px', borderRadius: '10px'
            }}>필수</span>
          </label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="어떤 일정인가요? 상세 내용을 입력하세요."
            required
            rows="5"
            style={{ 
              width: '100%', 
              padding: '14px 16px', 
              border: isMobileView 
                ? '2px solid rgba(59,130,246,0.35)' 
                : '2px solid #bfdbfe', 
              borderRadius: '10px', 
              outline: 'none', 
              resize: 'vertical', 
              fontFamily: 'inherit', 
              fontSize: '0.95rem',
              lineHeight: '1.6',
              color: isMobileView ? '#f1f5f9' : '#1e293b', 
              backgroundColor: isMobileView ? '#0f172a' : '#ffffff',
              boxShadow: isMobileView 
                ? '0 0 0 3px rgba(59,130,246,0.08)' 
                : '0 0 0 3px rgba(59,130,246,0.06)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = isMobileView ? 'rgba(59,130,246,0.7)' : '#3b82f6';
              e.target.style.boxShadow = isMobileView 
                ? '0 0 0 3px rgba(59,130,246,0.18)' 
                : '0 0 0 3px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isMobileView ? 'rgba(59,130,246,0.35)' : '#bfdbfe';
              e.target.style.boxShadow = isMobileView 
                ? '0 0 0 3px rgba(59,130,246,0.08)' 
                : '0 0 0 3px rgba(59,130,246,0.06)';
            }}
          ></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              padding: '10px 16px', 
              backgroundColor: isMobileView ? '#1e293b' : 'white', 
              border: isMobileView ? 'none' : '1px solid #cbd5e1', 
              borderRadius: '6px', 
              color: isMobileView ? '#cbd5e1' : '#475569', 
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
