import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8000;

function isCodeModificationRequest(message) {
  const keywords = ["수정", "변경", "바꿔", "지워", "추가", "크기", "색상", "여백", "가려", "조정", "삭제", "레이아웃", "폰트", "스타일", "배경", "테두리", "패딩", "마진", "코드", "화면", "메뉴", "너비", "높이"];
  const clean = message.replace(/\s+/g, "").toLowerCase();
  const excludeKeywords = ["!매출", "오늘매출", "매출현황", "!재고", "재고현황", "재고부족", "!미수금", "미수금현황", "외상"];
  if (excludeKeywords.some(ex => clean.includes(ex))) {
    return false;
  }
  return keywords.some(kw => clean.includes(kw));
}

function generateSmartResponse(message, persona, context) {
  const stats = context.stats || {};
  const currentView = context.currentView || 'dashboard';
  const selectedDate = context.selectedDate || '';
  const userInfo = context.currentUser || {};
  const userName = userInfo.name || '사용자';
  const userRole = userInfo.role || '일반';

  const msgClean = message.replace(/\s+/g, "").toLowerCase();

  if (msgClean.includes("창고")) {
    return `[${persona} 응답]\n\n현재 ERP 시스템에 등록되어 있는 창고는 총 ${stats.warehouseCount || 0}개입니다. 창고 관리 모달에서 창고의 상세 구역 및 담당자를 확인하실 수 있습니다.`;
  } else if (msgClean.includes("직원") || msgClean.includes("인원")) {
    return `[${persona} 응답]\n\n현재 시스템에 등록된 전체 직원 수는 총 ${stats.staffCount || 0}명입니다. 직원 등록 및 권한 조정은 상단 메뉴의 '직원 관리' 메뉴에서 가능합니다.`;
  } else if (msgClean.includes("거래처")) {
    return `[${persona} 응답]\n\n현재 등록된 활성 거래처는 총 ${stats.partnerCount || 0}개입니다. 매입처 및 매출처 원장은 실시간으로 동기화되어 보고서 탭에서 확인하실 수 있습니다.`;
  } else if (msgClean.includes("품목") || msgClean.includes("제품") || msgClean.includes("상품")) {
    return `[${persona} 응답]\n\n현재 시스템에 등록된 품목 종류는 총 ${stats.productCount || 0}가지입니다. 실시간 품목 재고 상황은 재고 현황 위젯을 통해 확인해 보시기 바랍니다.`;
  } else if (msgClean.includes("수주") || msgClean.includes("주문") || msgClean.includes("매출")) {
    return `[${persona} 응답]\n\n현재 매출 전표 ${stats.salesInvoiceCount || 0}건, 매출 주문 ${stats.salesOrderCount || 0}건이 등록되어 있습니다. 오늘 날짜 기준이며 자세한 정보는 매출 보고서에서 파악 가능합니다.`;
  } else if (msgClean.includes("매입") || msgClean.includes("발주")) {
    return `[${persona} 응답]\n\n현재 매입 전표 ${stats.purchaseInvoiceCount || 0}건, 발주 주문 ${stats.purchaseOrderCount || 0}건이 등록되어 있습니다. 재고 과부족을 방지하기 위한 적정 발주량을 산출하실 수 있습니다.`;
  } else if (msgClean.includes("일정") || msgClean.includes("스케줄")) {
    return `[${persona} 응답]\n\n현재 캘린더에 표시된 총 일정은 ${stats.inventoryTransferCount || 0}건입니다. 선택되어 있는 날짜는 ${selectedDate}입니다.`;
  } else {
    return `안녕하세요, ${userName} (${userRole})님! 저는 ${persona}입니다.\n\n` +
      `현재 화면: ${currentView}\n` +
      `선택된 날짜: ${selectedDate}\n\n` +
      `ERP 요약 정보:\n` +
      `- 등록 창고: ${stats.warehouseCount || 0}개\n` +
      `- 등록 직원: ${stats.staffCount || 0}명\n` +
      `- 등록 거래처: ${stats.partnerCount || 0}개\n` +
      `- 등록 품목: ${stats.productCount || 0}개\n\n` +
      `요청하신 내용 '${message}'에 대해 더 자세한 데이터 조회가 필요하다면 말씀해 주세요.`;
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const message = data.message || '';
        const persona = data.persona || 'AI 비서';
        const context = data.context || {};

        console.log("\n" + "=".repeat(60));
        console.log("🤖 [LINKER X AI AGENT - REQUEST RECEIVED (NODE SERVER)]");
        console.log(`👤 Persona       : ${persona}`);
        console.log(`💬 User Message  : ${message}`);
        console.log("=".repeat(60));

        let responseText = '';

        if (isCodeModificationRequest(message)) {
          const cmdId = `msg_${Date.now()}`;
          const newCmd = {
            id: cmdId,
            message: message,
            status: "pending",
            response: "",
            timestamp: new Date().toISOString(),
            source: "server"
          };

          const bridgePath = path.join(__dirname, 'pending_commands.json');
          let commands = [];
          try {
            if (fs.existsSync(bridgePath)) {
              commands = JSON.parse(fs.readFileSync(bridgePath, 'utf8'));
            }
          } catch (e) {
            commands = [];
          }

          commands.push(newCmd);
          try {
            fs.writeFileSync(bridgePath, JSON.stringify(commands, null, 2), 'utf8');
            console.log(`📝 Command written to pending_commands.json: ${message}`);
          } catch (e) {
            console.error("❌ Failed to write to pending_commands.json:", e);
          }

          responseText = `🛠️ **[코드 수정 명령 접수]**\n\n지시사항: "${message}"\n\nAI 에이전트가 이 명령을 감지하여 백그라운드에서 코드를 수정하고 배포하는 작업을 수행할 예정입니다. 잠시만 기다려주세요!`;
        } else {
          responseText = generateSmartResponse(message, persona, context);
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ response: responseText }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Linker X AI Agent Server (NodeJS) running on port ${PORT}...`);
});
