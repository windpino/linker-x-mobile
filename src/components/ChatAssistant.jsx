import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, X, Send, Bot, Terminal, RefreshCw, Code, 
  CheckCircle, Clock, AlertCircle, Mic, MicOff, Maximize2, 
  Minimize2, ShoppingCart, DollarSign, Package, Users, 
  Calendar, ArrowRight, Sparkles, Activity
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import './ChatAssistant.css';

export default function ChatAssistant({ 
  context = {}, 
  companyId: propCompanyId = 'no1dmkr', 
  currentUser = null,
  isOpen: propIsOpen,
  onToggle
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const toggleOpen = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  const targetCompanyId = propCompanyId || currentUser?.companyId || 'no1dmkr';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      sender: 'agent',
      text: `🟢 [미스링 온라인 개발자 콘솔 (Antigravity)]\n안녕하세요, ${currentUser?.name || '슈퍼관리자'}님!\n\n현재 PC 안티그래비티 코딩 에이전트와 실시간 온라인 연동되었습니다.\n\n이곳에 프로그램 수정, UI 개선, 기능 추가 지시를 내리시면 안티그래비티가 직접 수신하여 실제 코딩 작업을 즉시 실행합니다.\n\n(예: "수주등록 화면에서 저장 버튼 색상을 진한 파랑으로 바꿔줘", "모바일 화면 여백을 조금 더 넓혀줘")`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'dev',
      status: 'ready'
    }
  ]);

  const logEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll chat logs
  useEffect(() => {
    if (isOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Load recent dev commands in real-time
  useEffect(() => {
    if (!targetCompanyId || !db) return;

    try {
      const q = query(
        collection(db, 'companies', targetCompanyId, 'devCommands'),
        orderBy('createdAt', 'desc'),
        limit(8)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const historyList = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          const time = d.createdAt ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          
          let statusText = '';
          if (d.status === 'pending') statusText = '⏳ 안티그래비티 에이전트 수신 대기 중...';
          else if (d.status === 'running') statusText = `⚙️ 코딩 작업 진행 중 (${d.progress || '코드 수정 중'})`;
          else if (d.status === 'success') statusText = `✅ 작업 반영 완료!\n${d.result || d.message || '요청하신 코딩 작업이 성공적으로 반영되었습니다.'}`;
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
            statusText,
            mode: 'dev'
          });
        });

        if (historyList.length > 0) {
          historyList.reverse();
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
  }, [targetCompanyId]);

  // Speech Recognition (Voice Input)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.lang = 'ko-KR';
      recognizer.continuous = false;
      recognizer.interimResults = true;

      recognizer.onstart = () => {
        setIsListening(true);
        setVoiceError('');
      };

      recognizer.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputMessage(transcript);
      };

      recognizer.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setVoiceError('음성을 인식하지 못했습니다. 다시 시도해 주세요.');
        }
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('현재 브라우저 환경에서는 음성 인식을 지원하지 않습니다.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  };

  // Core Send Logic: writes directly to Firestore devCommands to wake up Antigravity
  const sendMessage = async (customText = null) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isTyping) return;

    setInputMessage('');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIsTyping(true);

    try {
      const newCmdData = {
        command: textToSend,
        text: textToSend,
        status: 'pending',
        source: 'miss_ring_mobile',
        author: currentUser?.name || '슈퍼관리자',
        companyId: targetCompanyId,
        createdAt: new Date().toISOString(),
        progress: '안티그래비티 에이전트 수신 대기 중...'
      };

      // 1. Register command to Firestore
      const docRef = await addDoc(collection(db, 'companies', targetCompanyId, 'devCommands'), newCmdData);
      await addDoc(collection(db, 'companies', targetCompanyId, 'agentCommands'), newCmdData).catch(() => {});

      // 2. Attach real-time snapshot listener to this doc
      const unsub = onSnapshot(doc(db, 'companies', targetCompanyId, 'devCommands', docRef.id), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMessages(prev => {
            return prev.map(m => {
              if (m.commandId === docRef.id || m.id === docRef.id) {
                let statusText = '';
                if (data.status === 'pending') statusText = '⏳ 안티그래비티 에이전트 수신 대기 중...';
                else if (data.status === 'running') statusText = `⚙️ 코딩 작업 진행 중 (${data.progress || '코드 수정 중'})`;
                else if (data.status === 'success') statusText = `✅ 작업 반영 완료!\n${data.result || data.message || '요청하신 코딩 작업이 성공적으로 반영되었습니다.'}`;
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
          timestamp,
          mode: 'dev'
        }
      ]);
      setIsTyping(false);
    }
  };

  // Quick Chips for program modification & dev commands
  const quickChips = useMemo(() => [
    { label: '⚡ 에이전트 연결 상태 점검', prompt: '안티그래비티 백그라운드 데몬 및 시스템 연결 상태를 점검해줘' },
    { label: '📱 모바일 수주화면 간소화 확인', prompt: '모바일 수주등록 간편 화면의 반응형 및 필드를 점검해줘' },
    { label: '🎨 모바일 UI/UX 최적화', prompt: '모바일 화면 폰트와 터치 여백을 모바일 친화적으로 가다듬어줘' },
    { label: '🔍 코드 빌드 및 무결성 검사', prompt: '모바일 프로젝트 npm run build 및 오류 여부를 검사해줘' },
    { label: '🔄 최근 실행 기록 요약', prompt: '최근 수행된 개발 명령 목록과 결과를 요약해줘' }
  ], []);

  return (
    <div className="chat-assistant-container">
      {/* 1. Backdrop Overlay for Mobile Sheet */}
      <div 
        className={`chat-backdrop-overlay ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
      />

      {/* 2. Floating Action Button (FAB) */}
      <button 
        className={`chat-trigger-btn dev-mode ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
        title="미스링 온라인 개발자 제어 콘솔 (Antigravity)"
      >
        {isOpen ? <X size={22} /> : <Terminal size={22} />}
        {!isOpen && <span className="chat-trigger-pulse" />}
      </button>

      {/* 3. Main Chat Panel (Slide-up Bottom Sheet on Mobile / Drawer on Desktop) */}
      <div className={`chat-panel ${isOpen ? 'open' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
        
        {/* Mobile Drag Indicator Handle */}
        <div className="chat-drag-handle" onClick={toggleOpen} />

        {/* Header */}
        <div className="chat-header" style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid #1e293b'
        }}>
          <div className="chat-header-title">
            <Terminal size={19} color="#4ade80" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>
                  미스링 개발자 제어 콘솔
                </h3>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#14532d', color: '#86efac', border: '1px solid #22c55e', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  온라인 🟢
                </span>
              </div>
              <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                Antigravity 실시간 코딩 엔진 연동
              </span>
            </div>
          </div>

          {/* Action Buttons (Fullscreen, Close) */}
          <div className="chat-header-actions">
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              title={isFullscreen ? "기본 크기로" : "전체화면"}
              style={{ color: '#94a3b8' }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              onClick={toggleOpen} 
              title="닫기"
              style={{ color: '#94a3b8' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Action Suggestion Chips */}
        <div 
          className="chat-quick-chips-wrapper"
          style={{
            backgroundColor: '#111827',
            borderBottom: '1px solid #1f2937'
          }}
        >
          <div className="chat-quick-chips">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                className="quick-chip-btn dev"
                onClick={() => sendMessage(chip.prompt)}
                style={{
                  backgroundColor: '#1f2937',
                  color: '#e2e8f0',
                  borderColor: '#374151'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Error Banner */}
        {voiceError && (
          <div style={{ padding: '6px 12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', textAlign: 'center' }}>
            {voiceError}
          </div>
        )}

        {/* Chat Logs Area */}
        <div className="chat-logs dev-theme">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={msg.id || idx} 
                className={`message-wrapper ${msg.sender} dev-bubble`}
              >
                <span className="message-sender" style={{ color: '#94a3b8' }}>
                  {isUser ? (currentUser?.name || '슈퍼관리자') : '🤖 Antigravity 코딩 에이전트'}
                </span>

                <div 
                  className="message-bubble"
                  style={{
                    backgroundColor: isUser ? '#16a34a' : '#1e293b',
                    color: isUser ? '#ffffff' : '#f1f5f9',
                    border: !isUser ? '1px solid #334155' : 'none'
                  }}
                >
                  {msg.text}

                  {/* Dev Mode Real-time Status Badge */}
                  {msg.status && (
                    <div style={{
                      marginTop: '8px',
                      padding: '7px 11px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: msg.status === 'success' 
                        ? '#dcfce7' 
                        : (msg.status === 'running' ? '#fef3c7' : '#1e293b'),
                      color: msg.status === 'success' 
                        ? '#166534' 
                        : (msg.status === 'running' ? '#b45309' : '#94a3b8'),
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {msg.status === 'pending' && <Clock size={14} />}
                      {msg.status === 'running' && <RefreshCw size={14} className="spin" />}
                      {msg.status === 'success' && <CheckCircle size={14} />}
                      {msg.status === 'error' && <AlertCircle size={14} />}
                      <span>{msg.statusText || msg.progress || msg.status}</span>
                    </div>
                  )}
                </div>

                <span className="message-time">{msg.timestamp}</span>
              </div>
            );
          })}

          {isTyping && (
            <div className="typing-indicator" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <div className="typing-dot" style={{ backgroundColor: '#4ade80' }}></div>
              <div className="typing-dot" style={{ backgroundColor: '#4ade80' }}></div>
              <div className="typing-dot" style={{ backgroundColor: '#4ade80' }}></div>
            </div>
          )}

          <div ref={logEndRef} />
        </div>

        {/* Voice Recording Active Notice */}
        {isListening && (
          <div className="voice-recording-banner">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mic size={15} /> 음성을 듣고 있습니다... 말씀해 주세요
            </span>
            <button 
              onClick={toggleVoiceRecognition}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
            >
              종료
            </button>
          </div>
        )}

        {/* Input Form */}
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }} 
          className="chat-input-area"
          style={{
            backgroundColor: '#0f172a',
            borderTop: '1px solid #1e293b'
          }}
        >
          <div className="chat-input-wrapper">
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Antigravity에 내릴 프로그램 수정 명령 입력..."
              disabled={isTyping}
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                borderColor: '#334155'
              }}
            />
            {/* Mic Button */}
            <button
              type="button"
              className={`mic-toggle-btn ${isListening ? 'recording' : ''}`}
              onClick={toggleVoiceRecognition}
              title={isListening ? "음성 인식 중지" : "음성으로 말하기"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          <button 
            type="submit" 
            className="send-btn dev-send"
            disabled={!inputMessage.trim() || isTyping}
          >
            <Send size={17} />
          </button>
        </form>

      </div>
    </div>
  );
}
