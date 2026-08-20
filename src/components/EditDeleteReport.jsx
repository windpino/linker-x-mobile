import React from 'react';
import { FileText, Printer, Download, Search } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';

const EditDeleteReport = ({ onClose }) => {
  const handleExcelExport = () => {
    alert('전표 수정/삭제 보고서 데이터를 엑셀로 내보냅니다.');
    exportToExcel([], '전표수정삭제보고서');
  };

  const [searchTerm, setSearchTerm] = React.useState('');
  const [docTypeFilter, setDocTypeFilter] = React.useState('전체 전표');
  const [actionFilter, setActionFilter] = React.useState('전체 작업');

  return (
    <WindowModal title="전표수정/삭제 보고서" onClose={onClose} width="100%" contentPadding="0" noScroll>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', gap: '12px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
        
        {/* Header: Title & Utilities */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#3b82f6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                전표 수정/삭제 보고서
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                전표 변경 이력을 확인합니다.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => window.print()} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <Printer size={12} /> 인쇄
            </button>
            <button onClick={handleExcelExport} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
              <Download size={12} /> 엑셀
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="내역 또는 담당자 검색..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <select 
              value={docTypeFilter} 
              onChange={e => setDocTypeFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              <option>전체 전표</option>
              <option>매출전표</option>
              <option>매입전표</option>
              <option>수주전표</option>
            </select>
            <select 
              value={actionFilter} 
              onChange={e => setActionFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, outline: 'none', backgroundColor: '#fff' }}
            >
              <option>전체 작업</option>
              <option>수정</option>
              <option>삭제</option>
            </select>
          </div>
        </div>

        {/* Change History Empty State / Cards */}
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: '0.82rem', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
          <FileText size={32} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
          수정 또는 삭제된 전표 내역이 없습니다.
        </div>

      </div>
    </WindowModal>
  );
};

export default EditDeleteReport;
