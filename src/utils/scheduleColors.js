export const getScheduleColors = (type) => {
  const typeColors = {
    '입고예정': { bg: 'var(--sch-in-bg)', text: 'var(--sch-in-text)' },
    '납품': { bg: 'var(--sch-out-bg)', text: 'var(--sch-out-text)' },
    '업무지시': { bg: 'var(--sch-work-bg)', text: 'var(--sch-work-text)' },
    '회식': { bg: 'var(--sch-dinner-bg)', text: 'var(--sch-dinner-text)' },
    '휴무일': { bg: 'var(--sch-holiday-bg)', text: 'var(--sch-holiday-text)' },
    '기타': { bg: 'var(--sch-etc-bg)', text: 'var(--sch-etc-text)' },
    '교육': { bg: 'var(--sch-edu-bg)', text: 'var(--sch-edu-text)' },
    '회의': { bg: 'var(--sch-meet-bg)', text: 'var(--sch-meet-text)' },
    '출장': { bg: 'var(--sch-trip-bg)', text: 'var(--sch-trip-text)' },
    '일반': { bg: 'rgba(148, 163, 184, 0.2)', text: 'var(--text-main)' },
  };

  // Additional types and fallback colors
  if (typeColors[type]) return typeColors[type];

  // If no predefined color, use a hash-based color or fallback to '기타'
  return typeColors['기타'];
};
