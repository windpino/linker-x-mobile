import React, { useState } from 'react';
import { 
  Building2, Users, DollarSign, CheckCircle2, AlertTriangle, ShieldCheck, 
  Server, Database, Cpu, Lock, ArrowUpRight, ArrowDownRight, ChevronRight, 
  Plus, UploadCloud, FileText, CalendarPlus, Settings, UserPlus, UserCheck, 
  Layers, Search, Calendar as CalendarIcon, Bell, ChevronDown, PieChart, 
  BarChart2, RefreshCw, Clock, ExternalLink
} from 'lucide-react';

const SuperAdminDashboard = ({
  companies = [],
  notices = [],
  onNavigateTab,
  onOpenAgencyModal,
  onOpenNoticeModal,
  onOpenScheduleModal
}) => {
  const [selectedRange, setSelectedRange] = useState('2026-10-01 ~ 2026-10-31');

  // Real or Fallback Top Companies
  const topCompanies = [
    { rank: 1, name: '동명크릴', amount: 324160000, growth: 27.7, share: 27.7 },
    { rank: 2, name: '척포낚시', amount: 216194000, growth: 18.5, share: 18.5 },
    { rank: 3, name: '박가이드', amount: 186420000, growth: 15.9, share: 15.9 },
    { rank: 4, name: '연화도낚시', amount: 148520000, growth: 12.7, share: 12.7 },
    { rank: 5, name: '기타낚시', amount: 119620000, growth: 10.2, share: 10.2 }
  ];

  // Recent Joined Companies
  const recentAgencies = companies && companies.length > 0 
    ? companies.slice(0, 5).map((c, i) => ({
        no: i + 1,
        name: c.name || c.companyName || '회원사',
        ceo: c.ceo || '대표자',
        date: c.createdAt ? String(c.createdAt).slice(0, 10) : '2026-10-31',
        status: '승인'
      }))
    : [
        { no: 1, name: '동명크릴', ceo: '김동영', date: '2026-10-31', status: '승인' },
        { no: 2, name: '척포낚시', ceo: '이준호', date: '2026-10-30', status: '승인' },
        { no: 3, name: '박가이드', ceo: '박인수', date: '2026-10-28', status: '승인' },
        { no: 4, name: '연화도낚시', ceo: '조영화', date: '2026-10-27', status: '승인' },
        { no: 5, name: '기타낚시', ceo: '김진수', date: '2026-10-26', status: '승인' }
      ];

  // Activities
  const activities = [
    { id: 1, icon: UserPlus, color: '#3b82f6', bg: '#eff6ff', text: "회원사 '동명크릴' 신규 가입 신청", time: '10-31 14:20' },
    { id: 2, icon: FileText, color: '#0d9488', bg: '#ccfbf1', text: '매출 데이터가 정상적으로 수집되었습니다.', time: '10-31 11:05' },
    { id: 3, icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7', text: '재고 부족 알림 (청개비)', time: '10-30 22:15' },
    { id: 4, icon: RefreshCw, color: '#8b5cf6', bg: '#f3e8ff', text: '시스템 점검 완료 (백업)', time: '10-29 09:12' },
    { id: 5, icon: Bell, color: '#2563eb', bg: '#dbeafe', text: '새로운 공지사항이 등록되었습니다.', time: '10-28 16:45' }
  ];

  // Notices
  const sampleNotices = [
    { type: '시스템', typeColor: '#3b82f6', typeBg: '#eff6ff', title: '시스템 점검 안내 (10/31)', date: '2026-10-30' },
    { type: '이벤트', typeColor: '#8b5cf6', typeBg: '#f3e8ff', title: '가을맞이 프로모션 진행 안내', date: '2026-10-28' },
    { type: '업데이트', typeColor: '#06b6d4', typeBg: '#ecfeff', title: 'ERP 기능 업데이트 안내', date: '2026-10-25' },
    { type: '일반', typeColor: '#64748b', typeBg: '#f1f5f9', title: '서비스 이용 가이드 안내', date: '2026-10-22' },
    { type: '중요', typeColor: '#ef4444', typeBg: '#fef2f2', title: '보안 정책 강화 안내', date: '2026-10-20' }
  ];

  return (
    <div className="sa-dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`
        .sa-dash-banner {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 18px 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .sa-dash-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .sa-dash-3col-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 900px) {
          .sa-dash-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
          .sa-dash-3col-grid {
            grid-template-columns: 1.18fr 1fr 0.88fr;
            gap: 20px;
          }
        }
        @media (min-width: 1280px) {
          .sa-dash-kpi-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 16px;
          }
        }
      `}</style>
      
      {/* 1. TOP WELCOME BANNER */}
      <div className="sa-dash-banner">
        {/* Left Welcome Text */}
        <div style={{ zIndex: 1 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
            안녕하세요, 슈퍼 관리자님
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
            오늘도 Linker X와 함께 더 효율적인 비즈니스를 만들어가세요.
          </p>
        </div>

        {/* Right Date Range Filter */}
        <div style={{
          zIndex: 1,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <CalendarIcon size={16} color="#3b82f6" />
          <div>
            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600 }}>조회 기간</div>
            <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700 }}>{selectedRange}</div>
          </div>
          <ChevronDown size={14} color="#64748b" style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {/* 2. SIX KPI STAT CARDS */}
      <div className="sa-dash-kpi-grid">
        {/* Card 1 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <Users size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>전체 회원사 수</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {companies.length > 0 ? companies.length : 48}개
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            ▲ 6.7% <span style={{ color: '#94a3b8', fontWeight: 500 }}>(전월 대비)</span>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488', flexShrink: 0 }}>
              <DollarSign size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>총 매출액</div>
              <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, wordBreak: 'keep-all' }}>
                11.69<span style={{ fontSize: '0.78rem', fontWeight: 700 }}>억원</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            ▲ 12.5% <span style={{ color: '#94a3b8', fontWeight: 500 }}>(전월 대비)</span>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
              <Users size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>전체 직원 수</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                1,248명
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            ▲ 8.3% <span style={{ color: '#94a3b8', fontWeight: 500 }}>(전월 대비)</span>
          </div>
        </div>

        {/* Card 4 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
              <CheckCircle2 size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>활성 회원사</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                45개
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            ▲ 9.1% <span style={{ color: '#94a3b8', fontWeight: 500 }}>(전월 대비)</span>
          </div>
        </div>

        {/* Card 5 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
              <AlertTriangle size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>미납 회원사</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                2개
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            ▼ 33.3% <span style={{ color: '#94a3b8', fontWeight: 500 }}>(전월 대비)</span>
          </div>
        </div>

        {/* Card 6 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
              <ShieldCheck size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>시스템 가동률</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                99.9%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            ▲ 0.2% <span style={{ color: '#94a3b8', fontWeight: 500 }}>(전월 대비)</span>
          </div>
        </div>
      </div>

      {/* 3. ROW 1: CHARTS & SYSTEM STATUS */}
      <div className="sa-dash-3col-grid">
        {/* Card 1: 최근 6개월 매출 추이 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>최근 6개월 매출 추이</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#3b82f6' }}></span>
                매출액
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '2px', backgroundColor: '#60a5fa' }}></span>
                전월대비 증감률
              </div>
            </div>
          </div>

          {/* SVG Bar + Line Chart */}
          <div style={{ flex: 1, minHeight: '160px', position: 'relative' }}>
            <svg viewBox="0 0 460 190" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <line x1="40" y1="20" x2="420" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="60" x2="420" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="100" x2="420" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="420" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
              
              <text x="35" y="24" textAnchor="end" fontSize="9" fill="#94a3b8">2,000</text>
              <text x="35" y="64" textAnchor="end" fontSize="9" fill="#94a3b8">1,500</text>
              <text x="35" y="104" textAnchor="end" fontSize="9" fill="#94a3b8">1,000</text>
              <text x="35" y="144" textAnchor="end" fontSize="9" fill="#94a3b8">500</text>
              <text x="35" y="174" textAnchor="end" fontSize="9" fill="#94a3b8">0</text>
              <text x="15" y="10" fontSize="8" fill="#94a3b8">(백만원)</text>

              <text x="425" y="30" fontSize="9" fill="#94a3b8">40%</text>
              <text x="425" y="75" fontSize="9" fill="#94a3b8">20%</text>
              <text x="425" y="125" fontSize="9" fill="#94a3b8">0%</text>
              <text x="425" y="165" fontSize="9" fill="#94a3b8">-20%</text>

              {[
                { m: '5월', x: 75, h: 90 },
                { m: '6월', x: 135, h: 105 },
                { m: '7월', x: 195, h: 112 },
                { m: '8월', x: 255, h: 115 },
                { m: '9월', x: 315, h: 122 },
                { m: '10월', x: 375, h: 130 }
              ].map(b => (
                <g key={b.m}>
                  <defs>
                    <linearGradient id={`barGrad_${b.m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#93c5fd" />
                    </linearGradient>
                  </defs>
                  <rect x={b.x - 14} y={170 - b.h} width="28" height={b.h} rx="4" fill={`url(#barGrad_${b.m})`} opacity="0.9" />
                  <text x={b.x} y="185" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">{b.m}</text>
                </g>
              ))}

              <path d="M 75,130 Q 105,100 135,95 T 195,105 T 255,115 T 315,102 T 375,85" fill="none" stroke="#2563eb" strokeWidth="2.5" />
              {[
                { x: 75, y: 130 },
                { x: 135, y: 95 },
                { x: 195, y: 105 },
                { x: 255, y: 115 },
                { x: 315, y: 102 },
                { x: 375, y: 85 }
              ].map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
              ))}
            </svg>
          </div>
        </div>

        {/* Card 2: 업종별 매출 비중 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <PieChart size={16} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>업종별 매출 비중</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="14" strokeDasharray="77.3 238.8" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="14" strokeDasharray="44.6 238.8" strokeDashoffset="-77.3" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#06b6d4" strokeWidth="14" strokeDasharray="37.2 238.8" strokeDashoffset="-121.9" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ec4899" strokeWidth="14" strokeDasharray="30.3 238.8" strokeDashoffset="-159.1" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="14" strokeDasharray="49.2 238.8" strokeDashoffset="-189.4" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>총 매출액</div>
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#0f172a' }}>11.69억원</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', flex: 1, minWidth: '120px' }}>
              {[
                { label: '낚시/레저', pct: '32.4%', color: '#3b82f6' },
                { label: '식품/음료', pct: '18.7%', color: '#10b981' },
                { label: '생활용품', pct: '15.6%', color: '#06b6d4' },
                { label: '패션/잡화', pct: '12.7%', color: '#ec4899' },
                { label: '기타', pct: '20.6%', color: '#f59e0b' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></span>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{item.label}</span>
                  </div>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: 시스템 현황 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>시스템 현황</h3>
            <span 
              onClick={() => onNavigateTab && onNavigateTab('settings')}
              style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
            >
              전체보기 &gt;
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
            {[
              { icon: Server, title: '서버 상태', status: '정상', sub: '가동률 99.9%' },
              { icon: Database, title: '데이터베이스', status: '정상', sub: '응답시간 12ms' },
              { icon: ShieldCheck, title: '백업 상태', status: '정상', sub: '최근 1일 전' },
              { icon: Cpu, title: 'API 연동', status: '정상', sub: '정상 운영' },
              { icon: Lock, title: '보안 상태', status: '정상', sub: '최근 이상 없음' }
            ].map(sys => (
              <div key={sys.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <sys.icon size={15} color="#64748b" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>{sys.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                    {sys.status}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, minWidth: '75px', textAlign: 'right' }}>
                    {sys.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. ROW 2: TABLES & ACTIVITIES & QUICK ACTIONS */}
      <div className="sa-dash-3col-grid">
        {/* Card 1: 최근 가입 회원사 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>최근 가입 회원사</h3>
            </div>
            <span 
              onClick={() => onNavigateTab && onNavigateTab('agencies')}
              style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
            >
              전체보기 &gt;
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '280px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '6px 4px', fontWeight: 600 }}>No</th>
                <th style={{ padding: '6px', fontWeight: 600 }}>회원사명</th>
                <th style={{ padding: '6px', fontWeight: 600 }}>대표자</th>
                <th style={{ padding: '6px', fontWeight: 600 }}>가입일</th>
                <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {recentAgencies.map((a, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: 600 }}>{a.no}</td>
                  <td style={{ padding: '8px 6px', color: '#0f172a', fontWeight: 700 }}>{a.name}</td>
                  <td style={{ padding: '8px 6px', color: '#475569' }}>{a.ceo}</td>
                  <td style={{ padding: '8px 6px', color: '#64748b' }}>{a.date}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap'
                    }}>
                      승인
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 2: 최근 활동 현황 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>최근 활동 현황</h3>
            <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}>
              전체보기 &gt;
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activities.map(act => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: act.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: act.color, flexShrink: 0 }}>
                    <act.icon size={13} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.text}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: 빠른 작업 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>빠른 작업</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', flex: 1 }}>
            <button 
              onClick={() => onOpenAgencyModal && onOpenAgencyModal()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                cursor: 'pointer', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem'
              }}
            >
              <UserPlus size={15} color="#2563eb" />
              회원사 등록
            </button>

            <button 
              onClick={() => alert('직원 등록 관리 메뉴를 실행합니다.')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                cursor: 'pointer', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem'
              }}
            >
              <UserCheck size={15} color="#0d9488" />
              직원 등록
            </button>

            <button 
              onClick={() => alert('데이터 업로드 기능을 실행합니다.')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                cursor: 'pointer', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem'
              }}
            >
              <UploadCloud size={15} color="#0284c7" />
              데이터 업로드
            </button>

            <button 
              onClick={() => onOpenNoticeModal && onOpenNoticeModal()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                cursor: 'pointer', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem'
              }}
            >
              <FileText size={15} color="#8b5cf6" />
              공지사항 작성
            </button>

            <button 
              onClick={() => onOpenScheduleModal && onOpenScheduleModal()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                cursor: 'pointer', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem'
              }}
            >
              <CalendarPlus size={15} color="#f59e0b" />
              이벤트 등록
            </button>

            <button 
              onClick={() => onNavigateTab && onNavigateTab('settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                cursor: 'pointer', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem'
              }}
            >
              <Settings size={15} color="#475569" />
              시스템 설정
            </button>
          </div>
        </div>
      </div>

      {/* 5. ROW 3: TOP 5, NOTICES & MONTHLY CHART */}
      <div className="sa-dash-3col-grid">
        {/* Card 1: 최근 매출 TOP 5 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <BarChart2 size={15} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>최근 매출 TOP 5</h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', minWidth: '300px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '6px 4px', fontWeight: 600 }}>순위</th>
                <th style={{ padding: '6px', fontWeight: 600 }}>회원사명</th>
                <th style={{ padding: '6px', fontWeight: 600, textAlign: 'right' }}>매출액</th>
                <th style={{ padding: '6px', fontWeight: 600, textAlign: 'right' }}>전월 대비</th>
                <th style={{ padding: '6px 4px', fontWeight: 600, textAlign: 'right' }}>비중</th>
              </tr>
            </thead>
            <tbody>
              {topCompanies.map(c => (
                <tr key={c.rank} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: 700 }}>{c.rank}</td>
                  <td style={{ padding: '8px 6px', color: '#0f172a', fontWeight: 700 }}>{c.name}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                    {c.amount.toLocaleString()}원
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                    ▲ {c.growth}%
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                    {c.share}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 2: 최근 공지사항 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>최근 공지사항</h3>
            <span 
              onClick={() => onNavigateTab && onNavigateTab('notices')}
              style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}
            >
              전체보기 &gt;
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sampleNotices.map((n, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '5px 0', borderBottom: '1px dashed #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{
                    backgroundColor: n.typeBg,
                    color: n.typeColor,
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}>
                    {n.type}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>{n.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: 월별 매출 현황 */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>월별 매출 현황</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                매출액
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#60a5fa' }}></span>
                전월대비
              </span>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '160px', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              right: '2px',
              top: '4px',
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              padding: '5px 10px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)',
              textAlign: 'center',
              zIndex: 10
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800 }}>1,169,400,000원</div>
              <div style={{ fontSize: '0.58rem', opacity: 0.9 }}>▲ 12.5%</div>
            </div>

            <svg viewBox="0 0 320 170" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <line x1="25" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="25" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="25" y1="100" x2="300" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="25" y1="140" x2="300" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />

              <text x="20" y="24" textAnchor="end" fontSize="8" fill="#94a3b8">2,000M</text>
              <text x="20" y="64" textAnchor="end" fontSize="8" fill="#94a3b8">1,500M</text>
              <text x="20" y="104" textAnchor="end" fontSize="8" fill="#94a3b8">1,000M</text>
              <text x="20" y="144" textAnchor="end" fontSize="8" fill="#94a3b8">500M</text>
              <text x="20" y="165" textAnchor="end" fontSize="8" fill="#94a3b8">0</text>

              {[
                { m: '5월', x: 55, h: 80 },
                { m: '6월', x: 95, h: 76 },
                { m: '7월', x: 135, h: 84 },
                { m: '8월', x: 175, h: 96 },
                { m: '9월', x: 215, h: 92 },
                { m: '10월', x: 255, h: 110, highlight: true }
              ].map(b => (
                <g key={b.m}>
                  <defs>
                    <linearGradient id={`mBar_${b.m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={b.highlight ? '#2563eb' : '#60a5fa'} />
                      <stop offset="100%" stopColor={b.highlight ? '#3b82f6' : '#93c5fd'} />
                    </linearGradient>
                  </defs>
                  <rect x={b.x - 10} y={160 - b.h} width="20" height={b.h} rx="3" fill={`url(#mBar_${b.m})`} />
                  <text x={b.x} y="172" textAnchor="middle" fontSize="9" fill={b.highlight ? '#2563eb' : '#64748b'} fontWeight={b.highlight ? '800' : '600'}>
                    {b.m}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SuperAdminDashboard;
