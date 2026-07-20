import React from 'react';
import { Truck, Cpu, Network, ShieldCheck } from 'lucide-react';

const Solution = () => {
  return (
    <section id="solution" className="py-24 bg-slate-900 border-t border-slate-800 text-white relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest mb-3">Enterprise Solution</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            모든 비즈니스 단계를 하나로 연결하는 통합 허브
          </h3>
          <p className="text-slate-400 leading-relaxed text-sm md:text-base">
            재고 파악부터 출고 지시, 정산 결산까지 수작업 없는 자동화로 물류 유통 업무의 완벽한 가시성을 선사합니다.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-slate-950/60 p-8 rounded-3xl border border-emerald-500/30 transition-all group">
            <div className="bg-emerald-600/10 p-4 rounded-2xl w-fit mb-6 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Truck className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold mb-3">초보자도 5분 만에 배우는 직관적 UI</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              기존 ERP들의 무겁고 거부감 주는 격자 그리드 화면에서 벗어났습니다. 스마트폰 앱처럼 시각화된 인터페이스로 별도의 직원 교육 없이 현장에서 즉시 업무를 시작할 수 있습니다.
            </p>
          </div>

          <div className="bg-slate-950/60 p-8 rounded-3xl border border-emerald-500/30 transition-all group">
            <div className="bg-emerald-600/10 p-4 rounded-2xl w-fit mb-6 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Cpu className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold mb-3">AI 기반 지능형 물류·재고 최적화</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              인공지능(AI) 엔진이 대리점별 주문 이력과 배송 물류 흐름을 기계 학습합니다. 아침마다 최적의 차량별 배차 경로 지시와 예측 부족 품목 추천 알림을 제공하는 지능형 시스템입니다.
            </p>
          </div>

          <div className="bg-slate-950/60 p-8 rounded-3xl border border-emerald-500/30 transition-all group">
            <div className="bg-emerald-600/10 p-4 rounded-2xl w-fit mb-6 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Network className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold mb-3">원클릭 스마트 자동 회계 결산</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              매출 및 매입 전표가 발생하면 연동 거래처 미수금 정보가 장부와 실시간 자동 동기화됩니다. 번거로운 대조 작업 없이 단 한 번의 마우스 클릭으로 일일 정산이 완벽하게 완료됩니다.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Solution;
