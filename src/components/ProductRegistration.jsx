import React, { useState, useRef } from 'react';
import { Box, Upload, Barcode, FileText, DollarSign, Package, Tag, Save, X, Camera, Edit2, Trash2, Settings, Plus } from 'lucide-react';
import WindowModal from './WindowModal';

const ProductRegistration = ({ onClose, onSave, categories, initialData, onOpenCategoryModal }) => {
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
    spec: initialData?.spec || '',
    innerQty: initialData?.innerQty || 1,
    taxType: initialData?.taxType || '과세',
    salesPriceSingle: initialData?.salesPriceSingle || initialData?.salesPrice || 0,
    salesPriceBox: initialData?.salesPriceBox || 0,
    purchasePrice: initialData?.purchasePrice || 0,
    optimalStock: initialData?.optimalStock || 0,
    initialStock: initialData?.initialStock || 0,
    isBoxOnly: initialData?.isBoxOnly || false,
    showInMall: initialData?.showInMall !== undefined ? initialData.showInMall : true,
    memo: initialData?.memo || '',
    isAutoCalcPrice: true
  });

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const isNumericField = ['salesPriceSingle', 'salesPriceBox', 'purchasePrice', 'optimalStock', 'innerQty', 'initialStock'].includes(name);
      const parsedValue = isNumericField ? Number(value.replace(/[^0-9]/g, '')) : value;
      
      const newData = { ...prev, [name]: parsedValue };

      // Auto-calculation logic for prices and quantities
      const innerQty = name === 'innerQty' ? parsedValue : prev.innerQty;
      const validInnerQty = innerQty > 0 ? innerQty : 1;
      
      const isAutoCalc = name === 'isAutoCalcPrice' ? e.target.checked : prev.isAutoCalcPrice;

      if (isAutoCalc) {
        if (name === 'salesPriceSingle') {
          newData.salesPriceBox = parsedValue * validInnerQty;
        } else if (name === 'salesPriceBox') {
          newData.salesPriceSingle = Math.floor(parsedValue / validInnerQty);
        } else if (name === 'innerQty') {
          // If innerQty changes, update the box price based on the current single price
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
    fileInputRef.current.click();
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
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ 
            ...prev, 
            photos: [...prev.photos, compressedDataUrl] 
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    // Clear the input value so the same file can be selected again if needed
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
    <WindowModal title={initialData ? "품목 수정" : "신규 품목 등록"} onClose={onClose} width="1000px">
      <form onSubmit={handleSubmit}>
        <div className="registration-container">
          {/* Multi Photo Upload Area */}
          <div className="photo-upload-area" style={{ height: 'auto', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>상품 사진 ({formData.photos.length}/5)</span>
              {formData.photos.length < 5 && (
                <button type="button" onClick={handlePhotoClick} className="btn-upload-manual" style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'white', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer' }}>
                  + 사진 추가
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

            <div className="photos-gallery" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: '15px',
              flex: 1
            }}>
              {formData.photos.map((photo, index) => (
                <div key={index} className="photo-thumbnail-container" style={{ 
                  position: 'relative', 
                  aspectRatio: '1', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: index === 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: '#f8fafc'
                }}>
                  <img src={photo} alt={`Product ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {index === 0 ? (
                    <div style={{ 
                      position: 'absolute', top: '8px', left: '8px', 
                      background: '#3b82f6', color: 'white', fontSize: '0.65rem', 
                      fontWeight: 800, padding: '2px 6px', borderRadius: '4px' 
                    }}>대표</div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setAsMain(index)}
                      style={{ 
                        position: 'absolute', top: '8px', left: '8px', 
                        background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #3b82f6', 
                        color: '#3b82f6', fontSize: '0.65rem', 
                        fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      대표 설정
                    </button>
                  )}

                  <button 
                    type="button" 
                    onClick={() => removePhoto(index)}
                    style={{ 
                      position: 'absolute', top: '8px', right: '8px', 
                      background: 'rgba(255, 255, 255, 0.9)', border: 'none', 
                      borderRadius: '50%', width: '24px', height: '24px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      color: '#ef4444'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {formData.photos.length === 0 && (
                <div 
                  onClick={handlePhotoClick}
                  style={{ 
                    gridColumn: '1 / -1', 
                    height: '200px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '2px dashed #e2e8f0', 
                    borderRadius: '16px', 
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={40} strokeWidth={1.5} style={{ marginBottom: '10px' }} />
                  <p style={{ fontWeight: 600 }}>사진을 등록해주세요 (최대 5장)</p>
                </div>
              )}
            </div>
          </div>

          <div className="form-grid">
            {/* Row 1: Category, Single Barcode, Box Barcode */}
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>카테고리 (대분류 {' > '} 중분류 {' > '} 소분류)</label>
                <button 
                  type="button"
                  onClick={onOpenCategoryModal}
                  style={{
                    background: 'none', border: 'none', color: '#3b82f6', 
                    fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Plus size={14} /> 카테고리 관리
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="input-with-icon no-icon" style={{ flex: 1 }}>
                  <select 
                    value={(() => {
                      const large = categories.find(c => c.name === formData.categoryLarge && (c.level === 1 || !c.parentId));
                      return large ? large.id : '';
                    })()} 
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const cat = categories.find(c => c.id === id);
                      setFormData(prev => ({ 
                        ...prev, 
                        categoryLarge: cat ? cat.name : '',
                        categoryMedium: '',
                        categorySmall: '',
                        category: cat ? cat.name : ''
                      }));
                    }}
                  >
                    <option value="">대분류 선택</option>
                    {categories.filter(c => String(c.level) === '1' || !c.parentId).sort((a,b) => (a.order||0) - (b.order||0)).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-with-icon no-icon" style={{ flex: 1 }}>
                  <select 
                    disabled={!formData.categoryLarge}
                    value={(() => {
                      const medium = categories.find(c => c.name === formData.categoryMedium && c.level === 2);
                      return medium ? medium.id : '';
                    })()}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const cat = categories.find(c => c.id === id);
                      setFormData(prev => ({ 
                        ...prev, 
                        categoryMedium: cat ? cat.name : '',
                        categorySmall: '',
                        category: cat ? cat.name : prev.categoryLarge
                      }));
                    }}
                  >
                    <option value="">중분류 선택</option>
                    {categories.filter(c => {
                      const large = categories.find(curr => curr.name === formData.categoryLarge && (curr.level === 1 || !curr.parentId));
                      return large && c.parentId === large.id && c.level === 2;
                    }).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-with-icon no-icon" style={{ flex: 1 }}>
                  <select 
                    disabled={!formData.categoryMedium}
                    value={(() => {
                      const small = categories.find(c => c.name === formData.categorySmall && c.level === 3);
                      return small ? small.id : '';
                    })()}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const cat = categories.find(c => c.id === id);
                      setFormData(prev => ({ 
                        ...prev, 
                        categorySmall: cat ? cat.name : '',
                        category: cat ? cat.name : prev.categoryMedium
                      }));
                    }}
                  >
                    <option value="">소분류 선택</option>
                    {categories.filter(c => {
                      const medium = categories.find(curr => curr.name === formData.categoryMedium && curr.level === 2);
                      return medium && c.parentId === medium.id && c.level === 3;
                    }).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>낱개 바코드</label>
              <div className="input-with-icon">
                <Barcode size={16} className="icon" />
                <input 
                  type="text" 
                  name="singleBarcode" 
                  placeholder="낱개 바코드 번호" 
                  value={formData.singleBarcode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>박스 바코드</label>
              <div className="input-with-icon">
                <Barcode size={16} className="icon" />
                <input 
                  type="text" 
                  name="boxBarcode" 
                  placeholder="박스 바코드 번호" 
                  value={formData.boxBarcode}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Row 2: Product Name, Abbreviation, Spec */}
            <div className="form-group">
              <label>상품명 <span>*</span></label>
              <div className="input-with-icon no-icon">
                <input 
                  type="text" 
                  name="name" 
                  placeholder="상품명을 입력하세요" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>상품약칭</label>
              <div className="input-with-icon no-icon">
                <input 
                  type="text" 
                  name="abbreviation" 
                  placeholder="약칭 입력" 
                  value={formData.abbreviation}
                  onChange={handleChange}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>
                * 상품명에 숫자가 들어가는 경우엔 약칭을 꼭 사용해주세요
              </p>
            </div>

            <div className="form-group">
              <label>규격</label>
              <div className="input-with-icon no-icon">
                <input 
                  type="text" 
                  name="spec" 
                  placeholder="예: Box, EA, kg" 
                  value={formData.spec}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Row 3: Inner Qty, Tax Type, Optimal Stock */}
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                내품수량
                <label className="checkbox-label" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    name="isBoxOnly" 
                    checked={formData.isBoxOnly}
                    onChange={(e) => setFormData(prev => ({ ...prev, isBoxOnly: e.target.checked }))}
                    style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  박스 전용 판매
                </label>
              </label>
              <div className="input-with-icon no-icon">
                <input 
                  type="text" 
                  name="innerQty" 
                  value={formData.innerQty}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>과세구분</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div className="tax-type-toggle" style={{ flex: 1, height: '41px' }}>
                  <button 
                    type="button" 
                    className={`tax-btn ${formData.taxType === '과세' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, taxType: '과세' }))}
                  >과세</button>
                  <button 
                    type="button" 
                    className={`tax-btn ${formData.taxType === '면세' ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, taxType: '면세' }))}
                  >면세</button>
                </div>
                <label className="checkbox-label" style={{ 
                  flex: 1,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  color: formData.showInMall ? '#3b82f6' : '#64748b',
                  background: formData.showInMall ? '#eff6ff' : '#f8fafc',
                  padding: '10px',
                  borderRadius: '8px',
                  border: formData.showInMall ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  margin: 0,
                  transition: 'all 0.2s'
                }}>
                  <input 
                    type="checkbox" 
                    name="showInMall" 
                    checked={formData.showInMall}
                    onChange={(e) => setFormData(prev => ({ ...prev, showInMall: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  몰 노출
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>적정재고량</label>
              <div className="input-with-icon no-icon">
                <input 
                  type="text" 
                  name="optimalStock" 
                  value={formData.optimalStock.toLocaleString()}
                  onChange={handleChange}
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            {/* Row 4: Purchase Price, Sales Price */}
            <div className="form-group">
              <label>매입가</label>
              <div className="price-input-wrapper">
                <span className="price-currency">₩</span>
                <input 
                  type="text" 
                  name="purchasePrice" 
                  value={formData.purchasePrice.toLocaleString()}
                  onChange={handleChange}
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', color: formData.isBoxOnly ? '#94a3b8' : 'inherit' }}>
                매출가(낱개)
                <label className="checkbox-label" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    name="isAutoCalcPrice" 
                    checked={formData.isAutoCalcPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, isAutoCalcPrice: e.target.checked }))}
                    style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  자동 계산 추천
                </label>
              </label>
              <div className="price-input-wrapper" style={{ opacity: formData.isBoxOnly ? 0.6 : 1, backgroundColor: formData.isBoxOnly ? '#f1f5f9' : 'transparent' }}>
                <span className="price-currency">₩</span>
                <input 
                  type="text" 
                  name="salesPriceSingle" 
                  value={formData.isBoxOnly ? '-' : formData.salesPriceSingle.toLocaleString()}
                  onChange={handleChange}
                  disabled={formData.isBoxOnly}
                  style={{ cursor: formData.isBoxOnly ? 'not-allowed' : 'text', textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>매출가(박스)</label>
              <div className="price-input-wrapper">
                <span className="price-currency">₩</span>
                <input 
                  type="text" 
                  name="salesPriceBox" 
                  value={formData.salesPriceBox.toLocaleString()}
                  onChange={handleChange}
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>기초 재고 수량</label>
              <div className="input-with-icon no-icon">
                <input 
                  type="text" 
                  name="initialStock" 
                  value={formData.initialStock.toLocaleString()}
                  onChange={handleChange}
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            {/* Row 5: Product Description */}
            <div className="form-group full-width" style={{ gridColumn: 'span 3' }}>
              <label>상품 설명</label>
              <div className="input-with-icon">
                <FileText size={16} className="icon" style={{ top: '14px' }} />
                <textarea 
                  name="memo" 
                  rows="3" 
                  placeholder="상품 상세 설명 입력" 
                  value={formData.memo}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="form-footer">
          <button type="button" className="btn-outline" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>취소</button>
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
            <Save size={18} /> 저장하기
          </button>
        </div>
      </form>
    </WindowModal>
  );
};

export default ProductRegistration;
