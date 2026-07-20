import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import WindowModal from './WindowModal';

const TaxInvoiceDocument = ({ invoice, supplier, recipient, isTaxFree = false, zIndex = 5000, onClose }) => {
  // isTaxFree: true for '계산서' (Blue), false for '세금계산서' (Red)
  const themeColor = isTaxFree ? '#3b82f6' : '#ef4444';
  const typeName = isTaxFree ? '계 산 서' : '세 금 계 산 서';
  const subTypeName = isTaxFree ? '(면세)' : '(과세)';

  const items = invoice.items || [];
  const totalSupplyValue = items.reduce((sum, item) => sum + (item.supplyValue || 0), 0);
  const totalTax = isTaxFree ? 0 : items.reduce((sum, item) => sum + (item.tax || 0), 0);
  const totalAmount = totalSupplyValue + totalTax;

  // Format date parts
  const dateObj = new Date(invoice.date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <WindowModal title={`${typeName} 인쇄 미리보기`} onClose={onClose} width="900px" zIndex={zIndex}>
      <div style={{ padding: '20px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        {/* Controls */}
        <div className="no-print" style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: themeColor, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={18} /> 인쇄하기
          </button>
        </div>

        {/* The Document */}
        <div id="tax-invoice-container" style={{ 
          width: '210mm', 
          minHeight: '148mm', 
          backgroundColor: 'white', 
          padding: '15mm', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          fontFamily: '"Malgun Gothic", dotum, sans-serif',
          fontSize: '12px',
          color: '#333',
          border: `2px solid ${themeColor}`
        }}>
          {/* Header */}
          <div style={{ display: 'flex', borderBottom: `2px solid ${themeColor}`, paddingBottom: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '28px', color: themeColor, letterSpacing: '10px', textAlign: 'center' }}>{typeName}</h1>
              <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '5px' }}>{subTypeName} (공급자 보관용)</div>
            </div>
          </div>

          {/* Table Structure */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${themeColor}` }}>
            <tbody>
              <tr>
                {/* Supplier Section */}
                <td rowSpan="4" style={{ width: '20px', backgroundColor: themeColor, color: 'white', fontWeight: 700, textAlign: 'center', padding: '5px' }}>공<br/>급<br/>자</td>
                <td style={{ width: '80px', border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>등록번호</td>
                <td colSpan="3" style={{ border: `1px solid ${themeColor}`, padding: '5px', fontSize: '16px', fontWeight: 700 }}>{supplier.bizNum || '123-45-67890'}</td>
                
                {/* Recipient Section */}
                <td rowSpan="4" style={{ width: '20px', backgroundColor: themeColor, color: 'white', fontWeight: 700, textAlign: 'center', padding: '5px' }}>공<br/>급<br/>받<br/>는<br/>자</td>
                <td style={{ width: '80px', border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>등록번호</td>
                <td colSpan="3" style={{ border: `1px solid ${themeColor}`, padding: '5px', fontSize: '16px', fontWeight: 700 }}>{recipient.bizNum || '000-00-00000'}</td>
              </tr>
              <tr>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>상호(성명)</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{supplier.name || 'Link X ERP'}</td>
                <td style={{ width: '40px', border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>성명</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{supplier.owner || '홍길동'}</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>상호(성명)</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{recipient.name || invoice.partner}</td>
                <td style={{ width: '40px', border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>성명</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{recipient.owner || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>사업장주소</td>
                <td colSpan="3" style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{supplier.address || '서울특별시 강남구 테헤란로 123'}</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>사업장주소</td>
                <td colSpan="3" style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{recipient.address || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>업태 / 종목</td>
                <td colSpan="3" style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{supplier.type || '서비스'} / {supplier.item || '소프트웨어'}</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', textAlign: 'center' }}>업태 / 종목</td>
                <td colSpan="3" style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>{recipient.type || '-'} / {recipient.item || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary Row */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${themeColor}`, borderTop: 'none' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '80px' }}>작성일자</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>공급가액</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>세액</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>비고</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: `1px solid ${themeColor}`, padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                  {year}. {month}. {day}
                </td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                  {totalSupplyValue.toLocaleString()}
                </td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                  {totalTax.toLocaleString()}
                </td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '8px' }}>-</td>
              </tr>
            </tbody>
          </table>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${themeColor}`, borderTop: 'none', marginTop: '0px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '30px' }}>월</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '30px' }}>일</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px' }}>품목</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '60px' }}>규격</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '40px' }}>수량</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '80px' }}>단가</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '100px' }}>공급가액</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '80px' }}>세액</th>
                <th style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '60px' }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {/* Fill with items and pad to 10 rows */}
              {[...items, ...Array(Math.max(0, 10 - items.length)).fill({})].map((item, idx) => (
                <tr key={idx} style={{ height: '25px' }}>
                  <td style={{ border: `1px solid ${themeColor}`, textAlign: 'center' }}>{item.id ? month : ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, textAlign: 'center' }}>{item.id ? day : ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, padding: '0 5px' }}>{item.name || ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, padding: '0 5px' }}>{item.spec || ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, textAlign: 'right', padding: '0 5px' }}>{item.qty || ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, textAlign: 'right', padding: '0 5px' }}>{item.price ? item.price.toLocaleString() : ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, textAlign: 'right', padding: '0 5px' }}>{item.supplyValue ? item.supplyValue.toLocaleString() : ''}</td>
                  <td style={{ border: `1px solid ${themeColor}`, textAlign: 'right', padding: '0 5px' }}>{item.tax ? item.tax.toLocaleString() : ''}</td>
                  <td style={{ border: `1px solid ${themeColor}` }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${themeColor}`, borderTop: 'none' }}>
            <tbody>
              <tr>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '100px', textAlign: 'center' }}>합계금액</td>
                <td colSpan="5" style={{ border: `1px solid ${themeColor}`, padding: '5px', fontWeight: 700, fontSize: '16px', textAlign: 'center' }}>
                  ￦ {totalAmount.toLocaleString()}
                </td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '100px', textAlign: 'center' }}>이 금액을</td>
                <td style={{ border: `1px solid ${themeColor}`, padding: '5px', width: '100px', textAlign: 'center', fontWeight: 700 }}>영 수 함</td>
              </tr>
            </tbody>
          </table>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #tax-invoice-container, #tax-invoice-container * { visibility: visible; }
            #tax-invoice-container { 
              position: absolute; 
              left: 0; 
              top: 0; 
              box-shadow: none;
              padding: 0;
              margin: 0;
            }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    </WindowModal>
  );
};

export default TaxInvoiceDocument;
