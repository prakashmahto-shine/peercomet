import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, FileText, ShieldCheck, User, X, Zap, Award, 
  Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Camera, 
  Wifi, Download, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WebRTCService, PeerState } from '../../services/webrtcService';
import { API_BASE, apiFetch } from '../../services/api';

export const LiveVideoCallView: React.FC = () => {
  const { 
    activeSession, 
    selectedExpert, 
    navigate, 
    userProfile, 
    currentUser, 
    isCreatorMode,
    markSessionHeld,
    setAssessmentDraftSession,
    setIsAssessmentModalOpen,
    showToast 
  } = useApp();

  const isMentor = isCreatorMode || currentUser?.role === 'mentor';
  const expert = activeSession?.expert || selectedExpert;
  const candidateName = activeSession?.candidateName || userProfile?.name || currentUser?.name || 'Candidate';
  const candidateRole = activeSession?.candidateRole || 'Senior Frontend Engineer';

  const sessionId = activeSession?.id || `sess-${expert.id || 'mentor'}-live`;
  const roomId = `peerpath-room-${sessionId.replace(/^peerpath-/, '').replace(/^sess-/, '')}`;

  // Call timer
  const [seconds, setSeconds] = useState<number>(0);

  // Local media states
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<boolean>(false);

  // Remote peer states
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);
  const [peerState, setPeerState] = useState<PeerState>({
    isMuted: false,
    isVideoOff: false,
    isSharingScreen: false,
    name: isMentor ? candidateName : expert.name
  });

  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDownloadUrl, setRecordingDownloadUrl] = useState<string | null>(null);
  const [recordingUploaded, setRecordingUploaded] = useState<boolean>(false);

  // Drawer & Assessment
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [rubricApproved, setRubricApproved] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'connecting' | 'reconnecting'>('connecting');

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Stream & Service refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);

  // Timer counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebRTC Initialization & Media Setup
  useEffect(() => {
    let isMounted = true;

    const initWebRTC = async () => {
      try {
        // 1. Get local webcam + audio stream
        let stream: MediaStream | null = null;
        try {
          if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            // Browsers only allow camera/mic on HTTPS (or localhost)
            setCameraError(true);
            showToast(
              'Camera and mic unavailable',
              window.isSecureContext
                ? 'This browser does not support video calls.'
                : 'Video calls need a secure (HTTPS) connection. Please open the site over https://.',
              'warning'
            );
          } else {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: true
            });
            localStreamRef.current = stream;
            if (localVideoRef.current && isMounted) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.play().catch(() => {});
            }
            setCameraError(false);
          }
        } catch (err) {
          console.warn('[WebRTC] Camera/Mic access denied or unavailable:', err);
          setCameraError(true);
        }

        // 2. Initialize WebRTC Service with callbacks
        const service = new WebRTCService({
          onRemoteStream: (remoteStream) => {
            console.log('[WebRTC UI] Setting remote stream to video element');
            setIsPeerConnected(true);
            setConnectionQuality('good');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(e => console.warn('Autoplay error:', e));
            }
          },
          onRemoteStreamRemoved: () => {
            setIsPeerConnected(false);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
          },
          onPeerJoined: (peerInfo) => {
            setIsPeerConnected(true);
            setConnectionQuality('good');
            setPeerState(prev => ({
              ...prev,
              name: peerInfo.userName || (isMentor ? candidateName : expert.name),
              avatar: peerInfo.avatar
            }));
            showToast(`Connected with ${peerInfo.userName || 'peer'}`, 'Live 1:1 video & audio session is active.', 'success');
          },
          onPeerLeft: (peerName) => {
            setIsPeerConnected(false);
            setConnectionQuality('connecting');
            showToast(`${peerName || 'Participant'} left the room`, 'Waiting for peer to reconnect...', 'info');
          },
          onConnectionStateChange: (state) => {
            if (state === 'connected') {
              setConnectionQuality('good');
            } else if (state === 'connecting') {
              setConnectionQuality('connecting');
            } else if (state === 'disconnected' || state === 'failed') {
              setConnectionQuality('reconnecting');
            }
          },
          onRecordingStateChange: (recStatus) => {
            setIsRecording(recStatus);
          },
          onPeerMediaStateChange: (state) => {
            setPeerState(prev => ({ ...prev, ...state }));
          }
        });

        webrtcServiceRef.current = service;

        // 3. Connect to room
        await service.joinRoom({
          roomId,
          userId: currentUser?.id || (isMentor ? expert.id : 'candidate'),
          userName: isMentor ? expert.name : (currentUser?.name || userProfile?.name || 'Candidate'),
          userRole: isMentor ? 'mentor' : 'candidate',
          avatar: isMentor ? expert.avatar : (currentUser?.avatar || '/brand/android-chrome-192x192.png'),
          localStream: stream || undefined
        });

        // 4. Start auto-recording
        setTimeout(() => {
          if (service && isMounted) {
            service.startRecording();
          }
        }, 1500);

      } catch (err: any) {
        console.error('[WebRTC UI Init Error]:', err);
      }
    };

    initWebRTC();

    const handleWindowUnload = () => {
      stopAllMediaHardware();
    };
    window.addEventListener('beforeunload', handleWindowUnload);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleWindowUnload);
      stopAllMediaHardware();
    };
  }, [roomId]);

  /**
   * Immediately releases webcam, microphone, and screen share hardware locks
   */
  const stopAllMediaHardware = () => {
    // 1. Stop and disable all local webcam / audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('Error stopping local track:', e);
        }
      });
      localStreamRef.current = null;
    }

    // 2. Stop and disable all screen share tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('Error stopping screen track:', e);
        }
      });
      screenStreamRef.current = null;
    }

    // 3. Clear HTML5 video element source streams to free GPU/camera binding
    if (localVideoRef.current) {
      try {
        localVideoRef.current.pause();
        localVideoRef.current.srcObject = null;
      } catch (e) {}
    }
    if (remoteVideoRef.current) {
      try {
        remoteVideoRef.current.pause();
        remoteVideoRef.current.srcObject = null;
      } catch (e) {}
    }
    if (screenVideoRef.current) {
      try {
        screenVideoRef.current.pause();
        screenVideoRef.current.srcObject = null;
      } catch (e) {}
    }

    // 4. Disconnect signaling socket and close WebRTC peer connection
    if (webrtcServiceRef.current) {
      try {
        webrtcServiceRef.current.leaveRoom();
      } catch (e) {}
    }
  };

  // Toggle Mute (Audio)
  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !nextState;
      }
    }
    webrtcServiceRef.current?.broadcastMediaState({ isMuted: nextState });
  };

  // Toggle Camera (Video)
  const toggleCamera = () => {
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !nextState;
      }
    }
    webrtcServiceRef.current?.broadcastMediaState({ isVideoOff: nextState });
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      // Stop Screen Share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsSharingScreen(false);

      // Restore camera video track in WebRTC sender
      if (localStreamRef.current) {
        const camVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (camVideoTrack && webrtcServiceRef.current) {
          await webrtcServiceRef.current.replaceVideoTrack(camVideoTrack);
        }
      }

      webrtcServiceRef.current?.broadcastMediaState({ isSharingScreen: false });

      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }
      }, 100);
    } else {
      // Start Screen Share
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
          screenStreamRef.current = displayStream;
          setIsSharingScreen(true);

          const screenTrack = displayStream.getVideoTracks()[0];

          // Replace track in active WebRTC connection
          if (screenTrack && webrtcServiceRef.current) {
            await webrtcServiceRef.current.replaceVideoTrack(screenTrack);
          }

          webrtcServiceRef.current?.broadcastMediaState({ isSharingScreen: true });

          screenTrack.onended = () => {
            toggleScreenShare();
          };

          setTimeout(() => {
            if (screenVideoRef.current) {
              screenVideoRef.current.srcObject = displayStream;
              screenVideoRef.current.play().catch(() => {});
            }
          }, 100);
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Toggle Recording manually
  const toggleRecording = async () => {
    if (!webrtcServiceRef.current) return;
    if (isRecording) {
      const result = await webrtcServiceRef.current.stopRecording();
      setIsRecording(false);
      if (result.blob) {
        setRecordingBlob(result.blob);
        setRecordingDownloadUrl(result.downloadUrl);
        showToast('Recording Stopped', 'Session recording ready for download.', 'info');
      }
    } else {
      const started = webrtcServiceRef.current.startRecording();
      if (started) {
        setIsRecording(true);
        showToast('Recording Started', 'Session is being recorded in HD.', 'success');
      }
    }
  };

  // Format timer HH:MM:SS
  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `00:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // End Call & Complete Session
  const handleEnd = async () => {
    let finalBlob: Blob | null = recordingBlob;
    let finalDuration = seconds;

    // 1. Finalize recording if active
    if (webrtcServiceRef.current && isRecording) {
      try {
        const rec = await webrtcServiceRef.current.stopRecording();
        if (rec.blob) {
          finalBlob = rec.blob;
          finalDuration = rec.durationSeconds || seconds;
          setRecordingBlob(rec.blob);
          setRecordingDownloadUrl(rec.downloadUrl);
        }
      } catch (e) {
        console.warn('Recording stop warning:', e);
      }
    }

    // 2. IMMEDIATELY Release Camera, Microphone, and Screen Share Hardware
    stopAllMediaHardware();

    // 3. Background upload recording to backend
    if (finalBlob && activeSession?.id) {
      const cleanSessionId = activeSession.id.replace(/^peerpath-/, '').replace(/^sess-/, '');
      apiFetch(`${API_BASE}/sessions/${cleanSessionId}/recording`, {
        method: 'POST',
        headers: {
          'Content-Type': finalBlob.type || 'video/webm'
        },
        body: finalBlob
      }).catch(err => console.warn('Background upload warning:', err));
      setRecordingUploaded(true);
    }

    // 4. Mark the session as held. Badges/ratings are NOT issued here: the mentor assesses the
    //    candidate in MentorAssessmentModal and the candidate reviews the mentor in PostSessionView.
    if (activeSession?.id) {
      markSessionHeld(activeSession.id);
    }

    if (isMentor) {
      showToast('Session Completed', 'Share your assessment so the candidate gets their scorecard.', 'success');
      navigate('mentor-dashboard-view');
      if (activeSession) {
        setAssessmentDraftSession(activeSession);
        setIsAssessmentModalOpen(true);
      }
    } else {
      showToast('Session Completed', 'Your recording has been synced. Tell us how the session went!', 'success');
      navigate('post-session-view');
    }
  };

  const otherParticipantName = isMentor ? candidateName : expert.name;
  const otherParticipantRole = isMentor ? candidateRole : `${expert.role} • ${expert.company}`;
  const otherParticipantAvatar = isMentor ? (activeSession?.candidateAvatar || '/brand/android-chrome-192x192.png') : expert.avatar;

  return (
    <div className="video-call-fullscreen-wrapper">
      {/* Top Bar */}
      <div className="call-top-bar">
        <div className="call-title-left">
          <button 
            type="button" 
            onClick={toggleRecording}
            className={`call-recording-pill ${isRecording ? 'active' : ''}`}
            title="Click to toggle session recording"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            <span className={isRecording ? 'red-pulse-dot' : ''} style={{ background: isRecording ? '#EF4444' : '#64748B' }}></span>
            <span>{isRecording ? 'REC' : 'PAUSED'}</span>
          </button>

          <span className="call-session-title">
            <strong>{expert.domain} Guidance:</strong> {candidateName} ⇄ {expert.name} ({expert.company})
          </span>

          <span className="sc-confirmed-chip ml-3" style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: '11px' }}>
            <Wifi size={11} className={connectionQuality === 'good' ? 'text-emerald-400' : 'text-amber-400'} />
            <span>{isPeerConnected ? 'Live P2P Encrypted' : 'Waiting for Peer...'}</span>
          </span>
        </div>
        
        <div className="call-timer-center">
          <Clock size={16} /> <span>{formatTimer(seconds)}</span>
        </div>
        
        <div className="call-right-tools">
          <button className="btn-call-tool" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            <FileText size={15} /> Pre-loaded CV Gap Report
          </button>
        </div>
      </div>

      {/* Main Stage Grid (2 Video Feeds) */}
      <div className="call-main-stage">
        
        {/* PEER FEED (Left Video Box) */}
        <div className="video-feed-box mentor-feed">
          {isPeerConnected ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="feed-bg-img feed-webcam-stream"
                style={{ objectFit: 'cover' }}
              />
              {peerState.isMuted && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(239,68,68,0.85)', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MicOff size={12} /> Peer Muted
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0B1120', color: '#94A3B8', gap: '14px', textAlign: 'center', padding: '20px' }}>
              <div style={{ position: 'relative' }}>
                <img 
                  src={otherParticipantAvatar} 
                  alt={otherParticipantName} 
                  style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366F1' }} 
                />
                <span className="live-cam-pulse-dot" style={{ position: 'absolute', bottom: '2px', right: '2px', width: '16px', height: '16px', background: '#10B981' }}></span>
              </div>
              <div>
                <h4 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
                  Waiting for {otherParticipantName} to join...
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Room ID: <code style={{ color: '#818CF8' }}>{roomId}</code> (Invite link active)
                </p>
              </div>
            </div>
          )}

          <div className="feed-user-label">
            <ShieldCheck size={16} className="text-brand-gold" /> {otherParticipantName} ({otherParticipantRole})
          </div>
          
          {isPeerConnected && !peerState.isMuted && (
            <div className="sound-wave-indicator">
              <span></span><span></span><span></span><span></span>
            </div>
          )}
        </div>

        {/* LOCAL FEED (Right Video Box) */}
        <div className="video-feed-box candidate-feed">
          {isSharingScreen ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="feed-bg-img feed-screen-stream"
                style={{ objectFit: 'contain' }}
              />
              <div style={{ position: 'absolute', top: '16px', left: '16px', background: '#2563EB', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ScreenShare size={12} /> Sharing Your Screen / Resume
              </div>
            </div>
          ) : isVideoOff ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0f172a', color: '#94a3b8', gap: '10px' }}>
              <VideoOff size={48} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Your Camera is turned off</span>
            </div>
          ) : cameraError ? (
            <>
              <img 
                src={currentUser?.avatar || '/brand/android-chrome-192x192.png'} 
                alt="Candidate Feed" 
                className="feed-bg-img" 
              />
              <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.65)', color: '#FFD200', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={12} /> Camera Inactive (Voice Mode)
              </div>
            </>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="feed-bg-img feed-webcam-stream"
              style={{ transform: 'scaleX(-1)', objectFit: 'cover' }}
            />
          )}

          <div className="feed-user-label">
            <User size={15} /> You ({isMentor ? expert.name : userProfile.name} - {isMentor ? 'Mentor Host' : 'Candidate'})
          </div>

          {isMuted && (
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(239,68,68,0.85)', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MicOff size={12} /> Muted
            </div>
          )}
        </div>

        {/* Side Drawer: Pre-Loaded CV Gap Analysis & Rubric */}
        {isDrawerOpen && (
          <div className="cv-gap-drawer">
            <div className="drawer-header">
              <h3><Zap size={16} /> Pre-Loaded Mentee Gap Analysis</h3>
              <button className="btn-icon-xs" onClick={() => setIsDrawerOpen(false)}><X size={18} /></button>
            </div>
            <div className="drawer-body">
              <div className="candidate-brief">
                <strong>{candidateName}</strong> • {candidateRole} ➔ Target: {expert.domain}
              </div>
              <div className="rubric-checklist-box">
                <span className="rubric-subtitle">Mentor Evaluation Rubric (PeerPath AI):</span>
                <label className="rubric-item">
                  <input type="checkbox" defaultChecked />
                  <span>1. Core {expert.domain} discovery & client communication</span>
                </label>
                <label className="rubric-item">
                  <input type="checkbox" defaultChecked />
                  <span>2. Production scaling & technical problem-solving</span>
                </label>
                <label className="rubric-item">
                  <input type="checkbox" defaultChecked />
                  <span>3. Enterprise culture fit & leadership readiness</span>
                </label>
              </div>
              
              <button 
                type="button"
                className={`btn-shine-gold w-100 mt-3 ${rubricApproved ? 'active' : ''}`}
                onClick={() => { 
                  setRubricApproved(true);
                  showToast('Badge Approved!', `Peer-verified badge queued for ${candidateName}.`, 'success');
                }}
              >
                <Award size={16} /> {rubricApproved ? 'Peer-Verified Badge Approved ✓' : 'Approve Peer-Verified Badge'}
              </button>

              {recordingDownloadUrl && (
                <a 
                  href={recordingDownloadUrl} 
                  download={`shine-peerpath-session-${sessionId}.webm`}
                  className="btn-ghost-sm w-100 mt-2" 
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px' }}
                >
                  <Download size={14} /> Download Live Recording (.webm)
                </a>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Controls Bar */}
      <div className="call-bottom-controls-bar">
        <div className="call-ctrl-group">
          <button 
            type="button"
            className={`call-action-btn ${isMuted ? 'btn-active-muted' : ''}`} 
            onClick={toggleMute}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            <div className="btn-icon-circle">
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </div>
            <span className="btn-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          
          <button 
            type="button"
            className={`call-action-btn ${isVideoOff ? 'btn-active-muted' : ''}`} 
            onClick={toggleCamera}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            <div className="btn-icon-circle">
              {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
            </div>
            <span className="btn-label">{isVideoOff ? 'Turn On' : 'Stop Video'}</span>
          </button>
          
          <button 
            type="button"
            className={`call-action-btn ${isSharingScreen ? 'btn-active-screenshare' : ''}`} 
            onClick={toggleScreenShare}
            title={isSharingScreen ? 'Stop Screen Sharing' : 'Share Screen / Resume'}
          >
            <div className="btn-icon-circle">
              {isSharingScreen ? <ScreenShare size={18} /> : <ScreenShare size={18} />}
            </div>
            <span className="btn-label">{isSharingScreen ? 'Stop Share' : 'Share Screen'}</span>
          </button>
          
          <button 
            type="button"
            className={`call-action-btn ${isDrawerOpen ? 'btn-active-drawer' : ''}`} 
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title="Mentee Gap Sheet & Badge Rubric"
          >
            <div className="btn-icon-circle">
              <FileText size={18} />
            </div>
            <span className="btn-label">CV Gap Sheet</span>
          </button>
        </div>
        
        <div className="call-end-group">
          <button type="button" className="btn-end-call-prominent" onClick={handleEnd}>
            <PhoneOff size={18} /> End Session & Complete Review
          </button>
        </div>
      </div>
    </div>
  );
};
