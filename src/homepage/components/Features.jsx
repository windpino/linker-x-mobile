import React from 'react';
import { CheckCircle2, TrendingUp, Users, Building, HelpCircle } from 'lucide-react';

const Features = ({ notices = [] }) => {
  const activeNotices = notices.filter(n => n.isActive).slice(0, 3);
  
  return (
    <section id="features" className="py-24 bg-slate-950 text-white border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Features Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-5 text-left">
            <h2 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest mb-3">Key Features</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
              링커엑스가 선사하는<br/>비즈니스 파급 효과
            </h3>
            <p className="text-slate-400 leading-relaxed mb-8 text-sm md:text-base">
              업무 효율성 200% 상승, 전표 기입 오차 0%를 기록한 실제 고객사 지표를 확인하세요. Linker X 플랫폼이 실현하는 확실한 정성적/정량적 가치입니다.
            </p>

            <ul className="space-y-4">
              {[
                "지점/대리점별 실시간 결산 상태 자동 보고",
                "바코드 및 RFID 연계 모바일 재고 실사 자동화",
                "매출/매입 거래 이력 데이터의 암호화 보존",
                "주문서 기반 일일 출고 우선순위 AI 추천 시스템"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-300 font-semibold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Metrics Grid */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-6">
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
              <TrendingUp className="h-8 w-8 text-emerald-500 mb-6" />
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white block mb-2">35%</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">평균 연간 물류 관리비 절감 효과</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
              <Users className="h-8 w-8 text-indigo-500 mb-6" />
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white block mb-2">12,500+</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">전국 활성 플랫폼 누적 가입 유저</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
              <Building className="h-8 w-8 text-emerald-500 mb-6" />
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white block mb-2">100%</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">클라우드 데이터 자동 백업 및 이중화</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
              <HelpCircle className="h-8 w-8 text-amber-500 mb-6" />
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white block mb-2">24h</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">365일 실시간 관제 및 고객 지원 데스크</span>
              </div>
            </div>
          </div>

        </div>

        {/* Notices Section */}
        <div id="notice" className="border-t border-slate-900 pt-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">최신 공지사항</h3>
              <p className="text-slate-500 text-sm mt-1">Linker X 플랫폼의 새로운 업데이트와 중요 안내를 확인하세요.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {activeNotices.length > 0 ? (
              activeNotices.map((notice) => (
                <div key={notice.id} className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                  <div className="flex gap-4 items-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${notice.type === 'alert' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {notice.type === 'alert' ? '긴급' : '안내'}
                    </span>
                    <span className="font-bold text-white text-base">{notice.title}</span>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold">{notice.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]}</span>
                </div>
              ))
            ) : (
              <div className="bg-slate-900/20 border border-slate-900/60 p-10 text-center text-slate-500 rounded-2xl">
                등록된 최신 공지사항이 없습니다.
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Features;
