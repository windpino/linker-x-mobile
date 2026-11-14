import React from 'react';
import { Clock, CheckCircle2, Trash2, Edit3, Plus, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';
import { format, isSameDay, startOfDay, isWithinInterval, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

const ScheduleSidebar = ({ selectedDate, onDateSelect, schedules = [], setSchedules, currentUser, onAdd, onAddOrder, onCopy, onEdit, onDelete, isDashboardLocked, onOpenScheduleDetail, scheduleTypes = [], hiddenScheduleTypes = [] }) => {
  const getBadgeStyles = (type) => {
    const match = scheduleTypes.find(t => t.name === type);
    if (match) {
      const baseColor = match.color;
      const bgColor = baseColor.startsWith('#') ? `${baseColor}26` : baseColor;
      return {
        backgroundColor: bgColor,
        color: baseColor,
        border: `1px solid ${baseColor}80`
      };
    }
    
    // 기본 하드코딩 폴백
    let bgColor = 'var(--sch-etc-bg, #f3e8ff)';
    let textColor = 'var(--sch-etc-text, #6b21a8)';
    let borderColor = '#e9d5ff';
    if (type === '입고예정') { bgColor = 'var(--sch-in-bg)'; textColor = 'var(--sch-in-text)'; borderColor = 'rgba(16, 185, 129, 0.4)'; }
    else if (type === '납품') { bgColor = 'var(--sch-out-bg)'; textColor = 'var(--sch-out-text)'; borderColor = 'rgba(59, 130, 246, 0.4)'; }
    else if (type === '업무지시') { bgColor = 'var(--sch-work-bg)'; textColor = 'var(--sch-work-text)'; borderColor = 'rgba(245, 158, 11, 0.4)'; }
    else if (type === '회식') { bgColor = 'var(--sch-dinner-bg)'; textColor = 'var(--sch-dinner-text)'; borderColor = 'rgba(236, 72, 153, 0.4)'; }
    else if (type === '기타') { bgColor = 'var(--sch-etc-bg)'; textColor = 'var(--sch-etc-text)'; borderColor = 'rgba(139, 92, 246, 0.4)'; }
    else if (type === '휴무일') { bgColor = 'var(--sch-holiday-bg)'; textColor = 'var(--sch-holiday-text)'; borderColor = 'rgba(239, 68, 68, 0.4)'; }
    
    return {
      backgroundColor: bgColor,
      color: textColor,
      border: `1px solid ${borderColor}`
    };
  };

  const [deletingId, setDeletingId] = React.useState(null);
  const formattedDate = format(selectedDate, 'M월 d일', { locale: ko });
  
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin';
  const dailySchedules = (schedules || [])
    .filter(s => {
      const dayStr = format(selectedDate, 'yyyy-MM-dd');
      const sStart = s.startDate || s.date;
      const sEnd = s.endDate || s.startDate || s.date;
      if (s.isPublic === false && s.author !== currentUser?.name && !isAdmin) return false;
      return dayStr >= sStart && dayStr <= sEnd && !(hiddenScheduleTypes || []).includes(s.type);
    })
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleToggleCheck = (id) => {
    if (!currentUser) return;
    
    setSchedules(prev => prev.map(s => {
      if (s.id === id) {
        const viewers = s.viewers || [];
        if (viewers.includes(currentUser.name)) {
          return { ...s, viewers: viewers.filter(name => name !== currentUser.name) };
        } else {
          return { ...s, viewers: [...viewers, currentUser.name] };
        }
      }
      return s;
    }));
  };

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', padding: '0 0 8px 0', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', marginBottom: '8px', cursor: isDashboardLocked ? 'default' : 'grab', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', minWidth: 0 }}>
          <Clock size={16} color="#2563eb" style={{ flexShrink: 0 }} />
          {onDateSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playMenuClickSound();
                onDateSelect(addDays(selectedDate, -1));
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                padding: 0,
                borderRadius: '50%',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                color: '#1e293b',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="이전 날짜 (하루 전)"
            >
              <ChevronLeft size={13} />
            </button>
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#000000', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
            {formattedDate} 일정
          </span>
          {onDateSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playMenuClickSound();
                onDateSelect(addDays(selectedDate, 1));
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                padding: 0,
                borderRadius: '50%',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                color: '#1e293b',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="다음 날짜 (하루 뒤)"
            >
              <ChevronRight size={13} />
            </button>
          )}
          {dailySchedules.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(96, 165, 250, 0.35)', padding: '1px 7px', borderRadius: '10px', fontWeight: 800, flexShrink: 0 }}>
              {dailySchedules.length}건
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {onAddOrder && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); playMenuClickSound(); onAddOrder(); }} 
              style={{ 
                padding: '4px 8px', fontSize: '0.72rem', fontWeight: 800, 
                display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                backgroundColor: '#2563eb', color: 'white', borderRadius: '7px', border: '1px solid #3b82f6', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Plus size={12} /> 수주
            </button>
          )}
          <button 
            className="btn-sub-primary" 
            type="button"
            onClick={(e) => { e.stopPropagation(); playMenuClickSound(); onAdd(); }} 
            style={{ 
              padding: '4px 8px', fontSize: '0.72rem', fontWeight: 800, 
              display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
              backgroundColor: '#0284c7', color: 'white', borderRadius: '7px', border: '1px solid #38bdf8', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)'
            }}
          >
            <Plus size={12} /> 일정
          </button>
        </div>
      </div>

      <div className="sidebar-content" style={{ padding: '0', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {dailySchedules.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
             {dailySchedules.map(schedule => {
               const hasViewed = schedule.viewers && schedule.viewers.includes(currentUser?.name);
               const badgeStyle = getBadgeStyles(schedule.type);
               const isAdmin = currentUser?.role === 'super_admin' || 
                               currentUser?.role === 'admin' || 
                               currentUser?.userId === 'admin' || 
                               currentUser?.allowAllEditDelete === true || 
                               currentUser?.name === '관리자';
               const isAuthor = currentUser?.name === schedule.author || 
                                (currentUser?.name?.includes('김용규') && schedule.author?.includes('김용규'));
               const canModify = isAdmin || isAuthor;
               
               return (
                 <div 
                   key={schedule.id} 
                   onClick={() => {
                     if (onOpenScheduleDetail) {
                       onOpenScheduleDetail(schedule);
                     } else {
                       handleToggleCheck(schedule.id);
                     }
                   }}
                   style={{ 
                     padding: '8px 10px', 
                     backgroundColor: hasViewed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.75)', 
                     border: '1px solid',
                     borderColor: hasViewed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)', 
                     borderRadius: '10px',
                     cursor: 'pointer',
                     transition: 'all 0.15s',
                     boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
                   }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                     <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span style={{ 
                         fontSize: '0.70rem', 
                         padding: '1px 6px', 
                         borderRadius: '5px', 
                         backgroundColor: badgeStyle.backgroundColor,
                         color: badgeStyle.color,
                         border: badgeStyle.border,
                         fontWeight: 800
                       }}>
                         {schedule.type}
                       </span>
                       {schedule.isPublic === false && (
                         <span style={{ 
                           fontSize: '0.66rem', 
                           padding: '1px 5px', 
                           borderRadius: '4px', 
                           backgroundColor: 'rgba(51, 65, 85, 0.8)', 
                           color: '#94a3b8', 
                           border: '1px solid rgba(148, 163, 184, 0.25)' 
                         }}>
                           비공개
                         </span>
                       )}
                       <span style={{ color: '#67e8f9', fontSize: '0.84rem', fontWeight: 800 }}>{schedule.time}</span>
                       {schedule.author && (
                         <>
                           <span style={{ color: '#475569', margin: '0 1px' }}>•</span>
                           <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                             {schedule.author}
                           </span>
                         </>
                       )}
                     </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {canModify && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(schedule); }}
                            style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                            title="일정 수정"
                          >
                            <Edit3 size={13} />
                          </button>
                          {deletingId === schedule.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onDelete(schedule.id); 
                                  setDeletingId(null);
                                }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#f87171', fontSize: '0.68rem', fontWeight: 800 }}
                              >
                                삭제
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.68rem' }}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setDeletingId(schedule.id); 
                              }}
                              style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                              title="일정 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                      {hasViewed && <CheckCircle2 size={15} color="#34d399" />}
                    </div>
                  </div>
                  
                  {/* 일정 상세 설명: 어두운 배경에 맞게 명확하게 읽히는 고대비 밝은 톤 */}
                  <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 600, lineHeight: '1.35', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={schedule.description}>
                    {schedule.description || '내용 없음'}
                  </div>
                  
                  {schedule.viewers && schedule.viewers.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.66rem', 
                        padding: '1px 6px', 
                        backgroundColor: 'rgba(56, 189, 248, 0.18)', 
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '6px',
                        color: '#38bdf8',
                        fontWeight: 700
                      }}>
                        확인 {schedule.viewers.length}명
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ 
            height: '100%', minHeight: '160px', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8',
            backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px dashed rgba(148, 163, 184, 0.25)',
            padding: '24px 16px', textAlign: 'center'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: 'rgba(30, 41, 59, 0.9)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '2px', border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <Clock size={20} color="#60a5fa" />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
              오늘 등록된 일정이 없습니다.
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              상단의 '+ 일정' 버튼으로<br />새로운 일정을 등록하고 관리하세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSidebar;
