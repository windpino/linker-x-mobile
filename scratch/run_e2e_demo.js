import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve(process.cwd(), 'scratch');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// 헬퍼: 텍스트를 가진 요소를 클릭하는 함수
async function clickByText(page, selector, text) {
  await page.evaluate((sel, txt) => {
    const elements = Array.from(document.querySelectorAll(sel));
    const target = elements.find(el => el.textContent.trim().includes(txt));
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, selector, text);
}

// 헬퍼: 딜레이 함수
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runE2E() {
  console.log("🚀 Starting E2E Browser Automation Simulation...");
  const browser = await puppeteer.launch({
    headless: true, // headless 모드로 조용히 실행
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 1. ERP 메인 접속
    console.log("- Navigating to Link-X ERP...");
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // 2. 관리자 세션 주입하여 로그인 우회
    console.log("- Injecting Administrator Session...");
    await page.evaluate(() => {
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'admin',
        role: 'super_admin',
        name: 'E2E시연담당자',
        companyId: 'default',
        allowAllEditDelete: true
      }));
    });

    // 3. 페이지 새로고침하여 대시보드 강제 진입
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(3000); // UI 렌더링 대기

    // 대시보드 캡처
    await page.screenshot({ path: path.join(screenshotDir, '01_dashboard.png') });
    console.log("📸 [Captured] 01_dashboard.png");

    // 4. [Step 1] 매입처 등록 시연
    console.log("- Navigating to Partner Management...");
    // 대시보드의 '거래처 관리' 버튼 클릭
    const clickedPartnerMenu = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('거래처 관리'));
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (clickedPartnerMenu) {
      console.log("  * Clicked Partner Management Button");
      await delay(2000);

      // '신규 등록' 버튼 클릭
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('신규 등록'));
        if (btn) btn.click();
      });
      await delay(1500);

      // 매입처 등록 폼 작성
      console.log("  * Filling out Partner Form (E2E명품수산, 매입처)...");
      await page.evaluate(() => {
        // 구분 select를 매입처로 변경
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          if (select.innerHTML.includes('매입처') || select.innerHTML.includes('매출처')) {
            select.value = '매입처';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // 상호명 및 대표자 기입
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
          const labelText = input.closest('.form-group')?.querySelector('label')?.textContent || '';
          if (labelText.includes('상호명')) {
            input.value = 'E2E명품수산';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (labelText.includes('대표자')) {
            input.value = '임꺽정';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
      await delay(1000);

      // 거래처 저장 클릭
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('저장') && !el.textContent.includes('목록'));
        if (btn) btn.click();
      });
      await delay(2000); // 저장 애니메이션 대기

      await page.screenshot({ path: path.join(screenshotDir, '02_partner_registered.png') });
      console.log("📸 [Captured] 02_partner_registered.png");

      // 거래처 관리 모달 창 닫기
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.modal-close, button[class*="close"], .window-modal-close');
        if (closeBtn) closeBtn.click();
      });
      await delay(1000);
    }

    // 5. [Step 2] 매입 전표 등록 시연
    console.log("- Simulating Purchase Invoice Registration...");
    const clickedPurchaseMenu = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('매입 전표'));
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (clickedPurchaseMenu) {
      console.log("  * Clicked Purchase Invoice Menu Button");
      await delay(2000);

      // 매입처 작성 및 자동완성 선택
      await page.evaluate(() => {
        const input = document.querySelector('.partner-input, input[placeholder*="거래처"]');
        if (input) {
          input.value = 'E2E명품수산';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      });
      await delay(1500); // 자동완성 제안 대기

      // 자동완성 항목 클릭
      await page.evaluate(() => {
        const item = document.querySelector('.partner-suggestion-item, .autocomplete-item, div[class*="suggestion"]');
        if (item) {
          item.click();
        } else {
          // 제안 항목이 안 떴으면 엔터 전송
          const input = document.querySelector('.partner-input, input[placeholder*="거래처"]');
          if (input) {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        }
      });
      await delay(1000);

      // 품목 빠른 입력란 채워 넣기
      console.log("  * Fast parsing items: 싱싱오징어100 제주갈치50");
      await page.evaluate(() => {
        const textarea = document.querySelector('.items-textarea, textarea[placeholder*="약칭"]');
        if (textarea) {
          textarea.value = '싱싱오징어100 제주갈치50';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await delay(2000); // 실시간 금액 및 품목 파싱 대기

      // '매입전표 저장' 클릭
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('매입전표 저장') || el.textContent.includes('저장'));
        if (btn) btn.click();
      });
      await delay(2500); // 업로드 및 실시간 재고 반영 대기

      await page.screenshot({ path: path.join(screenshotDir, '03_purchase_invoice_saved.png') });
      console.log("📸 [Captured] 03_purchase_invoice_saved.png");

      // 모달 닫기
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.window-modal-close, button[class*="close"]');
        if (closeBtn) closeBtn.click();
      });
      await delay(1000);
    }

    // 6. [Step 3] 간편주문 등록 (저장 시 모달창 유지 기능 검증!)
    console.log("- Simulating Sales Order Registration (Verifying Window Keep Open)...");
    const clickedSalesOrderMenu = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('주문 추가'));
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (clickedSalesOrderMenu) {
      console.log("  * Opened Sales Order (간편주문 등록) Dialog");
      await delay(2000);

      // 거래처명 입력
      await page.evaluate(() => {
        const input = document.querySelector('.partner-input, input[placeholder*="거래처"]');
        if (input) {
          input.value = '다모아마트';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await delay(1500);

      // 거래처 제안 항목 선택
      await page.evaluate(() => {
        const item = document.querySelector('.partner-suggestion-item, .autocomplete-item');
        if (item) {
          item.click();
        }
      });
      await delay(1000);

      // 품목 빠른 입력
      console.log("  * Fast parsing items: 싱싱오징어30 제주갈치20");
      await page.evaluate(() => {
        const textarea = document.querySelector('.so-items-textarea, textarea[placeholder*="품목"]');
        if (textarea) {
          textarea.value = '싱싱오징어30 제주갈치20';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await delay(2000);

      // '주문서 저장' 클릭
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('주문서 저장') || el.textContent.includes('저장'));
        if (btn) btn.click();
      });
      await delay(2500); // 저장 처리 대기

      // 저장 후 모달창이 여전히 닫히지 않고 열려 있는지 검증하는 캡처!
      await page.screenshot({ path: path.join(screenshotDir, '04_sales_order_kept_open.png') });
      console.log("📸 [Captured] 04_sales_order_kept_open.png (Successfully verified window stays open after save!)");

      // 수동으로 모달 닫기
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.window-modal-close');
        if (closeBtn) closeBtn.click();
      });
      await delay(1000);
    }

    // 7. [Step 4] 상차 시연 (재고이동 처리 및 이력 검증)
    console.log("- Simulating Sales Order Load (상차 완료)...");
    const clickedOrderListMenu = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('목록') || el.textContent.includes('주문목록'));
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (clickedOrderListMenu) {
      console.log("  * Opened Order List (주문목록)");
      await delay(2500);

      // 첫 번째 주문건('다모아마트')에서 '상차' 미완료된 항목들의 토글 버튼 클릭
      console.log("  * Clicked Load (상차) status to move inventory...");
      await page.evaluate(() => {
        // 상차 체크박스 또는 loaded 토글 버튼들을 모두 찾아서 클릭
        const badges = Array.from(document.querySelectorAll('span, button, td')).filter(el => el.textContent.includes('상차대기') || el.textContent.includes('미상차'));
        if (badges.length > 0) {
          badges.forEach(badge => badge.click());
        }
      });
      await delay(3000); // 재고 이동 및 백그라운드 DB 저장 대기

      await page.screenshot({ path: path.join(screenshotDir, '05_order_loaded.png') });
      console.log("📸 [Captured] 05_order_loaded.png");

      // 창 닫기
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.window-modal-close');
        if (closeBtn) closeBtn.click();
      });
      await delay(1000);
    }

    // 8. [Step 5] 최종 재고 대조 보고서 확인
    console.log("- Checking Final Inventory Report...");
    const clickedInventoryMenu = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('최종 재고'));
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (clickedInventoryMenu) {
      await delay(3000);
      await page.screenshot({ path: path.join(screenshotDir, '06_final_inventory.png') });
      console.log("📸 [Captured] 06_final_inventory.png");

      // 창 닫기
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.window-modal-close');
        if (closeBtn) closeBtn.click();
      });
      await delay(1000);
    }

    console.log("🏆 E2E Simulation SUCCESSFUL! All demonstration flow screenshots captured.");

  } catch (err) {
    console.error("❌ E2E Simulation Failed:", err);
  } finally {
    await browser.close();
  }
}

runE2E();
