import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, X, Send, Bot, Terminal, RefreshCw, Code, 
  CheckCircle, Clock, AlertCircle, Mic, MicOff, Maximize2, 
  Minimize2, ShoppingCart, DollarSign, Package, Users, 
  Calendar, ArrowRight, Sparkles
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import './ChatAssistant.css';

export default function ChatAssistant({ 
  context = {}, 
  isDevMode: propIsDevMode = false, 
  companyId: propCompanyId = 'no1dmkr', 
  currentUser = null,
  isOpen: propIsOpen,
  onToggle,
  onOpenSalesOrder,
  onOpenOrderReport,
  onOpenPartnerManager,
  onOpenProductManager,
  onOpenReceivablesReport,
  onOpenCashBook,
  onOpenScheduleList,
  onOpenInventoryReport,
  salesOrders = [],
  partners = [],
  products = []
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const toggleOpen = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  const targetCompanyId = propCompanyId || currentUser?.companyId || 'no1dmkr';

  // Mode: 'assistant' (미스링 비서) or 'dev' (개발자 콘솔)
  const [currentMode, setCurrentMode] = useState(propIsDevMode ? 'dev' : 'assistant');

  useEffect(() => {
    if (propIsDevMode) {
      setCurrentMode('dev');
    }
  }, [propIsDevMode]);

  const isDevActive = currentMode === 'dev';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      sender: 'agent',
      text: propIsDevMode 
        ? `🛠️ [Linker X 개발자 제어 콘솔 (Antigravity)]\n안녕하세요, ${currentUser?.name || '관리자'}님!\n모바일 원격 개발 제어 모드가 준비되었습니다.\n\n수정 요청이나 개선 지시를 남겨주시면 PC 안티그래비티 에이전트가 직접 수신하여 코딩 작업을 진행합니다.`
        : `👋 안녕하세요! Linker X ERP 모바일 AI 비서 미스링입니다.\n오늘의 수주, 미수금, 재고, 일정 등 무엇이든 물어보세요!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: propIsDevMode ? 'dev' : 'assistant',
      actions: propIsDevMode ? [] : [
        { label: '📝 신규 수주 등록', action: 'sales_order' },
        { label: '📊 오늘 수주 브리핑', action: 'order_summary' }
      ]
    }
  ]);

  const logEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll chat logs
  useEffect(() => {
    if (isOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, currentMode]);

  // Load recent dev commands in Dev mode
  useEffect(() => {
    if (!isDevActive || !targetCompanyId || !db) return;

    try {
      const q = query(
        collection(db, 'companies', targetCompanyId, 'devCommands'),
        orderBy('createdAt', 'desc'),
        limit(6)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const historyList = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          const time = d.createdAt ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          
          let statusText = '';
          if (d.status === 'pending') statusText = '⏳ 안티그래비티 에이전트 대기 중...';
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
            statusText,
            mode: 'dev'
          });
        });

        if (historyList.length > 0) {
          historyList.reverse();
          setMessages(prev => {
            const welcome = prev.find(m => m.id === 'welcome');
            const otherAssistant = prev.filter(m => m.mode === 'assistant');
            return welcome ? [welcome, ...otherAssistant, ...historyList] : historyList;
          });
        }
      }, (err) => {
        console.warn('Error reading devCommands:', err);
      });

      return () => unsub();
    } catch (e) {
      console.warn('devCommands setup error:', e);
    }
  }, [isDevActive, targetCompanyId]);

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

  // Quick Action execution handler
  const handleExecuteAction = (actionKey) => {
    if (actionKey === 'sales_order' && onOpenSalesOrder) {
      toggleOpen();
      onOpenSalesOrder();
    } else if (actionKey === 'order_report' && onOpenOrderReport) {
      toggleOpen();
      onOpenOrderReport();
    } else if (actionKey === 'partner_manager' && onOpenPartnerManager) {
      toggleOpen();
      onOpenPartnerManager();
    } else if (actionKey === 'product_manager' && onOpenProductManager) {
      toggleOpen();
      onOpenProductManager();
    } else if (actionKey === 'receivables' && onOpenReceivablesReport) {
      toggleOpen();
      onOpenReceivablesReport();
    } else if (actionKey === 'cash_book' && onOpenCashBook) {
      toggleOpen();
      onOpenCashBook();
    } else if (actionKey === 'schedule' && onOpenScheduleList) {
      toggleOpen();
      onOpenScheduleList();
    } else if (actionKey === 'inventory' && onOpenInventoryReport) {
      toggleOpen();
      onOpenInventoryReport();
    }
  };

  // Handle Quick Chips click
  const handleQuickChip = (chip) => {
    if (chip.directAction) {
      handleExecuteAction(chip.directAction);
      return;
    }
    sendMessage(chip.prompt);
  };

  // Core Send Logic
  const sendMessage = async (customText = null) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isTyping) return;

    setInputMessage('');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. DEV MODE
    if (isDevActive) {
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
          progress: '에이전트 수신 대기 중...'
        };

        const docRef = await addDoc(collection(db, 'companies', targetCompanyId, 'devCommands'), newCmdData);
        await addDoc(collection(db, 'companies', targetCompanyId, 'agentCommands'), newCmdData).catch(() => {});

        const unsub = onSnapshot(doc(db, 'companies', targetCompanyId, 'devCommands', docRef.id), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setMessages(prev => {
              return prev.map(m => {
                if (m.commandId === docRef.id || m.id === docRef.id) {
                  let statusText = '';
                  if (data.status === 'pending') statusText = '⏳ 안티그래비티 에이전트 대기 중...';
                  else if (data.status === 'running') statusText = `⚙️ 작업 진행 중 (${data.progress || '코딩 중'})`;
                  else if (data.status === 'success') statusText = `✅ 작업 완료!\n${data.result || data.message || '요청하신 개발/수정 내용이 성공적으로 반영되었습니다.'}`;
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
      return;
    }

    // 2. ASSISTANT MODE (미스링 모바일 비서)
    const userMsg = { id: String(Date.now()), sender: 'user', text: textToSend, timestamp, mode: 'assistant' };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Smart Local ERP Fallback / Offline Response Generator
    const generateSmartErpReply = (query) => {
      const q = query.toLowerCase();
      const stats = context?.stats || {};
      const todayStr = new Date().toISOString().split('T')[0];

      // 수주 관련 질의
      if (q.includes('수주') || q.includes('주문') || q.includes('오더')) {
        const todayOrders = (salesOrders || []).filter(o => o.orderDate === todayStr || o.date === todayStr);
        const count = todayOrders.length;
        const totalAmt = todayOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.amount || 0)), 0);

        return {
          text: `📦 [오늘의 수주 브리핑]\n• 오늘 접수 건수: ${count}건\n• 총 주문 금액: ${totalAmt.toLocaleString()}원\n\n모바일 화면에서 바로 신규 수주를 간편 등록하시거나 수주 내역을 확인하실 수 있습니다.`,
          actions: [
            { label: '📝 간편 수주등록 바로가기', action: 'sales_order', primary: true },
            { label: '📋 수주 보고서 전체보기', action: 'order_report' }
          ]
        };
      }

      // 미수금 관련 질의
      if (q.includes('미수') || q.includes('외상') || q.includes('수금')) {
        return {
          text: `💰 [미수금 관리 현황]\n등록된 거래처 ${stats.partnerCount || partners?.length || 0}곳 중 미수금이 관리되고 있습니다.\n상세 거래처별 잔액 및 미수금 현황 보고서로 바로 연결해 드릴까요?`,
          actions: [
            { label: '💵 미수금 현황 보고서 열기', action: 'receivables', primary: true },
            { label: '🏢 거래처 관리 이동', action: 'partner_manager' }
          ]
        };
      }

      // 재고 / 품목 관련
      if (q.includes('재고') || q.includes('품목') || q.includes('상품')) {
        return {
          text: `📦 [품목 및 재고 현황]\n• 현재 등록 품목: ${stats.productCount || products?.length || 0}종\n• 운영 창고: ${stats.warehouseCount || 0}개소\n\n품목 관리 또는 실재고 보고서 화면을 바로 실행할 수 있습니다.`,
          actions: [
            { label: '🏷️ 품목 관리 열기', action: 'product_manager', primary: true },
            { label: '📊 재고 보고서 확인', action: 'inventory' }
          ]
        };
      }

      // 일정 관련
      if (q.includes('일정') || q.includes('캘린더') || q.includes('스케줄')) {
        return {
          text: `📅 [일정 및 납기 현황]\n오늘 등록된 업무 일정과 수주 납기 일정을 모바일 캘린더에서 바로 확인하실 수 있습니다.`,
          actions: [
            { label: '📅 일정 목록 열기', action: 'schedule', primary: true }
          ]
        };
      }

      // 기본 응답
      return {
        text: `미스링 비서가 요청하신 내용을 확인했습니다: "${query}"\n\n현재 모바일 시스템에서 아래 업무를 빠르게 실행하실 수 있습니다.`,
        actions: [
          { label: '📝 신규 수주 등록', action: 'sales_order', primary: true },
          { label: '🏢 거래처 목록', action: 'partner_manager' },
          { label: '📊 재고 보고서', action: 'inventory' }
        ]
      };
    };

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          persona: 'ERP 전문 관리 비서',
          system_prompt: '당신은 Linker X 모바일 ERP AI 비서 미스링입니다. 간결하고 친절하게 답변하세요.',
          context,
          history: messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
        }),
      });

      if (!response.ok) throw new Error('Local server offline');
      const data = await response.json();

      setTimeout(() => {
        setIsTyping(false);
        const smartReply = generateSmartErpReply(textToSend);
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'agent',
            text: data.response || smartReply.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: smartReply.actions,
            mode: 'assistant'
          }
        ]);
      }, 500);

    } catch {
      // Offline / Smart Local ERP fallback
      setTimeout(() => {
        setIsTyping(false);
        const smartReply = generateSmartErpReply(textToSend);
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'agent',
            text: smartReply.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: smartReply.actions,
            mode: 'assistant'
          }
        ]);
      }, 500);
    }
  };

  // Quick Chips Definition
  const quickChips = useMemo(() => {
    if (isDevActive) {
      return [
        { label: '⚡ 에이전트 연결 점검', prompt: '안티그래비티 에이전트 백그라운드 데몬 및 상태를 점검해줘' },
        { label: '📱 모바일 수주화면 최적화', prompt: '모바일 수주등록 간편 화면의 UI/UX 반응형을 점검해줘' },
        { label: '🎨 UI 스타일 정리', prompt: '모바일 화면 폰트 및 여백을 터치 친화적으로 가다듬어줘' },
        { label: '🔄 최근 작업 기록', prompt: '최근 수행된 개발 명령 목록을 요약해줘' }
      ];
    }
    return [
      { label: '📝 간편 수주 등록', directAction: 'sales_order', highlight: true },
      { label: '📦 오늘 수주 현황', prompt: '오늘 접수된 수주 현황 요약해줘' },
      { label: '💰 미수금 브리핑', prompt: '현재 거래처 미수금 현황 알려줘' },
      { label: '🏢 거래처 관리', directAction: 'partner_manager' },
      { label: '🏷️ 품목/재고 확인', directAction: 'product_manager' },
      { label: '📅 오늘 일정', directAction: 'schedule' }
    ];
  }, [isDevActive]);

  const filteredMessages = messages.filter(m => {
    if (m.id === 'welcome') return true;
    return isDevActive ? (m.mode === 'dev' || m.status) : (m.mode !== 'dev' && !m.status);
  });

  return (
    <div className="chat-assistant-container">
      {/* 1. Backdrop Overlay for Mobile Sheet */}
      <div 
        className={`chat-backdrop-overlay ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
      />

      {/* 2. Floating Action Button (FAB) */}
      <button 
        className={`chat-trigger-btn ${isOpen ? 'open' : ''} ${isDevActive ? 'dev-mode' : ''}`}
        onClick={toggleOpen}
        title={isDevActive ? "Antigravity 개발자 제어 콘솔" : "미스링 모바일 AI 비서"}
      >
        {isOpen ? <X size={22} /> : (isDevActive ? <Code size={22} /> : <MessageSquare size={22} />)}
        {propIsDevMode && !isOpen && <span className="chat-trigger-pulse" />}
      </button>

      {/* 3. Main Chat Panel (Slide-up Bottom Sheet on Mobile / Drawer on Desktop) */}
      <div className={`chat-panel ${isOpen ? 'open' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
        
        {/* Mobile Drag Indicator Handle */}
        <div className="chat-drag-handle" onClick={toggleOpen} />

        {/* Header */}
        <div className="chat-header" style={{
          backgroundColor: isDevActive ? '#0f172a' : '#ffffff',
          color: isDevActive ? '#ffffff' : '#0f172a',
          borderBottom: isDevActive ? '1px solid #1e293b' : '1px solid #e2e8f0'
        }}>
          <div className="chat-header-title">
            {isDevActive ? (
              <Terminal size={19} color="#4ade80" />
            ) : (
              <Sparkles size={19} color="#2563eb" />
            )}
            <div>
              <h3 style={{ color: isDevActive ? '#f8fafc' : '#0f172a' }}>
                {isDevActive ? '개발자 제어 콘솔' : 'Linker X AI 비서 (미스링)'}
              </h3>
            </div>
          </div>

          {/* Mode Switcher Tabs (If DevMode is enabled by SuperAdmin) */}
          {propIsDevMode && (
            <div className="chat-mode-tabs" style={{ backgroundColor: isDevActive ? '#1e293b' : '#f1f5f9' }}>
              <button 
                className={`chat-mode-tab ${!isDevActive ? 'active' : ''}`}
                onClick={() => setCurrentMode('assistant')}
                style={{ color: !isDevActive ? '#1e293b' : '#94a3b8' }}
              >
                <Bot size={13} /> 비서
              </button>
              <button 
                className={`chat-mode-tab ${isDevActive ? 'active dev' : ''}`}
                onClick={() => setCurrentMode('dev')}
              >
                <Code size={13} /> 개발자
              </button>
            </div>
          )}

          {/* Action Buttons (Fullscreen, Close) */}
          <div className="chat-header-actions">
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              title={isFullscreen ? "기본 크기로" : "전체화면"}
              style={{ color: isDevActive ? '#94a3b8' : '#64748b' }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              onClick={toggleOpen} 
              title="닫기"
              style={{ color: isDevActive ? '#94a3b8' : '#64748b' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Action Suggestion Chips */}
        <div 
          className="chat-quick-chips-wrapper"
          style={{
            backgroundColor: isDevActive ? '#111827' : '#f8fafc',
            borderBottom: isDevActive ? '1px solid #1f2937' : '1px solid #e2e8f0'
          }}
        >
          <div className="chat-quick-chips">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                className={`quick-chip-btn ${chip.highlight ? 'highlight' : ''} ${isDevActive ? 'dev' : ''}`}
                onClick={() => handleQuickChip(chip)}
                style={{
                  backgroundColor: isDevActive ? '#1f2937' : (chip.highlight ? '#eff6ff' : '#ffffff'),
                  color: isDevActive ? '#e2e8f0' : (chip.highlight ? '#1d4ed8' : '#334155'),
                  borderColor: isDevActive ? '#374151' : (chip.highlight ? '#bfdbfe' : '#e2e8f0')
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
        <div className={`chat-logs ${isDevActive ? 'dev-theme' : ''}`}>
          {filteredMessages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={msg.id || idx} 
                className={`message-wrapper ${msg.sender} ${isDevActive ? 'dev-bubble' : ''}`}
              >
                <span className="message-sender" style={{ color: isDevActive ? '#94a3b8' : '#64748b' }}>
                  {isUser ? (currentUser?.name || '슈퍼관리자') : (isDevActive ? '🤖 Antigravity 에이전트' : '미스링 비서')}
                </span>

                <div 
                  className="message-bubble"
                  style={{
                    backgroundColor: isUser 
                      ? (isDevActive ? '#16a34a' : '#2563eb')
                      : (isDevActive ? '#1e293b' : '#ffffff'),
                    color: isUser ? '#ffffff' : (isDevActive ? '#f1f5f9' : '#0f172a'),
                    border: isDevActive && !isUser ? '1px solid #334155' : (!isUser ? '1px solid #e2e8f0' : 'none')
                  }}
                >
                  {msg.text}

                  {/* Dev Mode Status Badge */}
                  {isDevActive && msg.status && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: msg.status === 'success' 
                        ? '#dcfce7' 
                        : (msg.status === 'running' ? '#fef3c7' : '#f1f5f9'),
                      color: msg.status === 'success' 
                        ? '#166534' 
                        : (msg.status === 'running' ? '#b45309' : '#475569'),
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

                  {/* Interactive ERP Action Link Buttons */}
                  {!isDevActive && msg.actions && msg.actions.length > 0 && (
                    <div className="chat-action-card-grid">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          className={`chat-action-link-btn ${act.primary ? 'primary' : ''}`}
                          onClick={() => handleExecuteAction(act.action)}
                        >
                          <span>{act.label}</span>
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="message-time">{msg.timestamp}</span>
              </div>
            );
          })}

          {isTyping && (
            <div className="typing-indicator" style={{ backgroundColor: isDevActive ? '#1e293b' : '#ffffff', border: isDevActive ? '1px solid #334155' : '1px solid #e2e8f0' }}>
              <div className="typing-dot" style={{ backgroundColor: isDevActive ? '#4ade80' : '#2563eb' }}></div>
              <div className="typing-dot" style={{ backgroundColor: isDevActive ? '#4ade80' : '#2563eb' }}></div>
              <div className="typing-dot" style={{ backgroundColor: isDevActive ? '#4ade80' : '#2563eb' }}></div>
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
            backgroundColor: isDevActive ? '#0f172a' : '#ffffff',
            borderTop: isDevActive ? '1px solid #1e293b' : '1px solid #e2e8f0'
          }}
        >
          <div className="chat-input-wrapper">
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isDevActive ? "Antigravity에 내릴 개발 명령 입력..." : "미스링에게 질문이나 지시 입력..."}
              disabled={isTyping}
              style={{
                backgroundColor: isDevActive ? '#1e293b' : '#f8fafc',
                color: isDevActive ? '#f8fafc' : '#0f172a',
                borderColor: isDevActive ? '#334155' : '#cbd5e1'
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
            className={`send-btn ${isDevActive ? 'dev-send' : ''}`}
            disabled={!inputMessage.trim() || isTyping}
          >
            <Send size={17} />
          </button>
        </form>

      </div>
    </div>
  );
}
