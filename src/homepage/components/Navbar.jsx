import React, { useState } from 'react';
import { Package, Menu, X, LogIn, Phone, HelpCircle } from 'lucide-react';

const Navbar = ({ onOpenInquiry, onNavigateToLogin, onNavigateToSupport, onNavigateToHome }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = (e, link) => {
    if (link.label === '고객지원') {
      e.preventDefault();
      if (onNavigateToSupport) onNavigateToSupport();
    } else {
      if (onNavigateToHome) onNavigateToHome();
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Left: Brand Identity Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateToHome}>
            <div className="bg-[#1d4ed8] p-2 rounded-lg text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-none">Linker X</span>
              <span className="text-[0.6rem] text-slate-500 font-semibold tracking-wider block mt-0.5">Since 2026</span>
            </div>
          </div>

          {/* Center: Main Navigation links */}
          <div className="hidden lg:flex items-center gap-6 font-bold text-slate-600 text-sm">
            {[
              { label: '제품소개', href: '#solution' },
              { label: '도매쇼핑몰', href: '#features' },
              { label: '제품구매', href: '#inquiry' },
              { label: '전산용지', href: '#inquiry' },
              { label: '하드웨어', href: '#inquiry' },
              { label: '고객지원', href: '#notice' }
            ].map((link, idx) => (
              <a 
                key={idx} 
                href={link.href} 
                onClick={(e) => handleLinkClick(e, link)}
                className="hover:text-[#1d4ed8] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={onNavigateToLogin}
              className="text-xs font-bold text-slate-600 hover:text-[#1d4ed8] px-3 py-2 transition-all"
            >
              로그인
            </button>
            <button 
              onClick={onOpenInquiry}
              className="text-xs font-bold text-slate-600 hover:text-[#1d4ed8] px-3 py-2 transition-all"
            >
              회원가입
            </button>

            {/* Remote Support Button (Orange badge) */}
            <button 
              onClick={() => window.open('https://helpu.kr', '_blank')}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>원격지원</span>
            </button>

            {/* Phone Hotline */}
            <div className="flex items-center gap-1 text-[#f97316] font-extrabold text-sm ml-2">
              <Phone className="h-4 w-4" />
              <span>1566-8680</span>
            </div>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-all"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 py-4 px-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-4 text-slate-700 text-sm font-bold">
            <a href="#solution" onClick={() => setIsOpen(false)} className="hover:text-[#1d4ed8] py-1 transition-colors">제품소개</a>
            <a href="#features" onClick={() => setIsOpen(false)} className="hover:text-[#1d4ed8] py-1 transition-colors">도매쇼핑몰</a>
            <a href="#inquiry" onClick={() => setIsOpen(false)} className="hover:text-[#1d4ed8] py-1 transition-colors">제품구매</a>
            <a href="#inquiry" onClick={() => setIsOpen(false)} className="hover:text-[#1d4ed8] py-1 transition-colors">전산용지</a>
            <a href="#inquiry" onClick={() => setIsOpen(false)} className="hover:text-[#1d4ed8] py-1 transition-colors">하드웨어</a>
            <a href="#notice" onClick={() => setIsOpen(false)} className="hover:text-[#1d4ed8] py-1 transition-colors">고객지원</a>
            
            <hr className="border-slate-100 my-1" />
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => { setIsOpen(false); onNavigateToLogin(); }}
                className="w-full text-center py-2.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                로그인
              </button>
              <button 
                onClick={() => { setIsOpen(false); onOpenInquiry(); }}
                className="w-full text-center py-2.5 rounded-lg bg-[#f97316] text-white font-bold hover:bg-[#ea580c]"
              >
                원격지원 (1566-8680)
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
