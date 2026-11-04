import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Settings, Bot, Terminal, Activity, RefreshCw, Code, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import './ChatAssistant.css';

export default function ChatAssistant({ 
  context, 
  isDevMode = false, 
  companyId: propCompanyId = 'no1dmkr', 
  currentUser = null,
  isOpen: propIsOpen,
  onToggle
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const toggleOpen = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  const targetCompanyId = propCompanyId || currentUser?.companyId || 'no1dmkr';

  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState(() => {
    if (isDevMode) {
      return [
        {
          id: 'welcome',
          sender: 'agent',
          text: `🛠️ [Linker X 개발자 제어 콘솔 (Antigravity)]\n안녕하세요, ${currentUser?.name || '슈퍼관리자'}님!\n\n현재 모바일 원격 개발자 제어 모드가 연결되어 있습니다.\n\n외부에서 시스템 수정이나 새로운 기능 개발 지시를 여기에 입력하시면, PC의 Antigravity 에이전트가 직접 명령을 수신하여 실제 코딩 작업을 즉시 수행합니다.\n\n(예: "수주등록 화면에서 비고란 크기를 조금 줄여줘", "창고관리 모달에 검색 필터 추가해줘")`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'ready'
        }
      ];
    }
    return [
      {
        id: 'welcome',
        sender: 'agent',
        text: '안녕하세요! Linker X ERP AI 비서 미스링입니다. 무엇을 도와드릴까요?\n\n(시스템 컨텍스트 정보가 에이전트에 실시간 주입됩니다.)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [persona, setPersona] = useState(isDevMode ? 'Antigravity AI 개발자' : 'ERP 전문 관리 비서');
  const [systemPrompt, setSystemPrompt] = useState(
    isDevMode 
      ? '당신은 Linker X ERP 시스템을 직접 개발/수정하는 Antigravity 코딩 에이전트의 원격 제어 인터페이스입니다.'
      : '당신은 Linker X ERP 시스템의 영리한 AI 관리 비서 미스링입니다.'
  );
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const logEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Load recent dev commands if in dev mode
  useEffect(() => {
    if (!isDevMode || !targetCompanyId || !db) return;

    try {
      const q = query(
        collection(db, 'companies', targetCompanyId, 'devCommands'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const historyList = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          const time = d.createdAt ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          
          let statusText = '';
          if (d.status === 'pending') statusText = '⏳ 에이전트 수신 대기 중...';
          else if (d.status === 'running') statusText = `⚙️ 작업 진행 중 (${d.progress || '코딩 중'})`;
          else if (d.status === 'success') statusText = `✅ 작업 완료 (${d.result || d.message || '반영 완료'})`;
          else if (d.status === 'error') statusText = `❌ 오류: ${d.error || '실패'}`;

          historyList.push({
            id: docSnap.id,
            commandId: docSnap.id,
            sender: 'user',
            text: d.command || d.text,
            timestamp: time,
            status: d.status,
            progress: d.progress,
            result: d.result,
            statusText
          });
        });

        if (historyList.length > 0) {
          historyList.reverse(); // oldest to newest
          setMessages(prev => {
            const welcome = prev.find(m => m.id === 'welcome');
            return welcome ? [welcome, ...historyList] : historyList;
          });
        }
      }, (err) => {
        console.warn('Error reading devCommands:', err);
      });

      return () => unsub();
    } catch (e) {
      console.warn('devCommands setup error:', e);
    }
  }, [isDevMode, targetCompanyId]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ==========================================
    // 🛠️ 개발자 모드: Firestore devCommands 등록
    // ==========================================
    if (isDevMode) {
      setIsTyping(true);

      try {
        const newCmdData = {
          command: userText,
          text: userText,
          status: 'pending',
          source: 'miss_ring_mobile',
          author: currentUser?.name || '슈퍼관리자',
          companyId: targetCompanyId,
          createdAt: new Date().toISOString(),
          progress: '에이전트 수신 대기 중...'
        };

        // 1. devCommands 등록
        const docRef = await addDoc(collection(db, 'companies', targetCompanyId, 'devCommands'), newCmdData);

        // 2. agentCommands 등록 (동시 리스너 호환)
        await addDoc(collection(db, 'companies', targetCompanyId, 'agentCommands'), newCmdData).catch(() => {});

        // 3. 실시간 진행 상태 리스너 부착
        const unsub = onSnapshot(doc(db, 'companies', targetCompanyId, 'devCommands', docRef.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setMessages(prev => {
              return prev.map(m => {
                if (m.commandId === docRef.id || m.id === docRef.id) {
                  let statusText = '';
                  if (data.status === 'pending') statusText = '⏳ 에이전트 수신 대기 중...';
                  else if (data.status === 'running') statusText = `⚙️ 에이전트 작업 진행 중 (${data.progress || '코딩 중'})`;
                  else if (data.status === 'success') statusText = `✅ 작업 완료!\n${data.result || data.message || '지시하신 수정 사항이 성공적으로 반영되었습니다.'}`;
                  else if (data.status === 'error') statusText = `❌ 오류: ${data.error || '실패'}`;

                  return {
                    ...m,
                    status: data.status,
                    progress: data.progress,
                    result: data.result,
                    statusText
                  };
                }
                return m;
              });
            });

            if (data.status === 'success' || data.status === 'error') {
              setIsTyping(false);
              unsub();
            }
          }
        });

      } catch (err) {
        console.error('Failed to submit devCommand:', err);
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'agent',
            text: `❌ 명령 전송 중 오류가 발생했습니다: ${err.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsTyping(false);
      }

      return;
    }

    // ==========================================
    // 🤖 일반 미스링 AI 비서 모드
    // ==========================================
    const newUserMsg = { id: String(Date.now()), sender: 'user', text: userText, timestamp };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          persona: persona,
          system_prompt: systemPrompt,
          context: context,
          history: messages.slice(-10).map(m => ({ sender: m.sender, text: m.text }))
        }),
      });

      if (!response.ok) throw new Error('Backend offline');

      const data = await response.json();
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 1500 - elapsed);

      setTimeout(() => {
        setIsOnline(true);
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'agent',
            text: data.response || '응답을 받지 못했습니다.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, remainingDelay);
    } catch (err) {
      setIsOnline(false);
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 1500 - elapsed);

      setTimeout(() => {
        setIsTyping(false);
        const stats = context?.stats || {};
        const fallbackText = `[미스링 ERP 비서 안내]\n현재 시스템 컨텍스트:\n• 창고: ${stats.warehouseCount || 0}개소\n• 직원: ${stats.staffCount || 0}명\n• 거래처: ${stats.partnerCount || 0}개\n• 등록 품목: ${stats.productCount || 0}개\n\n문의하신 내용: "${userText}"\n자세한 내용은 업무 메뉴에서 확인하실 수 있습니다.`;
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'agent',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, remainingDelay);
    }
  };

  return (
    <div className="chat-assistant-container">
      {/* Floating Trigger Button (우측 하단) */}
      <button 
        className={`chat-trigger-btn ${isOpen ? 'open' : ''}`} 
        onClick={toggleOpen}
        title={isDevMode ? "개발자 제어 콘솔 (Antigravity)" : "미스링 AI 비서"}
        style={{
          backgroundColor: isDevMode ? '#16a34a' : '#2563eb',
          boxShadow: isDevMode ? '0 4px 15px rgba(22, 163, 74, 0.4)' : '0 4px 15px rgba(37, 99, 235, 0.4)'
        }}
      >
        {isOpen ? <X size={20} /> : (isDevMode ? <Code size={20} /> : <MessageSquare size={20} />)}
      </button>

      {/* Side Chat Drawer */}
      <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-header" style={{
          backgroundColor: isDevMode ? '#0f172a' : '#ffffff',
          color: isDevMode ? '#ffffff' : '#0f172a',
          borderBottom: isDevMode ? '1px solid #1e293b' : '1px solid #e2e8f0'
        }}>
          <div className="chat-header-title">
            {isDevMode ? (
              <Code size={20} color="#22c55e" strokeWidth={2.5} />
            ) : (
              <Bot size={20} color="#2563eb" />
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: isDevMode ? '#f8fafc' : '#0f172a' }}>
                {isDevMode ? 'Linker X 개발자 제어 콘솔' : 'Linker X AI 비서 (미스링)'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: isDevMode ? '#86efac' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                {isDevMode ? 'Antigravity 원격 에이전트 대기 중' : '실시간 ERP 비서'}
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button onClick={toggleOpen} title="닫기" style={{ color: isDevMode ? '#94a3b8' : '#475569' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 안내 배너 (개발자 모드) */}
        {isDevMode && (
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '10px 14px',
            borderBottom: '1px solid #334155',
            color: '#e2e8f0',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Terminal size={16} color="#4ade80" style={{ flexShrink: 0 }} />
            <span>외부 모바일에서 내린 지시를 <b>PC 안티그래비티 에이전트가 직접 수신</b>하여 즉시 코딩 작업을 수행합니다.</span>
          </div>
        )}

        {/* Chat Logs */}
        <div className="chat-logs" style={{ backgroundColor: isDevMode ? '#0b0f19' : '#f8fafc' }}>
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id || idx} className={`message-wrapper ${msg.sender}`} style={{ marginBottom: '12px' }}>
                <span className="message-sender" style={{ color: isDevMode ? '#94a3b8' : '#64748b' }}>
                  {isUser ? (currentUser?.name || '슈퍼관리자') : (isDevMode ? '🤖 Antigravity 에이전트' : '미스링 비서')}
                </span>
                
                <div 
                  className="message-bubble" 
                  style={{
                    backgroundColor: isUser 
                      ? (isDevMode ? '#15803d' : '#2563eb') 
                      : (isDevMode ? '#1e293b' : '#ffffff'),
                    color: isUser ? '#ffffff' : (isDevMode ? '#f1f5f9' : '#1e293b'),
                    border: isDevMode && !isUser ? '1px solid #334155' : 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    lineHeight: 1.6,
                    fontSize: '0.88rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}

                  {/* 개발자 모드 작업 상태 뱃지 및 결과 */}
                  {isDevMode && msg.status && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: msg.status === 'success' 
                        ? '#dcfce7' 
                        : (msg.status === 'running' ? '#fef3c7' : '#f1f5f9'),
                      color: msg.status === 'success' 
                        ? '#166534' 
                        : (msg.status === 'running' ? '#b45309' : '#475569'),
                      border: '1px solid rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {msg.status === 'pending' && <Clock size={13} />}
                      {msg.status === 'running' && <RefreshCw size={13} className="spin" />}
                      {msg.status === 'success' && <CheckCircle size={13} />}
                      {msg.status === 'error' && <AlertCircle size={13} />}
                      <span>{msg.statusText || msg.progress || msg.status}</span>
                    </div>
                  )}
                </div>

                <span className="message-time" style={{ color: '#94a3b8' }}>{msg.timestamp}</span>
              </div>
            );
          })}

          {isTyping && (
            <div className="typing-indicator" style={{ background: isDevMode ? '#1e293b' : '#e2e8f0' }}>
              <div className="typing-dot" style={{ background: isDevMode ? '#4ade80' : '#3b82f6' }}></div>
              <div className="typing-dot" style={{ background: isDevMode ? '#4ade80' : '#3b82f6' }}></div>
              <div className="typing-dot" style={{ background: isDevMode ? '#4ade80' : '#3b82f6' }}></div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="chat-input-area" style={{
          backgroundColor: isDevMode ? '#0f172a' : '#ffffff',
          borderTop: isDevMode ? '1px solid #1e293b' : '1px solid #e2e8f0'
        }}>
          <div className="chat-input-wrapper">
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isDevMode ? "Antigravity에 내릴 개발/수정 명령 입력..." : "메시지를 입력하세요..."}
              disabled={isTyping}
              style={{
                backgroundColor: isDevMode ? '#1e293b' : '#ffffff',
                color: isDevMode ? '#f8fafc' : '#0f172a',
                border: isDevMode ? '1px solid #334155' : '1px solid #cbd5e1'
              }}
            />
          </div>
          <button 
            type="submit" 
            className="send-btn" 
            disabled={!inputMessage.trim() || isTyping}
            style={{
              backgroundColor: isDevMode ? '#16a34a' : '#2563eb'
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
