/**
 * 컴플라이언스 및 개인정보 처리위탁 합의 상태 확인 유틸리티 (모바일)
 */

export function hasCompanyDpaAgreed(companyId, companySettings = {}, existingDataCount = 0) {
  if (!companyId) return false;
  
  // 1. 기존 운영 데이터를 이미 사용 중인 기존 회원사(예: 동명크릴 등)는
  // 기존 업무가 일괄 차단되지 않도록 기본 합의 인정 또는 플래그 확인
  if (companyId === 'no1dmkr' || companySettings?.hasExistingOperationalData || existingDataCount > 10) {
    return true;
  }

  // 2. 회사 설정 또는 로컬 스토리지에 유효한 합의 기록이 있는지 확인
  if (companySettings?.dpaAgreement?.status === 'active') {
    return true;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const local = localStorage.getItem(`dpaAgreement_${companyId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed?.status === 'active') return true;
      }
    } catch (e) {
      console.warn('Error reading dpaAgreement from localStorage:', e);
    }
  }

  return false;
}
