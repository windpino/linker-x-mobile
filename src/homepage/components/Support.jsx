import React, { useState } from 'react';
import { HelpCircle, Search, Headphones, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Support({ notices = [], onOpenInquiry }) {
  const [activeMenu, setActiveMenu] = useState('faq'); // 'notice' or 'faq'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'production', 'distribution', 'retail'
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  // Predefined FAQs
  const faqs = [
    {
      id: 1,
      category: 'production',
      categoryLabel: '제품생산관리',
      title: '생산 지시서 발행 시 자재 소요량(BOM) 자동 계산 설정 방법은 무엇인가요?',
      answer: '제품 정보 관리에서 품목별로 원부자재 소요 레시피(BOM)를 미리 등록해 두면, 생산 지시서를 신규 입력할 때 생산 목표 수량에 비례하여 필요한 원자재의 기준 소요량이 자동으로 산출됩니다. 이를 통해 현장의 자재 수급 예측을 한눈에 파악할 수 있습니다.',
      views: 1240
    },
    {
      id: 2,
      category: 'production',
      categoryLabel: '제품생산관리',
      title: '생산 완료 후 완제품 입고 및 소요 원자재 자동 차감(Backflushing) 처리 방법',
      answer: '생산 지시 완료(확정) 버튼을 누르면 완제품 창고로 지정 수량이 입고됨과 동시에, 사전 정의된 BOM 비율에 따라 투입된 원부자재 재고가 해당 창고에서 자동으로 차감 소모됩니다. 재고 일치 비율을 높이려면 정밀한 레시피 매칭이 필요합니다.',
      views: 948
    },
    {
      id: 3,
      category: 'production',
      categoryLabel: '제품생산관리',
      title: '작업 공정별 실시간 진척률 모니터링 화면 설정 방법',
      answer: '작업현황 모니터링 탭에서 생산 라인 및 공정별(단일, 다중 공정) 진척 상황을 설정할 수 있습니다. 바코드/RFID 스캔 장비나 공정별 단말기를 통해 작업 완수가 입력되는 즉시 대시보드 화면에 달성률이 % 단위로 실시간 갱신됩니다.',
      views: 735
    },
    {
      id: 4,
      category: 'distribution',
      categoryLabel: '대리점유통',
      title: '대리점별 출고 단가 설정 및 수주 주문 접수 시 자동 단가 매칭 방법',
      answer: '거래처 특별단가 관리 메뉴에서 각 대리점별 특별 할인 단가나 거래 조건(할인율, 등급별 단가)을 개별 등록해 주시면 됩니다. 이후 대리점 수주 전표 등록 시 해당 대리점을 선택하는 즉시 해당 품목들의 단가가 지정 단가로 자동 세팅됩니다.',
      views: 1562
    },
    {
      id: 5,
      category: 'distribution',
      categoryLabel: '대리점유통',
      title: '본사와 대리점 간 실시간 재고 공유 및 재고 이동 거래 신청 프로세스',
      answer: '대리점 포털 권한이 있는 사용자는 재고현황 조회 메뉴를 통해 실시간 본사 위탁 창고 재고를 조회할 수 있습니다. 필요 시 재고이동 신청 버튼을 통해 본사 창고에서 대리점 창고로 이송 요청을 발송하고 승인 처리를 진행하게 됩니다.',
      views: 1104
    },
    {
      id: 6,
      category: 'distribution',
      categoryLabel: '대리점유통',
      title: '월별 대리점 매출 마감 및 미수금 정산 현황 확인 경로',
      answer: '매출원장 및 미수금 현황 보고서 메뉴에서 조회 연월을 설정한 뒤 대리점별 거래처 필터를 걸어 조회하시면 당월 매출 마감금액, 입금 수납액, 이월된 잔여 미수금을 한눈에 확인하여 마감 고지서를 발행할 수 있습니다.',
      views: 890
    },
    {
      id: 7,
      category: 'retail',
      categoryLabel: '소비자소매관리',
      title: '오프라인 매장용 소매 판매 등록(POS) 및 바코드 스캐너 연동 안내',
      answer: '소매 판매 메뉴는 일반 키보드 스캔 모드를 지원합니다. 일반 USB 방식 또는 블루투스 바코드 스캐너를 PC나 스마트 단말기에 연결하고 품목코드 입력란에 커서를 둔 뒤 바코드를 스캔하면 해당 상품이 자동으로 전표 리스트에 즉시 추가됩니다.',
      views: 1320
    },
    {
      id: 8,
      category: 'retail',
      categoryLabel: '소비자소매관리',
      title: '소매 고객 포인트 적립 기준 설정 및 결제 시 포인트 사용 방법',
      answer: '환경설정 내 고객 포인트 관리에서 결제 금액 대비 적립률(예: 1%)을 설정할 수 있습니다. 결제 시 고객명 또는 연락처를 검색하여 누적 포인트를 조회한 뒤 포인트 한도 내에서 현금처럼 결제액 차감 처리가 가능합니다.',
      views: 1045
    },
    {
      id: 9,
      category: 'retail',
      categoryLabel: '소비자소매관리',
      title: '카드 단말기 연동 및 영수증 승인 내역 확인 방법',
      answer: '소매 결제 화면에서 신용카드 결제를 선택한 후 연동 프로그램(Van사 에이전트)과 소매 단말기를 확인합니다. 승인이 완료되면 거래내역서에 승인번호 및 거래 일시가 자동으로 매핑 저장되어 이중 입력을 방지합니다.',
      views: 654
    }
  ];

  // Filtering FAQs or Notices
  const getFilteredItems = () => {
    if (activeMenu === 'notice') {
      return notices.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return faqs.filter(faq => {
      const matchCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      const matchQuery = searchQuery === '' || 
        faq.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  };

  const toggleExpandFaq = (id) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 flex flex-col md:flex-row gap-8">
      
      {/* 1. Left Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header Card */}
          <div className="bg-slate-100 p-6 text-center border-b border-slate-200 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-slate-200 text-slate-700 shadow-sm">
              <Headphones className="h-8 w-8 text-[#1d4ed8]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">고객지원</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">도움이 필요하신가요?</p>
            </div>
          </div>

          {/* Menu Options */}
          <div className="flex flex-col">
            <button 
              onClick={() => { setActiveMenu('notice'); setSelectedCategory('all'); setSearchQuery(''); }}
              className={`w-full text-left px-6 py-4 text-sm font-bold border-b border-slate-100 transition-colors ${
                activeMenu === 'notice' ? 'bg-blue-50 text-[#1d4ed8]' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              • 공지사항
            </button>
            <button 
              onClick={() => { setActiveMenu('faq'); setSelectedCategory('all'); setSearchQuery(''); }}
              className={`w-full text-left px-6 py-4 text-sm font-bold border-b border-slate-100 transition-colors ${
                activeMenu === 'faq' ? 'bg-blue-50 text-[#1d4ed8]' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              • 자주묻는질문
            </button>
            <button 
              onClick={() => onOpenInquiry("1:1 고객 문의")}
              className="w-full text-left px-6 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              • 1:1 문의하기
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1">
        {/* Breadcrumb path */}
        <div className="flex justify-between items-center text-xs text-slate-400 font-bold mb-4">
          <span>Home &gt; 고객지원 &gt; {activeMenu === 'faq' ? '자주묻는질문' : '공지사항'}</span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-6">
          {activeMenu === 'faq' ? '자주묻는질문' : '공지사항'}
        </h2>

        {/* 3. Blue Search Banner */}
        <div className="bg-[#1d4ed8] text-white p-6 rounded-2xl shadow-md mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-lg font-black tracking-tight mb-2">
              {activeMenu === 'faq' ? 'FAQ - 자주 묻는 질문' : '시스템 공지사항'}
            </h3>
            <p className="text-xs text-white/80 font-bold">
              {activeMenu === 'faq' 
                ? '원하는 문제 해결 방법을 분류별로 쉽고 빠르게 검색하여 참고하세요.' 
                : '신규 업데이트 및 주요 전산 시스템 점검 일정을 확인해 보세요.'}
            </p>
          </div>
          <button 
            onClick={() => onOpenInquiry(activeMenu === 'faq' ? 'FAQ 추가 문의' : '공지 관련 문의')}
            className="bg-white hover:bg-slate-50 text-[#1d4ed8] px-5 py-2.5 rounded-lg text-xs font-black self-start md:self-auto transition-colors"
          >
            1:1 질문 바로가기 &gt;
          </button>
        </div>

        {/* 4. Search Form */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={activeMenu === 'faq' ? "질문 제목 또는 키워드를 검색하세요." : "공지사항 키워드를 검색하세요."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-800 outline-none focus:border-[#1d4ed8] transition-all"
            />
          </div>
          <button className="bg-[#1d4ed8] hover:bg-blue-800 text-white font-extrabold text-sm px-6 py-2 rounded-lg transition-colors">
            검색
          </button>
        </div>

        {/* 5. Categories filter (FAQ only) */}
        {activeMenu === 'faq' && (
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-5 mb-6">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === 'all' 
                  ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              전체보기
            </button>
            <button
              onClick={() => setSelectedCategory('production')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === 'production' 
                  ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              제품생산관리
            </button>
            <button
              onClick={() => setSelectedCategory('distribution')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === 'distribution' 
                  ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              대리점유통
            </button>
            <button
              onClick={() => setSelectedCategory('retail')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === 'retail' 
                  ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              소비자소매관리
            </button>
          </div>
        )}

        {/* 6. Bulletin Board List Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-xs">
                <th className="px-6 py-4 w-20 text-center">번호</th>
                {activeMenu === 'faq' && <th className="px-6 py-4 w-32">분류</th>}
                <th className="px-6 py-4">제목</th>
                <th className="px-6 py-4 w-24 text-center">조회수</th>
              </tr>
            </thead>
            <tbody>
              {/* Notices (Always displayed at the very top of FAQ or Notices) */}
              {notices.map((notice, idx) => (
                <React.Fragment key={`notice-${notice.id}`}>
                  <tr 
                    onClick={() => toggleExpandFaq(`notice-${notice.id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-sm font-bold bg-amber-50/40 text-slate-800 transition-colors"
                  >
                    <td className="px-6 py-4 text-center">
                      <span className="bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30 px-2 py-0.5 rounded-full text-[0.68rem] font-extrabold">공지</span>
                    </td>
                    {activeMenu === 'faq' && (
                      <td className="px-6 py-4 text-[#f97316] font-extrabold text-xs">
                        [전체공지]
                      </td>
                    )}
                    <td className="px-6 py-4 hover:underline text-[#f97316] font-extrabold flex items-center gap-2">
                      {notice.title}
                      {expandedFaqId === `notice-${notice.id}` ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-400 font-medium">-</td>
                  </tr>
                  {/* Expanded Content Panel */}
                  {expandedFaqId === `notice-${notice.id}` && (
                    <tr className="bg-amber-50/10 border-b border-slate-100">
                      <td colSpan={activeMenu === 'faq' ? 4 : 3} className="px-8 py-5 text-sm text-slate-600 leading-relaxed font-medium">
                        <div className="bg-white border border-amber-100/50 p-4 rounded-xl shadow-inner">
                          {notice.content}
                          <div className="text-[0.68rem] text-slate-400 font-bold mt-4">
                            공지일자: {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : '-'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {/* Regular List (FAQs or Notices filtered) */}
              {activeMenu === 'faq' ? (
                filteredItems.map((faq) => (
                  <React.Fragment key={`faq-${faq.id}`}>
                    <tr 
                      onClick={() => toggleExpandFaq(`faq-${faq.id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors"
                    >
                      <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                        {faq.id}
                      </td>
                      <td className="px-6 py-4 text-blue-600 font-bold text-xs">
                        {faq.categoryLabel}
                      </td>
                      <td className="px-6 py-4 font-bold flex items-center gap-2 hover:underline">
                        {faq.title}
                        {expandedFaqId === `faq-${faq.id}` ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-slate-400 font-mono">
                        {faq.views}
                      </td>
                    </tr>
                    {/* Expanded Content Panel */}
                    {expandedFaqId === `faq-${faq.id}` && (
                      <tr className="bg-slate-50/30 border-b border-slate-100">
                        <td colSpan={4} className="px-8 py-5 text-sm text-slate-600 leading-relaxed font-medium">
                          <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-inner flex gap-3">
                            <span className="text-blue-600 font-black text-base flex-shrink-0">A.</span>
                            <div>{faq.answer}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                // When displaying regular notice listings (if any, since notices are already pinned at top)
                filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-400 font-bold">
                      공지사항 내역이 존재하지 않습니다.
                    </td>
                  </tr>
                )
              )}

              {activeMenu === 'faq' && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400 font-bold">
                    검색 결과와 일치하는 자주 묻는 질문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
