import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const ENV_BACKEND_URL = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL
  ? String((import.meta as any).env.VITE_API_URL).replace(/\/$/, '')
  : '';

export interface PeerState {
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSharingScreen?: boolean;
  name?: string;
  avatar?: string;
}

export interface WebRTCCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onRemoteStreamRemoved?: () => void;
  onPeerJoined?: (peerInfo: { socketId: string; userId: string; userName: string; userRole: string; avatar?: string }) => void;
  onPeerLeft?: (userName?: string) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onPeerMediaStateChange?: (state: PeerState) => void;
  onError?: (err: Error) => void;
}

export class WebRTCService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  
  private roomId: string = '';
  private currentPeerSocketId: string | null = null;
  private callbacks: WebRTCCallbacks = {};
  private isInitiator: boolean = false;
  public isRecording: boolean = false;

  constructor(callbacks: WebRTCCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Connect to Signaling Server and Join Session Room
   */
  public async joinRoom(params: {
    roomId: string;
    userId: string;
    userName: string;
    userRole: string;
    avatar?: string;
    localStream?: MediaStream;
  }) {
    this.roomId = params.roomId;
    if (params.localStream) {
      this.localStream = params.localStream;
    }

    // Determine signaling server URL (same origin in unified, or configured remote backend)
    const signalingUrl = ENV_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

    this.socket = io(signalingUrl, {
      transports: ['websocket', 'polling'],
      // The server authenticates the socket with the session cookie
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupSocketListeners();

    this.socket.emit('join-room', {
      roomId: params.roomId,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      avatar: params.avatar
    });
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Room joined - check if other participant is already in room
    this.socket.on('room-joined', async (data: { roomId: string; yourSocketId: string; participants: any[]; isRecording: boolean }) => {
      console.log('[WebRTC] Joined room:', data.roomId, 'Existing participants:', data.participants.length);
      
      if (data.participants && data.participants.length > 0) {
        // We joined an existing room where another peer is already waiting -> We initiate the call
        const peer = data.participants[0];
        this.currentPeerSocketId = peer.socketId;
        this.isInitiator = true;
        this.callbacks.onPeerJoined?.(peer);
        await this.initiateCall(peer.socketId);
      }
    });

    // Another peer joined our room
    this.socket.on('user-connected', async (data: { participant: any; roomId: string }) => {
      console.log('[WebRTC] Peer connected to room:', data.participant.userName);
      this.currentPeerSocketId = data.participant.socketId;
      this.callbacks.onPeerJoined?.(data.participant);
    });

    // Received WebRTC Offer
    this.socket.on('offer', async (data: { sdp: RTCSessionDescriptionInit; from: string; sender: any; roomId: string }) => {
      console.log('[WebRTC] Received offer from:', data.from);
      this.currentPeerSocketId = data.from;
      this.isInitiator = false;
      await this.handleOffer(data.sdp, data.from);
    });

    // Received WebRTC Answer
    this.socket.on('answer', async (data: { sdp: RTCSessionDescriptionInit; from: string; roomId: string }) => {
      console.log('[WebRTC] Received answer from:', data.from);
      await this.handleAnswer(data.sdp);
    });

    // Received ICE candidate
    this.socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; from: string; roomId: string }) => {
      if (this.peerConnection && data.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn('[WebRTC] Failed adding ICE candidate:', err);
        }
      }
    });

    // Peer media state change (muted, camera off, screen share)
    this.socket.on('peer-media-state', (data: PeerState) => {
      this.callbacks.onPeerMediaStateChange?.(data);
    });

    // Recording status sync
    this.socket.on('recording-state-updated', (data: { isRecording: boolean }) => {
      this.isRecording = data.isRecording;
      this.callbacks.onRecordingStateChange?.(data.isRecording);
    });

    // Peer disconnected
    this.socket.on('user-disconnected', (data: { socketId: string; userName?: string }) => {
      console.log('[WebRTC] Peer disconnected:', data.userName || data.socketId);
      this.currentPeerSocketId = null;
      this.callbacks.onPeerLeft?.(data.userName);
      this.closePeerConnection();
    });
  }

  private createPeerConnection(remoteSocketId: string): RTCPeerConnection {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnection = pc;

    // Add local media tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote media tracks
    this.remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      console.log('[WebRTC] Incoming remote track:', event.track.kind);
      if (this.remoteStream) {
        this.remoteStream.addTrack(event.track);
        this.callbacks.onRemoteStream?.(this.remoteStream);
      }
    };

    // Relay local ICE candidates to peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket && remoteSocketId) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate.toJSON(),
          to: remoteSocketId,
          roomId: this.roomId
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Peer Connection state:', pc.connectionState);
      this.callbacks.onConnectionStateChange?.(pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.callbacks.onRemoteStreamRemoved?.();
      }
    };

    return pc;
  }

  private async initiateCall(remoteSocketId: string) {
    try {
      const pc = this.createPeerConnection(remoteSocketId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      if (this.socket) {
        this.socket.emit('offer', {
          sdp: offer,
          to: remoteSocketId,
          roomId: this.roomId
        });
      }
    } catch (err: any) {
      console.error('[WebRTC] Failed to initiate call:', err);
      this.callbacks.onError?.(err);
    }
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit, remoteSocketId: string) {
    try {
      const pc = this.createPeerConnection(remoteSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (this.socket) {
        this.socket.emit('answer', {
          sdp: answer,
          to: remoteSocketId,
          roomId: this.roomId
        });
      }
    } catch (err: any) {
      console.error('[WebRTC] Failed to handle offer:', err);
      this.callbacks.onError?.(err);
    }
  }

  private async handleAnswer(sdp: RTCSessionDescriptionInit) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    } catch (err: any) {
      console.error('[WebRTC] Failed to handle answer:', err);
      this.callbacks.onError?.(err);
    }
  }

  /**
   * Replace active video track (e.g. switching between Webcam and Screen Sharing)
   */
  public async replaceVideoTrack(newTrack: MediaStreamTrack) {
    if (!this.peerConnection) return;
    const senders = this.peerConnection.getSenders();
    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(newTrack);
    }
  }

  /**
   * Broadcast media state changes (Mute, Camera off, Screen Share)
   */
  public broadcastMediaState(state: { isMuted?: boolean; isVideoOff?: boolean; isSharingScreen?: boolean }) {
    if (this.socket && this.roomId) {
      this.socket.emit('media-state-change', {
        ...state,
        roomId: this.roomId
      });
    }
  }

  /**
   * Start in-browser composite MediaRecorder
   */
  public startRecording(): boolean {
    try {
      // Determine streams to record (Local webcam + screen share + remote stream if available)
      const recordingStream = new MediaStream();

      if (this.localStream) {
        this.localStream.getTracks().forEach(t => recordingStream.addTrack(t));
      }
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach(t => {
          if (!recordingStream.getTracks().some(existing => existing.id === t.id)) {
            recordingStream.addTrack(t);
          }
        });
      }

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];

      const supportedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 1500000 // 1.5 Mbps high definition
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      if (this.socket && this.roomId) {
        this.socket.emit('recording-state', {
          isRecording: true,
          roomId: this.roomId
        });
      }

      console.log('[WebRTC Recording] Recording started with MIME:', supportedMime);
      return true;
    } catch (err) {
      console.error('[WebRTC Recording] Failed to start recording:', err);
      return false;
    }
  }

  /**
   * Stop recording and get finalized video Blob + download URL
   */
  public async stopRecording(): Promise<{
    blob: Blob | null;
    durationSeconds: number;
    downloadUrl: string | null;
  }> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return { blob: null, durationSeconds: 0, downloadUrl: null };
    }

    return new Promise((resolve) => {
      const durationSeconds = Math.round((Date.now() - this.recordingStartTime) / 1000);

      this.mediaRecorder!.onstop = () => {
        const mime = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const downloadUrl = URL.createObjectURL(blob);
        this.isRecording = false;

        if (this.socket && this.roomId) {
          this.socket.emit('recording-state', {
            isRecording: false,
            roomId: this.roomId
          });
        }

        console.log(`[WebRTC Recording] Stopped. Finalized blob: ${blob.size} bytes, duration: ${durationSeconds}s`);
        resolve({ blob, durationSeconds, downloadUrl });
      };

      this.mediaRecorder!.stop();
    });
  }

  /**
   * Upload recorded video to Shine Peerpath backend server
   */
  public async uploadRecording(sessionId: string, blob: Blob, durationSeconds: number): Promise<boolean> {
    try {
      const cleanSessionId = sessionId.replace(/^peerpath-/, '').replace(/^sess-/, '');
      const apiBase = ENV_BACKEND_URL ? `${ENV_BACKEND_URL}/api` : '/api';
      const response = await fetch(`${apiBase}/sessions/${cleanSessionId}/recording`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'video/webm'
        },
        body: blob
      });

      if (response.ok) {
        console.log('[WebRTC Recording] Uploaded successfully for session:', cleanSessionId);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[WebRTC Recording] Upload failed (saving locally only):', err);
      return false;
    }
  }

  public closePeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            try {
              sender.track.stop();
              sender.track.enabled = false;
            } catch (e) {}
          }
        });
      } catch (e) {}
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(t => {
        try {
          t.stop();
          t.enabled = false;
        } catch (e) {}
      });
      this.remoteStream = null;
    }
  }

  public leaveRoom() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch (e) {}

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => {
        try {
          t.stop();
          t.enabled = false;
        } catch (e) {}
      });
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => {
        try {
          t.stop();
          t.enabled = false;
        } catch (e) {}
      });
      this.screenStream = null;
    }

    this.closePeerConnection();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

