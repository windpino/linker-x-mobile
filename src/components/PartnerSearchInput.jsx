import React, { useState, useRef, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { matchesInitialSound } from '../utils/koreanUtils';

const PartnerSearchInput = ({ partners, value, onChange, onSelect, placeholder = "거래처 검색...", typeFilter = null, autoFocus = false, currentUser = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isRestricted = currentUser?.restrictPartnerSearch && currentUser?.name && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && currentUser?.userId !== 'admin';

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
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

  const filteredPartners = (partners || []).filter(p => {
    if (isRestricted) {
      const pManager = (p.manager || '').trim();
      const uName = (currentUser.name || '').trim();
      if (pManager !== uName) return false;
    }
    const matchesType = typeFilter 
      ? (typeFilter === '매출처' 
          ? (!p.type || p.type === '매출처' || p.type === '매출' || p.type === '혼합' || p.type === '매입매출처' || p.type === '공통') 
          : typeFilter === '매입처' 
          ? (!p.type || p.type === '매입처' || p.type === '매입' || p.type === '혼합' || p.type === '매입매출처' || p.type === '공통') 
          : p.type === typeFilter) 
      : true;

    const cleanSearch = (searchTerm || '').trim();
    if (!cleanSearch) return matchesType;

    const matchesSearch = 
      matchesInitialSound(p.name, cleanSearch) ||
      (p.abbreviation && matchesInitialSound(p.abbreviation, cleanSearch)) ||
      (p.ceo && matchesInitialSound(p.ceo, cleanSearch)) ||
      (p.businessNo && String(p.businessNo).replace(/[^0-9]/g, '').includes(cleanSearch.replace(/[^0-9]/g, '')));

    return matchesType && matchesSearch;
  });

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
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (onChange) onChange(e.target.value);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            try { e.target.select(); } catch (err) {}
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
          style={{ width: '100%', padding: '6px 12px 6px 32px', fontSize: '0.82rem', height: '34px', boxSizing: 'border-box' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
      </div>

      {isOpen && (
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
          maxHeight: '300px',
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
                  padding: '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: index === selectedIndex ? '#eff6ff' : 'transparent',
                  color: index === selectedIndex ? '#1d4ed8' : '#1e293b'
                }}
              >
                <User size={16} color="#64748b" />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {p.name}
                      {p.abbreviation && p.abbreviation !== p.name && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                          ({p.abbreviation})
                        </span>
                      )}
                    </span>
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
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {p.ceo ? `대표: ${p.ceo}` : ''} {p.manager ? `| 담당: ${p.manager}` : ''}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
              {searchTerm ? '일치하는 거래처가 없습니다.' : '등록된 거래처가 없습니다.'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default PartnerSearchInput;
