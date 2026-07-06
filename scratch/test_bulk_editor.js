import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve(process.cwd(), 'scratch');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTest() {
  console.log("🚀 Launching Puppeteer E2E browser for Bulk Editor verification...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 1. Navigate to main ERP
    console.log("- Navigating to App...");
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // 2. Inject admin session to bypass login
    console.log("- Injecting Admin Session...");
    await page.evaluate(() => {
      localStorage.setItem('currentUser', JSON.stringify({
        userId: 'admin',
        role: 'admin',
        name: 'E2E담당자',
        companyId: 'default',
        allowAllEditDelete: true
      }));
    });

    // 3. Reload to dashboard
    await page.reload({ waitUntil: 'networkidle2' });
    await delay(2000);

    // 4. Open Partner Management
    console.log("- Opening Partner Management...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('거래처 관리'));
      if (btn) btn.click();
    });
    await delay(1500);

    // 5. Click on '일괄 편집' button to open BulkEditor
    console.log("- Opening Bulk Editor...");
    const openedBulk = await page.evaluate(() => {
      // Find the '일괄 편집' button in the partner list
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('일괄 편집'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!openedBulk) {
      throw new Error("Could not find '일괄 편집' button to open the Bulk Editor.");
    }
    await delay(1500);
    await page.screenshot({ path: path.join(screenshotDir, 'bulk_editor_opened.png') });
    console.log("📸 Captured bulk_editor_opened.png");

    // 6. Locate a cell and click it
    console.log("- Clicking on first editable cell (row 0, col 1)...");
    const cellClicked = await page.evaluate(() => {
      const cell = document.querySelector('td.editable-cell[data-row="0"][data-col="1"]');
      if (cell) {
        // Trigger mousedown to simulate user interaction
        const event = new MouseEvent('mousedown', { bubbles: true });
        cell.dispatchEvent(event);
        return true;
      }
      return false;
    });

    if (!cellClicked) {
      throw new Error("Failed to click first editable cell. Are there cells rendering?");
    }
    await delay(500);

    // Verify cell has 'selected' class
    let selectionState = await page.evaluate(() => {
      const cell = document.querySelector('td.editable-cell[data-row="0"][data-col="1"]');
      return cell ? cell.classList.contains('selected') : false;
    });
    console.log(`- Cell (0, 1) selected state: ${selectionState}`);
    if (!selectionState) throw new Error("Cell (0, 1) was not selected after click.");

    // 7. Press ArrowDown
    console.log("- Pressing ArrowDown...");
    await page.keyboard.press('ArrowDown');
    await delay(300);

    // Verify selection moved to (1, 1)
    selectionState = await page.evaluate(() => {
      const prevCell = document.querySelector('td.editable-cell[data-row="0"][data-col="1"]');
      const nextCell = document.querySelector('td.editable-cell[data-row="1"][data-col="1"]');
      return {
        prevSelected: prevCell ? prevCell.classList.contains('selected') : false,
        nextSelected: nextCell ? nextCell.classList.contains('selected') : false
      };
    });
    console.log(`- After ArrowDown: prevSelected (0,1) = ${selectionState.prevSelected}, nextSelected (1,1) = ${selectionState.nextSelected}`);
    if (selectionState.prevSelected || !selectionState.nextSelected) {
      throw new Error("ArrowDown cell movement failed.");
    }

    // 8. Press ArrowRight
    console.log("- Pressing ArrowRight...");
    await page.keyboard.press('ArrowRight');
    await delay(300);

    // Verify selection moved to (1, 2)
    selectionState = await page.evaluate(() => {
      const prevCell = document.querySelector('td.editable-cell[data-row="1"][data-col="1"]');
      const nextCell = document.querySelector('td.editable-cell[data-row="1"][data-col="2"]');
      return {
        prevSelected: prevCell ? prevCell.classList.contains('selected') : false,
        nextSelected: nextCell ? nextCell.classList.contains('selected') : false
      };
    });
    console.log(`- After ArrowRight: prevSelected (1,1) = ${selectionState.prevSelected}, nextSelected (1,2) = ${selectionState.nextSelected}`);
    if (selectionState.prevSelected || !selectionState.nextSelected) {
      throw new Error("ArrowRight cell movement failed.");
    }

    // 9. Press ArrowUp
    console.log("- Pressing ArrowUp...");
    await page.keyboard.press('ArrowUp');
    await delay(300);

    // Verify selection moved to (0, 2)
    selectionState = await page.evaluate(() => {
      const prevCell = document.querySelector('td.editable-cell[data-row="1"][data-col="2"]');
      const nextCell = document.querySelector('td.editable-cell[data-row="0"][data-col="2"]');
      return {
        prevSelected: prevCell ? prevCell.classList.contains('selected') : false,
        nextSelected: nextCell ? nextCell.classList.contains('selected') : false
      };
    });
    console.log(`- After ArrowUp: prevSelected (1,2) = ${selectionState.prevSelected}, nextSelected (0,2) = ${selectionState.nextSelected}`);
    if (selectionState.prevSelected || !selectionState.nextSelected) {
      throw new Error("ArrowUp cell movement failed.");
    }

    // 10. Press ArrowLeft
    console.log("- Pressing ArrowLeft...");
    await page.keyboard.press('ArrowLeft');
    await delay(300);

    // Verify selection moved back to (0, 1)
    selectionState = await page.evaluate(() => {
      const prevCell = document.querySelector('td.editable-cell[data-row="0"][data-col="2"]');
      const nextCell = document.querySelector('td.editable-cell[data-row="0"][data-col="1"]');
      return {
        prevSelected: prevCell ? prevCell.classList.contains('selected') : false,
        nextSelected: nextCell ? nextCell.classList.contains('selected') : false
      };
    });
    console.log(`- After ArrowLeft: prevSelected (0,2) = ${selectionState.prevSelected}, nextSelected (0,1) = ${selectionState.nextSelected}`);
    if (selectionState.prevSelected || !selectionState.nextSelected) {
      throw new Error("ArrowLeft cell movement failed.");
    }

    // 11. Press Tab
    console.log("- Pressing Tab...");
    await page.keyboard.press('Tab');
    await delay(300);

    // Verify selection moved to (0, 2)
    selectionState = await page.evaluate(() => {
      const prevCell = document.querySelector('td.editable-cell[data-row="0"][data-col="1"]');
      const nextCell = document.querySelector('td.editable-cell[data-row="0"][data-col="2"]');
      return {
        prevSelected: prevCell ? prevCell.classList.contains('selected') : false,
        nextSelected: nextCell ? nextCell.classList.contains('selected') : false
      };
    });
    console.log(`- After Tab: prevSelected (0,1) = ${selectionState.prevSelected}, nextSelected (0,2) = ${selectionState.nextSelected}`);
    if (selectionState.prevSelected || !selectionState.nextSelected) {
      throw new Error("Tab cell movement failed.");
    }

    // 12. Press Enter to edit
    console.log("- Pressing Enter to edit...");
    await page.keyboard.press('Enter');
    await delay(300);

    // Verify cell is editing
    let editState = await page.evaluate(() => {
      const cell = document.querySelector('td.editable-cell[data-row="0"][data-col="2"]');
      const input = cell ? cell.querySelector('input') : null;
      return {
        isEditingCell: cell ? cell.classList.contains('active-cell') : false,
        hasInput: !!input,
        focused: input ? (document.activeElement === input) : false
      };
    });
    console.log(`- Edit state: active-cell class = ${editState.isEditingCell}, has input = ${editState.hasInput}, input focused = ${editState.focused}`);
    if (!editState.isEditingCell || !editState.hasInput || !editState.focused) {
      throw new Error("Enter key edit trigger failed.");
    }

    // Type new value and press Enter to save
    console.log("- Typing 'E2E상호명' and pressing Enter...");
    await page.keyboard.type('E2E상호명');
    await page.keyboard.press('Enter');
    await delay(500);

    // Verify it is saved and moved to the next row (vertical direction is default)
    selectionState = await page.evaluate(() => {
      const editedCell = document.querySelector('td.editable-cell[data-row="0"][data-col="2"]');
      const nextCell = document.querySelector('td.editable-cell[data-row="1"][data-col="2"]');
      const cellText = editedCell ? editedCell.textContent.trim() : '';
      return {
        value: cellText,
        nextSelected: nextCell ? nextCell.classList.contains('selected') : false
      };
    });
    console.log(`- Saved value: '${selectionState.value}', nextSelected (1,2) = ${selectionState.nextSelected}`);
    if (selectionState.value !== 'E2E상호명' || !selectionState.nextSelected) {
      throw new Error("Save and enter key navigation failed.");
    }

    await page.screenshot({ path: path.join(screenshotDir, 'bulk_editor_success.png') });
    console.log("📸 Captured bulk_editor_success.png");

    console.log("🏆 All arrow keys and selection tests PASSED successfully!");

  } catch (err) {
    console.error("❌ Test Failed:", err);
    await page.screenshot({ path: path.join(screenshotDir, 'bulk_editor_failed.png') });
    console.log("📸 Captured failure screenshot: bulk_editor_failed.png");
  } finally {
    await browser.close();
  }
}

runTest();
