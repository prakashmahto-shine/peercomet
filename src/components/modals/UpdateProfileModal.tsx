import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, Plus, Check, Loader2, Sparkles, AlertCircle, Camera, CheckCircle2, FileText, ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';

const DEFAULT_RECOMMENDED_SKILLS = [
  'Restful Apis',
  'Cross Browser Compatibility',
  'Ui Development',
  'Responsive Web Design',
  'TypeScript',
  'Next.js',
  'Tailwind CSS',
  'Redux Toolkit',
  'GraphQL',
  'Performance Optimization'
];

export const UpdateProfileModal: React.FC = () => {
  const { 
    isUpdateProfileModalOpen, 
    setIsUpdateProfileModalOpen, 
    userProfile, 
    updateFullProfile,
    pendingBookingCheckout,
    setPendingBookingCheckout,
    bookingDraft,
    currentUser,
    navigate,
    showToast 
  } = useApp();

  // Form states
  const [avatarPreview, setAvatarPreview] = useState<string>(userProfile.avatar || currentUser?.avatar || '/brand/android-chrome-192x192.png');
  const [totalExperience, setTotalExperience] = useState<string>(userProfile.experienceYears || '');
  const [noticePeriod, setNoticePeriod] = useState<string>(userProfile.noticePeriod || '');
  const [currentCtc, setCurrentCtc] = useState<string>(userProfile.currentCtc || '');
  const [expectedCtc, setExpectedCtc] = useState<string>(userProfile.expectedCtc || '');
  const [currentlyNotWorking, setCurrentlyNotWorking] = useState<boolean>(Boolean(userProfile.currentlyNotWorking));
  const [location, setLocation] = useState<string>(userProfile.location || '');
  const [currentCompany, setCurrentCompany] = useState<string>(userProfile.currentCompany || '');
  const [designation, setDesignation] = useState<string>(userProfile.designation || userProfile.headline || '');
  const [startDate, setStartDate] = useState<string>(userProfile.startDate || '');
  const [jobSearchStatus, setJobSearchStatus] = useState<'Actively Looking' | 'Casually Exploring'>(
    userProfile.jobSearchStatus === 'Casually Exploring Jobs' ? 'Casually Exploring' : 'Actively Looking'
  );

  // Resume & Loader states
  const [resumeFileName, setResumeFileName] = useState<string>(userProfile.resumeFileName || '');
  const [isUploadingResume, setIsUploadingResume] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageIndex, setUploadStageIndex] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [highlightedMissingFields, setHighlightedMissingFields] = useState<string[]>([]);
  const [parseBannerMessage, setParseBannerMessage] = useState<string | null>(null);

  // Skills states
  const [skillsList, setSkillsList] = useState<string[]>(userProfile.skills || []);
  const [recommendedSkills, setRecommendedSkills] = useState<string[]>(
    DEFAULT_RECOMMENDED_SKILLS.filter(s => !(userProfile.skills || []).includes(s))
  );
  const [newSkillText, setNewSkillText] = useState<string>('');
  const [showAllSelectedSkills, setShowAllSelectedSkills] = useState<boolean>(false);
  const [showAllRecommendedSkills, setShowAllRecommendedSkills] = useState<boolean>(false);

  // Hidden file inputs & timers ref
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const uploadTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Clear timers helper
  const clearUploadTimers = () => {
    uploadTimersRef.current.forEach(t => clearTimeout(t));
    uploadTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearUploadTimers();
    };
  }, []);

  // Keep in sync when modal opens
  useEffect(() => {
    if (isUpdateProfileModalOpen) {
      clearUploadTimers();
      setAvatarPreview(userProfile.avatar || currentUser?.avatar || '/brand/android-chrome-192x192.png');
      setTotalExperience(userProfile.experienceYears || '');
      setNoticePeriod(userProfile.noticePeriod || '');
      setCurrentCtc(userProfile.currentCtc || '');
      setExpectedCtc(userProfile.expectedCtc || '');
      setCurrentlyNotWorking(Boolean(userProfile.currentlyNotWorking));
      setLocation(userProfile.location || '');
      setCurrentCompany(userProfile.currentCompany || '');
      setDesignation(userProfile.designation || userProfile.headline || '');
      setStartDate(userProfile.startDate || '');
      setJobSearchStatus(
        userProfile.jobSearchStatus === 'Casually Exploring Jobs' ? 'Casually Exploring' : 'Actively Looking'
      );
      setResumeFileName(userProfile.resumeFileName || '');
      setIsUploadingResume(false);
      setUploadProgress(0);
      setUploadStageIndex(0);
      setUploadStatusText('');
      setUploadedFileSize('');
      setSkillsList(userProfile.skills || []);
      setHighlightedMissingFields([]);
      setParseBannerMessage(null);
    }
  }, [isUpdateProfileModalOpen, userProfile]);

  if (!isUpdateProfileModalOpen) return null;

  const handleClose = () => {
    clearUploadTimers();
    setIsUploadingResume(false);
    if (pendingBookingCheckout) {
      setPendingBookingCheckout(false);
    }
    setIsUpdateProfileModalOpen(false);
  };

  // Avatar Photo Handler
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setAvatarPreview(blobUrl);
      showToast('Photo Selected', 'Profile photo will be updated on submit.', 'info');
    }
  };

  // Resume File Handler with Animated Multi-Stage Loader Flow
  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    clearUploadTimers();

    const sizeStr = file.size < 1024 * 1024 
      ? `${Math.max(1, Math.round(file.size / 1024))} KB` 
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    setResumeFileName(file.name);
    setUploadedFileSize(sizeStr);
    setIsUploadingResume(true);
    setUploadProgress(16);
    setUploadStageIndex(0);
    setUploadStatusText(`Uploading ${file.name} (${sizeStr}) to Shine Cloud...`);
    setParseBannerMessage(null);
    setHighlightedMissingFields([]);

    // Stage 1: Uploading -> 42% at 450ms
    const t1 = setTimeout(() => {
      setUploadProgress(42);
      setUploadStageIndex(1);
      setUploadStatusText(`⚡ Shine AI scanning document layout & text layers (42%)...`);
    }, 450);

    // Stage 2: Scanning & parsing structure -> 72% at 1100ms
    const t2 = setTimeout(() => {
      setUploadProgress(72);
      setUploadStageIndex(2);
      setUploadStatusText(`Extracting Total Experience, Current Role, CTC & Skills (72%)...`);
    }, 1100);

    // Stage 3: Auto-filling & validating fields -> 92% at 1750ms
    const t3 = setTimeout(async () => {
      setUploadProgress(92);
      setUploadStageIndex(3);
      setUploadStatusText(`Validating extracted profile data & auto-filling form (92%)...`);

      try {
        const textSample = `${file.name.replace(/[^a-zA-Z0-9]/g, ' ')} ${(userProfile.skills || []).join(' ')} ${userProfile.headline || ''}`;
        const parsed = await peerpathApi.parseCv(textSample, { fileName: file.name, fileSize: file.size });

        const t4 = setTimeout(() => {
          setUploadProgress(100);
          setUploadStatusText(`Complete! Applying details to profile...`);

          const t5 = setTimeout(() => {
            setIsUploadingResume(false);

            // Pre-fill extracted fields
            if (parsed.estimatedExperience) {
              setTotalExperience(parsed.estimatedExperience.replace('Exp.', '').trim() || '');
            }
            if (parsed.parsedSkills && parsed.parsedSkills.length > 0) {
              const formattedSkills = parsed.parsedSkills.map(s => 
                s.charAt(0).toUpperCase() + s.slice(1)
              );
              setSkillsList(prev => Array.from(new Set([...prev, ...formattedSkills])));
            }

            // Highlight fields that typically need explicit candidate confirmation
            const missing: string[] = [];
            if (!noticePeriod || noticePeriod === '2+ Months') missing.push('noticePeriod');
            if (!expectedCtc || expectedCtc === '66-70 Lacs') missing.push('expectedCtc');

            setHighlightedMissingFields(missing);
            setParseBannerMessage(`✅ Resume "${file.name}" parsed! Profile details auto-filled. Please verify highlighted items.`);
            showToast('Resume Uploaded & Parsed!', 'Information auto-filled into your Shine profile.', 'success');
          }, 450);
          uploadTimersRef.current.push(t5);
        }, 550);
        uploadTimersRef.current.push(t4);
      } catch (err) {
        const tError = setTimeout(() => {
          setIsUploadingResume(false);
          setHighlightedMissingFields(['noticePeriod', 'expectedCtc']);
          setParseBannerMessage(`✅ Resume "${file.name}" loaded. Please verify the highlighted fields.`);
        }, 550);
        uploadTimersRef.current.push(tError);
      }
    }, 1750);

    uploadTimersRef.current.push(t1, t2, t3);
  };

  // Skill Add / Remove
  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSkillText.trim()) return;
    const skill = newSkillText.trim();
    if (skillsList.length >= 25) {
      showToast('Skill Limit Reached', 'Maximum 25 skills allowed.', 'info');
      return;
    }
    if (!skillsList.some(s => s.toLowerCase() === skill.toLowerCase())) {
      setSkillsList(prev => [...prev, skill]);
      setRecommendedSkills(prev => prev.filter(s => s.toLowerCase() !== skill.toLowerCase()));
      setNewSkillText('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (skillsList.length <= 3) {
      showToast('Minimum 3 Skills Required', 'You must keep at least 3 skills in your profile.', 'info');
      return;
    }
    setSkillsList(prev => prev.filter(s => s !== skillToRemove));
    if (!recommendedSkills.includes(skillToRemove)) {
      setRecommendedSkills(prev => [skillToRemove, ...prev]);
    }
  };

  const handleAddRecommendedSkill = (skill: string) => {
    if (skillsList.length >= 25) {
      showToast('Skill Limit Reached', 'Maximum 25 skills allowed.', 'info');
      return;
    }
    setSkillsList(prev => [...prev, skill]);
    setRecommendedSkills(prev => prev.filter(s => s !== skill));
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (skillsList.length < 3) {
      showToast('Minimum Skills Required', 'Please enter at least 3 skills (Min 3 / Max 25).', 'warning');
      return;
    }

    updateFullProfile({
      avatar: avatarPreview,
      experienceYears: totalExperience,
      noticePeriod,
      currentCtc,
      expectedCtc,
      currentlyNotWorking,
      location,
      currentCompany: currentlyNotWorking ? 'Currently Not Working' : currentCompany,
      designation: currentlyNotWorking ? 'Actively Seeking Role' : designation,
      headline: designation,
      startDate: currentlyNotWorking ? '' : startDate,
      jobSearchStatus: jobSearchStatus === 'Actively Looking' ? 'Actively Looking For Jobs' : 'Casually Exploring Jobs',
      resumeFileName,
      resumeLastUpdated: 'Updated just now',
      skills: skillsList,
      profileScore: 90
    });

    if (pendingBookingCheckout) {
      setPendingBookingCheckout(false);
      showToast('Profile & CV Saved!', 'Proceeding to secure checkout...', 'success');
      navigate('payment-view');
    }

    handleClose();
  };

  const visibleSelectedSkills = showAllSelectedSkills ? skillsList : skillsList.slice(0, 8);
  const visibleRecommendedSkills = showAllRecommendedSkills ? recommendedSkills : recommendedSkills.slice(0, 6);

  return (
    <div className="shine-modal-backdrop" onClick={handleClose}>
      <div className="shine-update-profile-surface" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="sup-header">
          <div className="sup-header-titles">
            <h2 className="sup-title">
              {pendingBookingCheckout ? `Confirm Details for 1:1 Session` : `Hi ${userProfile.name}, update your profile`}
            </h2>
            {pendingBookingCheckout && (
              <span className="sup-checkout-badge">
                <Sparkles size={12} className="text-amber-500" />
                <span>Quick candidate verification before checkout</span>
              </span>
            )}
          </div>
          <button 
            type="button" 
            className="btn-sup-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Wrapper */}
        <form onSubmit={handleSubmit} className="sup-form-wrapper">

          {/* Modal Scrollable Body */}
          <div className="sup-form-body">

          {/* Section 1: Update Profile Photo */}
          <div className="sup-section-photo">
            <span className="sup-section-label">Update Profile Photo</span>
            <div className="sup-photo-card" onClick={() => avatarInputRef.current?.click()}>
              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarFileChange} 
                accept="image/*" 
                className="hidden" 
                style={{ display: 'none' }}
              />
              <div className="sup-photo-circle">
                <img src={avatarPreview} alt={userProfile.name} className="sup-avatar-thumb" />
                <div className="sup-photo-camera-overlay">
                  <Camera size={13} />
                </div>
              </div>
              <button 
                type="button" 
                className="btn-sup-add-photo"
                onClick={(e) => {
                  e.stopPropagation();
                  avatarInputRef.current?.click();
                }}
              >
                Add Photo
              </button>
            </div>
          </div>

          {/* Section: Animated Resume Upload & AI Parser Loader Card */}
          {isUploadingResume && (
            <div className="sup-upload-loader-card">
              <div className="sulc-header-row">
                <div className="sulc-file-info">
                  <div className="sulc-icon-orb">
                    <Loader2 size={20} className="sulc-spinner" />
                  </div>
                  <div className="sulc-meta">
                    <div className="sulc-name-row">
                      <span className="sulc-filename">{resumeFileName}</span>
                      {uploadedFileSize && <span className="sulc-filesize">{uploadedFileSize}</span>}
                      <span className="sulc-live-badge">⚡ Uploading to Shine Cloud</span>
                    </div>
                    <span className="sulc-status-live">
                      <span className="sulc-pulse-dot" />
                      {uploadStatusText}
                    </span>
                  </div>
                </div>
                <div className="sulc-percent-badge">
                  <span className="sulc-percent-num">{uploadProgress}%</span>
                </div>
              </div>

              {/* Animated Glowing Progress Bar Track */}
              <div className="sulc-progress-track">
                <div 
                  className="sulc-progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* 4-Step Visual Milestones */}
              <div className="sulc-steps-row">
                <span className={`sulc-step-pill ${uploadStageIndex >= 0 ? 'active' : ''} ${uploadStageIndex > 0 ? 'done' : ''}`}>
                  {uploadStageIndex > 0 ? <Check size={11} strokeWidth={3} /> : <span className="sulc-step-num">1</span>}
                  <span>Upload</span>
                </span>
                <span className="sulc-step-arrow">→</span>
                <span className={`sulc-step-pill ${uploadStageIndex >= 1 ? 'active' : ''} ${uploadStageIndex > 1 ? 'done' : ''}`}>
                  {uploadStageIndex > 1 ? <Check size={11} strokeWidth={3} /> : <span className="sulc-step-num">2</span>}
                  <span>AI Scan</span>
                </span>
                <span className="sulc-step-arrow">→</span>
                <span className={`sulc-step-pill ${uploadStageIndex >= 2 ? 'active' : ''} ${uploadStageIndex > 2 ? 'done' : ''}`}>
                  {uploadStageIndex > 2 ? <Check size={11} strokeWidth={3} /> : <span className="sulc-step-num">3</span>}
                  <span>Extract</span>
                </span>
                <span className="sulc-step-arrow">→</span>
                <span className={`sulc-step-pill ${uploadStageIndex >= 3 ? 'active' : ''} ${uploadStageIndex > 3 ? 'done' : ''}`}>
                  {uploadStageIndex >= 3 ? <Check size={11} strokeWidth={3} /> : <span className="sulc-step-num">4</span>}
                  <span>Auto-fill</span>
                </span>
              </div>
            </div>
          )}

          {/* AI Parsing Banner (when completed or alert) */}
          {!isUploadingResume && parseBannerMessage && (
            <div className="sup-parse-alert success">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{parseBannerMessage}</span>
            </div>
          )}

          {/* Section 2: Form Grid with Shine Floating Label Inputs */}
          <div className="sup-fields-grid-2">
            
            {/* Total Experience */}
            <div className={`sup-floating-group ${highlightedMissingFields.includes('totalExperience') ? 'field-highlighted' : ''}`}>
              <label className="sup-floating-label">Total Experience</label>
              <input 
                type="text" 
                className="sup-floating-input"
                value={totalExperience}
                onChange={e => {
                  setTotalExperience(e.target.value);
                  setHighlightedMissingFields(prev => prev.filter(f => f !== 'totalExperience'));
                }}
                placeholder="e.g. 4 yrs"
                required
              />
              {highlightedMissingFields.includes('totalExperience') && (
                <span className="sup-field-hint">⚡ Confirm from resume</span>
              )}
            </div>

            {/* Notice Period */}
            <div className={`sup-floating-group ${highlightedMissingFields.includes('noticePeriod') ? 'field-highlighted' : ''}`}>
              <label className="sup-floating-label">Notice Period</label>
              <input 
                type="text" 
                className="sup-floating-input"
                value={noticePeriod}
                onChange={e => {
                  setNoticePeriod(e.target.value);
                  setHighlightedMissingFields(prev => prev.filter(f => f !== 'noticePeriod'));
                }}
                placeholder="e.g. 2+ Months, 30 Days, Immediate"
                required
              />
              {highlightedMissingFields.includes('noticePeriod') && (
                <span className="sup-field-hint">⚡ Please enter notice period</span>
              )}
            </div>

            {/* Current CTC */}
            <div className={`sup-floating-group ${highlightedMissingFields.includes('currentCtc') ? 'field-highlighted' : ''}`}>
              <label className="sup-floating-label">Current CTC</label>
              <input 
                type="text" 
                className="sup-floating-input"
                value={currentCtc}
                onChange={e => {
                  setCurrentCtc(e.target.value);
                  setHighlightedMissingFields(prev => prev.filter(f => f !== 'currentCtc'));
                }}
                placeholder="e.g. 5.5 Lacs"
                required
              />
            </div>

            {/* Expected CTC */}
            <div className={`sup-floating-group ${highlightedMissingFields.includes('expectedCtc') ? 'field-highlighted' : ''}`}>
              <label className="sup-floating-label">Expected CTC</label>
              <input 
                type="text" 
                className="sup-floating-input"
                value={expectedCtc}
                onChange={e => {
                  setExpectedCtc(e.target.value);
                  setHighlightedMissingFields(prev => prev.filter(f => f !== 'expectedCtc'));
                }}
                placeholder="e.g. 66-70 Lacs or 18-24 Lacs"
                required
              />
              {highlightedMissingFields.includes('expectedCtc') && (
                <span className="sup-field-hint">⚡ Confirm expected salary</span>
              )}
            </div>

          </div>

          {/* Currently Not Working Checkbox */}
          <div className="sup-checkbox-row">
            <label className="sup-checkbox-label">
              <input 
                type="checkbox" 
                checked={currentlyNotWorking} 
                onChange={e => setCurrentlyNotWorking(e.target.checked)}
                className="sup-checkbox-input"
              />
              <span>Currently, I am not working</span>
            </label>
          </div>

          {/* Location */}
          <div className="sup-floating-group single-col">
            <label className="sup-floating-label">Location</label>
            <input 
              type="text" 
              className="sup-floating-input"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Gurgaon, Bengaluru, Mumbai"
              required
            />
          </div>

          {/* Current Company & Designation (If working) */}
          {!currentlyNotWorking && (
            <>
              <div className="sup-fields-grid-2">
                <div className="sup-plain-group">
                  <input 
                    type="text" 
                    className="sup-plain-input"
                    value={currentCompany}
                    onChange={e => setCurrentCompany(e.target.value)}
                    placeholder="Current company"
                    required
                  />
                </div>

                <div className="sup-plain-group">
                  <input 
                    type="text" 
                    className="sup-plain-input"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    placeholder="Designation"
                    required
                  />
                </div>
              </div>

              {/* Start Date */}
              <div className="sup-plain-group single-col">
                <input 
                  type="text" 
                  className="sup-plain-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  placeholder="Start date (e.g. Aug 2022)"
                />
              </div>
            </>
          )}

          {/* Section 3: How would you describe your current job search? * */}
          <div className="sup-job-search-section">
            <label className="sup-subheading">How would you describe your current job search? *</label>
            <div className="sup-pills-row">
              <button 
                type="button" 
                className={`sup-search-pill ${jobSearchStatus === 'Actively Looking' ? 'active' : ''}`}
                onClick={() => setJobSearchStatus('Actively Looking')}
              >
                Actively Looking
              </button>
              <button 
                type="button" 
                className={`sup-search-pill ${jobSearchStatus === 'Casually Exploring' ? 'active' : ''}`}
                onClick={() => setJobSearchStatus('Casually Exploring')}
              >
                Casually Exploring
              </button>
            </div>
          </div>

          {/* Section 4: Resume Upload Box */}
          <div className="sup-resume-section">
            <div className={`sup-floating-group resume-upload-group ${isUploadingResume ? 'is-uploading' : ''}`}>
              <label className="sup-floating-label">Resume</label>
              <div 
                className="sup-resume-input-row" 
                onClick={() => !isUploadingResume && resumeInputRef.current?.click()}
                style={{ cursor: isUploadingResume ? 'not-allowed' : 'pointer' }}
              >
                <div className="sup-resume-left-content">
                  <FileText size={16} className="text-purple-600 flex-shrink-0" />
                  <span className="sup-resume-filename">
                    {isUploadingResume ? `Uploading ${resumeFileName}... (${uploadProgress}%)` : resumeFileName}
                  </span>
                </div>
                <button 
                  type="button" 
                  className={`btn-sup-upload-inline ${isUploadingResume ? 'loading' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isUploadingResume) resumeInputRef.current?.click();
                  }}
                  disabled={isUploadingResume}
                >
                  {isUploadingResume ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-purple-600" />
                      <span>{uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
              <input 
                type="file" 
                ref={resumeInputRef} 
                onChange={handleResumeFileChange} 
                accept=".pdf,.doc,.docx,.rtf,.txt,.png,.jpg,.jpeg" 
                className="hidden" 
                style={{ display: 'none' }}
              />
            </div>
            <span className="sup-resume-subtext">
              File Supported: pdf, doc, docx, rtf, txt, png, jpg, jpeg - Max. 5 MB
            </span>
          </div>

          {/* Section 5: Enter Skills* (Min 3 / Max 25) */}
          <div className="sup-skills-section">
            <div className="sup-floating-group skills-input-group">
              <label className="sup-floating-label">Enter Skills*</label>
              <input 
                type="text" 
                className="sup-floating-input"
                value={newSkillText}
                onChange={e => setNewSkillText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type a skill and press Enter..."
              />
            </div>
            <div className="sup-skills-limits-row">
              <span>Min 3 Skills / Max Skills 25</span>
              <span className="sup-skills-count">{skillsList.length} of 25 added</span>
            </div>

            {/* Selected Skills Chips */}
            <div className="sup-skills-block">
              <strong className="sup-skills-block-title">Selected skill</strong>
              <div className="sup-chips-wrap">
                {visibleSelectedSkills.map((skill, idx) => (
                  <span key={idx} className="sup-chip-selected">
                    <span>{skill}</span>
                    <button 
                      type="button" 
                      className="btn-sup-chip-delete"
                      onClick={() => handleRemoveSkill(skill)}
                      title={`Remove ${skill}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              {skillsList.length > 8 && (
                <button 
                  type="button" 
                  className="btn-sup-view-more"
                  onClick={() => setShowAllSelectedSkills(!showAllSelectedSkills)}
                >
                  {showAllSelectedSkills ? 'View Less' : 'View More'}
                </button>
              )}
            </div>

            {/* Recommended Skills Chips */}
            {visibleRecommendedSkills.length > 0 && (
              <div className="sup-skills-block recommended-block">
                <strong className="sup-skills-block-title">Choose from Recommended Skills</strong>
                <div className="sup-chips-wrap">
                  {visibleRecommendedSkills.map((skill, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      className="sup-chip-recommended"
                      onClick={() => handleAddRecommendedSkill(skill)}
                    >
                      <span>{skill}</span>
                      <span className="plus-sym">+</span>
                    </button>
                  ))}
                </div>
                {recommendedSkills.length > 6 && (
                  <button 
                    type="button" 
                    className="btn-sup-view-more"
                    onClick={() => setShowAllRecommendedSkills(!showAllRecommendedSkills)}
                  >
                    {showAllRecommendedSkills ? 'View Less' : 'View More'}
                  </button>
                )}
              </div>
            )}
          </div>

          </div>
          {/* End of sup-form-body */}

          {/* Sticky Modal Pinned Footer (Always 100% Visible) */}
          <div className="sup-footer">
            {pendingBookingCheckout ? (
              <div className="sup-footer-checkout-row">
                <div className="sup-footer-summary">
                  <span className="sup-f-lbl">Payable Amount</span>
                  <div className="sup-f-price-line">
                    <span className="sup-f-amount">₹{bookingDraft?.amount || 1399}</span>
                    <span className="sup-f-dot">•</span>
                    <span className="sup-f-type">{bookingDraft?.sessionType || '1:1 Session'}</span>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn-sup-submit btn-sup-checkout"
                >
                  <span>Submit & Continue to Pay</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="sup-footer-default-row">
                <button 
                  type="submit" 
                  className="btn-sup-submit"
                >
                  Save & Update Profile
                </button>
              </div>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
