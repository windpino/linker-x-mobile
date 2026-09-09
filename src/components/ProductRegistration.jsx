import React, { useState, useRef } from 'react';
import { 
  Box, Upload, Barcode, FileText, DollarSign, Package, Tag, Save, X, 
  Camera, Edit2, Trash2, Settings, Plus, Sparkles, Sliders
} from 'lucide-react';
import WindowModal from './WindowModal';

const ProductRegistration = ({ onClose, onSave, categories = [], initialData, onOpenCategoryModal }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    photos: initialData?.photos || (initialData?.photo ? [initialData.photo] : []),
    category: initialData?.category || '',
    categoryLarge: initialData?.categoryLarge || '',
    categoryMedium: initialData?.categoryMedium || '',
    categorySmall: initialData?.categorySmall || '',
    singleBarcode: initialData?.singleBarcode || '',
    boxBarcode: initialData?.boxBarcode || '',
    name: initialData?.name || '',
    abbreviation: initialData?.abbreviation || '',
    manufacturer: initialData?.manufacturer || '',
    spec: initialData?.spec || '',
    innerQty: initialData?.innerQty || 1,
    warehouse: initialData?.warehouse || '',
    taxType: initialData?.taxType || '과세',
    salesPriceSingle: initialData?.salesPriceSingle || initialData?.salesPrice || 0,
    salesPriceBox: initialData?.salesPriceBox || 0,
    purchasePrice: initialData?.purchasePrice || 0,
    optimalStock: initialData?.optimalStock || 0,
    initialStock: initialData?.initialStock || 0,
    isBoxOnly: initialData?.isBoxOnly || false,
    showInMall: initialData?.showInMall !== undefined ? initialData.showInMall : true,
    isNewProduct: initialData?.isNewProduct !== undefined ? initialData.isNewProduct : false,
    isBestProduct: initialData?.isBestProduct !== undefined ? initialData.isBestProduct : false,
    memo: initialData?.memo || '',
    isAutoCalcPrice: true
  });

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      if (type === 'checkbox') {
        return { ...prev, [name]: checked };
      }

      const isNumericField = ['salesPriceSingle', 'salesPriceBox', 'purchasePrice', 'optimalStock', 'innerQty', 'initialStock'].includes(name);
      const parsedValue = isNumericField ? Number(value.replace(/[^0-9]/g, '')) : value;
      
      const newData = { ...prev, [name]: parsedValue };

      // Auto-calculation logic for prices and quantities
      const innerQty = name === 'innerQty' ? parsedValue : prev.innerQty;
      const validInnerQty = innerQty > 0 ? innerQty : 1;
      
      const isAutoCalc = name === 'isAutoCalcPrice' ? checked : prev.isAutoCalcPrice;

      if (isAutoCalc) {
        if (name === 'salesPriceSingle') {
          newData.salesPriceBox = parsedValue * validInnerQty;
        } else if (name === 'salesPriceBox') {
          newData.salesPriceSingle = Math.floor(parsedValue / validInnerQty);
        } else if (name === 'innerQty') {
          newData.salesPriceBox = prev.salesPriceSingle * validInnerQty;
        }
      }

      return newData;
    });
  };

  const handlePhotoClick = () => {
    if (formData.photos.length >= 5) {
      alert('사진은 최대 5장까지만 등록 가능합니다.');
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSide = 800;

          if (width > height) {
            if (width > maxSide) {
              height *= maxSide / width;
              width = maxSide;
            }
          } else {
            if (height > maxSide) {
              width *= maxSide / height;
              height = maxSide;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFormData(prev => ({ 
            ...prev, 
            photos: [...prev.photos, compressedDataUrl] 
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const setAsMain = (index) => {
    setFormData(prev => {
      const newPhotos = [...prev.photos];
      const selected = newPhotos.splice(index, 1)[0];
      return {
        ...prev,
        photos: [selected, ...newPhotos]
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('상품명은 필수 입력 항목입니다.');
      return;
    }
    onSave(formData);
  };

  return (
    <WindowModal title={isEditing ? "품목 정보 수정" : "신규 품목 등록"} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Main Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>

          {/* Card 1: 상품 이미지 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={16} color="#3b82f6" strokeWidth={2.2} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                  상품 사진 ({formData.photos.length}/5)
                </h4>
              </div>
              {formData.photos.length < 5 && (
                <button 
                  type="button" 
                  onClick={handlePhotoClick}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    color: '#3b82f6',
                    background: '#eff6ff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={13} /> 추가
                </button>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handlePhotoChange}
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
              gap: '8px'
            }}>
              {formData.photos.map((photo, index) => (
                <div 
                  key={index} 
                  style={{ 
                    position: 'relative', 
                    aspectRatio: '1', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    border: index === 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    background: '#f1f5f9'
                  }}
                >
                  <img src={photo} alt={`Product ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {index === 0 ? (
                    <div style={{ 
                      position: 'absolute', top: '4px', left: '4px', 
                      background: '#3b82f6', color: 'white', fontSize: '0.62rem', 
                      fontWeight: 800, padding: '1px 5px', borderRadius: '3px'
                    }}>대표</div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setAsMain(index)}
                      style={{ 
                        position: 'absolute', top: '4px', left: '4px', 
                        background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #3b82f6', 
                        color: '#3b82f6', fontSize: '0.62rem', 
                        fontWeight: 800, padding: '1px 5px', borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      대표
                    </button>
                  )}

                  <button 
                    type="button" 
                    onClick={() => removePhoto(index)}
                    style={{ 
                      position: 'absolute', top: '4px', right: '4px', 
                      background: 'rgba(255, 255, 255, 0.9)', border: 'none', 
                      borderRadius: '50%', width: '20px', height: '20px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', color: '#ef4444'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              {formData.photos.length === 0 && (
                <div 
                  onClick={handlePhotoClick}
                  style={{ 
                    gridColumn: '1 / -1', 
                    height: '80px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '1.5px dashed #cbd5e1', 
                    borderRadius: '8px', 
                    color: '#94a3b8',
                    cursor: 'pointer',
                    background: '#f8fafc'
                  }}
                >
                  <Camera size={22} strokeWidth={1.5} style={{ marginBottom: '4px' }} />
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                    터치하여 상품 사진 등록 (최대 5장)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: 분류 및 바코드 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={16} color="#3b82f6" strokeWidth={2.2} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>분류 및 바코드</h4>
              </div>
              <button 
                type="button"
                onClick={onOpenCategoryModal}
                style={{
                  background: 'none', border: 'none', color: '#3b82f6', 
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '2px'
                }}
              >
                <Plus size={12} /> 카테고리 관리
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>카테고리</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <select 
                    value={(() => {
                      const large = categories.find(c => c.name === formData.categoryLarge && (Number(c.level) === 1 || !c.parentId));
                      return large ? large.id : '';
                    })()} 
                    onChange={(e) => {
                      const idVal = String(e.target.value);
                      const cat = categories.find(c => String(c.id) === idVal);
                      setFormData(prev => ({ 
                        ...prev, 
                        categoryLarge: cat ? cat.name : '',
                        categoryMedium: '',
                        categorySmall: '',
                        category: cat ? cat.name : ''
                      }));
                    }}
                    style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', background: '#fff' }}
                  >
                    <option value="">대분류</option>
                    {categories.filter(c => Number(c.level) === 1 || !c.parentId).sort((a,b) => (a.order||0) - (b.order||0)).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  <select 
                    disabled={!formData.categoryLarge}
                    value={(() => {
                      const medium = categories.find(c => c.name === formData.categoryMedium && Number(c.level) === 2);
                      return medium ? medium.id : '';
                    })()}
                    onChange={(e) => {
                      const idVal = String(e.target.value);
                      const cat = categories.find(c => String(c.id) === idVal);
                      setFormData(prev => ({ 
                        ...prev, 
                        categoryMedium: cat ? cat.name : '',
                        categorySmall: '',
                        category: cat ? cat.name : prev.categoryLarge
                      }));
                    }}
                    style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', background: !formData.categoryLarge ? '#f1f5f9' : '#fff' }}
                  >
                    <option value="">중분류</option>
                    {categories.filter(c => {
                      const large = categories.find(curr => curr.name === formData.categoryLarge && (Number(curr.level) === 1 || !curr.parentId));
                      return large && String(c.parentId) === String(large.id) && Number(c.level) === 2;
                    }).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  <select 
                    disabled={!formData.categoryMedium}
                    value={(() => {
                      const small = categories.find(c => c.name === formData.categorySmall && Number(c.level) === 3);
                      return small ? small.id : '';
                    })()}
                    onChange={(e) => {
                      const idVal = String(e.target.value);
                      const cat = categories.find(c => String(c.id) === idVal);
                      setFormData(prev => ({ 
                        ...prev, 
                        categorySmall: cat ? cat.name : '',
                        category: cat ? cat.name : prev.categoryMedium
                      }));
                    }}
                    style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', background: !formData.categoryMedium ? '#f1f5f9' : '#fff' }}
                  >
                    <option value="">소분류</option>
                    {categories.filter(c => {
                      const medium = categories.find(curr => curr.name === formData.categoryMedium && Number(curr.level) === 2);
                      return medium && String(c.parentId) === String(medium.id) && Number(c.level) === 3;
                    }).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>낱개 바코드</label>
                  <input type="text" name="singleBarcode" value={formData.singleBarcode} onChange={handleChange} placeholder="낱개 바코드" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>박스 바코드</label>
                  <input type="text" name="boxBarcode" value={formData.boxBarcode} onChange={handleChange} placeholder="박스 바코드" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 기본 정보 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px'
            }}>
              <Package size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>기본 품목 정보</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  상품명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="상품명 입력" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.88rem', fontWeight: 700, boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>상품약칭</label>
                  <input type="text" name="abbreviation" value={formData.abbreviation} onChange={handleChange} placeholder="약칭" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>규격</label>
                  <input type="text" name="spec" value={formData.spec} onChange={handleChange} placeholder="예: Box, EA, kg" style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.82rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>내품수량</label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'pointer', fontSize: '0.72rem', color: formData.isBoxOnly ? '#ef4444' : '#64748b' }}>
                      <input type="checkbox" name="isBoxOnly" checked={formData.isBoxOnly} onChange={(e) => setFormData(prev => ({ ...prev, isBoxOnly: e.target.checked }))} style={{ width: '12px', height: '12px' }} />
                      박스전용
                    </label>
                  </div>
                  <input type="text" name="innerQty" value={formData.innerQty} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>적정재고량</label>
                  <input type="text" name="optimalStock" value={formData.optimalStock ? formData.optimalStock.toLocaleString() : '0'} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box', color: '#059669' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: 단가 및 재고 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={16} color="#3b82f6" strokeWidth={2.2} />
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>단가 및 재고</h4>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.74rem', color: '#2563eb', fontWeight: 700 }}>
                <input type="checkbox" name="isAutoCalcPrice" checked={formData.isAutoCalcPrice} onChange={(e) => setFormData(prev => ({ ...prev, isAutoCalcPrice: e.target.checked }))} style={{ width: '13px', height: '13px' }} />
                단가 자동연동
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>매입단가 (원)</label>
                <input type="text" name="purchasePrice" value={formData.purchasePrice ? formData.purchasePrice.toLocaleString() : '0'} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>기초 재고</label>
                <input type="text" name="initialStock" value={formData.initialStock ? formData.initialStock.toLocaleString() : '0'} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: formData.isBoxOnly ? '#94a3b8' : '#475569', marginBottom: '4px' }}>매출가 (낱개)</label>
                <input type="text" name="salesPriceSingle" value={formData.isBoxOnly ? '-' : (formData.salesPriceSingle ? formData.salesPriceSingle.toLocaleString() : '0')} onChange={handleChange} disabled={formData.isBoxOnly} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box', background: formData.isBoxOnly ? '#f1f5f9' : '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>매출가 (박스)</label>
                <input type="text" name="salesPriceBox" value={formData.salesPriceBox ? formData.salesPriceBox.toLocaleString() : '0'} onChange={handleChange} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', boxSizing: 'border-box', color: '#2563eb' }} />
              </div>
            </div>
          </div>

          {/* Card 5: 품목 속성 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px'
            }}>
              <Sliders size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>속성 및 주문몰 설정</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', height: '36px' }}>
                {['과세', '면세'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, taxType: t }))}
                    style={{
                      flex: 1,
                      borderRadius: '6px',
                      border: formData.taxType === t ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      background: formData.taxType === t ? '#eff6ff' : '#fff',
                      color: formData.taxType === t ? '#1d4ed8' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: formData.showInMall ? '#2563eb' : '#64748b', background: formData.showInMall ? '#eff6ff' : '#f8fafc', padding: '8px 4px', borderRadius: '6px', border: formData.showInMall ? '1px solid #3b82f6' : '1px solid #e2e8f0' }}>
                  <input type="checkbox" name="showInMall" checked={formData.showInMall} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                  주문몰노출
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: formData.isNewProduct ? '#059669' : '#64748b', background: formData.isNewProduct ? '#f0fdf4' : '#f8fafc', padding: '8px 4px', borderRadius: '6px', border: formData.isNewProduct ? '1px solid #10b981' : '1px solid #e2e8f0' }}>
                  <input type="checkbox" name="isNewProduct" checked={formData.isNewProduct || false} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                  신상품
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, color: formData.isBestProduct ? '#dc2626' : '#64748b', background: formData.isBestProduct ? '#fef2f2' : '#f8fafc', padding: '8px 4px', borderRadius: '6px', border: formData.isBestProduct ? '1px solid #ef4444' : '1px solid #e2e8f0' }}>
                  <input type="checkbox" name="isBestProduct" checked={formData.isBestProduct || false} onChange={handleChange} style={{ width: '13px', height: '13px' }} />
                  베스트
                </label>
              </div>
            </div>
          </div>

          {/* Card 6: 상품 설명 */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '8px'
            }}>
              <FileText size={16} color="#3b82f6" strokeWidth={2.2} />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>상품 메모</h4>
            </div>
            <textarea 
              name="memo" 
              rows="3" 
              placeholder="상품 설명 또는 특이사항" 
              value={formData.memo}
              onChange={handleChange}
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                padding: '8px',
                fontSize: '0.82rem',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            취소
          </button>
          <button 
            type="submit" 
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
            }}
          >
            <Save size={15} /> {isEditing ? "수정하기" : "저장하기"}
          </button>
        </div>
      </form>
    </WindowModal>
  );
};

export default ProductRegistration;
