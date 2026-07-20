import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { ALL_COLUMNS } from '../constants/partnerColumns';


const PartnerSettingsModal = ({ onClose, initialVisibleColumns, onSave }) => {
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns);

  const toggleColumn = (colId) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleSave = () => {
    onSave(visibleColumns);
    onClose();
  };

  return (
    <div className="window-overlay" style={{ zIndex: 9999 }}>
      <div className="window-container sm" style={{ width: '480px' }}>
        <div className="window-titlebar" style={{ backgroundColor: 'white', color: '#1e293b', borderBottom: '1px solid #e2e8f0', height: '50px' }}>
          <div className="window-title" style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} />
            표시 항목 설정
          </div>
          <div className="window-controls">
            <button className="window-btn" onClick={onClose} style={{ color: '#64748b' }}><X size={20} /></button>
          </div>
        </div>
        
        <div className="window-content-area">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            목록에 표시할 항목을 선택하세요. (상호명은 항상 표시됩니다)
          </p>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
            {['기본정보', '연락처', '관리설정', '로그인'].map(category => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #eff6ff' }}>{category}</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ALL_COLUMNS.filter(col => col.category === category).map(col => (
                    <label 
                      key={col.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '8px 10px', 
                        border: '1px solid #f1f5f9', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: visibleColumns.includes(col.id) ? '#f8fafc' : 'transparent'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.includes(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        style={{ width: '15px', height: '15px', accentColor: '#3b82f6', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: visibleColumns.includes(col.id) ? 600 : 400 }}>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave} style={{ padding: '8px 24px' }}>
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerSettingsModal;
