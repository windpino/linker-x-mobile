import React, { useRef } from 'react';
import { 
  Save, Upload, Trash2, ShieldCheck, Download, FileJson, 
  AlertTriangle 
} from 'lucide-react';
import WindowModal from './WindowModal';
import './DataManager.css';

const DataManager = ({ onClose, onSaveAll, onRestoreAll, onDeleteAll }) => {
  const fileInputRef = useRef(null);

  const handleDownload = () => {
    onSaveAll();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onRestoreAll(data);
        } catch (err) {
          alert('올바른 데이터 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <WindowModal title="데이터 전체 저장/불러오기" onClose={onClose} width="1100px">
      <div className="data-header">
        <div className="data-title-section">
          <div className="data-icon-bg"><FileJson size={24} color="#8b5cf6" /></div>
          <div>
            <h2 className="data-title">데이터 전체 저장/불러오기</h2>
            <p className="data-desc">시스템의 전체 데이터를 백업하거나 복원합니다.</p>
          </div>
        </div>
      </div>

      <div className="data-grid">
        {/* Save Card */}
        <div className="data-card">
          <div className="card-icon blue"><Download size={32} /></div>
          <h3 className="card-title">전체 데이터 저장 (백업)</h3>
          <p className="card-desc">
            시스템 내의 모든 회원, 상품, 원장, 일정 및 거래 내역 전체를 안전한 단일 JSON 파일로 즉시 백업합니다.
          </p>
          <button className="btn-data blue" onClick={handleDownload}>
            <Save size={18} /> 데이터 백업하기
          </button>
        </div>

        {/* Restore Card */}
        <div className="data-card">
          <div className="card-icon green"><Upload size={32} /></div>
          <h3 className="card-title">전체 데이터 불러오기 (복구)</h3>
          <p className="card-desc">
            이전에 안전하게 백업된 JSON 데이터를 업로드하여 시스템의 모든 상태를 손쉽게 원클릭으로 완벽히 복원합니다.
          </p>
          <div className="warning-box yellow">
            <AlertTriangle size={14} />
            <span>주의: 현재 입력된 모든 데이터가 백업 파일 내용으로 덮어씌워집니다.</span>
          </div>
          <button className="btn-data-outline" onClick={() => fileInputRef.current.click()}>
            <Upload size={18} /> 백업 파일 선택
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
        </div>

        {/* Delete Card */}
        <div className="data-card">
          <div className="card-icon red"><Trash2 size={32} /></div>
          <h3 className="card-title">모든 데이터 삭제 (초기화)</h3>
          <p className="card-desc">
            DB 내 모든 정보를 안전하고 흔적 없이 완전히 영구 삭제하고 초기화하여 깨끗한 초기 상태로 되돌립니다.
          </p>
          <div className="warning-box red">
            <AlertTriangle size={14} />
            <span>경고: 삭제된 데이터는 절대 복구할 수 없습니다. 신중히 결정하세요.</span>
          </div>
          <button className="btn-data red" onClick={onDeleteAll}>
            <Trash2 size={18} /> 전체 초기화 진행
          </button>
        </div>
      </div>

      <div className="data-guide-footer">
        <div className="guide-title">
          <ShieldCheck size={18} color="#10b981" />
          데이터 안전 관리 가이드
        </div>
        <ul className="guide-list">
          <li>데이터 손실 방지를 위해 정기적으로 '전체 데이터 저장'을 진행해주세요.</li>
          <li>백업 파일은 보안을 위해 안전한 저장소(USB, 외장하드, 클라우드 등)에 보관하는 것이 좋습니다.</li>
          <li>불러오기 기능은 데이터 구조가 다른 파일(예: 엑셀, 텍스트)을 지원하지 않습니다. 반드시 이 프로그램에서 저장한 .json 파일을 사용하세요.</li>
        </ul>
      </div>
    </WindowModal>
  );
};

export default DataManager;
