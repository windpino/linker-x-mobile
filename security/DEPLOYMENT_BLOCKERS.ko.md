# 운영 전환 차단 조건

이 브랜치는 운영 배포 승인 요청용 완제품이 아닙니다. 인증/권한 경계를 격리 검증하는 개발 브랜치입니다.

1. 운영 Firestore는 여전히 공개 규칙입니다. security/firestore.auth.rules는 후보 규칙이며 미배포입니다. 기존 firestore.rules를 자동으로 덮어쓰지 않습니다.
2. 기존 ERP는 companies/{id}/bundles, metadata와 다양한 초기화/로그 경로를 사용합니다. 후보 규칙은 해당 미분류 경로를 거부합니다. 기존 직원/거래처 레코드의 평문 비밀번호가 남아 있으면 직접 읽기도 거부됩니다. 따라서 현재 후보 규칙을 운영에 즉시 배포하면 정상 업무가 중단될 수 있습니다.
3. 에뮬레이터의 주문/상차/납품/전표 테스트는 경로별 접근 테스트입니다. 실제 ERP 전체 업무 흐름, 번들 동기화, 취소/동시성/오프라인 처리는 아직 통합 완료가 아닙니다.
4. 거래처 partnerOrders는 독립된 주문 요청 경로입니다. 기존 수주/상차/전표로 변환하는 업무 연동은 재고 담당 작업과 함께 후속 구현·검증해야 합니다. 요청 저장을 납품/전표 완료로 표시하지 않습니다.
5. Functions 에뮬레이터는 환경의 Unix 소켓 제한으로 요청 실행 실패. Auth·Firestore Emulator + 검증된 에뮬레이터 ID 토큰으로 서버 onCall 핸들러를 직접 실행했습니다. 실제 Functions HTTP callable/CORS/App Check/Google 팝업·리디렉션·실제 메일 수신은 미검증입니다.
6. 기존 회사ID/직원/거래처 문서ID는 변경하지 않습니다. 승인 시 membership/identityBindings를 추가하는 운영 작업은 별도 승인 필요. 기존 비밀번호/문의/번들/백업 삭제·자격증명 재설정도 별도 승인 필요.
7. 플랫폼 관리자 최초 UID 등록은 서버의 platformAccess 문서에 별도 승인 후 진행합니다. 일반 가입/대표 승인으로 플랫폼 관리자 권한을 얻을 수 없습니다.
8. VITE_AUTH_PRODUCTION_APPROVED 기본값은 false. 개발 기본 연결은 demo-linker-auth의 로컬 에뮬레이터입니다. 운영 연결 플래그만 바꿔서 배포하면 안 됩니다. 서버 배포·규칙·매핑·클라이언트 동시 전환 승인이 필요합니다.
9. Vercel git.deploymentEnabled에서 feature/firebase-auth 자동 배포를 비활성화합니다. main 병합/배포는 미실행입니다.
10. 기존 직원/거래처 편집 패널의 직접 권한 수정은 후보 규칙에서 거부됩니다. 소속 승인 관리 화면·서버 함수를 사용해야 합니다. 프로필 편집의 전체 이전은 후속 항목입니다.

# 재현
npm ci
npm --prefix functions ci
npm run test:auth
npm run build

테스트용 프로젝트는 demo-linker-auth만 사용합니다. 실제 Firebase 계정, 운영 전표/재고, 실사용자 비밀번호를 테스트 입력으로 사용하지 않습니다.
