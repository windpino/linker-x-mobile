import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Settings, Bot, Terminal, Activity, RefreshCw } from 'lucide-react';
import './ChatAssistant.css';

export default function ChatAssistant({ context }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: '안녕하세요! Linker X ERP AI 비서입니다. 무엇을 도와드릴까요?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [persona, setPersona] = useState('ERP 전문 관리 비서');
  const [systemPrompt, setSystemPrompt] = useState(
    '당신은 Linker X ERP 시스템의 영리한 AI 관리 비서입니다. 사용자가 입력하는 메시지에 따라, 제공된 시스템 컨텍스트 정보(현재 페이지, 선택한 날짜, 로그인한 사용자 및 ERP 데이터 통계)를 활용하여 정중하고 정확하게 답변하세요.'
  );
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const logEndRef = useRef(null);

  // Check backend server online status on mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'OPTIONS',
      });
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
    }
  };

  const getLocalSimulationResponse = (userMsg) => {
    const stats = context?.stats || {};
    const viewName = context?.currentView || 'dashboard';
    const selectedDateStr = context?.selectedDate || '';
    const userName = context?.currentUser?.name || '사용자';
    const userRole = context?.currentUser?.role || '일반';

    const normalizedMsg = userMsg.replace(/\s+/g, '').toLowerCase();

    let responseText = '';

    if (normalizedMsg.includes('창고') || normalizedMsg.includes('웨어하우스')) {
      responseText = `현재 등록되어 있는 창고는 총 ${stats.warehouseCount || 0}개입니다. 
창고 관리 화면에서 위치 및 담담 직원을 지정하실 수 있습니다.`;
    } else if (normalizedMsg.includes('직원') || normalizedMsg.includes('멤버') || normalizedMsg.includes('인원')) {
      responseText = `현재 시스템에 등록된 직원은 총 ${stats.staffCount || 0}명입니다. 
직원 관리 메뉴를 열어 추가 등록하거나 담당 구역을 수정할 수 있습니다.`;
    } else if (normalizedMsg.includes('거래처') || normalizedMsg.includes('파트너')) {
      responseText = `현재 등록된 거래처는 총 ${stats.partnerCount || 0}개소입니다. 
주요 매입/매출처 현황은 거래처 관리 탭에서 관리할 수 있습니다.`;
    } else if (normalizedMsg.includes('품목') || normalizedMsg.includes('제품') || normalizedMsg.includes('상품')) {
      responseText = `현재 등록된 품목 종류는 총 ${stats.productCount || 0}가지입니다.
재고 보고서에서 실시간 입출고 흐름 및 적정 재고 여부를 조회해 보세요.`;
    } else if (normalizedMsg.includes('주문') || normalizedMsg.includes('수주') || normalizedMsg.includes('매출')) {
      responseText = `오늘 날짜 기준 매출 전표는 ${stats.salesInvoiceCount || 0}건, 수주 주문서는 ${stats.salesOrderCount || 0}건 등록되어 있습니다.`;
    } else if (normalizedMsg.includes('매입') || normalizedMsg.includes('발주')) {
      responseText = `오늘 날짜 기준 매입 전표는 ${stats.purchaseInvoiceCount || 0}건, 발주 주문서는 ${stats.purchaseOrderCount || 0}건 등록되어 있습니다.`;
    } else if (normalizedMsg.includes('일정') || normalizedMsg.includes('스케줄')) {
      responseText = `캘린더에 등록된 전체 일정은 총 ${stats.inventoryTransferCount || 0}건입니다. 선택하신 날짜는 ${selectedDateStr} 입니다.`;
    } else if (normalizedMsg.includes('도움말') || normalizedMsg.includes('기능') || normalizedMsg.includes('뭐할수있어')) {
      responseText = `안녕하세요! 저는 다음과 같은 정보에 대해 답변해 드릴 수 있습니다:
1. **창고 현황** (예: "창고 몇 개 있어?")
2. **직원 수 및 정보** (예: "우리 직원 수 알려줘")
3. **거래처 통계** (예: "거래처는 총 몇 개야?")
4. **품목/재고 데이터** (예: "등록된 품목 수 조회해줘")
5. **현재 페이지/날짜 정보**

💡 현재 에이전트 서버가 오프라인 상태여서 프론트엔드 모의 에뮬레이터가 응답했습니다. 터미널에서 \`python agent_server.py\`를 실행해 주시면 완전한 AI와 대화하실 수 있습니다!`;
    } else {
      responseText = `[에이전트 서버 오프라인 모드 알림]
현재 백엔드 파이썬 서버(http://localhost:8000/api/chat)에 연결되지 않아 로컬 규칙 기반 시뮬레이터가 응답했습니다.

* **인젝트된 페르소나**: ${persona}
* **현재 화면**: ${viewName}
* **선택일자**: ${selectedDateStr}
* **사용자**: ${userName} (${userRole})
* **시스템 요약**: 창고 ${stats.warehouseCount || 0}개, 직원 ${stats.staffCount || 0}명, 품목 ${stats.productCount || 0}개, 거래처 ${stats.partnerCount || 0}개

질문하신 내용 "${userMsg}"에 답변하기 위해 백엔드 서버를 구동해 주세요. 프로젝트 루트 경로에서 \`python agent_server.py\` 명령어를 통해 구동 가능합니다.`;
    }

    return responseText;
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage('');

    // Append user message
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newUserMsg = { sender: 'user', text: userText, timestamp };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          persona: persona,
          system_prompt: systemPrompt,
          context: context,
          history: messages.slice(-10).map(m => ({ sender: m.sender, text: m.text }))
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setIsOnline(true);
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: data.response || '응답을 받지 못했습니다.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      // Backend offline fallback
      setIsOnline(false);
      setTimeout(() => {
        setIsTyping(false);
        const fallbackText = getLocalSimulationResponse(userText);
        setMessages(prev => [
          ...prev,
          {
            sender: 'agent',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 1000);
    }
  };

  return (
    <div className="chat-assistant-container">
      {/* Floating Trigger Button */}
      <button 
        className={`chat-trigger-btn ${isOpen ? 'open' : ''}`} 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            checkServerStatus(); // refresh status when opening
          }
        }}
        title="AI 비서와 채팅"
      >
        {isOpen ? <X /> : <MessageSquare />}
      </button>

      {/* Side Chat Drawer */}
      <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-title">
            <Bot size={20} color="#2563eb" />
            <h3>Linker X AI 비서</h3>
            <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
              <Activity size={10} />
              {isOnline ? '연결됨' : '오프라인'}
            </span>
          </div>
          <div className="chat-header-actions">
            <button onClick={() => checkServerStatus()} title="연결 상태 새로고침">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} title="에이전트 설정 및 컨텍스트">
              <Settings size={16} />
            </button>
            <button onClick={() => setIsOpen(false)} title="닫기">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Collapsible Settings / Persona & Context Panel */}
        {showSettings && (
          <div className="chat-settings-panel">
            <div className="settings-group">
              <label>에이전트 역할 (페르소나)</label>
              <input 
                type="text" 
                value={persona} 
                onChange={(e) => setPersona(e.target.value)} 
                placeholder="예: ERP 관리 비서"
              />
            </div>
            <div className="settings-group">
              <label>시스템 프롬프트 (System Prompt)</label>
              <textarea 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="에이전트 행동 지침..."
              />
            </div>
            <div className="settings-group">
              <label>실시간 주입 컨텍스트 (Injected Context)</label>
              <div className="context-debug-box">
                {JSON.stringify(context, null, 2)}
              </div>
            </div>
          </div>
        )}

        {/* Chat Logs */}
        <div className="chat-logs">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.sender}`}>
              <span className="message-sender">
                {msg.sender === 'user' ? '나' : persona}
              </span>
              <div className="message-bubble">
                {msg.text}
              </div>
              <span className="message-time">{msg.timestamp}</span>
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="chat-input-area">
          <div className="chat-input-wrapper">
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              disabled={isTyping}
            />
          </div>
          <button type="submit" className="send-btn" disabled={!inputMessage.trim() || isTyping}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
