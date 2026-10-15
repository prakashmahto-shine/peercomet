import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Expert, MentorshipSession, PeerVerifiedBadge, UserProfileData, ViewType, 
  UserAccount, PeerpathJobContext, BootcampMasterclass, NamedExpertInvite,
  CommunityPost, CommunityComment, CommunityNotification,
  ResumeUploadResult
} from '../types';
import { peerpathApi, API_BASE, apiFetch, AuthUser } from '../services/api';
import { pathToView, viewToPath } from '../routes';
import { BRAND } from '../config/brand';
import { isProfileComplete } from '../utils/profile';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  description?: string;
}

interface AppContextType {
  // Navigation
  currentView: ViewType;
  previousView: ViewType;
  navigate: (view: ViewType, customPath?: string) => void;

  // Authentication & Dual Roles (Prakash ⇄ Akash ⇄ Nisha)
  currentUser: UserAccount | null;
  isLoggedIn: boolean;
  // True until the initial session check (/api/auth/me) has finished
  isAuthLoading: boolean;
  // Email code sign-in / sign-up. requestOtp returns null on error (a toast is shown).
  requestOtp: (email: string) => Promise<{ requestId: string; isRegistered: boolean } | null>;
  verifyOtp: (params: { requestId: string; email: string; otp: string; name?: string; mobile?: string }) => Promise<boolean>;
  logout: (redirectToAdmin?: boolean) => void;

  // Experts & Mentors
  experts: Expert[];
  selectedExpert: Expert;
  setSelectedExpert: (expert: Expert) => void;
  selectExpertById: (expertId: string) => void;
  addExpert: (expert: Omit<Expert, 'id'> | Expert) => Promise<Expert | null>;

  // Sessions Management
  sessions: MentorshipSession[];
  activeSession: MentorshipSession | null;
  setActiveSession: (session: MentorshipSession | null) => void;
  bookSession: (expert: Expert, date: string, timeSlot: string, sessionType?: string) => Promise<MentorshipSession | null>;
  cancelSession: (sessionId: string) => Promise<boolean>;
  rescheduleSession: (sessionId: string, newDate: string, newTimeSlot: string) => Promise<boolean>;
  // Mentor's assessment: rating of the candidate + peer badge. Only from MentorAssessmentModal.
  completeSession: (sessionId: string, rating: number, notes: string, badgeTitle?: string, skillsVerified?: string[]) => Promise<boolean>;
  // Call ended: marks the session as held, no badge
  markSessionHeld: (sessionId: string) => Promise<void>;
  // Candidate's rating & review of the mentor
  submitSessionReview: (sessionId: string, rating: number, comment: string) => Promise<boolean>;

  // Candidate Profile Data
  userProfile: UserProfileData;
  updateUserProfile: (profile: Partial<UserProfileData>) => void;
  // Saves profile fields on the server; resolves false (and shows a toast) on error
  updateFullProfile: (profile: Partial<UserProfileData>) => Promise<boolean>;
  updateProfileSummary: (summary: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  awardBadge: (badge: PeerVerifiedBadge) => void;
  updateJobSearchStatus: (status: string) => void;

  // Mentor Settings & Teaser Video
  mentorAvailability: { days: string[]; timeSlots: string[] };
  updateMentorAvailability: (days: string[], timeSlots: string[]) => void;
  updateMentorRatesAndAvailability: (rate: number, duration: number, days: string[], timeSlots: string[]) => void;
  updateMentorTeaserVideo: (teaser: { url: string; title: string; duration?: string; thumbnail?: string; uploadedAt?: string } | null) => void;

  // Creator / Mentor Studio Mode (Candidate View ⇄ Creator Studio)
  isCreatorMode: boolean;
  setIsCreatorMode: (enabled: boolean) => void;
  toggleCreatorMode: () => void;
  creatorActiveTab: 'bookings' | 'reviews' | 'availability' | 'profile-settings' | 'teaser' | 'pricing' | 'history';
  setCreatorActiveTab: (tab: 'bookings' | 'reviews' | 'availability' | 'profile-settings' | 'teaser' | 'pricing' | 'history') => void;
  navigateToCreatorStudio: (tab?: 'bookings' | 'reviews' | 'availability' | 'profile-settings' | 'teaser' | 'pricing' | 'history') => void;

  // Modals
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (open: boolean) => void;
  isCreatorWizardOpen: boolean;
  setIsCreatorWizardOpen: (open: boolean) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  isAssessmentModalOpen: boolean;
  setIsAssessmentModalOpen: (open: boolean) => void;
  isCvSyncModalOpen: boolean;
  setIsCvSyncModalOpen: (open: boolean) => void;
  isUpdateProfileModalOpen: boolean;
  setIsUpdateProfileModalOpen: (open: boolean) => void;
  pendingBookingCheckout: boolean;
  setPendingBookingCheckout: (pending: boolean) => void;
  // Uploads the resume file; returns the fields found in it (not saved until the user saves the form)
  uploadResume: (file: File) => Promise<ResumeUploadResult | null>;
  removeCandidateResume: () => Promise<void>;
  // Hand-off from the CV upload modal to the profile form, which pre-fills from it
  resumeExtract: ResumeUploadResult | null;
  setResumeExtract: (result: ResumeUploadResult | null) => void;
  assessmentDraftSession: MentorshipSession | null;
  setAssessmentDraftSession: (session: MentorshipSession | null) => void;
  bookingDraft: { expert: Expert; date: string; timeSlot: string; attachedCvName?: string; sessionType?: string; amount?: number; duration?: string };
  setBookingDraft: React.Dispatch<React.SetStateAction<{ expert: Expert; date: string; timeSlot: string; attachedCvName?: string; sessionType?: string; amount?: number; duration?: string }>>;

  // Trajectory Calibration (10-Second Candidate Onboarding)
  isCalibrationModalOpen: boolean;
  setIsCalibrationModalOpen: (open: boolean) => void;
  // Saves the career goal (registration step 2); resolves false on error
  calibrateCandidateProfile: (data: {
    currentRole: string;
    currentCompany: string;
    dreamCompany: string;
    targetRole: string;
    domain?: string;
    targetCtc?: string;
  }) => Promise<boolean>;

  // First Cohort: Bootcamps & Named Expert Invites
  bootcamps: BootcampMasterclass[];
  registeredBootcampIds: string[];
  registerForBootcamp: (bootcampId: string) => void;

  // Global Search & Toast Notifications
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedJobCategory: string;
  setSelectedJobCategory: (category: string) => void;
  peerpathJobContext: PeerpathJobContext | null;
  setPeerpathJobContext: (ctx: PeerpathJobContext | null) => void;
  clearPeerpathJobContext: () => void;
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Mentor Follow System
  followedMentorIds: string[];
  toggleFollowMentor: (mentorId: string, mentorName?: string) => void;
  isFollowingMentor: (mentorId: string) => boolean;

  // Community & Mentor Insights System
  communityPosts: CommunityPost[];
  createMentorPost: (postData: { title: string; content: string; tags: string[] }) => CommunityPost | null;
  addPostComment: (postId: string, content: string) => CommunityComment | null;
  togglePostLike: (postId: string) => void;
  toggleCommentLike: (postId: string, commentId: string) => void;

  // Community Notifications (🔔)
  notifications: CommunityNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

// Shown until the signed-in user's profile has loaded from the server
const EMPTY_PROFILE: UserProfileData = {
  name: '',
  headline: '',
  experienceYears: '',
  location: '',
  profileScore: 0,
  jobSearchStatus: '',
  summary: '',
  skills: [],
  badges: [],
  email: '',
  phone: ''
};

// Maps the backend candidate profile (CandidateProfile in schemas.py) onto the UI profile shape
const profileFromServer = (raw: any): UserProfileData => ({
  ...EMPTY_PROFILE,
  ...raw,
  skills: raw?.skills || [],
  badges: raw?.badges || [],
  currentCompany: raw?.currentCompany || raw?.pastCompany,
  dreamCompany: raw?.dreamCompany || raw?.targetCompany
});

// Bootcamps are listed only when real ones are scheduled
const initialBootcamps: BootcampMasterclass[] = [];

// Placeholder until a mentor is selected; deliberately empty (no sample person)
const EMPTY_EXPERT: Expert = {
  id: '',
  name: '',
  role: '',
  company: '',
  domain: '',
  experience: '',
  rating: 0,
  reviewsCount: 0,
  sessionsCount: 0,
  price: 0,
  location: '',
  duration: '',
  avatar: '',
  videoPoster: '',
  teaserTitle: '',
  skills: [],
  bio: '',
  verifiedEmail: '',
  isVerifiedEmployer: false
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Dual User Management
  // Authentication: the session is an httpOnly cookie; the user is loaded from /api/auth/me
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const isLoggedIn = currentUser !== null;

  const getInitialRoute = () => {
    try {
      const parsed = pathToView(window.location.pathname);
      return parsed;
    } catch {
      return null;
    }
  };

  // Navigation
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const initRoute = getInitialRoute();
    if (initRoute) return initRoute.view;
    if (!currentUser) return 'login-view';
    if (currentUser.role === 'mentor') return 'mentor-dashboard-view';
    return 'guidance-view';
  });
  const [previousView, setPreviousView] = useState<ViewType>('guidance-view');
  
  // Dynamic Experts (Fetched from backend API on mount)
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<Expert>(EMPTY_EXPERT);
  
  // Dynamic Sessions
  // Sessions always come from the backend for the logged-in user (see effect below)
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  
  const [activeSession, setActiveSession] = useState<MentorshipSession | null>(null);

  // Candidate profiles keyed by user id (only the signed-in user's in practice), loaded from the server
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileData>>({});

  // Fetch live creators and sessions from backend API on startup
  useEffect(() => {
    let isCurrent = true;
    const initRoute = getInitialRoute();
    const targetExpertId = initRoute?.expertId;

    peerpathApi.getCreators().then(fetched => {
      if (isCurrent && fetched && fetched.length > 0) {
        setExperts(fetched);
        if (targetExpertId) {
          const matched = fetched.find(e => e.id.toLowerCase() === targetExpertId.toLowerCase());
          if (matched) {
            setSelectedExpert(matched);
            setBookingDraft(prev => ({ ...prev, expert: matched }));
            return;
          }
        }
        setSelectedExpert(prev => (prev?.id ? prev : fetched[0] || EMPTY_EXPERT));
      }
    }).catch(err => console.log('[API getCreators]:', err));

    if (targetExpertId) {
      peerpathApi.getCreatorById(targetExpertId).then(creator => {
        if (isCurrent && creator) {
          setSelectedExpert(creator);
          setBookingDraft(prev => ({ ...prev, expert: creator }));
        }
      }).catch(err => console.log('[API getCreatorById]:', err));
    }

    return () => {
      isCurrent = false;
    };
  }, []);

  // Candidate's own bookings; refetched whenever the logged-in user changes
  useEffect(() => {
    if (!currentUser?.id) {
      setSessions([]);
      return;
    }
    let isCurrent = true;
    peerpathApi.getSessions(currentUser.id, 'candidate').then(fetchedSessions => {
      if (isCurrent) setSessions(fetchedSessions || []);
    }).catch(err => console.warn('[API getSessions]:', err));
    return () => {
      isCurrent = false;
    };
  }, [currentUser?.id]);

  const activeUsername = currentUser?.id || '';
  const userProfile: UserProfileData = userProfiles[activeUsername] || EMPTY_PROFILE;

  // Creator / Mentor Studio Mode
  const [isCreatorMode, setIsCreatorMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('shine_peerpath_creator_mode', JSON.stringify(isCreatorMode));
    } catch {}
  }, [isCreatorMode]);

  const toggleCreatorMode = () => {
    setIsCreatorMode(prev => !prev);
  };

  const [creatorActiveTab, setCreatorActiveTab] = useState<'bookings' | 'reviews' | 'availability' | 'profile-settings' | 'teaser' | 'pricing' | 'history'>('bookings');

  const navigateToCreatorStudio = (tab: 'bookings' | 'reviews' | 'availability' | 'profile-settings' | 'teaser' | 'pricing' | 'history' = 'bookings') => {
    setIsCreatorMode(true);
    setCreatorActiveTab(tab);
    navigate('mentor-dashboard-view');
  };

  // Mentor Availability
  const [mentorAvailability, setMentorAvailability] = useState<{ days: string[]; timeSlots: string[] }>({
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    timeSlots: ['10:00 AM - 11:00 AM', '02:00 PM - 03:00 PM', '06:30 PM - 07:30 PM', '08:00 PM - 09:00 PM']
  });

  // The logged-in mentor's creator id (a candidate who became a mentor gets a separate creator id)
  const mentorCreatorId = currentUser?.creatorId || currentUser?.id || '';

  // Load the mentor's saved availability from their creator record instead of local defaults
  useEffect(() => {
    const creator = experts.find(e => e.id.toLowerCase() === mentorCreatorId.toLowerCase());
    if (creator?.availability?.days?.length && creator.availability.timeSlots?.length) {
      setMentorAvailability({ days: creator.availability.days, timeSlots: creator.availability.timeSlots });
    }
  }, [experts, mentorCreatorId]);

  // Modals & UI Drafts
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isCreatorWizardOpen, setIsCreatorWizardOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState<boolean>(false);
  const [isCvSyncModalOpen, setIsCvSyncModalOpen] = useState<boolean>(false);
  const [isUpdateProfileModalOpen, setIsUpdateProfileModalOpen] = useState<boolean>(false);
  const [pendingBookingCheckout, setPendingBookingCheckout] = useState<boolean>(false);
  const [assessmentDraftSession, setAssessmentDraftSession] = useState<MentorshipSession | null>(null);

  const [bookingDraft, setBookingDraft] = useState<{ expert: Expert; date: string; timeSlot: string; attachedCvName?: string; sessionType?: string; amount?: number; duration?: string }>({
    expert: EMPTY_EXPERT,
    date: '',
    timeSlot: '',
    attachedCvName: '',
    sessionType: 'Career guidance',
    amount: 0,
    duration: '30 Mins'
  });

  const [resumeExtract, setResumeExtract] = useState<ResumeUploadResult | null>(null);

  // Uploads the resume; the server stores it and returns the fields it found
  const uploadResume = async (file: File): Promise<ResumeUploadResult | null> => {
    try {
      const result = await peerpathApi.uploadResume(file);
      setUserProfiles(prev => ({
        ...prev,
        [activeUsername]: {
          ...(prev[activeUsername] || userProfile),
          resumeFileName: result.resume.fileName,
          resumeUpdatedAt: result.resume.updatedAt
        }
      }));
      setBookingDraft(prev => ({ ...prev, attachedCvName: result.resume.fileName }));
      return result;
    } catch (err) {
      showToast('Could not upload resume', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return null;
    }
  };

  const removeCandidateResume = async () => {
    try {
      await peerpathApi.deleteResume();
    } catch (err) {
      showToast('Could not remove resume', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return;
    }
    setUserProfiles(prev => ({
      ...prev,
      [activeUsername]: { ...(prev[activeUsername] || userProfile), resumeFileName: '', resumeUpdatedAt: '' }
    }));
    setBookingDraft(prev => ({ ...prev, attachedCvName: '' }));
    showToast('🗑️ Resume Removed', 'Your resume has been removed.', 'info');
  };

  // Trajectory Calibration (10-Second Candidate Onboarding - Opens on user click)
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);


  const calibrateCandidateProfile = async (data: {
    currentRole: string;
    currentCompany: string;
    dreamCompany: string;
    targetRole: string;
    domain?: string;
    targetCtc?: string;
  }): Promise<boolean> => {
    const role = data.currentRole.trim();
    const company = data.currentCompany.trim();
    const goal = `Aspiring ${data.targetRole} @ ${data.dreamCompany}`;
    const updates: Partial<UserProfileData> = {
      headline: role && company ? `${role} @ ${company} ➔ ${goal}` : goal,
      // The goal form shows the current role from registration; keep edits in sync
      ...(role && company && !userProfile.currentlyNotWorking ? { designation: role, currentCompany: company } : {}),
      targetRole: data.targetRole,
      targetCompany: data.dreamCompany,
      dreamCompany: data.dreamCompany,
      ...(data.domain ? { domain: data.domain } : {}),
      ...(data.targetCtc ? { targetCtc: data.targetCtc } : {}),
      isCalibrated: true
    };
    try {
      const saved = await peerpathApi.updateCandidateProfile(activeUsername, updates);
      setUserProfiles(prev => ({ ...prev, [activeUsername]: { ...(prev[activeUsername] || userProfile), ...profileFromServer(saved) } }));
    } catch (err) {
      showToast('Could not save your goal', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
    setIsCalibrationModalOpen(false);
    showToast('🎯 Goal saved', `Showing mentors for ${data.targetRole} @ ${data.dreamCompany}.`, 'success');
    return true;
  };

  // First Cohort: Bootcamps & Named Expert Invites
  const [bootcamps] = useState<BootcampMasterclass[]>(initialBootcamps);
  const [registeredBootcampIds, setRegisteredBootcampIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shine_peerpath_registered_bootcamps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const registerForBootcamp = (bootcampId: string) => {
    if (registeredBootcampIds.includes(bootcampId)) {
      showToast('Already Enrolled', 'You already have a confirmed seat for this live transition sprint.', 'info');
      return;
    }

    // Strict 1-Time Free Sprint Limit per Candidate Profile
    if (registeredBootcampIds.length >= 1) {
      showToast(
        '⚠️ 1-Time Free Sprint Limit Reached',
        'Each candidate is entitled to 1 free transition campaign sprint. For continuous 1:1 mentorship and mock interviews, please book a 1:1 session.',
        'info'
      );
      return;
    }

    const updated = [...registeredBootcampIds, bootcampId];
    setRegisteredBootcampIds(updated);
    try {
      localStorage.setItem('shine_peerpath_registered_bootcamps', JSON.stringify(updated));
    } catch {}
    const bootcamp = bootcamps.find(b => b.id === bootcampId);
    showToast(
      `🎟️ 1-Time Free Pass Claimed!`,
      `Enrolled in "${bootcamp?.title || 'Transition Sprint'}". Live access link & blueprint sent to your email. (1-Time Free Benefit Used)`,
      'success'
    );
  };


  // Search & Global Toasts & Selected Job Category & Peerpath Context
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobCategory, setSelectedJobCategory] = useState<string>('all');
  const [peerpathJobContext, setPeerpathJobContext] = useState<PeerpathJobContext | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const clearPeerpathJobContext = () => {
    setPeerpathJobContext(null);
  };

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Mentor Follow System
  const [followedMentorIds, setFollowedMentorIds] = useState<string[]>([]);

  const isFollowingMentor = (mentorId: string) => {
    return followedMentorIds.includes(mentorId);
  };

  const toggleFollowMentor = (mentorId: string, mentorName?: string) => {
    const isCurrentlyFollowing = followedMentorIds.includes(mentorId);
    if (isCurrentlyFollowing) {
      setFollowedMentorIds(prev => prev.filter(id => id !== mentorId));
      showToast('Unfollowed Mentor', `You will no longer receive priority slot alerts for ${mentorName || 'this mentor'}.`, 'info');
    } else {
      setFollowedMentorIds(prev => [...prev, mentorId]);
      showToast(`🔔 Followed ${mentorName || 'Mentor'}!`, `You will get instant WhatsApp alerts whenever new 1:1 mentorship slots or group AMAs open.`, 'success');
    }
  };

  // Community & Mentor Insights System
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);

  // Initial load from backend API if available
  useEffect(() => {
    const fetchInitialCommunityData = async () => {
      try {
        const postsRes = await apiFetch(`${API_BASE}/community/posts`);
        if (postsRes.ok) {
          const json = await postsRes.json();
          if (json.success && Array.isArray(json.data)) {
            setCommunityPosts(json.data);
          }
        }
      } catch {
        // Fallback to local state if offline
      }

      if (!currentUser) {
        setNotifications([]);
        return;
      }
      try {
        // Scoped to the signed-in user by the server (session cookie)
        const notifRes = await apiFetch(`${API_BASE}/notifications`);
        if (notifRes.ok) {
          const notifJson = await notifRes.json();
          // Set even when empty, so a previous user's notifications don't linger after switching accounts
          if (notifJson.success && Array.isArray(notifJson.data)) {
            setNotifications(notifJson.data);
          }
        }
      } catch {
        // Fallback to local state if offline
      }
    };

    fetchInitialCommunityData();
  }, [currentUser?.id]);

  const createMentorPost = (postData: { title: string; content: string; tags: string[] }) => {
    const isMentor = currentUser?.role === 'mentor' || isCreatorMode;
    if (!isMentor || !currentUser) {
      showToast('Mentor Access Required', 'Only verified mentors can publish insights in Community.', 'warning');
      return null;
    }

    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      mentorId: currentUser.id || 'mentor',
      mentorName: currentUser.name,
      mentorRole: currentUser.headline || (isCreatorMode ? 'Verified Tech Lead & Mentor' : 'Mentor'),
      mentorCompany: currentUser.company || BRAND.name,
      mentorAvatar: currentUser.avatar || '/avatars/akash.jpg',
      title: postData.title,
      content: postData.content,
      tags: postData.tags.length > 0 ? postData.tags : ['Career Guidance', 'Tech Transition'],
      createdAt: 'Just now',
      likesCount: 0,
      commentsCount: 0,
      comments: [],
      analytics: {
        impressions: 48,
        reach: 36,
        engagements: 2,
        engagementRate: '4.2%',
        reactionsBreakdown: { likes: 0, hearts: 0, insightful: 0 },
        commentsCount: 0,
        repliesCount: 0,
        sharesCount: 0,
        profileClicks: 4,
        bookingsGenerated: 0,
        revenueGenerated: 0,
        topAudienceTitles: [
          { title: 'Senior Software Engineer', percentage: 50 },
          { title: 'Product Manager', percentage: 30 },
          { title: 'Tech Lead', percentage: 20 }
        ],
        topAudienceCompanies: [
          { company: 'Swiggy', percentage: 40 },
          { company: 'Amazon', percentage: 35 },
          { company: 'Razorpay', percentage: 25 }
        ],
        topLocations: [
          { city: 'Bengaluru', percentage: 65 },
          { city: 'Delhi NCR', percentage: 35 }
        ]
      }
    };

    setCommunityPosts(prev => [newPost, ...prev]);

    // Async sync with backend API
    apiFetch(`${API_BASE}/community/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mentorId: currentUser.id,
        mentorName: currentUser.name,
        mentorRole: newPost.mentorRole,
        mentorCompany: newPost.mentorCompany,
        mentorAvatar: newPost.mentorAvatar,
        title: postData.title,
        content: postData.content,
        tags: newPost.tags
      })
    }).catch(() => {});

    // Create notification for followers
    const newNotif: CommunityNotification = {
      id: `notif-${Date.now()}`,
      type: 'mentor_post',
      mentorId: currentUser.id,
      mentorName: currentUser.name,
      mentorAvatar: currentUser.avatar || '/avatars/akash.jpg',
      postId: newPost.id,
      title: 'New Post Published',
      message: `${currentUser.name} published a new insight: "${postData.title}"`,
      createdAt: 'Just now',
      isRead: false
    };

    setNotifications(prev => [newNotif, ...prev]);
    showToast('🎉 Post Published!', 'Your insight is live on the Community feed. All candidates following you have been notified.', 'success');
    return newPost;
  };

  const addPostComment = (postId: string, content: string) => {
    if (!currentUser) {
      showToast('Sign in required', 'Please sign in to join the discussion.', 'info');
      setIsLoginModalOpen(true);
      return null;
    }

    const isMentor = currentUser.role === 'mentor' || isCreatorMode;
    const newComment: CommunityComment = {
      id: `c-${Date.now()}`,
      postId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.headline || (isMentor ? 'Verified Mentor' : 'Candidate'),
      authorAvatar: currentUser.avatar || (isMentor ? '/avatars/akash.jpg' : '/brand/android-chrome-192x192.png'),
      authorIsMentor: isMentor,
      content: content.trim(),
      createdAt: 'Just now',
      likesCount: 0,
      likedByCurrentUser: false
    };

    setCommunityPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    }));

    // Async backend call
    apiFetch(`${API_BASE}/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: newComment.authorRole,
        authorAvatar: newComment.authorAvatar,
        authorIsMentor: isMentor,
        content: content.trim()
      })
    }).catch(() => {});

    showToast('💬 Comment Added', 'Your response has been posted to the mentor discussion thread.', 'success');
    return newComment;
  };

  const togglePostLike = (postId: string) => {
    setCommunityPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const liked = !p.likedByCurrentUser;
        return {
          ...p,
          likedByCurrentUser: liked,
          likesCount: liked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1)
        };
      }
      return p;
    }));

    if (currentUser?.id) {
      apiFetch(`${API_BASE}/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    }
  };

  const toggleCommentLike = (postId: string, commentId: string) => {
    setCommunityPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              const liked = !c.likedByCurrentUser;
              return {
                ...c,
                likedByCurrentUser: liked,
                likesCount: liked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
              };
            }
            return c;
          })
        };
      }
      return p;
    }));

    if (currentUser?.id) {
      apiFetch(`${API_BASE}/community/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    apiFetch(`${API_BASE}/notifications/${notificationId}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (currentUser?.id) {
      apiFetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    }
    showToast('All caught up!', 'All notifications marked as read.', 'info');
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    apiFetch(`${API_BASE}/notifications/${notificationId}`, { method: 'DELETE' }).catch(() => {});
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    if (currentUser?.id) {
      apiFetch(`${API_BASE}/notifications/clear-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    }
    showToast('Notifications Cleared', 'All community & mentor alerts have been removed.', 'info');
  };

  // View Navigation with URL sync & Smooth Scroll
  const navigate = (view: ViewType, customPath?: string) => {
    setPreviousView(currentView);
    setCurrentView(view);

    let pathToPush = customPath;
    if (!pathToPush) {
      if (view === 'expert-profile-view' && (window.location.pathname.startsWith('/expert/') || window.location.pathname.startsWith('/mentor/'))) {
        pathToPush = window.location.pathname;
      } else {
        pathToPush = viewToPath(view, { expertId: selectedExpert?.id });
      }
    }

    if (window.location.pathname !== pathToPush) {
      window.history.pushState({}, '', pathToPush);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Authentication (Shine OTP via the PeerPath backend; session = httpOnly cookie)
  const toAccount = (me: AuthUser, profile?: UserProfileData): UserAccount => ({
    id: me.id,
    username: me.id,
    name: profile?.name || me.name,
    role: me.isMentor ? 'mentor' : 'candidate',
    avatar: me.avatar || '/brand/android-chrome-192x192.png',
    email: me.email || '',
    headline: profile?.headline || '',
    experienceYears: profile?.experienceYears,
    location: profile?.location,
    creatorId: me.creatorId || undefined,
    isMentorEligible: Boolean(me.isMentor || me.isMentorEligible || profile?.isMentorEligible),
    hasExpertBadge: me.isMentor,
    isAdmin: Boolean(me.isAdmin)
  });

  // Loads the signed-in user's profile and switches the app to them
  const applySession = async (me: AuthUser): Promise<{ account: UserAccount; profile?: UserProfileData }> => {
    let profile: UserProfileData | undefined;
    try {
      profile = profileFromServer(await peerpathApi.getCandidateProfile(me.id));
      setUserProfiles(prev => ({ ...prev, [me.id]: profile as UserProfileData }));
    } catch (err) {
      console.warn('[API getCandidateProfile]:', err);
    }
    const account = toAccount(me, profile);
    setCurrentUser(account);
    const isMentor = Boolean(
      me.isMentor ||
      me.isMentorEligible ||
      profile?.isMentorEligible ||
      me.creatorId ||
      account.hasExpertBadge
    );
    setIsCreatorMode(isMentor);
    return { account, profile };
  };

  // Restore an existing session on page load
  useEffect(() => {
    let isCurrent = true;
    peerpathApi.getMe()
      .then(async me => {
        if (!isCurrent) return;
        if (me) {
          const { profile } = await applySession(me);
          const currentPath = window.location.pathname;
          const isMentorUser = Boolean(
            me.isMentor ||
            me.isMentorEligible ||
            profile?.isMentorEligible ||
            me.creatorId
          );
          // If on root or default /peerpath, direct mentor users to their studio dashboard
          if (isMentorUser && (currentPath === '/' || currentPath === '/peerpath') && !window.location.search.includes('redirect')) {
            navigate('mentor-dashboard-view', '/creator-studio');
          }
        } else {
          const currentPath = window.location.pathname;
          // If on admin URL, do not redirect to candidate login; admin-dashboard-view renders its own admin login portal
          if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
            // retain admin-dashboard-view
          } else if (pathToView(currentPath).route?.requiresAuth) {
            navigate('login-view', '/login');
          }
        }
      })
      .catch(err => console.warn('[API getMe]:', err))
      .finally(() => {
        if (isCurrent) setIsAuthLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const requestOtp = async (email: string) => {
    try {
      return await peerpathApi.sendOtp(email.trim());
    } catch (err) {
      showToast('Could not send OTP', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return null;
    }
  };

  const verifyOtp = async (params: { requestId: string; email: string; otp: string; name?: string; mobile?: string }) => {
    let me: AuthUser;
    try {
      me = await peerpathApi.verifyOtp({ ...params, email: params.email.trim(), otp: params.otp.trim() });
    } catch (err) {
      showToast('Sign in failed', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
    const { account, profile } = await applySession(me);
    setIsLoginModalOpen(false);

    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    const utmSource = urlParams.get('utm_source');
    const campaign = urlParams.get('campaign') || urlParams.get('utm_campaign');
    const currentPath = window.location.pathname;
    const isAdminPath = currentPath === '/admin' || currentPath.startsWith('/admin/');
    const isMentorUser = Boolean(
      me.isMentor ||
      me.isMentorEligible ||
      profile?.isMentorEligible ||
      me.creatorId
    );

    if (isAdminPath) {
      if (me.isAdmin) {
        navigate('admin-dashboard-view', '/admin');
      }
    } else if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      navigate(pathToView(redirectParam).view, redirectParam);
    } else if (me.isAdmin) {
      navigate('admin-dashboard-view', '/admin');
    } else if (!isProfileComplete(profile)) {
      // New users (and anyone with missing required details) finish registration first
      navigate('registration-view', '/register');
    } else if (isMentorUser && !utmSource && !campaign) {
      navigate('mentor-dashboard-view', '/creator-studio');
    } else {
      // Normal candidate login always directs to /peerpath
      navigate('guidance-view', '/peerpath');
    }

    showToast(`👋 Welcome, ${account.name || 'there'}!`, `You are now signed in to ${BRAND.name}.`);
    return true;
  };

  const logout = (redirectToAdmin = false) => {
    peerpathApi.logout().catch(err => console.warn('[API logout]:', err));
    setCurrentUser(null);
    setUserProfiles({});
    setIsCreatorMode(false);
    setActiveSession(null);
    setIsLoginModalOpen(false);
    if (redirectToAdmin || window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) {
      navigate('admin-dashboard-view', '/admin');
    } else {
      navigate('login-view', '/login');
    }
    showToast('Signed Out', 'You have been signed out.', 'info');
  };

  const selectExpertById = (expertId: string) => {
    const cleanId = (expertId || '').trim().toLowerCase();
    const found = experts.find(e => e.id.toLowerCase() === cleanId);
    if (found) {
      setSelectedExpert(found);
      setBookingDraft(prev => ({ ...prev, expert: found }));
    } else {
      peerpathApi.getCreatorById(cleanId).then(creator => {
        if (creator) {
          setSelectedExpert(creator);
          setBookingDraft(prev => ({ ...prev, expert: creator }));
        }
      }).catch(err => console.warn('[selectExpertById]:', err));
    }
  };

  // Registers a mentor on the backend and uses the server-assigned creator id everywhere
  // (a client-generated id would never match bookings made against the backend record).
  const addExpert = async (newExpertData: Omit<Expert, 'id'> | Expert): Promise<Expert | null> => {
    try {
      const created = await peerpathApi.registerCreator({
        ...newExpertData,
        days: newExpertData.availability?.days,
        timeSlots: newExpertData.availability?.timeSlots
      });
      setExperts(prev => [created, ...prev.filter(e => e.id !== created.id)]);
      if (currentUser) {
        setCurrentUser({ ...currentUser, role: 'mentor', creatorId: created.id, isMentorEligible: true });
      }
      return created;
    } catch (err) {
      showToast('Could not publish mentor profile', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return null;
    }
  };

  const replaceSession = (updated: MentorshipSession) => {
    setSessions(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
    setActiveSession(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  // Sessions Management
  // Books via the backend and only shows the session once the server has confirmed it, so the
  // candidate, the mentor and the video room all use the same server-assigned session id.
  const bookSession = async (expert: Expert, date: string, timeSlot: string, sessionType?: string): Promise<MentorshipSession | null> => {
    if (!currentUser) {
      showToast('Sign in required', 'Please sign in to book a session.', 'info');
      setIsLoginModalOpen(true);
      return null;
    }
    try {
      const { session } = await peerpathApi.checkoutAndBookSession({
        expertId: expert.id,
        candidateId: currentUser.id,
        candidateName: userProfile.name || currentUser.name,
        candidateRole: userProfile.headline?.split('|')[0]?.trim() || currentUser.headline,
        candidateAvatar: currentUser.avatar,
        candidateEmail: currentUser.email,
        candidateGoal: `Career Guidance & Transition Strategy into ${expert.company}`,
        date,
        timeSlot,
        sessionType,
        paymentMethod: 'upi'
      });
      setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)]);
      showToast('🎉 Session Booked Successfully!', `Meeting scheduled with ${expert.name} on ${date}.`);
      return session;
    } catch (err) {
      showToast('Booking failed', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return null;
    }
  };

  const cancelSession = async (sessionId: string): Promise<boolean> => {
    try {
      replaceSession(await peerpathApi.cancelSession(sessionId));
      showToast('Session Cancelled', 'Your mentorship booking has been cancelled.', 'info');
      return true;
    } catch (err) {
      showToast('Could not cancel session', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
  };

  const rescheduleSession = async (sessionId: string, newDate: string, newTimeSlot: string): Promise<boolean> => {
    try {
      replaceSession(await peerpathApi.rescheduleSession(sessionId, newDate, newTimeSlot));
      showToast('Session Rescheduled', `Updated to ${newDate} (${newTimeSlot}).`);
      return true;
    } catch (err) {
      showToast('Could not reschedule', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
  };

  const markSessionHeld = async (sessionId: string): Promise<void> => {
    try {
      replaceSession(await peerpathApi.completeSession(sessionId));
    } catch (err) {
      console.warn('[API completeSession]:', err);
    }
  };

  const submitSessionReview = async (sessionId: string, rating: number, comment: string): Promise<boolean> => {
    try {
      replaceSession(await peerpathApi.reviewSession(sessionId, rating, comment));
      showToast('Review Submitted', 'Thanks! Your rating helps other candidates pick the right mentor.');
      return true;
    } catch (err) {
      showToast('Could not submit review', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
  };

  const completeSession = async (sessionId: string, rating: number, notes: string, badgeTitle?: string, skillsVerified?: string[]): Promise<boolean> => {
    try {
      const result = await peerpathApi.submitAssessment(sessionId, {
        badgeTitle: badgeTitle || 'Peer-Verified Skill Badge',
        feedbackNotes: notes,
        rating,
        skillsVerified
      });
      replaceSession(result.session);
      showToast('🎉 Assessment Complete!', 'Skill badge and feedback sent to the candidate.');
      return true;
    } catch (err) {
      showToast('Could not submit assessment', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
  };

  // Fire-and-forget: persists candidate edits to server/data/db.json via PUT /api/candidates/:id.
  // Swallows errors (e.g. mentor-only accounts with no backend candidate record) so the
  // optimistic local UI update above never blocks on this.
  const syncCandidateProfile = (candidateId: string, updates: Partial<UserProfileData>) => {
    peerpathApi.updateCandidateProfile(candidateId, updates).catch(err => console.warn('[API updateCandidateProfile]:', err));
  };

  const updateUserProfile = (updates: Partial<UserProfileData>) => {
    setUserProfiles(prev => {
      const existing = prev[activeUsername] || EMPTY_PROFILE;
      return {
        ...prev,
        [activeUsername]: { ...existing, ...updates }
      };
    });
    syncCandidateProfile(activeUsername, updates);
    showToast('Profile Updated', 'Your profile details have been saved.');
  };

  const updateFullProfile = async (updates: Partial<UserProfileData>): Promise<boolean> => {
    try {
      // The server validates and fills derived fields (full name, experience/CTC text)
      const saved = await peerpathApi.updateCandidateProfile(activeUsername, updates);
      const profile = profileFromServer(saved);
      setUserProfiles(prev => ({ ...prev, [activeUsername]: { ...(prev[activeUsername] || userProfile), ...profile } }));
      if (currentUser && profile.name && profile.name !== currentUser.name) {
        setCurrentUser({ ...currentUser, name: profile.name });
      }
      showToast('🎉 Profile Updated Successfully!', 'Your profile details have been saved.', 'success');
      return true;
    } catch (err) {
      showToast('Could not save profile', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
  };

  const updateProfileSummary = (summary: string) => {
    const nextProfileScore = Math.min(100, userProfile.profileScore + 5);
    setUserProfiles(prev => ({
      ...prev,
      [activeUsername]: { ...(prev[activeUsername] || userProfile), summary, profileScore: nextProfileScore }
    }));
    syncCandidateProfile(activeUsername, { summary, profileScore: nextProfileScore });
    showToast('Summary Boosted (+5%)', 'Your profile strength is now higher for recruiters!');
  };

  const addSkill = (skill: string) => {
    if (userProfile.skills.includes(skill)) return;
    const nextSkills = [...userProfile.skills, skill];
    const nextProfileScore = Math.min(100, userProfile.profileScore + 2);
    setUserProfiles(prev => ({
      ...prev,
      [activeUsername]: { ...(prev[activeUsername] || userProfile), skills: nextSkills, profileScore: nextProfileScore }
    }));
    syncCandidateProfile(activeUsername, { skills: nextSkills, profileScore: nextProfileScore });
    showToast('Skill Added', `${skill} added to your verified profile.`);
  };

  const removeSkill = (skill: string) => {
    const nextSkills = userProfile.skills.filter(s => s !== skill);
    setUserProfiles(prev => ({
      ...prev,
      [activeUsername]: { ...(prev[activeUsername] || userProfile), skills: nextSkills }
    }));
    syncCandidateProfile(activeUsername, { skills: nextSkills });
    showToast('Skill Removed', `${skill} removed from profile.`, 'info');
  };

  // Reflects a badge on the logged-in user's profile locally. Badges are issued server-side by the
  // mentor's assessment (POST /sessions/:id/assess), so this never writes badges to the backend.
  const awardBadge = (newBadge: PeerVerifiedBadge) => {
    setUserProfiles(prev => {
      const existing = prev[activeUsername] || userProfile;
      return {
        ...prev,
        [activeUsername]: {
          ...existing,
          badges: [newBadge, ...existing.badges.filter(b => b.title !== newBadge.title)],
          profileScore: Math.min(100, existing.profileScore + 8)
        }
      };
    });
  };

  const updateJobSearchStatus = (status: string) => {
    setUserProfiles(prev => {
      const existing = prev[activeUsername] || EMPTY_PROFILE;
      return {
        ...prev,
        [activeUsername]: {
          ...existing,
          jobSearchStatus: status
        }
      };
    });
    syncCandidateProfile(activeUsername, { jobSearchStatus: status });
    showToast('Job Status Updated', `Status changed to "${status}".`);
  };

  // Persists the mentor's slots on their creator record, which BookingModal reads to offer slots
  const saveCreatorAvailability = async (days: string[], timeSlots: string[]): Promise<boolean> => {
    try {
      const updated = await peerpathApi.updateCreatorAvailability(mentorCreatorId, days, timeSlots);
      setExperts(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      return true;
    } catch (err) {
      showToast('Could not save availability', err instanceof Error ? err.message : 'Please try again.', 'warning');
      return false;
    }
  };

  const updateMentorAvailability = (days: string[], timeSlots: string[]) => {
    setMentorAvailability({ days, timeSlots });
    saveCreatorAvailability(days, timeSlots).then(saved => {
      if (saved) showToast('Availability Saved', 'Your weekly mentorship slots have been updated.');
    });
  };

  const updateMentorRatesAndAvailability = (rate: number, duration: number, days: string[], timeSlots: string[]) => {
    setUserProfiles(prev => {
      const existing = prev[activeUsername] || EMPTY_PROFILE;
      return {
        ...prev,
        [activeUsername]: {
          ...existing,
          mentorRate: rate,
          mentorDuration: duration,
          mentorAvailability: { days, timeSlots }
        }
      };
    });
    setMentorAvailability({ days, timeSlots });
    Promise.all([
      peerpathApi.updateCreator(mentorCreatorId, { price: rate }),
      peerpathApi.updateCreatorAvailability(mentorCreatorId, days, timeSlots)
    ]).then(([, updated]) => {
      setExperts(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      showToast('Mentorship Settings Saved', `Session fee set to ₹${rate} & schedule updated!`);
    }).catch(err => {
      showToast('Could not save mentorship settings', err instanceof Error ? err.message : 'Please try again.', 'warning');
    });
  };

  const updateMentorTeaserVideo = (teaser: { url: string; title: string; duration?: string; thumbnail?: string; uploadedAt?: string } | null) => {
    setUserProfiles(prev => {
      const existing = prev[activeUsername] || EMPTY_PROFILE;
      return {
        ...prev,
        [activeUsername]: {
          ...existing,
          mentorTeaserVideo: teaser
        }
      };
    });
    showToast(teaser ? '🎉 Teaser Video Published!' : 'Teaser Video Removed', teaser ? `Candidates can now watch your introduction on ${BRAND.name}.` : undefined);
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        previousView,
        navigate,
        currentUser,
        isLoggedIn,
        isAuthLoading,
        requestOtp,
        verifyOtp,
        logout,
        experts,
        selectedExpert,
        setSelectedExpert,
        selectExpertById,
        addExpert,
        sessions,
        activeSession,
        setActiveSession,
        bookSession,
        cancelSession,
        rescheduleSession,
        completeSession,
        markSessionHeld,
        submitSessionReview,
        userProfile,
        updateUserProfile,
        updateFullProfile,
        updateProfileSummary,
        addSkill,
        removeSkill,
        awardBadge,
        updateJobSearchStatus,
        mentorAvailability,
        updateMentorAvailability,
        updateMentorRatesAndAvailability,
        updateMentorTeaserVideo,
        isCreatorMode,
        setIsCreatorMode,
        toggleCreatorMode,
        creatorActiveTab,
        setCreatorActiveTab,
        navigateToCreatorStudio,
        isBookingModalOpen,
        setIsBookingModalOpen,
        isCreatorWizardOpen,
        setIsCreatorWizardOpen,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isAssessmentModalOpen,
        setIsAssessmentModalOpen,
        isCvSyncModalOpen,
        setIsCvSyncModalOpen,
        isUpdateProfileModalOpen,
        setIsUpdateProfileModalOpen,
        pendingBookingCheckout,
        setPendingBookingCheckout,
        uploadResume,
        removeCandidateResume,
        resumeExtract,
        setResumeExtract,
        assessmentDraftSession,
        setAssessmentDraftSession,
        bookingDraft,
        setBookingDraft,
        isCalibrationModalOpen,
        setIsCalibrationModalOpen,
        calibrateCandidateProfile,
        bootcamps,
        registeredBootcampIds,
        registerForBootcamp,
        searchQuery,
        setSearchQuery,
        selectedJobCategory,
        setSelectedJobCategory,
        peerpathJobContext,
        setPeerpathJobContext,
        clearPeerpathJobContext,
        toasts,
        showToast,
        removeToast,
        followedMentorIds,
        toggleFollowMentor,
        isFollowingMentor,
        communityPosts,
        createMentorPost,
        addPostComment,
        togglePostLike,
        toggleCommentLike,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
