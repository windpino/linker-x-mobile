import React from 'react';
import { Calendar, Plus, Clock, User, CheckCircle2, Trash2, Edit3, Copy, MessageSquare, Send } from 'lucide-react';
import WindowModal from './WindowModal';
import './Schedule.css';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const ScheduleList = ({ onClose, schedules = [], setSchedules, onAddSchedule, onCopy, onEdit, onDelete, currentUser, scheduleTypes = [] }) => {
  const getBadgeColors = (type) => {
    const match = scheduleTypes.find(t => t.name === type);
    if (match) {
      const baseColor = match.color;
      const bgColor = baseColor.startsWith('#') ? `${baseColor}26` : baseColor;
      return { bg: bgColor, text: baseColor, border: `${baseColor}80` };
    }

    switch (type) {
      case '입고예정':
        return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case '납품':
        return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case '업무지시':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case '회식':
        return { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' };
      case '휴무일':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      default:
        return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
    }
  };

  const [deletingId, setDeletingId] = React.useState(null);
  const today = new Date();
  const [commentInputs, setCommentInputs] = React.useState({});

  const handleCommentChange = (schId, text) => {
    setCommentInputs(prev => ({ ...prev, [schId]: text }));
  };

  const handleCommentSubmit = async (e, sch) => {
    e.preventDefault();
    const text = commentInputs[sch.id]?.trim();
    if (!text) return;

    const newComment = {
      id: Date.now(),
      author: currentUser?.name || '익명 직원',
      text: text,
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...(sch.comments || []), newComment];

    try {
      const companyId = currentUser?.companyId || 'default';
      const docRef = doc(db, 'companies', companyId, 'schedules', String(sch.id));
      await setDoc(docRef, { comments: updatedComments }, { merge: true });
      
      setSchedules(prev => prev.map(s => String(s.id) === String(sch.id) ? { ...s, comments: updatedComments } : s));
      setCommentInputs(prev => ({ ...prev, [sch.id]: '' }));
    } catch (err) {
      console.error("Error adding comment in ScheduleList:", err);
      alert('코멘트 등록에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (sch, commentId) => {
    if (window.confirm('코멘트를 삭제하시겠습니까?')) {
      const updatedComments = (sch.comments || []).filter(c => c.id !== commentId);
      try {
        const companyId = currentUser?.companyId || 'default';
        const docRef = doc(db, 'companies', companyId, 'schedules', String(sch.id));
        await setDoc(docRef, { comments: updatedComments }, { merge: true });
        
        setSchedules(prev => prev.map(s => String(s.id) === String(sch.id) ? { ...s, comments: updatedComments } : s));
      } catch (err) {
        console.error("Error deleting comment in ScheduleList:", err);
        alert('코멘트 삭제에 실패했습니다.');
      }
    }
  };

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Filter schedules that overlap with the current month (from 1st to today)
  const filteredSchedules = (schedules || []).filter(s => {
    const start = new Date(s.startDate || s.date);
    const end = new Date(s.endDate || s.startDate || s.date);
    if (isNaN(start.getTime())) return false;
    
    return (start <= today && end >= firstDayOfMonth);
  }).sort((a, b) => new Date(b.startDate || b.date) - new Date(a.startDate || a.date));

  const handleToggleCheck = (e, id) => {
    e.stopPropagation();
    
    if (!currentUser) {
      alert('로그인 정보가 없습니다.');
      return;
    }
    
    setSchedules(prev => {
      const newSchedules = prev.map(s => {
        if (s.id === id) {
          const currentViewers = s.viewers || [];
          const alreadyViewed = currentViewers.includes(currentUser.name);
          
          if (alreadyViewed) {
            return { ...s, viewers: currentViewers.filter(name => name !== currentUser.name) };
          } else {
            return { ...s, viewers: [...currentViewers, currentUser.name] };
          }
        }
        return s;
      });
      return newSchedules;
    });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: '?', month: '?', full: '날짜 정보 없음' };
    return {
      day: d.getDate(),
      month: `${d.getMonth() + 1}월`,
      full: d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    };
  };

  return (
    <WindowModal title="일정 목록" onClose={onClose} width="800px">
      <div className="schedule-list-container">
        <div className="sch-header">
          <div className="sch-title-section">
            <h2>
              <Calendar size={24} color="#3b82f6" />
              이달의 일정
            </h2>
            <p>{today.getMonth() + 1}월 1일 ~ 오늘까지의 일정입니다.</p>
          </div>
          <button className="btn-primary" onClick={onAddSchedule}>
            <Plus size={18} /> 일정 추가
          </button>
        </div>

        <div className="sch-items">
          {(() => {
            let lastDateStr = null;
            return filteredSchedules.map(sch => {
              const currentDateStr = sch.startDate || sch.date;
              const showDateHeader = currentDateStr !== lastDateStr;
              lastDateStr = currentDateStr;
              
              const dateInfo = formatDate(currentDateStr);
              const hasViewed = sch.viewers && sch.viewers.includes(currentUser?.name);
              const isAdmin = currentUser?.role === 'super_admin' || 
                              currentUser?.role === 'admin' || 
                              currentUser?.userId === 'admin' || 
                              currentUser?.allowAllEditDelete === true || 
                              currentUser?.name === '관리자';
              const isAuthor = currentUser?.name === sch.author || 
                               (currentUser?.name?.includes('김용규') && sch.author?.includes('김용규'));
              const canModify = isAdmin || isAuthor;
              
              return (
                <React.Fragment key={sch.id}>
                  {showDateHeader && (
                    <>
                      {lastDateStr !== null && (
                        <hr style={{ border: 'none', borderTop: '2px dashed #cbd5e1', margin: '24px 0 16px 0', width: '100%' }} />
                      )}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginTop: '20px', 
                        marginBottom: '12px' 
                      }}>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 800, 
                          color: '#475569', 
                          backgroundColor: '#f1f5f9', 
                          padding: '4px 12px', 
                          borderRadius: '20px',
                          border: '1px solid #cbd5e1',
                          whiteSpace: 'nowrap'
                        }}>
                          {dateInfo.full}
                        </span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                      </div>
                    </>
                  )}

                  <div 
                    className={`sch-item ${hasViewed ? 'viewed' : ''}`} 
                    onClick={(e) => handleToggleCheck(e, sch.id)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <div className="sch-date-box" style={{
                      backgroundColor: getBadgeColors(sch.type).bg,
                      color: getBadgeColors(sch.type).text,
                      border: `1.5px solid ${getBadgeColors(sch.type).border}`,
                      width: '64px',
                      height: '64px',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      flexShrink: 0
                    }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 800, 
                        textAlign: 'center',
                        lineHeight: '1.2',
                        wordBreak: 'break-all'
                      }}>
                        {sch.type}
                      </span>
                    </div>
                    <div className="sch-content">
                      <div className="sch-meta">
                        <span className="sch-type-badge" style={{ 
                          backgroundColor: getBadgeColors(sch.type).bg,
                          color: getBadgeColors(sch.type).text,
                          border: `1px solid ${getBadgeColors(sch.type).border}`
                        }}>
                          {sch.type}
                        </span>
                        <span className="sch-time">
                          <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          {sch.time || '시간 정보 없음'}
                          {sch.author && (
                            <>
                              <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span>
                              <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b' }}>
                                {sch.author}
                              </span>
                            </>
                          )}
                        </span>
                        
                        <div className="sch-check-status" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className={`custom-checkbox ${hasViewed ? 'checked' : ''}`}>
                            {hasViewed && <CheckCircle2 size={16} color="#ffffff" />}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: hasViewed ? '#10b981' : '#94a3b8' }}>
                            {hasViewed ? '확인됨' : '확인하기'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="sch-desc">{sch.description}</div>
                      
                      {/* Comments list shown directly with in-place addition and deletion */}
                      <div 
                        style={{ 
                          marginTop: '10px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '6px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #f1f5f9',
                          borderRadius: '8px',
                          padding: '10px'
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent toggling viewed state when clicking inside comment container
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={14} color="#3b82f6" />
                            코멘트 ({(sch.comments || []).length})
                          </span>
                        </div>

                        {/* Comments list */}
                        {(sch.comments || []).length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
                            {(sch.comments || []).map((comment) => (
                              <div 
                                key={comment.id} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'baseline', 
                                  justifyContent: 'space-between',
                                  gap: '6px',
                                  fontSize: '0.8rem',
                                  lineHeight: '1.4'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flex: 1 }}>
                                  <span style={{ 
                                    fontWeight: 700, 
                                    color: '#1e293b', 
                                    backgroundColor: '#f1f5f9', 
                                    padding: '1px 5px', 
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {comment.author}
                                  </span>
                                  <span style={{ color: '#334155', fontWeight: 500, wordBreak: 'break-all' }}>{comment.text}</span>
                                </div>
                                {comment.author === currentUser?.name && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteComment(sch, comment.id); }}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, padding: '0 4px' }}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment Form */}
                        <form 
                          onSubmit={(e) => { e.stopPropagation(); handleCommentSubmit(e, sch); }} 
                          style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
                        >
                          <input
                            type="text"
                            placeholder="한줄 코멘트 입력..."
                            value={commentInputs[sch.id] || ''}
                            onChange={(e) => handleCommentChange(sch.id, e.target.value)}
                            maxLength={100}
                            required
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              backgroundColor: '#f8fafc',
                              color: '#334155'
                            }}
                          />
                          <button
                            type="submit"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Send size={11} />
                            등록
                          </button>
                        </form>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
                        <div className="sch-viewers">
                          {sch.viewers && sch.viewers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>확인 완료:</span>
                              {sch.viewers.map((name, idx) => (
                                <span key={idx} className="viewer-badge">{name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="sch-author" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {canModify && (
                            <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(sch); }}
                                className="icon-btn-v2"
                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8' }}
                              >
                                <Edit3 size={14} />
                              </button>
                              {deletingId === sch.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      onDelete(sch.id); 
                                      setDeletingId(null);
                                    }}
                                    style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}
                                  >
                                    삭제
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                    style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748b', fontSize: '0.7rem' }}
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setDeletingId(sch.id);
                                  }}
                                  className="icon-btn-v2"
                                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}
          {filteredSchedules.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
              <Calendar size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>이달에 등록된 일정이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </WindowModal>
  );
};

export default ScheduleList;
