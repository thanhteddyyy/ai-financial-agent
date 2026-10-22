import gradio as gr
import requests
import uuid

def predict(message, history, session_id):
    url = "http://localhost:3000/api/ai/ask"
    payload = {
        "prompt": message,
        "sessionId": session_id
    }
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        
        if "data" in data and "response" in data["data"]:
            reply = data["data"]["response"]
            tools = data["data"].get("toolsUsed", [])
        else:
            reply = data.get("response", "Đã nhận phản hồi nhưng cấu trúc JSON không khớp.")
            tools = data.get("toolsUsed", [])
            
        if tools:
            reply += f"\n\n*(🔧 Công cụ kích hoạt: {', '.join(tools)})*"
            
        return reply
    except Exception as e:
        return f"🚨 Lỗi kết nối Backend: {str(e)}"

# Đã bỏ tham số theme để tương thích với Gradio 6.0
with gr.Blocks() as demo:
    gr.Markdown("<h1 style='text-align: center;'>📈 AI Financial Agent</h1>")
    gr.Markdown("<p style='text-align: center;'>Trợ lý tài chính thông minh: Tra cứu Chứng khoán, Crypto, Tỷ giá và Tin tức.</p>")
    
    session_state = gr.State(f"user_{uuid.uuid4().hex[:8]}")
    
    # Đã bỏ các tham số nút bấm cũ, sử dụng giao diện mặc định cực mượt của Gradio mới
    gr.ChatInterface(
        fn=predict,
        additional_inputs=[session_state],
        examples=[
            ["Giá Bitcoin hôm nay bao nhiêu?", None],
            ["Cổ phiếu Apple đang giá bao nhiêu? Tính ra tiền Việt giúp tôi.", None],
            ["Tóm tắt 3 tin tức tài chính nổi bật nhất thị trường.", None]
        ]
    )

if __name__ == "__main__":
    demo.launch(server_port=7860)