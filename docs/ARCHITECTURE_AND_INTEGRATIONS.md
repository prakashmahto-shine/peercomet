# Shine Peerpath — System Architecture & Third-Party Integrations

This document provides a comprehensive technical overview of the Shine Peerpath platform, explaining how the **1:1 Video Calling**, **Signaling**, **Teaser Video Uploads**, **Real-Time Notifications**, and **Third-Party Services** work.

---

## 📑 Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [1:1 Video Calling System (WebRTC Architecture)](#2-11-video-calling-system-webrtc-architecture)
3. [Third-Party Services & Libraries Used](#3-third-party-services--libraries-used)
4. [Teaser Video & Session Recording System](#4-teaser-video--session-recording-system)
5. [Real-Time Notification & Messaging Engine](#5-real-time-notification--messaging-engine)
6. [Production Deployment](#6-production-deployment)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (React 18)                         │
│  - Candidate Career Guidance & CV Gap Analysis UI                           │
│  - Mentor Discovery Gallery & Lightbox Teaser Player                        │
│  - Booking Checkout & UPI Payment Flow                                      │
│  - 1:1 Live Video Call Cockpit (Camera, Mic, Screen Share, In-Call Chat)   │
│  - Mentor Zero-Prep Dossier & Peer-Verified Rubric Assessment               │
│  - Recruiter Talent Search with Verified Badges                             │
│  - Real-Time Notification Bell & Community Discussion Feed                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (REST APIs + Socket.IO WebSockets)
┌─────────────────────────────────────────────────────────────────────────────┐
│                 BACKEND LAYER (Python FastAPI + python-socketio)             │
│  - /api/cv & /api/trajectory: AI/ML Gap Analysis & Jump Matching            │
│  - /api/creators: Mentor Profiles, Teasers & Availability                   │
│  - /api/bookings & /api/payments: Slot Booking & Mock UPI Checkout          │
│  - /api/sessions & /api/creator: Zero-Prep Briefing Dossier & Rubrics       │
│  - /api/recruiter: Peer-Verified Candidate Search API                       │
│  - /api/community: Discussion Threads, Likes & Comments                     │
│  - /api/notifications: Targeted User Push Notifications (`user:${id}`)     │
│  - WebRTC Signaling Server: P2P Handshake (SDP/ICE) & Room Management       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 1:1 Video Calling System (WebRTC Architecture)

For 1-on-1 mentorship calls, the system uses **Peer-to-Peer (P2P) WebRTC**. 

### How Video & Audio Flow
* **Zero Server Video Bandwidth:** Video and audio streams travel **directly between Candidate and Mentor browsers** via encrypted P2P channels (DTLS/SRTP).
* **The backend is ONLY a Signaling Coordinator:** It handles the initial 1-2 second connection handshake and in-call chat. Once connected, video packets do NOT flow through the server.

```
[Candidate Browser] ◄═════ (Direct Encrypted HD Video/Audio) ═════► [Mentor Browser]
        │                                                                  │
        │ (Initial 1-2 sec handshake: SDP Offer/Answer + ICE Candidates)   │
        ▼                                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│            Backend (`backend/services/socket_service.py`)                    │
│   - Manages room creation (`join-room`, `leave-room`)                       │
│   - Exchanges SDP Offer / Answer (`signal-offer`, `signal-answer`)           │
│   - Routes ICE candidates for NAT traversal (`signal-ice`)                  │
│   - Relays real-time in-call text chat & emoji reactions                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### STUN & TURN Servers (Third-Party Infrastructure)
To establish connection through firewalls and NAT routers:

1. **STUN Server (Free / Google Public STUN):**
   - URLs configured: `stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`
   - **Role:** Discovers the public IP and port of each peer. Works for **~85%** of standard home and mobile internet connections.
2. **TURN Server (Production Fallback Relay):**
   - **Role:** When users are behind strict corporate firewalls, symmetric NATs, or enterprise VPNs (~15% of users), direct P2P is blocked. A TURN server acts as an encrypted relay.
   - **Recommended Production Providers:**
     - **Option A (Self-Hosted):** `Coturn` on AWS EC2 (Cost-effective).
     - **Option B (Managed Cloud):** `Twilio Network Traversal Service` or `Metered.ca TURN`.

---

## 3. Third-Party Services & Libraries Used

| Component / Library | Type | Purpose in Platform |
| :--- | :--- | :--- |
| **WebRTC (`RTCPeerConnection`)** | Browser Native API | Direct 1:1 HD Video, Audio, and Screen Sharing (`getDisplayMedia`). |
| **Socket.IO (`socket.io` & `socket.io-client`)** | Real-Time WebSockets | WebRTC signaling, in-call chat, and instant push notifications. |
| **MediaRecorder API** | Browser Native API | In-browser session recording into WebM chunks. |
| **canvas-confetti** | UI Animation | Celebratory confetti for booking confirmations & badge issuance. |
| **lucide-react** | UI Icon System | Clean, modern SVG icon set across all views. |
| **FastAPI + Uvicorn** | Backend Framework | REST APIs (`backend/routers`). |
| **python-socketio** | Real-Time Server | WebRTC signaling rooms and push notifications. |
| **SQLAlchemy + Alembic + PostgreSQL** | Database | Data access and schema migrations (`backend/db`). |
| **sentence-transformers + Milvus Lite** | Matching | Embeddings and vector search for mentor matching. |

---

## 4. Teaser Video & Session Recording System

### A. Mentor 60-Second Teaser Pitch
* **Upload Endpoint:** `POST /api/creators/:id/teaser-video`
  - Mentors can upload `.mp4`, `.webm`, or `.mov` pitch videos (binary buffer or base64).
* **Streaming Endpoint:** `GET /api/creators/:id/teaser-video`
  - Implements **HTTP 206 Partial Content Range Streaming** (`Accept-Ranges: bytes`), enabling instant playback and smooth scrubbing on any device.
* **Candidate Lightbox:**
  - Candidates can preview the 60-sec teaser directly from expert cards and profile pages before booking.

### B. Session Video Recordings
* **Upload Endpoint:** `POST /api/sessions/:id/recording`
* **Playback Endpoint:** `GET /api/sessions/:id/recording`
* **Production Recommendation:** For production at scale, recordings should be saved to **AWS S3** or **Cloudflare R2** using Pre-Signed Upload URLs.

---

## 5. Real-Time Notification & Messaging Engine

* **Channel-Based Routing:** Every user joins their private room: `user:${userId}`.
* **Instant Delivery (< 20ms):** When an event occurs (Booking, Assessment Badge, Mentor Post, Comment, Announcement), backend emits:
  ```typescript
  io.to(`user:${recipientId}`).emit('notification:received', notificationPayload);
  ```
* **REST Endpoints for Persistence & History:**
  - `GET /api/notifications` — Fetch notification history.
  - `GET /api/notifications/unread-count` — Ultra-fast unread badge counter.
  - `PATCH /api/notifications/:id/read` — Mark single item as read.
  - `POST /api/notifications/mark-all-read` — Clear all unread items.
  - `POST /api/notifications/broadcast` — Send system-wide announcements.

---

## 6. Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the container, configuration, database, storage, ingress and TURN requirements.
