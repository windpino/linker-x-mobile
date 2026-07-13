import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send, Sparkles, MessageSquare, Bot, User, CheckCircle2, RefreshCw } from 'lucide-react';

const AgentChatModal = ({ currentUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Listen to Firestore messages in real-time
  useEffect(() => {
    const colRef = collection(db, 'companies', 'DMK', 'agentChats');
    const q = query(colRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // Cap at last 50 messages for rendering efficiency
      setMessages(msgs.slice(-50));
    });

    return () => unsubscribe();
  }, []);

  // 2. Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send message
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText('');

    try {
      await addDoc(collection(db, 'companies', 'DMK', 'agentChats'), {
        id: `msg_u_${Date.now()}`,
        timestamp: new Date().toISOString(),
        sender: currentUser?.userId || 'guest',
        senderName: currentUser?.name || '임지훈',
        text: textToSend,
        status: 'pending'
      });
    } catch (err) {
      console.error('Failed to send message to Firestore:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestionClick = (text) => {
    setInputText(text);
  };

  const suggestions = [
    "자주 찾는 메뉴 아이콘 크기 키워줘",
    "모바일 뒤로가기 제어 설정 상태 확인해줘",
    "매출전표 품목 가로 스크롤 완전 제거해줘"
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f8fafc',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* AI Header Info */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #bfdbfe'
          }}>
            <Sparkles size={16} color="#3b82f6" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              안티그래비티 AI 비서
            </h4>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              실시간 명령 채널 대기 중
            </p>
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
          👤 {currentUser?.name || '임지훈'} ({currentUser?.userId || 'windpino'})
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748b',
            textAlign: 'center',
            padding: '24px'
          }}>
            <MessageSquare size={36} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>대화 기록이 아직 없습니다.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>명령을 입력하여 코드 수정을 요청해보세요!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender !== 'IBG-Dev';
            const isSystemProgress = msg.text && (msg.text.includes('진행 중') || msg.text.includes('작업 중'));
            
            return (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: isSelf ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                {!isSelf && (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                    flexShrink: 0
                  }}>
                    <Bot size={14} color="#64748b" />
                  </div>
                )}
                <div style={{
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isSelf ? 'flex-end' : 'flex-start'
                }}>
                  {/* Sender Name */}
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>
                    {isSelf ? msg.senderName || '사용자' : '안티그래비티 (AI)'}
                  </span>
                  {/* Bubble */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    borderTopRightRadius: isSelf ? '2px' : '12px',
                    borderTopLeftRadius: isSelf ? '12px' : '2px',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    backgroundColor: isSelf ? '#4f46e5' : isSystemProgress ? '#fffbeb' : '#ffffff',
                    color: isSelf ? '#ffffff' : '#1e293b',
                    border: isSelf ? 'none' : isSystemProgress ? '1px solid #fef3c7' : '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    {msg.text}
                  </div>
                  {/* Status Indicator */}
                  {isSelf && (
                    <div style={{
                      fontSize: '0.62rem',
                      color: msg.status === 'processed' ? '#10b981' : msg.status === 'processing' ? '#3b82f6' : '#94a3b8',
                      marginTop: '4px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {msg.status === 'processed' ? (
                        <>
                          <CheckCircle2 size={10} /> 완료됨
                        </>
                      ) : msg.status === 'processing' ? (
                        <>
                          <RefreshCw size={10} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} /> 처리 중
                        </>
                      ) : (
                        '대기 중'
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion list */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        whiteSpace: 'nowrap'
      }}>
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(text)}
            style={{
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.color = '#3b82f6';
              e.currentTarget.style.borderColor = '#bfdbfe';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} style={{
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="AI에게 변경할 코드 명령을 내리세요..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '0.85rem',
            fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: !inputText.trim() || isSending ? '#94a3b8' : '#4f46e5',
            color: '#ffffff',
            border: 'none',
            cursor: !inputText.trim() || isSending ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s'
          }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

export default AgentChatModal;
