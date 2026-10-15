import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, TrendingUp, Search, Download, Printer, RefreshCw, Save } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import './ReceivablesReport.css';

const STATUS_TO_GRADE = { blue: '1', yellow: '2', red: '3' };
const GRADE_TO_STATUS = { '1': 'blue', '2': 'yellow', '3': 'red' };

const GradeBadge = ({ grade }) => {
  const styles = {
    '1': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', text: '1등급' },
    '2': { bg: '#fffbeb', color: '#b45309', border: '#fde68a', text: '2등급' },
    '3': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', text: '3등급' },
  };
  const s = styles[grade] || styles['1'];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.text}
    </span>
  );
};

const ReceivablesReport = ({ onClose, partners = [], salesInvoices = [], setPartners, staffList = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterManager, setFilterManager] = useState('전체');

  // Unique Manager list derived from staffList + existing partners
  const managerOptions = useMemo(() => {
    const map = new Map();
    (staffList || []).forEach(s => {
      if (s && s.name && s.name.trim()) {
        map.set(s.name.trim(), s.jobTitle || '직원');
      }
    });
    (partners || []).forEach(p => {
      if (p && p.manager && p.manager !== '-' && p.manager.trim()) {
        const name = p.manager.trim();
        if (!map.has(name)) {
          map.set(name, '직원');
        }
      }
    });
    return Array.from(map.entries()).map(([name, jobTitle]) => ({ name, jobTitle }));
  }, [staffList, partners]);

  // Local editable settings: { [partnerId]: { grade: '1'|'2'|'3', promiseDate: string } }
  const [localSettings, setLocalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'adjustedReceivables', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('status'); // 'status' or 'aging'

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, fontSize: '0.7rem' }}>↕</span>;
    return sortConfig.direction === 'asc'
      ? <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>↑</span>
      : <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>↓</span>;
  };

  const lastMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  }, []);

  const reportData = useMemo(() => {
    const now = new Date();
    const data = partners
      .filter(p => p.type === '매출처' || p.type === '혼합')
      .map(p => {
        // Calculate monthly sales
        const partnerSales = salesInvoices
          .filter(inv => inv.partner === p.name)
          .filter(inv => new Date(inv.date) >= lastMonth)
          .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

        const currentReceivables = Number(p.receivables) || 0;
        const baseAmount = Number(p.receivableBase) || 0;
        const adjustedReceivables = Math.max(0, currentReceivables - baseAmount);
        const ratio = partnerSales > 0 ? adjustedReceivables / partnerSales : (adjustedReceivables > 0 ? 999 : 0);

        let status = 'blue';
        if (ratio > 1.5) status = 'red';
        else if (ratio > 0.5) status = 'yellow';

        const autoGrade = STATUS_TO_GRADE[status];
        const savedGrade = p.grade || '1';
        const savedPromiseDate = p.promiseDate || '';

        // Aging Analysis Calculation (1주일 추가)
        const aging = { bucket7: 0, bucket30: 0, bucket60: 0, bucket90: 0, bucketOver90: 0 };
        salesInvoices.filter(inv => inv.partner === p.name).forEach(inv => {
          const unpaid = (Number(inv.totalAmount) || 0) - (Number(inv.receivedAmount) || 0) - (Number(inv.discount) || 0);
          if (unpaid <= 0) return;

          const invDate = new Date(inv.date);
          const diffTime = Math.abs(now - invDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) aging.bucket7 += unpaid;
          else if (diffDays <= 30) aging.bucket30 += unpaid;
          else if (diffDays <= 60) aging.bucket60 += unpaid;
          else if (diffDays <= 90) aging.bucket90 += unpaid;
          else aging.bucketOver90 += unpaid;
        });

        return { ...p, monthlySales: partnerSales, adjustedReceivables, ratio, status, autoGrade, savedGrade, savedPromiseDate, aging };
      });

    return data.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
  }, [partners, salesInvoices, lastMonth, sortConfig]);

  // Initialise localSettings from partner data
  useEffect(() => {
    const init = {};
    reportData.forEach(r => { 
      init[r.id] = { grade: r.savedGrade, promiseDate: r.savedPromiseDate }; 
    });
    setLocalSettings(init);
    setHasChanges(false);
  }, [partners]);

  const handleSettingChange = (id, field, value) => {
    setLocalSettings(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: value } 
    }));
    setHasChanges(true);
  };

  // Sync ALL to autoGrade
  const handleSyncAllGrades = () => {
    if (!window.confirm('신호등 상태에 따라 전체 거래처 등급을 자동 조정하시겠습니까?\n파란불→1등급 / 노란불→2등급 / 빨간불→3등급')) return;
    const next = { ...localSettings };
    reportData.forEach(r => { 
      next[r.id] = { ...next[r.id], grade: r.autoGrade }; 
    });
    setLocalSettings(next);
    setHasChanges(true);
  };

  // Save all localSettings back to partners state and Firestore
  const handleSaveChanges = async () => {
    if (!setPartners) return;
    const updatedPartners = partners.map(p => {
      const setting = localSettings[p.id];
      return setting ? { ...p, grade: setting.grade, promiseDate: setting.promiseDate } : p;
    });
    setPartners(updatedPartners);

    const companyId = localStorage.getItem('companyId') || 'default_company';
    try {
      localStorage.setItem(`partners_${companyId}`, JSON.stringify(updatedPartners));
      localStorage.setItem('local_partners', JSON.stringify(updatedPartners));
    } catch (e) {
      console.warn('localStorage save error:', e);
    }

    try {
      for (const [id, setting] of Object.entries(localSettings)) {
        const partnerRef = doc(db, 'companies', companyId, 'partners', String(id));
        await updateDoc(partnerRef, {
          grade: setting.grade,
          promiseDate: setting.promiseDate || ''
        }).catch(async () => {
          await setDoc(partnerRef, {
            grade: setting.grade,
            promiseDate: setting.promiseDate || ''
          }, { merge: true });
        });
      }
    } catch (e) {
      console.error('Error saving grades to Firestore:', e);
    }

    setHasChanges(false);
    alert('설정 및 약속일 변경사항이 저장되었습니다.');
  };

  // 등급별 건수: 수동 설정 등급(상위개념)을 우선 반영하여 집계
  const gradeCounts = useMemo(() => {
    let red = 0, yellow = 0, blue = 0;
    reportData.forEach(r => {
      const setting = localSettings[r.id];
      const manualGrade = setting?.grade !== undefined ? setting.grade : (r.savedGrade || r.grade);
      const effectiveGrade = manualGrade || r.autoGrade;
      if (effectiveGrade === '3') red++;
      else if (effectiveGrade === '2') yellow++;
      else if (effectiveGrade === '1') blue++;
    });
    return { red, yellow, blue };
  }, [reportData, localSettings]);

  const isMatchStatus = (status, filter) => {
    if (!filter || filter === '전체') return true;
    if (filter === 'red' || filter === '3' || filter === '위험(빨간)' || filter === '3등급') return status === 'red';
    if (filter === 'yellow' || filter === '2' || filter === '주의(노란)' || filter === '2등급') return status === 'yellow';
    if (filter === 'blue' || filter === '1' || filter === '안전(파란)' || filter === '1등급') return status === 'blue';
    return true;
  };

  const filteredData = useMemo(() => {
    return reportData
      .filter(row => {
        const setting = localSettings[row.id];
        const manualGrade = setting?.grade !== undefined ? setting.grade : (row.savedGrade || row.grade);
        const effectiveGrade = manualGrade || row.autoGrade;
        const effectiveStatus = GRADE_TO_STATUS[effectiveGrade] || row.status;

        if (!isMatchStatus(effectiveStatus, filterStatus)) return false;

        if (filterManager !== '전체') {
          const pManager = (row.manager || '').trim();
          if (filterManager === '미지정') {
            if (pManager && pManager !== '-' && pManager !== '미지정') return false;
          } else if (pManager !== filterManager.trim()) {
            return false;
          }
        }

        if (searchTerm && !(row.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim())) {
          return false;
        }

        return true;
      });
  }, [reportData, localSettings, filterStatus, filterManager, searchTerm]);

  const handleExcelExport = () => {
    const dataToExport = filteredData.map((row, idx) => {
      const setting = localSettings[row.id] || { grade: row.savedGrade, promiseDate: row.savedPromiseDate };
      const manualGrade = setting.grade !== undefined ? setting.grade : (row.savedGrade || row.grade);
      const effectiveGrade = manualGrade || row.autoGrade;
      const effectiveStatusText = effectiveGrade === '3' ? '위험' : effectiveGrade === '2' ? '주의' : '안전';

      if (activeTab === 'aging') {
        return {
          '순위': idx + 1,
          '거래처명': row.name,
          '1주일(7일) 이하': row.aging.bucket7,
          '8~30일': row.aging.bucket30,
          '31~60일': row.aging.bucket60,
          '61~90일': row.aging.bucket90,
          '90일 초과': row.aging.bucketOver90,
          '전체 미수금': Number(row.receivables),
          '상태': row.aging.bucketOver90 > 0 ? '소멸시효 주의' : '정상'
        };
      }

      return {
        '순위': idx + 1,
        '거래처명': row.name,
        '입금약속일': setting.promiseDate || '-',
        '수동등급': `${manualGrade}등급`,
        '자동등급': `${row.autoGrade}등급`,
        '최종반영등급': `${effectiveGrade}등급`,
        '1개월매출': row.monthlySales,
        '총미수금': Number(row.receivables),
        '관리미수금': row.adjustedReceivables,
        '상태': effectiveStatusText
      };
    });
    exportToExcel(dataToExport, activeTab === 'aging' ? '미수연령분석보고서' : '미수금현황보고서');
  };

  const gradeSelectStyle = (grade) => ({
    padding: '5px 10px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    border: grade === '1' ? '1px solid #bfdbfe' : grade === '2' ? '1px solid #fde68a' : '1px solid #fecaca',
    background: grade === '1' ? '#eff6ff' : grade === '2' ? '#fffbeb' : '#fef2f2',
    color: grade === '1' ? '#1d4ed8' : grade === '2' ? '#b45309' : '#dc2626',
    outline: 'none',
    minWidth: '110px',
  });

  return (
    <WindowModal title="미수금 관리 보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={18} color="#ef4444" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                미수금 관리 현황
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                등급 신호등 &amp; 미수 연령 분석
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={handleSyncAllGrades}
              style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #c7d2fe', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 700 }}
              title="신호등 상태로 전체 등급 자동 동기화"
            >
              <RefreshCw size={12} /> 동기화
            </button>
            {hasChanges && (
              <button 
                onClick={handleSaveChanges}
                style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}
              >
                <Save size={12} /> 저장
              </button>
            )}
            <button onClick={() => window.print()} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <Printer size={12} />
            </button>
            <button onClick={handleExcelExport} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* 2-Tab Segment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button 
            onClick={() => setActiveTab('status')}
            style={{
              padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.78rem',
              fontWeight: activeTab === 'status' ? 800 : 600,
              backgroundColor: activeTab === 'status' ? '#fff' : 'transparent',
              color: activeTab === 'status' ? '#2563eb' : '#64748b',
              cursor: 'pointer', boxShadow: activeTab === 'status' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            미수금 현황
          </button>
          <button 
            onClick={() => setActiveTab('aging')}
            style={{
              padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.78rem',
              fontWeight: activeTab === 'aging' ? 800 : 600,
              backgroundColor: activeTab === 'aging' ? '#fff' : 'transparent',
              color: activeTab === 'aging' ? '#2563eb' : '#64748b',
              cursor: 'pointer', boxShadow: activeTab === 'aging' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            미수 연령 분석
          </button>
        </div>

        {/* 3 Grade Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {/* 3등급 */}
          <div 
            onClick={() => setFilterStatus(prev => prev === 'red' ? '전체' : 'red')}
            style={{
              backgroundColor: filterStatus === 'red' ? '#fee2e2' : '#fef2f2',
              border: filterStatus === 'red' ? '2px solid #ef4444' : '1px solid #fecaca',
              borderRadius: '8px',
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
              boxShadow: filterStatus === 'red' ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none'
            }}
            title="클릭 시 3등급(빨간불) 필터 토글"
          >
            <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
              {gradeCounts.red}건
            </span>
            <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 800 }}>3등급</span>
            <span style={{ fontSize: '0.62rem', color: '#ef4444' }}>위험</span>
          </div>

          {/* 2등급 */}
          <div 
            onClick={() => setFilterStatus(prev => prev === 'yellow' ? '전체' : 'yellow')}
            style={{
              backgroundColor: filterStatus === 'yellow' ? '#fef3c7' : '#fffbeb',
              border: filterStatus === 'yellow' ? '2px solid #f59e0b' : '1px solid #fde68a',
              borderRadius: '8px',
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
              boxShadow: filterStatus === 'yellow' ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none'
            }}
            title="클릭 시 2등급(노란불) 필터 토글"
          >
            <span style={{ backgroundColor: '#f59e0b', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
              {gradeCounts.yellow}건
            </span>
            <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 800 }}>2등급</span>
            <span style={{ fontSize: '0.62rem', color: '#f59e0b' }}>주의</span>
          </div>

          {/* 1등급 */}
          <div 
            onClick={() => setFilterStatus(prev => prev === 'blue' ? '전체' : 'blue')}
            style={{
              backgroundColor: filterStatus === 'blue' ? '#dbeafe' : '#eff6ff',
              border: filterStatus === 'blue' ? '2px solid #2563eb' : '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
              boxShadow: filterStatus === 'blue' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
            }}
            title="클릭 시 1등급(파란불) 필터 토글"
          >
            <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', flexShrink: 0 }}>
              {gradeCounts.blue}건
            </span>
            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 800 }}>1등급</span>
            <span style={{ fontSize: '0.62rem', color: '#3b82f6' }}>안전</span>
          </div>
        </div>

        {/* Filters Panel */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Staff Manager Pills */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button 
              onClick={() => setFilterManager('전체')}
              style={{
                padding: '4px 10px', borderRadius: '14px',
                border: filterManager === '전체' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                backgroundColor: filterManager === '전체' ? '#3b82f6' : '#fff',
                color: filterManager === '전체' ? '#fff' : '#475569',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              전체 담당자
            </button>
            {managerOptions.map(staff => (
              <button 
                key={staff.name}
                onClick={() => setFilterManager(staff.name)}
                style={{
                  padding: '4px 10px', borderRadius: '14px',
                  border: filterManager === staff.name ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  backgroundColor: filterManager === staff.name ? '#3b82f6' : '#fff',
                  color: filterManager === staff.name ? '#fff' : '#475569',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {staff.name}
              </button>
            ))}
            <button 
              onClick={() => setFilterManager('미지정')}
              style={{
                padding: '4px 10px', borderRadius: '14px',
                border: filterManager === '미지정' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                backgroundColor: filterManager === '미지정' ? '#3b82f6' : '#fff',
                color: filterManager === '미지정' ? '#fff' : '#475569',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              미지정
            </button>
          </div>

          {/* Search & Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="거래처명 검색..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ width: '100%', padding: '6px 6px 6px 26px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
              />
            </div>

            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="전체">전체 등급</option>
              <option value="red">3등급 (빨간불 위험)</option>
              <option value="yellow">2등급 (노란불 주의)</option>
              <option value="blue">1등급 (파란불 안전)</option>
            </select>
          </div>
        </div>

        {/* Data Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              거래처 목록 ({filteredData.length}곳)
            </span>
          </div>

          {filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              조건에 맞는 거래처 데이터가 없습니다.
            </div>
          ) : (
            filteredData.map((row, idx) => {
              const setting = localSettings[row.id] || { grade: row.savedGrade, promiseDate: row.savedPromiseDate };
              const isChanged = setting.grade !== row.savedGrade || setting.promiseDate !== row.savedPromiseDate;
              const isOverdue = setting.promiseDate && new Date(setting.promiseDate) < new Date(new Date().setHours(0,0,0,0));
              const effectiveGrade = setting.grade || row.autoGrade;
              const effectiveStatus = GRADE_TO_STATUS[effectiveGrade] || row.status;

              return (
                <div key={row.id} style={{
                  backgroundColor: '#fff',
                  border: isChanged ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Row 1: Partner Name, Status Badge, and Total Receivables */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: '#f1f5f9', color: '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.68rem', fontWeight: 800
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                        {row.name}
                      </span>
                      {isChanged && (
                        <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 800 }}>
                          미저장
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: effectiveStatus === 'red' ? '#ef4444' : effectiveStatus === 'yellow' ? '#f59e0b' : '#3b82f6'
                      }}></span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 900, color: row.adjustedReceivables > 0 ? '#ef4444' : '#1e293b' }}>
                        {row.adjustedReceivables.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {activeTab === 'status' ? (
                    <>
                      {/* Row 2: Monthly Sales & Total Receivables */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                        <span>1개월 매출: <strong style={{ color: '#1e293b' }}>{row.monthlySales.toLocaleString()}원</strong></span>
                        <span>총 미수금: <strong style={{ color: '#1e293b' }}>{Number(row.receivables).toLocaleString()}원</strong></span>
                      </div>

                      {/* Row 3: Promise Date & Grade Selector */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>약속일:</span>
                          <input 
                            type="date" 
                            value={setting.promiseDate || ''} 
                            onChange={e => handleSettingChange(row.id, 'promiseDate', e.target.value)}
                            style={{ padding: '2px 4px', fontSize: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', backgroundColor: '#fff', color: isOverdue ? '#ef4444' : 'inherit', minWidth: 0, flex: 1 }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>등급:</span>
                          <select
                            value={setting.grade}
                            onChange={e => handleSettingChange(row.id, 'grade', e.target.value)}
                            style={{ flex: 1, padding: '3px 4px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                          >
                            <option value="1">1등급</option>
                            <option value="2">2등급</option>
                            <option value="3">3등급</option>
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Aging Analysis View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed #f1f5f9', paddingTop: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.68rem' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '4px 2px', borderRadius: '4px' }}>
                          <div style={{ color: '#64748b' }}>1주일이하</div>
                          <div style={{ fontWeight: 700, marginTop: '2px' }}>{row.aging.bucket7.toLocaleString()}</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '4px 2px', borderRadius: '4px' }}>
                          <div style={{ color: '#64748b' }}>8~30일</div>
                          <div style={{ fontWeight: 700, marginTop: '2px' }}>{row.aging.bucket30.toLocaleString()}</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '4px 2px', borderRadius: '4px' }}>
                          <div style={{ color: '#64748b' }}>31~60일</div>
                          <div style={{ fontWeight: 700, marginTop: '2px' }}>{row.aging.bucket60.toLocaleString()}</div>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '4px 2px', borderRadius: '4px' }}>
                          <div style={{ color: '#64748b' }}>61~90일</div>
                          <div style={{ fontWeight: 700, marginTop: '2px' }}>{row.aging.bucket90.toLocaleString()}</div>
                        </div>
                        <div style={{ backgroundColor: row.aging.bucketOver90 > 0 ? '#fef2f2' : '#f8fafc', padding: '4px 2px', borderRadius: '4px' }}>
                          <div style={{ color: row.aging.bucketOver90 > 0 ? '#ef4444' : '#64748b', fontWeight: row.aging.bucketOver90 > 0 ? 800 : 400 }}>90일초과</div>
                          <div style={{ fontWeight: 700, color: row.aging.bucketOver90 > 0 ? '#ef4444' : 'inherit', marginTop: '2px' }}>{row.aging.bucketOver90.toLocaleString()}</div>
                        </div>
                      </div>
                      {row.aging.bucketOver90 > 0 && (
                        <div style={{ color: '#ef4444', fontSize: '0.68rem', fontWeight: 700, textAlign: 'right' }}>
                          ⚠ 90일 초과 미수금 존재 (소멸시효 주의)
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>
    </WindowModal>
  );
};

export default ReceivablesReport;
