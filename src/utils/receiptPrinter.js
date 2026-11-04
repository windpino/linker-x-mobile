/**
 * Linker X - Mobile Receipt & Statement Printer Utility
 * 모바일 브라우저 및 모바일 프린터(블루투스/와이파이/시스템 스풀러)에서
 * 여백 없이 100% 실제 출력되도록 격리된 인쇄 파이프라인 제공
 */

export const generateReceiptHtml = ({
  invoiceData,
  partnerObj,
  companyInfo,
  totalAmount,
  previousBalance,
  finalBalance,
  showReceiptSignature = true
}) => {
  const items = invoiceData.items || [];
  const totalQty = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

  const partnerName = partnerObj?.name || invoiceData.partner || '-';
  const partnerCeo = partnerObj?.ceo || partnerObj?.representative || partnerObj?.owner || '-';
  const partnerPhone = partnerObj?.phone || partnerObj?.mobile || partnerObj?.tel || '-';
  const partnerBizNo = partnerObj?.businessNo || partnerObj?.businessNumber || partnerObj?.bizNo || '-';
  const partnerTypeItem = [partnerObj?.businessType || partnerObj?.uptae, partnerObj?.businessItem || partnerObj?.jongmok].filter(Boolean).join(' / ') || '-';

  const compName = companyInfo?.companyName || companyInfo?.name || '본사';
  const compCeo = companyInfo?.representative || companyInfo?.ceo || '-';
  const compPhone = companyInfo?.phone || companyInfo?.tel || '-';
  const compBizNo = companyInfo?.bizNumber || companyInfo?.businessNo || '-';
  const compTypeItem = [companyInfo?.businessType, companyInfo?.businessCategory || companyInfo?.businessItem].filter(Boolean).join(' / ') || '-';

  const payments = invoiceData.payments || {};
  const cash = Number(payments.cash || 0);
  const account = Number(payments.account || 0);
  const card = Number(payments.card || 0);
  const bill = Number(payments.bill || 0);
  const receivedAmount = Number(invoiceData.receivedAmount || 0);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>거래명세표(전표) - ${partnerName}</title>
  <style>
    @page {
      size: auto;
      margin: 4mm 5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .receipt-container {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      padding: 6px 8px;
    }
    .receipt-title {
      text-align: center;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 3px;
      margin: 0 0 8px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #0f172a;
    }
    .receipt-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 5px 6px;
    }
    .info-table th {
      background-color: #f1f5f9 !important;
      font-weight: 700;
      text-align: center;
      font-size: 11px;
    }
    .info-table td {
      font-size: 11px;
    }
    .vertical-header {
      width: 18px;
      text-align: center;
      padding: 4px 2px;
      font-weight: 800;
      background-color: #e2e8f0 !important;
      line-height: 1.2;
    }
    .items-table th {
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a;
      border-bottom: 1px solid #94a3b8;
      font-weight: 800;
      font-size: 11.5px;
    }
    .items-table td {
      font-size: 11.5px;
    }
    .items-table tfoot td {
      background-color: #f8fafc !important;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }
    .summary-card {
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: #ffffff;
    }
    .summary-title {
      font-size: 11px;
      font-weight: 800;
      color: #334155;
      margin-bottom: 5px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      text-align: center;
      margin-bottom: 8px;
    }
    .payment-cell {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 2px;
      background-color: #f8fafc;
    }
    .payment-cell .lbl {
      display: block;
      font-size: 10px;
      color: #64748b;
    }
    .payment-cell .val {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .balance-grid {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      text-align: center;
    }
    .balance-box {
      padding: 5px 2px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .balance-box.prev {
      background-color: #f8fafc;
    }
    .balance-box.recv {
      background-color: #f0fdf4;
      border-color: #86efac;
    }
    .balance-box.cur {
      background-color: #fef2f2;
      border-color: #fca5a5;
    }
    .balance-box .b-lbl {
      display: block;
      font-size: 10.5px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .balance-box.prev .b-lbl { color: #475569; }
    .balance-box.recv .b-lbl { color: #166534; }
    .balance-box.cur .b-lbl { color: #991b1b; }
    .balance-box .b-val {
      font-size: 13px;
      font-weight: 900;
    }
    .balance-box.prev .b-val { color: #0f172a; }
    .balance-box.recv .b-val { color: #15803d; }
    .balance-box.cur .b-val { color: #dc2626; }
    .signature-card {
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .sign-space {
      display: inline-block;
      width: 100px;
      border-bottom: 1px solid #334155;
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
    }
    .receipt-footer {
      text-align: center;
      font-size: 10.5px;
      color: #64748b;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-title">거래명세표(전표)</div>
    <div class="receipt-meta">
      <div>일 자: <span>${invoiceData.date || ''}</span></div>
      <div>전표번호: <span>${invoiceData.id || ''}</span></div>
    </div>

    <table class="info-table">
      <tbody>
        <tr>
          <th class="vertical-header" rowspan="4">공<br/>급<br/>받<br/>는<br/>자</th>
          <th style="width: 15%;">상호(거래처명)</th>
          <td style="width: 32%; font-weight: 800;">${partnerName} <span style="font-size:10px; font-weight:normal; color:#64748b;">귀하</span></td>
          <th class="vertical-header" rowspan="4">공<br/>급<br/>자</th>
          <th style="width: 15%;">상호(회사명)</th>
          <td style="width: 32%; font-weight: 800;">${compName}</td>
        </tr>
        <tr>
          <th>대표자</th>
          <td>${partnerCeo}</td>
          <th>대표자</th>
          <td>${compCeo}</td>
        </tr>
        <tr>
          <th>전화번호</th>
          <td>${partnerPhone}</td>
          <th>전화번호</th>
          <td>${compPhone}</td>
        </tr>
        <tr>
          <th>사업자번호</th>
          <td>${partnerBizNo}</td>
          <th>사업자번호</th>
          <td>${compBizNo}</td>
        </tr>
        <tr>
          <th colspan="2">업태 / 종목</th>
          <td>${partnerTypeItem}</td>
          <th colspan="2">업태 / 종목</th>
          <td>${compTypeItem}</td>
        </tr>
      </tbody>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left; width: 44%;">품목</th>
          <th style="text-align: center; width: 14%;">수량</th>
          <th style="text-align: right; width: 21%;">단가</th>
          <th style="text-align: right; width: 21%;">금액</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td style="font-weight: 700;">
              ${item.name}
              ${item.spec ? `<span style="font-size:10px; color:#64748b;">(${item.spec})</span>` : ''}
            </td>
            <td style="text-align: center;">${item.isBox ? `1박스(${item.qty})` : item.qty}</td>
            <td style="text-align: right;">${(Number(item.price) || 0).toLocaleString()}</td>
            <td style="text-align: right; font-weight: 700;">${(Number(item.total) || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td style="text-align: left;">합 계</td>
          <td style="text-align: center;">${totalQty.toLocaleString()}</td>
          <td style="text-align: right; font-size: 11px; color: #64748b;">공급가총액</td>
          <td style="text-align: right; font-size: 13px; color: #0f172a;">${Number(totalAmount || 0).toLocaleString()}원</td>
        </tr>
      </tfoot>
    </table>

    <div class="summary-card">
      <div class="summary-title">■ 입금 내역 (입금종류별)</div>
      <div class="payment-grid">
        <div class="payment-cell">
          <span class="lbl">현금</span>
          <span class="val">${cash.toLocaleString()}원</span>
        </div>
        <div class="payment-cell">
          <span class="lbl">계좌</span>
          <span class="val">${account.toLocaleString()}원</span>
        </div>
        <div class="payment-cell">
          <span class="lbl">카드</span>
          <span class="val">${card.toLocaleString()}원</span>
        </div>
        <div class="payment-cell">
          <span class="lbl">어음</span>
          <span class="val">${bill.toLocaleString()}원</span>
        </div>
      </div>

      <div class="balance-grid">
        <div class="balance-box prev">
          <span class="b-lbl">전미수</span>
          <span class="b-val">${Number(previousBalance || 0).toLocaleString()}원</span>
        </div>
        <div class="balance-box recv">
          <span class="b-lbl">입금합계</span>
          <span class="b-val">${receivedAmount.toLocaleString()}원</span>
        </div>
        <div class="balance-box cur">
          <span class="b-lbl">현미수</span>
          <span class="b-val">${Number(finalBalance || 0).toLocaleString()}원</span>
        </div>
      </div>
    </div>

    ${showReceiptSignature ? `
      <div class="signature-card">
        <span style="font-size: 11.5px; color: #475569;">상기 물품을 정히 영수(인수)함.</span>
        <div style="font-weight: 800; font-size: 12px; display: flex; align-items: center; gap: 6px;">
          <span>인수자 :</span>
          <span class="sign-space">( 서 명 )</span>
        </div>
      </div>
    ` : ''}

    <div class="receipt-footer">
      감사합니다. 귀사의 일익 번창하심을 기원합니다.
    </div>
  </div>
</body>
</html>`;
};

export const printMobileReceipt = (options) => {
  const html = generateReceiptHtml(options);

  // 1. Remove existing print iframe or container if any
  const existingFrame = document.getElementById('receipt-print-frame');
  if (existingFrame) existingFrame.remove();

  // 2. Create iframe with layout dimensions (not 0x0)
  const iframe = document.createElement('iframe');
  iframe.id = 'receipt-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // 3. Trigger printing cleanly after rendering
  setTimeout(() => {
    try {
      iframe.style.visibility = 'visible';
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        iframe.style.visibility = 'hidden';
      }, 1000);
    } catch (err) {
      console.warn('[ReceiptPrint] iframe print fallback to window.print():', err);
      window.print();
    }
  }, 250);
};
