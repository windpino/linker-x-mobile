import React from 'react';
import { Bell, Calendar, Clock, User, ArrowRight, X } from 'lucide-react';
import WindowModal from './WindowModal';

const NewScheduleNoticeModal = ({ noticeSchedule, onClose, onConfirm, scheduleTypes = [] }) => {
  if (!noticeSchedule) return null;

  const matchType = scheduleTypes.find(t => t.name === noticeSchedule.type);
  const badgeColor = matchType ? matchType.color : '#3b82f6';
  const badgeBg = matchType && matchType.color?.startsWith('#') ? `${matchType.color}20` : '#eff6ff';

  return (
    <WindowModal 
      title="새로운 공개 일정 등록 알림" 
      onClose={onClose} 
      width="92%" 
      height="auto"
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 10000
      }}
    >
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <Bell size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
              새로운 공개 일정이 등록되었습니다!
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              <strong style={{ color: '#0f172a' }}>{noticeSchedule.author || '동료'}</strong>님이 새로운 공개 일정을 공유하였습니다.
            </div>
          </div>
        </div>

        {/* Schedule preview card */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeColor}40`
            }}>
              {noticeSchedule.type || '기타'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#64748b' }}>
              <Clock size={12} />
              <span>{noticeSchedule.startTime || noticeSchedule.time || '시간 미지정'}{noticeSchedule.endTime ? ` ~ ${noticeSchedule.endTime}` : ''}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
            <Calendar size={14} color="#3b82f6" />
            <span>일정 날짜: {noticeSchedule.startDate || noticeSchedule.date}</span>
            {noticeSchedule.endDate && noticeSchedule.endDate !== (noticeSchedule.startDate || noticeSchedule.date) && (
              <span>~ {noticeSchedule.endDate}</span>
            )}
          </div>

          <div style={{
            fontSize: '0.85rem',
            color: '#1e293b',
            backgroundColor: '#ffffff',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            whiteSpace: 'pre-wrap',
            maxHeight: '110px',
            overflowY: 'auto',
            lineHeight: '1.4'
          }}>
            {noticeSchedule.description || '상세 내용 없음'}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
            style={{
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              color: '#475569',
              backgroundColor: '#ffffff'
            }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => onConfirm(noticeSchedule)}
            className="btn-primary"
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            확인 (일정 보기) <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </WindowModal>
  );
};

export default NewScheduleNoticeModal;
