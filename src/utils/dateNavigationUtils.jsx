import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Add or subtract days from a YYYY-MM-DD date string
 */
export const addDays = (dateStr, days = 1) => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim().slice(0, 10).replace(/[./]/g, '-');
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() + Number(days));
  
  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resD = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
};

/**
 * Shift both start and end date by a number of days
 */
export const shiftDateRange = (startDate, endDate, days = 1) => {
  return {
    startDate: addDays(startDate, days),
    endDate: addDays(endDate, days)
  };
};

export const formatMonthDay = (dateStr) => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim().slice(0, 10).replace(/[./]/g, '-');
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[1]}.${parts[2]}`;
  }
  return dateStr;
};

/**
 * Reusable Day Navigation Button (ChevronLeft or ChevronRight)
 */
export const DateNavButton = ({
  direction = 'prev',
  onClick,
  disabled = false,
  size = 13,
  style = {},
  title
}) => {
  const isPrev = direction === 'prev';
  const defaultTitle = isPrev ? '하루 전 (1일 전)' : '하루 뒤 (1일 후)';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick && !disabled) onClick(e);
      }}
      disabled={disabled}
      title={title || defaultTitle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        minWidth: '22px',
        padding: 0,
        borderRadius: '4px',
        border: '1px solid #334155',
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        ...style
      }}
    >
      {isPrev ? <ChevronLeft size={size} /> : <ChevronRight size={size} />}
    </button>
  );
};

/**
 * Date Input with Left/Right Day Navigation Arrows
 */
export const DateInputWithArrows = ({
  value,
  onChange,
  onPrev,
  onNext,
  min,
  max,
  disabled = false,
  style = {},
  inputStyle = {},
  className = '',
  buttonSize = 13
}) => {
  const handlePrev = (e) => {
    e.stopPropagation();
    if (onPrev) {
      onPrev();
    } else if (onChange) {
      onChange(addDays(value, -1));
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (onNext) {
      onNext();
    } else if (onChange) {
      onChange(addDays(value, 1));
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', minWidth: 0, ...style }}>
      <DateNavButton direction="prev" onClick={handlePrev} disabled={disabled} size={buttonSize} />
      <div style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #334155',
        borderRadius: '6px',
        padding: '4px 8px',
        backgroundColor: '#1e293b',
        minWidth: '54px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...inputStyle
      }}>
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#ffffff',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          {formatMonthDay(value) || '선택'}
        </span>
        <input
          type="date"
          value={value || ''}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value)}
          className={className}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
      </div>
      <DateNavButton direction="next" onClick={handleNext} disabled={disabled} size={buttonSize} />
    </div>
  );
};
