import React from 'react';
import { Check } from 'lucide-react';

const Hero = ({ onOpenInquiry }) => {
  return (
    <section className="relative bg-white pt-40 pb-20 overflow-hidden min-h-[85vh] flex items-center">
      
      {/* Background isometric design lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none opacity-60" />
      
      {/* Radial soft gradient glowing behind content */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/[0.02] blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Bold Marketing Message & Buttons */}
        <div className="lg:col-span-7 text-center lg:text-left flex flex-col justify-center">
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-800 tracking-tight leading-[1.2] mb-6">
            <span className="block text-slate-900 drop-shadow-sm">직원 1명 줄이는 프로그램</span>
            <span className="block text-[#1d4ed8] mt-2">월 3만</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-semibold mb-10 tracking-tight">
            판매 · 재고 · 현장영업 · 수발주 · 도매몰 통합관리
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8">
            <button 
              onClick={() => onOpenInquiry("2개월 무료 체험 신청")}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-base px-8 py-4 rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
            >
              2개월 무료 체험
            </button>
            <button 
              onClick={() => onOpenInquiry("도입 상담")}
              className="bg-white hover:bg-slate-50 text-[#1d4ed8] border-2 border-[#1d4ed8] font-extrabold text-base px-8 py-4 rounded-full shadow-sm transition-all duration-200"
            >
              도입 전 무료 상담
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-[#1d4ed8]" /> 가입비/설치비 무료</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-[#1d4ed8]" /> 약정 및 위약금 없음</span>
          </div>

        </div>

        {/* Right Side: Spacer to allow the fixed floating widgets to sit nicely on desktop first view */}
        <div className="hidden lg:block lg:col-span-5 h-[350px] pointer-events-none" />

      </div>
    </section>
  );
};

export default Hero;
