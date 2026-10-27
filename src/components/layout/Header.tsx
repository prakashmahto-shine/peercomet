import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, Award, Bell, FileText, ChevronDown, Sparkles, 
  User, Settings, LogOut, Video, Search, ArrowUpRight, Film, Clock, CreditCard,
  Compass, TrendingUp, ShieldCheck, MessageSquare, Trash2, CheckCheck, Eye
} from 'lucide-react';
import { ViewType } from '../../types';
import { useApp, rememberCreatorMode } from '../../context/AppContext';
import { PeerpathLogo } from '../common/PeerpathLogo';
import { BRAND } from '../../config/brand';
import { isProfileComplete } from '../../utils/profile';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType, customPath?: string) => void;
  onOpenCreatorWizard: () => void;
  onSearch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenCreatorWizard: _onOpenCreatorWizard,
  onSearch,
}) => {
  const { 
    sessions, 
    currentUser, 
    userProfile,
    logout,
    setIsCreatorWizardOpen,
    clearPeerpathJobContext,
    isCreatorMode,
    setIsCreatorMode,
    navigateToCreatorStudio,
    selectExpertById,
    setIsUpdateProfileModalOpen,
    showToast,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications
  } = useApp();

  // Consistent Peerpath Mentorship platform header across all views
  const isPeerpathView = true;

  const isAlreadyMentor = Boolean(
    currentUser && (
      currentUser?.role === 'mentor' ||
      currentUser?.isMentorEligible ||
      userProfile?.isMentor ||
      Boolean(currentUser?.creatorId)
    )
  );

  const mentorCreatorId = currentUser?.creatorId || currentUser?.id || '';
  const loggedInFirstName = (currentUser?.name || '').split(' ')[0].toLowerCase();
  const upcomingCount = isCreatorMode
    ? sessions.filter(s => s.status === 'upcoming' && (s.expert.name.toLowerCase().includes(loggedInFirstName) || s.expert.id === currentUser?.id)).length
    : sessions.filter(s => s.status === 'upcoming' && s.candidateName.toLowerCase().includes(loggedInFirstName) && !s.expert.name.toLowerCase().includes(loggedInFirstName) && s.expert.id !== currentUser?.id).length;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      onNavigate('experts-view');
    }
  };

  const handleGoToMyJobs = () => {
    clearPeerpathJobContext();
    onNavigate('jobs-view');
  };

  return (
    <header className={`myshine-top-header-prod myshine-navbar ${isPeerpathView ? 'peerpath-ecosystem-header' : 'shine-jobs-header'}`}>
      <div className="myshine-nav-container">
        
        {/* Left Side: Brand Logo + Contextual Navigation Links */}
        <div className="myshine-nav-left">
          {isPeerpathView ? (
            /* Standalone Peerpath Brand Identity */
            <div 
              onClick={() => onNavigate(isAlreadyMentor && isCreatorMode ? 'mentor-dashboard-view' : 'guidance-view')} 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title={`${BRAND.tagline} • Verified 1:1 Mentorship`}
            >
              <PeerpathLogo size={36} />
            </div>
          ) : (
            /* Shine Official Job Board Logo */
            <div 
              onClick={() => onNavigate(currentUser ? 'dashboard-view' : 'login-view')} 
              className="shine-logo-wrap" 
              style={{ cursor: 'pointer' }}
              title="Shine.com Job Search"
            >
              <img 
                src="https://staticcand.shine.com/c/s1/images/candidate/nova/home/shine-logo.svg" 
                alt="Shine Logo" 
                className="shine-official-svg-logo"
              />
            </div>
          )}

          {/* Contextual Navigation Links */}
          <nav className="myshine-nav-links">
            {isPeerpathView ? (
              /* Peerpath Platform Navigation */
              isAlreadyMentor && isCreatorMode ? (
                <>
                  <button 
                    className={`myshine-link ${currentView === 'mentor-dashboard-view' ? 'active' : ''}`}
                    onClick={() => onNavigate('mentor-dashboard-view')} 
                    title="Go to Mentor & Studio Dashboard"
                  >
                    <Sparkles size={15} /> Studio Dashboard
                    <span className="pill-live-red-badge">LIVE</span>
                  </button>

                  <button 
                    className={`myshine-link ${currentView === 'sessions-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('sessions-view')}
                  >
                    <Video size={15} /> Candidate Calls
                    {upcomingCount > 0 && <span className="flyout-count-pill" style={{ marginLeft: '4px' }}>{upcomingCount}</span>}
                  </button>

                  {/* Mentor mode is about their own practice; other mentors are under Seek Guidance */}
                  <button 
                    className={`myshine-link ${currentView === 'community-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('community-view')}
                    title="Mentor-Led Community & Insights"
                  >
                    <MessageSquare size={15} /> Community
                  </button>
                </>
              ) : currentUser ? (
                <>
                  <button 
                    className={`myshine-link ${currentView === 'experts-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('experts-view')}
                    title="Browse mentors"
                  >
                    <Compass size={15} /> Find Mentors
                  </button>

                  <button 
                    className={`myshine-link ${currentView === 'sessions-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('sessions-view')}
                  >
                    <Video size={15} /> My Bookings
                    {upcomingCount > 0 && <span className="flyout-count-pill" style={{ marginLeft: '4px' }}>{upcomingCount}</span>}
                  </button>

                  <button 
                    className={`myshine-link ${currentView === 'community-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('community-view')}
                    title="Mentor Insights & Discussions"
                  >
                    <MessageSquare size={15} /> Community
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={`myshine-link ${currentView === 'guidance-view' || currentView === 'experts-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('guidance-view', '/peercomet')}
                    title="Find & Browse Verified Mentors"
                  >
                    <Compass size={15} /> Find Mentors
                  </button>

                  <button 
                    className={`myshine-link ${currentView === 'become-mentor-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('become-mentor-view', '/become-a-mentor')}
                    title="Apply as a Mentor on PeerComet"
                  >
                    <Sparkles size={15} /> Become a Mentor
                  </button>

                  <button 
                    className={`myshine-link ${currentView === 'community-view' ? 'active' : ''}`} 
                    onClick={() => onNavigate('community-view', '/community')}
                    title="Mentor Insights & Discussions"
                  >
                    <MessageSquare size={15} /> Community
                  </button>
                </>
              )
            ) : (
              /* Shine Jobs Portal Navigation */
              <>
                <button 
                  className={`myshine-link ${currentView === 'jobs-view' ? 'active' : ''}`} 
                  onClick={handleGoToMyJobs}
                >
                  <Briefcase size={15} /> My Jobs
                </button>
                
                <button className="myshine-link">
                  <Bell size={15} /> Job Alerts
                </button>
                
                <button className="myshine-link">
                  <FileText size={15} /> Blogs & Prep
                </button>

                <button 
                  className={`myshine-link ${currentView === 'profile-view' ? 'active' : ''}`} 
                  onClick={() => onNavigate('profile-view')}
                >
                  <User size={15} /> My Profile
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Right Side: Search (Shine Jobs) + Creator Toggle + User Dropdown */}
        <div className="myshine-nav-right-prod">
          {!isPeerpathView && (
            <form className="prod-nav-search-bar" onSubmit={handleSearchSubmit}>
              <Search size={14} className="prod-search-icon" />
              <input 
                type="text" 
                placeholder="Search jobs, skills, companies..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="prod-search-input"
              />
            </form>
          )}

          {/* ⚡ DIRECT NAVBAR MENTOR / SEEK GUIDANCE ROLE SWITCHER */}
          {currentUser && isAlreadyMentor && isPeerpathView && (
            <div className="navbar-role-mode-segmented" role="group" aria-label="Active Platform Mode">
              <button
                type="button"
                className={`nrms-tab ${isCreatorMode ? 'is-active-mentor' : 'is-inactive'}`}
                onClick={() => {
                  setIsCreatorMode(true);
                  if (currentUser) rememberCreatorMode(currentUser.id, true);
                  showToast('⚡ Mentor Studio Active', 'Switched to your mentor dashboard & candidate calls.', 'info');
                  onNavigate('mentor-dashboard-view', '/mentor');
                }}
                title="Mentor Mode: You are actively hosting sessions and guiding candidates"
              >
                <Sparkles size={13} className="nrms-icon" />
                <span>Mentor</span>
                {isCreatorMode && <span className="nrms-live-dot" title="Active Mentor" />}
              </button>

              <button
                type="button"
                className={`nrms-tab ${!isCreatorMode ? 'is-active-mentee' : 'is-inactive'}`}
                onClick={() => {
                  setIsCreatorMode(false);
                  if (currentUser) rememberCreatorMode(currentUser.id, false);
                  showToast('👤 Mentee Mode Active', 'Switched to candidate guidance mode. Browse & book 1:1 sessions.', 'info');
                  onNavigate('guidance-view', '/peercomet');
                }}
                title="Need 1:1 guidance for yourself? Switch to Mentee Mode to book sessions"
              >
                <Compass size={13} className="nrms-icon" />
                <span>Seek Guidance</span>
              </button>
            </div>
          )}



          {/* Direct Admin Control Center Button */}
          {currentUser?.isAdmin && (
            <button
              type="button"
              className={`header-bell-btn ${currentView === 'admin-dashboard-view' ? 'active' : ''}`}
              onClick={() => onNavigate('admin-dashboard-view')}
              title={`${BRAND.name} Admin Control Center`}
              style={{
                background: currentView === 'admin-dashboard-view' ? '#f5f3ff' : 'transparent',
                color: currentView === 'admin-dashboard-view' ? '#7c3aed' : '#64748b',
                border: currentView === 'admin-dashboard-view' ? '1px solid #c4b5fd' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={18} />
            </button>
          )}

          {/* 🔔 Community Notification Bell (Authenticated Users Only) */}
          {currentUser && (
            <div className="header-notif-container" ref={notifMenuRef}>
            <button 
              type="button"
              className="header-bell-btn" 
              onClick={() => setIsNotifOpen(prev => !prev)}
              title="Community Alerts & Mentor Post Notifications"
              aria-label="Community Notifications"
            >
              <Bell size={18} />
              {(unreadNotificationsCount > 0 || (currentUser && !isProfileComplete(userProfile))) && (
                <span className="bell-badge-pill" style={!isProfileComplete(userProfile) && unreadNotificationsCount === 0 ? { background: '#F59E0B' } : undefined}>
                  {unreadNotificationsCount > 0 ? unreadNotificationsCount : '!'}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="header-notif-dropdown">
                <div className="notif-dropdown-header">
                  <div className="ndh-title-row">
                    <Bell size={15} className="text-purple" />
                    <span className="ndh-title">Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="ndh-count">{unreadNotificationsCount} unread</span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="ndh-actions-row">
                      {unreadNotificationsCount > 0 && (
                        <button 
                          type="button"
                          className="ndh-action-btn ndh-mark-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllNotificationsAsRead();
                          }}
                          title="Mark all notifications as read"
                        >
                          <CheckCheck size={12} />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <button 
                        type="button"
                        className="ndh-action-btn ndh-clear-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllNotifications();
                        }}
                        title="Clear all notifications"
                      >
                        <Trash2 size={12} />
                        <span>Clear all</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="notif-dropdown-list">
                  {currentUser && !isProfileComplete(userProfile) && (
                    <div
                      className="notif-item unread notif-registration-item"
                      style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A', cursor: 'pointer', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}
                      onClick={() => {
                        setIsNotifOpen(false);
                        onNavigate('registration-view');
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={16} className="text-amber-600" />
                      </div>
                      <div className="notif-details" style={{ flex: 1, minWidth: 0 }}>
                        <div className="notif-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span className="notif-type-tag" style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>Action Required</span>
                          <span className="notif-time" style={{ fontSize: '11px', color: '#92400E', fontWeight: 600 }}>Incomplete</span>
                        </div>
                        <p className="notif-msg" style={{ fontSize: '12.5px', fontWeight: 600, color: '#78350F', margin: 0, lineHeight: 1.3 }}>
                          Complete Registration: Add skills &amp; upload resume
                        </p>
                      </div>
                      <span className="notif-unread-dot" style={{ background: '#F59E0B' }} />
                    </div>
                  )}
                  {notifications.length === 0 && (!currentUser || isProfileComplete(userProfile)) && (
                    <div className="notif-empty">
                      <Bell size={24} className="text-muted" />
                      <p>No new notifications</p>
                      <span>Follow mentors to get notified when they post!</span>
                    </div>
                  )}
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        setIsNotifOpen(false);
                        onNavigate('community-view');
                        setTimeout(() => {
                          const el = document.getElementById(n.postId);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('highlight-post');
                            setTimeout(() => el.classList.remove('highlight-post'), 2500);
                          }
                        }, 250);
                      }}
                    >
                      <img src={n.mentorAvatar} alt={n.mentorName} className="notif-avatar" />
                      <div className="notif-details">
                        <div className="notif-top">
                          <span className="notif-type-tag">{n.title}</span>
                          <span className="notif-time">{n.createdAt}</span>
                        </div>
                        <p className="notif-msg">{n.message}</p>
                      </div>
                      {!n.isRead && <span className="notif-unread-dot" />}
                    </div>
                  ))}
                </div>

                <div className="notif-dropdown-footer">
                  <button 
                    type="button"
                    className="ndf-view-all"
                    onClick={() => {
                      setIsNotifOpen(false);
                      onNavigate('community-view');
                    }}
                  >
                    Go to Community Feed →
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* User Avatar Dropdown OR Login/Register CTA */}
          {currentUser ? (
            <div 
              ref={userMenuRef}
              className="user-avatar-dropdown-wrapper"
              onMouseEnter={() => setIsUserMenuOpen(true)}
              onMouseLeave={() => setIsUserMenuOpen(false)}
            >
              <div 
                className="user-avatar-trigger-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserMenuOpen(prev => !prev);
                }}
              >
                <div className="user-nav-avatar-circle">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="user-nav-avatar-img" 
                  />
                </div>
                <ChevronDown size={14} className="user-avatar-chevron" />
              </div>

              {isUserMenuOpen && (
                <div className="myshine-user-flyout-card">
                  <div className="flyout-user-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <strong>{currentUser.name}</strong>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isAlreadyMentor && isCreatorMode ? (
                          <span style={{ background: '#ecfdf5', color: '#059669', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)' }}>
                            ⭐ Mentor
                          </span>
                        ) : (
                          <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, border: '1px solid rgba(100,116,139,0.2)' }}>
                            Candidate
                          </span>
                        )}
                        {currentUser?.isAdmin && (
                          <span style={{ background: '#f5f3ff', color: '#7c3aed', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)' }}>
                            🛡️ Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <span>{currentUser.email || userProfile?.email || ''}</span>
                  </div>

                  <div className="flyout-divider"></div>

                  {isAlreadyMentor && isCreatorMode ? (
                    <>
                      {/* Mentor Mode: Mentor Studio Tools & Profiles */}
                      <div className="flyout-section-tag">MENTOR STUDIO</div>

                      <a 
                        href="/mentor" 
                        className={`flyout-item ${currentView === 'mentor-dashboard-view' ? 'flyout-item-highlight' : ''}`}
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          navigateToCreatorStudio('bookings'); 
                        }}
                      >
                        <Sparkles size={15} className="text-amber-500" /> 
                        <span style={{ fontWeight: 700 }}>Mentor Studio Hub</span>
                      </a>

                      <a 
                        href={`/expert/${mentorCreatorId}`} 
                        className={`flyout-item ${currentView === 'expert-profile-view' ? 'flyout-item-active' : ''}`}
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          selectExpertById(mentorCreatorId);
                          onNavigate('expert-profile-view', `/expert/${mentorCreatorId}`); 
                        }}
                      >
                        <Eye size={15} className="text-indigo-600" /> 
                        <div className="flyout-item-text">
                          <span style={{ fontWeight: 600, color: '#4338ca' }}>Public Mentor Profile</span>
                          <span className="flyout-item-sub">What candidates see &amp; book</span>
                        </div>
                      </a>

                      <a 
                        href="/mentor" 
                        className="flyout-item" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          navigateToCreatorStudio('availability'); 
                        }}
                      >
                        <Clock size={15} className="text-blue-600" /> 
                        <span>Manage Availability &amp; Slots</span>
                      </a>

                      <a 
                        href="/mentor" 
                        className="flyout-item" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          navigateToCreatorStudio('pricing'); 
                        }}
                      >
                        <CreditCard size={15} className="text-emerald-600" /> 
                        <span>Session Rates &amp; Offerings</span>
                      </a>

                      <a 
                        href="/mentor" 
                        className="flyout-item" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          navigateToCreatorStudio('teaser'); 
                        }}
                      >
                        <Film size={15} className="text-purple-600" /> 
                        <span>60s Video Teaser Pitch</span>
                      </a>

                      <a 
                        href="/sessions" 
                        className="flyout-item" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          onNavigate('sessions-view', '/sessions'); 
                        }}
                      >
                        <Video size={15} className="text-purple-600" /> 
                        <span style={{ fontWeight: 600 }}>Candidate Calls (Host)</span>
                        {upcomingCount > 0 && (
                          <span className="flyout-count-pill">{upcomingCount}</span>
                        )}
                      </a>

                      <div className="flyout-divider"></div>

                      <a 
                        href="/profile" 
                        className={`flyout-item ${currentView === 'profile-view' ? 'flyout-item-active' : ''}`}
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          onNavigate('profile-view', '/profile'); 
                        }}
                      >
                        <User size={15} className="text-slate-600" /> 
                        <div className="flyout-item-text">
                          <span style={{ fontWeight: 600 }}>My Candidate Profile</span>
                          <span className="flyout-item-sub">Basic info, skills &amp; resume</span>
                        </div>
                      </a>
                    </>
                  ) : (
                    <>
                      {/* Seek Guidance Mode: ONLY Candidate Profile & Seeker Options */}
                      <div className="flyout-section-tag">PROFILE</div>

                      <a 
                        href="/profile" 
                        className={`flyout-item ${currentView === 'profile-view' ? 'flyout-item-active' : ''}`} 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          onNavigate('profile-view', '/profile'); 
                        }}
                      >
                        <User size={15} className="text-blue-600" /> 
                        <div className="flyout-item-text">
                          <span style={{ fontWeight: 600 }}>My Candidate Profile</span>
                          <span className="flyout-item-sub">Basic info, skills &amp; resume</span>
                        </div>
                      </a>

                      <a 
                        href="/peercomet" 
                        className={`flyout-item ${currentView === 'guidance-view' ? 'flyout-item-active' : ''}`} 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          onNavigate('guidance-view', '/peercomet'); 
                        }}
                      >
                        <Sparkles size={15} className="text-purple-600" /> 
                        <span>Career Roadmap &amp; Goal</span>
                      </a>

                      <a 
                        href="/sessions" 
                        className="flyout-item flyout-item-highlight" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setIsUserMenuOpen(false); 
                          onNavigate('sessions-view', '/sessions'); 
                        }}
                      >
                        <Video size={15} className="text-purple-600" /> 
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          My 1:1 Bookings
                        </span>
                        {upcomingCount > 0 && (
                          <span className="flyout-count-pill">{upcomingCount}</span>
                        )}
                      </a>
                    </>
                  )}

                  {!isAlreadyMentor && (currentUser?.isMentorEligible || userProfile?.isMentorEligible) && (
                    <a 
                      href="#!" 
                      className="flyout-item flyout-item-mentor-recruit" 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        setIsUserMenuOpen(false); 
                        setIsCreatorWizardOpen(true); 
                      }}
                    >
                      <Sparkles size={15} className="text-amber-500" /> 
                      <span style={{ fontWeight: 700, color: '#92400E' }}>Become a Mentor (0% Fee)</span>
                      <span className="flyout-gold-tag">0% Fee</span>
                    </a>
                  )}

                  {currentUser?.isAdmin && (
                    <a 
                      href="/admin" 
                      className="flyout-item" 
                      style={{ background: '#fdf4ff', color: '#7c3aed', fontWeight: 700 }}
                      onClick={(e) => { 
                        e.preventDefault(); 
                        setIsUserMenuOpen(false); 
                        onNavigate('admin-dashboard-view'); 
                      }}
                    >
                      <ShieldCheck size={15} className="text-purple-600" /> 
                      <span>Admin Control Center</span>
                    </a>
                  )}

                  <div className="flyout-divider"></div>

                  <a 
                    href="#!" 
                    className="flyout-item" 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsUserMenuOpen(false);
                      setIsUpdateProfileModalOpen(true);
                    }}
                  >
                    <Settings size={14} /> Account &amp; Basic Profile
                  </a>
                  
                  <a 
                    href="#!" 
                    className="flyout-item text-danger" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      setIsUserMenuOpen(false); 
                      logout(); 
                    }}
                  >
                    <LogOut size={14} /> Sign out
                  </a>
                </div>
              )}
            </div>
          ) : (
            <button 
              type="button"
              className="btn-header-login-gold"
              onClick={() => onNavigate('login-view', '/login?redirect=/peercomet&action=unlock')}
              title="Sign in or register with your email"
            >
              <User size={14} className="bhlg-user-icon" />
              <span>Login / Register</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

