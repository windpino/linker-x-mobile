# Firebase 인증·보안 작업 결과 — 2026-11-16 (Asia/Seoul)

## 우선 판단
운영 (default) Firestore의 공개 규칙은 아직 그대로다. Authentication 설정 변경은 공개 데이터 접근을 차단하지 않는다. 무중단 즉시 차단은 현재 인증 구조로 보장할 수 없다. 전체 거부 비상 규칙은 준비돼 있으며 별도 승인 후 업무 중단을 전제로 적용 가능하다. 신규 쿼리 약 1분/기존 리스너 최대 10분 전파를 고려해 승인·업무 정지 확인 후 약 10~20분 작업 창을 잡는 운영 추정이다.

운영 Rules/계정 변경, 데이터 마이그레이션, main 병합, 서비스 배포는 실행하지 않았다. 공개 규칙만으로 실제 유출·변조 사실을 단정하지 않는다.

## 운영 Authentication 변경 전후
|항목|변경 전|변경 후|
|---|---|---|
|이메일·비밀번호|활성|유지|
|비밀번호 없는 이메일 링크|비활성|유지|
|Google|비활성|활성|
|Google 공개 이름|project-236294239528|링커엑스|
|지원 이메일|미구성|windpino@gmail.com|
|이메일 기본 언어|영어|한국어|
|이메일 인증/비밀번호 재설정/이메일 변경/다단계 등록 알림 발신자|미입력|링커엑스|
|발신 도메인|기본 firebaseapp.com|유지|
|SMTP|기본 서비스|유지|
|승인 도메인|6개|7개, linker-x-mobile.vercel.app만 추가|

기존 localhost, link-x-6606e.firebaseapp.com, link-x-6606e.web.app, lx-mobile.vercel.app, aistudio.google.com, linker-x-homepage.vercel.app은 변경하지 않았다. 기존 도메인 정리는 이번 승인 범위에 포함하지 않았다. 데스크톱 저장소 homepage의 link-x-o4lu.vercel.app은 DEPLOYMENT_NOT_FOUND를 반환해 추가하지 않았다.
공개 이름/지원 이메일은 Google 인증 화면에, 템플릿 변경은 이후 발송되는 인증 관련 이메일에 영향을 준다. 제공업체 활성화만으로 기존 앱의 로그인 코드가 Firebase 인증으로 대체되지는 않는다. Google 최초 로그인은 Auth 계정을 생성할 수 있으므로 운영 실로그인 테스트는 미실행이다.
스크린샷: evidence/screenshots/ (데스크톱 저장소만). 전체 규칙 텍스트는 backups/production-2026-11-16.rules. 콘솔 화면에서 읽은 전체 8줄 전사 백업이며 원본 ruleset ID/CLI export는 확보하지 않았다.

## 조사 범위와 주의할 사실
코드의 doc/collection 호출 600개와 password 객체 필드 위치 86개를 정적 목록화했다. 위치는 evidence/data-path-audit.json, evidence/password-field-locations.json. 후자는 폼 상태 정의도 포함하므로 86개 모두가 DB 쓰기 위치라는 의미가 아니다.
주요 경로는 companies/{companyId} 아래 staffList, partners, products, warehouses, salesOrders, salesInvoices, purchaseInvoices, inventoryTransferHistory, settings/inventory, settings/physicalInventory, bundles, metadata, serverBackups/chunks와 전역 platformStaff, users, agency_inquiries, settings, master_* 등이다.
공개 재귀 규칙은 이 (default) DB의 모든 현재·미래 문서/하위 컬렉션에 규칙상 비인증 읽기·생성·수정·삭제를 허용한다. App Check/IAM/다른 DB/Realtime Database/Storage의 상태는 별도 미확인이다. 비인증 운영 데이터 요청이나 유출 재현 테스트는 하지 않았다. 실제 유출 여부 판단에는 보존된 감사/트래픽 로그의 별도 조사가 필요하다.

### 무조회 원칙에 대한 한계
도메인 실제 배포 확인을 위해 모바일 루트를 열었을 때 기존 브라우저 로그인 세션이 자동 복원되어 업무 화면이 표시됐다. 즉시 해당 확인 탭을 닫았으며 업무 조회·확인 완료·저장·삭제 버튼을 누르거나 운영 데이터 API 테스트를 실행하지 않았다. 이 과정은 요청하신 운영 데이터 무조회 원칙을 완전히 지킨 것으로 볼 수 없다. 페이지의 자동 초기화/동기화 등 백그라운드 활동에 대한 감사 로그는 수집하지 않아 운영 데이터에 아무 접근·변경도 없었다고 보장할 수 없다. 해당 업무 내용은 보고서/스크린샷/커밋에 복제하지 않았다. 이후 콘솔 규칙과 저장소·격리 에뮬레이터만 사용했다.

## 개발 결과
두 저장소 feature/firebase-auth에서 개발. 기준 커밋: 데스크톱 03ed8e6beb33fb315c7446b6fd78154d203a4f27, 모바일 81fa67ab2aea7e266263ce102409234c229da2b5.
- src/auth: 이메일 가입/로그인, Google 로그인, 인증 메일·재전송·인증 확인, 비밀번호 재설정, 승인 전 진입 차단, 소속 승인 신청/관리, 거래처 전용 주문 요청 화면.
- functions/index.js: 인증된 UID·이메일 인증·Auth 계정 비활성 상태·회사 상태·승인 소속을 서버에서 확인. 기존 회사ID/직원/거래처 문서ID를 유지하는 authz 매핑. 이메일 일치 자동 연결 금지. identityBindings 트랜잭션으로 다른 UID의 기존 문서 탈취 방지. 거래처 담당자별 contactId 지원.
- 대표 승인은 플랫폼 관리자만 가능. 직원·거래처 승인은 해당 회사 관리자만 가능. 플랫폼 관리자 최초 등록은 별도 승인 필요. 자가 승인·자가 권한 수정 차단. 승인/권한 변경은 authAudit 기록.
- legacy 로그인/가입 직접 저장 경로와 고정 비밀번호 우회 제거. 데이터 초기화의 재인증도 Firebase Auth로 교체. 업무 데이터 삭제 자체는 실행하지 않았다.
- localStorage/sessionStorage 기존 비밀번호 키·캐시 비밀번호 정리, 이후 저장 방어. 계정/거래처 편집 저장 값의 인증 비밀 필드 제거. 운영에 이미 저장된 평문 비밀번호는 삭제·이관하지 않았다.
- Firebase SDK 잠금 버전은 데스크톱 12.13.0 / 모바일 12.15.0 유지. 기본 연결은 demo-linker-auth 로컬 에뮬레이터이며 운영 연결은 명시 플래그와 별도 배포 승인이 필요하다.
- Vercel feature/firebase-auth 자동 배포 비활성화 설정 포함. 서버/규칙 배포 명령은 실행하지 않았다.

## 실행 결과
|검증|결과|해석|
|---|---|---|
|데스크톱 npm run test:auth|19/19 통과|Auth·Firestore Emulator + 서버 핸들러 직접 호출|
|모바일 npm run test:auth|19/19 통과|동일 보안 경계, 해당 저장소 의존성으로 별도 실행|
|데스크톱·모바일 build|통과|실서비스 브라우저 E2E 완료 의미는 아님|
|새 인증 소스 + desktop main 린트|오류/경고 0|evidence/auth-lint.log|
|데스크톱 전체 린트|기존 오류 63개 잔존|원본도 오류 63개. 인증과 무관한 재고/전표/UI 오류를 수정하지 않음|
|모바일 전체 린트|종료 코드 0, 경고 존재|기존 소스 경고 포함|
|보호 함수 원문 비교|100개 모두 동일|재고·상차·납품·전표·주문 관련 이름의 함수/콜백 본문 비교|
|재고 브랜치 3-way 텍스트 병합|충돌 0|실제 통합 업무 테스트는 미완료|

테스트: 비인증 거부, A→B 읽기/목록/쓰기 거부, 인증 미완료·미승인 거부, 권한 상승 거부, 거래처 자기 주문만 조회/등록, 담당자 위조·승인 상태 위조 거부, 승인 취소 즉시 거부, 이메일 인증·재설정, Google 에뮬레이터 자격증명은 소속 권한을 만들지 않음, 대표/직원/플랫폼 경계, 중복 연결 방지, 비밀번호 캐시 정리.
정상 직원 테스트는 실제 사용 경로 salesOrders, inventoryTransferHistory, salesInvoices, settings/inventory 등의 접근 허용을 확인한다. 기존 ERP 전체 주문→상차→납품→전표 실행/동시성/재고 수량 검증 완료로 보고하지 않는다.

### 실패·미검증도 보존
초기 SDK 두 버전 참조 오류, Functions Emulator Unix 소켓 제한, 에뮬레이터 OOB 링크 언어 기본값(en) 확인 실패 로그를 보존했다. 테스트 도구를 Firebase 12 호환 버전으로 맞췄고, Functions HTTP 대신 에뮬레이터 ID 토큰 검증 후 onCall 핸들러를 직접 실행했다. 한국어 실제 메일 수신·스팸 도착·Google 팝업/리디렉션·실제 callable HTTP/CORS는 미검증이다. 한국어 설정 자체는 운영 콘솔에서 확인했다.

## 통합 계획과 미완료
DEPLOYMENT_BLOCKERS.ko.md와 EMERGENCY_PLAN.ko.md 참조. 후보 규칙은 bundles/metadata/미분류 설정과 평문 비밀번호가 남은 프로필을 거부하므로 현재 운영 배포 불가다. 거래처 partnerOrders를 기존 수주로 변환하는 연동도 후속 통합 대상이다.
Antigravity feat/idempotent-inventory-transaction(확인 SHA 2e1c1e03506aa976a2f6ee8747fc2a1029fac4b5)과 App.jsx/WORK_LOG/package/lock/.gitignore가 겹친다. 텍스트 병합 성공만으로 자동 통합하지 않는다. 별도 통합 브랜치에서 ① 인증/소속 회귀 ② 2기기 동시 상차 ③ 중복 탭/재시도 ④ 상차 취소/복구 ⑤ 전표 저장 실패 ⑥ 오프라인 큐 재접속 ⑦ 회사/권한 변경 뒤 오래된 캐시·작업 재생 차단 ⑧ 거래처 주문의 기존 수주 전환을 검증한다.

운영 Rules, Auth 실계정, 마이그레이션, main 병합, 서비스 배포의 승인 경계를 유지한다. 우선 결정할 사항은 업무 중단을 감수한 emergency-deny.rules의 운영 배포 여부다.
