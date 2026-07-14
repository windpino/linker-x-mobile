import React, { useState, useRef, useEffect } from 'react';
import { Package, RefreshCw, Printer, Download, Save, FileText, Info, AlertTriangle, Check, List, Search, X } from 'lucide-react';
import WindowModal from './WindowModal';
import PartnerSearchInput from './PartnerSearchInput';
import { matchesInitialSound } from '../utils/koreanUtils';
import { exportToExcel } from '../utils/excelUtils';
import './PurchaseInvoice.css';

const PurchaseOrder = ({ onClose, partners, products, onSave, onTransferToInvoice, purchaseOrders = [], currentUser, staffList = [], warehouses = [], themeColor: propThemeColor, selectedDate }) => {
  const isSim = new URLSearchParams(window.location.search).get('mode') === 'sim';
  const isMobileView = localStorage.getItem('isMobileView') === 'true' || window.innerWidth <= 768 || isSim;

  const defaultWH = warehouses.find(w => w.isMain)?.name || 
                    warehouses.find(w => w.name.includes('메인'))?.name || 
                    (warehouses.length > 0 ? warehouses[0].name : '본사');

  const themeColor = propThemeColor || '#f97316';

  const [orderData, setOrderData] = useState({
    id: Date.now(),
    date: (() => {
      const d = selectedDate || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    partner: '',
    itemsText: '',
    memo: '',
    manager: currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음'),
    warehouse: defaultWH
  });

  const [activeMobileTab, setActiveMobileTab] = useState('input');
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState(false);
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [caretPos, setCaretPos] = useState({ top: 44, left: 16 });

  const searchRef = useRef(null);
  const itemInputRef = useRef(null);
  const skipNextFocusOpen = useRef(false);

  const updateCaretPosition = (el) => {
    if (!el) return;
    
    let clone = document.getElementById('po-textarea-clone');
    if (!clone) {
      clone = document.createElement('div');
      clone.id = 'po-textarea-clone';
      document.body.appendChild(clone);
    }
    
    const style = window.getComputedStyle(el);
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.whiteSpace = 'pre-wrap';
    clone.style.wordWrap = 'break-word';
    clone.style.overflowWrap = 'break-word';
    
    const propertiesToCopy = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'width', 'boxSizing'
    ];
    
    propertiesToCopy.forEach(prop => {
      clone.style[prop] = style[prop];
    });
    
    const textBefore = el.value.substring(0, el.selectionStart);
    clone.textContent = textBefore.endsWith('\n') ? textBefore + ' ' : textBefore;
    
    const marker = document.createElement('span');
    marker.textContent = '|';
    clone.appendChild(marker);
    
    const lineHeight = parseFloat(style.lineHeight) || 28;
    const topPos = marker.offsetTop + lineHeight + 2; 
    const leftPos = marker.offsetLeft;
    
    const maxLeft = el.offsetWidth - 280; 
    
    setCaretPos({ 
      top: topPos, 
      left: Math.max(16, Math.min(leftPos, maxLeft > 0 ? maxLeft : 16))
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsItemSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lastWord = orderData.itemsText.split(/[\s\n]+/).pop();
  const filteredProducts = lastWord ? products.filter(p => 
    matchesInitialSound(p.name, lastWord) || 
    (p.abbreviation && matchesInitialSound(p.abbreviation, lastWord))
  ) : [];

  useEffect(() => {
    if (isItemSearchOpen && filteredProducts.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [isItemSearchOpen, lastWord, filteredProducts.length]);

  const handleProductSelect = (product) => {
    const textToUse = product.abbreviation || product.name;
    const words = orderData.itemsText.split(/([\s\n]+)/); 
    
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim()) {
        const currentWord = words[i];
        const qtyMatch = currentWord.match(/\d+$/); 
        const qty = qtyMatch ? qtyMatch[0] : '';
        words[i] = textToUse + qty;
        break;
      }
    }
    
    const newText = words.join('');
    setOrderData({ ...orderData, itemsText: newText });
    setIsItemSearchOpen(false);
    skipNextFocusOpen.current = true;
    
    if (itemInputRef.current) {
      const el = itemInputRef.current;
      setTimeout(() => {
        el.focus();
        const len = newText.length;
        el.setSelectionRange(len, len);
      }, 0);
    }
  };

  const parsedItems = React.useMemo(() => {
    if (!orderData.itemsText) return [];
    const tokens = orderData.itemsText.trim().split(/\s+/);
    const items = [];
    tokens.forEach((token, idx) => {
      const match = token.match(/^(.+?)(\d+)$/);
      if (match) {
        const nameOrAbbr = match[1];
        const qty = parseInt(match[2], 10);
        const product = products.find(p => p.name === nameOrAbbr || p.abbreviation === nameOrAbbr);
        if (product) {
          const price = product.purchasePrice || 0;
          const isTaxFree = product.taxType === '면세';
          const itemTotal = qty * price;
          const itemSupplyValue = isTaxFree ? itemTotal : Math.floor(itemTotal / 1.1);
          const itemTax = isTaxFree ? 0 : itemTotal - itemSupplyValue;
          items.push({
            id: Date.now() + idx,
            productId: product.id,
            name: product.name,
            spec: product.spec,
            qty: qty,
            price: price,
            taxType: product.taxType || '과세',
            supplyValue: itemSupplyValue,
            tax: itemTax,
            total: itemTotal,
            raw: token,
            category: product.category || '기타'
          });
        }
      }
    });
    return items;
  }, [orderData.itemsText, products]);

  const parsedTotalQty = parsedItems.reduce((sum, item) => sum + item.qty, 0);
  const parsedTotalPrice = parsedItems.reduce((sum, item) => sum + item.total, 0);

  const handleSave = () => {
    if (!orderData.partner) {
      alert('거래처가 입력되지 않았습니다.');
      return;
    }
    if (!orderData.itemsText.trim()) {
      alert('발주 품목을 입력해주세요.');
      return;
    }
    onSave({ 
      ...orderData, 
      id: orderData.id || Date.now(),
      items: parsedItems
    });
    
    setOrderData(prev => ({
      ...prev,
      id: Date.now(),
      itemsText: '',
      memo: ''
    }));
    
    alert('발주가 저장되었습니다.');
  };

  const handleTransferToInvoice = () => {
    if (!orderData.partner || !orderData.itemsText) {
      alert('전송할 발주 정보가 부족합니다.');
      return;
    }

    if (parsedItems.length === 0) {
      alert('품목 정보를 인식할 수 없습니다. "품목명수량" 형식으로 입력해주세요.');
      return;
    }

    onTransferToInvoice({
      ...orderData,
      items: parsedItems,
      receivedAmount: 0,
      payments: { cash: 0, account: 0, card: 0, bill: 0 },
      discount: 0
    });
  };

  const handleExcelExport = () => {
    const dataToExport = purchaseOrders.map(order => ({
      '발주일자': order.date,
      '거래처': order.partner,
      '발주내역': order.itemsText,
      '메모': order.memo
    }));
    exportToExcel(dataToExport, '발주보고서');
  };

  return (
    <WindowModal title="발주 등록" onClose={onClose} width="1200px" contentPadding="0">
      <div className="so-wrapper">
        <div className="so-header">
          <div className="so-title">
            <Package size={isMobileView ? 20 : 24} />
            발주 등록 (매입관리)
            <span className="so-date-badge" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <input 
                type="date"
                value={orderData.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  if (newDate) {
                    setOrderData(prev => ({ ...prev, date: newDate }));
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: isMobileView ? '0.78rem' : '0.85rem',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  width: isMobileView ? '105px' : '120px'
                }}
              />
            </span>
          </div>
          <div className="so-header-actions">
            <button className="so-btn-outline" onClick={() => {
              setOrderData({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                partner: '',
                itemsText: '',
                memo: '',
                manager: currentUser?.name || (staffList.length > 0 ? staffList[0].name : '알 수 없음'),
                warehouse: defaultWH
              });
            }}>
              <RefreshCw size={14} /> 새발주
            </button>
            <button className="so-btn-outline" onClick={handleExcelExport}><Download size={14} /> 엑셀</button>
          </div>
        </div>

        {isMobileView && (
          <div className="so-mobile-tabs">
            <button 
              className={`so-mobile-tab-btn ${activeMobileTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('input')}
            >
              발주 입력 (약칭/수량)
            </button>
            <button 
              className={`so-mobile-tab-btn ${activeMobileTab === 'preview' ? 'active' : ''}`}
              onClick={() => {
                setActiveMobileTab('preview');
                if (document.activeElement) document.activeElement.blur();
              }}
            >
              발주 내역 ({parsedItems.length}건)
            </button>
          </div>
        )}

        <div className="so-body">
          {(!isMobileView || activeMobileTab === 'input') && (
            <div className="so-pane-left">
              <div className="so-card">
                <h3 className="so-card-title" 
                    onClick={() => isMobileView && setIsBasicInfoCollapsed(!isBasicInfoCollapsed)}
                    style={{ cursor: isMobileView ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', width: '100%', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={16}/> 기본 정보</span>
                  {isMobileView && (
                    <span style={{ fontSize: '0.78rem', color: themeColor, fontWeight: 800 }}>
                      {isBasicInfoCollapsed ? "▼ 상세설정 펼치기" : "▲ 접기"}
                    </span>
                  )}
                </h3>
                
                {(!isMobileView || !isBasicInfoCollapsed) && (
                  <div className="so-grid-2" style={{ marginBottom: '12px', animation: 'so-fade-in 0.2s' }}>
                    <div className="form-group">
                      <label>발주 일자</label>
                      <input type="date" value={orderData.date} onChange={(e) => setOrderData({...orderData, date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>담당자</label>
                      <select value={orderData.manager} onChange={(e) => setOrderData({...orderData, manager: e.target.value})}>
                        <option value="알 수 없음">선택안함</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>입고 창고</label>
                      <select value={orderData.warehouse} onChange={(e) => setOrderData({...orderData, warehouse: e.target.value})}>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.name}>{wh.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                <div className="form-group">
                  <label>거래처명</label>
                  <PartnerSearchInput 
                    partners={partners} 
                    value={orderData.partner} 
                    onChange={(val) => setOrderData({...orderData, partner: val})} 
                    onSelect={(partner) => {
                      setOrderData(prev => ({
                        ...prev,
                        partner: partner.name
                      }));
                      setTimeout(() => {
                        if (itemInputRef.current) itemInputRef.current.focus();
                      }, 0);
                    }}
                    typeFilter="매입처"
                    autoFocus={true}
                  />
                </div>
              </div>

              <div className="so-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 className="so-card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span><Package size={16}/> 발주 품목 빠른 입력</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>예: 사과10 배5</span>
                </h3>
                <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }} ref={searchRef}>
                  <textarea
                    ref={itemInputRef}
                    placeholder="품목 약칭과 수량을 입력하세요."
                    className="so-items-textarea"
                    value={orderData.itemsText}
                    onChange={(e) => {
                      setOrderData({ ...orderData, itemsText: e.target.value });
                      setIsItemSearchOpen(true);
                      updateCaretPosition(e.target);
                    }}
                    onFocus={(e) => {
                      if (!skipNextFocusOpen.current) {
                        setIsItemSearchOpen(true);
                      }
                      skipNextFocusOpen.current = false;
                      updateCaretPosition(e.target);
                    }}
                    onKeyUp={(e) => updateCaretPosition(e.target)}
                    onClick={(e) => updateCaretPosition(e.target)}
                    onKeyDown={(e) => {
                      updateCaretPosition(e.target);
                      if (isItemSearchOpen && filteredProducts.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                        } else if (e.key === 'Enter') {
                          if (selectedIndex >= 0) {
                            e.preventDefault();
                            handleProductSelect(filteredProducts[selectedIndex]);
                          }
                        } else if (e.key === 'Escape') {
                          setIsItemSearchOpen(false);
                        }
                      }
                    }}
                  />
                  {isItemSearchOpen && lastWord && (
                    <div className="so-autocomplete-dropdown" style={{ top: `${caretPos.top}px`, left: `${caretPos.left}px`, right: 'auto', width: '280px' }}>
                      {filteredProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          onMouseDown={() => handleProductSelect(p)}
                          className={`so-autocomplete-item ${idx === selectedIndex ? 'selected' : ''}`}
                          onMouseEnter={() => setSelectedIndex(idx)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Package size={16} color={themeColor} />
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                          </div>
                          {p.abbreviation && <span className="so-abbr-badge">{p.abbreviation}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>메모</label>
                  <input 
                    type="text" 
                    placeholder="특이사항이나 요청사항을 입력하세요" 
                    value={orderData.memo} 
                    onChange={(e) => setOrderData({...orderData, memo: e.target.value})} 
                    style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {(!isMobileView || activeMobileTab === 'preview') && (
            <div className="so-pane-right">
              <div className="so-preview-header">
                <h3>실시간 발주 내역 ({parsedItems.length}건)</h3>
              </div>
              
              <div className="so-preview-table-container">
                {parsedItems.length === 0 ? (
                  <div className="so-empty-state">
                    <Package size={48} color="#cbd5e1" strokeWidth={1} />
                    <p>좌측에 약칭과 수량을 입력하시면<br/>여기에 내역이 실시간으로 표시됩니다.</p>
                  </div>
                ) : (
                  <table className="so-preview-table">
                    <thead>
                      <tr>
                        <th>품목명</th>
                        <th>규격</th>
                        <th style={{ textAlign: 'right' }}>수량</th>
                        <th style={{ textAlign: 'right' }}>단가</th>
                        <th style={{ textAlign: 'right' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.spec}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: themeColor }}>{item.qty.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{item.price.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="so-summary-section">
                <div className="so-summary-row">
                  <span>총 발주 수량</span>
                  <span className="so-summary-value">{parsedTotalQty.toLocaleString()} <small>개</small></span>
                </div>
                <div className="so-summary-row total">
                  <span>총 발주 금액</span>
                  <span className="so-summary-value highlight">{parsedTotalPrice.toLocaleString()} <small>원</small></span>
                </div>
              </div>

              <div className="so-action-buttons">
                <button className="so-btn-save" onClick={handleSave} style={{ backgroundColor: themeColor }}>
                  <Save size={18} /> 발주 저장
                </button>
                <button className="so-btn-transfer" onClick={handleTransferToInvoice}>
                  <FileText size={18} /> 매입전표로 전송
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .so-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #f8fafc;
        }

        .so-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .so-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e293b;
        }

        .so-title svg {
          color: ${themeColor};
        }

        .so-date-badge {
          display: flex;
          align-items: center;
          margin-left: 8px;
          font-size: 0.85rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 100px;
          font-weight: 500;
        }

        .so-header-actions {
          display: flex;
          gap: 8px;
        }

        .so-btn-outline {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .so-btn-outline:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
        }

        .so-body {
          display: flex;
          flex: 1;
          gap: 24px;
          padding: 24px;
          overflow: hidden;
        }

        .so-pane-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 400px;
        }

        .so-pane-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .so-card {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .so-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .so-card-title svg {
          color: ${themeColor};
        }

        .so-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .so-items-textarea {
          width: 100%;
          flex: 1;
          min-height: 150px;
          padding: 16px;
          font-size: 1.1rem;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          background-color: #f8fafc;
          line-height: 1.6;
          resize: none;
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
          box-sizing: border-box;
          color: #0f172a !important;
        }

        .so-items-textarea:focus {
          border-color: ${themeColor};
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .so-autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          z-index: 10;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 220px;
          overflow-y: auto;
        }

        .so-autocomplete-item {
          padding: 12px 16px;
          cursor: pointer;
          font-size: 0.95rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.1s;
          color: #1e293b !important;
        }
        
        .so-autocomplete-item:last-child {
          border-bottom: none;
        }

        .so-autocomplete-item.selected {
          background-color: #f0f9ff;
        }

        .so-abbr-badge {
          font-size: 0.75rem;
          color: ${themeColor};
          background-color: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 600;
        }

        .so-preview-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .so-preview-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
          font-weight: 700;
        }

        .so-preview-table-container {
          flex: 1;
          overflow-y: auto;
          background-color: #ffffff;
        }

        .so-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 300px;
          color: #94a3b8;
          text-align: center;
          gap: 16px;
        }

        .so-preview-table {
          width: 100%;
          border-collapse: collapse;
        }

        .so-preview-table th {
          position: sticky;
          top: 0;
          background-color: #f1f5f9;
          padding: 12px 16px;
          font-size: 0.85rem;
          color: #475569;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        .so-preview-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 0.95rem;
        }

        .so-summary-section {
          padding: 20px 24px;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .so-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #475569;
          font-weight: 600;
        }

        .so-summary-row.total {
          padding-top: 12px;
          border-top: 1px dashed #cbd5e1;
          font-size: 1.1rem;
          color: #1e293b;
        }

        .so-summary-value {
          font-size: 1.1rem;
          color: #1e293b;
        }

        .so-summary-value.highlight {
          font-size: 1.5rem;
          color: ${themeColor};
          font-weight: 800;
        }

        .so-action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 20px 24px;
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
        }

        .so-btn-save {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background-color: ${themeColor};
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s, filter 0.2s;
        }

        .so-btn-save:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .so-btn-transfer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background-color: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s, filter 0.2s;
        }

        .so-btn-transfer:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .so-mobile-tabs {
          display: flex;
          background-color: #ffffff;
          border-bottom: 1px solid #cbd5e1;
        }

        .so-mobile-tab-btn {
          flex: 1;
          padding: 12px 8px;
          border: none;
          background: none;
          font-size: 0.9rem;
          font-weight: 700;
          color: #64748b;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          text-align: center;
        }

        .so-mobile-tab-btn.active {
          color: ${themeColor};
          border-bottom-color: ${themeColor};
          background-color: color-mix(in srgb, ${themeColor} 5%, transparent);
        }

        @keyframes so-fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        #po-textarea-clone {
          position: absolute;
          visibility: hidden;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Responsive / Mobile overrides */
        @media (max-width: 768px) {
          .so-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          
          .so-title {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .so-header-actions {
            width: 100% !important;
            display: flex !important;
            justify-content: flex-end !important;
            gap: 8px !important;
          }

          .so-body {
            flex-direction: column;
            padding: 12px;
            overflow: hidden; /* Prevent body scroll, use pane scroll instead */
            flex: 1;
            gap: 0;
          }

          .so-pane-left {
            min-width: 100%;
            flex: 1;
            overflow-y: auto;
            padding-bottom: 8px;
          }

          .so-pane-right {
            min-width: 100%;
            flex: 1;
            overflow-y: auto;
            padding-bottom: 8px;
            box-shadow: none;
            border: none;
            border-radius: 0;
          }

          .so-pane-right .so-summary-section,
          .so-pane-right .so-action-buttons {
            display: none !important;
          }

          .so-pane-right .so-preview-header {
            padding: 12px 8px;
          }

          .so-pane-right .so-preview-table-container {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          
          .so-grid-2 {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .so-items-textarea {
            min-height: 140px;
          }
        }
      `}</style>
    </WindowModal>
  );
};

export default PurchaseOrder;
