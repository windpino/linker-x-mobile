import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { playMenuClickSound } from '../utils/audio';

const DashboardBanner = ({ selectedDate, onOpenDashboardSettings, className = "" }) => {
  // Format the date using date-fns for Korean locale
  const formattedDate = format(selectedDate, 'yyyy년 M월 d일 EEEE', { locale: ko });

  return (
    <div className={`banner ${className}`}>
      <div className="banner-left">
        <h2>
          <CalendarIcon color="#3b82f6" />
          {formattedDate}
        </h2>
        <p>오늘의 물류 현황을 확인하세요</p>
      </div>
    </div>
  );
};

export default DashboardBanner;
