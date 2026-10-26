import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, MapPin, Star, Clock, Users, Calendar, 
  Film, Play, Pause, Zap, Award, Briefcase, 
  Video, UserPlus, UserCheck, FileText, Sparkles, TrendingUp, X, 
  ShieldCheck, ArrowRight, ThumbsUp, GraduationCap, Compass, 
  Check, Lock, RefreshCw, Brain, Layers, Target, Edit2
} from 'lucide-react';
import { Expert, ViewType } from '../../types';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';
import { isSelfMentor } from '../../utils/profile';

interface ExpertProfileViewProps {
  expert: Expert;
  onNavigate: (view: ViewType) => void;
  onOpenBooking: (expertId: string) => void;
}

export const ExpertProfileView: React.FC<ExpertProfileViewProps> = ({
  expert,
  onNavigate,
  onOpenBooking,
}) => {
  const { 
    currentUser, 
    userProfile,
    isCreatorMode,
    navigateToCreatorStudio, 
    isFollowingMentor, 
    toggleFollowMentor, 
    bookingDraft, 
    setBookingDraft,
    sessions,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'sessions' | 'trajectory' | 'reviews'>('sessions');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(35);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setVideoProgress((prev) => (prev >= 100 ? 0 : prev + 2));
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVideoModalOpen) {
        setIsVideoModalOpen(false);
        setIsPlaying(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen]);

  if (!expert) {
    return (
      <div className="content-wrapper expert-profile-layout" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="cv-scan-circle-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px', border: '3px solid #EDE9FE', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#64748B', fontSize: '15px', fontWeight: 600 }}>Loading Mentor Profile...</p>
        </div>
      </div>
    );
  }

  const isSelf = isSelfMentor(expert, currentUser);

  // When viewing self profile, always show studio controls and never allow self-booking
  const isSelfInMentorMode = isSelf;

  const isFollowing = isFollowingMentor(expert.id);
  const baseFollowers = expert.followersCount || 0;
  const displayFollowersCount = isFollowing ? baseFollowers + 1 : baseFollowers;

  const handleOpenTeaserModal = () => {
    setIsVideoModalOpen(true);
    setIsPlaying(true);
  };

  const handleCloseTeaserModal = () => {
    setIsVideoModalOpen(false);
    setIsPlaying(false);
  };

  const displayName = isSelf ? (userProfile.name || currentUser?.name || expert.name) : expert.name;
  const displayRole = isSelf ? (userProfile.designation || userProfile.headline || expert.role) : expert.role;
  const displayCompany = isSelf ? (userProfile.currentCompany || expert.company) : expert.company;
  const displayLocation = isSelf ? (userProfile.location || expert.location || 'Bengaluru, India') : (expert.location || 'Bengaluru, India');
  const displayExperience = isSelf ? (userProfile.experienceYears || expert.experience) : expert.experience;
  const skillsList = isSelf && userProfile.skills && userProfile.skills.length > 0 
    ? userProfile.skills 
    : (Array.isArray(expert.skills) ? expert.skills : []);
  const displayBio = isSelf ? (userProfile.summary || expert.bio) : expert.bio;
  const displayAvatar = isSelf ? (currentUser?.avatar || expert.avatar || '/brand/android-chrome-192x192.png') : (expert.avatar || '/brand/android-chrome-192x192.png');

  const mentorFirstName = (displayName || 'Mentor').split(' ')[0];
  const basePrice = expert.price || 999;

  const cleanExperience = (exp?: string) => {
    if (!exp) return '8+ Yrs';
    const match = exp.match(/\d+(\.\d+)?\+?/);
    return match ? `${match[0]} Yrs` : exp;
  };

  const availabilitySlotInfo = expert.availability?.days?.length 
    ? `${expert.availability.days.join(', ')} • ${expert.availability.timeSlots?.[0] || 'Flexible slots'}`
    : 'Flexible availability • Book slot';

  // Dynamic real service offerings mapped from backend API
  const mentorServices = (expert.serviceOfferings && expert.serviceOfferings.length > 0)
    ? expert.serviceOfferings.filter(s => s.isEnabled !== false).map(s => {
        const isResume = s.id?.includes('resume') || (s.category && s.category.toLowerCase().includes('resume'));
        const isInterview = s.id?.includes('interview') || (s.category && s.category.toLowerCase().includes('interview'));
        const isSalary = s.id?.includes('salary') || (s.category && s.category.toLowerCase().includes('salary'));

        const tagColor = isResume ? '#D97706' : isInterview ? '#059669' : isSalary ? '#2563EB' : '#7C3AED';
        const tagBg = isResume ? '#FEF3C7' : isInterview ? '#ECFDF5' : isSalary ? '#EFF6FF' : '#F5F3FF';
        const IconComp = isResume ? FileText : isInterview ? Video : isSalary ? TrendingUp : Compass;

        return {
          id: s.id,
          title: s.title || s.category || '1:1 Mentorship Session',
          tag: s.tag || (isResume ? 'Resume Audit' : isInterview ? 'Mock Interview' : isSalary ? 'Salary Strategy' : '1:1 Session'),
          tagColor,
          tagBg,
          icon: IconComp,
          iconColor: tagColor,
          iconBg: tagBg,
          shortDesc: s.description || `Direct 1:1 session with ${displayName} covering ${s.title}.`,
          outcomes: [
            { icon: '🎯', title: 'Target Guidance', desc: `Personalized actionable advice from ${mentorFirstName}'s real tech experience.` },
            { icon: '💡', title: 'Live Deep-Dive', desc: 'Screen-share, question breakdown, and real-time critique.' },
            { icon: '🚀', title: 'Actionable Next Steps', desc: 'Milestones, references, and frameworks tailored for your profile.' }
          ],
          duration: s.duration || expert.duration || '45 Mins',
          price: s.price !== undefined ? s.price : basePrice,
          slotInfo: availabilitySlotInfo
        };
      })
    : [
        {
          id: '1on1-mentorship',
          title: '1:1 Career Mentorship Session',
          tag: '1:1 Session',
          tagColor: '#7C3AED',
          tagBg: '#F5F3FF',
          icon: Compass,
          iconColor: '#7C3AED',
          iconBg: '#F3E8FF',
          shortDesc: `Direct 1:1 career guidance, transition roadmap, and interview prep with ${displayName}.`,
          outcomes: [
            { icon: '🗺️', title: 'Target Roadmap', desc: 'Milestone plan and skill gap analysis for your dream role.' },
            { icon: '🎯', title: 'Preparation Strategy', desc: 'Company hiring criteria, coding focus, and portfolio review.' },
            { icon: '💡', title: 'Live Q&A', desc: 'Direct answers to your career and technical transition questions.' }
          ],
          duration: expert.duration || '45 Mins',
          price: expert.price || 999,
          slotInfo: availabilitySlotInfo
        }
      ];

  const handleBookSpecificSession = (s: typeof mentorServices[0]) => {
    if (isSelf) {
      showToast('You cannot book a mentorship session with yourself.', 'info');
      return;
    }
    if (setBookingDraft) {
      setBookingDraft({
        ...bookingDraft,
        expert,
        sessionType: s.title,
        amount: s.price,
        duration: s.duration
      });
    }
    onOpenBooking(expert.id);
  };

  return (
    <div className="content-wrapper unified-profile-container">

      {/* 🌟 Self-Mentor Informative Banner (Only shown in Mentor Studio mode) */}
      {isSelfInMentorMode && (
        <div className="unified-profile-alert-banner">
          <div className="upa-content">
            <Sparkles size={16} className="text-amber-500 flex-shrink-0" />
            <div className="upa-text">
              <strong>Your Public Mentor Profile:</strong> Basic details (Name, Role, Company, Skills) automatically sync with your{' '}
              <button type="button" className="upa-link-btn" onClick={() => onNavigate('profile-view')}>
                Candidate Profile
              </button>
              . Manage your 1:1 offerings, pricing &amp; availability in{' '}
              <button type="button" className="upa-link-btn" onClick={() => navigateToCreatorStudio('bookings')}>
                Mentor Studio Hub
              </button>
              .
            </div>
          </div>
        </div>
      )}
      
      <div className="up-layout-grid">
        <aside className="up-mentor-sidebar">
          <div className="up-mentor-card">
            
            {/* Avatar with Status */}
            <div className="up-avatar-center-wrap">
              <div className="up-avatar-ring">
                <img 
                  src={displayAvatar} 
                  alt={displayName} 
                  className="up-avatar-img" 
                />
                <span className="up-status-dot" title="Available for 1:1 sessions"></span>
              </div>
            </div>

            {/* Mentor Name & Headline */}
            <div className="up-mentor-info">
              <div className="up-name-badge-row">
                <h1 className="up-mentor-name">{displayName}</h1>
                <span className="up-verified-icon-pill" title="Verified Practitioner">
                  <CheckCircle2 size={15} />
                </span>
              </div>

              <div className="up-company-role">
                <strong>{displayRole}</strong>
                <span className="up-company-dot">•</span>
                <span className="up-company-tag">{displayCompany}</span>
              </div>

              <span className="up-top-mentor-pill">
                <Sparkles size={11} className="text-amber-500" />
                <span>Top 1% Mentor on {BRAND.name}</span>
              </span>

              {isSelfInMentorMode && <span className="up-self-tag">Your Public Profile</span>}
            </div>

            {/* Social Proof Stats (Clean 2-Row Sleek Metrics from Real Data) */}
            <div className="up-stats-clean-box">
              <div className="up-scb-row">
                <div className="up-scb-cell">
                  <Star size={14} className="star-gold-fill" />
                  <span className="up-scb-val">{expert.rating && (expert.reviewsCount || 0) > 0 ? expert.rating.toFixed(1) : 'New'}</span>
                  <span className="up-scb-sub">rating</span>
                </div>
                <div className="up-scb-cell">
                  <Users size={14} className="text-blue-500" />
                  <span className="up-scb-val">{displayFollowersCount >= 1000 ? `${(displayFollowersCount / 1000).toFixed(1)}k` : displayFollowersCount}</span>
                  <span className="up-scb-sub">followers</span>
                </div>
              </div>

              <div className="up-scb-row">
                <div className="up-scb-cell">
                  <Award size={14} className="text-emerald-600" />
                  <span className="up-scb-val">{expert.sessionsCount || 0}</span>
                  <span className="up-scb-sub">sessions</span>
                </div>
                <div className="up-scb-cell">
                  <Briefcase size={14} className="text-indigo-500" />
                  <span className="up-scb-val">{cleanExperience(displayExperience)}</span>
                  <span className="up-scb-sub">Exp</span>
                </div>
              </div>
            </div>

            {/* Secondary Actions (Studio / Candidate Edit & Video Teaser) */}
            <div className="up-mentor-actions">
              {isSelfInMentorMode ? (
                <>
                  <button 
                    type="button" 
                    className="btn-up-studio"
                    onClick={() => navigateToCreatorStudio('bookings')}
                    title="Open Mentor Studio workspace"
                  >
                    <Award size={14} />
                    <span>Manage Studio</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn-up-edit-candidate"
                    onClick={() => onNavigate('profile-view')}
                    title="Edit your Candidate Profile (headline, experience, skills)"
                  >
                    <Edit2 size={13} />
                    <span>Edit Candidate Profile</span>
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className={`btn-up-follow ${isFollowing ? 'following' : ''}`}
                  onClick={() => toggleFollowMentor(expert.id, expert.name)}
                >
                  {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  <span>{isFollowing ? 'Following' : 'Follow Mentor'}</span>
                </button>
              )}

              <button 
                type="button" 
                className="btn-up-teaser"
                onClick={handleOpenTeaserModal}
                title={`Watch ${expert.name}'s Video Introduction`}
              >
                <Play size={12} fill="currentColor" />
                <span>Watch Mentor Intro</span>
              </button>
            </div>

            {/* Fast Facts / Metadata */}
            <div className="up-mentor-facts-grid">
              <div className="up-fact-item">
                <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                <span><strong>Location:</strong> {displayLocation}</span>
              </div>
              <div className="up-fact-item">
                <ShieldCheck size={13} className="text-emerald-600 flex-shrink-0" />
                <span><strong>Verification:</strong> {displayCompany} Work Email (Active)</span>
              </div>
            </div>

            {/* Core Skills Chips */}
            <div className="up-skills-wrap">
              <span className="up-skills-title">Core Expertise</span>
              <div className="up-skills-chips">
                {skillsList.map((skill) => (
                  <span key={skill} className="up-skill-chip">{skill}</span>
                ))}
              </div>
            </div>

            {/* Impact Banner */}
            <div className="up-mentor-impact-card">
              <Sparkles size={13} className="text-amber-600 flex-shrink-0" />
              <span>
                {(expert.reviewsCount || 0) > 0 
                  ? `${expert.rating ? expert.rating.toFixed(1) : '5.0'}★ rated across ${expert.reviewsCount} verified session${expert.reviewsCount > 1 ? 's' : ''}.`
                  : `Verified ${displayCompany} Practitioner available for 1:1 mentorship.`}
              </span>
            </div>

          </div>
        </aside>

        <main className="up-main-content">
          
          {/* Tabs Bar (3 Clean Focused Tabs) */}
          <div className="up-tabs-bar">
            <button 
              className={`up-tab-pill ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <Compass size={15} />
              <span>Book 1:1 Session</span>
              <span className="up-tab-count">{mentorServices.length}</span>
            </button>

            <button 
              className={`up-tab-pill ${activeTab === 'trajectory' ? 'active' : ''}`}
              onClick={() => setActiveTab('trajectory')}
            >
              <TrendingUp size={15} />
              <span>Career Trajectory &amp; Background</span>
            </button>

            <button 
              className={`up-tab-pill ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <Star size={15} />
              <span>Verified Reviews</span>
              <span className="up-tab-count">{expert.reviewsCount || 0}</span>
            </button>
          </div>

          {/* TAB 1: 1:1 Mentorship Sessions (Modernized, Direct & Clean) */}
          {activeTab === 'sessions' && (
            <div className="up-services-view">
              
              <div className="up-services-list-stack">
                {mentorServices.map((service) => {
                  const IconComp = service.icon;
                  return (
                    <div key={service.id} className="up-service-card-modern">
                      
                      {/* Top Header: Title, Category, Price & CTA */}
                      <div className="up-scm-header">
                        <div className="up-scm-title-wrap">
                          <div className="up-scm-icon" style={{ background: service.iconBg, color: service.iconColor }}>
                            <IconComp size={20} />
                          </div>
                          <div className="up-scm-titles">
                            <div className="up-scm-name-row">
                              <h3 className="up-scm-name">{service.title}</h3>
                              <span className="up-scm-badge" style={{ background: service.tagBg, color: service.tagColor }}>
                                {service.tag}
                              </span>
                            </div>
                            <p className="up-scm-tagline">{service.shortDesc}</p>
                          </div>
                        </div>

                        {/* Refined Price Tag */}
                        <div className="up-scm-price-container">
                          <div className="up-scm-price-val">
                            <span className="up-scm-curr">₹</span>
                            <span className="up-scm-amount">{service.price}</span>
                          </div>
                          <span className="up-scm-price-sub">/ 30-min call</span>
                        </div>
                      </div>

                      {/* Clean 1-Line Key Highlights */}
                      <div className="up-scm-pills-wrap">
                        {service.outcomes.map((item, idx) => (
                          <span key={idx} className="up-scm-mini-pill">
                            <Check size={11} strokeWidth={3} className="text-emerald-600" />
                            <span>{item.title}</span>
                          </span>
                        ))}
                      </div>

                      {/* Footer Meta Row (Live Slot & Book CTA) */}
                      <div className="up-scm-footer">
                        <div className="up-scm-meta-left">
                          <span className="up-scm-meta-tag">
                            <Clock size={12} className="text-slate-500" />
                            <span>{service.duration} 1:1 Video</span>
                          </span>
                          <span className="up-scm-meta-tag slot-available">
                            <span className="pulse-green-dot"></span>
                            <span>{service.slotInfo}</span>
                          </span>
                        </div>
                        <div className="up-scm-meta-right">
                          {isSelfInMentorMode ? (
                            <button 
                              type="button" 
                              className="btn-scm-book"
                              onClick={() => navigateToCreatorStudio('pricing')}
                            >
                              <span>Manage</span>
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              className="btn-scm-book"
                              onClick={() => handleBookSpecificSession(service)}
                            >
                              <span>Book Slot</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: Career Trajectory, Transition Pathway & About Details */}
          {activeTab === 'trajectory' && (
            <div className="up-trajectory-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Proven Transition Pathway Timeline */}
              <div className="up-white-card">
                <div className="up-pane-header">
                  <div>
                    <h3 className="up-card-title">Proven Transition Pathway</h3>
                    <p className="up-card-body-muted">How {mentorFirstName} navigated from foundational tech into {expert.role || 'Senior Leader'} at {expert.company}.</p>
                  </div>
                  <span className="up-path-tag">
                    <TrendingUp size={12} />
                    <span>Milestone Data</span>
                  </span>
                </div>

                <div className="ep-roadmap-timeline">
                  {/* Milestone 2: Present Role */}
                  <div className="ep-rm-item ep-rm-present">
                    <div className="ep-rm-indicator">
                      <div className="ep-rm-dot current"><Sparkles size={13} /></div>
                      {expert.trajectory?.company3YearsAgo && <div className="ep-rm-line"></div>}
                    </div>
                    <div className="ep-rm-card">
                      <div className="ep-rm-card-header">
                        <div>
                          <div className="ep-rm-badge-row">
                            <span className="ep-rm-status-badge present">🎯 Present Role</span>
                          </div>
                          <h4 className="ep-rm-role">{displayRole}</h4>
                          <span className="ep-rm-company">{displayCompany} • Verified Employer</span>
                        </div>
                      </div>
                      <p className="ep-rm-story">
                        {expert.trajectory?.jumpStory || displayBio || `Leading software development and architecture at ${displayCompany}.`}
                      </p>
                    </div>
                  </div>

                  {/* Milestone 1: Previous Background if available in real trajectory */}
                  {expert.trajectory?.company3YearsAgo && (
                    <div className="ep-rm-item ep-rm-baseline">
                      <div className="ep-rm-indicator">
                        <div className="ep-rm-dot baseline"><MapPin size={13} /></div>
                      </div>
                      <div className="ep-rm-card baseline-card">
                        <div className="ep-rm-card-header">
                          <div>
                            <div className="ep-rm-badge-row">
                              <span className="ep-rm-status-badge baseline">📍 Previous Background</span>
                              {expert.trajectory?.salary3YearsAgo && (
                                <span className="ep-rm-period">{expert.trajectory.salary3YearsAgo}</span>
                              )}
                            </div>
                            <h4 className="ep-rm-role">{expert.trajectory.role3YearsAgo || 'Software Engineer'}</h4>
                            <span className="ep-rm-company">{expert.trajectory.company3YearsAgo}</span>
                          </div>
                        </div>
                        {expert.trajectory.jumpStory && (
                          <p className="ep-rm-story">
                            Acquired core production skills in {skillsList.slice(0, 3).join(', ')} to advance into {displayCompany}.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Mentorship Mission & Philosophy */}
              <div className="up-white-card">
                <h3 className="up-card-title">About Me &amp; Mentorship Philosophy</h3>
                <p className="up-card-body">
                  {displayBio || `Senior practitioner at ${displayCompany}. Guiding tech talent on career transition, production engineering, and interview prep.`}
                </p>

                <div className="up-quote-callout">
                  <div className="up-quote-mark">“</div>
                  <p className="up-quote-text">
                    {displayBio 
                      ? displayBio
                      : `In my 1:1 sessions, we dissect your actual code, architecture diagrams, and career roadmap so you achieve your career goals with actionable direction.`}
                  </p>
                  <span className="up-quote-sig">— {displayName}, {displayRole} at {displayCompany}</span>
                </div>
              </div>

              {/* 3. Core Technical Competencies */}
              <div className="up-white-card">
                <div className="up-pane-header">
                  <div>
                    <h3 className="up-card-title">Core Technical Skills</h3>
                    <p className="up-card-body-muted">Verified technical skills and domain expertise from candidate profile.</p>
                  </div>
                  <span className="up-skills-verified-pill">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>Verified Skillset</span>
                  </span>
                </div>

                <div className="up-comp-chips-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                  {skillsList.map((skill) => (
                    <span key={skill} className="up-comp-chip sys" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {skill}
                    </span>
                  ))}
                  {skillsList.length === 0 && (
                    <span style={{ color: '#64748B', fontSize: '13px' }}>No skills listed yet</span>
                  )}
                </div>
              </div>

              {/* 4. Verified Credentials */}
              <div className="up-creds-grid">
                <div className="up-cred-card">
                  <div className="up-cred-icon-wrap practitioner">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="up-cred-details">
                    <div className="up-cred-title-row">
                      <h4 className="up-cred-heading">Verified {BRAND.name} Practitioner</h4>
                      <span className="up-cred-status-pill emerald">
                        <CheckCircle2 size={11} /> Identity Active
                      </span>
                    </div>
                    <p className="up-cred-desc">Current Practitioner at {displayCompany} • Official Corporate Verification Active</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Reviews */}
          {activeTab === 'reviews' && (() => {
            const expertReviews = (sessions || []).filter(s => 
              (s.expertId === expert.id || s.expert?.id === expert.id) && 
              (s.rating || s.feedbackNotes)
            );

            return (
              <div className="up-reviews-view">
                {/* Aggregate Rating Scorecard */}
                <div className="up-reviews-summary-card">
                  <div className="up-rsc-score">
                    <span className="big-num">{expertReviews.length > 0 && expert.rating ? expert.rating.toFixed(1) : 'New'}</span>
                    <div className="stars-row">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} fill="#F59E0B" color="#F59E0B" />
                      ))}
                    </div>
                    <span className="count-txt">
                      {expertReviews.length > 0 
                        ? `Based on ${expertReviews.length} Verified Session${expertReviews.length > 1 ? 's' : ''}`
                        : 'Newly Verified Mentor'}
                    </span>
                  </div>

                  <div className="up-rsc-badges">
                    <div className="up-rsc-badge-item">
                      <ShieldCheck size={18} className="text-emerald-500" />
                      <div>
                        <strong>100% Verified Mentees</strong>
                        <p>Only candidates who completed a session can review</p>
                      </div>
                    </div>
                    <div className="up-rsc-badge-item">
                      <Sparkles size={18} className="text-amber-500" />
                      <div>
                        <strong>Verified Practitioner</strong>
                        <p>Direct 1:1 sessions with {mentorFirstName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="up-reviews-stack">
                  {expertReviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                      <Star size={28} className="text-amber-500" style={{ margin: '0 auto 10px' }} />
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>No Reviews Yet</h4>
                      <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.4 }}>
                        Reviews appear here after candidates complete a 1:1 session with {mentorFirstName}.
                      </p>
                      {!isSelfInMentorMode && (
                        <button 
                          type="button" 
                          className="btn-shine-gold" 
                          onClick={() => handleBookSpecificSession(mentorServices[0])}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Book 1:1 Session with {mentorFirstName}
                        </button>
                      )}
                    </div>
                  ) : (
                    expertReviews.map((rev) => (
                      <div key={rev.id} className="up-review-card">
                        <div className="up-rc-header">
                          <div className="up-rc-user">
                            <div className="up-rc-avatar" style={{ background: '#4F46E5', color: '#FFF' }}>
                              {(rev.candidateName || 'C')[0]}
                            </div>
                            <div>
                              <div className="up-rc-name-row">
                                <strong>{rev.candidateName}</strong>
                                <span className="up-rc-ver-pill"><CheckCircle2 size={11} /> Verified</span>
                              </div>
                              <span className="up-rc-sub">{rev.sessionType || '1:1 Session'} • {rev.date}</span>
                            </div>
                          </div>

                          <div className="up-rc-rating">
                            <div className="up-rc-stars">
                              {[...Array(rev.rating || 5)].map((_, i) => (
                                <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />
                              ))}
                            </div>
                          </div>
                        </div>

                        <p className="up-rc-comment">{rev.feedbackNotes || 'Completed 1:1 mentorship session.'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

        </main>

      </div>

      {/* Video Lightbox Modal */}
      {isVideoModalOpen && (
        <div className="video-modal-backdrop" onClick={handleCloseTeaserModal}>
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <div className="video-modal-title-group">
                <span className="video-badge-pill"><Film size={13} /> Mentor Video Intro</span>
                <span className="video-modal-mentor-name">{expert.name} • {expert.role} at {expert.company}</span>
              </div>
              <button 
                type="button" 
                className="btn-vm-close" 
                onClick={handleCloseTeaserModal}
                aria-label="Close video intro"
              >
                <X size={18} />
              </button>
            </div>

            <div className="video-modal-viewport" onClick={() => setIsPlaying(!isPlaying)}>
              <div className="video-overlay-tint"></div>
              <img 
                src={expert.videoPoster || expert.avatar || '/brand/android-chrome-192x192.png'} 
                alt="Video Thumbnail" 
                className="video-poster-img" 
              />
              
              <div className="video-play-center">
                <div className={`play-pulse-circle ${isPlaying ? 'playing' : ''}`} style={{ opacity: isPlaying ? 0.35 : 1 }}>
                  {isPlaying ? <Pause size={32} fill="#0f172a" /> : <Play size={32} fill="#0f172a" style={{ marginLeft: '4px' }} />}
                </div>
              </div>

              <div className="video-bottom-controls">
                <div className="video-caption-text">
                  <h4>{expert.teaserTitle || `Mentor Introduction: How I Grew in ${expert.domain || 'Tech'}`}</h4>
                  <p>Learn how {mentorFirstName} transitioned into top product engineering and fast-tracked career growth.</p>
                </div>
              </div>
            </div>

            <div 
              className="video-custom-seekbar" 
              title="Video progress"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                setVideoProgress(Math.min(100, Math.max(0, Math.round(clickPos * 100))));
              }}
            >
              <div className="seek-fill" style={{ width: `${videoProgress}%` }}></div>
            </div>

            <div className="video-modal-footer">
              <div className="video-modal-time-indicator">
                <span className={`status-dot ${isPlaying ? 'active' : ''}`}></span>
                <span>{isPlaying ? 'Playing Intro' : 'Paused'}</span>
                <span className="dot">•</span>
                <span>{expert.duration || '01:15'}</span>
              </div>
              <div className="video-modal-actions">
                {isSelfInMentorMode ? (
                  <button className="btn-shine-gold" onClick={() => { handleCloseTeaserModal(); navigateToCreatorStudio('teaser'); }}>
                    <Award size={15} /> Edit Video in Studio
                  </button>
                ) : (
                  <button className="btn-shine-gold" onClick={() => { handleCloseTeaserModal(); handleBookSpecificSession(mentorServices[0]); }}>
                    <Calendar size={15} /> Book 1:1 Session with {mentorFirstName} (₹{mentorServices[0].price})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpertProfileView;
