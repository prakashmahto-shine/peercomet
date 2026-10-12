import React, { useState } from 'react';
import { 
  Download, Sparkles, FileText, ArrowRight, 
  Trash2, Star, Upload, ChevronDown, Check, Edit2, Briefcase, 
  Plus, X, Phone, Mail, CheckCircle2,
  GraduationCap, Zap, User,
  Gift, Users,
  Share2, Building2, MapPin, CheckCircle, TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';

export const ProfileView: React.FC = () => {
  const { 
    currentUser,
    userProfile, 
    navigate, 
    navigateToCreatorStudio,
    isCreatorMode, 
    updateUserProfile,
    updateProfileSummary, 
    addSkill, 
    removeSkill, 
    updateJobSearchStatus,
    updateMentorRatesAndAvailability,
    updateMentorTeaserVideo,
    setIsCreatorWizardOpen,
    setIsCvSyncModalOpen,
    isUpdateProfileModalOpen,
    setIsUpdateProfileModalOpen,
    removeCandidateResume,
    showToast
  } = useApp();

  const isMentor = Boolean(
    userProfile.isMentor || 
    currentUser?.role === 'mentor' || 
    currentUser?.id === 'akash' ||
    (currentUser?.username && currentUser.username.toLowerCase() === 'akash')
  );
  const isNotLooking = (userProfile.jobSearchStatus || '').toLowerCase().includes('not looking');

  // Modals state
  const [showJobStatusModal, setShowJobStatusModal] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(
    userProfile.jobSearchStatus || 'Serving Notice Period (30 Days)'
  );
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [summaryInput, setSummaryInput] = useState<string>(userProfile.summary);
  const [newSkillInput, setNewSkillInput] = useState<string>('');
  const [showAddSkillInput, setShowAddSkillInput] = useState<boolean>(false);


  const handleSaveSummary = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileSummary(summaryInput);
    setShowSummaryModal(false);
  };

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkillInput.trim()) {
      addSkill(newSkillInput.trim());
      setNewSkillInput('');
      setShowAddSkillInput(false);
    }
  };

  const handleCopyProfileLink = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    showToast('Profile Link Copied!', `Share your verified ${BRAND.name} profile with recruiters or hiring managers.`, 'info');
  };

  // Readiness Gauge (e.g. 85%)
  const readinessPercent = userProfile.profileScore || 85;
  const strokeDashoffset = 314.15 - (314.15 * (readinessPercent / 100));

  return (
    <div className="peerpath-profile-page-wrapper">
      <div className="peerpath-profile-container">

        {/* Mentor Mode Banner (If Logged In User is Mentor / Creator) */}
        {isMentor && (
          <div className="mentor-active-banner">
            <div className="mab-left">
              <div className="mab-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Verified Mentor Profile Active</strong>
                <p>You are viewing candidate details. Manage your teaser video, availability slots, session rates, and 1:1 calls in Mentor Studio.</p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-mab-studio"
              onClick={() => navigateToCreatorStudio('bookings')}
            >
              <span>⚡ Open Mentor Studio Hub</span>
            </button>
          </div>
        )}

        {/* Single High-Conversion Resume Upload Booster Banner */}
        {userProfile.resumeLastUpdated !== 'Updated just now' && (
          <div className="shine-single-upload-banner">
            <div className="ssub-left">
              <div className="ssub-icon-wrap">
                <TrendingUp size={18} className="text-amber-600" />
              </div>
              <div className="ssub-content">
                <div className="ssub-title-row">
                  <strong className="ssub-headline">Your profile was last updated almost a year ago!</strong>
                  <span className="ssub-pill-tag">3.8x More Recruiter Shortlists</span>
                </div>
                <p className="ssub-subtext">
                  Recruiters prioritize active candidates. Upload your latest CV — our AI auto-fills and updates your profile in 10s.
                </p>
              </div>
            </div>

            <div className="ssub-actions">
              <button 
                type="button" 
                className="btn-ssub-upload"
                onClick={() => setIsUpdateProfileModalOpen(true)}
              >
                <span>Update Profile</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 2. Candidate Hero Identity Card */}
        <div className="profile-hero-card">
          <div className="phc-cover-banner">
            <div className="phc-cover-grid-pattern" />
          </div>

          <div className="phc-main-content">
            <div className="phc-top-row">
              <div className="phc-avatar-wrap">
                <img 
                  src={currentUser?.avatar || (userProfile.isMentor ? '/avatars/akash.jpg' : '/avatars/prakash.jpg')} 
                  alt={userProfile.name} 
                  className="phc-avatar-img"
                />
                <span className="phc-verified-badge" title="Shine.com Verified Candidate">
                  <CheckCircle size={14} />
                </span>
              </div>

              <div className="phc-identity-details">
                <div className="phc-name-row">
                  <h1 className="phc-name">{userProfile.name}</h1>
                  <span className="phc-candidate-pill">
                    <CheckCircle2 size={12} /> Shine Verified Candidate
                  </span>
                </div>

                <p className="phc-headline">{userProfile.headline}</p>

                {/* Quick Meta Pills */}
                <div className="phc-meta-pills-row">
                  <span className="phc-meta-pill">
                    <Building2 size={13} /> {userProfile.currentCompany || 'TCS'}
                  </span>
                  <span className="phc-meta-pill">
                    <Briefcase size={13} /> {userProfile.experienceYears || '4.2 Years Exp'}
                  </span>
                  <span className="phc-meta-pill">
                    <MapPin size={13} /> {userProfile.location || 'Bengaluru, India'}
                  </span>
                  <span className="phc-meta-pill">
                    <GraduationCap size={13} /> {userProfile.educationDegree?.split('-')[0]?.trim() || 'B.Tech CSE'}
                  </span>
                </div>

                {/* Contact Verification Row */}
                <div className="phc-contact-row">
                  <span className="phc-contact-item">
                    <Phone size={13} className="text-emerald" /> {userProfile.phone || '+91 98765 43210'}
                    <Check size={12} className="text-emerald" />
                  </span>
                  <span className="phc-contact-sep">•</span>
                  <span className="phc-contact-item">
                    <Mail size={13} className="text-emerald" /> {userProfile.email || 'prakash.mahto@gmail.com'}
                    <Check size={12} className="text-emerald" />
                  </span>
                </div>
              </div>

              {/* Top Right Action CTA Buttons */}
              <div className="phc-actions-block">
                <button 
                  className="btn-phc-primary"
                  onClick={() => setIsUpdateProfileModalOpen(true)}
                >
                  <Edit2 size={13} /> Edit Profile
                </button>

                <button 
                  className="btn-phc-secondary"
                  onClick={handleCopyProfileLink}
                >
                  <Share2 size={13} /> Share Profile
                </button>
              </div>
            </div>
          </div>
        </div>



        {/* 6. Main Two-Column Detailed Layout */}
        <div className="profile-details-grid">
          
          {/* Left Column (65%): Resume, Skills, Work Profile, Education */}
          <div className="profile-details-left">
            
            {/* Resume & AI Calibration Card */}
            <div className="p-card resume-card">
              <div className="p-card-header">
                <div className="p-card-title-group">
                  <FileText size={18} className="text-blue" />
                  <h3>Resume & AI Match Calibration</h3>
                </div>
                <button className="btn-card-action" onClick={() => setIsCvSyncModalOpen(true)}>
                  <Upload size={13} /> Upload Latest CV
                </button>
              </div>

              <div className="resume-preview-row">
                <div className="rpr-icon-box">
                  <FileText size={28} className="text-red" />
                </div>
                <div className="rpr-details">
                  <strong className="rpr-filename">
                    {userProfile.resumeFileName || 'Prakash_Mahto_Frontend_Resume.pdf'}
                  </strong>
                  <div className="rpr-meta">
                    <span>Uploaded: {userProfile.resumeLastUpdated || 'Synced recently'}</span>
                    <span className="rpr-ats-pill">✨ 85% ATS Match for {userProfile.targetCtc || '₹18L+'}</span>
                  </div>
                </div>

                <div className="rpr-actions">
                  <button 
                    className="rpr-btn-icon" 
                    title="Download Resume"
                    onClick={() => alert('Downloading resume...')}
                  >
                    <Download size={15} />
                  </button>
                  <button 
                    className="rpr-btn-icon text-purple" 
                    title="AI Sync with Shine Profile"
                    onClick={() => setIsCvSyncModalOpen(true)}
                  >
                    <Sparkles size={15} />
                  </button>
                  {userProfile.resumeFileName && (
                    <button 
                      className="rpr-btn-icon text-red" 
                      title="Delete Resume"
                      onClick={() => {
                        if (window.confirm('Delete this resume from your Shine profile?')) {
                          removeCandidateResume();
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Key Skills Inventory Card */}
            <div className="p-card skills-card">
              <div className="p-card-header">
                <div className="p-card-title-group">
                  <Zap size={18} className="text-amber" />
                  <h3>Key Skills Inventory ({userProfile.skills.length})</h3>
                </div>
                <button 
                  className="btn-card-action"
                  onClick={() => setShowAddSkillInput(!showAddSkillInput)}
                >
                  <Plus size={13} /> Add Skill
                </button>
              </div>

              {showAddSkillInput && (
                <form className="add-skill-form" onSubmit={handleAddSkillSubmit}>
                  <input 
                    type="text" 
                    placeholder="Enter skill name (e.g. Next.js, Node.js, GraphQL)..." 
                    value={newSkillInput} 
                    onChange={(e) => setNewSkillInput(e.target.value)} 
                    autoFocus 
                    className="add-skill-input-field"
                  />
                  <button type="submit" className="btn-add-skill-submit">Add</button>
                  <button type="button" className="btn-add-skill-cancel" onClick={() => setShowAddSkillInput(false)}>Cancel</button>
                </form>
              )}

              <div className="skills-inventory-list">
                {userProfile.skills.map((skill, idx) => {
                  const isVerified = ['React.js', 'TypeScript', 'UI Performance', 'State Architecture'].some(v => 
                    skill.toLowerCase().includes(v.toLowerCase())
                  );

                  return (
                    <div key={idx} className={`skill-inventory-chip ${isVerified ? 'verified-chip' : ''}`}>
                      {isVerified && <Check size={12} className="text-emerald" />}
                      <span>{skill}</span>
                      <button 
                        type="button" 
                        className="btn-remove-skill" 
                        onClick={() => removeSkill(skill)}
                        title={`Remove ${skill}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Work Profile & Summary Card */}
            <div className="p-card work-profile-card">
              <div className="p-card-header">
                <div className="p-card-title-group">
                  <Briefcase size={18} className="text-purple" />
                  <h3>Work Profile & Experience</h3>
                </div>
                <button 
                  className="btn-card-action"
                  onClick={() => { setSummaryInput(userProfile.summary); setShowSummaryModal(true); }}
                >
                  <Edit2 size={13} /> Edit Summary
                </button>
              </div>

              <div className="wp-details-grid">
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Current Role</span>
                  <strong>{userProfile.headline?.split('|')[0] || 'Senior Frontend Engineer'}</strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Current Company</span>
                  <strong>{userProfile.currentCompany || 'TCS (Tech Services)'}</strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Experience</span>
                  <strong>{userProfile.experienceYears || '4 Years, 2 Months'}</strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Current Compensation</span>
                  <strong className="text-emerald">{userProfile.currentCtc || '₹5.5 LPA'}</strong>
                </div>
              </div>

              {userProfile.summary && (
                <div className="wp-summary-box">
                  <span className="wp-summary-label">Executive Summary</span>
                  <p className="wp-summary-text">{userProfile.summary}</p>
                </div>
              )}
            </div>

            {/* Education Card */}
            <div className="p-card education-card">
              <div className="p-card-header">
                <div className="p-card-title-group">
                  <GraduationCap size={18} className="text-blue" />
                  <h3>Education</h3>
                </div>
              </div>

              <div className="edu-item-row">
                <div className="edu-icon-box">
                  🎓
                </div>
                <div className="edu-details">
                  <strong className="edu-title">
                    {userProfile.educationDegree || 'B.Tech / B.E - Computer Science & Engineering'}
                  </strong>
                  <span className="edu-institution">
                    {userProfile.educationCollege || 'Jaipur Engineering College And Research Centre (RTU)'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (35%): Recruiter Status, Readiness Meter, Mentor CTA */}
          <div className="profile-details-right">
            
            {/* Shine Recruiter Search Visibility Card */}
            <div className="sidebar-p-card recruiter-status-card">
              <div className="spc-header">
                <div className="spc-title-row">
                  <Building2 size={16} className="text-purple" />
                  <h4>Shine Recruiter Visibility</h4>
                </div>
                <span className="spc-status-live-dot" />
              </div>

              <p className="spc-desc">
                Recruiters actively filter candidates based on search availability. Keep this updated to receive interview calls.
              </p>

              <div className="current-status-display-box">
                <span className="csd-label">Current Status:</span>
                <div className="csd-val-row">
                  <strong className="csd-value">{userProfile.jobSearchStatus || 'Serving Notice Period (30 Days)'}</strong>
                </div>
              </div>

              <button 
                className="btn-spc-change-status"
                onClick={() => {
                  setSelectedStatus(userProfile.jobSearchStatus || 'Serving Notice Period (30 Days)');
                  setShowJobStatusModal(true);
                }}
              >
                Change Availability Status
              </button>
            </div>

            {/* Peerpath Transition Readiness Meter */}
            <div className="sidebar-p-card readiness-gauge-card">
              <div className="spc-header">
                <div className="spc-title-row">
                  <Sparkles size={16} className="text-amber" />
                  <h4>Transition Readiness</h4>
                </div>
                <span className="spc-score-badge">{readinessPercent}%</span>
              </div>

              {/* Circular Gauge */}
              <div className="readiness-gauge-circle-wrap">
                <svg className="readiness-circle-svg" viewBox="0 0 120 120">
                  <circle className="gauge-track-bg" cx="60" cy="60" r="50" />
                  <circle 
                    className="gauge-blue-fill" 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    strokeDasharray="314.15" 
                    strokeDashoffset={strokeDashoffset} 
                  />
                </svg>
                <div className="gauge-center-content">
                  <strong>{readinessPercent}%</strong>
                  <span>Ready for {userProfile.targetCtc || '₹18L+'}</span>
                </div>
              </div>

              <div className="readiness-checklist">
                <div className="rc-item done">
                  <CheckCircle2 size={14} className="text-emerald" />
                  <span>Resume Synced with Shine ATS</span>
                </div>
                <div className="rc-item done">
                  <CheckCircle2 size={14} className="text-emerald" />
                  <span>2 Peer-Verified Skill Badges Earned</span>
                </div>
                <div className="rc-item pending">
                  <span className="rc-pending-dot" />
                  <span>1 Mock Interview with Staff Engineer</span>
                </div>
              </div>

              <button 
                className="btn-boost-readiness"
                onClick={() => navigate('guidance-view')}
              >
                Boost to 100% Readiness ➔
              </button>
            </div>

            {/* Founding Mentor / Creator Studio Invite Card */}
            {!userProfile.isMentor && (
              <div className="sidebar-p-card mentor-invite-card">
                <div className="mic-badge">
                  <Gift size={12} /> FOUNDING MENTOR CIRCLE
                </div>
                <h4>Have Senior Tech Experience?</h4>
                <p>Monetize your technical experience, guide ambitious engineers, and earn up to ₹2,500/hr on {BRAND.name}.</p>
                <button 
                  className="btn-apply-mentor-profile"
                  onClick={() => setIsCreatorWizardOpen(true)}
                >
                  <Sparkles size={13} /> Activate Mentor Mode (60s)
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* =========================================================================
          MODALS
         ========================================================================= */}
      

      {/* 2. Official Shine Job Search Status Modal */}
      {showJobStatusModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowJobStatusModal(false)}>
          <div className="job-status-modal-surface" onClick={e => e.stopPropagation()}>
            <div className="job-status-modal-header">
              <h3 className="js-modal-title">Set Your Job Search Availability</h3>
              <button 
                type="button" 
                className="btn-icon-close" 
                onClick={() => setShowJobStatusModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="job-status-modal-body">
              {/* Option 1: Serving Notice Period */}
              <div 
                className={`job-status-option-card ${selectedStatus.includes('Notice Period') ? 'selected' : ''}`}
                onClick={() => setSelectedStatus('Serving Notice Period (30 Days)')}
              >
                <div className="js-opt-left">
                  <div className="js-opt-icon-wrap">⚡</div>
                  <div className="js-opt-text">
                    <strong className="js-opt-title">Serving Notice Period (30 Days)</strong>
                    <p className="js-opt-sub">Immediate / quick joining advantage for hiring managers</p>
                  </div>
                </div>
                <div className="js-radio-circle">
                  {selectedStatus.includes('Notice Period') && <div className="js-radio-inner" />}
                </div>
              </div>

              {/* Option 2: Actively Looking For Jobs */}
              <div 
                className={`job-status-option-card ${selectedStatus === 'Actively Looking For Jobs' ? 'selected' : ''}`}
                onClick={() => setSelectedStatus('Actively Looking For Jobs')}
              >
                <div className="js-opt-left">
                  <div className="js-opt-icon-wrap">🎯</div>
                  <div className="js-opt-text">
                    <strong className="js-opt-title">Actively Looking For Jobs</strong>
                    <p className="js-opt-sub">Open to immediate recruiter outreach and interview scheduling</p>
                  </div>
                </div>
                <div className="js-radio-circle">
                  {selectedStatus === 'Actively Looking For Jobs' && <div className="js-radio-inner" />}
                </div>
              </div>

              {/* Option 3: Casually Exploring Opportunities */}
              <div 
                className={`job-status-option-card ${selectedStatus.includes('Casually Exploring') ? 'selected' : ''}`}
                onClick={() => setSelectedStatus('Casually Exploring Jobs')}
              >
                <div className="js-opt-left">
                  <div className="js-opt-icon-wrap">🔍</div>
                  <div className="js-opt-text">
                    <strong className="js-opt-title">Casually Exploring Opportunities</strong>
                    <p className="js-opt-sub">Only open for high-growth 1:1 transitions and senior roles</p>
                  </div>
                </div>
                <div className="js-radio-circle">
                  {selectedStatus.includes('Casually Exploring') && <div className="js-radio-inner" />}
                </div>
              </div>

              {/* Option 4: Not Looking For Jobs */}
              <div 
                className={`job-status-option-card ${selectedStatus.includes('Not Looking') ? 'selected' : ''}`}
                onClick={() => setSelectedStatus('Not Looking For Jobs')}
              >
                <div className="js-opt-left">
                  <div className="js-opt-icon-wrap">⏸️</div>
                  <div className="js-opt-text">
                    <strong className="js-opt-title">Not Looking For Jobs</strong>
                    <p className="js-opt-sub">Pause recruiter inquiries and recommendations for now</p>
                  </div>
                </div>
                <div className="js-radio-circle">
                  {selectedStatus.includes('Not Looking') && <div className="js-radio-inner" />}
                </div>
              </div>
            </div>

            <div className="job-status-modal-footer">
              <button 
                type="button" 
                className="btn-set-job-status-now"
                onClick={() => {
                  updateJobSearchStatus(selectedStatus);
                  setShowJobStatusModal(false);
                }}
              >
                Set Availability Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Summary Edit Modal */}
      {showSummaryModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-surface-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-top-header">
              <h3>Edit Executive Summary</h3>
              <button className="btn-icon-close" onClick={() => setShowSummaryModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveSummary}>
              <div className="modal-body-pad">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Highlight your key technical achievements and career aspirations:
                </label>
                <textarea 
                  value={summaryInput} 
                  onChange={(e) => setSummaryInput(e.target.value)} 
                  rows={5}
                  className="custom-textarea"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div className="modal-footer-flex">
                <button type="button" className="btn-ghost-sm" onClick={() => setShowSummaryModal(false)}>Cancel</button>
                <button type="submit" className="btn-shine-gold-sm">Save Summary</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
