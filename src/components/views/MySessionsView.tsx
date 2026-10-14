import React, { useEffect, useState } from 'react';
import { 
  Video, Plus, Calendar, FileCheck, CheckCircle2, 
  Award, Clock, AlertCircle, ArrowLeft, RotateCcw, 
  XCircle, ShieldCheck, Sparkles, Star, User, Settings,
  DollarSign, Briefcase, Trash2, X, FileText, UploadCloud,
  Play, Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { upcomingBookableDates } from '../../utils/bookingDates';
import { BRAND } from '../../config/brand';
import { isResumeRecent } from '../../utils/resume';

export const MySessionsView: React.FC = () => {
  const { 
    sessions, 
    currentUser,
    userProfile, 
    navigate, 
    navigateToCreatorStudio,
    cancelSession, 
    rescheduleSession, 
    setActiveSession,
    setAssessmentDraftSession,
    setIsAssessmentModalOpen,
    isCreatorMode,
    removeCandidateResume,
    setIsCvSyncModalOpen
  } = useApp();

  const isMentor = isCreatorMode || currentUser?.role === 'mentor';
  const mentorCreatorId = currentUser?.creatorId || currentUser?.id;

  // 1. Candidate's booked sessions: `sessions` is already scoped to this user's id by the backend
  const candidateBookedUpcoming = sessions.filter(s => s.status === 'upcoming');
  const candidateBookedCompleted = sessions.filter(s => s.status === 'completed');

  // 2. Mentor's hosted sessions, fetched by creator id (never by name)
  const [mentorSessions, setMentorSessions] = useState<typeof sessions>([]);
  useEffect(() => {
    if (!isMentor || !mentorCreatorId) return;
    let isCurrent = true;
    peerpathApi.getSessions(mentorCreatorId, 'mentor')
      .then(fetched => { if (isCurrent) setMentorSessions(fetched || []); })
      .catch(err => console.warn('[API getSessions mentor]:', err));
    return () => { isCurrent = false; };
  }, [isMentor, mentorCreatorId]);
  const mentorHostedUpcoming = mentorSessions.filter(s => s.status === 'upcoming');
  const mentorHostedCompleted = mentorSessions.filter(s => s.status === 'completed');

  const displayUpcoming = isMentor ? mentorHostedUpcoming : candidateBookedUpcoming;
  const displayCompleted = isMentor ? mentorHostedCompleted : candidateBookedCompleted;

  const [activeTab, setActiveTab] = useState<'hosted' | 'upcoming' | 'completed'>(
    isMentor ? 'hosted' : 'upcoming'
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  // Reschedule options come from the mentor's real availability
  const reschedulingSession = [...sessions, ...mentorSessions].find(s => s.id === reschedulingId);
  const rescheduleDateOptions = upcomingBookableDates(reschedulingSession?.expert.availability?.days);
  const rescheduleTimeOptions = reschedulingSession?.expert.availability?.timeSlots?.length
    ? reschedulingSession.expert.availability.timeSlots
    : ['10:00 AM - 11:00 AM', '02:00 PM - 03:00 PM', '06:30 PM - 07:30 PM', '08:00 PM - 09:00 PM'];

  const openReschedule = (sessionId: string) => {
    const sess = [...sessions, ...mentorSessions].find(s => s.id === sessionId);
    setReschedulingId(sessionId);
    setRescheduleDate(upcomingBookableDates(sess?.expert.availability?.days)[0] || '');
    setRescheduleTime(sess?.expert.availability?.timeSlots?.[0] || '10:00 AM - 11:00 AM');
  };
  const [preJoinCheckSession, setPreJoinCheckSession] = useState<typeof sessions[0] | null>(null);
  const [selectedRecordingSession, setSelectedRecordingSession] = useState<typeof sessions[0] | null>(null);

  // A resume uploaded in the last 30 days counts as up to date for the mentor
  const isCandidateCvSynced = isResumeRecent(userProfile);

  const handleJoinCall = (session: typeof sessions[0]) => {
    if (!isMentor && !isCandidateCvSynced) {
      setPreJoinCheckSession(session);
    } else {
      setActiveSession(session);
      navigate('live-call-view');
    }
  };

  const handleConfirmReschedule = async (sessionId: string) => {
    if (!rescheduleDate || !rescheduleTime) return;
    const ok = await rescheduleSession(sessionId, rescheduleDate, rescheduleTime);
    if (ok) setReschedulingId(null);
  };

  return (
    <div className="content-wrapper sessions-fullwidth-wrapper">
      
      {/* Top Header Navigation Row */}
      <div className="sessions-top-nav-bar" style={{ justifyContent: 'flex-end' }}>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isMentor ? (
            <>
              <button 
                type="button" 
                className="btn-ghost-sm"
                onClick={() => navigateToCreatorStudio('availability')}
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 700 }}
              >
                <Settings size={14} /> Profile & Slot Settings
              </button>
              <button 
                type="button" 
                className="btn-sessions-book-new"
                onClick={() => navigateToCreatorStudio('bookings')}
              >
                <Sparkles size={16} />
                <span>Mentor Studio</span>
              </button>
            </>
          ) : (
            <button 
              type="button" 
              className="btn-sessions-book-new"
              onClick={() => navigate('experts-view')}
            >
              <Plus size={16} />
              <span>Book a Mentor</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Header & Quick Stats Row */}
      <div className="sessions-hero-card">
        <div className="sessions-hero-content">
          <div className="sessions-hero-badge">
            <Sparkles size={12} className="text-amber-500" />
            <span>{isMentor ? `${BRAND.name} Verified Mentor Studio` : `${BRAND.name} Mentorship Dashboard`}</span>
          </div>
          <h1 className="sessions-hero-title">
            {isMentor ? 'Mentorship Studio & Live Sessions' : 'My Mentorship Sessions'}
          </h1>
          <p className="sessions-hero-subtitle">
            {isMentor
              ? 'Host 1:1 live guidance calls with ambitious candidates, evaluate skills, and manage your booking schedule.'
              : 'Manage your live 1:1 guidance calls with verified leaders, enter video meeting rooms, and access verified skill badges.'}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="sessions-hero-stats-grid">
          {isMentor ? (
            <>
              <div className="sh-stat-card">
                <div className="sh-stat-icon-wrap icon-purple"><Video size={16} /></div>
                <div>
                  <strong className="sh-stat-num">{mentorHostedUpcoming.length}</strong>
                  <span className="sh-stat-label">Calls Booked</span>
                </div>
              </div>

              <div className="sh-stat-card">
                <div className="sh-stat-icon-wrap icon-emerald"><DollarSign size={16} /></div>
                <div>
                  <strong className="sh-stat-num">₹{(userProfile.mentorEarnings || 47952).toLocaleString('en-IN')}</strong>
                  <span className="sh-stat-label">Total Earned</span>
                </div>
              </div>

              <div className="sh-stat-card">
                <div className="sh-stat-icon-wrap icon-amber"><ShieldCheck size={16} /></div>
                <div>
                  <strong className="sh-stat-num">{userProfile.mentorSessionsCount || 48}</strong>
                  <span className="sh-stat-label">Mentored ({userProfile.mentorRating || 4.9}★)</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="sh-stat-card">
                <div className="sh-stat-icon-wrap icon-purple"><Video size={16} /></div>
                <div>
                  <strong className="sh-stat-num">{candidateBookedUpcoming.length}</strong>
                  <span className="sh-stat-label">Upcoming</span>
                </div>
              </div>

              <div className="sh-stat-card">
                <div className="sh-stat-icon-wrap icon-emerald"><CheckCircle2 size={16} /></div>
                <div>
                  <strong className="sh-stat-num">{candidateBookedCompleted.length}</strong>
                  <span className="sh-stat-label">Completed</span>
                </div>
              </div>

              <div className="sh-stat-card">
                <div className="sh-stat-icon-wrap icon-amber"><ShieldCheck size={16} /></div>
                <div>
                  <strong className="sh-stat-num">1</strong>
                  <span className="sh-stat-label">Skill Badge</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="sessions-tabs-container">
        <div className="sessions-tab-btn-group">
          {isMentor ? (
            <>
              <button 
                type="button"
                className={`s-tab-btn ${activeTab === 'hosted' ? 'active' : ''}`}
                onClick={() => setActiveTab('hosted')}
              >
                <Video size={14} />
                <span>Candidate Calls (Hosted)</span>
                <span className="s-tab-pill">{mentorHostedUpcoming.length}</span>
              </button>

              <button 
                type="button"
                className={`s-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <Calendar size={14} />
                <span>My Booked Calls</span>
                <span className="s-tab-pill">{candidateBookedUpcoming.length}</span>
              </button>

              <button 
                type="button"
                className={`s-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                <Award size={14} />
                <span>Completed Calls</span>
                <span className="s-tab-pill">{mentorHostedCompleted.length}</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                className={`s-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <Calendar size={14} />
                <span>Upcoming Sessions</span>
                <span className="s-tab-pill">{candidateBookedUpcoming.length}</span>
              </button>

              <button 
                type="button"
                className={`s-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                <Award size={14} />
                <span>Completed &amp; Badges</span>
                <span className="s-tab-pill">{candidateBookedCompleted.length}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MENTOR TAB 1: Candidate Calls Hosted (for Akash / Mentor) */}
      {isMentor && activeTab === 'hosted' && (
        <div className="sessions-cards-stream">
          {mentorHostedUpcoming.length === 0 ? (
            <div className="empty-sessions-box-full">
              <div className="empty-icon-circle"><AlertCircle size={36} color="#94A3B8" /></div>
              <h3>No candidate bookings scheduled</h3>
              <p>Your availability is active on {BRAND.name}. Candidates will book calls based on your available schedule.</p>
              <button className="btn-shine-gold" onClick={() => navigateToCreatorStudio('availability')}>
                <Settings size={16} /> Manage Availability &amp; Pricing
              </button>
            </div>
          ) : (
            mentorHostedUpcoming.map((sess) => (
              <div key={sess.id} className="session-card-compact" style={{ borderLeft: '3px solid #8B5CF6' }}>
                
                {/* Row 1: Candidate Info + Schedule + Host Room CTA */}
                <div className="scc-main-row">
                  <div className="scc-mentor-profile">
                    <div className="scc-avatar-wrap">
                      <img src={sess.candidateAvatar || '/brand/android-chrome-192x192.png'} alt={sess.candidateName} className="scc-avatar" />
                      <span className="scc-verified-check" style={{ background: '#3B82F6' }}><User size={10} color="#fff" /></span>
                    </div>

                    <div className="scc-mentor-info">
                      <div className="scc-name-row">
                        <h3 className="scc-mentor-name">{sess.candidateName}</h3>
                        <span className="scc-confirmed-chip">
                          <span className="scc-pulse-dot"></span> Confirmed Candidate
                        </span>
                      </div>
                      <p className="scc-mentor-role">{sess.candidateRole || 'Senior Frontend Engineer'} • <strong>Goal: {sess.candidateGoal}</strong></p>
                    </div>
                  </div>

                  <div className="scc-schedule-pill">
                    <div className="scc-sched-item">
                      <Calendar size={13} className="text-blue-600" />
                      <span>{sess.date}</span>
                    </div>
                    <span className="scc-sched-divider">•</span>
                    <div className="scc-sched-item">
                      <Clock size={13} className="text-amber-600" />
                      <span>{sess.timeSlot}</span>
                    </div>
                  </div>

                  <div className="scc-action-cta">
                    <button 
                      type="button" 
                      className="btn-scc-join host-btn" 
                      onClick={() => handleJoinCall(sess)}
                    >
                      <span className="live-cam-pulse-dot"></span>
                      <Video size={14} />
                      <span>Start Video Call</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Secondary Bar */}
                <div className="scc-secondary-bar">
                  <span className="scc-fee-tag">
                    💰 Session Fee: <strong>₹{userProfile.mentorRate || 499}</strong> ({userProfile.mentorDuration || 30} mins)
                  </span>

                  <div className="scc-secondary-actions">
                    <button 
                      type="button" 
                      className="btn-scc-link" 
                      onClick={() => openReschedule(sess.id)}
                    >
                      <RotateCcw size={12} /> Reschedule
                    </button>
                  </div>
                </div>

                {/* Inline Reschedule Drawer */}
                {reschedulingId === sess.id && (
                  <div className="reschedule-drawer-card">
                    <div className="rd-header">
                      <h4><RotateCcw size={14} /> Propose New Date &amp; Time for {sess.candidateName}</h4>
                      <button className="btn-close-rd" onClick={() => setReschedulingId(null)}>
                        <XCircle size={15} />
                      </button>
                    </div>

                    <div className="reschedule-inputs-row">
                      <div className="rd-select-group">
                        <label>Date</label>
                        <select 
                          value={rescheduleDate} 
                          onChange={(e) => setRescheduleDate(e.target.value)} 
                          className="rd-select"
                        >
                          {rescheduleDateOptions.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rd-select-group">
                        <label>Time Slot</label>
                        <select 
                          value={rescheduleTime} 
                          onChange={(e) => setRescheduleTime(e.target.value)} 
                          className="rd-select"
                        >
                          {rescheduleTimeOptions.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rd-btn-group">
                        <button 
                          type="button"
                          className="btn-confirm-reschedule" 
                          onClick={() => handleConfirmReschedule(sess.id)}
                        >
                          Confirm
                        </button>
                        <button 
                          type="button" 
                          className="btn-cancel-rd" 
                          onClick={() => setReschedulingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      )}

      {/* CANDIDATE TAB 1: Upcoming Mentorship Sessions (where user is Candidate) */}
      {activeTab === 'upcoming' && (
        <div className="sessions-cards-stream">
          {candidateBookedUpcoming.length === 0 ? (
            <div className="empty-sessions-box-full">
              <div className="empty-icon-circle"><AlertCircle size={36} color="#94A3B8" /></div>
              <h3>No booked guidance calls scheduled</h3>
              <p>Explore verified industry leaders and book your 1:1 trajectory guidance call today.</p>
              <button className="btn-shine-gold" onClick={() => navigate('experts-view')}>
                <Plus size={16} /> Explore 500+ Mentors
              </button>
            </div>
          ) : (
            candidateBookedUpcoming.map((sess) => (
              <div key={sess.id} className="session-card-compact">
                
                {/* Row 1: Mentor Profile + Schedule Badge + Join Room Action */}
                <div className="scc-main-row">
                  <div className="scc-mentor-profile">
                    <div className="scc-avatar-wrap">
                      <img src={sess.expert.avatar} alt={sess.expert.name} className="scc-avatar" />
                      <span className="scc-verified-check"><CheckCircle2 size={10} /></span>
                    </div>

                    <div className="scc-mentor-info">
                      <div className="scc-name-row">
                        <h3 className="scc-mentor-name">{sess.expert.name}</h3>
                        <span className="scc-confirmed-chip">
                          <span className="scc-pulse-dot"></span> Confirmed &amp; Ready
                        </span>
                      </div>
                      <p className="scc-mentor-role">
                        {sess.expert.role} • <strong>{sess.expert.company}</strong>
                        <span className="scc-meta-dot">•</span>
                        <span className="scc-rating"><Star size={11} className="star-gold" /> {sess.expert.rating}</span>
                      </p>
                    </div>
                  </div>

                  {/* Clean Schedule Pill */}
                  <div className="scc-schedule-pill">
                    <div className="scc-sched-item">
                      <Calendar size={13} className="text-blue-600" />
                      <span>{sess.date}</span>
                    </div>
                    <span className="scc-sched-divider">•</span>
                    <div className="scc-sched-item">
                      <Clock size={13} className="text-amber-600" />
                      <span>{sess.timeSlot}</span>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <div className="scc-action-cta">
                    <button 
                      type="button" 
                      className="btn-scc-join" 
                      onClick={() => handleJoinCall(sess)}
                    >
                      <span className="live-cam-pulse-dot"></span>
                      <Video size={14} />
                      <span>Join Video Room</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Slim CV Readiness Strip + Secondary Actions */}
                <div className="scc-secondary-bar">
                  <div className="scc-cv-status-box">
                    {isCandidateCvSynced ? (
                      <div className="scc-cv-synced-pill">
                        <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                        <span><strong>CV Attached:</strong> {userProfile.resumeFileName} (shared with {sess.expert.name})</span>
                        <button type="button" className="btn-scc-cv-link" onClick={() => setIsCvSyncModalOpen(true)}>Change</button>
                      </div>
                    ) : (
                      <div className="scc-cv-pending-pill">
                        <AlertCircle size={12} className="text-amber-600 flex-shrink-0" />
                        <span><strong>Latest CV Pending:</strong> Attach recent CV for tailored feedback</span>
                        <button type="button" className="btn-scc-cv-upload-btn" onClick={() => setIsCvSyncModalOpen(true)}>
                          <Sparkles size={11} /> Upload Latest CV
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="scc-secondary-actions">
                    <button 
                      type="button" 
                      className="btn-scc-link" 
                      onClick={() => openReschedule(sess.id)}
                    >
                      <RotateCcw size={12} /> Reschedule
                    </button>
                    <span className="scc-action-sep">•</span>
                    <button 
                      type="button" 
                      className="btn-scc-link text-danger" 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to cancel your session with ${sess.expert.name}?`)) {
                          cancelSession(sess.id);
                        }
                      }}
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>

                {/* Inline Reschedule Drawer */}
                {reschedulingId === sess.id && (
                  <div className="reschedule-drawer-card">
                    <div className="rd-header">
                      <h4><RotateCcw size={14} /> Select New Date &amp; Time for {sess.expert.name}</h4>
                      <button className="btn-close-rd" onClick={() => setReschedulingId(null)}>
                        <XCircle size={15} />
                      </button>
                    </div>

                    <div className="reschedule-inputs-row">
                      <div className="rd-select-group">
                        <label>Date</label>
                        <select 
                          value={rescheduleDate} 
                          onChange={(e) => setRescheduleDate(e.target.value)} 
                          className="rd-select"
                        >
                          {rescheduleDateOptions.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rd-select-group">
                        <label>Time Slot</label>
                        <select 
                          value={rescheduleTime} 
                          onChange={(e) => setRescheduleTime(e.target.value)} 
                          className="rd-select"
                        >
                          {rescheduleTimeOptions.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rd-btn-group">
                        <button 
                          type="button"
                          className="btn-confirm-reschedule" 
                          onClick={() => handleConfirmReschedule(sess.id)}
                        >
                          Confirm Reschedule
                        </button>
                        <button 
                          type="button" 
                          className="btn-cancel-rd" 
                          onClick={() => setReschedulingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: Completed Sessions */}
      {activeTab === 'completed' && (
        <div className="sessions-cards-stream">
          {(isMentor ? mentorHostedCompleted : candidateBookedCompleted).length === 0 ? (
            <div className="empty-sessions-box-full">
              <div className="empty-icon-circle"><Award size={36} color="#94A3B8" /></div>
              <h3>No completed sessions yet</h3>
              <p>{isMentor ? 'Completed candidate mentorship sessions will appear here.' : 'Completed sessions and skill badges will appear here after video calls.'}</p>
            </div>
          ) : (
            (isMentor ? mentorHostedCompleted : candidateBookedCompleted).map((sess) => (
              <div key={sess.id} className="session-card-compact sc-completed-compact">
                <div className="scc-main-row">
                  <div className="scc-mentor-profile">
                    <div className="scc-avatar-wrap">
                      <img 
                        src={isMentor ? (sess.candidateAvatar || '/brand/android-chrome-192x192.png') : sess.expert.avatar} 
                        alt={isMentor ? sess.candidateName : sess.expert.name} 
                        className="scc-avatar" 
                      />
                      <span className="scc-verified-check"><CheckCircle2 size={10} /></span>
                    </div>
                    <div className="scc-mentor-info">
                      <div className="scc-name-row">
                        <h3 className="scc-mentor-name">{isMentor ? sess.candidateName : sess.expert.name}</h3>
                        <span className="sc-badge-completed">
                          <CheckCircle2 size={11} /> Completed on {sess.date}
                        </span>
                      </div>
                      <p className="scc-mentor-role">
                        {isMentor ? (sess.candidateRole || 'Candidate') : `${sess.expert.role} at ${sess.expert.company}`}
                      </p>
                    </div>
                  </div>

                  <div className="scc-outcome-pill">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>Evaluation:</strong>{' '}
                      {sess.badgeAwarded ? `${sess.badgeAwarded}${sess.feedbackNotes ? ` — ${sess.feedbackNotes}` : ''}` : 'Mentor assessment pending'}
                    </span>
                  </div>

                  <div className="scc-action-cta" style={{ display: 'flex', gap: '8px' }}>
                    {isMentor ? (
                      <button 
                        type="button" 
                        className="btn-scc-view-assessment" 
                        disabled={Boolean(sess.badgeAwarded)}
                        onClick={() => {
                          setAssessmentDraftSession(sess);
                          setIsAssessmentModalOpen(true);
                        }}
                      >
                        <Award size={13} /> <span>{sess.badgeAwarded ? 'Assessed' : 'Assess Candidate'}</span>
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-scc-view-assessment" 
                        disabled={sess.candidateRating != null}
                        onClick={() => {
                          setActiveSession(sess);
                          navigate('post-session-view');
                        }}
                      >
                        <Star size={13} /> <span>{sess.candidateRating != null ? `You rated ${sess.candidateRating}★` : 'Rate Session'}</span>
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="btn-scc-recording" 
                      onClick={() => setSelectedRecordingSession(sess)}
                      title="Watch session recording"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Recording</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pre-Call Zero-Prep CV Check Modal */}
      {preJoinCheckSession && (
        <div className="app-modal-backdrop open">
          <div className="app-modal-card prejoin-modal-card">
            <button className="modal-close-btn" onClick={() => setPreJoinCheckSession(null)} aria-label="Close">
              <X size={18} />
            </button>
            
            <div className="prejoin-content">
              <div className="prejoin-top-chip">
                <Video size={14} className="text-emerald-600" />
                <span>1:1 Video Mentorship Room is Ready</span>
              </div>
              
              <h3 className="prejoin-title">Before joining {preJoinCheckSession.expert.name}...</h3>
              <p className="prejoin-sub">
                {preJoinCheckSession.expert.name} is waiting in the video room. Having your latest CV attached will give her your exact current tech stack and CTC for <strong>2x better guidance</strong>.
              </p>

              <div className="prejoin-mentor-box">
                <img 
                  src={preJoinCheckSession.expert.avatar} 
                  alt={preJoinCheckSession.expert.name} 
                  className="prejoin-mentor-avatar" 
                />
                <div className="prejoin-mentor-info">
                  <strong>{preJoinCheckSession.expert.name}</strong>
                  <p>{preJoinCheckSession.expert.role} • {preJoinCheckSession.expert.company}</p>
                </div>
              </div>

              <div className="prejoin-actions-col">
                <button 
                  type="button" 
                  className="btn-shine-gold-lg btn-prejoin-sync"
                  onClick={() => {
                    // Upload a real, current resume first; the user joins again afterwards
                    setPreJoinCheckSession(null);
                    setIsCvSyncModalOpen(true);
                  }}
                >
                  <Sparkles size={16} />
                  <span>⚡ 1-Click Sync Latest CV &amp; Enter Video Room</span>
                </button>

                <button 
                  type="button" 
                  className="btn-prejoin-direct"
                  onClick={() => {
                    const target = preJoinCheckSession;
                    setPreJoinCheckSession(null);
                    setActiveSession(target);
                    navigate('live-call-view');
                  }}
                >
                  <span>Continue to Video Room with Existing Profile →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Recording Video Player Modal */}
      {selectedRecordingSession && (
        <div className="app-modal-backdrop open" onClick={() => setSelectedRecordingSession(null)}>
          <div 
            className="app-modal-card" 
            style={{ maxWidth: '680px', width: '92%', borderRadius: '16px', overflow: 'hidden', padding: '0', background: '#0F172A', color: '#FFFFFF', border: '1px solid #334155' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={16} color="#fff" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                    1:1 Guidance Session Recording
                  </h4>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {selectedRecordingSession.expert.name} ({selectedRecordingSession.expert.company}) ⇄ {selectedRecordingSession.candidateName}
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setSelectedRecordingSession(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Player Box */}
            <div style={{ background: '#000000', position: 'relative', width: '100%', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                controls
                autoPlay
                playsInline
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                src={selectedRecordingSession.recordingUrl || peerpathApi.getRecordingUrl(selectedRecordingSession.id)}
                poster={selectedRecordingSession.expert.videoPoster || selectedRecordingSession.expert.avatar}
              >
                Your browser does not support HTML5 video streaming.
              </video>
            </div>

            {/* Modal Footer with Actions & Metadata */}
            <div style={{ padding: '16px 20px', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12.5px', color: '#10B981', fontWeight: 700, display: 'block' }}>
                  ✓ 1:1 Mentorship Session & Detailed Scorecard Sync
                </span>
                <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                  Recorded on {selectedRecordingSession.date} • Session ID: {selectedRecordingSession.id}
                </span>
              </div>

              <a
                href={selectedRecordingSession.recordingUrl || peerpathApi.getRecordingUrl(selectedRecordingSession.id)}
                download={`shine-peerpath-${selectedRecordingSession.id}.webm`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563EB', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}
              >
                <Download size={14} /> Download (.webm)
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
