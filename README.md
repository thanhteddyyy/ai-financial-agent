# 📈 AI Financial Agent

Trợ lý ảo tài chính thông minh ứng dụng mô hình ngôn ngữ lớn (Gemini 2.5 Flash) kết hợp kiến trúc **ReAct (Reasoning and Acting)**. Hệ thống có khả năng tự động phân tích ý định người dùng, suy luận đa bước (Chain-of-Thought) và điều phối các công cụ ngoại vi để truy xuất dữ liệu tài chính theo thời gian thực.

---

## 🚀 Tính năng nổi bật (Features)

- **Tư duy chuỗi đa bước (Chain-of-Thought Reasoning):** Tự động phân tách và xâu chuỗi các công cụ để giải quyết bài toán phức tạp (Ví dụ: Tra cứu giá cổ phiếu theo USD $\rightarrow$ Tính toán số lượng $\rightarrow$ Quy đổi tỷ giá sang VNĐ).
- **Tra cứu Thị trường Tiền mã hóa (Crypto):** Truy vấn biến động và giá realtime của các đồng tiền điện tử qua CoinGecko API.
- **Tra cứu Chứng khoán Mỹ (Stocks):** Tích hợp Finnhub API để lấy thông tin giá hiện tại, biên độ dao động trong ngày của các mã cổ phiếu (AAPL, TSLA, MSFT,...).
- **Điểm tin & Phân tích Thị trường (Financial News):** Lấy tin tức tài chính mới nhất theo danh mục, tự động tóm tắt và phân tích tác động vĩ mô bằng tiếng Việt.
- **Quản lý Ngữ cảnh Hội thoại (Session Memory):** Ghi nhớ ngữ cảnh trò chuyện xuyên suốt phiên làm việc thông qua định danh `sessionId`.

---

## 🛠 Kiến trúc Hệ thống & Điểm nhấn Kỹ thuật (Technical Highlights)

Dự án được thiết kế theo kiến trúc phân tán (Decoupled Architecture), tách biệt hoàn toàn giữa Backend xử lý logic và Frontend hiển thị:

```text
[ User ] 
   │
   ▼
[ Gradio UI (Port 7860) ] ── (HTTP POST / JSON) ──► [ Node.js Backend (Port 3000) ]
                                                           │
                                                           ├─► Gemini 2.5 Flash (ReAct Loop)
                                                           ├─► External APIs (Finnhub, CoinGecko)
                                                           └─► Observability (Langfuse Tracing)
```

### 1. Backend Service (Node.js & TypeScript)
- **Ngôn ngữ & Môi trường:** Node.js kết hợp TypeScript đảm bảo Type Safety, giảm thiểu runtime error khi parse payload từ các API tài chính.
- **ReAct Agent Implementation:** Tự xây dựng vòng lặp tác tử (Agentic loop) nguyên bản không phụ thuộc framework trừu tượng (như LangChain). Chu trình xử lý gồm: **Thought** (Mô hình suy luận) $\rightarrow$ **Action** (Gọi function) $\rightarrow$ **Observation** (Backend thực thi tool và nạp lại kết quả) $\rightarrow$ **Final Answer**.
- **LLM Observability:** Tích hợp **Langfuse SDK** để theo dõi toàn diện (Tracing): đo lường độ trễ (latency), chi phí token, và trực quan hóa sơ đồ thực thi công cụ (waterfall trace).
- **State Management:** Quản lý phiên làm việc thông qua In-memory `Map` lưu trữ lịch sử tin nhắn theo từng `sessionId`.

### 2. Frontend Interface (Python & Gradio)
- **Framework:** Gradio 6.0 (`gr.ChatInterface`) cung cấp giao diện tương tác trực quan, tối ưu cho các tác vụ hội thoại với LLM.
- **State Propagation:** Quản lý `sessionId` thông qua `gr.State` để định danh luồng trao đổi của người dùng mà không làm lộ logic xử lý dữ liệu.

---

## 📁 Cấu trúc Thư mục (Project Structure)

```text
ai-financial-agent/
├── src/
│   ├── services/
│   │   ├── geminiServices.ts     # Bộ não Agent: Khởi tạo ReAct loop, tool schemas, Langfuse trace
│   │   ├── stockService.ts       # Service tích hợp Finnhub API (Stocks & News)
│   │   ├── cryptoService.ts      # Service tích hợp CoinGecko API
│   │   └── currencyService.ts    # Service quy đổi tỷ giá ngoại tệ
│   ├── controllers/              # Điều hướng request/response
│   ├── routes/                   # Khai báo endpoint (/api/ai/ask)
│   └── index.ts                  # Server entry point (Express/Node.js)
├── app.py                        # Giao diện Chatbot bằng Gradio kết nối REST API
├── .env.example                  # Mẫu khai báo biến môi trường
├── tsconfig.json                 # Cấu hình TypeScript
└── package.json
```

---

## 📦 Hướng dẫn Cài đặt & Khởi chạy (Local Setup)

Hệ thống yêu cầu chạy đồng thời cả Backend và Frontend trên hai terminal riêng biệt.

### Yêu cầu tiên quyết
- **Node.js:** v18.0.0 trở lên
- **Python:** v3.10 trở lên
- **API Keys:** Google Gemini API, Finnhub API, Langfuse (Public/Secret Keys)

---

### Bước 1: Khởi chạy Backend (Port 3000)

1. Cài đặt các thư viện Node.js:
   ```bash
   npm install
   ```

2. Tạo file cấu hình môi trường `.env` tại thư mục gốc:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key
   FINNHUB_API_KEY=your_finnhub_api_key
   LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
   LANGFUSE_SECRET_KEY=your_langfuse_secret_key
   LANGFUSE_HOST=https://cloud.langfuse.com
   ```

3. Chạy server ở chế độ Development:
   ```bash
   npm run dev
   ```
   *Server sẵn sàng tại:* `http://localhost:3000`

---

### Bước 2: Khởi chạy Frontend (Port 7860)

1. Mở một tab terminal mới và cài đặt thư viện Python:
   ```bash
   pip install gradio requests
   ```

2. Khởi chạy ứng dụng Gradio:
   ```bash
   python app.py
   ```
   *Giao diện người dùng sẽ chạy tại:* `http://127.0.0.1:7860`

---

## 🧪 Kịch bản Kiểm thử Tiêu biểu (Test Scenarios)

| Mục tiêu kiểm thử | Câu hỏi mẫu (Prompt) | Luồng công cụ kích hoạt (Tools Used) |
| :--- | :--- | :--- |
| **Đơn công cụ (Crypto)** | *"Giá Bitcoin hôm nay là bao nhiêu?"* | `getCryptoPrice` |
| **Suy luận chuỗi (Stocks + FX)** | *"Cổ phiếu Apple giá bao nhiêu? Nếu mua 15 cổ phiếu thì tốn bao nhiêu tiền Việt?"* | `getStockPrice` $\rightarrow$ `convertCurrency` |
| **Truy xuất tin tức & Tóm tắt** | *"Có tin tức gì mới về thị trường tiền điện tử hôm nay không?"* | `getMarketNews` |
| **Kiểm tra ngữ cảnh (Context)** | *"Thế còn của Tesla? Tính cả hai mã đó ra VNĐ giúp tôi."* | `getStockPrice` $\rightarrow$ `convertCurrency` (nhớ giá cũ) |

---

## 🔮 Định hướng Phát triển (Roadmap)

- [ ] **Data Persistence:** Chuyển đổi bộ nhớ từ In-memory Map sang MongoDB/Firestore để lưu trữ lịch sử chat vĩnh viễn.
- [ ] **Streaming Response:** Ứng dụng Server-Sent Events (SSE) để truyền dữ liệu thời gian thực (hiệu ứng gõ chữ từng từ).
- [ ] **Báo cáo Tài chính RAG:** Ứng dụng kỹ thuật Retrieval-Augmented Generation để đọc hiểu, trích xuất dữ liệu từ các file PDF báo cáo tài chính thường niên.