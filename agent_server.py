import http.server
import json
import sys
from urllib.parse import urlparse

PORT = 8000

class AgentChatHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # Support CORS for preflight and standard requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight CORS request
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/chat':
            # Read and parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode('utf-8'))
                return

            message = data.get('message', '')
            persona = data.get('persona', 'AI 비서')
            system_prompt = data.get('system_prompt', '')
            context = data.get('context', {})
            history = data.get('history', [])

            # Print detailed logs on the server console to verify Context & System Prompt Injection
            print("\n" + "="*60)
            print("🤖 [LINKER X AI AGENT - REQUEST RECEIVED]")
            print(f"👤 Persona       : {persona}")
            print(f"📝 System Prompt : {system_prompt}")
            print(f"🌐 Context       : {json.dumps(context, indent=2, ensure_ascii=False)}")
            print(f"💬 User Message  : {message}")
            print(f"📚 History Length: {len(history)} messages")
            print("="*60)

            # Generate smart context-aware response
            response_text = self.generate_smart_response(message, persona, context)

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            response_body = json.dumps({"response": response_text}, ensure_ascii=False)
            self.wfile.write(response_body.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def generate_smart_response(self, message, persona, context):
        stats = context.get('stats', {})
        current_view = context.get('currentView', 'dashboard')
        selected_date = context.get('selectedDate', '')
        user_info = context.get('currentUser') or {}
        user_name = user_info.get('name', '사용자')
        user_role = user_info.get('role', '일반')

        # Clean message for keyword matching
        msg_clean = message.replace(" ", "").lower()

        # Check keywords and use context stats
        if "창고" in msg_clean:
            return f"[{persona} 응답]\n\n현재 ERP 시스템에 등록되어 있는 창고는 총 {stats.get('warehouseCount', 0)}개입니다. 창고 관리 모달에서 창고의 상세 구역 및 담당자를 확인하실 수 있습니다."
        elif "직원" in msg_clean or "인원" in msg_clean:
            return f"[{persona} 응답]\n\n현재 시스템에 등록된 전체 직원 수는 총 {stats.get('staffCount', 0)}명입니다. 직원 등록 및 권한 조정은 상단 메뉴의 '직원 관리' 메뉴에서 가능합니다."
        elif "거래처" in msg_clean:
            return f"[{persona} 응답]\n\n현재 등록된 활성 거래처는 총 {stats.get('partnerCount', 0)}개입니다. 매입처 및 매출처 원장은 실시간으로 동기화되어 보고서 탭에서 확인하실 수 있습니다."
        elif "품목" in msg_clean or "제품" in msg_clean or "상품" in msg_clean:
            return f"[{persona} 응답]\n\n현재 시스템에 등록된 품목 종류는 총 {stats.get('productCount', 0)}가지입니다. 실시간 품목 재고 상황은 재고 현황 위젯을 통해 확인해 보시기 바랍니다."
        elif "수주" in msg_clean or "주문" in msg_clean or "매출" in msg_clean:
            return f"[{persona} 응답]\n\n현재 매출 전표 {stats.get('salesInvoiceCount', 0)}건, 매출 주문 {stats.get('salesOrderCount', 0)}건이 등록되어 있습니다. 오늘 날짜 기준이며 자세한 정보는 매출 보고서에서 파악 가능합니다."
        elif "매입" in msg_clean or "발주" in msg_clean:
            return f"[{persona} 응답]\n\n현재 매입 전표 {stats.get('purchaseInvoiceCount', 0)}건, 발주 주문 {stats.get('purchaseOrderCount', 0)}건이 등록되어 있습니다. 재고 과부족을 방지하기 위한 적정 발주량을 산출하실 수 있습니다."
        elif "일정" in msg_clean or "스케줄" in msg_clean:
            return f"[{persona} 응답]\n\n현재 캘린더에 표시된 총 일정은 {stats.get('inventoryTransferCount', 0)}건입니다. 선택되어 있는 날짜는 {selected_date}입니다."
        else:
            # Default conversational response using injected context
            return (
                f"안녕하세요, {user_name} ({user_role})님! 저는 {persona}입니다.\n\n"
                f"현재 화면: {current_view}\n"
                f"선택된 날짜: {selected_date}\n\n"
                f"ERP 요약 정보:\n"
                f"- 등록 창고: {stats.get('warehouseCount', 0)}개\n"
                f"- 등록 직원: {stats.get('staffCount', 0)}명\n"
                f"- 등록 거래처: {stats.get('partnerCount', 0)}개\n"
                f"- 등록 품목: {stats.get('productCount', 0)}개\n\n"
                f"요청하신 내용 '{message}'에 대해 더 자세한 데이터 조회가 필요하다면 말씀해 주세요."
            )

def run_server():
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, AgentChatHandler)
    print(f"🚀 Linker X AI Agent Server running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()
        sys.exit(0)

if __name__ == '__main__':
    run_server()
