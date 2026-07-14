import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, Unlock, ChevronDown, Filter } from 'lucide-react';
import { playMenuClickSound } from '../utils/audio';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addMonths, subMonths, startOfDay, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

const Calendar = ({ selectedDate, onDateSelect, onLogout, onAddSchedule, onAddOrder, onOpenDashboardSettings, isDashboardLocked, onToggleDashboardLock, schedules = [], salesOrders = [], salesInvoices = [], purchaseOrders = [], purchaseInvoices = [], inventoryTransferHistory = [], staffList = [], currentUser, onOpenOrderListForDate, onOpenSalesInvoiceListForDate, onOpenPurchaseLedgerForDate, onOpenInventoryTransferForDate, onOpenScheduleDetail, scheduleTypes = [], hiddenScheduleTypes = [], onToggleScheduleType, onOpenTypeManagement }) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.userId === 'admin';
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;
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
    <div className="calendar-container">
      <div className="calendar-header" style={{
        flexDirection: isMobileView ? 'column' : 'row',
        alignItems: isMobileView ? 'stretch' : 'center',
        gap: isMobileView ? '10px' : '20px',
        height: 'auto',
        padding: isMobileView ? '8px 12px' : '16px 24px'
      }}>
        <div className="month-selector" style={{
          flexDirection: isMobileView ? 'column' : 'row',
          alignItems: isMobileView ? 'flex-start' : 'center',
          gap: isMobileView ? '8px' : '16px',
          width: isMobileView ? '100%' : 'auto'
        }}>
          <h3 style={{ fontSize: isMobileView ? '1.1rem' : '1.3rem' }}>{format(selectedDate, 'yyyy년 M월 d일')}</h3>

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
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#3b82f6',
                cursor: 'pointer',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #3b82f6',
                padding: '5px 12px',
                borderRadius: '16px',
                transition: 'all 0.15s',
                height: '28px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              title="일정 유형 필터 및 편집 관리"
            >
              <Filter size={12} />
              일정 유형 {hiddenScheduleTypes.length > 0 ? `(${scheduleTypes.length - hiddenScheduleTypes.length})` : ''}
              <ChevronDown size={12} style={{ transform: showTypeFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            
            {showTypeFilter && (
              <div 
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  minWidth: '200px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '4px' }}>
                  보여줄 일정 유형 선택
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {scheduleTypes.map(typeObj => {
                    const name = typeof typeObj === 'object' ? typeObj.name : typeObj;
                    const color = typeof typeObj === 'object' ? typeObj.color : '#64748b';
                    const isChecked = !hiddenScheduleTypes.includes(name);

                    return (
                      <label 
                        key={name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: isChecked ? '#1e293b' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? `${color}10` : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isChecked ? `${color}20` : '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isChecked ? `${color}10` : 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            playMenuClickSound();
                            if (onToggleScheduleType) onToggleScheduleType(name);
                          }}
                          style={{
                            margin: 0,
                            cursor: 'pointer',
                            accentColor: color
                          }}
                        />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}></span>
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
                    marginTop: '6px',
                    width: '100%',
                    padding: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#3b82f6',
                    backgroundColor: '#eff6ff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                >
                  <Settings size={12} />
                  유형 편집 / 관리
                </button>
              </div>
            )}
          </div>

          <div className="month-nav" style={{ 
            alignSelf: isMobileView ? 'flex-end' : 'auto',
            marginTop: isMobileView ? '-28px' : '0'
          }}>
            <button onClick={prevMonth}><ChevronLeft size={18} /></button>
            <button onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="calendar-actions" style={{ 
          flexWrap: 'wrap', 
          justifyContent: isMobileView ? 'space-between' : 'flex-end', 
          gap: isMobileView ? '6px' : '10px',
          width: isMobileView ? '100%' : 'auto',
          marginTop: isMobileView ? '4px' : '0'
        }}>
          {!isMobileView && (
            <>
              <button 
                className={`btn-outline ${!isDashboardLocked ? 'active-lock' : ''}`} 
                style={{ padding: '8px', color: !isDashboardLocked ? 'var(--primary)' : 'inherit', borderColor: !isDashboardLocked ? 'var(--primary)' : '#e2e8f0' }} 
                onClick={() => { playMenuClickSound(); onToggleDashboardLock(); }} 
                title={isDashboardLocked ? "위젯 이동 잠금 (클릭 시 해제)" : "위젯 이동 가능 (클릭 시 잠금)"}
              >
                {isDashboardLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
              <button className="btn-outline" style={{ padding: '8px' }} onClick={() => { playMenuClickSound(); onOpenDashboardSettings(); }} title="대시보드 설정">
                <Settings size={18} />
              </button>
            </>
          )}
          <button className="btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => { playMenuClickSound(); onDateSelect(new Date()); }}>
            오늘 날짜로 이동
          </button>
          <button className="btn-sub-outline" onClick={handleAddSchedule} style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            <Plus size={16} />
            일정 추가
          </button>
          <button className="btn-sub-primary" onClick={handleAddOrder} style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            <Plus size={16} />
            수주 추가
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {/* Day names */}
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
          <div key={dayName} className={`day-name ${idx === 0 ? 'sunday' : ''}`} style={{ 
            padding: isMobileView ? '6px 0' : '12px 0', 
            fontSize: isMobileView ? '0.75rem' : '0.85rem'
          }}>
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
            return <div key={i} className="calendar-day empty" style={{ border: '1px solid #e2e8f0', minHeight: isMobileView ? '70px' : '120px' }}></div>;
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
                border: `1px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                minHeight: isMobileView ? '70px' : '120px',
                padding: isMobileView ? '4px' : '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '4px' }}>
                <div className={`day-number ${isSunday ? 'sunday' : ''}`} style={{
                  fontSize: isToday ? (isMobileView ? '0.9rem' : '1.1rem') : (isMobileView ? '0.78rem' : '0.9rem'),
                  fontWeight: isToday ? '800' : '500',
                  color: isToday ? 'var(--primary)' : (isSunday ? 'var(--red)' : 'inherit'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isToday ? (isMobileView ? '20px' : '28px') : 'auto',
                  height: isToday ? (isMobileView ? '20px' : '28px') : 'auto',
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
                        fontSize: isMobileView ? '0.55rem' : '0.65rem', 
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
                        fontSize: isMobileView ? '0.62rem' : '0.7rem', 
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
                      fontSize: isMobileView ? '0.62rem' : '0.7rem', 
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
                      fontSize: isMobileView ? '0.62rem' : '0.7rem', 
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
                      fontSize: isMobileView ? '0.62rem' : '0.7rem', 
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
                      fontSize: isMobileView ? '0.62rem' : '0.7rem', 
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
                      fontSize: isMobileView ? '0.62rem' : '0.7rem', 
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
