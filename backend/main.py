import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import socketio

from backend.config import (
    PORT, HOST, EMBEDDING_MODEL_NAME, CORS_ORIGINS, IS_DEVELOPMENT, BRAND_NAME,
    STUN_URLS, TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL,
)
from sqlalchemy import text
from fastapi import Depends
from backend.auth.deps import require_user, get_optional_user
from backend.db import engine as db_engine
from backend.db.seed import init_database
from backend.data.store import store
from backend.services.milvus_service import milvus_service
from backend.services.socket_service import sio
from backend.routers import (
    cv_router,
    trajectory_router,
    creators_router,
    candidates_router,
    bookings_router,
    assessment_router,
    recruiter_router,
    analytics_router,
    jobs_router,
    community_router,
    notifications_router,
    sessions_router,
    auth_router,
    admin_router
)

START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    try:
        milvus_service.connect()
        creators = store.get_creators()
        candidates = store.get_candidates()
        milvus_service.sync_creators(creators)
        milvus_service.sync_candidates(candidates)
    except Exception as e:
        print(f"Startup warning: {e}")
    yield
    milvus_service.shutdown()

app = FastAPI(
    title=f"{BRAND_NAME} Backend API (Python, WebRTC & Milvus)",
    description="Python FastAPI backend with WebRTC Socket.IO signaling and Milvus Vector Database",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logger middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    # Skip recording upload spam from logs
    if not (request.url.path.startswith("/api/sessions/") and request.url.path.endswith("/recording")):
        print(f"[API] {request.method} {request.url.path} -> {response.status_code} ({duration}ms)")
    return response

# Health check
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "peercomet-backend-api-python",
        "vectorDatabase": "Milvus",
        "embeddingModel": EMBEDDING_MODEL_NAME,
        "signaling": "socket.io-webrtc-active",
        "uptimeSeconds": round(time.time() - START_TIME),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "domainsSupported": ['AI/ML', 'Semiconductor', 'Cybersecurity', 'Full-Stack', 'SaaS Sales', 'Marketing', 'Product Management', 'Search & Data Infra'],
        "version": "2.0.0"
    }

@app.get("/api/ready")
def readiness_check():
    try:
        with db_engine.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"[Ready] Database not reachable: {e}")
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "down"})
    return {"status": "ready", "database": "up"}

@app.get("/api/webrtc/ice-servers")
def ice_servers(user=Depends(get_optional_user)):
    servers = [{"urls": STUN_URLS}] if STUN_URLS else []
    if TURN_URLS and (user or IS_DEVELOPMENT):
        servers.append({"urls": TURN_URLS, "username": TURN_USERNAME, "credential": TURN_CREDENTIAL})
    return {"success": True, "data": {"iceServers": servers}}

app.include_router(auth_router)
app.include_router(cv_router)
app.include_router(trajectory_router)
app.include_router(creators_router)
app.include_router(candidates_router)
app.include_router(bookings_router)
app.include_router(assessment_router)
app.include_router(recruiter_router)
app.include_router(analytics_router)
app.include_router(jobs_router)
app.include_router(community_router)
app.include_router(notifications_router)
app.include_router(sessions_router)
app.include_router(admin_router)

dist_path = Path(__file__).resolve().parent.parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "API route not found"})
        target = dist_path / full_path
        if target.is_file():
            return FileResponse(str(target))
        index_file = dist_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse(status_code=200, content={"message": f"{BRAND_NAME} Python Backend running!"})

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:socket_app", host=HOST, port=PORT, reload=IS_DEVELOPMENT)

