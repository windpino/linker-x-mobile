import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, Unlock, ChevronDown, Filter } from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addMonths, subMonths, startOfDay, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

const Calendar = ({ selectedDate, onDateSelect, onLogout, onAddSchedule, onAddOrder, onOpenDashboardSettings, isDashboardLocked, onToggleDashboardLock, schedules = [], salesOrders = [], salesInvoices = [], purchaseOrders = [], purchaseInvoices = [], inventoryTransferHistory = [], staffList = [], currentUser, onOpenOrderListForDate, onOpenSalesInvoiceListForDate, onOpenPurchaseLedgerForDate, onOpenInventoryTransferForDate, onOpenScheduleDetail, scheduleTypes = [], hiddenScheduleTypes = [], onToggleScheduleType, onOpenTypeManagement }) => {
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
    const match = scheduleTypes.find(t => t.name === type);
    if (match) {
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

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const prevMonth = () => {
    playMenuClickSound();
    onDateSelect(subMonths(selectedDate, 1));
  };

  const nextMonth = () => {
    playMenuClickSound();
    onDateSelect(addMonths(selectedDate, 1));
  };

  // Generate calendar days
  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const handleAddSchedule = () => {
    if (onAddSchedule) {
      playMenuClickSound();
      onAddSchedule();
    } else {
      alert(`${format(selectedDate, 'yyyy년 M월 d일', { locale: ko })}에 일정을 추가합니다.`);
    }
  };

  const handleAddOrder = () => {
    if (onAddOrder) {
      playMenuClickSound();
      onAddOrder();
    } else {
      playMenuClickSound();
      alert(`${format(selectedDate, 'yyyy년 M월 d일', { locale: ko })}에 수주를 추가합니다.`);
    }
  };
  return (
    <div className="calendar-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '4px', boxSizing: 'border-box' }}>
      {/* 달력 상단 조작부 (모바일 컴팩트 2행 레이아웃) */}
      <div className="calendar-header" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '10px'
      }}>
        {/* 행 1: 년월 선택 + 이전/다음 월 + 일정 유형 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={prevMonth} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
              {format(selectedDate, 'yyyy년 M월')}
            </h3>
            <button onClick={nextMonth} style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={16} />
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
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#3b82f6',
                cursor: 'pointer',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #3b82f6',
                padding: '4px 8px',
                borderRadius: '12px',
                height: '28px'
              }}
              title="일정 유형 필터"
            >
              <Filter size={11} />
              유형 {hiddenScheduleTypes.length > 0 ? `(${scheduleTypes.length - hiddenScheduleTypes.length})` : ''}
              <ChevronDown size={11} style={{ transform: showTypeFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            
            {showTypeFilter && (
              <div 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                  padding: '10px',
                  minWidth: '190px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  보여줄 일정 유형 선택
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                  {scheduleTypes.map(typeObj => {
                    const name = typeof typeObj === 'object' ? typeObj.name : typeObj;
                    const color = typeof typeObj === 'object' ? typeObj.color : '#64748b';
                    const isChecked = !hiddenScheduleTypes.includes(name);

                    return (
                      <label 
                        key={name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '0.75rem', fontWeight: 700,
                          color: isChecked ? '#1e293b' : '#94a3b8',
                          cursor: 'pointer', padding: '4px 6px', borderRadius: '4px',
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
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}></span>
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
                    marginTop: '4px', width: '100%', padding: '6px',
                    fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6',
                    backgroundColor: '#eff6ff', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  <Settings size={12} />
                  유형 편집
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 행 2: 액션 버튼 그룹 (오늘, 일정 추가, 수주 추가) */}
        <div className="calendar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <button 
            style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }} 
            onClick={() => { playMenuClickSound(); onDateSelect(new Date()); }}
          >
            오늘
          </button>
          <button 
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }} 
            onClick={handleAddSchedule}
          >
            <Plus size={14} /> 일정 추가
          </button>
          <button 
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800, color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }} 
            onClick={handleAddOrder}
          >
            <Plus size={14} /> 수주 추가
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {/* Day names */}
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
          <div key={dayName} className={`day-name ${idx === 0 ? 'sunday' : ''}`}>
            {dayName}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((d, i) => {
          const isSelected = isSameDay(d, selectedDate);
          const isCurrentMonth = isSameMonth(d, monthStart);
          const isSunday = d.getDay() === 0;
          const daySchedules = schedules.filter(s => {
            const dayStr = format(d, 'yyyy-MM-dd');
            const sStart = s.startDate || s.date;
            const sEnd = s.endDate || s.startDate || s.date;
            return dayStr >= sStart && dayStr <= sEnd && !(hiddenScheduleTypes || []).includes(s.type);
          });

          if (!isCurrentMonth) {
            return <div key={i} className="calendar-day empty" style={{ border: '1px solid #e2e8f0' }}></div>;
          }

          const isToday = isSameDay(d, new Date());
          const hasHoliday = daySchedules.some(s => s.type === '휴무일');

          const roleFilteredOrders = (salesOrders || []).filter(o => 
            isAdmin || o.manager === currentUser?.name
          );
          const dayOrders = roleFilteredOrders.filter(o => o.date === format(d, 'yyyy-MM-dd'));

          const dayPurchaseOrders = (purchaseOrders || []).filter(o => o.date === format(d, 'yyyy-MM-dd'));
          const dayPurchaseInvoices = (purchaseInvoices || []).filter(inv => inv.date === format(d, 'yyyy-MM-dd'));
          const daySalesInvoices = (salesInvoices || []).filter(inv => inv.date === format(d, 'yyyy-MM-dd') && (isAdmin || inv.creator === currentUser?.name));
          const dayTransfers = (inventoryTransferHistory || []).filter(h => h.date === format(d, 'yyyy-MM-dd'));

          return (
            <div
              key={i}
              className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => { playMenuClickSound(); onDateSelect(d); }}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                backgroundColor: hasHoliday ? 'rgba(239, 68, 68, 0.1)' : (isSelected ? 'rgba(59, 130, 246, 0.1)' : 'inherit'),
                border: `1px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '4px' }}>
                <div className={`day-number ${isSunday ? 'sunday' : ''}`} style={{
                  fontSize: isToday ? '1.1rem' : '0.9rem',
                  fontWeight: isToday ? '800' : '500',
                  color: isToday ? 'var(--primary)' : (isSunday ? 'var(--red)' : 'inherit'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isToday ? '28px' : 'auto',
                  height: isToday ? '28px' : 'auto',
                  borderRadius: isToday ? '50%' : '0',
                  backgroundColor: isToday ? '#eff6ff' : 'transparent',
                  margin: '2px 0 0 2px'
                }}>
                  {format(d, 'd')}
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginLeft: '4px', marginTop: '2px', justifyContent: 'flex-end', flex: 1 }}>

                  {Array.from(new Set(
                    salesInvoices
                      .filter(inv => inv.date === format(d, 'yyyy-MM-dd'))
                      .filter(inv => isAdmin || inv.creator === currentUser?.name)
                      .map(inv => {
                        const creatorName = inv.creator || '시스템';
                        const staff = staffList?.find(s => s.name === creatorName);
                        return staff?.warehouse || '본사';
                      })
                  )).map(region => (
                    <span 
                      key={`sales-${region}`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenSalesInvoiceListForDate) onOpenSalesInvoiceListForDate(d);
                      }}
                      style={{ 
                        fontSize: '0.65rem', 
                        backgroundColor: '#fce7f3', 
                        color: '#9d174d', 
                        padding: '1px 4px', 
                        borderRadius: '4px', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        border: '1px solid #fbcfe8',
                        whiteSpace: 'nowrap'
                      }}
                      title="클릭하여 매출전표내역 열기"
                    >
                      {region}매출
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 4px', marginTop: '4px' }}>
                {daySchedules.map(schedule => {
                  const badgeStyle = getBadgeStyles(schedule.type);

                  return (
                    <div 
                      key={schedule.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenScheduleDetail) onOpenScheduleDetail(schedule);
                      }}
                      title={`${schedule.time || ''} [${schedule.type}] ${schedule.description || ''}`}
                      style={{ 
                        fontSize: '0.7rem', 
                        backgroundColor: badgeStyle.backgroundColor, 
                        color: badgeStyle.color, 
                        border: badgeStyle.border,
                        padding: '1px 3px', 
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 600,
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      [{schedule.type}]
                    </div>
                  );
                })}
                {Array.from(new Set(
                  dayOrders
                    .filter(o => isAdmin || o.manager === currentUser?.name)
                    .map(o => {
                      const staff = staffList?.find(s => s.name === o.manager);
                      return staff?.warehouse || o.inWarehouse || '본사';
                    })
                )).map(wh => (
                    <div key={`notice-${wh}`} style={{ 
                      fontSize: '0.7rem', 
                      backgroundColor: '#fffbeb', 
                      color: '#92400e', 
                      padding: '2px 4px', 
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #fde68a',
                      marginTop: '1px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenOrderListForDate) onOpenOrderListForDate(d);
                    }}
                    title="클릭하여 수주 목록 열기"
                    >
                      {wh}수주
                    </div>
                ))}

                {/* 매출전표발행 표시 */}
                {daySalesInvoices.length > 0 && (
                  <div 
                    style={{ 
                      fontSize: '0.7rem', 
                      backgroundColor: '#fdf2f8', 
                      color: '#be185d', 
                      padding: '2px 4px', 
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #fbcfe8',
                      marginTop: '1px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenSalesInvoiceListForDate) onOpenSalesInvoiceListForDate(d);
                    }}
                    title="클릭하여 매출전표 목록 열기"
                  >
                    매출 {daySalesInvoices.length}건
                  </div>
                )}

                {/* 발주발행 표시 */}
                {dayPurchaseOrders.length > 0 && (
                  <div 
                    style={{ 
                      fontSize: '0.7rem', 
                      backgroundColor: '#ecfdf5', 
                      color: '#047857', 
                      padding: '2px 4px', 
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #a7f3d0',
                      marginTop: '1px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenPurchaseLedgerForDate) onOpenPurchaseLedgerForDate(d);
                    }}
                    title="클릭하여 매입/발주 목록 열기"
                  >
                    발주 {dayPurchaseOrders.length}건
                  </div>
                )}

                {/* 매입전표발행 표시 */}
                {dayPurchaseInvoices.length > 0 && (
                  <div 
                    style={{ 
                      fontSize: '0.7rem', 
                      backgroundColor: '#fef2f2', 
                      color: '#b91c1c', 
                      padding: '2px 4px', 
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #fca5a5',
                      marginTop: '1px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenPurchaseLedgerForDate) onOpenPurchaseLedgerForDate(d);
                    }}
                    title="클릭하여 매입/발주 목록 열기"
                  >
                    매입 {dayPurchaseInvoices.length}건
                  </div>
                )}

                {/* 창고이동 표시 */}
                {dayTransfers.length > 0 && (
                  <div 
                    style={{ 
                      fontSize: '0.7rem', 
                      backgroundColor: '#eff6ff', 
                      color: '#1e40af', 
                      padding: '2px 4px', 
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #bfdbfe',
                      marginTop: '1px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenInventoryTransferForDate) onOpenInventoryTransferForDate(d);
                    }}
                    title="클릭하여 창고이동 열기"
                  >
                    창고이동 {dayTransfers.length}건
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
