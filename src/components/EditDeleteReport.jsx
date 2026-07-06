import React from 'react';
import { FileText, Printer, Download, Search } from 'lucide-react';
import WindowModal from './WindowModal';
import { exportToExcel } from '../utils/excelUtils';

const EditDeleteReport = ({ onClose }) => {
  const handleExcelExport = () => {
    alert('전표 수정/삭제 보고서 데이터를 엑셀로 내보냅니다.');
    exportToExcel([], '전표수정삭제보고서');
  };

  return (
    <WindowModal title="전표수정/삭제 보고서" onClose={onClose} width="900px">
      <div className="report-v2-header">
        <div className="report-v2-title-group">
          <FileText size={24} color="#3b82f6" />
          <h2 className="report-v2-title">전표 수정/삭제 보고서</h2>
        </div>
        <div className="report-v2-actions">
          <button className="btn-v2-action"><Printer size={16} /> 인쇄</button>
          <button className="btn-v2-action" onClick={handleExcelExport}><Download size={16} /> 엑셀</button>
        </div>
      </div>

      <div className="report-v2-filters">
        <div className="filter-row">
          <div className="search-input-v2">
            <input type="text" placeholder="내역 또는 담당자 검색..." />
          </div>
          <select className="select-v2"><option>전체 전표</option></select>
          <select className="select-v2"><option>전체 작업</option></select>
        </div>
      </div>

      <div className="report-v2-content">
        <div className="report-v2-table-container">
          <table className="report-v2-table">
            <thead>
              <tr>
                <th>작업일시</th>
                <th>구분</th>
                <th>작업</th>
                <th>담당자</th>
                <th>원래 작성일시</th>
                <th>내역</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6" className="empty-message">수정 또는 삭제된 전표 내역이 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </WindowModal>
  );
};

export default EditDeleteReport;
