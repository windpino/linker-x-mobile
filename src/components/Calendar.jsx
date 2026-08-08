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
              {format(selectedDate, 'yyyy년 M월')}
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

        {/* 행 2: 액션 버튼 그룹 (오늘, 일정 추가, 수주 추가) */}
        <div className="calendar-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
          <button 
            style={{ padding: '4px 8px', fontSize: '0.74rem', fontWeight: 700, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }} 
            onClick={() => { playMenuClickSound(); onDateSelect(new Date()); }}
          >
            오늘
          </button>
          <button 
            style={{ flex: 1, padding: '4px 8px', fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', whiteSpace: 'nowrap' }} 
            onClick={handleAddSchedule}
          >
            <Plus size={12} /> 일정 추가
          </button>
          <button 
            style={{ flex: 1, padding: '4px 8px', fontSize: '0.74rem', fontWeight: 800, color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', whiteSpace: 'nowrap' }} 
            onClick={handleAddOrder}
          >
            <Plus size={12} /> 수주 추가
          </button>
        </div>
      </div>

      <div className="calendar-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px', // 주별 및 요일별 틈을 2px로 좁힘
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
          const isSelected = isSameDay(d, selectedDate);
          const isCurrentMonth = isSameMonth(d, monthStart);
          const isSunday = d.getDay() === 0;
          const isSaturday = d.getDay() === 6;
          
          const daySchedules = schedules.filter(s => {
            const dayStr = format(d, 'yyyy-MM-dd');
            const sStart = s.startDate || s.date;
            const sEnd = s.endDate || s.startDate || s.date;
            return dayStr >= sStart && dayStr <= sEnd && !(hiddenScheduleTypes || []).includes(s.type);
          });

          if (!isCurrentMonth) {
            return <div key={i} className="calendar-day empty" style={{ border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', height: '36px', borderRadius: '4px' }}></div>;
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

          // 각 일정/내역별 점(Dot) 색상 목록 생성
          const dayDots = [];
          
          // 1. 일정
          daySchedules.forEach(s => {
            const badgeStyle = getBadgeStyles(s.type);
            dayDots.push({ id: `dot-sch-${s.id}`, color: badgeStyle.color || '#3b82f6' });
          });
          // 2. 수주
          dayOrders.forEach(o => {
            dayDots.push({ id: `dot-so-${o.id}`, color: '#f59e0b' });
          });
          // 3. 매출
          daySalesInvoices.forEach(inv => {
            dayDots.push({ id: `dot-si-${inv.id}`, color: '#be185d' });
          });
          // 4. 발주
          dayPurchaseOrders.forEach(po => {
            dayDots.push({ id: `dot-po-${po.id}`, color: '#047857' });
          });
          // 5. 매입
          dayPurchaseInvoices.forEach(pi => {
            dayDots.push({ id: `dot-pi-${pi.id}`, color: '#b91c1c' });
          });
          // 6. 창고이동
          dayTransfers.forEach(t => {
            dayDots.push({ id: `dot-t-${t.id}`, color: '#1e40af' });
          });

          return (
            <div
              key={i}
              className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => { playMenuClickSound(); onDateSelect(d); }}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                height: '36px', // 컴팩트 세로 고정 높이 48px -> 36px 대폭 단축
                backgroundColor: hasHoliday ? 'rgba(239, 68, 68, 0.08)' : (isSelected ? 'rgba(59, 130, 246, 0.1)' : 'inherit'),
                border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                position: 'relative',
                padding: '1px 0',
                boxSizing: 'border-box'
              }}
            >
              <div className={`day-number ${isSunday ? 'sunday' : ''}`} style={{
                fontSize: '0.76rem', // 날짜 크기 축소
                fontWeight: isToday ? '800' : '600',
                color: isToday ? '#2563eb' : (isSunday ? '#ef4444' : (isSaturday ? '#2563eb' : '#1e293b')),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isToday ? '16px' : 'auto',
                height: isToday ? '16px' : 'auto',
                borderRadius: isToday ? '50%' : '0',
                backgroundColor: isToday ? '#eff6ff' : 'transparent'
              }}>
                {format(d, 'd')}
              </div>

              {/* 점(Dot) 모음 표시 */}
              {dayDots.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '1.5px', // 틈 단축
                  marginTop: '1px', 
                  flexWrap: 'wrap',
                  width: '100%',
                  padding: '0 2px',
                  boxSizing: 'border-box'
                }}>
                  {dayDots.slice(0, 4).map(dot => (
                    <span 
                      key={dot.id} 
                      style={{ 
                        width: '4px', // 5px -> 4px
                        height: '4px', 
                        borderRadius: '50%', 
                        backgroundColor: dot.color,
                        display: 'inline-block'
                      }} 
                    />
                  ))}
                  {dayDots.length > 4 && (
                    <span style={{ fontSize: '0.5rem', color: '#94a3b8', lineHeight: '4px', fontWeight: 900 }}>+</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 해당일 클릭 시 아래에 해당일 목록 형태로 나열해서 보여주는 영역 */}
      {(() => {
        const selectedDayStr = format(selectedDate, 'yyyy-MM-dd');
        const selectedDayItems = [];

        // 1. 일정 필터링
        const selectedSchedules = schedules.filter(s => {
          const sStart = s.startDate || s.date;
          const sEnd = s.endDate || s.startDate || s.date;
          return selectedDayStr >= sStart && selectedDayStr <= sEnd && !(hiddenScheduleTypes || []).includes(s.type);
        });
        selectedSchedules.forEach(s => {
          const badgeStyle = getBadgeStyles(s.type);
          selectedDayItems.push({
            uniqueId: `list-sch-${s.id}`,
            tag: s.type,
            title: s.description || s.type,
            subtitle: s.location ? `📍 ${s.location}` : '',
            time: s.time || '',
            color: badgeStyle.color || '#3b82f6',
            bgColor: `${badgeStyle.color || '#3b82f6'}08`,
            onClick: () => {
              if (onOpenScheduleDetail) onOpenScheduleDetail(s);
            }
          });
        });

        // 2. 수주 필터링
        const roleFilteredOrders = (salesOrders || []).filter(o => 
          isAdmin || o.manager === currentUser?.name
        );
        const selectedOrders = roleFilteredOrders.filter(o => o.date === selectedDayStr);
        selectedOrders.forEach(o => {
          const staff = staffList?.find(s => s.name === o.manager);
          const wh = staff?.warehouse || o.inWarehouse || '본사';
          selectedDayItems.push({
            uniqueId: `list-so-${o.id}`,
            tag: '수주',
            title: `${o.partnerName} 수주 등록`,
            subtitle: `담당: ${o.manager} | 창고: ${wh} | 품목: ${o.items?.[0]?.name || ''} 외 ${o.items?.length - 1 || 0}건`,
            time: o.time || '',
            color: '#f59e0b',
            bgColor: '#fffbeb',
            onClick: () => {
              if (onOpenOrderListForDate) onOpenOrderListForDate(selectedDate);
            }
          });
        });

        // 3. 매출전표 필터링
        const selectedSalesInvoices = (salesInvoices || []).filter(inv => inv.date === selectedDayStr && (isAdmin || inv.creator === currentUser?.name));
        selectedSalesInvoices.forEach(inv => {
          selectedDayItems.push({
            uniqueId: `list-si-${inv.id}`,
            tag: '매출',
            title: `${inv.partnerName} 매출전표`,
            subtitle: `합계: ${(inv.totalAmount || 0).toLocaleString()}원 | 작성자: ${inv.creator || '시스템'}`,
            time: '',
            color: '#be185d',
            bgColor: '#fdf2f8',
            onClick: () => {
              if (onOpenSalesInvoiceListForDate) onOpenSalesInvoiceListForDate(selectedDate);
            }
          });
        });

        // 4. 발주 필터링
        const selectedPurchaseOrders = (purchaseOrders || []).filter(o => o.date === selectedDayStr);
        selectedPurchaseOrders.forEach(po => {
          selectedDayItems.push({
            uniqueId: `list-po-${po.id}`,
            tag: '발주',
            title: `${po.partnerName} 발주서`,
            subtitle: `금액: ${(po.totalAmount || 0).toLocaleString()}원`,
            time: '',
            color: '#047857',
            bgColor: '#ecfdf5',
            onClick: () => {
              if (onOpenPurchaseLedgerForDate) onOpenPurchaseLedgerForDate(selectedDate);
            }
          });
        });

        // 5. 매입전표 필터링
        const selectedPurchaseInvoices = (purchaseInvoices || []).filter(inv => inv.date === selectedDayStr);
        selectedPurchaseInvoices.forEach(pi => {
          selectedDayItems.push({
            uniqueId: `list-pi-${pi.id}`,
            tag: '매입',
            title: `${pi.partnerName} 매입전표`,
            subtitle: `금액: ${(pi.totalAmount || 0).toLocaleString()}원`,
            time: '',
            color: '#b91c1c',
            bgColor: '#fef2f2',
            onClick: () => {
              if (onOpenPurchaseLedgerForDate) onOpenPurchaseLedgerForDate(selectedDate);
            }
          });
        });

        // 6. 창고이동 필터링
        const selectedTransfers = (inventoryTransferHistory || []).filter(h => h.date === selectedDayStr);
        selectedTransfers.forEach(t => {
          selectedDayItems.push({
            uniqueId: `list-t-${t.id}`,
            tag: '창고이동',
            title: `${t.productName} 이동`,
            subtitle: `${t.fromWarehouse} ➡️ ${t.toWarehouse} | 수량: ${t.qty}개`,
            time: t.time || '',
            color: '#1e40af',
            bgColor: '#eff6ff',
            onClick: () => {
              if (onOpenInventoryTransferForDate) onOpenInventoryTransferForDate(selectedDate);
            }
          });
        });

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
            flex: 1, // 남은 세로 빈 공간을 가득 채우도록 확장
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                📅 {format(selectedDate, 'yyyy년 M월 d일', { locale: ko })} 일정/내역
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                총 {selectedDayItems.length}건
              </span>
            </div>
            
            {selectedDayItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                등록된 일정이나 거래 내역이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedDayItems.map(item => (
                  <div 
                    key={item.uniqueId} 
                    onClick={item.onClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: item.bgColor,
                      borderLeft: `4px solid ${item.color}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, marginRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 800, 
                          color: item.color, 
                          backgroundColor: '#ffffff', 
                          padding: '1px 5px', 
                          borderRadius: '4px',
                          border: `1px solid ${item.color}40`,
                          whiteSpace: 'nowrap'
                        }}>
                          {item.tag}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', wordBreak: 'break-all' }}>
                          {item.title}
                        </span>
                      </div>
                      {item.subtitle && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '2px' }}>
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    
                    {item.time && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default Calendar;
