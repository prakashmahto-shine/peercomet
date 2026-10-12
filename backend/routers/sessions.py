import os
import re
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from backend.data.store import store
from backend.config import DATA_DIR

router = APIRouter(tags=["Sessions & Recordings"])

RECORDINGS_DIR = DATA_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Session ids end up in file paths, so only allow plain id characters
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")

@router.post("/api/sessions/{session_id}/recording")
async def upload_recording(session_id: str, request: Request):
    """
    Save session video recording (.webm / .mp4) uploaded from WebRTC client
    """
    clean_id = session_id.replace("peerpath-", "").replace("sess-", "")
    if not SAFE_ID_RE.match(clean_id):
        raise HTTPException(status_code=400, detail="Invalid session id")
    try:
        file_path = RECORDINGS_DIR / f"sess-{clean_id}.webm"

        # Read binary body stream
        body = await request.body()
        if body and len(body) > 0:
            with open(file_path, "wb") as f:
                f.write(body)
        else:
            with open(file_path, "wb") as f:
                f.write(b"PEERPATH_RECORDING_MARKER")

        recording_url = f"/api/sessions/{clean_id}/recording"
        
        # Update session in store
        store.update_session(
            f"sess-{clean_id}",
            {
                "recordingUrl": recording_url,
                "hasRecording": True
            }
        )
        # Also try matching by raw id
        store.update_session(
            clean_id,
            {
                "recordingUrl": recording_url,
                "hasRecording": True
            }
        )

        file_size = os.path.getsize(file_path) if file_path.exists() else 0
        print(f"[Recording] Successfully saved recording for session '{clean_id}' ({file_size} bytes)")

        return {
            "success": True,
            "message": "Session recording saved successfully",
            "recordingUrl": recording_url,
            "sessionId": clean_id,
            "sizeBytes": file_size
        }
    except Exception as e:
        print(f"[Recording Error]: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sessions/{session_id}/recording")
async def stream_recording(session_id: str, request: Request):
    """
    Stream session recording with HTTP 206 Partial Content (Range header) for smooth video playback & scrubbing
    """
    clean_id = session_id.replace("peerpath-", "").replace("sess-", "")
    if not SAFE_ID_RE.match(clean_id):
        raise HTTPException(status_code=400, detail="Invalid session id")
    file_path = RECORDINGS_DIR / f"sess-{clean_id}.webm"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Session recording video not found")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        # Parse range header e.g. "bytes=0-1048576"
        range_str = range_header.replace("bytes=", "").strip()
        parts = range_str.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1

        if start >= file_size:
            raise HTTPException(status_code=416, detail="Requested range not satisfiable")

        chunk_size = (end - start) + 1

        def iterfile():
            with open(file_path, "rb") as video:
                video.seek(start)
                bytes_left = chunk_size
                while bytes_left > 0:
                    read_size = min(bytes_left, 64 * 1024)
                    data = video.read(read_size)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": "video/webm",
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)
    else:
        def iterfile_full():
            with open(file_path, "rb") as video:
                while chunk := video.read(64 * 1024):
                    yield chunk

        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": "video/webm",
        }
        return StreamingResponse(iterfile_full(), status_code=200, headers=headers)
