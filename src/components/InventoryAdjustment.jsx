import React, { useState, useRef } from 'react';
import { Package, Trash2, Camera, Save, X, AlertTriangle, FileText, Calendar as CalendarIcon, Tag, Users } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';

const InventoryAdjustment = ({ onClose, products, partners, warehouses, onSave, currentUser }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    warehouse: warehouses[0]?.name || '',
    partnerName: '',
    productId: '',
    productName: '',
    qty: 1,
    reason: '파손',
    description: '',
    photo: null
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);

  const reasons = ['파손', '분실', '폐기', '기타'];

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.abbreviation && p.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.singleBarcode && p.singleBarcode.includes(searchTerm))
  );

  const handleSelectProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name
    }));
    setSearchTerm(product.name);
    setShowSuggestions(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.warehouse) {
      alert('품목과 창고를 선택해주세요.');
      return;
    }
    if (formData.qty <= 0) {
      alert('차감 수량은 0보다 커야 합니다.');
      return;
    }

    onSave({
      ...formData,
      id: Date.now(),
      author: currentUser?.name || '시스템'
    });
    onClose();
  };

  return (
    <WindowModal title="재고 손실 조정 등록" onClose={onClose} width="600px">
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', background: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
          <AlertTriangle color="#f59e0b" size={24} />
          <div>
            <div style={{ fontWeight: 700, color: '#9a3412', fontSize: '0.95rem' }}>재고 손실 처리 주의</div>
            <div style={{ fontSize: '0.85rem', color: '#c2410c' }}>이 작업은 재고에서 즉시 차감되며 경비로 자동 처리됩니다.</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                <CalendarIcon size={16} /> 조정 일자
              </label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                <Package size={16} /> 조정 창고
              </label>
              <select 
                value={formData.warehouse}
                onChange={(e) => setFormData({...formData, warehouse: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
              <Users size={16} /> 관련 거래처 (선택)
            </label>
            <PartnerSearchInput 
              partners={partners || []} 
              value={formData.partnerName}
              onChange={(val) => setFormData({...formData, partnerName: val})}
              onSelect={(p) => setFormData({...formData, partnerName: p.name})}
              placeholder="손실과 관련된 거래처가 있다면 선택하세요"
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
              <Package size={16} /> 품목 선택
            </label>
            <input 
              type="text"
              placeholder="품목명 또는 바코드 검색"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            {showSuggestions && searchTerm && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                {filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.spec} | {p.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                <Trash2 size={16} /> 차감 수량
              </label>
              <input 
                type="number"
                value={formData.qty}
                onChange={(e) => setFormData({...formData, qty: Number(e.target.value)})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                <Tag size={16} /> 손실 사유
              </label>
              <select 
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              >
                {reasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
              <FileText size={16} /> 상세 설명
            </label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="손실 발생 경위 등 상세 내용을 입력하세요"
              rows="3"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none' }}
            ></textarea>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
              <Camera size={16} /> 현장 사진 등록
            </label>
            <div 
              onClick={() => fileInputRef.current.click()}
              style={{ 
                width: '100%', 
                height: '120px', 
                border: '2px dashed #e2e8f0', 
                borderRadius: '12px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                background: formData.photo ? '#000' : '#f8fafc'
              }}
            >
              {formData.photo ? (
                <img src={formData.photo} alt="Loss site" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <>
                  <Camera size={32} color="#94a3b8" />
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>사진 업로드 (클릭)</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer' }}
            >
              취소
            </button>
            <button 
              type="submit"
              style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={18} /> 손실 조정 확정
            </button>
          </div>
        </form>
      </div>
    </WindowModal>
  );
};

export default InventoryAdjustment;
