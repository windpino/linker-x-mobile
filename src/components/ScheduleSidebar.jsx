import React from 'react';
import { Clock, CheckCircle2, Trash2, Edit3, Plus, Copy } from 'lucide-react';
import { format, isSameDay, startOfDay, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

const ScheduleSidebar = ({ selectedDate, schedules = [], setSchedules, currentUser, onAdd, onCopy, onEdit, onDelete, isDashboardLocked, onOpenScheduleDetail, scheduleTypes = [], hiddenScheduleTypes = [] }) => {
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
  const formattedDate = format(selectedDate, 'd일', { locale: ko });
  
  const dailySchedules = (schedules || [])
    .filter(s => {
      const dayStr = format(selectedDate, 'yyyy-MM-dd');
      const sStart = s.startDate || s.date;
      const sEnd = s.endDate || s.startDate || s.date;
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
    <div className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '0 0 2px 0', cursor: isDashboardLocked ? 'default' : 'grab' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
          <Clock size={16} color="#3b82f6" />
          {formattedDate} 일정
        </div>
        <button 
          className="btn-sub-primary" 
          onClick={(e) => { e.stopPropagation(); onAdd(); }} 
          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Plus size={14} /> 일정 추가
        </button>
      </div>
      <div className="sidebar-content" style={{ padding: '0' }}>
        {dailySchedules.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                     padding: '5px 8px', 
                     backgroundColor: hasViewed ? '#e8f5e9' : '#f8fafc', 
                     border: '1px solid',
                     borderColor: hasViewed ? '#a5d6a7' : '#e2e8f0', 
                     borderRadius: '8px',
                     cursor: 'pointer',
                     transition: 'all 0.2s',
                     boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                   }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                     <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span style={{ 
                         fontSize: '0.75rem', 
                         padding: '2px 6px', 
                         borderRadius: '4px', 
                         backgroundColor: badgeStyle.backgroundColor,
                         color: badgeStyle.color,
                         border: badgeStyle.border
                       }}>
                         {schedule.type}
                       </span>
                       {schedule.time}
                       {schedule.author && (
                         <>
                           <span style={{ color: 'var(--text-muted)', opacity: 0.5, margin: '0 3px' }}>|</span>
                           <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', opacity: 0.8 }}>
                             {schedule.author}
                           </span>
                         </>
                       )}
                     </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {canModify && (
                        <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(schedule); }}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <Edit3 size={14} />
                          </button>
                          {deletingId === schedule.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onDelete(schedule.id); 
                                  setDeletingId(null);
                                }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}
                              >
                                삭제
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748b', fontSize: '0.7rem' }}
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
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                              title="일정 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                      {hasViewed && <CheckCircle2 size={16} color="#10b981" />}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--sch-desc)', opacity: 0.9, lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }} title={schedule.description}>
                    {schedule.description && schedule.description.length > 25 ? schedule.description.substring(0, 25) + '...' : schedule.description}
                  </div>
                  
                  {schedule.viewers && schedule.viewers.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.68rem', 
                        padding: '1px 6px', 
                        backgroundColor: '#e0f2fe', 
                        borderRadius: '10px',
                        color: '#0369a1',
                        fontWeight: 600
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
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: '0.95rem' }}>
            일정이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSidebar;
