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
      {/* 캘린더 상단 헤더: 시계 아이콘 + 날짜 내비게이션 + '+ 수주' & '+ 일정' 버튼 */}
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '0 0 12px 0', borderBottom: '1px solid #f1f5f9', marginBottom: '12px', cursor: isDashboardLocked ? 'default' : 'grab', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', minWidth: 0 }}>
          <Clock className="mobile-schedule-clock" size={22} strokeWidth={2.4} aria-hidden="true" />
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '3px 6px'
          }}>
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
                  width: '20px',
                  height: '20px',
                  padding: 0,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="이전 날짜 (하루 전)"
              >
                <ChevronLeft size={16} strokeWidth={2.4} />
              </button>
            )}
            <div className="mobile-schedule-date" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
              <span>{formattedDate} 일정</span>
              <small>{format(selectedDate, 'yyyy년 EEEE', { locale: ko })}</small>
            </div>
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
                  width: '20px',
                  height: '20px',
                  padding: 0,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="다음 날짜 (하루 뒤)"
              >
                <ChevronRight size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>

          {dailySchedules.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#007aff', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 7px', borderRadius: '10px', fontWeight: 800, flexShrink: 0 }}>
              {dailySchedules.length}건
            </span>
          )}
        </div>

        <div className="mobile-schedule-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onAddOrder && (
            <button className="mobile-schedule-order"
              type="button"
              onClick={(e) => { e.stopPropagation(); playMenuClickSound(); onAddOrder(); }} 
              style={{ 
                padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800, 
                display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                backgroundColor: '#007aff', color: '#ffffff', borderRadius: '12px', border: 'none', cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(0, 122, 255, 0.3)'
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> 수주
            </button>
          )}
          <button className="mobile-schedule-add"
            type="button"
            onClick={(e) => { e.stopPropagation(); playMenuClickSound(); onAdd(); }} 
            style={{ 
              padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800, 
              display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
              backgroundColor: '#0ea5e9', color: '#ffffff', borderRadius: '12px', border: 'none', cursor: 'pointer',
              boxShadow: '0 3px 8px rgba(14, 165, 233, 0.3)'
            }}
          >
            <Plus size={13} strokeWidth={2.5} /> 일정 추가
          </button>
        </div>
      </div>

      <div className="sidebar-content" style={{ padding: '0', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {dailySchedules.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                     padding: '10px 12px', 
                     backgroundColor: hasViewed ? '#f0fdf4' : '#f8fafc', 
                     border: '1px solid',
                     borderColor: hasViewed ? '#bbf7d0' : '#e2e8f0', 
                     borderRadius: '12px',
                     cursor: 'pointer',
                     transition: 'all 0.15s',
                     boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                   }}
                 >
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                     <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                           backgroundColor: '#f1f5f9', 
                           color: '#64748b', 
                           border: '1px solid #cbd5e1' 
                         }}>
                           비공개
                         </span>
                       )}
                       <span style={{ color: '#007aff', fontSize: '0.84rem', fontWeight: 800 }}>{schedule.time}</span>
                       {schedule.author && (
                         <>
                           <span style={{ color: '#94a3b8', margin: '0 1px' }}>•</span>
                           <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
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
                            onMouseEnter={e => e.currentTarget.style.color = '#007aff'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                            title="일정 수정"
                          >
                            <Edit3 size={13} />
                          </button>
                          {deletingId === schedule.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onDelete(schedule.id); 
                                  setDeletingId(null);
                                }}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', fontSize: '0.68rem', fontWeight: 800 }}
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
                  
                  {/* 일정 상세 설명 */}
                  <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, lineHeight: '1.35', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={schedule.description}>
                    {schedule.description || '내용 없음'}
                  </div>
                  
                  {schedule.viewers && schedule.viewers.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.66rem', 
                        padding: '1px 6px', 
                        backgroundColor: '#eff6ff', 
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        color: '#007aff',
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
          <div className="mobile-schedule-empty" style={{
            height: '100%', minHeight: '180px', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', padding: '20px 16px', textAlign: 'center'
          }}>
            {/* 유기적 소프트 블루 클라우드 배경 및 3D 캘린더 일러스트레이션 */}
            <div style={{
              position: 'relative',
              width: '180px',
              height: '110px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <svg style={{ position: 'absolute', width: '180px', height: '110px', top: 0, left: 0 }} viewBox="0 0 180 110" fill="none">
                <path d="M40 70C25 70 12 58 12 43C12 30 22 19 35 18C42 8 57 2 73 5C88 -1 106 2 118 12C128 7 141 8 149 16C162 18 171 29 170 42C170 57 158 68 143 69C138 69 135 70 130 70H40Z" fill="#eff6ff" />
                <circle cx="28" cy="78" r="3" fill="#bfdbfe" />
                <circle cx="152" cy="72" r="4" fill="#93c5fd" />
                <circle cx="150" cy="12" r="3.5" fill="#60a5fa" />
              </svg>

              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg width="72" height="68" viewBox="0 0 80 75" fill="none">
                  <ellipse cx="40" cy="72" rx="30" ry="3" fill="#cbd5e1" opacity="0.6" />
                  <rect x="12" y="14" width="56" height="52" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                  <path d="M12 24C12 18.4772 16.4772 14 22 14H58C63.5228 14 68 18.4772 68 24V26H12V24Z" fill="#007aff" />
                  <rect x="22" y="8" width="5" height="12" rx="2.5" fill="#0056b3" />
                  <rect x="53" y="8" width="5" height="12" rx="2.5" fill="#0056b3" />
                  <rect x="20" y="34" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="36" y="34" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="52" y="34" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="20" y="44" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="36" y="44" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="52" y="44" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="20" y="54" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                  <rect x="36" y="54" width="8" height="5" rx="1.5" fill="#e2e8f0" />
                </svg>

                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-6px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#007aff',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0, 122, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={15} color="#ffffff" strokeWidth={2.6} />
                </div>
              </div>
            </div>

            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              {isSameDay(selectedDate, new Date()) ? '오늘 등록된 일정이 없습니다.' : '등록된 일정이 없습니다.'}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
              필요한 업무를 바로 추가해 보세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSidebar;
