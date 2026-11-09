/**
 * Mobile ERP Menu Permissions Master Definition & Validator
 * Single source of truth for 직원관리 (Staff Management) checkboxes
 * and Mobile Menu (Drawer, QuickMenu, BottomNav) visibility.
 */

export const MENU_PERMISSIONS = [
  {
    category: '기초자료등록',
    items: [
      '직원관리',
      '창고관리',
      '거래처등록/관리',
      '품목등록/관리',
      '창고별 기초재고 일괄설정'
    ]
  },
  {
    category: '매출/주문관리',
    items: [
      '수주 등록',
      '수주목록',
      '매출 전표',
      '매출전표내역',
      '매출원장',
      '매출처 미수금현황',
      '견적서',
      '견적서 관리'
    ]
  },
  {
    category: '매입/발주관리',
    items: [
      '발주 등록',
      '매입전표 등록',
      '매입전표 관리'
    ]
  },
  {
    category: '재고관리',
    items: [
      '실재고 입력',
      '재고이동',
      '재고조정 (손실처리)',
      '재고 불일치 현황',
      '일자별 재고현황',
      '최종 재고',
      '매입처별 재고현황'
    ]
  },
  {
    category: '입출금관리',
    items: [
      '입금전표발행',
      '출금전표발행',
      '계좌관리',
      '금전출납부',
      '경비출금',
      '결산보고서',
      '일자별 입출금 현황',
      '계좌별 입출금 현황'
    ]
  },
  {
    category: '스마트지원',
    items: [
      '종합매출보고서',
      '수주보고서',
      '전표수정/삭제 보고서',
      '직원 실적 보고서',
      '미수금관리',
      '최근 처리 현황 보고서',
      '거래처별 특별단가 관리',
      '세금신고 지원 보고서',
      '일정추가'
    ]
  },
  {
    category: '데이터관리',
    items: [
      '데이터 전체 저장/불러오기/삭제'
    ]
  },
  {
    category: '환경설정',
    items: [
      '회사/시스템 환경설정',
      '정품등록',
      '거래처몰'
    ]
  }
];

export const MOBILE_CORE_MENUS = [
  {
    id: 'sales_order',
    permKey: '모바일_수주',
    label: '수주',
    subLabel: '수주 등록 · 목록',
    emoji: '🛒',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    desktopLinkedKeys: ['수주 등록', '수주목록', '수주']
  },
  {
    id: 'loading_check',
    permKey: '모바일_상차',
    label: '상차',
    subLabel: '출하 · 상차 체크',
    emoji: '🚛',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    desktopLinkedKeys: ['수주목록', '수주', '재고이동']
  },
  {
    id: 'inventory_transfer',
    permKey: '모바일_재고이동',
    label: '재고이동',
    subLabel: '창고 · 차량 이동',
    emoji: '🔄',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    desktopLinkedKeys: ['재고이동']
  },
  {
    id: 'sales_invoice',
    permKey: '모바일_매출전표발행',
    label: '매출전표발행',
    subLabel: '현장 전표 즉시 발행',
    emoji: '🧾',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    desktopLinkedKeys: ['매출 전표', '매출전표', '매출전표내역']
  },
  {
    id: 'product',
    permKey: '모바일_상품등록',
    label: '상품등록',
    subLabel: '품목 등록 · 관리',
    emoji: '📦',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    desktopLinkedKeys: ['품목등록/관리', '품목등록', '품목관리']
  },
  {
    id: 'partner',
    permKey: '모바일_거래처등록',
    label: '거래처등록',
    subLabel: '거래처 등록 · 관리',
    emoji: '🤝',
    color: '#db2777',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    desktopLinkedKeys: ['거래처등록/관리', '거래처등록', '거래처관리']
  }
];

export const MENU_ID_TO_PERM = {
  staff: '직원관리',
  warehouse: '창고관리',
  partner: '모바일_거래처등록',
  product: '모바일_상품등록',
  physical_inventory: '실재고 입력',
  warehouse_initial_stock: '창고별 기초재고 일괄설정',
  inventory_transfer: '모바일_재고이동',
  inventory_movement_manager: '모바일_재고이동',
  loading_check: '모바일_상차',
  inventory_adjustment: '재고조정 (손실처리)',
  inventory_mismatch: '재고 불일치 현황',
  inventory_report_1: '일자별 재고현황',
  inventory_report_2: '최종 재고',
  inventory_report_3: '매입처별 재고현황',
  purchase_invoice: '매입전표 등록',
  purchase_ledger: '매입전표 관리',
  purchase_order: '발주 등록',
  sales_invoice: '모바일_매출전표발행',
  sales_invoice_list: '모바일_매출전표발행',
  sales_ledger: '매출원장',
  sales_order: '모바일_수주',
  order_list: '모바일_수주',
  quotation: '견적서',
  quotation_list: '견적서 관리',
  deposit_slip: '입금전표발행',
  withdrawal_slip: '출금전표발행',
  account: '계좌관리',
  cash_report_1: '결산보고서',
  cash_report_2: '일자별 입출금 현황',
  cash_report_3: '계좌별 입출금 현황',
  cash_book: '금전출납부',
  expense: '경비출금',
  sales_report: '종합매출보고서',
  order_report: '수주보고서',
  edit_delete: '전표수정/삭제 보고서',
  staff_perf: '직원 실적 보고서',
  receivables: '미수금관리',
  recent_activity: '최근 처리 현황 보고서',
  partner_special_price: '거래처별 특별단가 관리',
  tax_report: '세금신고 지원 보고서',
  schedule: '일정추가',
  data_manager: '데이터 전체 저장/불러오기/삭제',
  settings: '회사/시스템 환경설정',
  company_settings: '회사/시스템 환경설정',
  license: '정품등록',
  partner_mall: '거래처몰'
};

/**
 * Checks if currentUser has permission for permName.
 * Handles admin overrides and backward compatibility for legacy keys.
 */
export const hasMenuPermission = (currentUser, permName) => {
  if (!currentUser) return false;

  // 최고관리자, admin, 대표자, ALL 권한은 모든 메뉴 프리패스
  if (
    currentUser.role === 'admin' ||
    currentUser.role === 'super_admin' ||
    currentUser.role === 'company' ||
    currentUser.role === 'owner' ||
    currentUser.role === 'representative' ||
    currentUser.role === 'ceo' ||
    currentUser.isCompanyAdmin === true ||
    currentUser.isMasterAdmin === true ||
    currentUser.userId === 'admin' ||
    currentUser.userId === 'sadmin' ||
    currentUser.userId === 'madmin' ||
    (currentUser.companyId && currentUser.userId && String(currentUser.userId).trim().toLowerCase() === String(currentUser.companyId).trim().toLowerCase()) ||
    currentUser.permissions?.ALL === true
  ) {
    return true;
  }

  const p = currentUser.permissions || {};

  // 직관적 일치 검사
  if (p[permName] !== undefined) return Boolean(p[permName]);

  // 하위 호환 매핑 및 모바일-데스크탑 유기적 연동 검사
  switch (permName) {
    case '모바일_수주':
      return Boolean(p['모바일_수주'] ?? (p['수주 등록'] || p['수주목록'] || p['수주']));
    case '모바일_상차':
    case '상차':
      return Boolean(p['모바일_상차'] ?? (p['상차'] ?? (p['수주목록'] || p['수주'] || p['재고이동'])));
    case '모바일_재고이동':
      return Boolean(p['모바일_재고이동'] ?? p['재고이동']);
    case '모바일_매출전표발행':
    case '매출전표발행':
      return Boolean(p['모바일_매출전표발행'] ?? (p['매출 전표'] || p['매출전표'] || p['매출전표내역']));
    case '모바일_상품등록':
    case '상품등록':
      return Boolean(p['모바일_상품등록'] ?? (p['품목등록/관리'] || p['품목등록'] || p['품목관리']));
    case '모바일_거래처등록':
      return Boolean(p['모바일_거래처등록'] ?? (p['거래처등록/관리'] || p['거래처등록'] || p['거래처관리']));
    case '거래처등록/관리':
    case '거래처등록':
      return Boolean(p['모바일_거래처등록'] ?? (p['거래처등록/관리'] ?? (p['거래처등록'] || p['거래처관리'])));
    case '품목등록/관리':
    case '품목등록':
      return Boolean(p['모바일_상품등록'] ?? (p['품목등록/관리'] ?? (p['품목등록'] || p['품목관리'])));
    case '수주 등록':
      return Boolean(p['모바일_수주'] ?? (p['수주 등록'] ?? p['수주']));
    case '수주목록':
      return Boolean(p['모바일_수주'] ?? (p['모바일_상차'] ?? (p['수주목록'] ?? p['수주'])));
    case '수주':
      return Boolean(p['모바일_수주'] ?? (p['수주'] ?? (p['수주 등록'] || p['수주목록'])));
    case '재고이동':
      return Boolean(p['모바일_재고이동'] ?? p['재고이동']);
    case '매출 전표':
    case '매출전표':
    case '매출전표내역':
      return Boolean(p['모바일_매출전표발행'] ?? (p['매출 전표'] ?? (p['매출전표'] || p['매출전표내역'])));
    case '발주 등록':
      return Boolean(p['발주 등록'] ?? p['발주']);
    case '발주':
      return Boolean(p['발주'] ?? p['발주 등록']);
    case '매입전표 등록':
      return Boolean(p['매입전표 등록'] ?? p['매입전표']);
    case '매입전표':
      return Boolean(p['매입전표'] ?? p['매입전표 등록']);
    case '매입전표 관리':
      return Boolean(p['매입전표 관리'] ?? p['매입원장']);
    case '매입원장':
      return Boolean(p['매입원장'] ?? p['매입전표 관리']);
    case '견적서 관리':
      return Boolean(p['견적서 관리'] ?? p['견적서']);
    case '입금전표발행':
    case '입금전표':
      return Boolean(p['입금전표발행'] ?? (p['입금전표'] || p['입출금보고서'] || p['금전출납부'] || p['매출전표']));
    case '출금전표발행':
    case '출금전표':
      return Boolean(p['출금전표발행'] ?? (p['출금전표'] || p['입출금보고서'] || p['금전출납부'] || p['매입전표'] || p['매입원장']));
    case '실재고 입력':
      return Boolean(p['실재고 입력'] ?? p['재고이동']);
    case '재고조정 (손실처리)':
    case '재고조정':
      return Boolean(p['재고조정 (손실처리)'] ?? (p['재고조정'] || p['재고이동']));
    case '재고 불일치 현황':
      return Boolean(p['재고 불일치 현황'] ?? p['재고보고서']);
    case '창고별 기초재고 일괄설정':
      return Boolean(p['창고별 기초재고 일괄설정'] ?? (p['재고보고서'] || p['품목관리'] || p['품목등록']));
    case '일자별 재고현황':
    case '최종 재고':
    case '매입처별 재고현황':
      return Boolean(p[permName] ?? p['재고보고서']);
    case '재고보고서':
      return Boolean(p['재고보고서'] ?? (p['일자별 재고현황'] || p['최종 재고'] || p['매입처별 재고현황']));
    case '결산보고서':
    case '일자별 입출금 현황':
    case '계좌별 입출금 현황':
      return Boolean(p[permName] ?? p['입출금보고서']);
    case '입출금보고서':
      return Boolean(p['입출금보고서'] ?? (p['결산보고서'] || p['일자별 입출금 현황'] || p['계좌별 입출금 현황']));
    case '종합매출보고서':
    case '매출보고서':
      return Boolean(p['종합매출보고서'] ?? p['매출보고서']);
    case '수주보고서':
      return Boolean(p['수주보고서'] ?? (p['수주'] || p['수주 등록'] || p['수주목록']));
    case '미수금관리':
    case '미수금 보고서':
    case '미수금보고서':
    case '매출처 미수금현황':
      return Boolean(p['미수금관리'] ?? (p['미수금 보고서'] || p['미수금보고서'] || p['매출처 미수금현황'] || p['매출원장']));
    case '최근 처리 현황 보고서':
    case '최근처리현황보고서':
    case '최근 처리 현황':
      return Boolean(p['최근 처리 현황 보고서'] ?? (p['최근 처리 현황'] || p['최근처리현황보고서']));
    case '거래처별 특별단가 관리':
    case '특별단가관리':
      return Boolean(p['거래처별 특별단가 관리'] ?? p['특별단가관리']);
    case '세금신고 지원 보고서':
      return Boolean(p['세금신고 지원 보고서']);
    case '일정추가':
    case '일정':
      return Boolean(p['일정추가'] ?? p['일정']);
    case '회사/시스템 환경설정':
    case '환경설정':
      return Boolean(p['회사/시스템 환경설정'] ?? p['환경설정']);
    case '정품등록':
      return Boolean(p['정품등록']);
    case '거래처몰':
      return p['거래처몰'] !== undefined ? Boolean(p['거래처몰']) : true;
    default:
      if (permName.startsWith('데이터 전체 저장/불러오기')) {
        return Boolean(p['데이터 전체 저장/불러오기/삭제'] || p['데이터 전체 저장/불러오기']);
      }
      return false;
  }
};

export const hasMobileMenuPermission = (currentUser, mobileIdOrKey) => {
  const found = MOBILE_CORE_MENUS.find(m => m.id === mobileIdOrKey || m.permKey === mobileIdOrKey || m.label === mobileIdOrKey);
  if (found) {
    return hasMenuPermission(currentUser, found.permKey);
  }
  return hasMenuPermission(currentUser, mobileIdOrKey);
};

/**
 * Normalizes legacy permissions into current UI canonical keys for StaffRegistration
 */
export const normalizeMenuPermissions = (perm) => {
  if (!perm) return {};
  let obj = {};
  if (Array.isArray(perm)) {
    perm.forEach(k => { if (typeof k === 'string') obj[k] = true; });
  } else if (typeof perm === 'object') {
    obj = { ...perm };
  }

  // Canonicalize keys
  if (obj['거래처등록/관리'] === undefined && (obj['거래처등록'] || obj['거래처관리'])) obj['거래처등록/관리'] = true;
  if (obj['품목등록/관리'] === undefined && (obj['품목등록'] || obj['품목관리'])) obj['품목등록/관리'] = true;
  if (obj['수주 등록'] === undefined && obj['수주'] !== undefined) obj['수주 등록'] = Boolean(obj['수주']);
  if (obj['수주목록'] === undefined && obj['수주'] !== undefined) obj['수주목록'] = Boolean(obj['수주']);
  if (obj['매출 전표'] === undefined && obj['매출전표'] !== undefined) obj['매출 전표'] = Boolean(obj['매출전표']);
  if (obj['발주 등록'] === undefined && obj['발주'] !== undefined) obj['발주 등록'] = Boolean(obj['발주']);
  if (obj['매입전표 등록'] === undefined && obj['매입전표'] !== undefined) obj['매입전표 등록'] = Boolean(obj['매입전표']);
  if (obj['매입전표 관리'] === undefined && obj['매입원장'] !== undefined) obj['매입전표 관리'] = Boolean(obj['매입원장']);
  if (obj['견적서 관리'] === undefined && obj['견적서'] !== undefined) obj['견적서 관리'] = Boolean(obj['견적서']);
  if (obj['일자별 재고현황'] === undefined && obj['재고보고서'] !== undefined) obj['일자별 재고현황'] = Boolean(obj['재고보고서']);
  if (obj['최종 재고'] === undefined && obj['재고보고서'] !== undefined) obj['최종 재고'] = Boolean(obj['재고보고서']);
  if (obj['매입처별 재고현황'] === undefined && obj['재고보고서'] !== undefined) obj['매입처별 재고현황'] = Boolean(obj['재고보고서']);
  if (obj['결산보고서'] === undefined && obj['입출금보고서'] !== undefined) obj['결산보고서'] = Boolean(obj['입출금보고서']);
  if (obj['일자별 입출금 현황'] === undefined && obj['입출금보고서'] !== undefined) obj['일자별 입출금 현황'] = Boolean(obj['입출금보고서']);
  if (obj['계좌별 입출금 현황'] === undefined && obj['입출금보고서'] !== undefined) obj['계좌별 입출금 현황'] = Boolean(obj['입출금보고서']);
  if (obj['종합매출보고서'] === undefined && obj['매출보고서'] !== undefined) obj['종합매출보고서'] = Boolean(obj['매출보고서']);
  if (obj['미수금관리'] === undefined && (obj['미수금 보고서'] || obj['미수금보고서'] || obj['매출처 미수금현황'])) obj['미수금관리'] = true;
  if (obj['거래처별 특별단가 관리'] === undefined && obj['특별단가관리'] !== undefined) obj['거래처별 특별단가 관리'] = Boolean(obj['특별단가관리']);
  if (obj['일정추가'] === undefined && obj['일정'] !== undefined) obj['일정추가'] = Boolean(obj['일정']);
  if (obj['회사/시스템 환경설정'] === undefined && obj['환경설정'] !== undefined) obj['회사/시스템 환경설정'] = Boolean(obj['환경설정']);

  // 모바일 6대 핵심 메뉴 권한 자동 초기화 (기존 데스크탑 권한과 유기적 연결)
  if (obj['모바일_수주'] === undefined && (obj['수주 등록'] !== undefined || obj['수주목록'] !== undefined || obj['수주'] !== undefined)) {
    obj['모바일_수주'] = Boolean(obj['수주 등록'] || obj['수주목록'] || obj['수주']);
  }
  if (obj['모바일_상차'] === undefined && (obj['상차'] !== undefined || obj['수주목록'] !== undefined || obj['수주'] !== undefined || obj['재고이동'] !== undefined)) {
    obj['모바일_상차'] = Boolean(obj['상차'] ?? (obj['수주목록'] || obj['수주'] || obj['재고이동']));
  }
  if (obj['모바일_재고이동'] === undefined && obj['재고이동'] !== undefined) {
    obj['모바일_재고이동'] = Boolean(obj['재고이동']);
  }
  if (obj['모바일_매출전표발행'] === undefined && (obj['매출 전표'] !== undefined || obj['매출전표'] !== undefined || obj['매출전표내역'] !== undefined)) {
    obj['모바일_매출전표발행'] = Boolean(obj['매출 전표'] || obj['매출전표'] || obj['매출전표내역']);
  }
  if (obj['모바일_상품등록'] === undefined && (obj['품목등록/관리'] !== undefined || obj['품목등록'] !== undefined || obj['품목관리'] !== undefined)) {
    obj['모바일_상품등록'] = Boolean(obj['품목등록/관리'] || obj['품목등록'] || obj['품목관리']);
  }
  if (obj['모바일_거래처등록'] === undefined && (obj['거래처등록/관리'] !== undefined || obj['거래처등록'] !== undefined || obj['거래처관리'] !== undefined)) {
    obj['모바일_거래처등록'] = Boolean(obj['거래처등록/관리'] || obj['거래처등록'] || obj['거래처관리']);
  }

  return obj;
};

/**
 * Enriches saved permissions object with legacy keys to ensure 100% backward compatibility
 */
export const enrichMenuPermissions = (permissions = {}) => {
  const p = { ...permissions };

  if (p['거래처등록/관리'] !== undefined) {
    p['거래처등록'] = p['거래처등록/관리'];
    p['거래처관리'] = p['거래처등록/관리'];
  }
  if (p['품목등록/관리'] !== undefined) {
    p['품목등록'] = p['품목등록/관리'];
    p['품목관리'] = p['품목등록/관리'];
  }
  if (p['수주 등록'] !== undefined || p['수주목록'] !== undefined) {
    p['수주'] = Boolean(p['수주 등록'] || p['수주목록']);
  }
  if (p['매출 전표'] !== undefined) p['매출전표'] = p['매출 전표'];
  if (p['발주 등록'] !== undefined) p['발주'] = p['발주 등록'];
  if (p['매입전표 등록'] !== undefined) p['매입전표'] = p['매입전표 등록'];
  if (p['매입전표 관리'] !== undefined) p['매입원장'] = p['매입전표 관리'];
  if (p['견적서 관리'] !== undefined || p['견적서'] !== undefined) {
    p['견적서'] = Boolean(p['견적서'] || p['견적서 관리']);
  }
  if (p['일자별 재고현황'] !== undefined || p['최종 재고'] !== undefined || p['매입처별 재고현황'] !== undefined) {
    p['재고보고서'] = Boolean(p['일자별 재고현황'] || p['최종 재고'] || p['매입처별 재고현황']);
  }
  if (p['결산보고서'] !== undefined || p['일자별 입출금 현황'] !== undefined || p['계좌별 입출금 현황'] !== undefined) {
    p['입출금보고서'] = Boolean(p['결산보고서'] || p['일자별 입출금 현황'] || p['계좌별 입출금 현황']);
  }
  if (p['종합매출보고서'] !== undefined) p['매출보고서'] = p['종합매출보고서'];
  if (p['미수금관리'] !== undefined) {
    p['미수금 보고서'] = p['미수금관리'];
    p['미수금보고서'] = p['미수금관리'];
  }
  if (p['거래처별 특별단가 관리'] !== undefined) p['특별단가관리'] = p['거래처별 특별단가 관리'];
  if (p['일정추가'] !== undefined) p['일정'] = p['일정추가'];
  if (p['회사/시스템 환경설정'] !== undefined) p['환경설정'] = p['회사/시스템 환경설정'];

  // 모바일 6대 핵심 메뉴 권한 동기화 보존
  if (p['모바일_상차'] !== undefined) {
    p['상차'] = Boolean(p['모바일_상차']);
  }

  return p;
};
