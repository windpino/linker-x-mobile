import React, { useState, useRef, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { matchesInitialSound } from '../utils/koreanUtils';

const PartnerSearchInput = ({ partners, value, onChange, onSelect, placeholder = "거래처 검색...", typeFilter = null, autoFocus = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

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

  const filteredPartners = partners.filter(p => {
    const matchesType = typeFilter ? p.type === typeFilter : true;
    const matchesSearch = matchesInitialSound(p.name, searchTerm);
    return matchesType && matchesSearch;
  });

  const handleSelect = (partner) => {
    setSearchTerm(partner.name);
    onChange(partner.name);
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
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
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
          style={{ width: '100%', paddingLeft: '32px' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
      </div>

      {isOpen && searchTerm && (
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
                key={p.id}
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.type} | {p.ceo || '-'}</span>
                </div>
              </li>
            ))
          ) : (
            <li style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
              검색 결과가 없습니다.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default PartnerSearchInput;
