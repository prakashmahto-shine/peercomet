import os
import sys
from pathlib import Path

# If not running inside the project's virtual environment, re-exec using .venv's python
venv_python = Path(__file__).resolve().parent / ".venv" / "bin" / "python"
if venv_python.exists() and sys.executable != str(venv_python):
    os.execv(str(venv_python), [str(venv_python)] + sys.argv)

import uvicorn
from backend.config import HOST, PORT, IS_DEVELOPMENT

if __name__ == "__main__":
    print(f"🚀 Launching Shine Peerpath Python + WebRTC Signaling + Milvus backend on http://{HOST}:{PORT}")
    uvicorn.run(
        "backend.main:socket_app",
        host=HOST,
        port=PORT,
        reload=IS_DEVELOPMENT,
        reload_dirs=["backend"] if IS_DEVELOPMENT else None
    )
