import re
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from backend.auth.deps import load_session_for, require_user
from backend.config import MAX_RECORDING_MB
from backend.data.store import store
from backend.db.models import User
from backend.services.recording_storage import recording_storage

router = APIRouter(tags=["Sessions & Recordings"])

# Session ids end up in storage keys, so only allow plain id characters
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
MAX_RECORDING_BYTES = MAX_RECORDING_MB * 1024 * 1024
CHUNK_SIZE = 64 * 1024


def _authorized_key(session_id: str, user: User) -> str:
    """Validates the id, checks the caller is a participant, and returns the storage key."""
    clean_id = session_id.replace("peerpath-", "").replace("sess-", "")
    if not SAFE_ID_RE.match(clean_id):
        raise HTTPException(status_code=400, detail="Invalid session id")
    # Only the session's candidate and mentor may upload or watch its recording
    load_session_for(f"sess-{clean_id}", user)
    return clean_id


@router.post("/api/sessions/{session_id}/recording")
async def upload_recording(session_id: str, request: Request, user: User = Depends(require_user)):
    """Saves the session's video recording (.webm) uploaded from the WebRTC client."""
    clean_id = _authorized_key(session_id, user)

    # Capped so one upload can't exhaust memory/disk
    if int(request.headers.get("content-length") or 0) > MAX_RECORDING_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too large")
    body = await request.body()
    if len(body) > MAX_RECORDING_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too large")
    if not body:
        raise HTTPException(status_code=400, detail="Empty recording")

    try:
        size = recording_storage.save(f"sess-{clean_id}.webm", body, request.headers.get("content-type") or "video/webm")
    except Exception as e:
        print(f"[Recording] Save failed for session '{clean_id}': {e}")
        raise HTTPException(status_code=500, detail="Could not save recording")

    recording_url = f"/api/sessions/{clean_id}/recording"
    store.update_session(f"sess-{clean_id}", {"recordingUrl": recording_url, "hasRecording": True})
    print(f"[Recording] Saved recording for session '{clean_id}' ({size} bytes, {recording_storage.kind})")

    return {
        "success": True,
        "message": "Session recording saved successfully",
        "recordingUrl": recording_url,
        "sessionId": clean_id,
        "sizeBytes": size
    }


def _parse_range(range_header: str, file_size: int):
    """'bytes=START-END' / 'bytes=START-' / 'bytes=-SUFFIX' -> (start, end), or None if invalid."""
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
    if not match or (match.group(1) == "" and match.group(2) == ""):
        return None
    if match.group(1) == "":
        suffix = int(match.group(2))
        start, end = max(0, file_size - suffix), file_size - 1
    else:
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else file_size - 1
    end = min(end, file_size - 1)
    if start > end or start >= file_size:
        return None
    return start, end


@router.get("/api/sessions/{session_id}/recording")
async def stream_recording(session_id: str, request: Request, user: User = Depends(require_user)):
    """Streams the recording (supports Range requests for seeking)."""
    clean_id = _authorized_key(session_id, user)
    key = f"sess-{clean_id}.webm"

    if not recording_storage.exists(key):
        raise HTTPException(status_code=404, detail="Session recording video not found")

    if recording_storage.kind == "s3":
        # The bucket serves the bytes (and Range requests) via a short-lived signed link
        return RedirectResponse(recording_storage.presigned_url(key), status_code=307)

    file_path = recording_storage.path(key)
    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    def iter_bytes(start: int, length: int):
        with open(file_path, "rb") as video:
            video.seek(start)
            remaining = length
            while remaining > 0:
                data = video.read(min(remaining, CHUNK_SIZE))
                if not data:
                    break
                remaining -= len(data)
                yield data

    if range_header:
        byte_range = _parse_range(range_header, file_size)
        if byte_range is None:
            raise HTTPException(status_code=416, detail="Requested range not satisfiable",
                                headers={"Content-Range": f"bytes */{file_size}"})
        start, end = byte_range
        length = end - start + 1
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/webm",
        }
        return StreamingResponse(iter_bytes(start, length), status_code=206, headers=headers)

    headers = {
        "Content-Length": str(file_size),
        "Accept-Ranges": "bytes",
        "Content-Type": "video/webm",
    }
    return StreamingResponse(iter_bytes(0, file_size), status_code=200, headers=headers)
