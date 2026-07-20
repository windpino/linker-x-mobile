import React, { useState } from 'react';
import { X, Send, ShieldCheck, Mail, Building2, User, Phone, Lock } from 'lucide-react';

const Inquiry = ({ onClose, onSubmitInquiry, initialType = 'general', initialContent = '', agencyCategories = [] }) => {
  const [inquiryType, setInquiryType] = useState(initialType); // 'general' or 'agency'
  const [companyName, setCompanyName] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(agencyCategories[0] || '유통업');
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !ceoName || !email || !contact) {
      alert('필수 입력 항목을 입력해 주세요.');
      return;
    }
    if (inquiryType === 'agency' && !password) {
      alert('대리점 로그인 계정 생성을 위해 사용할 비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        id: String(Date.now()),
        type: inquiryType,
        companyName,
        ceoName,
        email,
        contact,
        password: inquiryType === 'agency' ? password : '',
        category: inquiryType === 'agency' ? category : '',
        content,
        status: inquiryType === 'agency' ? 'pending' : 'received',
        appliedAt: new Date().toISOString()
      };
      
      const success = await onSubmitInquiry(data);
      if (success) {
        alert(inquiryType === 'agency' 
          ? '대리점 가입 신청이 성공적으로 접수되었습니다!\n마스터 관리자의 가입 승인 후 로그인하실 수 있습니다.' 
          : '도입 문의가 접수되었습니다. 담당자가 영업일 기준 24시간 내 연락드리겠습니다.'
        );
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('제출 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-500 h-7 w-7" />
            Linker X 도입 & 가입 신청
          </h3>
          <p className="text-slate-400 text-sm mt-1">양식을 작성해 주시면 신속하게 검토 및 연락드리겠습니다.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 mb-6">
          <button 
            type="button"
            onClick={() => setInquiryType('general')}
            className={`flex-1 text-center py-2.5 rounded-xl font-bold text-sm transition-all ${
              inquiryType === 'general' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            일반 도입 문의
          </button>
          <button 
            type="button"
            onClick={() => setInquiryType('agency')}
            className={`flex-1 text-center py-2.5 rounded-xl font-bold text-sm transition-all ${
              inquiryType === 'agency' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            대리점 가입 신청
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">회사명 <span className="text-red-500">*</span></label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none transition-all"
                  placeholder="회사명 또는 상호"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">대표자명 <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  value={ceoName}
                  onChange={e => setCeoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none transition-all"
                  placeholder="대표자 성함"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">대표 이메일 <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">연락처 <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none transition-all"
                  placeholder="010-0000-0000"
                  required
                />
              </div>
            </div>
          </div>

          {/* Conditional Fields for Agency Applications */}
          {inquiryType === 'agency' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">로그인 비밀번호 설정 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none transition-all"
                    placeholder="승인 시 사용할 비밀번호"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">대리점 카테고리 <span className="text-red-500">*</span></label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-sm outline-none transition-all h-[46px]"
                >
                  {agencyCategories.length > 0 
                    ? agencyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                    : <option value="일반유통">일반유통</option>
                  }
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">기타 요청사항</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-white text-sm outline-none transition-all resize-none"
              placeholder="추가적인 요구사항이나 문의사항을 기재해 주세요."
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-600/10 hover:shadow-blue-500/20 transition-all text-base mt-2 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            {isLoading ? '제출 중...' : '가입 및 도입 문의 제출'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Inquiry;
