# Antigravity Workspace Guidelines (LINKER-X Mobile ERP)

## ⚡ UI/메뉴 변경 초고속 실행 원칙 (Speed-First)

사용자가 메뉴, 화면 배치, 색상, 버튼 등의 UI 수정을 요청할 때 불필요한 전체 프로젝트 탐색을 전면 금지하고 즉각 조치합니다.

### 1. 핵심 컴포넌트 맵 (즉시 직행)
1. **모바일 전체 메뉴 (햄버거 드로어)**
   - 파일: `src/components/Header.jsx`
   - 아코디언 메뉴 리스트: `lines 820+`
   - 검색 항목 리스트: `MENU_ITEMS` (`lines 380+`)
2. **메인 대시보드 자주 찾는 메뉴 (퀵메뉴 8칸)**
   - 파일: `src/App.jsx`
   - 메뉴 마스터: `ALL_FAVORITE_MENUS` (`lines 96+`)
   - 퀵메뉴 컴포넌트: `FavoriteMenuBar` (`lines 7570+`)
3. **주요 화면 컴포넌트**
   - 매출원장: `src/components/SalesLedger.jsx`
   - 수주목록: `src/components/OrderList.jsx`
   - 수주등록: `src/components/SalesOrder.jsx`
   - 매출전표: `src/components/SalesInvoice.jsx`
   - 매입원장: `src/components/PurchaseLedger.jsx`
   - 재고이동: `src/components/InventoryTransfer.jsx`
   - 재고보고서: `src/components/InventoryReport.jsx`
   - 금전출납부: `src/components/CashBook.jsx`

### 2. 행동 규칙
1. **전수 검색 금지**: 전체 파일 대상 문자열 검색이나 탐색 스크립트 실행 없이 위 맵의 파일로 즉시 이동합니다.
2. **도구 호출 최소화**: `read_file` (해당 라인 범위) ➔ `edit_file` (수정) ➔ 빌드 & 배포 원스톱 커맨드로 15~20초 이내에 완료합니다.
3. **PowerShell 커맨드**: 세미콜론(`;`)을 사용해 빌드와 배포를 묶어서 한 번에 실행합니다:
   `npm run build; git add -A; git commit -m '...'; git push origin main`
