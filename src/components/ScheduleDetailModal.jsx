import React from 'react';
import { Clock, User, CheckCircle2, MessageSquare, Tag } from 'lucide-react';
import WindowModal from './WindowModal';

const ScheduleDetailModal = ({ schedule, onClose, currentUser, scheduleTypes = [], onUpdateSchedule, onDeleteSchedule }) => {
  if (!schedule) return null;

  const getBadgeColors = (type) => {
    const match = scheduleTypes.find(t => t.name === type);
    if (match) {
      const baseColor = match.color;
      const bgColor = baseColor.startsWith('#') ? `${baseColor}26` : baseColor;
      return { bg: bgColor, text: baseColor, border: `${baseColor}80` };
    }

    switch (type) {
      case '입고예정':
        return { bg: 'var(--sch-in-bg, #dcfce7)', text: 'var(--sch-in-text, #166534)', border: '#bbf7d0' };
      case '납품':
        return { bg: 'var(--sch-out-bg, #dbeafe)', text: 'var(--sch-out-text, #1e40af)', border: '#bfdbfe' };
      case '업무지시':
        return { bg: 'var(--sch-work-bg, #fef3c7)', text: 'var(--sch-work-text, #92400e)', border: '#fde68a' };
      case '회식':
        return { bg: 'var(--sch-dinner-bg, #fce7f3)', text: 'var(--sch-dinner-text, #9d174d)', border: '#fbcfe8' };
      case '휴무일':
        return { bg: 'var(--sch-holiday-bg, #fee2e2)', text: 'var(--sch-holiday-text, #b91c1c)', border: '#fca5a5' };
      default:
        return { bg: 'var(--sch-etc-bg, #f3e8ff)', text: 'var(--sch-etc-text, #6b21a8)', border: '#e9d5ff' };
    }
  };

  const badgeColors = getBadgeColors(schedule.type);
  const viewers = schedule.viewers || [];

  const canDelete = 
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'admin' || 
    currentUser?.userId === 'admin' ||
    (schedule.author && currentUser?.name && schedule.author === currentUser.name);

  const handleDeleteClick = () => {
    if (window.confirm('일정을 삭제하시겠습니까?')) {
      if (onDeleteSchedule) {
        onDeleteSchedule(schedule.id);
      }
    }
  };

  return (
    <WindowModal title="일정 상세 정보" onClose={onClose} width="550px" height="420px">
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: badgeColors.bg,
              color: badgeColors.text,
              border: `1px solid ${badgeColors.border}`,
              letterSpacing: '0.5px'
            }}>
              {schedule.type}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={16} color="#64748b" />
              {schedule.time || '하루 종일'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
            <User size={14} />
            <span>작성자: <strong style={{ color: '#334155' }}>{schedule.author || '시스템'}</strong></span>
          </div>
        </div>

        {/* Date Information */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          color: '#334155',
          fontWeight: 600
        }}>
          <Tag size={16} color="var(--primary, #3b82f6)" />
          일정 날짜: {schedule.date || schedule.startDate}
          {schedule.endDate && schedule.endDate !== schedule.startDate && ` ~ ${schedule.endDate}`}
        </div>

        {/* Description Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
            <MessageSquare size={16} color="#3b82f6" />
            상세 내용
          </div>
          <div style={{
            minHeight: '80px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '0.95rem',
            color: '#334155',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
          }}>
            {schedule.description || '상세 내용이 작성되지 않았습니다.'}
          </div>
        </div>

        {/* Viewers (Read Confirmation) Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
              <CheckCircle2 size={16} color="#10b981" />
              확인한 사람
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>총 {viewers.length}명</span>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '10px 14px',
            minHeight: '44px',
            alignContent: 'flex-start'
          }}>
            {viewers.length > 0 ? (
              viewers.map((name, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    backgroundColor: '#e8f5e9',
                    color: '#166534',
                    borderRadius: '20px',
                    border: '1px solid #dcfce7',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
                  {name}
                </span>
              ))
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#84cc16', fontSize: '0.85rem', fontWeight: 500, minHeight: '24px' }}>
                아직 이 일정을 확인한 사람이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          {canDelete ? (
            <button
              onClick={handleDeleteClick}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid #fee2e2',
                backgroundColor: '#fef2f2',
                color: '#ef4444'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#fef2f2';
              }}
            >
              일정 삭제
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="btn-outline"
            style={{
              padding: '8px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid #cbd5e1',
              color: '#475569'
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </WindowModal>
  );
};

export default ScheduleDetailModal;
