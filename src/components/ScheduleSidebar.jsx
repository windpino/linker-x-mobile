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
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '0 0 6px 0', borderBottom: '1px solid #f1f5f9', marginBottom: '6px', cursor: isDashboardLocked ? 'default' : 'grab', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
          <Clock size={16} color="#3b82f6" />
          <span>{formattedDate} 일정</span>
          {dailySchedules.length > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
              {dailySchedules.length}건
            </span>
          )}
        </div>
        <button 
          className="btn-sub-primary" 
          onClick={(e) => { e.stopPropagation(); onAdd(); }} 
          style={{ 
            padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, 
            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0,
            backgroundColor: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer'
          }}
        >
          <Plus size={14} /> 일정 추가
        </button>
      </div>

      <div className="sidebar-content" style={{ padding: '0', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {dailySchedules.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                     padding: '6px 9px', 
                     backgroundColor: hasViewed ? '#f0fdf4' : '#f8fafc', 
                     border: '1px solid',
                     borderColor: hasViewed ? '#bbf7d0' : '#e2e8f0', 
                     borderRadius: '8px',
                     cursor: 'pointer',
                     transition: 'all 0.15s',
                     boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                   }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                     <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                       <span style={{ 
                         fontSize: '0.72rem', 
                         padding: '1px 5px', 
                         borderRadius: '4px', 
                         backgroundColor: badgeStyle.backgroundColor,
                         color: badgeStyle.color,
                         border: badgeStyle.border,
                         fontWeight: 700
                       }}>
                         {schedule.type}
                       </span>
                       <span style={{ color: '#1e293b', fontSize: '0.82rem' }}>{schedule.time}</span>
                       {schedule.author && (
                         <>
                           <span style={{ color: '#cbd5e1', margin: '0 2px' }}>•</span>
                           <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>
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
                            onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                            title="일정 수정"
                          >
                            <Edit3 size={13} />
                          </button>
                          {deletingId === schedule.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onDelete(schedule.id); 
                                  setDeletingId(null);
                                }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', fontSize: '0.68rem', fontWeight: 700 }}
                              >
                                삭제
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748b', fontSize: '0.68rem' }}
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
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                              title="일정 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                      {hasViewed && <CheckCircle2 size={15} color="#10b981" />}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={schedule.description}>
                    {schedule.description || '내용 없음'}
                  </div>
                  
                  {schedule.viewers && schedule.viewers.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '3px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '1px 5px', 
                        backgroundColor: '#e0f2fe', 
                        borderRadius: '6px',
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
          <div style={{ 
            height: '100%', minHeight: '160px', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8',
            backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1',
            padding: '24px 16px', textAlign: 'center'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '2px'
            }}>
              <Clock size={22} color="#3b82f6" strokeWidth={2} />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
              오늘 등록된 일정이 없습니다.
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
              상단의 '+ 일정 추가' 버튼으로<br />새로운 일정을 등록하고 관리하세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSidebar;
