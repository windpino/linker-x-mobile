import React, { useState, useRef, useEffect } from 'react';
import { Search, User, X } from 'lucide-react';
import { matchesInitialSound, getInitialSound } from '../utils/koreanUtils';

const PartnerSearchInput = ({ partners, value, onChange, onSelect, placeholder = "거래처 검색...", typeFilter = null, autoFocus = false, currentUser = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const isInitialMount = useRef(true);

  const isRestricted = currentUser?.restrictPartnerSearch && currentUser?.name && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && currentUser?.userId !== 'admin';

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanSearch = (searchTerm || '').trim();

  // 초성 또는 검색어가 입력되었을 때만 필터링 수행 (미입력 시 거래처 목록 미표시)
  const filteredPartners = (partners || [])
    .filter(p => {
      if (!cleanSearch) return false;

      if (isRestricted) {
        const pManager = (p.manager || '').trim();
        const uName = (currentUser?.name || '').trim();
        if (pManager !== uName) return false;
      }
      const matchesType = typeFilter 
        ? (typeFilter === '매출처' 
            ? (!p.type || p.type === '매출처' || p.type === '매출' || p.type === '혼합' || p.type === '매입매출처' || p.type === '공통') 
            : typeFilter === '매입처' 
            ? (!p.type || p.type === '매입처' || p.type === '매입' || p.type === '혼합' || p.type === '매입매출처' || p.type === '공통') 
            : p.type === typeFilter) 
        : true;

      if (!matchesType) return false;

      // 1. 거래처명 매칭 (초성 및 단어)
      if (matchesInitialSound(p.name, cleanSearch)) return true;

      // 2. 약칭 매칭
      if (p.abbreviation && matchesInitialSound(p.abbreviation, cleanSearch)) return true;

      // 3. 대표자명 매칭 (검색어가 2글자 이상일 때만 매칭하여 단일 초성 오탐 방지)
      if (cleanSearch.length >= 2 && p.ceo && matchesInitialSound(p.ceo, cleanSearch)) return true;

      // 4. 사업자번호 매칭 (숫자가 3자리 이상 입력되었을 때만 매칭)
      const searchNums = cleanSearch.replace(/[^0-9]/g, '');
      if (searchNums.length >= 3 && p.businessNo && String(p.businessNo).replace(/[^0-9]/g, '').includes(searchNums)) return true;

      return false;
    })
    .sort((a, b) => {
      // 1. 거래처명이 검색어로 시작하는 경우 최우선
      const aStarts = (a.name || '').toLowerCase().startsWith(cleanSearch.toLowerCase());
      const bStarts = (b.name || '').toLowerCase().startsWith(cleanSearch.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // 2. 거래처명 초성이 검색어(초성)로 시작하는 경우 우선
      const aInit = getInitialSound(a.name || '');
      const bInit = getInitialSound(b.name || '');
      const aInitStarts = aInit.startsWith(cleanSearch);
      const bInitStarts = bInit.startsWith(cleanSearch);
      if (aInitStarts && !bInitStarts) return -1;
      if (!aInitStarts && bInitStarts) return 1;

      // 3. 가나다순 정렬
      return (a.name || '').localeCompare(b.name || '');
    });

  useEffect(() => {
    setSelectedIndex(filteredPartners.length > 0 ? 0 : -1);
  }, [searchTerm, isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex !== -1 && listRef.current) {
      const activeItem = listRef.current.children[selectedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (partner) => {
    setSearchTerm(partner.name);
    if (onChange) onChange(partner.name);
    if (onSelect) onSelect(partner);
    setIsOpen(false);
  };

  return (
    <div className="partner-search-container" ref={containerRef} style={{ position: 'relative' }}>
      <div className="search-input-wrapper" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          lang="ko"
          autoComplete="off"
          value={searchTerm}
          placeholder={placeholder}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            if (val.trim().length > 0) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
            if (onChange) onChange(val);
          }}
          onFocus={(e) => {
            if (isInitialMount.current) return;
            if (cleanSearch) {
              setIsOpen(true);
              try { e.target.select(); } catch (err) {}
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev < filteredPartners.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
              if (isOpen && selectedIndex >= 0 && selectedIndex < filteredPartners.length) {
                e.preventDefault();
                handleSelect(filteredPartners[selectedIndex]);
              } else if (filteredPartners.length === 1) {
                handleSelect(filteredPartners[0]);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="partner-input"
          style={{ width: '100%', padding: '6px 28px 6px 32px', fontSize: '0.82rem', height: '34px', boxSizing: 'border-box' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        {searchTerm && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
              setIsOpen(false);
              if (onChange) onChange('');
              if (inputRef.current) inputRef.current.focus();
            }}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="검색어 지우기"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && cleanSearch && (
        <ul className="search-results-list" ref={listRef} style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          maxHeight: '260px',
          overflowY: 'auto',
          marginTop: '4px',
          padding: '4px 0',
          listStyle: 'none'
        }}>
          {filteredPartners.length > 0 ? (
            filteredPartners.map((p, index) => (
              <li
                key={p.id || index}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: index === selectedIndex ? '#eff6ff' : 'transparent',
                  color: index === selectedIndex ? '#1d4ed8' : '#1e293b'
                }}
              >
                <User size={15} color="#64748b" />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {p.name}
                      {p.abbreviation && p.abbreviation !== p.name && (
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                          ({p.abbreviation})
                        </span>
                      )}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {Number(p.receivables || 0) > 0 && (
                        <span style={{ fontSize: '0.73rem', color: '#ef4444', fontWeight: 700 }}>
                          미수: {Number(p.receivables || 0).toLocaleString()}원
                        </span>
                      )}
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '1px 6px', 
                        borderRadius: '4px', 
                        backgroundColor: p.type === '매입처' ? '#fef3c7' : p.type === '혼합' ? '#f3e8ff' : '#e0f2fe',
                        color: p.type === '매입처' ? '#b45309' : p.type === '혼합' ? '#7e22ce' : '#0369a1',
                        fontWeight: 700 
                      }}>
                        {p.type || '거래처'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {p.ceo ? `대표: ${p.ceo}` : ''} {p.manager ? `| 담당: ${p.manager}` : ''}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
              일치하는 거래처가 없습니다.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default PartnerSearchInput;
