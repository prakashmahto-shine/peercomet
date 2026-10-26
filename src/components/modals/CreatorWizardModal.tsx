import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle2, ArrowRight, Video, Upload, 
  Sparkles, ShieldCheck, User, Building2, Briefcase, 
  Mail, Layers, Compass, Edit3, Star, ArrowLeft,
  Calendar, Clock, Banknote, Check, Eye, AlertCircle,
  Play, Trash2, Plus, Film
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';

export const CreatorWizardModal: React.FC = () => {
  const { 
    isCreatorWizardOpen, 
    setIsCreatorWizardOpen, 
    addExpert, 
    navigate, 
    userProfile,
    currentUser,
    resumeExtract,
    showToast,
    updateUserProfile,
    setIsCreatorMode
  } = useApp();

  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Helper resolvers to auto-populate from resume parsing, profile, and user account
  const resolveCompany = (): string => {
    const raw = (
      userProfile?.currentCompany ||
      resumeExtract?.extracted?.currentCompany ||
      currentUser?.company ||
      userProfile?.pastCompany ||
      ''
    ).trim();
    if (raw) return raw;

    // Fallback: extract company from headline (e.g. "Senior SDE @ Swiggy" or "Engineer at Google")
    const hl = currentUser?.headline || userProfile?.headline || '';
    const match = hl.match(/(?:@|at|with)\s+([A-Za-z0-9&.\- ]+)/i);
    if (match && match[1]) {
      const extracted = match[1].split(/[•|\-,]/)[0].trim();
      if (extracted && extracted.length >= 2) return extracted;
    }
    return '';
  };

  const resolveHeadline = (): string => {
    if (currentUser?.headline?.trim()) return currentUser.headline.trim();
    if (userProfile?.headline?.trim()) return userProfile.headline.trim();
    const desig = (resumeExtract?.extracted?.currentDesignation || userProfile?.designation || '').trim();
    const comp = resolveCompany();
    if (desig && comp) return `${desig} @ ${comp}`;
    if (desig) return desig;
    return '';
  };

  const resolveName = (): string => {
    if (currentUser?.name?.trim()) return currentUser.name.trim();
    if (userProfile?.name?.trim()) return userProfile.name.trim();
    const first = (userProfile?.firstName || resumeExtract?.extracted?.firstName || '').trim();
    const last = (userProfile?.lastName || resumeExtract?.extracted?.lastName || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    return '';
  };

  const resolveSkills = (): string[] => {
    if (userProfile?.skills && userProfile.skills.length > 0) {
      return userProfile.skills.slice(0, 6);
    }
    if (resumeExtract?.extracted?.skills && resumeExtract.extracted.skills.length > 0) {
      return resumeExtract.extracted.skills.slice(0, 6);
    }
    return [];
  };

  const resolveBio = (): string => {
    return (userProfile?.summary || resumeExtract?.extracted?.summary || '').trim();
  };

  // 2-step streamlined onboarding (Profile -> Pricing & Schedule)
  const [step, setStep] = useState<number>(1);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Step 1: Expert Profile State (Pre-filled from existing profile / parsed resume)
  const [fullName, setFullName] = useState<string>(() => resolveName());
  const [headline, setHeadline] = useState<string>(() => resolveHeadline());
  const [company, setCompany] = useState<string>(() => resolveCompany());
  const [workEmail, setWorkEmail] = useState<string>(''); // Explicitly optional (Employer Badge)
  const [domain, setDomain] = useState<string>('Full-Stack');
  const [customDomain, setCustomDomain] = useState<string>('');
  const [bio, setBio] = useState<string>(() => resolveBio());
  const [selectedSkills, setSelectedSkills] = useState<string[]>(() => resolveSkills());
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  // Step 2: Session Pricing, Categories, Customizable Duration & Availability
  const initialCategoryOfferings = [
    {
      id: 'career-guidance',
      name: '1:1 Career Transition Call',
      category: '1:1 Career Transition Call',
      shortName: 'Career Guidance',
      iconEmoji: '🗺️',
      shortDesc: 'Transition roadmap, skill gap analysis, and referral strategies for target roles.',
      standardDuration: 45,
      duration: 45,
      price: userProfile?.mentorRate || 999,
      recommendedPrice: 999,
      presetRates: [499, 999, 1499, 2499],
      isEnabled: true
    },
    {
      id: 'resume-review',
      name: 'Resume Review & ATS Teardown',
      category: 'Quick 30-min Resume Audit',
      shortName: 'Resume Audit',
      iconEmoji: '📄',
      shortDesc: 'Line-by-line ATS resume review, formatting audit, and high-impact bullet point rewrites.',
      standardDuration: 30,
      duration: 30,
      price: 499,
      recommendedPrice: 499,
      presetRates: [299, 499, 799, 999],
      isEnabled: true
    },
    {
      id: 'interview-prep',
      name: '1:1 Mock Interview & Evaluation',
      category: '1:1 Mock Interview & Evaluation',
      shortName: 'Mock Interview',
      iconEmoji: '💻',
      shortDesc: 'Live technical or system design simulation with instant rubric scorecard & critique.',
      standardDuration: 60,
      duration: 60,
      price: 1499,
      recommendedPrice: 1499,
      presetRates: [999, 1499, 1999, 2999],
      isEnabled: true
    },
    {
      id: 'salary-negotiation',
      name: 'Salary Negotiation & Offer Coaching',
      category: 'Salary Negotiation & Exec Coaching',
      shortName: 'Salary Negotiation',
      iconEmoji: '💰',
      shortDesc: 'Offer letter benchmarking, counter-offer strategy, ESOP evaluation, and comp review.',
      standardDuration: 30,
      duration: 30,
      price: 799,
      recommendedPrice: 799,
      presetRates: [499, 799, 1199, 1799],
      isEnabled: true
    }
  ];

  const [categoryOfferings, setCategoryOfferings] = useState(initialCategoryOfferings);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('career-guidance');
  const activeService = categoryOfferings.find(c => c.id === activeCategoryId) || categoryOfferings[0];

  const [sessionPrice, setSessionPrice] = useState<number>(userProfile?.mentorRate || 999);
  const [sessionDuration, setSessionDuration] = useState<number>(45);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Wed', 'Sat', 'Sun']);

  const standardAvailableSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:30 AM - 12:30 PM',
    '02:00 PM - 03:00 PM',
    '04:30 PM - 05:30 PM',
    '06:30 PM - 07:30 PM',
    '08:00 PM - 09:00 PM',
    '09:00 PM - 10:00 PM'
  ];

  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([
    '06:30 PM - 07:30 PM', 
    '08:00 PM - 09:00 PM'
  ]);
  const [allDisplaySlots, setAllDisplaySlots] = useState<string[]>(standardAvailableSlots);
  const [customSlotInput, setCustomSlotInput] = useState<string>('');

  const handleSelectCategoryTab = (catId: string) => {
    setActiveCategoryId(catId);
    const cat = categoryOfferings.find(c => c.id === catId);
    if (cat) {
      setSessionPrice(cat.price);
      setSessionDuration(cat.duration);
    }
  };

  const handleUpdateCategoryPrice = (catId: string, newPrice: number) => {
    setCategoryOfferings(prev => prev.map(c => c.id === catId ? { ...c, price: newPrice } : c));
    if (catId === activeCategoryId) {
      setSessionPrice(newPrice);
    }
    if (errors.sessionPrice) setErrors(e => ({ ...e, sessionPrice: '' }));
  };

  const handleUpdateCategoryDuration = (catId: string, newDuration: number) => {
    setCategoryOfferings(prev => prev.map(c => c.id === catId ? { ...c, duration: newDuration } : c));
    if (catId === activeCategoryId) {
      setSessionDuration(newDuration);
    }
  };

  const handleToggleCategory = (catId: string) => {
    setCategoryOfferings(prev => {
      const activeCount = prev.filter(c => c.isEnabled).length;
      return prev.map(c => {
        if (c.id !== catId) return c;
        if (c.isEnabled && activeCount <= 1) {
          showToast('At Least 1 Category Required', 'You must offer at least one mentorship service category.', 'warning');
          return c;
        }
        return { ...c, isEnabled: !c.isEnabled };
      });
    });
  };

  // Teaser Video State (Upload, URL, or Sample)
  const [hasTeaserVideo, setHasTeaserVideo] = useState<boolean>(false);
  const [teaserVideoUrl, setTeaserVideoUrl] = useState<string>('');
  const [teaserVideoTitle, setTeaserVideoTitle] = useState<string>('');
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');

  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const videoPresets = [
    {
      name: 'Tech & Leadership Pitch',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4',
      title: 'How I Help Engineers Transition to Staff+ Roles & High-Scale Systems'
    },
    {
      name: 'System Design Teardown',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41808-large.mp4',
      title: 'System Design & High-Concurrency Live Teardown Masterclass (60s Overview)'
    },
    {
      name: 'Career & Salary Multiplier',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-giving-a-speech-at-an-event-42354-large.mp4',
      title: 'Breaking the Career Ceiling: Step-by-Step Salary & Promotion Multiplier'
    }
  ];

  const quickTimePresets = [
    '09:00 AM - 10:00 AM',
    '11:00 AM - 12:00 PM',
    '02:00 PM - 03:00 PM',
    '04:30 PM - 05:30 PM',
    '06:00 PM - 07:00 PM',
    '07:00 PM - 08:00 PM',
    '08:30 PM - 09:30 PM',
    '09:30 PM - 10:30 PM'
  ];

  // Auto-sync initial data on open or when profile/resume updates
  useEffect(() => {
    if (isCreatorWizardOpen) {
      setStep(1);
      setErrors({});
      setFullName(resolveName());
      setHeadline(resolveHeadline());
      setCompany(resolveCompany());
      setBio(resolveBio());
      setSelectedSkills(resolveSkills());
      setCustomDomain('');
      setCustomSlotInput('');
    }
  }, [isCreatorWizardOpen, currentUser, userProfile, resumeExtract]);

  // Auto-resize bio textarea dynamically so content never needs an inner scrollbar
  useEffect(() => {
    if (bioTextareaRef.current) {
      bioTextareaRef.current.style.height = 'auto';
      bioTextareaRef.current.style.height = `${Math.max(80, bioTextareaRef.current.scrollHeight)}px`;
    }
  }, [bio, step, isCreatorWizardOpen]);

  if (!isCreatorWizardOpen) return null;

  const handleToggleDay = (day: string) => {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      if (next.length > 0 && errors.selectedDays) {
        setErrors(err => ({ ...err, selectedDays: '' }));
      }
      return next;
    });
  };

  const toggleSlot = (slotStr: string) => {
    setSelectedTimeSlots(prev => {
      const updated = prev.includes(slotStr) ? prev.filter(s => s !== slotStr) : [...prev, slotStr];
      if (updated.length > 0 && errors.selectedTimeSlots) {
        setErrors(e => ({ ...e, selectedTimeSlots: '' }));
      }
      return updated;
    });
  };

  const handleAddCustomSlot = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customSlotInput.trim();
    if (!val) return;
    if (!allDisplaySlots.includes(val)) {
      setAllDisplaySlots(prev => [...prev, val]);
    }
    if (!selectedTimeSlots.includes(val)) {
      setSelectedTimeSlots(prev => [...prev, val]);
      if (errors.selectedTimeSlots) setErrors(prev => ({ ...prev, selectedTimeSlots: '' }));
      showToast('Time Slot Added', `Added "${val}" to your active booking slots.`, 'success');
    }
    setCustomSlotInput('');
  };

  const handleRemoveCustomSlot = (slotStr: string) => {
    setAllDisplaySlots(prev => prev.filter(s => s !== slotStr));
    setSelectedTimeSlots(prev => prev.filter(s => s !== slotStr));
  };

  const handleTriggerVideoUpload = () => {
    videoFileInputRef.current?.click();
  };

  const handleVideoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setTeaserVideoUrl(blobUrl);
      setUploadedVideoName(file.name);
      setTeaserVideoTitle(`60s Intro: 1:1 Mentorship with ${fullName.trim() || 'Mentor'}`);
      setHasTeaserVideo(true);
      showToast('🎬 Video Reel Loaded', `Loaded "${file.name}" as your teaser pitch.`, 'success');
    }
  };

  const handleAttachVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    setTeaserVideoUrl(videoUrlInput.trim());
    setUploadedVideoName('External Video Link');
    setTeaserVideoTitle(`60s Intro: 1:1 Mentorship with ${fullName.trim() || 'Mentor'}`);
    setHasTeaserVideo(true);
    setVideoUrlInput('');
    showToast('🎬 Video Attached', 'Your intro video link has been set.', 'success');
  };

  const handleApplyPresetVideo = (preset: { name: string; url: string; title: string }) => {
    setTeaserVideoUrl(preset.url);
    setUploadedVideoName(preset.name);
    setTeaserVideoTitle(preset.title);
    setHasTeaserVideo(true);
    showToast('🎬 Sample Reel Selected', `Attached "${preset.name}".`, 'info');
  };

  const handleRemoveVideo = () => {
    setHasTeaserVideo(false);
    setTeaserVideoUrl('');
    setUploadedVideoName('');
    setTeaserVideoTitle('');
    showToast('Video Removed', 'Teaser video removed from your profile.', 'info');
  };


  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkillInput.trim()) {
      e.preventDefault();
      const val = newSkillInput.trim();
      if (!selectedSkills.includes(val)) {
        setSelectedSkills(prev => [...prev, val]);
        if (errors.skills) setErrors(prev => ({ ...prev, skills: '' }));
      }
      setNewSkillInput('');
    }
  };

  const handleQuickAddSkill = (sk: string) => {
    if (!selectedSkills.includes(sk)) {
      setSelectedSkills(prev => [...prev, sk]);
      if (errors.skills) setErrors(prev => ({ ...prev, skills: '' }));
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(prev => {
      const next = prev.filter(s => s !== skill);
      if (next.length === 0) {
        setErrors(err => ({ ...err, skills: 'Please add at least one Core Mentorship Skill.' }));
      }
      return next;
    });
  };

  const handleBioPreset = (snippet: string) => {
    if (!bio.includes(snippet)) {
      setBio(prev => `${prev.trim()} ${snippet}`.trim());
      if (errors.bio) setErrors(prev => ({ ...prev, bio: '' }));
    }
  };

  // Validation functions: Official Work Email is strictly OPTIONAL, everything else is MANDATORY
  const validateStep1 = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }
    if (!company.trim()) {
      newErrors.company = 'Current Company is required.';
    }
    if (!headline.trim()) {
      newErrors.headline = 'Professional Headline is required.';
    }
    if (!domain.trim()) {
      newErrors.domain = 'Primary Mentorship Domain is required.';
    } else if (domain === 'Other' && !customDomain.trim()) {
      newErrors.customDomain = 'Please specify your mentorship domain.';
    }
    if (!bio.trim()) {
      newErrors.bio = 'Mentorship Bio is required.';
    }
    if (selectedSkills.length === 0) {
      newErrors.skills = 'Please add at least one Core Mentorship Skill.';
    }

    // Note: Official Work Email (Employer Badge) is explicitly OPTIONAL - do not validate presence.

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const errorCount = Object.keys(newErrors).length;
      const firstErrorMessage = Object.values(newErrors)[0];
      showToast(
        'Mandatory Fields Required',
        errorCount === 1 ? firstErrorMessage : `Please fill out all mandatory fields (${errorCount} incomplete).`,
        'warning'
      );
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (sessionPrice === undefined || sessionPrice === null || Number(sessionPrice) < 0) {
      newErrors.sessionPrice = 'Please specify a valid session price (₹0 for free pro-bono, or any custom amount).';
    }
    if (!selectedDays || selectedDays.length === 0) {
      newErrors.selectedDays = 'Please select at least one weekly availability day.';
    }
    if (!selectedTimeSlots || selectedTimeSlots.length === 0) {
      newErrors.selectedTimeSlots = 'Please select or add at least one booking time slot.';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      const errorCount = Object.keys(newErrors).length;
      const firstErrorMessage = Object.values(newErrors)[0];
      showToast(
        'Mandatory Settings Required',
        errorCount === 1 ? firstErrorMessage : 'Please complete all required pricing & schedule settings.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === 2) {
      if (!validateStep1()) return;
    }
    setStep(targetStep);
  };

  const handlePublish = async () => {
    if (isPublishing) return;

    if (!validateStep1()) {
      setStep(1);
      return;
    }

    if (!validateStep2()) {
      return;
    }

    const effectiveDomain = domain === 'Other' ? (customDomain.trim() || 'General Mentorship') : domain;

    setIsPublishing(true);
    const activeOfferings = categoryOfferings.filter(c => c.isEnabled);
    const primaryOffering = categoryOfferings.find(c => c.id === 'career-guidance' && c.isEnabled) 
      || activeOfferings[0] 
      || categoryOfferings[0];

    const finalOfferings = categoryOfferings.map(c => ({
      id: c.id,
      category: c.category,
      title: c.name,
      duration: `${c.duration} Mins`,
      tag: c.shortName,
      description: c.shortDesc,
      price: c.price,
      icon: c.id === 'resume-review' ? 'file' : (c.id === 'salary-negotiation' ? 'dollar' : 'video'),
      isEnabled: c.isEnabled
    }));

    const created = await addExpert({
      name: fullName.trim() || currentUser?.name || userProfile?.name || '',
      role: headline.trim(),
      company: company.trim(),
      domain: effectiveDomain,
      experience: currentUser?.experienceYears || userProfile.experienceYears || '3+ Years',
      rating: 5.0,
      reviewsCount: 0,
      sessionsCount: 0,
      price: primaryOffering.price,
      location: 'Bengaluru / Remote',
      duration: `${primaryOffering.duration} Mins`,
      avatar: currentUser?.avatar || userProfile?.avatar || '/brand/android-chrome-192x192.png',
      videoPoster: currentUser?.avatar || userProfile?.avatar || '/brand/android-chrome-192x192.png',
      teaserTitle: teaserVideoTitle || `1:1 Mentorship with ${fullName.trim() || currentUser?.name || 'Mentor'}`,
      skills: selectedSkills,
      bio: bio.trim(),
      verifiedEmail: workEmail.trim(), // Optional employer badge email
      availability: { days: selectedDays, timeSlots: [...new Set(selectedTimeSlots)] },
      serviceOfferings: finalOfferings
    });
    setIsPublishing(false);
    if (!created) return;

    // Upgrade user profile to active mentor with category offerings
    updateUserProfile({
      isMentor: true,
      mentorRate: primaryOffering.price,
      mentorDuration: primaryOffering.duration,
      mentorOfferings: finalOfferings,
      mentorAvailability: { days: selectedDays, timeSlots: selectedTimeSlots },
      mentorRating: 5.0,
      mentorReviewsCount: 0,
      mentorSessionsCount: 0,
      mentorEarnings: 0,
      mentorTeaserVideo: hasTeaserVideo && teaserVideoUrl ? {
        url: teaserVideoUrl,
        title: teaserVideoTitle || `1:1 Mentorship with ${fullName.trim() || currentUser?.name || 'Mentor'}`,
        duration: '01:15 min',
        thumbnail: currentUser?.avatar || userProfile?.avatar || '/brand/android-chrome-192x192.png',
        uploadedAt: 'Just now'
      } : undefined
    });

    setIsCreatorMode(true);
    setIsCreatorWizardOpen(false);
    showToast('🚀 Mentor Profile Published!', `Your 1:1 mentorship profile is live on ${BRAND.name}.`, 'success');
    navigate('mentor-dashboard-view');
  };

  const stepList = [
    { num: 1, label: '1. Profile & Domain', icon: User },
    { num: 2, label: '2. Pricing & Schedule', icon: Calendar }
  ];

  const suggestedSkills = [
    'System Design', 'React & Frontend', 'Full-Stack Architecture', 
    'Microservices', 'Interview Prep', 'Career Pivot', 'Cloud & DevOps'
  ];

  return (
    <div className="app-modal-backdrop open">
      <div className="app-modal-card creator-wizard-card modern-mentor-wizard-shell">
        
        {/* Modal Top Header */}
        <div className="wizard-modal-top-bar">
          <div className="wmt-brand">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Create Your Mentor Profile
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>
                Takes ~2 minutes • Set your pricing, schedule, and mentorship focus
              </p>
            </div>
          </div>

          <button 
            type="button" 
            className="wizard-close-circle-btn" 
            onClick={() => setIsCreatorWizardOpen(false)}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-Step Modern Progress Stepper */}
        <div className="wizard-stepper-modern-wrap">
          <div className="wizard-stepper-steps-row">
            {stepList.map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              const StepIcon = s.icon;
              return (
                <button
                  key={s.num}
                  type="button"
                  className={`wizard-step-tab ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => handleStepClick(s.num)}
                >
                  <div className="wst-icon-circle">
                    {isCompleted ? <Check size={13} /> : <StepIcon size={13} />}
                  </div>
                  <span className="wst-label">{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="wizard-stepper-progress-track">
            <div 
              className="wizard-stepper-progress-fill" 
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Body Container with Smooth Scroll */}
        <div className="wizard-content-scroll-viewport">
          
          {/* =========================================================================
              STEP 1: PROFILE & DOMAIN SETUP (Simple, Fast, Clean)
             ========================================================================= */}
          {step === 1 && (
            <div className="wizard-step-pane active animate-fade-in">
              {/* Clean 2-Column Form Grid */}
              <div className="wz-form-grid-modern">
                <div className="form-group-modern">
                  <label>
                    <User size={13} /> Full Name <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                    }} 
                    placeholder="e.g. Rahul Sharma"
                    className={`form-input-modern ${errors.fullName ? 'input-field-has-error' : ''}`} 
                  />
                  {errors.fullName && (
                    <span className="form-field-error-msg">
                      <AlertCircle size={12} /> {errors.fullName}
                    </span>
                  )}
                </div>

                <div className="form-group-modern">
                  <label>
                    <Building2 size={13} /> Current Company <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={company} 
                    onChange={(e) => {
                      setCompany(e.target.value);
                      if (errors.company) setErrors(prev => ({ ...prev, company: '' }));
                    }} 
                    placeholder="e.g. Swiggy, Flipkart, Google"
                    className={`form-input-modern ${errors.company ? 'input-field-has-error' : ''}`} 
                  />
                  {errors.company && (
                    <span className="form-field-error-msg">
                      <AlertCircle size={12} /> {errors.company}
                    </span>
                  )}
                </div>

                <div className="form-group-modern full-width">
                  <label>
                    <Briefcase size={13} /> Professional Headline <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={headline} 
                    onChange={(e) => {
                      setHeadline(e.target.value);
                      if (errors.headline) setErrors(prev => ({ ...prev, headline: '' }));
                    }} 
                    className={`form-input-modern ${errors.headline ? 'input-field-has-error' : ''}`} 
                    placeholder="e.g. Staff Software Engineer @ Swiggy • Ex-Amazon • 8+ Yrs Exp"
                  />
                  {errors.headline && (
                    <span className="form-field-error-msg">
                      <AlertCircle size={12} /> {errors.headline}
                    </span>
                  )}
                </div>

                <div className="form-group-modern">
                  <label>
                    <Compass size={13} /> Primary Mentorship Domain <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                  </label>
                  <select 
                    className={`form-select-modern ${errors.domain ? 'input-field-has-error' : ''}`} 
                    value={domain} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setDomain(val);
                      if (errors.domain) setErrors(prev => ({ ...prev, domain: '' }));
                      if (val !== 'Other' && errors.customDomain) {
                        setErrors(prev => ({ ...prev, customDomain: '' }));
                      }
                    }}
                  >
                    <option value="Full-Stack">Full-Stack & Frontend Engineering</option>
                    <option value="AI/ML">AI / Machine Learning & Data Science</option>
                    <option value="Backend">Backend & Distributed Systems</option>
                    <option value="Semiconductor">Semiconductor & VLSI Design</option>
                    <option value="Cybersecurity">Cybersecurity & Cloud Security</option>
                    <option value="Product">Product Management</option>
                    <option value="Leadership">Engineering Management & Leadership</option>
                    <option value="Other">Other (Specify Custom Domain)...</option>
                  </select>
                  {errors.domain && (
                    <span className="form-field-error-msg">
                      <AlertCircle size={12} /> {errors.domain}
                    </span>
                  )}

                  {domain === 'Other' && (
                    <div style={{ marginTop: '6px' }}>
                      <input 
                        type="text" 
                        value={customDomain} 
                        onChange={(e) => {
                          setCustomDomain(e.target.value);
                          if (errors.customDomain) setErrors(prev => ({ ...prev, customDomain: '' }));
                        }} 
                        placeholder="Enter your custom domain (e.g. Data Analytics, DevOps, QA Automation)..."
                        className={`form-input-modern ${errors.customDomain ? 'input-field-has-error' : ''}`} 
                        autoFocus
                      />
                      {errors.customDomain && (
                        <span className="form-field-error-msg">
                          <AlertCircle size={12} /> {errors.customDomain}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Official Work Email - EXPLICITLY OPTIONAL */}
                <div className="form-group-modern">
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} /> Official Work Email (Employer Badge)
                    </span>
                    <span style={{ fontSize: '11px', color: workEmail.trim() ? '#10B981' : '#64748B', fontWeight: 700 }}>
                      {workEmail.trim() ? '✓ Badge Active' : 'Optional'}
                    </span>
                  </label>
                  <div className="verified-input-wrapper-modern">
                    <input 
                      type="email" 
                      value={workEmail} 
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder={company ? `e.g. yourname@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : 'e.g. rahul@swiggy.com'} 
                      className="form-input-modern" 
                    />
                    {workEmail.trim() ? (
                      <span className="input-verified-pill-modern" style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}>
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    ) : (
                      <span className="input-verified-pill-modern" style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
                        <ShieldCheck size={13} /> Work ID
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group-modern full-width">
                  <div className="bio-label-row">
                    <label>
                      <Edit3 size={13} /> Mentorship Bio & What You Help With <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span>
                    </label>
                    <div className="bio-prompt-chips">
                      <span className="bpc-title">Quick Add:</span>
                      <button 
                        type="button" 
                        className="bpc-chip"
                        onClick={() => handleBioPreset('Specialized in top product tech interview prep & CV review.')}
                      >
                        + Interview Prep
                      </button>
                      <button 
                        type="button" 
                        className="bpc-chip"
                        onClick={() => handleBioPreset('I help engineers master High-Scale System Design & Architecture.')}
                      >
                        + System Design
                      </button>
                      <button 
                        type="button" 
                        className="bpc-chip"
                        onClick={() => handleBioPreset('Career pivot and salary negotiation strategy.')}
                      >
                        + Career Jumps
                      </button>
                    </div>
                  </div>
                  <textarea 
                    ref={bioTextareaRef}
                    className={`form-textarea-modern ${errors.bio ? 'input-field-has-error' : ''}`} 
                    value={bio} 
                    onChange={(e) => {
                      setBio(e.target.value);
                      if (errors.bio) setErrors(prev => ({ ...prev, bio: '' }));
                    }} 
                    placeholder="Briefly describe what you guide mentees with (e.g. resume reviews, mock interviews, system design)..."
                    style={{ resize: 'none', overflow: 'hidden', minHeight: '80px', lineHeight: 1.55 }}
                  />
                  {errors.bio && (
                    <span className="form-field-error-msg">
                      <AlertCircle size={12} /> {errors.bio}
                    </span>
                  )}
                </div>

                <div className="form-group-modern full-width">
                  <label>
                    <Layers size={13} /> Core Mentorship Skills <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span> (Press Enter to add)
                  </label>
                  <div className={`skills-tag-editor-box-modern ${errors.skills ? 'input-field-has-error' : ''}`}>
                    <div className="tags-chips-list-modern">
                      {selectedSkills.map((sk) => (
                        <span key={sk} className="mentor-skill-tag-modern">
                          {sk}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSkill(sk)} 
                            className="tag-remove-btn"
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={handleAddSkill}
                        placeholder="Add skill + Enter..."
                        className="tag-input-field-modern"
                      />
                    </div>
                  </div>
                  {errors.skills && (
                    <span className="form-field-error-msg">
                      <AlertCircle size={12} /> {errors.skills}
                    </span>
                  )}

                  <div className="quick-skills-suggest-row">
                    <span className="qss-label">Suggestions:</span>
                    {suggestedSkills.filter(s => !selectedSkills.includes(s)).slice(0, 6).map(sk => (
                      <button
                        key={sk}
                        type="button"
                        className="qss-chip"
                        onClick={() => handleQuickAddSkill(sk)}
                      >
                        + {sk}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: PRICING, AVAILABILITY & LIVE PREVIEW
             ========================================================================= */}
          {step === 2 && (
            <div className="wizard-step-pane active animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Mentorship Service Categories & Category-Driven Pricing Card */}
              <div className="clean-section-card">
                <div className="csc-header">
                  <h4>
                    <Layers size={16} className="text-amber-500" />
                    <span>Mentorship Categories <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span></span>
                  </h4>
                  <span className="csc-badge-price-summary">
                    {categoryOfferings.filter(c => c.isEnabled).length} Categories Active
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0' }}>
                  Select a category to customize its session duration and your rate below:
                </p>

                {/* Service Category Selection Cards Grid - Show Only Category */}
                <div className="category-selection-tabs-grid">
                  {categoryOfferings.map(cat => {
                    const isActive = activeCategoryId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={`cat-tab-card ${isActive ? 'active' : ''} ${!cat.isEnabled ? 'disabled' : ''}`}
                        onClick={() => handleSelectCategoryTab(cat.id)}
                        title={cat.name}
                      >
                        <div className="ctc-top">
                          <span className="ctc-emoji">{cat.iconEmoji}</span>
                          <label 
                            className="ctc-checkbox-label"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCategory(cat.id);
                            }}
                            title={cat.isEnabled ? 'Service enabled' : 'Service paused'}
                          >
                            <input 
                              type="checkbox" 
                              checked={cat.isEnabled} 
                              onChange={() => {}} 
                              className="ctc-checkbox"
                            />
                            <span className="ctc-status-txt">{cat.isEnabled ? 'Active' : 'Off'}</span>
                          </label>
                        </div>
                        <div className="ctc-body">
                          <span className="ctc-title">{cat.shortName}</span>
                        </div>
                        {isActive && <div className="ctc-active-border" />}
                      </div>
                    );
                  })}
                </div>

                {/* Active Category Configuration Grid */}
                <div className="active-cat-config-box">
                  <div className="accb-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{activeService.iconEmoji}</span>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                          {activeService.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {activeService.shortDesc}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="session-config-grid" style={{ marginTop: '12px' }}>
                    {/* Left Column: Duration for this Category */}
                    <div className="scg-col">
                      <label className="scg-label">
                        <Clock size={13} className="text-indigo-500" /> Duration for {activeService.shortName}:
                      </label>
                      <div className="scg-duration-pills">
                        {[30, 45, 60, 90].map(dur => (
                          <button
                            key={dur}
                            type="button"
                            className={`scg-dur-pill ${activeService.duration === dur ? 'active' : ''}`}
                            onClick={() => handleUpdateCategoryDuration(activeService.id, dur)}
                          >
                            <span className="scg-dur-num">{dur}</span>
                            <span className="scg-dur-unit">Mins</span>
                            {dur === activeService.standardDuration && <span className="scg-dur-badge">Standard</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Pricing for this Category */}
                    <div className="scg-col">
                      <label className="scg-label">
                        <Banknote size={13} className="text-emerald-500" /> Rate for {activeService.shortName} ({activeService.duration} Mins):
                      </label>
                      
                      {/* Unified direct price input */}
                      <div className="scg-price-input-bar">
                        <span className="scg-pib-currency">₹</span>
                        <input
                          type="number"
                          min="0"
                          max="50000"
                          step="50"
                          value={activeService.price === 0 ? '' : activeService.price}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            handleUpdateCategoryPrice(activeService.id, val);
                          }}
                          placeholder="0 (Free Pro-Bono)"
                          className={`scg-pib-input ${errors.sessionPrice ? 'input-field-has-error' : ''}`}
                        />
                        <button
                          type="button"
                          className={`scg-pib-free-btn ${activeService.price === 0 ? 'active' : ''}`}
                          onClick={() => handleUpdateCategoryPrice(activeService.id, 0)}
                          title="Set as Free Pro-Bono Session"
                        >
                          {activeService.price === 0 ? '✓ Free' : 'Set Free'}
                        </button>
                      </div>

                      {/* Quick rate presets chips tailored to this category */}
                      <div className="scg-preset-chips">
                        <span className="scg-chips-title">Quick presets:</span>
                        {activeService.presetRates.map(p => (
                          <button
                            key={p}
                            type="button"
                            className={`scg-chip ${activeService.price === p ? 'active' : ''}`}
                            onClick={() => handleUpdateCategoryPrice(activeService.id, p)}
                          >
                            ₹{p} {p === activeService.recommendedPrice ? '★' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {errors.sessionPrice && (
                  <span className="form-field-error-msg" style={{ marginTop: '8px' }}>
                    <AlertCircle size={12} /> {errors.sessionPrice}
                  </span>
                )}
              </div>

              {/* 2. Availability Schedule & Customizable Time Slots */}
              <div className="clean-section-card">
                <div className="csc-header">
                  <h4>
                    <Calendar size={16} className="text-blue-500" />
                    <span>Weekly Availability Days <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span></span>
                  </h4>
                  <div className="avail-shortcuts">
                    <button 
                      type="button" 
                      className={`btn-avail-shortcut ${selectedDays.length === 2 && selectedDays.includes('Sat') && selectedDays.includes('Sun') ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDays(['Sat', 'Sun']);
                        if (errors.selectedDays) setErrors(prev => ({ ...prev, selectedDays: '' }));
                      }}
                    >
                      Weekends
                    </button>
                    <button 
                      type="button" 
                      className={`btn-avail-shortcut ${selectedDays.length === 3 && selectedDays.includes('Wed') && selectedDays.includes('Sat') && selectedDays.includes('Sun') ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDays(['Wed', 'Sat', 'Sun']);
                        if (errors.selectedDays) setErrors(prev => ({ ...prev, selectedDays: '' }));
                      }}
                    >
                      Wed, Sat, Sun
                    </button>
                    <button 
                      type="button" 
                      className={`btn-avail-shortcut ${selectedDays.length === 5 && selectedDays.includes('Mon') && selectedDays.includes('Fri') ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                        if (errors.selectedDays) setErrors(prev => ({ ...prev, selectedDays: '' }));
                      }}
                    >
                      Weekdays
                    </button>
                    <button 
                      type="button" 
                      className={`btn-avail-shortcut ${selectedDays.length === 7 ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
                        if (errors.selectedDays) setErrors(prev => ({ ...prev, selectedDays: '' }));
                      }}
                    >
                      All 7 Days
                    </button>
                  </div>
                </div>

                <div className="day-picker-row-modern">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isSelected = selectedDays.includes(day);
                    const isWeekend = day === 'Sat' || day === 'Sun';
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`day-pill-modern ${isSelected ? 'active' : ''} ${isWeekend ? 'weekend' : ''}`}
                        onClick={() => handleToggleDay(day)}
                      >
                        <span className="day-name">{day}</span>
                        <span className="day-sub">{isSelected ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.selectedDays && (
                  <span className="form-field-error-msg" style={{ marginTop: '8px' }}>
                    <AlertCircle size={12} /> {errors.selectedDays}
                  </span>
                )}

                {/* Available Time Slots Grid - Synced with Edit Mentor Profile UX */}
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Clock size={14} className="text-indigo-600" />
                      <span>Available Time Slots ({selectedTimeSlots.length} Active) <span style={{ color: '#EF4444', fontWeight: 800 }}>*</span></span>
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Click slots to toggle Active / Disabled
                    </span>
                  </div>

                  {/* Interactive Slots Grid matching Edit Mentor Profile */}
                  <div className="mac-slots-grid">
                    {allDisplaySlots.map((slot) => {
                      const isSelected = selectedTimeSlots.includes(slot);
                      const isCustom = !standardAvailableSlots.includes(slot);
                      return (
                        <button
                          type="button"
                          key={slot}
                          className={`mac-slot-toggle ${isSelected ? 'slot-enabled' : 'slot-disabled'}`}
                          onClick={() => toggleSlot(slot)}
                        >
                          <div className="mac-slot-left">
                            <Clock size={14} />
                            <span>{slot}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="mac-status-chip">
                              {isSelected ? <><Check size={12} /> Active</> : 'Disabled'}
                            </span>
                            {isCustom && (
                              <span
                                role="button"
                                tabIndex={0}
                                className="custom-slot-delete-icon"
                                title="Remove custom slot"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomSlot(slot);
                                }}
                              >
                                <Trash2 size={12} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {errors.selectedTimeSlots && (
                    <span className="form-field-error-msg" style={{ marginTop: '6px' }}>
                      <AlertCircle size={12} /> {errors.selectedTimeSlots}
                    </span>
                  )}

                  {/* Add Custom Slot Input Row - Exactly matching Edit Mentor Profile */}
                  <div className="msp-custom-slot-row" style={{ marginTop: '12px' }}>
                    <form onSubmit={handleAddCustomSlot} style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Clock size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94A3B8' }} />
                        <input 
                          type="text" 
                          className="msp-input-with-icon" 
                          placeholder="e.g. 07:00 AM - 08:00 AM or 10:00 PM - 11:00 PM"
                          value={customSlotInput}
                          onChange={(e) => setCustomSlotInput(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="cwm-btn-add-slot">
                        <Plus size={14} /> Add Custom Slot
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* 3. Teaser & Intro Reel (Optional) */}
              <div className="clean-section-card">
                <div className="csc-header">
                  <h4>
                    <Film size={16} className="text-purple-500" />
                    <span>Teaser & Intro Reel (Optional)</span>
                  </h4>
                  <span className="csc-badge" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>
                    🚀 3.4x Higher Mentee Bookings
                  </span>
                </div>

                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 12px 0' }}>
                  A short 30–60 second video explaining your tech background and what you guide mentees on builds massive trust.
                </p>

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={videoFileInputRef}
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoFileSelected}
                  style={{ display: 'none' }}
                />

                {!hasTeaserVideo ? (
                  <div className="teaser-video-upload-box">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <button 
                        type="button" 
                        className="btn-upload-video-reel"
                        onClick={handleTriggerVideoUpload}
                      >
                        <Upload size={15} />
                        <span>Upload Video Reel (MP4 / WebM)</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '420px', marginTop: '4px' }}>
                        <input 
                          type="text" 
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder="Or paste video link (YouTube, Loom, Vimeo, MP4)..."
                          className="form-input-modern"
                          style={{ padding: '7px 12px', fontSize: '12px' }}
                        />
                        <button 
                          type="button" 
                          className="btn-add-time-chip-modern"
                          onClick={handleAttachVideoUrl}
                          style={{ padding: '7px 14px', fontWeight: 700, flexShrink: 0 }}
                        >
                          Attach Link
                        </button>
                      </div>

                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                          Or choose a ready sample teaser pitch:
                        </span>
                        <div className="video-preset-chips-row">
                          {videoPresets.map((vp) => (
                            <button
                              key={vp.name}
                              type="button"
                              className="video-preset-chip"
                              onClick={() => handleApplyPresetVideo(vp)}
                            >
                              🎬 + {vp.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="video-player-preview-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803D', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={14} /> Teaser Video Attached ({uploadedVideoName || 'Custom Video'})
                      </span>
                      <button 
                        type="button" 
                        onClick={handleRemoveVideo}
                        style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>

                    <div style={{ borderRadius: '10px', overflow: 'hidden', background: '#000', maxHeight: '200px' }}>
                      <video 
                        src={teaserVideoUrl} 
                        controls 
                        poster={currentUser?.avatar || userProfile?.avatar || '/brand/android-chrome-192x192.png'}
                        style={{ width: '100%', maxHeight: '200px', display: 'block' }}
                      />
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Teaser Title / Headline:
                      </label>
                      <input 
                        type="text" 
                        value={teaserVideoTitle}
                        onChange={(e) => setTeaserVideoTitle(e.target.value)}
                        placeholder="e.g. 60s Overview: High-Scale Systems & Tech Interview Prep"
                        className="form-input-modern"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Live Card Preview */}
              <div className="clean-section-card">
                <div className="csc-header">
                  <h4>
                    <Eye size={16} className="text-emerald-500" />
                    <span>Live Mentor Card Preview</span>
                  </h4>
                  <span className="csc-badge csc-badge-live">How mentees see your card</span>
                </div>

                <div className="preview-mentor-card-deluxe-modern">
                  <div className="pmc-top-bar-modern">
                    <div className="pmc-founding-badge">
                      <Sparkles size={13} />
                      <span>VERIFIED MENTOR</span>
                    </div>
                    <div className="pmc-recruiter-badge">
                      <ShieldCheck size={13} />
                      <span>{company ? `${company} Verified Lead` : `${BRAND.name} Verified Lead`}</span>
                    </div>
                  </div>

                  <div className="pmc-body-grid-modern">
                    <div className="pmc-avatar-wrap">
                      <img 
                        src={currentUser?.avatar || userProfile?.avatar || '/brand/android-chrome-192x192.png'} 
                        alt={fullName} 
                        className="pmc-avatar-img" 
                      />
                      <span className="pmc-verified-shield">🛡️</span>
                    </div>

                    <div className="pmc-info-col">
                      <div className="pmc-title-row">
                        <h3>{fullName || 'Your Name'}</h3>
                        <span className="pmc-company-pill">{company || 'Company'}</span>
                        <span className="pmc-star-rating"><Star size={12} fill="#F59E0B" color="#F59E0B" /> 5.0 (New)</span>
                      </div>
                      <p className="pmc-headline">{headline || 'Professional Headline'}</p>
                      <p className="pmc-bio-snip">{bio || 'Available for 1:1 mentorship and mock interviews.'}</p>

                      <div className="pmc-skills-row">
                        {selectedSkills.slice(0, 5).map(sk => (
                          <span key={sk} className="pmc-skill-pill">{sk}</span>
                        ))}
                      </div>
                    </div>

                    <div className="pmc-pricing-col-modern">
                      <div className="pmc-rate-box">
                        <span className="pmc-rate-amt">{sessionPrice === 0 ? 'Free' : `₹${sessionPrice}`}</span>
                        <span className="pmc-rate-unit">/ {sessionDuration} Mins</span>
                      </div>
                      <div className="pmc-instant-payout-tag">
                        <CheckCircle2 size={12} /> {activeService.shortName}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {categoryOfferings.filter(c => c.isEnabled).map(c => (
                          <span key={c.id} style={{ fontSize: '10px', background: '#F1F5F9', color: '#1E293B', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid #E2E8F0' }}>
                            {c.iconEmoji} {c.shortName}: {c.price === 0 ? 'Free' : `₹${c.price}`}
                          </span>
                        ))}
                      </div>
                      <div className="pmc-slots-preview" style={{ marginTop: '6px' }}>
                        <span>Slots: {selectedDays.join(', ')}</span>
                      </div>
                      {hasTeaserVideo && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE', padding: '2px 8px', borderRadius: '12px', fontSize: '10.5px', fontWeight: 700, marginTop: '6px' }}>
                          <Film size={11} /> 🎬 Teaser Attached
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Sticky Footer Action Bar */}
        <div className="wizard-modal-sticky-footer">
          <div className="wmsf-left">
            {step > 1 && (
              <button 
                type="button" 
                className="btn-wizard-back"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} /> Back to Profile
              </button>
            )}
            <span className="wmsf-step-indicator">
              Step {step} of 2 • {stepList[step - 1].label}
            </span>
          </div>

          <div className="wmsf-right">
            {step === 1 ? (
              <button 
                type="button" 
                className="btn-wizard-continue"
                onClick={handleNextStep}
              >
                <span>Continue to Pricing & Schedule</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                className="btn-wizard-publish glow-pulse"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                <Sparkles size={18} />
                <span>{isPublishing ? 'Publishing Profile…' : 'Publish Mentor Profile & Go Live'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
