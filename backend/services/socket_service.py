import time
from http.cookies import SimpleCookie
from typing import Dict, Any, Optional
import socketio

from backend.config import CORS_ORIGINS, SESSION_COOKIE_NAME

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=CORS_ORIGINS,
    ping_timeout=60,
    ping_interval=25
)

# Socket ID -> authenticated PeerPath user id (from the session cookie at connect time)
socket_users: Dict[str, str] = {}


def _user_id_from_environ(environ) -> Optional[str]:
    from backend.data.store import store
    cookie = SimpleCookie()
    try:
        cookie.load(environ.get("HTTP_COOKIE", ""))
    except Exception:
        return None
    morsel = cookie.get(SESSION_COOKIE_NAME)
    user = store.get_user_by_session_token(morsel.value) if morsel else None
    return user.id if user else None


def _session_id_for_room(room_id: str) -> str:
    # The client derives roomId as 'peerpath-room-<session id without "sess-">'
    return "sess-" + room_id.replace("peerpath-room-", "", 1).replace("sess-", "", 1)


def _can_join_room(user_id: str, room_id: str) -> bool:
    from backend.data.store import store
    session = store.get_session_by_id(_session_id_for_room(room_id))
    if not session or session.status == 'cancelled':
        return False
    if session.candidateId.lower() == user_id.lower():
        return True
    return (store.get_creator_owner(session.expertId) or '') == user_id


def _in_same_room(sid: str, other_sid: str, room_id: Optional[str]) -> bool:
    room = active_rooms.get(room_id or "")
    return bool(room and sid in room["participants"] and other_sid in room["participants"])

# Active WebRTC Video Calling Rooms state
# roomId -> { roomId: str, participants: { socketId: dict }, isRecording: bool, recordingStartedAt?: float }
active_rooms: Dict[str, Dict[str, Any]] = {}

# Socket ID -> set of roomIds
socket_rooms_map: Dict[str, set] = {}

@sio.event
async def connect(sid, environ):
    user_id = _user_id_from_environ(environ)
    if not user_id:
        # Reject unauthenticated sockets
        return False
    socket_users[sid] = user_id
    socket_rooms_map[sid] = set()

@sio.event
async def disconnect(sid):
    print(f"[WebRTC Signaling] Client disconnected: {sid}")
    joined_rooms = list(socket_rooms_map.get(sid, set()))
    
    for room_id in joined_rooms:
        if room_id in active_rooms:
            room = active_rooms[room_id]
            participant = room["participants"].pop(sid, None)
            
            # Broadcast peer leave event to remaining participants in room
            await sio.emit(
                "user-disconnected",
                {
                    "socketId": sid,
                    "userId": participant.get("userId") if participant else None,
                    "userName": participant.get("userName") if participant else None
                },
                room=room_id,
                skip_sid=sid
            )
            
            if len(room["participants"]) == 0:
                active_rooms.pop(room_id, None)
                print(f"[WebRTC Signaling] Room {room_id} emptied and closed.")
    
    socket_rooms_map.pop(sid, None)
    socket_users.pop(sid, None)

@sio.on("register-user")
async def handle_register_user(sid, data):
    """Register socket for targeted push notifications (always for the authenticated user)"""
    user_id = socket_users.get(sid)
    if user_id:
        user_room = f"user:{user_id.lower()}"
        await sio.enter_room(sid, user_room)
        socket_rooms_map.setdefault(sid, set()).add(user_room)
        print(f"[Signaling] User '{user_id}' registered for push notifications on {sid}")

@sio.on("join-post-thread")
async def handle_join_post_thread(sid, post_id):
    """Subscribe to live comments on a community post"""
    if post_id:
        thread_room = f"post:{post_id}"
        await sio.enter_room(sid, thread_room)
        socket_rooms_map.setdefault(sid, set()).add(thread_room)

@sio.on("join-room")
async def handle_join_room(sid, data):
    """
    Join WebRTC 1:1 Video Mentorship Room
    data: { roomId, userId, userName, userRole, avatar }
    """
    room_id = data.get("roomId")
    if not room_id:
        return

    user_id = socket_users.get(sid)
    if not user_id or not _can_join_room(user_id, room_id):
        await sio.emit("room-error", {"roomId": room_id, "message": "You are not a participant of this session"}, to=sid)
        return

    user_name = data.get("userName") or "Peer User"
    user_role = data.get("userRole") or "candidate"
    avatar = data.get("avatar")

    await sio.enter_room(sid, room_id)
    socket_rooms_map.setdefault(sid, set()).add(room_id)

    if room_id not in active_rooms:
        active_rooms[room_id] = {
            "roomId": room_id,
            "participants": {},
            "isRecording": False,
            "recordingStartedAt": None
        }

    room = active_rooms[room_id]
    participant = {
        "socketId": sid,
        "userId": user_id,
        "userName": user_name,
        "userRole": user_role,
        "avatar": avatar,
        "isMuted": False,
        "isVideoOff": False,
        "isSharingScreen": False,
        "joinedAt": time.time() * 1000
    }

    # Filter out joiner to return existing peers in room BEFORE adding current participant
    other_participants = list(room["participants"].values())
    room["participants"][sid] = participant

    # Ack joiner with current room status and existing peers
    await sio.emit(
        "room-joined",
        {
            "roomId": room_id,
            "yourSocketId": sid,
            "participants": other_participants,
            "isRecording": room["isRecording"]
        },
        to=sid
    )

    # Notify existing peers in room about new joiner
    await sio.emit(
        "user-connected",
        {
            "participant": participant,
            "roomId": room_id
        },
        room=room_id,
        skip_sid=sid
    )

    print(f"[WebRTC Signaling] {user_role} joined room '{room_id}'. Total peers in room: {len(room['participants'])}")

@sio.on("offer")
async def handle_offer(sid, data):
    """Relay WebRTC SDP Offer to targeted peer"""
    to_sid = data.get("to")
    room_id = data.get("roomId")
    sdp = data.get("sdp")
    
    room = active_rooms.get(room_id)
    sender = room["participants"].get(sid) if room else None

    if to_sid and sdp and _in_same_room(sid, to_sid, room_id):
        await sio.emit(
            "offer",
            {
                "sdp": sdp,
                "from": sid,
                "sender": sender,
                "roomId": room_id
            },
            to=to_sid
        )
        print(f"[WebRTC Signaling] Relayed SDP Offer from {sid} -> {to_sid}")

@sio.on("answer")
async def handle_answer(sid, data):
    """Relay WebRTC SDP Answer to targeted peer"""
    to_sid = data.get("to")
    room_id = data.get("roomId")
    sdp = data.get("sdp")

    if to_sid and sdp and _in_same_room(sid, to_sid, room_id):
        await sio.emit(
            "answer",
            {
                "sdp": sdp,
                "from": sid,
                "roomId": room_id
            },
            to=to_sid
        )
        print(f"[WebRTC Signaling] Relayed SDP Answer from {sid} -> {to_sid}")

@sio.on("ice-candidate")
async def handle_ice_candidate(sid, data):
    """Relay ICE Candidate to targeted peer for NAT/STUN traversal"""
    to_sid = data.get("to")
    candidate = data.get("candidate")
    room_id = data.get("roomId")

    if to_sid and candidate and _in_same_room(sid, to_sid, room_id):
        await sio.emit(
            "ice-candidate",
            {
                "candidate": candidate,
                "from": sid,
                "roomId": room_id
            },
            to=to_sid
        )

@sio.on("media-state-change")
async def handle_media_state_change(sid, data):
    """Broadcast mic mute, camera toggle, screen sharing status"""
    room_id = data.get("roomId")
    is_muted = data.get("isMuted")
    is_video_off = data.get("isVideoOff")
    is_sharing_screen = data.get("isSharingScreen")

    room = active_rooms.get(room_id)
    if room and sid in room["participants"]:
        p = room["participants"][sid]
        if isinstance(is_muted, bool):
            p["isMuted"] = is_muted
        if isinstance(is_video_off, bool):
            p["isVideoOff"] = is_video_off
        if isinstance(is_sharing_screen, bool):
            p["isSharingScreen"] = is_sharing_screen

        await sio.emit(
            "peer-media-state",
            {
                "socketId": sid,
                "userId": p["userId"],
                "isMuted": p["isMuted"],
                "isVideoOff": p["isVideoOff"],
                "isSharingScreen": p["isSharingScreen"]
            },
            room=room_id,
            skip_sid=sid
        )

@sio.on("recording-state")
async def handle_recording_state(sid, data):
    """Synchronize live recording state across participants"""
    room_id = data.get("roomId")
    is_recording = bool(data.get("isRecording"))

    room = active_rooms.get(room_id)
    if room and sid in room["participants"]:
        room["isRecording"] = is_recording
        room["recordingStartedAt"] = (time.time() * 1000) if is_recording else None
        
        await sio.emit(
            "recording-state-updated",
            {
                "isRecording": is_recording,
                "startedAt": room["recordingStartedAt"]
            },
            room=room_id
        )
        print(f"[WebRTC Signaling] Room '{room_id}' recording state changed to: {is_recording}")


# ==============================================================================
# Helper functions for Broadcasting from FastAPI Services
# ==============================================================================

async def broadcast_new_post(post_dict: dict):
    """Broadcast newly created community post to all active clients"""
    try:
        await sio.emit("community:new_post", post_dict)
    except Exception as e:
        print(f"[Socket] broadcast_new_post error: {e}")

async def broadcast_new_comment(post_id: str, comment_dict: dict):
    """Broadcast comment to post discussion room and global channel"""
    try:
        payload = {"postId": post_id, "comment": comment_dict}
        await sio.emit("community:new_comment", payload)
        await sio.emit("community:post_comment", payload, room=f"post:{post_id}")
    except Exception as e:
        print(f"[Socket] broadcast_new_comment error: {e}")

async def send_user_notification(recipient_id: str, notif_dict: dict):
    """Push real-time notification to user's private channel"""
    try:
        if recipient_id == "all":
            await sio.emit("notification:received", notif_dict)
        else:
            await sio.emit("notification:received", notif_dict, room=f"user:{recipient_id.lower()}")
            await sio.emit(f"notification:user_{recipient_id.lower()}", notif_dict)
    except Exception as e:
        print(f"[Socket] send_user_notification error: {e}")
