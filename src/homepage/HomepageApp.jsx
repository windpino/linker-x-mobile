import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, collection, onSnapshot, setDoc, query, orderBy } from 'firebase/firestore';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Solution from './components/Solution';
import Features from './components/Features';
import Inquiry from './components/Inquiry';
import Support from './components/Support';

const HomepageApp = ({ onLoginClick }) => {
  const [content, setContent] = useState({});
  const [notices, setNotices] = useState([]);
  const [agencyCategories, setAgencyCategories] = useState([]);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState('general'); // 'general' or 'agency'
  const [subView, setSubView] = useState('main'); // 'main' or 'support'

  // Fetch CMS content and System Notices from Firebase
  useEffect(() => {
    // 1. Sync Homepage CMS content
    const contentUnsub = onSnapshot(doc(db, 'settings', 'homepage_content'), (snapshot) => {
      if (snapshot.exists()) {
        setContent(snapshot.data());
      }
    });

    // 2. Sync System Notices (for notice list)
    const noticesQuery = query(collection(db, 'system_notices'), orderBy('createdAt', 'desc'));
    const noticesUnsub = onSnapshot(noticesQuery, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Sync Agency Categories (for dropdown inside agency apply)
    const categoriesUnsub = onSnapshot(doc(db, 'settings', 'agencyCategories'), (snapshot) => {
      if (snapshot.exists()) {
        setAgencyCategories(snapshot.data().categories || []);
      }
    });

    return () => {
      contentUnsub();
      noticesUnsub();
      categoriesUnsub();
    };
  }, []);

  const handleSubmitInquiry = async (inquiryData) => {
    try {
      // Save new inquiry to the root 'agency_inquiries' collection in Firestore
      await setDoc(doc(db, 'agency_inquiries', inquiryData.id), inquiryData);
      return true;
    } catch (err) {
      console.error('Error submitting inquiry:', err);
      alert('접수 처리 중 문제가 발생했습니다: ' + err.message);
      return false;
    }
  };

  const [prefilledContent, setPrefilledContent] = useState('');
  const [stickyCategory, setStickyCategory] = useState('도입/설치 상담');
  const [stickyContact, setStickyContact] = useState('');
  const [stickyAgree, setStickyAgree] = useState(true);
  const [isSubmittingSticky, setIsSubmittingSticky] = useState(false);

  const handleOpenInquiry = (typeOrContent) => {
    if (typeof typeOrContent === 'string' && typeOrContent !== 'general' && typeOrContent !== 'agency') {
      setInquiryType('general');
      setPrefilledContent(typeOrContent);
    } else {
      setInquiryType(typeOrContent || 'general');
      setPrefilledContent('');
    }
    setIsInquiryOpen(true);
  };

  const handleStickySubmit = async (e) => {
    e.preventDefault();
    if (!stickyContact.trim()) {
      alert('연락처를 입력해 주세요.');
      return;
    }
    if (!stickyAgree) {
      alert('개인정보 수집 동의가 필요합니다.');
      return;
    }
    setIsSubmittingSticky(true);
    const data = {
      id: 'sticky_' + Date.now(),
      type: 'general',
      companyName: '간편 상담 신청자',
      ceoName: '간편 신청자',
      email: 'no-email@sticky.com',
      contact: stickyContact,
      password: '',
      category: '',
      content: `[간편 상담 신청] 분야: ${stickyCategory}`,
      status: 'received',
      appliedAt: new Date().toISOString()
    };
    const success = await handleSubmitInquiry(data);
    if (success) {
      alert('간편 상담 신청이 접수되었습니다. 곧 연락드리겠습니다!');
      setStickyContact('');
    }
    setIsSubmittingSticky(false);
  };

  const floatingMenuItems = [
    { label: '무료 상담 받기', topic: '무료 도입 상담 신청합니다.' },
    { label: '1분 견적 확인', topic: '1분 견적 확인 및 요금제 산정 문의합니다.' },
    { label: '내게 맞는 ERP 찾기', topic: '우리 업종에 맞는 맞춤형 ERP 분석을 요청합니다.' },
    { label: '빠른 A/S 요청', topic: '시스템 관련 빠른 A/S 및 기술 지원을 요청합니다.' },
    { label: '필요 기능 바로 요청', topic: '비즈니스에 추가로 필요한 맞춤형 기능 개발을 문의합니다.' },
    { label: '소개 혜택/이벤트', topic: '지인 소개 혜택 및 진행 중인 이벤트에 대해 문의합니다.' }
  ];

  return (
    <div className="font-sans antialiased text-slate-800 bg-white min-h-screen">
      
      {/* Navigation */}
      <Navbar 
        onOpenInquiry={() => handleOpenInquiry('general')} 
        onNavigateToLogin={onLoginClick} 
        onNavigateToSupport={() => setSubView('support')}
        onNavigateToHome={() => setSubView('main')}
      />

      {subView === 'main' ? (
        <>
          {/* Hero Section */}
          <Hero 
            onOpenInquiry={handleOpenInquiry}
            onOpenAgencyApply={() => handleOpenInquiry('agency')}
          />

          {/* Solution Section */}
          <Solution />

          {/* Features & Notices Section */}
          <Features notices={notices} />
        </>
      ) : (
        <Support notices={notices} onOpenInquiry={handleOpenInquiry} />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 text-slate-400 text-sm pb-32">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base">Linker X</span>
            <span>| © 2026 Linker X Corporation. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">이용약관</a>
            <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-white transition-colors">고객지원데스크</a>
          </div>
        </div>
      </footer>

      {/* Floating Widgets Container on the Right */}
      <div className="hidden lg:flex fixed right-6 top-20 z-40 flex-col gap-4 w-72">
        {/* Widget 1: Counselor Widget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
            <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-[#1d4ed8]">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs">전산도입 전문상담원</h4>
              <p className="text-[0.62rem] text-slate-400 font-medium">무료 원격 지원 서비스 제공</p>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "ID/PW 찾기", topic: "ID/PW 찾기 문의" },
              { label: "문제해결", topic: "시스템 오류 및 장애 해결 문의" },
              { label: "업데이트(재설치)", topic: "최신 업데이트 및 재설치 문의" },
              { label: "포인트(문자)/기간연장", topic: "포인트 충전 및 사용기간 연장 문의" },
              { label: "구독료조회", topic: "월 구독료 및 결제 조회" },
              { label: "사용기간조회", topic: "정품 라이선스 사용기간 조회" },
              { label: "체험판설치", topic: "체험판 수동 설치 및 지원" },
              { label: "계좌안내", topic: "결제용 가상계좌 및 입금 안내" }
            ].map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenInquiry(opt.topic)}
                className="bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-slate-700 hover:text-[#1d4ed8] py-2 px-1.5 rounded-lg text-[0.68rem] font-bold transition-all text-center h-10 flex items-center justify-center"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Bottom link */}
          <button 
            onClick={() => handleOpenInquiry("전문 상담원 직접 문의")}
            className="text-[0.68rem] font-extrabold text-[#1d4ed8] hover:underline bg-blue-50/50 rounded-lg py-2 border border-blue-100/50 text-center"
          >
            이곳을 클릭하셔서 문의를 남겨주세요.
          </button>
        </div>

        {/* Widget 2: Fast Links Widget */}
        <div className="flex flex-col">
          <div className="bg-[#1d4ed8] text-white text-center py-2 px-3 rounded-t-xl text-[0.7rem] font-black shadow-md">
            실시간 빠른 링크
          </div>
          <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl flex flex-col overflow-hidden shadow-lg">
            {floatingMenuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenInquiry(item.topic)}
                className="px-3 py-2.5 text-left text-[0.7rem] font-bold text-slate-600 hover:text-[#1d4ed8] hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Consultation Banner */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-[#c2410c] text-white py-3 px-4 shadow-[0_-5px_15px_rgba(0,0,0,0.15)]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Hotline info */}
          <div className="flex items-center gap-2 text-sm md:text-base font-extrabold tracking-tight">
            <span className="bg-white/20 px-2.5 py-0.5 rounded text-xs">실시간</span>
            <span>무료 도입상담</span>
            <span className="text-yellow-300 ml-1">02) 401-5121 | 1566-8680</span>
          </div>

          {/* Inline Form */}
          <form onSubmit={handleStickySubmit} className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Category Select */}
            <select
              value={stickyCategory}
              onChange={e => setStickyCategory(e.target.value)}
              className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-white/50 h-9"
            >
              <option value="도입/설치 상담" className="text-slate-800">도입/설치 상담</option>
              <option value="가격/구독 상담" className="text-slate-800">가격/구독 상담</option>
              <option value="기능 개선/추가" className="text-slate-800">기능 개선/추가</option>
              <option value="기타 문의" className="text-slate-800">기타 문의</option>
            </select>

            {/* Contact Input */}
            <input
              type="text"
              placeholder="연락처를 입력해주세요"
              value={stickyContact}
              onChange={e => setStickyContact(e.target.value)}
              className="bg-white text-slate-800 placeholder-slate-400 rounded-lg px-3.5 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400 h-9 w-44"
            />

            {/* Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[0.7rem] font-bold select-none">
              <input
                type="checkbox"
                checked={stickyAgree}
                onChange={e => setStickyAgree(e.target.checked)}
                className="rounded border-white/20 text-[#c2410c] focus:ring-0"
              />
              <span>개인정보수집 동의</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingSticky}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-900 font-extrabold text-xs px-5 py-2 rounded-lg transition-colors shadow-md h-9"
            >
              {isSubmittingSticky ? '접수 중...' : '상담신청'}
            </button>
          </form>

        </div>
      </div>

      {/* Inquiry Modal Popup */}
      {isInquiryOpen && (
        <Inquiry 
          onClose={() => setIsInquiryOpen(false)} 
          onSubmitInquiry={handleSubmitInquiry}
          initialType={inquiryType}
          initialContent={prefilledContent}
          agencyCategories={agencyCategories}
        />
      )}

    </div>
  );
};

export default HomepageApp;
