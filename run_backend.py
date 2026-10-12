import uvicorn
from backend.config import HOST, PORT, IS_DEVELOPMENT

if __name__ == "__main__":
    print(f"🚀 Launching Shine Peerpath Python + WebRTC Signaling + Milvus backend on http://{HOST}:{PORT}")
    uvicorn.run("backend.main:socket_app", host=HOST, port=PORT, reload=IS_DEVELOPMENT)
