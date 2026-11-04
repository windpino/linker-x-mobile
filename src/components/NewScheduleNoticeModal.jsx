import React, { useState } from 'react';
import { Bell, Calendar, Clock, User, Check, ChevronLeft, ChevronRight, X, CheckCheck } from 'lucide-react';
import WindowModal from './WindowModal';

const NewScheduleNoticeModal = ({ 
  noticeSchedules = [], 
  noticeSchedule = null, 
  currentUser = null,
  onClose, 
  onConfirm, 
  onConfirmAll,
  scheduleTypes = [] 
}) => {
  // Normalize into array of schedules
  const list = noticeSchedules && noticeSchedules.length > 0 
    ? noticeSchedules 
    : (noticeSchedule ? [noticeSchedule] : []);

  const [currentIndex, setCurrentIndex] = useState(0);

  if (list.length === 0) return null;

  // Ensure index in bound
  const safeIndex = Math.min(Math.max(currentIndex, 0), list.length - 1);
  const currentItem = list[safeIndex];

  const matchType = scheduleTypes.find(t => t.name === currentItem.type);
  const badgeColor = matchType ? matchType.color : '#3b82f6';
  const badgeBg = matchType && matchType.color?.startsWith('#') ? `${matchType.color}20` : '#eff6ff';

  const isMySchedule = currentItem.author === currentUser?.name;

  const handleNext = () => {
    if (safeIndex < list.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleConfirmCurrent = () => {
    if (onConfirm) {
      onConfirm(currentItem);
    }
    // If not last, adjust index
    if (safeIndex >= list.length - 1 && safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleConfirmAll = () => {
    if (onConfirmAll) {
      onConfirmAll(list);
    } else if (onConfirm) {
      list.forEach(item => onConfirm(item));
    }
  };

  return (
    <WindowModal 
      title={`[${currentUser?.name || '담당자'}] 일정 및 업무 알림`} 
      onClose={onClose} 
      width="92%" 
      height="auto"
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 10000
      }}
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Top Header Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0
            }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                {currentUser?.name ? `${currentUser.name} 담당자님 일정 안내` : '새로운 업무 일정 및 메시지'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                확인하지 않은 일정 {list.length}건이 있습니다.
              </div>
            </div>
          </div>

          {/* Multiple items paging indicator */}
          {list.length > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#475569'
            }}>
              <span>{safeIndex + 1}</span>
              <span style={{ color: '#94a3b8' }}>/</span>
              <span>{list.length}</span>
            </div>
          )}
        </div>

        {/* Schedule preview card */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Top row: Type badge & Time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '5px',
              backgroundColor: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeColor}40`
            }}>
              {currentItem.type || '기타'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
              <Clock size={12} />
              <span>{currentItem.startTime || currentItem.time || '시간 미지정'}{currentItem.endTime ? ` ~ ${currentItem.endTime}` : ''}</span>
            </div>
          </div>

          {/* Date & Author */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.8rem', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
              <Calendar size={13} color="#3b82f6" />
              <span>{currentItem.startDate || currentItem.date}</span>
              {currentItem.endDate && currentItem.endDate !== (currentItem.startDate || currentItem.date) && (
                <span>~ {currentItem.endDate}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#64748b' }}>
              <User size={12} />
              <span>작성: <strong style={{ color: '#1e293b' }}>{isMySchedule ? '본인' : (currentItem.author || '동료')}</strong></span>
            </div>
          </div>

          {/* Message / Description Box */}
          <div style={{
            fontSize: '0.82rem',
            color: '#1e293b',
            backgroundColor: '#ffffff',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            whiteSpace: 'pre-wrap',
            minHeight: '60px',
            maxHeight: '120px',
            overflowY: 'auto',
            lineHeight: '1.45',
            fontWeight: 500
          }}>
            {currentItem.description || '(내용 없음)'}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          {/* Left: Close */}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              backgroundColor: '#ffffff'
            }}
          >
            닫기
          </button>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Paging buttons if multiple */}
            {list.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: safeIndex === 0 ? '#cbd5e1' : '#475569',
                    cursor: safeIndex === 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="이전 일정"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={safeIndex === list.length - 1}
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: safeIndex === list.length - 1 ? '#cbd5e1' : '#475569',
                    cursor: safeIndex === list.length - 1 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="다음 일정"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAll}
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="모든 일정을 일괄 확인합니다"
                >
                  <CheckCheck size={13} /> 모두 확인
                </button>
              </>
            )}

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirmCurrent}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(37,99,235,0.3)'
              }}
            >
              <Check size={13} strokeWidth={3} /> 확인 완료
            </button>
          </div>
        </div>
      </div>
    </WindowModal>
  );
};

export default NewScheduleNoticeModal;
