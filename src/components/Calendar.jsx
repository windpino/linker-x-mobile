import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Settings, Lock, Unlock, ChevronDown, Filter
} from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

const Calendar = ({ 
  selectedDate, 
  onDateSelect, 
  onLogout, 
  onAddSchedule, 
  onAddOrder, 
  onOpenDashboardSettings, 
  isDashboardLocked, 
  onToggleDashboardLock, 
  schedules = [], 
  staffList = [], 
  currentUser, 
  onOpenScheduleDetail, 
  scheduleTypes = [], 
  hiddenScheduleTypes = [], 
  onToggleScheduleType, 
  onOpenTypeManagement 
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.userId === 'admin';
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const typeFilterRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (typeFilterRef.current && !typeFilterRef.current.contains(e.target)) {
        setShowTypeFilter(false);
      }
    };
    if (showTypeFilter) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTypeFilter]);

  const getBadgeStyles = (type) => {
    const match = scheduleTypes.find(t => (typeof t === 'object' ? t.name : t) === type);
    if (match && typeof match === 'object' && match.color) {
      const baseColor = match.color;
      const bgColor = baseColor.startsWith('#') ? `${baseColor}26` : baseColor;
      return {
        backgroundColor: bgColor,
        color: baseColor,
        border: `1.5px solid ${baseColor}80`
      };
    }
    
    // 기본 하드코딩 폴백
    let bgColor = 'rgba(148, 163, 184, 0.2)';
    let textColor = 'var(--text-main)';
    let borderColor = 'rgba(148, 163, 184, 0.4)';
    if (type === '입고예정') { bgColor = 'var(--sch-in-bg)'; textColor = 'var(--sch-in-text)'; borderColor = 'rgba(16, 185, 129, 0.4)'; }
    else if (type === '납품') { bgColor = 'var(--sch-out-bg)'; textColor = 'var(--sch-out-text)'; borderColor = 'rgba(59, 130, 246, 0.4)'; }
    else if (type === '업무지시') { bgColor = 'var(--sch-work-bg)'; textColor = 'var(--sch-work-text)'; borderColor = 'rgba(245, 158, 11, 0.4)'; }
    else if (type === '회식') { bgColor = 'var(--sch-dinner-bg)'; textColor = 'var(--sch-dinner-text)'; borderColor = 'rgba(236, 72, 153, 0.4)'; }
    else if (type === '기타') { bgColor = 'var(--sch-etc-bg)'; textColor = 'var(--sch-etc-text)'; borderColor = 'rgba(139, 92, 246, 0.4)'; }
    else if (type === '휴무일') { bgColor = 'var(--sch-holiday-bg)'; textColor = 'var(--sch-holiday-text)'; borderColor = 'rgba(239, 68, 68, 0.4)'; }
    
    return {
      backgroundColor: bgColor,
      color: textColor,
      border: `1.5px solid ${borderColor}`
    };
  };

  // 날짜 안전성 검증
  const safeDate = (selectedDate instanceof Date && !isNaN(selectedDate.getTime()))
    ? selectedDate
    : (selectedDate ? new Date(selectedDate) : new Date());
  const validSelectedDate = (!isNaN(safeDate.getTime())) ? safeDate : new Date();

  const monthStart = startOfMonth(validSelectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const prevMonth = () => {
    playMenuClickSound();
    onDateSelect(subMonths(validSelectedDate, 1));
  };

  const nextMonth = () => {
    playMenuClickSound();
    onDateSelect(addMonths(validSelectedDate, 1));
  };

  // Generate calendar days
  // [무한 루프 방지] 날짜 계산 이상/타임존 왜곡으로 인한 브라우저 멈춤 방지 가드 (최대 60일)
  const calendarDays = [];
  let day = startDate;
  let guard = 0;
  while (day <= endDate && guard < 60) {
    calendarDays.push(day);
    day = addDays(day, 1);
    guard++;
  }

  const handleAddSchedule = () => {
    if (onAddSchedule) {
      playMenuClickSound();
      onAddSchedule();
    } else {
      alert(`${format(validSelectedDate, 'yyyy년 M월 d일', { locale: ko })}에 일정을 추가합니다.`);
    }
  };

  const handleAddOrder = () => {
    if (onAddOrder) {
      playMenuClickSound();
      onAddOrder();
    } else {
      playMenuClickSound();
      alert(`${format(validSelectedDate, 'yyyy년 M월 d일', { locale: ko })}에 수주를 추가합니다.`);
    }
  };

  const filterSchedulesForDateStr = (targetDateStr) => {
    return (schedules || []).filter(s => {
      const sStart = s.startDate || s.date;
      if (!sStart) return false;
      const sEnd = s.endDate || s.startDate || s.date;
      if (s.isPublic === false && s.author !== currentUser?.name && s.creator !== currentUser?.name && !isAdmin) return false;
      if ((hiddenScheduleTypes || []).includes(s.type)) return false;
      return targetDateStr >= sStart && targetDateStr <= sEnd;
    });
  };

  return (
    <div className="calendar-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '0px', boxSizing: 'border-box' }}>
      {/* 달력 상단 조작부 (모바일 초컴팩트 2행 레이아웃) */}
      <div className="calendar-header" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '6px 8px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '6px'
      }}>
        {/* 행 1: 년월 선택 + 이전/다음 월 + 일정 유형 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button onClick={prevMonth} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
              {format(validSelectedDate, 'yyyy년 M월')}
            </h3>
            <button onClick={nextMonth} style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* 일정 유형 필터 드롭다운 영역 */}
          <div ref={typeFilterRef} className="schedule-type-filters" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                playMenuClickSound();
                setShowTypeFilter(!showTypeFilter);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#3b82f6',
                cursor: 'pointer',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #3b82f6',
                padding: '2px 6px',
                borderRadius: '8px',
                height: '24px'
              }}
              title="일정 유형 필터"
            >
              <Filter size={10} />
              유형 {hiddenScheduleTypes.length > 0 ? `(${scheduleTypes.length - hiddenScheduleTypes.length})` : ''}
              <ChevronDown size={10} style={{ transform: showTypeFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            
            {showTypeFilter && (
              <div 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.15)',
                  padding: '8px',
                  minWidth: '170px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                  보여줄 일정 유형 선택
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '140px', overflowY: 'auto' }}>
                  {scheduleTypes.map(typeObj => {
                    const name = typeof typeObj === 'object' ? typeObj.name : typeObj;
                    const color = typeof typeObj === 'object' ? typeObj.color : '#64748b';
                    const isChecked = !hiddenScheduleTypes.includes(name);

                    return (
                      <label 
                        key={name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.72rem', fontWeight: 700,
                          color: isChecked ? '#1e293b' : '#94a3b8',
                          cursor: 'pointer', padding: '3px 4px', borderRadius: '4px',
                          backgroundColor: isChecked ? `${color}10` : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            playMenuClickSound();
                            if (onToggleScheduleType) onToggleScheduleType(name);
                          }}
                          style={{ margin: 0, cursor: 'pointer', accentColor: color }}
                        />
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}></span>
                        <span>{name}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playMenuClickSound();
                    setShowTypeFilter(false);
                    if (onOpenTypeManagement) onOpenTypeManagement();
                  }}
                  style={{
                    marginTop: '2px', width: '100%', padding: '4px',
                    fontSize: '0.72rem', fontWeight: 800, color: '#3b82f6',
                    backgroundColor: '#eff6ff', border: 'none', borderRadius: '4px',
                    cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px'
                  }}
                >
                  <Settings size={10} />
                  유형 편집
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 행 2: 액션 버튼 그룹 (오늘, 수주, 일정) */}
        <div className="calendar-actions" style={{ display: 'flex', alignItems: 'center', gap: '3px', width: '100%' }}>
          <button 
            style={{ padding: '3px 6px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }} 
            onClick={() => { playMenuClickSound(); onDateSelect(new Date()); }}
          >
            오늘
          </button>
          <button 
            style={{ flex: 1, padding: '3px 5px', fontSize: '0.72rem', fontWeight: 800, color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', whiteSpace: 'nowrap' }} 
            onClick={handleAddOrder}
          >
            <Plus size={11} /> 수주
          </button>
          <button 
            style={{ flex: 1, padding: '3px 5px', fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', whiteSpace: 'nowrap' }} 
            onClick={handleAddSchedule}
          >
            <Plus size={11} /> 일정
          </button>
        </div>
      </div>

      {/* 달력 그리드 (일정 전용 한 줄 표시 및 날짜 선택) */}
      <div className="calendar-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginTop: '2px'
      }}>
        {/* Day names */}
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
          <div 
            key={dayName} 
            className={`day-name ${idx === 0 ? 'sunday' : ''}`}
            style={{
              textAlign: 'center',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: idx === 0 ? '#ef4444' : (idx === 6 ? '#2563eb' : '#64748b'),
              padding: '2px 0'
            }}
          >
            {dayName}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((d, i) => {
          const isSelected = isSameDay(d, validSelectedDate);
          const isCurrentMonth = isSameMonth(d, monthStart);
          const isSunday = d.getDay() === 0;
          const isSaturday = d.getDay() === 6;
          const dayStr = format(d, 'yyyy-MM-dd');

          if (!isCurrentMonth) {
            return (
              <div 
                key={i} 
                className="calendar-day empty" 
                style={{ 
                  border: '1px solid #f1f5f9', 
                  backgroundColor: '#f8fafc', 
                  minHeight: '56px', 
                  borderRadius: '4px' 
                }} 
              />
            );
          }

          const daySchedules = filterSchedulesForDateStr(dayStr);
          const isToday = isSameDay(d, new Date());
          const hasHoliday = daySchedules.some(s => s.type === '휴무일');

          return (
            <div
              key={i}
              className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => {
                playMenuClickSound();
                onDateSelect(d);
              }}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                overflow: 'hidden',
                minHeight: '56px',
                backgroundColor: hasHoliday ? 'rgba(239, 68, 68, 0.08)' : (isSelected ? 'rgba(59, 130, 246, 0.1)' : '#ffffff'),
                border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                position: 'relative',
                padding: '2px',
                boxSizing: 'border-box',
                gap: '1.5px'
              }}
            >
              {/* 날짜 숫자 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div 
                  className={`day-number ${isSunday ? 'sunday' : ''} ${isToday ? 'today' : ''}`}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: isToday ? '800' : '700',
                    color: isToday ? '#2563eb' : (isSunday ? '#ef4444' : (isSaturday ? '#2563eb' : '#1e293b'))
                  }}
                >
                  <span className="day-number-val">{format(d, 'd')}</span>
                </div>
              </div>

              {/* 일정 목록 (한 줄 말줄임 표시) */}
              <div className="calendar-cell-scrollable" style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', minWidth: 0, flex: 1, overflowY: 'auto' }}>
                {daySchedules.map(schedule => {
                  const badgeStyle = getBadgeStyles(schedule.type);
                  const cleanContent = (schedule.description || schedule.title || '').replace(/[\r\n]+/g, ' ').trim();

                  return (
                    <div
                      key={schedule.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenScheduleDetail) onOpenScheduleDetail(schedule);
                      }}
                      title={`${schedule.time ? `[${schedule.time}] ` : ''}[${schedule.type}] ${cleanContent}`.trim()}
                      style={{
                        fontSize: '0.58rem',
                        backgroundColor: badgeStyle.backgroundColor,
                        color: badgeStyle.color,
                        border: badgeStyle.border,
                        padding: '0px 2px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 600,
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        lineHeight: 1.25
                      }}
                    >
                      [{schedule.type}]{cleanContent ? ` ${cleanContent}` : ''}{schedule.isPublic === false ? ' 🔒' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 해당일 선택 시 하단 일정 요약 리스트 (일정 전용) */}
      {(() => {
        const selectedDayStr = format(validSelectedDate, 'yyyy-MM-dd');
        const selectedSchedules = filterSchedulesForDateStr(selectedDayStr);

        return (
          <div className="selected-date-detail-list" style={{
            marginTop: '8px',
            padding: '10px 12px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1,
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                📅 {format(validSelectedDate, 'yyyy년 M월 d일', { locale: ko })} 일정
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                총 {selectedSchedules.length}건
              </span>
            </div>
            
            {selectedSchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                등록된 일정이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedSchedules.map(s => {
                  const badgeStyle = getBadgeStyles(s.type);
                  const cleanTitle = (s.description || s.title || s.type || '').replace(/[\r\n]+/g, ' ').trim();
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => {
                        if (onOpenScheduleDetail) onOpenScheduleDetail(s);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: '#f8fafc',
                        borderLeft: `4px solid ${badgeStyle.color || '#3b82f6'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        borderTop: '1px solid #e2e8f0',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, marginRight: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            fontWeight: 800, 
                            color: badgeStyle.color, 
                            backgroundColor: badgeStyle.backgroundColor, 
                            padding: '1px 5px', 
                            borderRadius: '4px',
                            border: badgeStyle.border,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            {s.type}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cleanTitle}
                          </span>
                        </div>
                        {s.location && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '2px' }}>
                            📍 {s.location}
                          </span>
                        )}
                      </div>
                      
                      {s.time && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {s.time}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default Calendar;
