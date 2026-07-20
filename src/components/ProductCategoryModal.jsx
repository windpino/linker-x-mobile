import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Edit2, Check, ChevronRight, AlertCircle } from 'lucide-react';
import WindowModal from './WindowModal';
import { db } from '../firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';

const ProductCategoryModal = ({ onClose, categories = [], setCategories, currentUser }) => {
  const [selectedLargeId, setSelectedLargeId] = useState(null);
  const [selectedMediumId, setSelectedMediumId] = useState(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Selection sync effect: reset selection if the selected category is deleted
  useEffect(() => {
    const currentIds = new Set(categories.map(c => String(c.id)));
    if (selectedLargeId && !currentIds.has(String(selectedLargeId))) {
      setSelectedLargeId(null);
      setSelectedMediumId(null);
    } else if (selectedMediumId && !currentIds.has(String(selectedMediumId))) {
      setSelectedMediumId(null);
    }
  }, [categories, selectedLargeId, selectedMediumId]);

  // Filter categories by level and parent
  const largeCategories = categories.filter(c => String(c.level) === '1' || !c.parentId);
  const mediumCategories = categories.filter(c => String(c.level) === '2' && String(c.parentId) === String(selectedLargeId));
  const smallCategories = categories.filter(c => String(c.level) === '3' && String(c.parentId) === String(selectedMediumId));

  const hasWritePermission = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.userId === 'admin') return true;
    return currentUser?.allowAllEditDelete === true;
  };

  const handleAdd = async (level, parentId) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    if (!newCategoryName.trim()) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      const nextId = categories.length > 0 ? Math.max(...categories.map(c => Number(c.id) || 0)) + 1 : 1;
      const newCat = { 
        id: nextId, 
        name: newCategoryName.trim(), 
        level: Number(level), 
        parentId: parentId ? Number(parentId) : null,
        companyId,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'companies', companyId, 'categories', String(nextId)), newCat);
      setNewCategoryName('');
    } catch (err) {
      console.error('Add category error:', err);
      alert('카테고리 추가 중 오류가 발생했습니다.');
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (id) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    const targetId = String(id);
    console.log('handleDelete triggered for ID:', targetId);
    setDeleteConfirmId(targetId);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const targetId = deleteConfirmId;
    const companyId = currentUser?.companyId || 'default';
    
    const getDescendants = (pid, all) => {
      let ids = [];
      all.filter(c => String(c.parentId) === String(pid)).forEach(child => {
        const childId = String(child.id);
        ids.push(childId);
        ids = [...ids, ...getDescendants(childId, all)];
      });
      return ids;
    };

    const idsToDelete = new Set([targetId, ...getDescendants(targetId, categories)]);
    console.log('Executing Delete for IDs in Firestore:', Array.from(idsToDelete));
    
    try {
      const batch = writeBatch(db);
      idsToDelete.forEach(id => {
        batch.delete(doc(db, 'companies', companyId, 'categories', String(id)));
      });
      await batch.commit();
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete category error:', err);
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleClearAll = async () => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    console.log('handleClearAll called');
    if (window.confirm('정말 모든 카테고리를 삭제하시겠습니까?')) {
      try {
        const companyId = currentUser?.companyId || 'default';
        const batch = writeBatch(db);
        categories.forEach(c => {
          batch.delete(doc(db, 'companies', companyId, 'categories', String(c.id)));
        });
        await batch.commit();
        setSelectedLargeId(null);
        setSelectedMediumId(null);
      } catch (err) {
        console.error('Clear all categories error:', err);
        alert('카테고리 전체 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const startEdit = (cat) => {
    if (!hasWritePermission()) {
      alert('마스터 데이터의 수정/삭제 권한이 없습니다.');
      return;
    }
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const saveEdit = async () => {
    if (!editingName.trim()) return;
    try {
      const companyId = currentUser?.companyId || 'default';
      const targetCat = categories.find(c => String(c.id) === String(editingId));
      if (targetCat) {
        const updatedCat = { 
          ...targetCat, 
          name: editingName.trim(), 
          updatedAt: new Date().toISOString() 
        };
        await setDoc(doc(db, 'companies', companyId, 'categories', String(editingId)), updatedCat);
      }
      setEditingId(null);
    } catch (err) {
      console.error('Edit category error:', err);
      alert('카테고리 수정 중 오류가 발생했습니다.');
    }
  };

  const renderColumn = (title, items, selectedId, onSelect, level, parentId) => (
    <div className="category-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', minHeight: '450px', background: '#fff' }}>
      <div className="column-header" style={{ padding: '12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#475569' }}>{title}</span>
        {level === 1 && items.length > 0 && (
          <button onClick={handleClearAll} style={{ padding: '2px 6px', fontSize: '0.7rem', color: '#ef4444', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>
            전체삭제
          </button>
        )}
      </div>
      <div className="column-content" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {level > 1 && !parentId ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            <AlertCircle size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.8rem' }}>상위 카테고리를<br/>먼저 선택하세요</p>
          </div>
        ) : (
          <>
            {items.map(cat => (
              <div 
                key={cat.id} 
                className={`category-item-v2 ${String(selectedId) === String(cat.id) ? 'active' : ''}`}
                onClick={() => onSelect(cat.id)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px',
                  backgroundColor: String(selectedId) === String(cat.id) ? '#eff6ff' : 'transparent',
                  border: String(selectedId) === String(cat.id) ? '1px solid #3b82f6' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {editingId === cat.id ? (
                  <input 
                    type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)}
                    autoFocus onClick={e => e.stopPropagation()}
                    style={{ flex: 1, padding: '4px', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: String(selectedId) === String(cat.id) ? 700 : 500, color: String(selectedId) === String(cat.id) ? '#1d4ed8' : '#1e293b' }}>
                    {cat.name}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {editingId === cat.id ? (
                    <button 
                      style={{ padding: '6px', border: '1px solid #10b981', background: '#ecfdf5', borderRadius: '4px', cursor: 'pointer', display: 'flex' }} 
                      onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                    >
                      <Check size={14} color="#10b981" />
                    </button>
                  ) : (
                    <button 
                      style={{ padding: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '4px', cursor: 'pointer', display: 'flex' }} 
                      onClick={(e) => { e.stopPropagation(); startEdit(cat); }}
                    >
                      <Edit2 size={14} color="#94a3b8" />
                    </button>
                  )}
                  
                  {String(deleteConfirmId) === String(cat.id) ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        onClick={(e) => { e.stopPropagation(); executeDelete(); }}
                      >
                        삭제
                      </button>
                      <button 
                        style={{ padding: '4px 8px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button 
                      style={{ padding: '6px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '4px', cursor: 'pointer', display: 'flex' }} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDelete(cat.id); 
                      }}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  )}
                  {level < 3 && <ChevronRight size={14} color="#cbd5e1" />}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#cbd5e1', fontSize: '0.8rem' }}>목록이 비어있습니다</div>
            )}
          </>
        )}
      </div>
      <div className="column-footer" style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input 
            type="text" placeholder="새 항목 추가..." 
            value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={level > 1 && !parentId}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd(level, parentId)}
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
          />
          <button 
            onClick={() => handleAdd(level, parentId)} disabled={level > 1 && !parentId}
            style={{ padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (level > 1 && !parentId) ? 0.5 : 1 }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <WindowModal title="카테고리 체계 관리 (3단계)" onClose={onClose} width="950px" contentPadding="0">
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {renderColumn("대분류 (Large)", largeCategories, selectedLargeId, (id) => { setSelectedLargeId(id); setSelectedMediumId(null); }, 1, null)}
        {renderColumn("중분류 (Medium)", mediumCategories, selectedMediumId, (id) => setSelectedMediumId(id), 2, selectedLargeId)}
        {renderColumn("소분류 (Small)", smallCategories, null, () => {}, 3, selectedMediumId)}
      </div>
    </WindowModal>
  );
};

export default ProductCategoryModal;
