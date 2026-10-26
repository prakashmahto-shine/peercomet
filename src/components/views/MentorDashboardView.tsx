import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Calendar, Clock, DollarSign, Star, CheckCircle2, 
  Award, ShieldCheck, UserCheck, Sparkles, FileText, Download,
  RotateCcw, ArrowRight, TrendingUp, Check, Settings, Eye, X, Loader2, BookOpen,
  Play, Film, Plus, Trash2, ExternalLink, Zap, Lock, CreditCard, RefreshCw, AlertCircle,
  SlidersHorizontal, User, Edit2, Unlock, Upload, UploadCloud, Code, Users, MessageSquare,
  ThumbsUp, Bell, Heart, Share2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { MentorshipSession, ZeroPrepDossier } from '../../types';
import { BRAND } from '../../config/brand';

export interface MentorSessionOffering {
  id: string;
  category: string;
  title: string;
  duration: string;
  tag: string;
  description: string;
  price: number;
  icon: 'video' | 'award' | 'file' | 'code' | 'dollar';
  isEnabled: boolean;
}

export interface CandidateReviewItem {
  id: string;
  candidateName: string;
  candidateRole: string;
  candidateAvatar: string;
  rating: number;
  date: string;
  sessionType: string;
  comment: string;
  isHelpfulCount: number;
  replyText?: string;
}


export const MentorDashboardView: React.FC = () => {
  const { 
    currentUser, 
    userProfile,
    updateUserProfile,
    sessions: localSessions, 
    navigate, 
    selectExpertById,
    setActiveSession, 
    mentorAvailability,
    updateMentorAvailability,
    updateMentorRatesAndAvailability,
    updateMentorTeaserVideo,
    creatorActiveTab,
    setCreatorActiveTab,
    studioActionNonce,
    isAssessmentModalOpen,
    setIsAssessmentModalOpen,
    setAssessmentDraftSession,
    experts,
    showToast
  } = useApp();

  // 4 Primary Clean Tabs: 'bookings' | 'reviews' | 'availability' | 'profile-settings'
  const initialTab = (creatorActiveTab === 'teaser' || creatorActiveTab === 'pricing' || creatorActiveTab === 'profile-settings') 
    ? 'profile-settings' 
    : (creatorActiveTab === 'reviews' ? 'reviews' : (creatorActiveTab === 'availability' ? 'availability' : 'bookings'));

  const [activeTab, setActiveTab] = useState<'bookings' | 'reviews' | 'availability' | 'profile-settings'>(initialTab);
  
  // Sub-filter for sessions tab: 'upcoming' | 'completed'
  const [sessionSubFilter, setSessionSubFilter] = useState<'upcoming' | 'completed'>(
    creatorActiveTab === 'history' ? 'completed' : 'upcoming'
  );

  // Reviews filter
  const [reviewFilter, setReviewFilter] = useState<'all' | '5star' | 'detailed'>('all');

  // 🔒 EXPLICIT EDIT MODE TOGGLES (FREEZE/LOCKED BY DEFAULT UNTIL "EDIT" IS CLICKED)
  const [isEditingAvailability, setIsEditingAvailability] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  const [liveSessions, setLiveSessions] = useState<MentorshipSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Sync tab and trigger specific action when creatorActiveTab or studioActionNonce changes
  useEffect(() => {
    if (creatorActiveTab) {
      if (creatorActiveTab === 'teaser') {
        setActiveTab('profile-settings');
        setIsEditingProfile(true);
        setTimeout(() => {
          document.getElementById('mpp-video-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (creatorActiveTab === 'pricing') {
        setActiveTab('profile-settings');
        setIsEditingProfile(true);
        setTimeout(() => {
          document.getElementById('mpp-session-offerings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else if (creatorActiveTab === 'profile-settings') {
        setActiveTab('profile-settings');
      } else if (creatorActiveTab === 'availability') {
        setActiveTab('availability');
        setIsEditingAvailability(true);
      } else if (creatorActiveTab === 'reviews') {
        setActiveTab('reviews');
      } else if (creatorActiveTab === 'history') {
        setActiveTab('bookings');
        setSessionSubFilter('completed');
      } else {
        setActiveTab('bookings');
        setSessionSubFilter('upcoming');
      }
    }
  }, [creatorActiveTab, studioActionNonce]);

  // Keep local inputs in sync with userProfile (candidate profile basic details)
  useEffect(() => {
    if (!isEditingProfile) {
      setHeadlineInput(userProfile.headline || currentUser?.headline || '');
      setBioInput(userProfile.summary || '');
      setSkillsList(userProfile.skills || []);
    }
  }, [userProfile.headline, userProfile.summary, userProfile.skills, isEditingProfile]);

  const handleTabChange = (tab: 'bookings' | 'reviews' | 'availability' | 'profile-settings') => {
    setActiveTab(tab);
    setCreatorActiveTab(tab);
  };

  // Zero-Prep Dossier Modal State
  const [selectedDossier, setSelectedDossier] = useState<ZeroPrepDossier | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState<boolean>(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);

  // Status & Vacation Mode
  const [isAcceptingBookings, setIsAcceptingBookings] = useState<boolean>(true);

  // Availability state
  const [selectedDays, setSelectedDays] = useState<string[]>(
    mentorAvailability.days && mentorAvailability.days.length > 0
      ? mentorAvailability.days
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  );
  const [activeSlots, setActiveSlots] = useState<string[]>(
    mentorAvailability.timeSlots && mentorAvailability.timeSlots.length > 0
      ? mentorAvailability.timeSlots
      : ['10:00 AM - 11:00 AM', '02:00 PM - 03:00 PM', '06:30 PM - 07:30 PM', '08:00 PM - 09:00 PM']
  );
  const [customSlotInput, setCustomSlotInput] = useState<string>('');
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [minNoticeHours, setMinNoticeHours] = useState<number>(2);

  // Teaser Video & Profile Listing Form State
  const initialTeaserUrl = userProfile.mentorTeaserVideo?.url || '';
  const [hasTeaserVideo, setHasTeaserVideo] = useState<boolean>(Boolean(userProfile.mentorTeaserVideo !== null && initialTeaserUrl));
  const [teaserVideoUrl, setTeaserVideoUrl] = useState<string>(initialTeaserUrl);
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('');
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [teaserTitle, setTeaserTitle] = useState<string>(
    userProfile.mentorTeaserVideo?.title || ''
  );
  const [headlineInput, setHeadlineInput] = useState<string>(
    userProfile.headline || currentUser?.headline || ''
  );
  const [bioInput, setBioInput] = useState<string>(
    userProfile.summary || ''
  );
  const [skillsList, setSkillsList] = useState<string[]>(
    userProfile.skills || []
  );
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  // 1:1 Sessions & Pricing Form State
  const defaultInitialOfferings: MentorSessionOffering[] = [
    {
      id: 'offering-1',
      category: '1:1 Career Transition Call',
      title: '1:1 Career Transition Call',
      duration: '60 Mins',
      tag: 'Deep CV Audit',
      description: 'In-depth CV teardown, career transition roadmap for 3x jumps, and target role gap audit.',
      price: userProfile.mentorRate || 999,
      icon: 'video',
      isEnabled: true
    },
    {
      id: 'offering-2',
      category: '1:1 Mock Interview & Evaluation',
      title: '1:1 Mock Interview & Evaluation',
      duration: '60 Mins',
      tag: 'Interview Simulation',
      description: 'Rigorous technical interview simulation with real-time feedback, scorecard teardown, and personalized career roadmap.',
      price: 1499,
      icon: 'video',
      isEnabled: true
    },
    {
      id: 'offering-3',
      category: 'Quick 30-min Resume Audit',
      title: 'Quick 30-min Resume Audit',
      duration: '30 Mins',
      tag: 'Inbound Advice',
      description: 'Rapid review of resume formatting, ATS keywords, and LinkedIn inbound optimization.',
      price: 499,
      icon: 'file',
      isEnabled: true
    }
  ];

  const [sessionOfferings, setSessionOfferings] = useState<MentorSessionOffering[]>(defaultInitialOfferings);
  const [sessionRate1, setSessionRate1] = useState<number>(userProfile.mentorRate || 999);
  const [isInstantBookingEnabled, setIsInstantBookingEnabled] = useState<boolean>(true);
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>(currentUser?.name || '');

  // Bookings are stored against the creator id, which differs from the user id for candidates who became mentors
  const mentorId = currentUser?.creatorId || currentUser?.id || '';
  const mentorName = currentUser?.name || '';
  const mentorAvatar = currentUser?.avatar || '/brand/android-chrome-192x192.png';
  const myCreator = experts.find(e => e.id.toLowerCase() === mentorId.toLowerCase());

  // Start pricing from the mentor's real listed price, so saving settings never resets it to a default
  useEffect(() => {
    const customOfferings = userProfile.mentorOfferings || myCreator?.serviceOfferings;
    if (customOfferings && customOfferings.length > 0) {
      setSessionOfferings(customOfferings as MentorSessionOffering[]);
      if (myCreator?.price) setSessionRate1(myCreator.price);
      return;
    }
    if (!myCreator?.price) return;
    setSessionRate1(myCreator.price);
    setSessionOfferings(prev => prev.map((o, i) => (i === 0 ? { ...o, price: myCreator.price } : o)));
  }, [myCreator?.id, myCreator?.price, userProfile.mentorOfferings]);

  // 1. Fetch live sessions from Backend API
  useEffect(() => {
    let isCurrent = true;
    setIsLoadingSessions(true);

    peerpathApi.getSessions(mentorId, 'mentor')
      .then((sessions) => {
        if (isCurrent) setLiveSessions(sessions || []);
      })
      .catch((err) => {
        console.warn('[API getSessions]:', err);
        if (isCurrent) {
          setLiveSessions([]);
          showToast('Could not load your bookings', 'Please refresh the page to try again.', 'warning');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSessions(false);
      });

    // 2. Fetch live metrics from Backend API
    peerpathApi.getAnalytics()
      .then((data) => {
        if (isCurrent && data) {
          setAnalyticsData(data);
        }
      })
      .catch((err) => console.warn('[API getAnalytics Fallback]:', err));

    return () => {
      isCurrent = false;
    };
  }, [mentorId, isAssessmentModalOpen]);

  const upcomingMentorSessions = liveSessions.filter(s => s.status === 'upcoming');
  const completedMentorSessions = liveSessions.filter(s => s.status === 'completed');

  // Computed from real sessions and backend creator profile only
  const totalEarnings = completedMentorSessions.reduce((sum, s) => sum + (s.amountPaid ?? s.expert.price ?? 0), 0);
  const badgesIssuedCount = completedMentorSessions.filter(s => s.badgeAwarded).length;
  const reviewedSessions = liveSessions.filter(s => s.candidateRating != null);
  const averageRating = reviewedSessions.length
    ? reviewedSessions.reduce((sum, s) => sum + (s.candidateRating || 0), 0) / reviewedSessions.length
    : null;
  const reviewCount = reviewedSessions.length || myCreator?.reviewsCount || 0;
  const displayRating = averageRating != null
    ? averageRating.toFixed(1)
    : (myCreator?.rating && myCreator.reviewsCount > 0 ? myCreator.rating.toFixed(1) : (reviewCount > 0 ? '5.0' : 'New'));
  const sessionReviews: CandidateReviewItem[] = reviewedSessions.map(s => ({
    id: `rev-${s.id}`,
    candidateName: s.candidateName,
    candidateRole: s.candidateRole || 'Candidate',
    candidateAvatar: s.candidateAvatar || '/brand/android-chrome-192x192.png',
    rating: s.candidateRating || 0,
    date: s.date,
    sessionType: s.sessionType || '1:1 Mentorship Session',
    comment: s.candidateReview || '',
    isHelpfulCount: 0
  }));

  const openAssessment = (session: MentorshipSession) => {
    setAssessmentDraftSession(session);
    setIsAssessmentModalOpen(true);
  };

  const handleHostCall = (session: MentorshipSession) => {
    setActiveSession(session);
    navigate('live-call-view');
  };

  // Zero-Prep Dossier fetch from backend API
  const handleViewDossier = async (session: MentorshipSession) => {
    setIsLoadingDossier(true);
    setIsDossierModalOpen(true);
    try {
      const dossier = await peerpathApi.getZeroPrepDossier(session.id);
      setSelectedDossier(dossier);
    } catch (error) {
      console.warn('[API getZeroPrepDossier]:', error);
      setIsDossierModalOpen(false);
      showToast('Could not load profile', 'Please try again in a moment.', 'warning');
    } finally {
      setIsLoadingDossier(false);
    }
  };

  // Availability handlers
  const toggleDay = (day: string) => {
    if (!isEditingAvailability) return;
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleSlot = (slotStr: string) => {
    if (!isEditingAvailability) return;
    setActiveSlots(prev => 
      prev.includes(slotStr) ? prev.filter(s => s !== slotStr) : [...prev, slotStr]
    );
  };

  const handleAddCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingAvailability) return;
    if (!customSlotInput.trim()) return;
    if (!activeSlots.includes(customSlotInput.trim())) {
      setActiveSlots(prev => [...prev, customSlotInput.trim()]);
      setCustomSlotInput('');
      showToast('Time Slot Added', `Added slot "${customSlotInput.trim()}".`);
    }
  };

  // Saves availability only (and toasts on success); price is saved from the Pricing tab
  const handleSaveAvailability = () => {
    updateMentorAvailability(selectedDays, activeSlots);
    setIsEditingAvailability(false);
  };

  const handleCancelAvailability = () => {
    setSelectedDays(mentorAvailability.days && mentorAvailability.days.length > 0 ? mentorAvailability.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    setActiveSlots(mentorAvailability.timeSlots && mentorAvailability.timeSlots.length > 0 ? mentorAvailability.timeSlots : ['10:00 AM - 11:00 AM', '02:00 PM - 03:00 PM', '06:30 PM - 07:30 PM', '08:00 PM - 09:00 PM']);
    setIsEditingAvailability(false);
  };

  // Teaser Upload & Delete Handlers
  const handleTriggerVideoUpload = () => {
    videoFileInputRef.current?.click();
  };

  const handleVideoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingVideo(true);
      const videoBlobUrl = URL.createObjectURL(file);
      setTimeout(() => {
        setTeaserVideoUrl(videoBlobUrl);
        setUploadedVideoName(file.name);
        setHasTeaserVideo(true);
        setIsUploadingVideo(false);
        showToast('Video Reel Selected', `Loaded "${file.name}" as 60-second teaser pitch. Click Save to publish.`, 'success');
      }, 500);
    }
  };

  const handleDeleteTeaserVideo = () => {
    setHasTeaserVideo(false);
    setTeaserVideoUrl('');
    setUploadedVideoName('');
    showToast('Teaser Video Removed', 'Your 60-sec teaser reel has been deleted from your listing.', 'info');
  };

  const handleVideoFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mov'))) {
      setIsUploadingVideo(true);
      const videoBlobUrl = URL.createObjectURL(file);
      setTimeout(() => {
        setTeaserVideoUrl(videoBlobUrl);
        setUploadedVideoName(file.name);
        setHasTeaserVideo(true);
        setIsUploadingVideo(false);
        showToast('Video Reel Selected', `Loaded "${file.name}" as 60-second teaser pitch. Click Save to publish.`, 'success');
      }, 500);
    }
  };

  // Teaser & Profile Listing Handlers
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingProfile) return;
    if (!newSkillInput.trim()) return;
    if (!skillsList.includes(newSkillInput.trim())) {
      setSkillsList(prev => [...prev, newSkillInput.trim()]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!isEditingProfile) return;
    setSkillsList(prev => prev.filter(s => s !== skillToRemove));
  };

  const availableSessionCategories = [
    { name: '1:1 Career Transition Call', icon: 'video' as const, defaultDuration: '60 Mins', defaultTag: 'Career Strategy', defaultDesc: 'In-depth CV teardown, career transition roadmap for 3x jumps, and target role gap audit.' },
    { name: '1:1 Mock Interview & Evaluation', icon: 'video' as const, defaultDuration: '60 Mins', defaultTag: 'Interview Prep', defaultDesc: 'Rigorous technical interview simulation with actionable performance feedback and career roadmap.' },
    { name: 'Quick 30-min Resume Audit', icon: 'file' as const, defaultDuration: '30 Mins', defaultTag: 'ATS & Keywords', defaultDesc: 'Rapid review of resume formatting, ATS keywords, and LinkedIn inbound optimization.' },
    { name: 'System Design & Architecture Mock', icon: 'code' as const, defaultDuration: '60 Mins', defaultTag: 'High Scalability', defaultDesc: 'Live system architecture whiteboard teardown, micro-frontend scoping, and concurrency review.' },
    { name: 'Salary Negotiation & Exec Coaching', icon: 'dollar' as const, defaultDuration: '45 Mins', defaultTag: '3x Compensation Jump', defaultDesc: 'Offer letter benchmarking, counter-offer strategy, ESOP evaluation, and executive level negotiation.' },
    { name: 'Custom 1:1 Mentorship', icon: 'video' as const, defaultDuration: '60 Mins', defaultTag: 'Tailored Session', defaultDesc: 'Custom one-on-one session tailored to candidate questions and career goals.' }
  ];

  const handleUpdateOffering = (id: string, field: keyof MentorSessionOffering, value: any) => {
    setSessionOfferings(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    const preset = availableSessionCategories.find(c => c.name === newCategory);
    setSessionOfferings(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        category: newCategory,
        title: preset ? preset.name : newCategory,
        duration: preset ? preset.defaultDuration : item.duration,
        tag: preset ? preset.defaultTag : item.tag,
        description: preset ? preset.defaultDesc : item.description,
        icon: preset ? preset.icon : item.icon
      };
    }));
  };

  const handleAddOffering = () => {
    const newId = `offering-${Date.now()}`;
    const newOffering: MentorSessionOffering = {
      id: newId,
      category: 'System Design & Architecture Mock',
      title: 'System Design & Architecture Mock',
      duration: '60 Mins',
      tag: 'High Scalability',
      description: 'Live system architecture whiteboard teardown, micro-frontend scoping, and concurrency review.',
      price: 1999,
      icon: 'code',
      isEnabled: true
    };
    setSessionOfferings(prev => [...prev, newOffering]);
    showToast('New Session Offering Added', 'Customize category, title, duration, and pricing.', 'success');
  };

  const handleDeleteOffering = (id: string) => {
    if (sessionOfferings.length <= 1) {
      showToast('Cannot Remove', 'You must maintain at least one active session offering.', 'info');
      return;
    }
    setSessionOfferings(prev => prev.filter(item => item.id !== id));
    showToast('Session Offering Removed', 'The session type has been removed from your listing.', 'info');
  };

  const handleToggleOffering = (id: string) => {
    setSessionOfferings(prev => prev.map(item => item.id === id ? { ...item, isEnabled: !item.isEnabled } : item));
  };

  const renderOfferingIcon = (icon: string) => {
    switch (icon) {
      case 'award': return <Award size={18} />;
      case 'file': return <FileText size={18} />;
      case 'code': return <Code size={18} />;
      case 'dollar': return <DollarSign size={18} />;
      case 'video':
      default: return <Video size={18} />;
    }
  };

  const getIconClass = (icon: string) => {
    switch (icon) {
      case 'award': return 'icon-amber';
      case 'file': return 'icon-green';
      case 'code': return 'icon-blue';
      case 'dollar': return 'icon-indigo';
      case 'video':
      default: return 'icon-purple';
    }
  };

  const getOfferingAccentClass = (icon: string) => {
    switch (icon) {
      case 'award': return 'accent-amber';
      case 'file': return 'accent-emerald';
      case 'code': return 'accent-blue';
      case 'dollar': return 'accent-indigo';
      case 'video':
      default: return 'accent-purple';
    }
  };

  const getOfferingHighlights = (offering: MentorSessionOffering): string[] => {
    if (offering.category.includes('Career') || offering.title.includes('Career')) {
      return [
        '1:1 Live Video Consultation',
        'Resume & Target Role Gap Audit',
        '30-Day Transition Action Plan'
      ];
    }
    if (offering.category.includes('Mock') || offering.title.includes('Mock')) {
      return [
        'Real-time Interview Simulation',
        'Competency Scorecard Teardown',
        'Actionable Prep Roadmap'
      ];
    }
    if (offering.category.includes('Resume') || offering.title.includes('Resume')) {
      return [
        'In-depth ATS Keyword Audit',
        'High-Impact Bullet Refactoring',
        'LinkedIn Inbound Tips'
      ];
    }
    if (offering.category.includes('Architecture') || offering.title.includes('Design')) {
      return [
        'Live Whiteboard System Design',
        'Scalability & Microservices Review',
        'Staff+ Engineering Feedback'
      ];
    }
    if (offering.category.includes('Salary') || offering.title.includes('Negotiation')) {
      return [
        'Offer Benchmarking & Range Audit',
        'Counter-offer Strategy & Scripts',
        'ESOPs & Retention Structure'
      ];
    }
    return [
      '1:1 Tailored Video Consultation',
      'Personalized Q&A & Strategy',
      'Action Notes & Resources'
    ];
  };

  const handleSaveAllSettings = () => {
    if (hasTeaserVideo && teaserVideoUrl) {
      updateMentorTeaserVideo({
        url: teaserVideoUrl,
        title: teaserTitle,
        duration: '0:58 min',
        thumbnail: mentorAvatar,
        uploadedAt: 'Today'
      });
    } else {
      updateMentorTeaserVideo(null);
    }
    const primaryRate = sessionOfferings.find(o => o.isEnabled)?.price || sessionOfferings[0]?.price || 999;
    setSessionRate1(primaryRate);
    updateMentorRatesAndAvailability(primaryRate, 60, selectedDays, activeSlots);
    updateUserProfile({
      headline: headlineInput,
      summary: bioInput,
      skills: skillsList,
      mentorRate: primaryRate
    });
    setIsEditingProfile(false);
    showToast('Profile & Pricing Saved', `Your public listing, ${sessionOfferings.filter(o => o.isEnabled).length} session offerings, and rates have been saved & published!`);
  };

  const handleCancelProfile = () => {
    setHasTeaserVideo(Boolean(userProfile.mentorTeaserVideo?.url || initialTeaserUrl));
    setTeaserVideoUrl(userProfile.mentorTeaserVideo?.url || initialTeaserUrl);
    setTeaserTitle(userProfile.mentorTeaserVideo?.title || '');
    setHeadlineInput(userProfile.headline || currentUser?.headline || '');
    setBioInput(userProfile.summary || '');
    setSkillsList(userProfile.skills || []);
    setSessionOfferings(defaultInitialOfferings);
    setSessionRate1(userProfile.mentorRate || 999);
    setIsEditingProfile(false);
  };

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

  const daysOfWeek = [
    { key: 'Mon', label: 'Monday' },
    { key: 'Tue', label: 'Tuesday' },
    { key: 'Wed', label: 'Wednesday' },
    { key: 'Thu', label: 'Thursday' },
    { key: 'Fri', label: 'Friday' },
    { key: 'Sat', label: 'Saturday' },
    { key: 'Sun', label: 'Sunday' }
  ];

  const videoPresets = [
    {
      name: 'Product Leadership Pitch',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4',
      title: 'How I Help Candidates Transition to Top Product & Architecture Roles (₹30L+ Target)'
    },
    {
      name: 'System Architecture Teardown',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41808-large.mp4',
      title: 'System Design & High-Concurrency Live Teardown Masterclass (60s Overview)'
    },
    {
      name: '3x Compensation Multiplier',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-giving-a-speech-at-an-event-42354-large.mp4',
      title: 'Breaking the Career Ceiling: Step-by-Step Salary & Promotion Multiplier'
    }
  ];

  return (
    <div className="content-wrapper mentor-portal-wrapper">
      
      {/* Hidden File Input for Video Reel Upload */}
      <input 
        type="file" 
        ref={videoFileInputRef}
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleVideoFileSelected}
        style={{ display: 'none' }}
      />

      <div className="md-layout-grid">
        <aside className="md-mentor-sidebar">
          <div className="md-mentor-card">
            
            {/* Ambient top decoration */}
            <div className="md-card-top-glow"></div>

            {/* Avatar & Verified Check Badge */}
            <div className="md-avatar-center-wrap">
              <div className="md-avatar-ring">
                <img 
                  src={mentorAvatar} 
                  alt={mentorName} 
                  className="md-avatar-img"
                />
                <span className="md-verified-check" title={`Verified Lead Mentor on ${BRAND.name}`}>
                  <CheckCircle2 size={15} />
                </span>
              </div>
            </div>

            {/* Mentor Info */}
            <div className="md-mentor-info-block">
              <h1 className="md-mentor-name">{mentorName}</h1>
              
              <div className="md-badge-row">
                <span className="md-portal-badge" title={`Performance Badge Awarded by ${BRAND.name} based on candidate ratings & completed sessions`}>
                  <Award size={12} className="text-amber-500" /> {BRAND.name} Super Mentor
                </span>
              </div>

              <p className="md-mentor-headline">{headlineInput}</p>

              {/* Rating & Rate Strip */}
              <div className="md-rating-rate-strip">
                <div className="md-star-rating">
                  <Star size={13} className="star-gold" fill="#F59E0B" />
                  <strong>{displayRating}</strong>
                  <span>({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                </div>
                <span className="md-meta-dot">•</span>
                <span className="md-rate-item">
                  <span>Rate:</span>
                  <strong>₹{sessionRate1}/hr</strong>
                </span>
              </div>
            </div>

            {/* Accepting Bookings Live Toggle Card */}
            <div className="md-status-toggle-box">
              <div className="md-stb-text">
                <span className="md-stb-title">Booking Status</span>
                <span className="md-stb-desc">
                  {isAcceptingBookings ? '🟢 Live on Search' : '⏸️ Vacation Mode'}
                </span>
              </div>
              <button 
                type="button" 
                className={`md-live-status-pill ${isAcceptingBookings ? 'status-active' : 'status-paused'}`}
                onClick={() => {
                  const nextStatus = !isAcceptingBookings;
                  setIsAcceptingBookings(nextStatus);
                  showToast(
                    nextStatus ? '🟢 Bookings Resumed' : '⏸️ Vacation Mode (Bookings Paused)',
                    nextStatus ? 'Candidates can book 1:1 sessions.' : 'Your calendar is temporarily hidden from candidate search.',
                    nextStatus ? 'success' : 'info'
                  );
                }}
                title="Click to toggle availability status"
              >
                <span className={isAcceptingBookings ? "mentor-pulse-green" : "mentor-pulse-amber"}></span>
                <span>{isAcceptingBookings ? 'Accepting' : 'Paused'}</span>
              </button>
            </div>

            {/* Quick Action Buttons (Copy Link & Preview Public Profile) */}
            <div className="md-quick-actions-row">
              <button 
                type="button" 
                className="btn-md-action btn-md-copy"
                onClick={() => {
                  const link = `${window.location.origin}/mentor/${mentorId}`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(link);
                    showToast('Link Copied to Clipboard', `Shareable link: ${link}`, 'success');
                  } else {
                    showToast('Booking Link', `Your link: ${link}`, 'info');
                  }
                }}
                title="Copy direct booking link to share on LinkedIn or WhatsApp"
              >
                <Share2 size={13} />
                <span>Copy Link</span>
              </button>

              <button 
                type="button" 
                className="btn-md-action btn-md-preview"
                onClick={() => {
                  selectExpertById(mentorId);
                  navigate('expert-profile-view', `/expert/${mentorId}`);
                }}
                title="See how candidates view your profile"
              >
                <Eye size={13} />
                <span>Preview Profile</span>
              </button>
            </div>

            {/* 4 Core SaaS Analytics Tiles (Compact 2x2 Grid) */}
            <div className="md-metrics-2x2">
              <div className="md-mini-tile">
                <div className="md-mt-header">
                  <div className="md-mt-icon icon-green"><DollarSign size={13} /></div>
                  <span className="md-mt-trend positive">{completedMentorSessions.length} paid</span>
                </div>
                <strong className="md-mt-val">₹{totalEarnings.toLocaleString('en-IN')}</strong>
                <span className="md-mt-label">Total Earnings</span>
              </div>

              <div className="md-mini-tile">
                <div className="md-mt-header">
                  <div className="md-mt-icon icon-purple"><Users size={13} /></div>
                  <span className="md-mt-trend purple">{upcomingMentorSessions.length} upcoming</span>
                </div>
                <strong className="md-mt-val">{badgesIssuedCount}</strong>
                <span className="md-mt-label">Badges Issued</span>
              </div>

              <div className="md-mini-tile">
                <div className="md-mt-header">
                  <div className="md-mt-icon icon-indigo"><Sparkles size={13} /></div>
                  <span className="md-mt-trend blue">{reviewedSessions.length} reviews</span>
                </div>
                <strong className="md-mt-val">{averageRating != null ? `${averageRating.toFixed(1)} ★` : 'New'}</strong>
                <span className="md-mt-label">Avg. Rating</span>
              </div>

              <div className="md-mini-tile">
                <div className="md-mt-header">
                  <div className="md-mt-icon icon-blue"><CheckCircle2 size={13} /></div>
                  <span className="md-mt-trend gold">{myCreator?.sessionsCount ?? completedMentorSessions.length} total</span>
                </div>
                <strong className="md-mt-val">{completedMentorSessions.length}</strong>
                <span className="md-mt-label">Completed</span>
              </div>
            </div>

            {/* Trust & Guarantee Strip */}
            <div className="md-trust-box">
              <div className="md-trust-item">
                <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                <span>0% Platform Fee • 100% Direct Bank Payouts</span>
              </div>
            </div>

          </div>
        </aside>

        <main className="md-main-content">
          <div className="clean-studio-nav-bar">
            <div className="clean-tab-segment-group">
              <button 
                type="button"
                className={`cs-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => handleTabChange('bookings')}
              >
                <Calendar size={14} />
                <span>Sessions</span>
                <span className="cs-tab-pill">{upcomingMentorSessions.length}</span>
              </button>

              {/* TAB 2: AVAILABILITY */}
              <button 
                type="button"
                className={`cs-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
                onClick={() => handleTabChange('availability')}
              >
                <Clock size={14} />
                <span>Availability</span>
                <span className="cs-tab-pill-neutral">{activeSlots.length}</span>
              </button>

              {/* TAB 3: PROFILE & PRICING */}
              <button 
                type="button"
                className={`cs-tab-btn ${activeTab === 'profile-settings' ? 'active' : ''}`}
                onClick={() => handleTabChange('profile-settings')}
              >
                <Settings size={14} />
                <span>Profile & Pricing</span>
              </button>

              {/* TAB 4: REVIEWS */}
              <button 
                type="button"
                className={`cs-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => handleTabChange('reviews')}
              >
                <Star size={14} fill="#F59E0B" color="#F59E0B" />
                <span>Reviews</span>
                <span className="cs-tab-pill-neutral">{reviewCount}</span>
              </button>

            </div>
          </div>

      {activeTab === 'bookings' && (
        <div className="mentor-cards-stack">

          {/* Clean Sub-Filter Switch: Upcoming vs Completed */}
          <div className="cs-sub-filter-row">
            <div className="cs-sub-filter-group">
              <button 
                type="button"
                className={`cs-sub-pill ${sessionSubFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setSessionSubFilter('upcoming')}
              >
                <Video size={14} />
                <span>Upcoming Bookings ({upcomingMentorSessions.length})</span>
              </button>

              <button 
                type="button"
                className={`cs-sub-pill ${sessionSubFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setSessionSubFilter('completed')}
              >
                <Award size={14} />
                <span>Completed History ({completedMentorSessions.length})</span>
              </button>
            </div>
          </div>

          {/* 1A. Upcoming Bookings List */}
          {sessionSubFilter === 'upcoming' && (
            isLoadingSessions ? (
              <div className="empty-mentor-box">
                <Loader2 size={28} className="animate-spin text-purple-600 mb-2" />
                <h3>Loading candidate bookings from API...</h3>
              </div>
            ) : upcomingMentorSessions.length === 0 ? (
              <div className="empty-mentor-box">
                <Sparkles size={32} className="text-amber-500" />
                <h3>No pending bookings right now</h3>
                <p>Your calendar is open and live. New candidate bookings will appear here instantly.</p>
                <button 
                  type="button" 
                  className="btn-shine-gold-sm mt-3"
                  onClick={() => {
                    handleTabChange('availability');
                    setIsEditingAvailability(true);
                  }}
                >
                  Manage Open Time Slots
                </button>
              </div>
            ) : (
              upcomingMentorSessions.map((sess) => (
                <div key={sess.id} className="mentor-session-card">
                  
                  {/* Top Row: Candidate Details & Status + Payout */}
                  <div className="msc-card-top-row">
                    <div className="msc-candidate-meta">
                      <div className="msc-avatar-wrap">
                        <img 
                          src={sess.candidateAvatar || '/brand/android-chrome-192x192.png'} 
                          alt={sess.candidateName} 
                          className="msc-candidate-avatar"
                        />
                        <span className="msc-avatar-pulse-dot" title="Live Booking"></span>
                      </div>
                      <div className="msc-candidate-info">
                        <div className="msc-name-tag-row">
                          <h3 className="msc-cand-name">{sess.candidateName}</h3>
                          <span className="msc-badge-confirmed">
                            <span className="sc-pulse-dot"></span> Confirmed 1:1 Call
                          </span>
                        </div>
                        <p className="msc-cand-role">{sess.candidateRole || 'Senior Frontend Engineer (4+ Years)'}</p>
                      </div>
                    </div>

                    <div className="msc-top-right-meta">
                      <div className="msc-payout-pill">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span className="msc-payout-val">₹{sessionRate1} Paid</span>
                        <span className="msc-fee-tag">0% Fee</span>
                      </div>
                    </div>
                  </div>

                  {/* Goal / Context Strip */}
                  <div className="msc-goal-strip">
                    <span className="msc-goal-tag">🎯 Goal:</span>
                    <span className="msc-goal-text">
                      {sess.candidateGoal || 'Targeting ₹18L–₹24L Product Role Jump & 1:1 Resume Teardown'}
                    </span>
                  </div>

                  {/* Footer Bar: Date/Time + AI Dossier + Action Buttons */}
                  <div className="msc-card-footer">
                    <div className="msc-meta-pills-row">
                      <span className="msc-meta-pill">
                        <Calendar size={13} className="text-blue-600" />
                        <span>{sess.date}</span>
                      </span>
                      <span className="msc-meta-pill">
                        <Clock size={13} className="text-amber-600" />
                        <span>{sess.timeSlot} (45 mins)</span>
                      </span>
                      <button 
                        type="button" 
                        className="msc-dossier-pill-btn"
                        onClick={() => handleViewDossier(sess)}
                        title="View Candidate Profile & AI Briefing"
                      >
                        <BookOpen size={12} className="text-emerald-600" />
                        <span>Candidate Profile</span>
                      </button>
                    </div>

                    <div className="msc-action-buttons-group">
                      <button 
                        type="button" 
                        className="btn-msc-reschedule-compact"
                        onClick={() => {
                          showToast('Reschedule Prompt Sent', `Candidate ${sess.candidateName} has been notified.`, 'info');
                        }}
                        title="Propose another time slot"
                      >
                        <RotateCcw size={12} />
                        <span>Reschedule</span>
                      </button>

                      <button 
                        type="button" 
                        className="btn-msc-host-primary"
                        onClick={() => handleHostCall(sess)}
                      >
                        <span className="live-cam-pulse-dot"></span>
                        <Video size={14} />
                        <span>Host Call</span>
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )
          )}

          {/* 1B. Completed History List */}
          {sessionSubFilter === 'completed' && (
            <div className="mentor-cards-stack">
              
              {completedMentorSessions.length === 0 && (
                <div className="mentor-session-card completed-history-card">
                  <p className="msc-cand-role">No completed sessions yet.</p>
                </div>
              )}
              {completedMentorSessions.map(sess => (
                <div key={sess.id} className="mentor-session-card completed-history-card">
                  <div className="msc-card-top-row">
                    <div className="msc-candidate-meta">
                      <div className="msc-avatar-wrap">
                        <img src={sess.candidateAvatar || '/brand/android-chrome-192x192.png'} alt={sess.candidateName} className="msc-candidate-avatar" />
                        <span className="msc-avatar-badge-done">✓</span>
                      </div>
                      <div className="msc-candidate-info">
                        <div className="msc-name-tag-row">
                          <h3 className="msc-cand-name">{sess.candidateName}</h3>
                          <span className="msc-badge-completed-pill">
                            <CheckCircle2 size={12} /> Call Completed
                          </span>
                        </div>
                        <p className="msc-cand-role">{sess.candidateRole || 'Candidate'} • {sess.sessionType || '1:1 Mentorship Session'}</p>
                      </div>
                    </div>

                    <div className="msc-top-right-meta">
                      <div className="msc-payout-pill completed">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span className="msc-payout-val">₹{(sess.amountPaid ?? sess.expert.price ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {sess.feedbackNotes && (
                    <div className="sc-session-notes-strip">
                      <div className="sc-notes-icon">
                        <FileText size={16} className="text-blue-600" />
                      </div>
                      <div className="sc-notes-content">
                        <span className="sc-notes-label">Your Assessment Notes:</span>
                        <p className="sc-notes-quote">"{sess.feedbackNotes}"</p>
                      </div>
                    </div>
                  )}

                  <div className="msc-card-footer">
                    <div className="msc-meta-pills-row">
                      <span className="msc-meta-pill">
                        <Calendar size={13} className="text-slate-500" />
                        <span>{sess.date}</span>
                      </span>
                      {sess.candidateRating != null && (
                        <span className="msc-meta-pill">
                          <Star size={13} fill="#F59E0B" color="#F59E0B" />
                          <span>{sess.candidateRating.toFixed(1)} Candidate Rating</span>
                        </span>
                      )}
                    </div>

                    <div className="msc-action-buttons-group">
                      <button 
                        type="button" 
                        className="btn-msc-secondary-action"
                        disabled={Boolean(sess.badgeAwarded)}
                        onClick={() => openAssessment(sess)}
                      >
                        <Award size={13} className="text-slate-600" />
                        <span>{sess.badgeAwarded ? `Assessed: ${sess.badgeAwarded}` : 'Assess Candidate'}</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn-msc-secondary-action"
                        onClick={() => handleViewDossier(sess)}
                      >
                        <BookOpen size={13} className="text-slate-600" />
                        <span>View Profile</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="mentor-cards-stack">
          
          {/* Top Rating Breakdown & Follower Reach Overview */}
          <div className="reviews-dashboard-overview-grid">
            
            {/* Overall Score Card */}
            <div className="rdo-card rdo-score-box">
              <div className="rdo-score-main">
                <strong className="rdo-score-number">{displayRating}</strong>
                <div className="rdo-stars-col">
                  <div className="rdo-stars-row">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={18} fill="#F59E0B" color="#F59E0B" />
                    ))}
                  </div>
                  <span className="rdo-review-count">
                    {reviewCount > 0 
                      ? <>Based on <strong>{reviewCount} Verified Candidate {reviewCount === 1 ? 'Review' : 'Reviews'}</strong></>
                      : 'No candidate reviews yet'}
                  </span>
                </div>
              </div>

              <div className="rdo-breakdown-bars">
                <div className="rdo-bar-row">
                  <span className="rdo-bar-lbl">5 Star</span>
                  <div className="rdo-track"><div className="rdo-fill" style={{ width: reviewCount > 0 ? `${Math.round((reviewedSessions.filter(s => s.candidateRating === 5).length / (reviewedSessions.length || 1)) * 100)}%` : '0%' }}></div></div>
                  <span className="rdo-bar-pct">{reviewCount > 0 ? `${reviewedSessions.filter(s => s.candidateRating === 5).length}` : '0'}</span>
                </div>
                <div className="rdo-bar-row">
                  <span className="rdo-bar-lbl">4 Star</span>
                  <div className="rdo-track"><div className="rdo-fill" style={{ width: reviewCount > 0 ? `${Math.round((reviewedSessions.filter(s => s.candidateRating === 4).length / (reviewedSessions.length || 1)) * 100)}%` : '0%' }}></div></div>
                  <span className="rdo-bar-pct">{reviewCount > 0 ? `${reviewedSessions.filter(s => s.candidateRating === 4).length}` : '0'}</span>
                </div>
                <div className="rdo-bar-row">
                  <span className="rdo-bar-lbl">3 Star</span>
                  <div className="rdo-track"><div className="rdo-fill" style={{ width: reviewCount > 0 ? `${Math.round((reviewedSessions.filter(s => (s.candidateRating || 0) <= 3).length / (reviewedSessions.length || 1)) * 100)}%` : '0%' }}></div></div>
                  <span className="rdo-bar-pct">{reviewCount > 0 ? `${reviewedSessions.filter(s => (s.candidateRating || 0) <= 3).length}` : '0'}</span>
                </div>
              </div>
            </div>

            {/* Social Proof & Follower Reach Card */}
            <div className="rdo-card rdo-community-box">
              <div className="rdo-comm-header">
                <div className="rdo-comm-icon"><Users size={20} /></div>
                <div>
                  <h4>Follower Alerts</h4>
                  <span className="rdo-comm-sub">Candidates subscribed to your mentorship alerts</span>
                </div>
              </div>

              <div className="rdo-reach-perks">
                <div className="rdo-perk-item">
                  <span className="rdo-perk-bullet">⚡</span>
                  <div>
                    <strong>Instant Broadcast Reach:</strong>
                    <p>When you open new slots or host AMAs, your followers get notified.</p>
                  </div>
                </div>

                <div className="rdo-perk-item">
                  <span className="rdo-perk-bullet">🏆</span>
                  <div>
                    <strong>Your Rating:</strong>
                    <p>{averageRating != null ? `${averageRating.toFixed(1)} ★ from ${reviewedSessions.length} candidate review(s).` : 'No candidate reviews yet.'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Review Filter Bar */}
          <div className="cs-sub-filter-row">
            <div className="cs-sub-filter-group">
              <button 
                type="button" 
                className={`cs-sub-pill ${reviewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setReviewFilter('all')}
              >
                <MessageSquare size={14} />
                <span>All Candidate Feedback ({sessionReviews.length})</span>
              </button>

              <button 
                type="button" 
                className={`cs-sub-pill ${reviewFilter === 'detailed' ? 'active' : ''}`}
                onClick={() => setReviewFilter('detailed')}
              >
                <CheckCircle2 size={14} />
                <span>Detailed Reviews ({sessionReviews.filter(r => r.comment.length > 80).length})</span>
              </button>

              <button 
                type="button" 
                className={`cs-sub-pill ${reviewFilter === '5star' ? 'active' : ''}`}
                onClick={() => setReviewFilter('5star')}
              >
                <Star size={14} fill="#F59E0B" color="#F59E0B" />
                <span>5-Star Testimonials ({sessionReviews.filter(r => r.rating === 5).length})</span>
              </button>
            </div>
          </div>

          {/* Reviews List Stack */}
          <div className="creator-reviews-feed-stack">
            {sessionReviews.length === 0 && (
              <div className="creator-review-card">
                <p className="crc-comment-text">No reviews yet. Reviews appear here after candidates rate their completed sessions.</p>
              </div>
            )}
            {sessionReviews
              .filter(rev => {
                if (reviewFilter === '5star') return rev.rating === 5;
                return true;
              })
              .map((rev) => (
                <div key={rev.id} className="creator-review-card">
                  <div className="crc-header-row">
                    <div className="crc-candidate-meta">
                      <img src={rev.candidateAvatar} alt={rev.candidateName} className="crc-avatar" />
                      <div>
                        <div className="crc-name-row">
                          <strong className="crc-name">{rev.candidateName}</strong>
                          <span className="crc-verified-student-tag">
                            <CheckCircle2 size={12} /> Verified Session Candidate
                          </span>
                        </div>
                        <p className="crc-role">{rev.candidateRole}</p>
                      </div>
                    </div>

                    <div className="crc-rating-meta">
                      <div className="crc-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} fill={s <= Math.round(rev.rating) ? '#F59E0B' : 'none'} color="#F59E0B" />
                        ))}
                      </div>
                      <span className="crc-date">{rev.date}</span>
                    </div>
                  </div>

                  <div className="crc-session-tag-row">
                    <span className="crc-session-pill">
                      <Video size={12} /> {rev.sessionType}
                    </span>
                  </div>

                  <p className="crc-comment-text">
                    "{rev.comment}"
                  </p>

                  <div className="crc-footer-actions">
                    <div className="crc-helpful-tag">
                      <ThumbsUp size={13} className="text-emerald-600" />
                      <span>Verified {BRAND.name} session</span>
                    </div>

                    <div className="crc-action-buttons">
                      <button 
                        type="button" 
                        className="btn-crc-action"
                        onClick={() => showToast('💬 Thank You Sent!', `Sent a direct thank you note to ${rev.candidateName}.`, 'success')}
                      >
                        <Heart size={13} className="text-rose-500" />
                        <span>Send Thank You</span>
                      </button>

                      <button 
                        type="button" 
                        className="btn-crc-action"
                        onClick={() => showToast('⭐ Review Pinned!', `This review is now spotlighted on your public mentor page.`, 'success')}
                      >
                        <Star size={13} className="text-amber-500" />
                        <span>Feature on Profile</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

        </div>
      )}

      {activeTab === 'availability' && (
        <div className="mentor-settings-panel-card">
          <div className="msp-section-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className="msp-section-title">Weekly Mentorship Availability & Slots</h3>
                {isEditingAvailability ? (
                  <span className="msp-status-pill-editing">
                    <Sparkles size={12} /> Editing Mode
                  </span>
                ) : (
                  <span className="msp-status-pill-locked">
                    <Lock size={12} /> Live & Saved
                  </span>
                )}
              </div>
              <p className="msp-section-desc">
                {isEditingAvailability 
                  ? 'Click on days or slots below to toggle active hours. Add custom slots or change buffer times.' 
                  : 'Your active weekly schedule for candidate bookings. Click "Edit Availability" to make changes.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isEditingAvailability ? (
                <>
                  <button 
                    type="button" 
                    className="btn-cancel-sm"
                    onClick={handleCancelAvailability}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn-shine-gold-sm"
                    onClick={handleSaveAvailability}
                  >
                    <Check size={14} /> Save Availability
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className="btn-edit-mode-toggle"
                  onClick={() => setIsEditingAvailability(true)}
                >
                  <Edit2 size={14} />
                  <span>Edit Availability</span>
                </button>
              )}
            </div>
          </div>

          {/* 1. Active Working Days of Week */}
          <div className="msp-form-group">
            <label className="msp-label">
              <span>Active Working Days</span>
              <span className="msp-label-hint">
                {isEditingAvailability ? 'Click days to toggle active availability' : 'Currently active days'}
              </span>
            </label>
            <div className="msp-days-selector-grid">
              {daysOfWeek.map(({ key, label }) => {
                const isSelected = selectedDays.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`msp-day-chip ${isSelected ? 'day-selected' : 'day-unselected'}`}
                    onClick={() => {
                      if (!isEditingAvailability) {
                        setIsEditingAvailability(true);
                      }
                      toggleDay(key);
                    }}
                  >
                    <span className="day-key">{key}</span>
                    <span className="day-full">{label}</span>
                    {isSelected && <span className="day-check-icon"><Check size={12} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Daily Time Slots Grid */}
          <div className="msp-form-group" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="msp-label" style={{ margin: 0 }}>
                <span>Available Time Slots ({activeSlots.length} Active)</span>
                <span className="msp-label-hint">
                  {isEditingAvailability ? 'Click slots to toggle Active / Disabled' : 'Slots open on candidate booking calendar'}
                </span>
              </label>
            </div>

            <div className="mac-slots-grid">
              {standardAvailableSlots.map((slot) => {
                const isSelected = activeSlots.includes(slot);
                return (
                  <button
                    type="button"
                    key={slot}
                    className={`mac-slot-toggle ${isSelected ? 'slot-enabled' : 'slot-disabled'}`}
                    onClick={() => {
                      if (!isEditingAvailability) {
                        setIsEditingAvailability(true);
                      }
                      toggleSlot(slot);
                    }}
                  >
                    <div className="mac-slot-left">
                      <Clock size={15} />
                      <span>{slot}</span>
                    </div>
                    <span className="mac-status-chip">
                      {isSelected ? <><Check size={12} /> Active</> : 'Disabled'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Add Custom Slot (Only in Edit Mode) */}
          {isEditingAvailability && (
            <div className="msp-custom-slot-row">
              <form onSubmit={handleAddCustomSlot} style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Clock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                  <input 
                    type="text" 
                    className="msp-input-with-icon" 
                    placeholder="e.g. 07:00 AM - 08:00 AM or 10:00 PM - 11:00 PM"
                    value={customSlotInput}
                    onChange={(e) => setCustomSlotInput(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-outline-dark-sm">
                  <Plus size={14} /> Add Custom Slot
                </button>
              </form>
            </div>
          )}

          {/* 4. Buffer & Booking Rules */}
          <div className="msp-preferences-grid" style={{ marginTop: '24px' }}>
            <div className="msp-pref-box">
              <label className="msp-pref-label">Buffer Time Between Calls</label>
              <p className="msp-pref-desc">Time break between consecutive video sessions</p>
              {isEditingAvailability ? (
                <div className="msp-pill-selector">
                  {[10, 15, 30].map(mins => (
                    <button 
                      key={mins} 
                      type="button" 
                      className={`msp-pill-btn ${bufferMinutes === mins ? 'active' : ''}`}
                      onClick={() => setBufferMinutes(mins)}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              ) : (
                <span className="msp-readonly-tag">⏱️ {bufferMinutes} mins buffer</span>
              )}
            </div>

            <div className="msp-pref-box">
              <label className="msp-pref-label">Minimum Advance Notice</label>
              <p className="msp-pref-desc">How early candidate must book before session starts</p>
              {isEditingAvailability ? (
                <div className="msp-pill-selector">
                  {[1, 2, 6, 24].map(hours => (
                    <button 
                      key={hours} 
                      type="button" 
                      className={`msp-pill-btn ${minNoticeHours === hours ? 'active' : ''}`}
                      onClick={() => setMinNoticeHours(hours)}
                    >
                      {hours} {hours === 1 ? 'hour' : 'hours'}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="msp-readonly-tag">🔔 Minimum {minNoticeHours} {minNoticeHours === 1 ? 'hour' : 'hours'} advance notice</span>
              )}
            </div>
          </div>

          <div className="mac-footer-note" style={{ marginTop: '20px' }}>
            <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
            <span>All schedule updates are automatically synced to candidate booking modals in real-time.</span>
          </div>
        </div>
      )}

      {activeTab === 'profile-settings' && (
        <div className="mentor-profile-pricing-wrapper">
          {/* Top Bar Header */}
          <div className="mpp-header-bar">
            <div>
              <div className="mpp-header-title-row">
                <h2 className="mpp-main-title">Profile & Pricing</h2>
                {isEditingProfile ? (
                  <span className="mpp-badge-editing">
                    <Sparkles size={13} /> Editing Mode
                  </span>
                ) : (
                  <span className="mpp-badge-live">
                    <Check size={13} /> Live on {BRAND.name}
                  </span>
                )}
              </div>
              <p className="mpp-main-subtitle">
                Manage your public bio, 60-second video pitch, 1:1 session offerings, and direct payout account.
              </p>
            </div>

            <div className="mpp-header-actions">
              {isEditingProfile ? (
                <>
                  <button 
                    type="button" 
                    className="mpp-btn-secondary"
                    onClick={handleCancelProfile}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="mpp-btn-primary"
                    onClick={handleSaveAllSettings}
                  >
                    <Check size={14} /> Save Changes
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className="mpp-btn-edit"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Edit2 size={13} />
                  <span>Edit Profile & Rates</span>
                </button>
              )}
            </div>
          </div>

          {/* CARD 1: PROFILE IDENTITY & VIDEO PITCH (Bento Card) */}
          <div className="mpp-card" id="mpp-video-card">
            <div className="mpp-card-header">
              <div className="mpp-card-header-left">
                <div className="mpp-card-icon-pill icon-purple">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="mpp-card-title">Profile & 60s Video Pitch</h3>
                  <p className="mpp-card-subtitle">Your public mentor identity and candidate introduction</p>
                </div>
              </div>
              {hasTeaserVideo && (
                <span className="mpp-pill-meta">
                  <Film size={12} /> 60s Reel Attached
                </span>
              )}
            </div>

            <div className="mpp-bento-grid">
              {/* Left Bento: 60s Video Teaser */}
              <div className="mpp-video-bento">
                <label className="mpp-field-label">
                  <Film size={13} />
                  <span>60s Video Pitch Reel</span>
                </label>

                {hasTeaserVideo && teaserVideoUrl ? (
                  <div className="mpp-video-box">
                    <div 
                      className={`mpp-video-frame ${isDragOver ? 'drag-active' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleVideoFileDrop}
                    >
                      {isUploadingVideo ? (
                        <div className="mpp-video-loading">
                          <Loader2 size={24} className="animate-spin text-purple-400" />
                          <span>Processing video...</span>
                        </div>
                      ) : (
                        <video 
                          controls 
                          poster={mentorAvatar}
                          src={teaserVideoUrl}
                          className="mpp-video-player"
                        />
                      )}
                      <div className="mpp-video-overlay-pill">0:58 min • 1080p</div>
                    </div>

                    {isEditingProfile ? (
                      <div className="mpp-video-edit-toolbar">
                        <button 
                          type="button" 
                          className="mpp-video-action-btn"
                          onClick={handleTriggerVideoUpload}
                        >
                          <Upload size={12} /> Replace Video
                        </button>
                        <button 
                          type="button" 
                          className="mpp-video-action-btn danger"
                          onClick={handleDeleteTeaserVideo}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="mpp-video-title-strip">
                        <span className="mpp-video-title-text">"{teaserTitle}"</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty state */
                  <div 
                    className={`mpp-video-empty ${isDragOver ? 'drag-active' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleVideoFileDrop}
                  >
                    <div className="mpp-empty-icon-wrap">
                      <Film size={22} className="text-purple-600" />
                    </div>
                    <strong>No Video Pitch Added</strong>
                    <p>Mentors with a 60s pitch get 3.4x more bookings.</p>
                    {isEditingProfile ? (
                      <div className="mpp-empty-actions">
                        <button 
                          type="button" 
                          className="mpp-btn-sm-upload"
                          onClick={handleTriggerVideoUpload}
                        >
                          <Upload size={12} /> Upload Video
                        </button>
                        <button 
                          type="button" 
                          className="mpp-btn-sm-sample"
                          onClick={() => {
                            setTeaserVideoUrl(videoPresets[0].url);
                            setTeaserTitle(videoPresets[0].title);
                            setUploadedVideoName('Product Leadership Pitch.mp4');
                            setHasTeaserVideo(true);
                            showToast('Sample Pitch Loaded', 'Loaded standard product leadership teaser reel.', 'success');
                          }}
                        >
                          <Play size={11} /> Load Sample
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className="mpp-btn-edit-sm"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit2 size={11} /> Add Video Pitch
                      </button>
                    )}
                  </div>
                )}

                {/* In edit mode, presets dropdown */}
                {isEditingProfile && hasTeaserVideo && (
                  <div className="mpp-presets-compact">
                    <label className="mpp-sub-label">Or pick sample pitch:</label>
                    <div className="mpp-preset-chips">
                      {videoPresets.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          className={`mpp-preset-chip ${teaserVideoUrl === preset.url ? 'active' : ''}`}
                          onClick={() => {
                            setTeaserVideoUrl(preset.url);
                            setTeaserTitle(preset.title);
                            setUploadedVideoName(preset.name + '.mp4');
                            setHasTeaserVideo(true);
                          }}
                        >
                          <Play size={10} /> {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Bento: Headline, Bio & Expertise Tags */}
              <div className="mpp-details-bento">
                <div className="mpp-field-group">
                  <label className="mpp-field-label">
                    <span>Professional Headline & Past Companies</span>
                  </label>
                  {isEditingProfile ? (
                    <input 
                      type="text" 
                      className="mpp-input-text" 
                      value={headlineInput}
                      onChange={(e) => setHeadlineInput(e.target.value)}
                      placeholder="e.g. Lead Product Manager @ Shine (HT Media) • Ex-Paytm, Flipkart"
                    />
                  ) : (
                    <div className="mpp-readonly-text-bold">{headlineInput}</div>
                  )}
                </div>

                <div className="mpp-field-group">
                  <label className="mpp-field-label">
                    <span>About & Mentorship Approach</span>
                  </label>
                  {isEditingProfile ? (
                    <textarea 
                      className="mpp-textarea" 
                      rows={3}
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      placeholder="Explain how you help candidates with 1:1 mentorship, CV reviews, and interview prep..."
                    />
                  ) : (
                    <div className="mpp-readonly-bio">{bioInput}</div>
                  )}
                </div>

                <div className="mpp-field-group">
                  <label className="mpp-field-label">
                    <span>Domain Specialties & Keywords</span>
                  </label>
                  <div className="mpp-skills-wrap">
                    {skillsList.map(skill => (
                      <span key={skill} className="mpp-skill-tag">
                        <span>{skill}</span>
                        {isEditingProfile && (
                          <button 
                            type="button" 
                            className="mpp-skill-del"
                            onClick={() => handleRemoveSkill(skill)}
                            title="Remove specialty"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {isEditingProfile && (
                    <form onSubmit={handleAddSkill} className="mpp-add-skill-form">
                      <input 
                        type="text" 
                        className="mpp-input-tag" 
                        placeholder="Add skill (e.g. System Design)" 
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                      />
                      <button type="submit" className="mpp-btn-add-tag">
                        <Plus size={12} /> Add
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: 1:1 SESSION OFFERINGS & CUSTOM PRICING */}
          <div className="mpp-card" id="mpp-session-offerings-card">
            <div className="mpp-card-header">
              <div className="mpp-card-header-left">
                <div className="mpp-card-icon-pill icon-emerald">
                  <DollarSign size={17} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="mpp-card-title">1:1 Session Offerings & Pricing</h3>
                    <span className="mpp-badge-count">{sessionOfferings.filter(o => o.isEnabled).length} Active Offerings</span>
                  </div>
                  <p className="mpp-card-subtitle">Candidates book directly from your profile. 0% platform fee & automated payouts.</p>
                </div>
              </div>

              <div className="mpp-card-header-right">
                {/* Instant Booking Toggle */}
                <div className="mpp-instant-toggle-wrap">
                  <div className="mpp-instant-text">
                    <Zap size={14} className="text-amber-500" />
                    <span>Instant Booking</span>
                  </div>
                  <div 
                    className={`mpp-toggle-switch ${isInstantBookingEnabled ? 'on' : 'off'} ${!isEditingProfile ? 'disabled' : ''}`}
                    onClick={() => {
                      if (isEditingProfile) setIsInstantBookingEnabled(!isInstantBookingEnabled);
                    }}
                    title={isInstantBookingEnabled ? 'Instant Booking Enabled' : 'Manual Approval Required'}
                  >
                    <div className="mpp-toggle-knob" />
                  </div>
                </div>

                {isEditingProfile && (
                  <button 
                    type="button" 
                    className="mpp-btn-add-offering"
                    onClick={handleAddOffering}
                  >
                    <Plus size={13} /> Add Offering
                  </button>
                )}
              </div>
            </div>

            {/* Offerings Grid */}
            <div className="mpp-offerings-grid">
              {sessionOfferings.map((offering) => (
                <div 
                  key={offering.id} 
                  className={`mpp-offering-box ${!offering.isEnabled ? 'is-paused' : ''} ${getOfferingAccentClass(offering.icon)}`}
                >
                  {isEditingProfile ? (
                    /* Edit Mode Offering Form */
                    <div className="mpp-offering-edit-body">
                      <div className="mpp-oeb-top">
                        <select 
                          className="mpp-select-category"
                          value={offering.category}
                          onChange={(e) => handleCategoryChange(offering.id, e.target.value)}
                        >
                          {availableSessionCategories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>

                        <select 
                          className="mpp-select-duration"
                          value={offering.duration}
                          onChange={(e) => handleUpdateOffering(offering.id, 'duration', e.target.value)}
                        >
                          <option value="30 Mins">30m</option>
                          <option value="45 Mins">45m</option>
                          <option value="60 Mins">60m</option>
                          <option value="90 Mins">90m</option>
                        </select>

                        <button 
                          type="button" 
                          className="mpp-btn-del-offering"
                          onClick={() => handleDeleteOffering(offering.id)}
                          title="Delete offering"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="mpp-form-group">
                        <label className="mpp-sub-label">Session Title</label>
                        <input 
                          type="text" 
                          className="mpp-input-offering-title"
                          value={offering.title}
                          onChange={(e) => handleUpdateOffering(offering.id, 'title', e.target.value)}
                          placeholder="Session Title"
                        />
                      </div>

                      <div className="mpp-form-group">
                        <label className="mpp-sub-label">Focus Area / Tag</label>
                        <input 
                          type="text" 
                          className="mpp-input-tag" 
                          value={offering.tag}
                          onChange={(e) => handleUpdateOffering(offering.id, 'tag', e.target.value)}
                          placeholder="e.g. Deep CV Audit"
                        />
                      </div>

                      <div className="mpp-form-group">
                        <label className="mpp-sub-label">What candidate receives</label>
                        <textarea 
                          className="mpp-textarea-offering-desc"
                          rows={2}
                          value={offering.description}
                          onChange={(e) => handleUpdateOffering(offering.id, 'description', e.target.value)}
                          placeholder="Session description..."
                        />
                      </div>

                      <div className="mpp-oeb-footer">
                        <div className="mpp-price-input-group">
                          <span className="mpp-curr-sym">₹</span>
                          <input 
                            type="number" 
                            className="mpp-input-price-val" 
                            value={offering.price}
                            onChange={(e) => handleUpdateOffering(offering.id, 'price', Number(e.target.value))}
                          />
                          <span className="mpp-tag-fee-zero">0% Fee</span>
                        </div>

                        <button 
                          type="button"
                          className={`mpp-btn-toggle-status ${offering.isEnabled ? 'active' : 'paused'}`}
                          onClick={() => handleToggleOffering(offering.id)}
                        >
                          {offering.isEnabled ? '✓ Active' : '⏸ Paused'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Readonly Premium Modern Offering Card */
                    <div className="mpp-offering-view-body">
                      {/* Top Accent & Header */}
                      <div className="mpp-ovb-header">
                        <div className={`mpp-ovb-icon-wrap ${getIconClass(offering.icon)}`}>
                          {renderOfferingIcon(offering.icon)}
                        </div>
                        <div className="mpp-ovb-header-text">
                          <div className="mpp-ovb-badges">
                            <span className="mpp-ovb-duration-pill">
                              <Clock size={11} /> {offering.duration}
                            </span>
                            <span className="mpp-ovb-tag-pill">{offering.tag}</span>
                          </div>
                        </div>
                        <div className="mpp-ovb-status-wrap">
                          {offering.isEnabled ? (
                            <span className="mpp-status-dot-active" title="Bookable on Public Listing">
                              <span className="mpp-dot-pulse" /> Active
                            </span>
                          ) : (
                            <span className="mpp-tag-paused">Paused</span>
                          )}
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <h4 className="mpp-ovb-title">{offering.title}</h4>
                      <p className="mpp-ovb-desc">{offering.description}</p>

                      {/* Key Deliverables Checkpoints */}
                      <div className="mpp-ovb-deliverables-list">
                        {getOfferingHighlights(offering).map((highlight, idx) => (
                          <div key={idx} className="mpp-ovb-deliverable-item">
                            <CheckCircle2 size={12} className="mpp-check-icon" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>

                      {/* Pricing & Guarantee Footer */}
                      <div className="mpp-ovb-footer">
                        <div className="mpp-ovb-price-wrap">
                          <span className="mpp-ovb-price">₹{offering.price}</span>
                          <span className="mpp-ovb-period">/ session</span>
                        </div>
                        <span className="mpp-tag-fee-zero">
                          <ShieldCheck size={11} /> 0% Fee
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isEditingProfile && (
                <button 
                  type="button" 
                  className="mpp-btn-add-offering-placeholder"
                  onClick={handleAddOffering}
                >
                  <Plus size={20} className="text-purple-600" />
                  <span>Add New Session Offering</span>
                  <small>Custom 1:1, mock interview or review</small>
                </button>
              )}
            </div>
          </div>

          {/* CARD 3: DIRECT PAYOUTS & BANK / UPI ACCOUNT */}
          <div className="mpp-card" id="mpp-payout-card">
            <div className="mpp-card-header">
              <div className="mpp-card-header-left">
                <div className="mpp-card-icon-pill icon-blue">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="mpp-card-title">Direct Payouts & Settlement</h3>
                  <p className="mpp-card-subtitle">Automated direct bank or UPI transfer. {BRAND.name} charges 0% commission.</p>
                </div>
              </div>

              <span className="mpp-tag-payout-verified">
                <ShieldCheck size={13} /> 100% Direct Payout
              </span>
            </div>

            <div className="mpp-payout-content">
              {isEditingProfile && (
                <div className="mpp-payout-tabs">
                  <button 
                    type="button" 
                    className={`mpp-payout-tab ${payoutMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setPayoutMethod('upi')}
                  >
                    UPI ID (Instant Settlement)
                  </button>
                  <button 
                    type="button" 
                    className={`mpp-payout-tab ${payoutMethod === 'bank' ? 'active' : ''}`}
                    onClick={() => setPayoutMethod('bank')}
                  >
                    Bank Account (NEFT / IMPS)
                  </button>
                </div>
              )}

              {payoutMethod === 'upi' ? (
                <div className="mpp-payout-grid">
                  <div className="mpp-field-group">
                    <label className="mpp-field-label">Linked UPI ID</label>
                    {isEditingProfile ? (
                      <input 
                        type="text" 
                        className="mpp-input-text" 
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. akash@okaxis"
                      />
                    ) : (
                      <div className="mpp-readonly-payout-box">
                        <span className="mpp-payout-val">{upiId}</span>
                        <span className="mpp-tag-payout-status">✓ Active UPI</span>
                      </div>
                    )}
                  </div>
                  <div className="mpp-field-group">
                    <label className="mpp-field-label">Beneficiary Account Name</label>
                    {isEditingProfile ? (
                      <input 
                        type="text" 
                        className="mpp-input-text" 
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                      />
                    ) : (
                      <div className="mpp-readonly-payout-box">
                        <span className="mpp-payout-val">{accountHolder}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mpp-payout-grid">
                  <div className="mpp-field-group">
                    <label className="mpp-field-label">Bank Account Number</label>
                    {isEditingProfile ? (
                      <input 
                        type="text" 
                        className="mpp-input-text" 
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                      />
                    ) : (
                      <div className="mpp-readonly-payout-box">
                        <span className="mpp-payout-val">{bankAccount}</span>
                        <span className="mpp-tag-payout-status">✓ Linked Bank</span>
                      </div>
                    )}
                  </div>
                  <div className="mpp-field-group">
                    <label className="mpp-field-label">Bank IFSC Code</label>
                    {isEditingProfile ? (
                      <input 
                        type="text" 
                        className="mpp-input-text" 
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                      />
                    ) : (
                      <div className="mpp-readonly-payout-box">
                        <span className="mpp-payout-val">{ifscCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Save Bar when Editing */}
          {isEditingProfile && (
            <div className="mpp-bottom-save-bar">
              <button 
                type="button" 
                className="mpp-btn-secondary"
                onClick={handleCancelProfile}
                style={{ padding: '9px 18px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="mpp-btn-primary"
                onClick={handleSaveAllSettings}
                style={{ padding: '9px 22px', fontSize: '13px' }}
              >
                <Check size={15} /> Save All Profile & Rates
              </button>
            </div>
          )}
        </div>
      )}

        </main>
      </div>

      {isDossierModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container-dossier" style={{ maxWidth: '680px', width: '90%', background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7C3AED', background: '#F3E8FF', padding: '2px 8px', borderRadius: '4px' }}>
                  ⚡ Candidate Profile &amp; AI Briefing
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '6px 0 0 0' }}>
                  Candidate Profile & Transition Roadmap
                </h2>
              </div>
              <button 
                type="button" 
                onClick={() => setIsDossierModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {isLoadingDossier || !selectedDossier ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader2 size={32} className="animate-spin text-purple-600 mb-2" />
                <p style={{ color: '#64748B' }}>Synthesizing candidate resume & gap analysis...</p>
              </div>
            ) : (
              <div>
                {/* Candidate Overview Card */}
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{selectedDossier.candidate.name}</h3>
                      <p style={{ margin: '2px 0 8px 0', fontSize: '13px', color: '#64748B' }}>
                        {[selectedDossier.candidate.designation || selectedDossier.candidate.headline,
                          selectedDossier.candidate.currentCompany,
                          selectedDossier.candidate.experienceYears].filter(Boolean).join(' • ') || 'Profile details not added yet'}
                      </p>
                      {selectedDossier.candidate.resumeFileName ? (
                        <a href={peerpathApi.candidateResumeUrl(selectedDossier.sessionId)} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600, color: '#6D28D9' }}>
                          <Download size={13} /> Download resume ({selectedDossier.candidate.resumeFileName})
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>No resume uploaded</span>
                      )}
                    </div>
                    <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                      Target: {selectedDossier.gapReport.targetJump}
                    </span>
                  </div>
                  <p style={{ margin: '0', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                    {selectedDossier.candidate.summary}
                  </p>
                </div>

                {/* Missing Skills to Drill On */}
                <div style={{ marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🚨 Missing High-Leverage Skills (Drill on these during call):
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedDossier.gapReport.missingSkills.map((skill, idx) => (
                      <span key={idx} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Suggested Interview Discussion Prompts */}
                <div style={{ marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} className="text-amber-500" /> AI Suggested Discussion Prompts (Ask Candidate):
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDossier.quickDiscussionPrompts.map((prompt, idx) => (
                      <div key={idx} style={{ background: '#EFF6FF', borderLeft: '3px solid #3B82F6', padding: '10px 12px', borderRadius: '4px', fontSize: '13px', color: '#1E40AF' }}>
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                  <button 
                    type="button" 
                    className="btn-outline-dark-sm"
                    onClick={() => setIsDossierModalOpen(false)}
                  >
                    Close Profile
                  </button>
                  <button 
                    type="button" 
                    className="btn-shine-gold-sm"
                    onClick={() => {
                      setIsDossierModalOpen(false);
                      const targetSess = upcomingMentorSessions.find(s => s.id === selectedDossier.sessionId);
                      if (targetSess) handleHostCall(targetSess);
                    }}
                  >
                    <Video size={14} /> Start Call Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
