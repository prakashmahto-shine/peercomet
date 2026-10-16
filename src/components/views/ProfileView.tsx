import React, { useState } from 'react';
import { 
  Download, Sparkles, FileText, ArrowRight, 
  Trash2, Star, Upload, ChevronDown, Check, Edit2, Briefcase, 
  Plus, X, Phone, Mail, CheckCircle2,
  GraduationCap, Zap, User,
  Gift, Users, Eye,
  Share2, Building2, MapPin, CheckCircle, TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';
import { formatResumeAge, hasResume, resumeAgeDays } from '../../utils/resume';
import { parseNameAndRole } from '../../utils/profile';
import { peerpathApi } from '../../services/api';

// Age in whole years from a YYYY-MM-DD date of birth
const ageFromDob = (dob?: string | null): number | null => {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
};

export const ProfileView: React.FC = () => {
  const { 
    currentUser,
    userProfile, 
    navigate, 
    navigateToCreatorStudio,
    selectExpertById,
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
    showToast,
    sessions
  } = useApp();
  const mentorCreatorId = currentUser?.creatorId || currentUser?.id || '';
  const completedSessionCount = sessions.filter(sess => sess.status === 'completed').length;

  const isMentor = Boolean(
    userProfile.isMentor || 
    currentUser?.role === 'mentor'
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

  // Compute clean candidate name and professional title decoupled from resume string artifacts
  const rawDisplayName = userProfile.name || [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || currentUser?.name || 'Candidate';
  const { cleanName, role: extractedRole } = parseNameAndRole(rawDisplayName, userProfile.designation);
  const displayName = cleanName || rawDisplayName;
  const displayRole = (userProfile.designation && !/^(tech professional|candidate|developer|professional)$/i.test(userProfile.designation.trim()))
    ? userProfile.designation 
    : (extractedRole || 'Software Professional');


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

  // Profile completeness: share of key profile items the user has actually filled in
  const completenessChecks = [
    Boolean(userProfile.name),
    Boolean(userProfile.location),
    userProfile.totalExperienceYears !== null && userProfile.totalExperienceYears !== undefined,
    Boolean(userProfile.designation || userProfile.currentlyNotWorking),
    userProfile.currentCtcLpa !== null && userProfile.currentCtcLpa !== undefined,
    Boolean(userProfile.summary),
    (userProfile.skills?.length || 0) >= 3,
    Boolean(userProfile.educationDegree),
    Boolean(userProfile.resumeFileName),
    Boolean(userProfile.linkedinUrl || userProfile.githubUrl || userProfile.portfolioUrl),
  ];
  const readinessPercent = Math.round((completenessChecks.filter(Boolean).length / completenessChecks.length) * 100);
  const strokeDashoffset = 314.15 - (314.15 * (readinessPercent / 100));

  return (
    <div className="peerpath-profile-page-wrapper">
      <div className="peerpath-profile-container">

        {/* Mentor Mode Banner (ONLY in Mentor Mode; clean candidate profile in Seek Guidance mode) */}
        {isMentor && isCreatorMode && (
          <div className="mentor-active-banner">
            <div className="mab-left">
              <div className="mab-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Verified Mentor Profile Active</strong>
                <p>You are viewing your candidate profile. Basic details here (Name, Headline, Experience, Skills) sync with your public mentor profile.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn-mab-preview"
                onClick={() => {
                  selectExpertById(mentorCreatorId);
                  navigate('expert-profile-view', `/expert/${mentorCreatorId}`);
                }}
                style={{
                  background: '#FFFFFF',
                  color: '#1E293B',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '7px 13px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Eye size={14} className="text-indigo-600" />
                <span>View Public Mentor Profile</span>
              </button>

              <button 
                type="button" 
                className="btn-mab-studio"
                onClick={() => navigateToCreatorStudio('bookings')}
              >
                <span>⚡ Open Mentor Studio Hub</span>
              </button>
            </div>
          </div>
        )}

        {/* Resume nudge: no resume yet, or one older than 6 months */}
        {(!hasResume(userProfile) || (resumeAgeDays(userProfile) ?? 0) > 180) && (
          <div className="shine-single-upload-banner">
            <div className="ssub-left">
              <div className="ssub-icon-wrap">
                <TrendingUp size={18} className="text-amber-600" />
              </div>
              <div className="ssub-content">
                <div className="ssub-title-row">
                  <strong className="ssub-headline">
                    {hasResume(userProfile)
                      ? `Your resume was last uploaded ${formatResumeAge(userProfile) || 'a while ago'}`
                      : 'Upload your resume to complete your profile'}
                  </strong>
                </div>
                <p className="ssub-subtext">
                  {hasResume(userProfile)
                    ? 'Update your resume and skills so mentors see your current experience before a session.'
                    : 'Add your resume and skills so mentors understand your background before a session.'}
                </p>
              </div>
            </div>

            <div className="ssub-actions">
              <button 
                type="button" 
                className="btn-ssub-upload"
                onClick={() => setIsUpdateProfileModalOpen(true)}
              >
                <span>{hasResume(userProfile) ? 'Update Resume' : 'Upload Resume'}</span>
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
                  src={currentUser?.avatar || userProfile?.avatar || '/brand/android-chrome-192x192.png'} 
                  alt={userProfile.name} 
                  className="phc-avatar-img"
                />
                <span className="phc-verified-badge" title="Shine.com Verified Candidate">
                  <CheckCircle size={14} />
                </span>
              </div>

              <div className="phc-identity-details">
                {/* Line 1: Clean Candidate Name + Verification & Notice Badges */}
                <div className="phc-name-row">
                  <h1 className="phc-name">{displayName}</h1>
                  <div className="phc-badges-cluster">
                    {(userProfile.email || currentUser?.email) && (
                      <span className="phc-candidate-pill" title="Email verified with Shine">
                        <CheckCircle2 size={12} /> Email verified
                      </span>
                    )}
                    {(userProfile.phone || currentUser?.mobile) && (
                      <span className="phc-candidate-pill phc-pill-phone" title="Mobile verified with Shine">
                        <CheckCircle2 size={12} /> Mobile verified
                      </span>
                    )}
                    {userProfile.jobSearchStatus && !userProfile.jobSearchStatus.toLowerCase().includes('not looking') && (
                      <span className="phc-notice-pill">
                        {userProfile.jobSearchStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Line 2: Dedicated Professional Designation & Organization / Status */}
                <div className="phc-designation-row">
                  <span className="phc-role-title">{displayRole}</span>
                  {!userProfile.currentlyNotWorking && userProfile.currentCompany && (
                    <span className="phc-company-wrap">
                      <span className="phc-company-at">at</span>
                      <span className="phc-company-name">{userProfile.currentCompany}</span>
                    </span>
                  )}
                  {userProfile.currentlyNotWorking && (
                    <span className="phc-seeking-badge">
                      <span className="phc-sep-dot">•</span>
                      <span className="phc-seeking-text">Open to Opportunities</span>
                    </span>
                  )}
                </div>

                {/* Line 3: Quick Meta Pills (Experience, Location, Education, Career State) */}
                <div className="phc-meta-pills-row">
                  {(userProfile.currentCompany || userProfile.currentlyNotWorking) && (
                    <span className="phc-meta-pill">
                      <Building2 size={13} /> {userProfile.currentlyNotWorking ? 'Career Break' : userProfile.currentCompany}
                    </span>
                  )}
                  {(userProfile.experienceYears || (userProfile.totalExperienceYears !== null && userProfile.totalExperienceYears !== undefined)) && (
                    <span className="phc-meta-pill">
                      <Briefcase size={13} /> {userProfile.experienceYears || `${userProfile.totalExperienceYears} yrs`}
                    </span>
                  )}
                  {userProfile.location && (
                    <span className="phc-meta-pill">
                      <MapPin size={13} /> {userProfile.location}
                    </span>
                  )}
                  {userProfile.educationDegree && (
                    <span className="phc-meta-pill">
                      <GraduationCap size={13} /> {userProfile.educationDegree.split('-')[0]?.trim()}
                    </span>
                  )}
                </div>

                {/* Line 4: Verified Contact Info */}
                <div className="phc-contact-row">
                  {(userProfile.phone || currentUser?.mobile) && (
                    <span className="phc-contact-item">
                      <Phone size={13} className="text-emerald" /> +91 {userProfile.phone || currentUser?.mobile}
                      <Check size={12} className="text-emerald" />
                    </span>
                  )}
                  {(userProfile.phone || currentUser?.mobile) && (userProfile.email || currentUser?.email) && (
                    <span className="phc-contact-sep">•</span>
                  )}
                  {(userProfile.email || currentUser?.email) && (
                    <span className="phc-contact-item">
                      <Mail size={13} className="text-emerald" /> {userProfile.email || currentUser?.email}
                      <Check size={12} className="text-emerald" />
                    </span>
                  )}
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

              {userProfile.resumeFileName ? (
                <div className="resume-preview-row">
                  <div className="rpr-icon-box">
                    <FileText size={28} className="text-red" />
                  </div>
                  <div className="rpr-details">
                    <strong className="rpr-filename">
                      {userProfile.resumeFileName}
                    </strong>
                    <div className="rpr-meta">
                      {formatResumeAge(userProfile) && <span>Uploaded {formatResumeAge(userProfile)}</span>}
                      {userProfile.targetCtc && (
                        <span className="rpr-ats-pill">✨ ATS Match for {userProfile.targetCtc}</span>
                      )}
                    </div>
                  </div>

                  <div className="rpr-actions">
                    <a
                      className="rpr-btn-icon"
                      title="Download resume"
                      href={peerpathApi.ownResumeUrl()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={15} />
                    </a>
                    <button 
                      className="rpr-btn-icon text-purple" 
                      title="Upload a new resume"
                      onClick={() => setIsCvSyncModalOpen(true)}
                    >
                      <Sparkles size={15} />
                    </button>
                    <button 
                      className="rpr-btn-icon text-red" 
                      title="Delete Resume"
                      onClick={() => {
                        if (window.confirm('Delete this resume from your profile?')) {
                          removeCandidateResume();
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  <FileText size={30} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ margin: '0 0 6px', color: '#334155', fontWeight: 600, fontSize: '14px' }}>No resume uploaded yet</p>
                  <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '13px' }}>Upload your latest CV to calibrate AI match with top recruiters & mentors.</p>
                  <button className="btn-card-action" onClick={() => setIsCvSyncModalOpen(true)} style={{ margin: '0 auto', display: 'inline-flex', padding: '6px 14px' }}>
                    <Upload size={13} /> Upload Resume
                  </button>
                </div>
              )}
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
                  <strong>
                    {userProfile.currentlyNotWorking
                      ? 'Career Break / Exploring Opportunities'
                      : (userProfile.designation || displayRole || 'Not specified')}
                  </strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Current Company</span>
                  <strong>
                    {userProfile.currentlyNotWorking
                      ? 'Not currently employed'
                      : (userProfile.currentCompany || 'Not specified')}
                  </strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Total Experience</span>
                  <strong>
                    {userProfile.experienceYears ||
                      (userProfile.totalExperienceYears !== null && userProfile.totalExperienceYears !== undefined
                        ? `${userProfile.totalExperienceYears} Year${userProfile.totalExperienceYears === 1 ? '' : 's'}${userProfile.totalExperienceMonths ? ` ${userProfile.totalExperienceMonths} Mo` : ''}`
                        : 'Not specified')}
                  </strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Current City</span>
                  <strong>{userProfile.location || 'Not specified'}</strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Current Compensation</span>
                  <strong className={userProfile.currentCtc || userProfile.currentCtcLpa ? "text-emerald" : ""}>
                    {userProfile.currentCtc || (userProfile.currentCtcLpa !== null && userProfile.currentCtcLpa !== undefined ? `₹${userProfile.currentCtcLpa} LPA` : 'Not specified')}
                  </strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Expected Compensation</span>
                  <strong>
                    {userProfile.expectedCtc || (userProfile.expectedCtcLpa !== null && userProfile.expectedCtcLpa !== undefined ? `₹${userProfile.expectedCtcLpa} LPA` : 'Not specified')}
                  </strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Notice Period</span>
                  <strong>{userProfile.noticePeriod || 'Not specified'}</strong>
                </div>
                <div className="wp-info-cell">
                  <span className="wp-cell-label">Mobile Number</span>
                  <strong>{userProfile.phone || currentUser?.mobile ? `+91 ${userProfile.phone || currentUser?.mobile}` : 'Not specified'}</strong>
                </div>
                {userProfile.dateOfBirth && (
                  <div className="wp-info-cell">
                    <span className="wp-cell-label">Date of Birth / Age</span>
                    <strong>
                      {ageFromDob(userProfile.dateOfBirth) !== null
                        ? `${userProfile.dateOfBirth} (${ageFromDob(userProfile.dateOfBirth)} yrs)`
                        : userProfile.dateOfBirth}
                    </strong>
                  </div>
                )}
              </div>

              {userProfile.summary && (
                <div className="wp-summary-box">
                  <span className="wp-summary-label">Executive Summary</span>
                  <p className="wp-summary-text">{userProfile.summary}</p>
                </div>
              )}

              {(userProfile.linkedinUrl || userProfile.githubUrl || userProfile.portfolioUrl) && (
                <div className="wp-summary-box">
                  <span className="wp-summary-label">Links</span>
                  <p className="wp-summary-text">
                    {[['LinkedIn', userProfile.linkedinUrl], ['GitHub', userProfile.githubUrl], ['Portfolio', userProfile.portfolioUrl]]
                      .filter(([, url]) => url)
                      .map(([label, url], i) => (
                        <React.Fragment key={label}>
                          {i > 0 && ' • '}
                          <a href={url as string} target="_blank" rel="noreferrer">{label}</a>
                        </React.Fragment>
                      ))}
                  </p>
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
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => setIsUpdateProfileModalOpen(true)}
                >
                  <Edit2 size={13} /> Edit Education
                </button>
              </div>

              {userProfile.educationDegree || userProfile.educationCollege ? (
                <div className="edu-item-row">
                  <div className="edu-icon-box">
                    🎓
                  </div>
                  <div className="edu-details">
                    <strong className="edu-title">
                      {userProfile.educationDegree || 'Degree not specified'}
                    </strong>
                    <span className="edu-institution">
                      {userProfile.educationCollege || 'Institution not specified'}
                      {userProfile.graduationYear ? ` • Class of ${userProfile.graduationYear}` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '18px 16px', color: '#64748b', fontSize: '13px' }}>
                  No education details added yet. Click <button type="button" onClick={() => setIsUpdateProfileModalOpen(true)} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Edit Education</button> to add your degree and college.
                </div>
              )}
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
                  <strong className="csd-value">{userProfile.jobSearchStatus || 'Not set'}</strong>
                </div>
              </div>

              <button 
                className="btn-spc-change-status"
                onClick={() => {
                  setSelectedStatus(userProfile.jobSearchStatus || 'Actively Looking');
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
                  <h4>Profile Completeness</h4>
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
                  <span>{readinessPercent === 100 ? 'Profile complete' : 'Complete your profile'}</span>
                </div>
              </div>

              <div className="readiness-checklist">
                <div className={`rc-item ${userProfile.resumeFileName ? 'done' : 'pending'}`}>
                  {userProfile.resumeFileName ? (
                    <CheckCircle2 size={14} className="text-emerald" />
                  ) : (
                    <span className="rc-pending-dot" />
                  )}
                  <span>{userProfile.resumeFileName ? 'Resume uploaded' : 'Upload your resume'}</span>
                </div>
                <div className={`rc-item ${(userProfile.badges?.length || 0) > 0 ? 'done' : 'pending'}`}>
                  {(userProfile.badges?.length || 0) > 0 ? (
                    <CheckCircle2 size={14} className="text-emerald" />
                  ) : (
                    <span className="rc-pending-dot" />
                  )}
                  <span>{(userProfile.badges?.length || 0)} Peer-Verified Skill Badges Earned</span>
                </div>
                <div className={`rc-item ${completedSessionCount > 0 ? 'done' : 'pending'}`}>
                  {completedSessionCount > 0 ? <CheckCircle2 size={14} className="text-emerald" /> : <span className="rc-pending-dot" />}
                  <span>{completedSessionCount > 0 ? `${completedSessionCount} mentor session${completedSessionCount === 1 ? '' : 's'} completed` : 'Complete a 1:1 mentor session'}</span>
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
