import * as XLSX from 'xlsx';

/**
 * 데이터를 엑셀 파일(.xlsx)로 내보냅니다.
 * @param {Array} data - 내보낼 데이터 배열 (JSON 형태)
 * @param {string} fileName - 파일명 (확장자 제외)
 * @param {string} sheetName - 시트 이름
 */
export const exportToExcel = (data, fileName, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // 1. 데이터 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 2. 워크북 생성 및 시트 추가
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // 3. 파일 저장
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * 테이블 데이터를 엑셀용 데이터로 변환할 때 헬퍼 함수
 * (필드명을 한글 헤더로 변경하는 등)
 */
export const formatDataForExcel = (data, columnMap) => {
  return data.map(item => {
    const formatted = {};
    Object.keys(columnMap).forEach(key => {
      formatted[columnMap[key]] = item[key];
    });
    return formatted;
  });
};
