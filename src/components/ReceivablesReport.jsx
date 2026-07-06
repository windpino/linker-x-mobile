import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, TrendingUp, Search, Download, Printer, RefreshCw, Save } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';
import './ReceivablesReport.css';

const STATUS_TO_GRADE = { blue: '1', yellow: '2', red: '3' };

const GradeBadge = ({ grade }) => {
  const styles = {
    '1': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', text: '★ 1등급' },
    '2': { bg: '#fffbeb', color: '#b45309', border: '#fde68a', text: '★★ 2등급' },
    '3': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', text: '★★★ 3등급' },
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

        // Aging Analysis Calculation
        const aging = { bucket30: 0, bucket60: 0, bucket90: 0, bucketOver90: 0 };
        salesInvoices.filter(inv => inv.partner === p.name).forEach(inv => {
          const unpaid = (Number(inv.totalAmount) || 0) - (Number(inv.receivedAmount) || 0) - (Number(inv.discount) || 0);
          if (unpaid <= 0) return;

          const invDate = new Date(inv.date);
          const diffTime = Math.abs(now - invDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30) aging.bucket30 += unpaid;
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

  // Save all localSettings back to partners state
  const handleSaveChanges = () => {
    if (!setPartners) return;
    setPartners(prev => prev.map(p => {
      const setting = localSettings[p.id];
      return setting ? { ...p, grade: setting.grade, promiseDate: setting.promiseDate } : p;
    }));
    setHasChanges(false);
    alert('설정 및 약속일 변경사항이 저장되었습니다.');
  };

  const filteredData = useMemo(() => {
    return reportData
      .filter(row => {
        if (filterStatus === '전체') return true;
        if (filterStatus === '위험(빨간)') return row.status === 'red';
        if (filterStatus === '주의(노란)') return row.status === 'yellow';
        if (filterStatus === '안전(파란)') return row.status === 'blue';
        return true;
      })
      .filter(row => {
        if (filterManager === '전체') return true;
        return row.manager === filterManager;
      })
      .filter(row => row.name?.includes(searchTerm));
  }, [reportData, filterStatus, filterManager, searchTerm]);

  const handleExcelExport = () => {
    const dataToExport = filteredData.map((row, idx) => ({
      '순위': idx + 1,
      '거래처명': row.name,
      '설정등급': localGrades[row.id] || row.savedGrade,
      '자동등급': row.autoGrade,
      '1개월매출': row.monthlySales,
      '총미수금': Number(row.receivables),
      '관리미수금': row.adjustedReceivables,
      '상태': row.status === 'red' ? '위험' : row.status === 'yellow' ? '주의' : '안전'
    }));
    exportToExcel(dataToExport, '미수금현황보고서');
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
    <WindowModal title="미수금 관리 보고서" onClose={onClose} width="1300px">
      <div className="receivables-report-container">
        <div className="report-v2-header">
          <div className="report-v2-title-group">
            <AlertCircle size={24} color="#ef4444" />
            <h2 className="report-v2-title">미수금 관리 현황 &amp; 등급 신호등</h2>
          </div>
          <div className="report-v2-actions">
            <div className="report-tabs-mini" style={{ marginRight: '12px' }}>
              <button className={`tab-mini ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>미수금 현황</button>
              <button className={`tab-mini ${activeTab === 'aging' ? 'active' : ''}`} onClick={() => setActiveTab('aging')}>미수 연령 분석</button>
            </div>
            <button className="btn-sync-grade" onClick={handleSyncAllGrades}>
              <RefreshCw size={16} /> 전체 자동 동기화
            </button>
            {hasChanges && (
              <button className="btn-save-grades" onClick={handleSaveChanges}>
                <Save size={16} /> 저장하기 ({Object.keys(localSettings).filter(id => {
                  const row = reportData.find(r => String(r.id) === String(id));
                  const s = localSettings[id];
                  return row && (s.grade !== row.savedGrade || s.promiseDate !== row.savedPromiseDate);
                }).length}건)
              </button>
            )}
            <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
            <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
          </div>
        </div>

        <div className="report-summary-cards">
          <div className="summary-card danger">
            <div className="card-icon"><TrendingUp size={20} /></div>
            <div className="card-info">
              <span className="label">★★★ 3등급 (빨간불 위험)</span>
              <span className="value">{reportData.filter(d => d.status === 'red').length}건</span>
            </div>
          </div>
          <div className="summary-card warning">
            <div className="card-icon"><AlertCircle size={20} /></div>
            <div className="card-info">
              <span className="label">★★ 2등급 (노란불 주의)</span>
              <span className="value">{reportData.filter(d => d.status === 'yellow').length}건</span>
            </div>
          </div>
          <div className="summary-card success">
            <div className="card-icon"><TrendingDown size={20} /></div>
            <div className="card-info">
              <span className="label">★ 1등급 (파란불 안전)</span>
              <span className="value">{reportData.filter(d => d.status === 'blue').length}건</span>
            </div>
          </div>
        </div>

        <div className="report-v2-filters" style={{ marginTop: '20px' }}>
          <div className="filter-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginRight: '8px' }}>담당자 필터:</span>
              <button 
                className={`filter-manager-btn ${filterManager === '전체' ? 'active' : ''}`}
                onClick={() => setFilterManager('전체')}
              >
                전체
              </button>
              {staffList.map(staff => (
                <button 
                  key={staff.id}
                  className={`filter-manager-btn ${filterManager === staff.name ? 'active' : ''}`}
                  onClick={() => setFilterManager(staff.name)}
                >
                  {staff.name}
                </button>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="search-input-v2" style={{ flex: 1 }}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="거래처명 검색..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', background: 'white' }}
              >
                <option>전체</option>
                <option>위험(빨간)</option>
                <option>주의(노란)</option>
                <option>안전(파란)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="report-v2-table-container" style={{ marginTop: '16px' }}>
          {activeTab === 'status' ? (
            <table className="report-v2-table">
              <thead>
                <tr>
                  <th width="50px">순위</th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>거래처명 {renderSortIcon('name')}</div>
                  </th>
                  <th style={{ textAlign: 'center' }}>입금 약속일</th>
                  <th onClick={() => handleSort('savedGrade')} style={{ textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>수동 등급 설정 {renderSortIcon('savedGrade')}</div>
                  </th>
                  <th onClick={() => handleSort('autoGrade')} style={{ textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>자동 등급 {renderSortIcon('autoGrade')}</div>
                  </th>
                  <th onClick={() => handleSort('monthlySales')} style={{ textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>1개월 매출 {renderSortIcon('monthlySales')}</div>
                  </th>
                  <th onClick={() => handleSort('receivables')} style={{ textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>총 미수금 {renderSortIcon('receivables')}</div>
                  </th>
                  <th onClick={() => handleSort('adjustedReceivables')} style={{ textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>관리 미수금 {renderSortIcon('adjustedReceivables')}</div>
                  </th>
                  <th style={{ textAlign: 'center' }}>신호등</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => {
                  const setting = localSettings[row.id] || { grade: row.savedGrade, promiseDate: row.savedPromiseDate };
                  const isChanged = setting.grade !== row.savedGrade || setting.promiseDate !== row.savedPromiseDate;
                  
                  // Check if promise date is overdue
                  const isOverdue = setting.promiseDate && new Date(setting.promiseDate) < new Date(new Date().setHours(0,0,0,0));

                  return (
                    <tr key={row.id} className={isChanged ? 'grade-mismatch-row' : ''}>
                      <td className="rank-cell">{idx + 1}</td>
                      <td className="partner-cell">
                        {row.name}
                        {isChanged && <span className="grade-update-badge">미저장</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <input 
                            type="date" 
                            value={setting.promiseDate} 
                            onChange={e => handleSettingChange(row.id, 'promiseDate', e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: isOverdue ? '#ef4444' : 'inherit', background: isOverdue ? '#fef2f2' : 'white' }}
                          />
                          {isOverdue && <AlertCircle size={14} color="#ef4444" title="입금 약속일 도과!" />}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select
                          value={setting.grade}
                          onChange={e => handleSettingChange(row.id, 'grade', e.target.value)}
                          style={gradeSelectStyle(setting.grade)}
                        >
                          <option value="1">★ 1등급 (안전)</option>
                          <option value="2">★★ 2등급 (주의)</option>
                          <option value="3">★★★ 3등급 (위험)</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <GradeBadge grade={row.autoGrade} />
                      </td>
                      <td style={{ textAlign: 'right' }}>{row.monthlySales.toLocaleString()} 원</td>
                      <td style={{ textAlign: 'right' }}>{Number(row.receivables).toLocaleString()} 원</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: row.adjustedReceivables > 0 ? '#ef4444' : '#1e293b' }}>
                        {row.adjustedReceivables.toLocaleString()} 원
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={`traffic-light-container ${row.status}`}>
                          <div className="light red"></div>
                          <div className="light yellow"></div>
                          <div className="light blue"></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="report-v2-table">
              <thead>
                <tr>
                  <th width="50px">순위</th>
                  <th>거래처명</th>
                  <th style={{ textAlign: 'right' }}>30일 이하</th>
                  <th style={{ textAlign: 'right' }}>31~60일</th>
                  <th style={{ textAlign: 'right' }}>61~90일</th>
                  <th style={{ textAlign: 'right' }}>90일 초과</th>
                  <th style={{ textAlign: 'right' }}>전체 미수금</th>
                  <th style={{ textAlign: 'center' }}>상태 알림</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="rank-cell">{idx + 1}</td>
                    <td className="partner-cell" style={{ fontWeight: 700 }}>{row.name}</td>
                    <td style={{ textAlign: 'right' }}>{row.aging.bucket30.toLocaleString()} 원</td>
                    <td style={{ textAlign: 'right' }}>{row.aging.bucket60.toLocaleString()} 원</td>
                    <td style={{ textAlign: 'right' }}>{row.aging.bucket90.toLocaleString()} 원</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: row.aging.bucketOver90 > 0 ? '#ef4444' : 'inherit' }}>
                      {row.aging.bucketOver90.toLocaleString()} 원
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{Number(row.receivables).toLocaleString()} 원</td>
                    <td style={{ textAlign: 'center' }}>
                      {row.aging.bucketOver90 > 0 ? (
                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, background: '#fef2f2', padding: '4px 10px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                          ⚠ 소멸시효 주의
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.75rem' }}>정상</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              조건에 맞는 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </WindowModal>
  );
};

export default ReceivablesReport;
