import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, Sparkles, Video, User, Clock, MapPin, GraduationCap, 
  Zap, CheckCircle2, ThumbsUp, Check, ArrowRight, TrendingUp,
  Briefcase, Star, Building2, UserCheck, ChevronRight, ChevronDown, Award, Plus, Lock, LockOpen, Users,
  ShieldCheck, Loader2, BarChart2, Target, Lightbulb, IndianRupee, Wifi, Filter, Info, Cpu, Code, BookOpen,
  Calendar, RefreshCw, Layers, ExternalLink, UserPlus, Search, X, SlidersHorizontal
} from 'lucide-react';
import { ViewType, Expert, TrajectoryMatch } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateSalaryBenchmark } from '../../utils/salaryBenchmark';
import { peerpathApi } from '../../services/api';
import { BRAND } from '../../config/brand';
import { isGoalSet, isSelfMentor } from '../../utils/profile';

export type MentorCategoryTab = 'top' | 'all' | 'ai' | 'semi' | 'cyber' | 'fullstack' | 'others';

// Tabs that map to a single server-side domain filter. 'top'/'all'/'others' intentionally
// mix mentors across domains, so they omit the domain filter (see matchBaseParams calls below).
const TAB_DOMAIN_MAP: Partial<Record<MentorCategoryTab, string>> = {
  ai: 'AI/ML',
  semi: 'Semiconductor',
  cyber: 'Cybersecurity',
  fullstack: 'Full-Stack'
};

const NAMED_TRACK_DOMAINS = ['AI/ML', 'Semiconductor', 'Cybersecurity', 'Full-Stack'];

interface TransitionMentor {
  id: string;
  name: string;
  role: string;
  company: string;
  domain: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  sessionsCount: number;
  price: number;
  avatar: string;
  isVerifiedEmployer: boolean;
  baselineCompany: string;
  baselineRole: string;
  leapCompany: string;
  leapRole: string;
  jumpTag: string;
  jumpStory: string;
  skills: string[];
  matchScore: number;
  ownerUserId?: string;
}

function toTransitionMentor(match: TrajectoryMatch): TransitionMentor {
  const c = match.creator;
  const traj = c.trajectory;
  const baseCompany = traj?.company3YearsAgo || c.company;
  const baseRole = traj?.role3YearsAgo || c.role;
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    company: c.company,
    domain: c.domain || 'Tech',
    experience: c.experience || '4+ Years',
    rating: c.reviewsCount ? (c.rating || 0) : 0,
    reviewsCount: c.reviewsCount || 0,
    sessionsCount: c.sessionsCount || 0,
    price: c.price || 999,
    avatar: c.avatar,
    isVerifiedEmployer: c.isVerifiedEmployer ?? true,
    baselineCompany: baseCompany,
    baselineRole: baseRole,
    leapCompany: c.company,
    leapRole: c.role,
    jumpTag: match.isExactMatch ? 'Exact Match' : (traj?.role3YearsAgo ? `${traj.role3YearsAgo} ➔ ${c.role}` : `${c.role} @ ${c.company}`),
    jumpStory: traj?.jumpStory || c.bio || `Senior ${c.role} at ${c.company} helping professionals achieve their target career trajectory.`,
    skills: c.skills || [],
    matchScore: match.trajectorySimilarityScore || 0,
    ownerUserId: (c as any).ownerUserId || (c as any).owner_user_id
  };
}

// Listing without a trajectory match: no match % is shown (matchScore 0)
function expertToTransitionMentor(e: Expert, matchScore = 0): TransitionMentor {
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    company: e.company,
    domain: e.domain || 'Tech',
    experience: e.experience || '',
    rating: e.reviewsCount ? (e.rating || 0) : 0,
    reviewsCount: e.reviewsCount || 0,
    sessionsCount: e.sessionsCount || 0,
    price: e.price || 999,
    avatar: e.avatar,
    isVerifiedEmployer: e.isVerifiedEmployer ?? true,
    baselineCompany: e.trajectory?.company3YearsAgo || e.company,
    baselineRole: e.trajectory?.role3YearsAgo || e.role,
    leapCompany: e.company,
    leapRole: e.role,
    jumpTag: e.trajectory ? `${e.trajectory.role3YearsAgo} ➔ ${e.role}` : `${e.role} @ ${e.company}`,
    jumpStory: e.trajectory?.jumpStory || e.bio || `Senior ${e.role} at ${e.company} helping professionals advance their career.`,
    skills: e.skills || [],
    matchScore: matchScore,
    ownerUserId: e.ownerUserId || (e as any).owner_user_id
  };
}

interface CareerGuidanceViewProps {
  onNavigate: (view: ViewType) => void;
  onSelectExpert: (expertId: string) => void;
  experts: Expert[];
}

export const CareerGuidanceView: React.FC<CareerGuidanceViewProps> = ({
  onNavigate,
  onSelectExpert,
  experts,
}) => {
  const { 
    userProfile, 
    navigate,
    setIsCreatorWizardOpen, 
    currentUser, 
    isCreatorMode,
    setIsCreatorMode,
    isCalibrationModalOpen,
    setIsCalibrationModalOpen,
    bootcamps,
    registeredBootcampIds,
    registerForBootcamp,
    setBookingDraft,
    setIsBookingModalOpen,
    toggleFollowMentor,
    isFollowingMentor,
    currentView,
    isAuthLoading
  } = useApp();
  // Registration step 2: the career goal must be set before showing matched mentors
  const isMentor = currentUser?.role === 'mentor';
  const hasMentorAccess = Boolean(
    currentUser && (
      isMentor ||
      Boolean(currentUser?.creatorId) ||
      Boolean(userProfile?.isMentor) ||
      isCreatorMode
    )
  );
  const goalSet = Boolean(currentUser && isGoalSet(userProfile));
  const isGoalLocked = !currentUser || (!goalSet && !hasMentorAccess);

  const [activeTab, setActiveTab] = useState<MentorCategoryTab>('top');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'experience' | 'price'>('match');
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState<boolean>(false);

  // Automatically trigger Unlock/Calibration modal ONLY ONCE if candidate has no career goal set.
  // Once the user fills their goal, or if user has mentor access, NEVER ask automatically.
  // Guests are never prompted until they sign in so that API auth succeeds.
  useEffect(() => {
    // 1. Never prompt while authentication or candidate profile is still loading
    if (isAuthLoading) return;

    // 2. Only prompt if the user is signed in. Guests must sign in before calibrating their persistent goal.
    if (!currentUser) return;

    // 3. If the career goal is already set, or user has mentor access, never auto-prompt.
    if (goalSet || isCreatorMode || hasMentorAccess || currentView === 'registration-view') {
      return;
    }

    // 4. For users without a goal, prompt only once per session or if explicitly unlocked
    const sessionKey = `shine_goal_prompted_${currentUser.id}`;
    const alreadyPrompted = sessionStorage.getItem(sessionKey);
    const hasUnlockIntent = sessionStorage.getItem('peerpath_auto_unlock') === '1';

    if (!alreadyPrompted || hasUnlockIntent) {
      sessionStorage.setItem(sessionKey, '1');
      try {
        sessionStorage.removeItem('peerpath_auto_unlock');
      } catch {}
      setIsCalibrationModalOpen(true);
    }
  }, [goalSet, isAuthLoading, isCreatorMode, hasMentorAccess, currentView, currentUser?.id]);

  // Dynamic salary benchmark
  const benchmark = calculateSalaryBenchmark(userProfile.currentCtc, userProfile.targetCtc);
  const userCurrentSalary = benchmark.currentCtcDisplay;
  const userTargetSalary = benchmark.targetCtcDisplay;
  const jumpPercentageDisplay = benchmark.jumpPercentageDisplay;

  // Candidate Target context
  const userTargetRole = userProfile.targetRole || undefined;
  const userDreamCompany = userProfile.dreamCompany || userProfile.targetCompany || undefined;
  const userCurrentCompany = userProfile.currentCompany || userProfile.pastCompany || undefined;

  // Headline strings look like "Senior Frontend Engineer | 4 Years, 2 Months | Bengaluru"
  // Check explicit pastCompanyRole first, then headline
  const rawCurrentRole = userProfile.pastCompanyRole
    || (userProfile.headline ? userProfile.headline.split('|')[0].split('•')[0].split('@')[0].trim() : '');
  const userCurrentRole = rawCurrentRole || 'Software Engineer';
  const userCurrentRoleDisplay = rawCurrentRole;

  const [isSwitchingMode, setIsSwitchingMode] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Trigger smooth loader and fresh data refresh whenever mode switches (e.g. Mentor <-> Seek Guidance)
  useEffect(() => {
    setIsSwitchingMode(true);
    setRefreshTrigger(prev => prev + 1);
    const timer = setTimeout(() => {
      setIsSwitchingMode(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [isCreatorMode]);

  const [allMatches, setAllMatches] = useState<TrajectoryMatch[]>([]);
  const [isLoadingAllMatches, setIsLoadingAllMatches] = useState<boolean>(true);
  const [allMatchesError, setAllMatchesError] = useState<string | null>(null);

  const [domainMatches, setDomainMatches] = useState<TrajectoryMatch[]>([]);
  const [isLoadingDomainMatches, setIsLoadingDomainMatches] = useState<boolean>(false);
  const [domainMatchesError, setDomainMatchesError] = useState<string | null>(null);

  // Fetch across all domains whenever the candidate context changes or mode refreshes — powers the 'top'/'all'/'others'
  // tabs (which intentionally mix domains) and the per-track mentor counts in the Switch Track dropdown.
  useEffect(() => {
    // If not authenticated or goal is locked, do not call matchTrajectories;
    // seamlessly rely on platform verified mentors so no 503/401 errors occur.
    if (!currentUser || isGoalLocked) {
      setAllMatches([]);
      setAllMatchesError(null);
      setIsLoadingAllMatches(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingAllMatches(true);
    setAllMatchesError(null);

    peerpathApi.matchTrajectories({
      currentRole: userCurrentRole,
      currentCompany: userCurrentCompany,
      currentExperience: userProfile.experienceYears || '4 Years',
      currentSalary: userProfile.currentCtc,
      targetRole: userTargetRole,
      targetPackage: userProfile.targetCtc,
      targetCompany: userDreamCompany,
      skills: userProfile.skills || []
    }).then(({ matches }) => {
      if (isCurrent) {
        setAllMatches(matches || []);
        setAllMatchesError(null);
      }
    }).catch(err => {
      console.warn('[CareerGuidanceView all-domain trajectory match]:', err);
      if (isCurrent) {
        // If we don't have fallback mentors yet, set error; otherwise allow fallback mentors to render seamlessly
        if (!experts || experts.length === 0) {
          setAllMatchesError('Failed to load matched mentors. Please try again.');
        } else {
          setAllMatchesError(null);
        }
      }
    }).finally(() => {
      if (isCurrent) setIsLoadingAllMatches(false);
    });

    return () => { isCurrent = false; };
  }, [currentUser?.id, isGoalLocked, userCurrentRole, userCurrentCompany, userProfile.experienceYears, userProfile.currentCtc, userTargetRole, userProfile.targetCtc, userDreamCompany, userProfile.skills, refreshTrigger]);

  // Re-fetch scoped to a single domain whenever a track tab that maps to one domain is selected or mode refreshes.
  useEffect(() => {
    const domain = TAB_DOMAIN_MAP[activeTab];
    if (!domain || !currentUser || isGoalLocked) {
      setDomainMatches([]);
      setDomainMatchesError(null);
      setIsLoadingDomainMatches(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingDomainMatches(true);
    setDomainMatchesError(null);

    peerpathApi.matchTrajectories({
      currentRole: userCurrentRole,
      currentCompany: userCurrentCompany,
      currentExperience: userProfile.experienceYears || '4 Years',
      currentSalary: userProfile.currentCtc,
      targetRole: userTargetRole,
      targetPackage: userProfile.targetCtc,
      targetCompany: userDreamCompany,
      domain,
      skills: userProfile.skills || []
    }).then(({ matches, supportedDomain, message }) => {
      if (!isCurrent) return;
      setDomainMatches(matches || []);
      setDomainMatchesError(!supportedDomain ? (message || `No mentors for "${domain}" yet.`) : null);
    }).catch(err => {
      console.warn('[CareerGuidanceView domain trajectory match]:', err);
      if (isCurrent) {
        if (!experts || experts.length === 0) {
          setDomainMatchesError('Failed to load matched mentors for this track. Please try again.');
        } else {
          setDomainMatchesError(null);
        }
      }
    }).finally(() => {
      if (isCurrent) setIsLoadingDomainMatches(false);
    });

    return () => { isCurrent = false; };
  }, [activeTab, currentUser?.id, isGoalLocked, userCurrentRole, userCurrentCompany, userProfile.experienceYears, userProfile.currentCtc, userTargetRole, userProfile.targetCtc, userDreamCompany, userProfile.skills, refreshTrigger]);

  // Fallback list of transition mentors derived from platform verified experts
  // Fallback list of transition mentors derived from platform verified experts (excluding self)
  const fallbackMentors: TransitionMentor[] = useMemo(() => {
    const validExperts = (experts || []).filter(e => !isSelfMentor(e, currentUser));
    return validExperts.map(e => expertToTransitionMentor(e));
  }, [experts, currentUser, userProfile]);

  // Derive the 'top' (top 6), 'others' (non-named-domain), per-track counts, and each
  // track's best real match % (shown in the Switch Track badges) from the all-domain match set
  const { topMatches, othersMatches, domainCounts, domainBestMatch } = useMemo(() => {
    const filteredMatches = allMatches.filter(m => !isSelfMentor(m.creator, currentUser));
    const sorted = [...filteredMatches].sort((a, b) => b.trajectorySimilarityScore - a.trajectorySimilarityScore);
    const others = filteredMatches.filter(m => !NAMED_TRACK_DOMAINS.includes(m.creator.domain));
    const byDomain = {
      ai: filteredMatches.filter(m => m.creator.domain === 'AI/ML'),
      semi: filteredMatches.filter(m => m.creator.domain === 'Semiconductor'),
      cyber: filteredMatches.filter(m => m.creator.domain === 'Cybersecurity'),
      fullstack: filteredMatches.filter(m => m.creator.domain === 'Full-Stack')
    };
    const bestOf = (list: TrajectoryMatch[]) => list.length ? Math.max(...list.map(m => m.trajectorySimilarityScore)) : 0;

    const counts: Record<MentorCategoryTab, number> = {
      top: sorted.length || fallbackMentors.slice(0, 6).length,
      all: filteredMatches.length || fallbackMentors.length,
      ai: byDomain.ai.length || fallbackMentors.filter(m => m.domain === 'AI/ML').length,
      semi: byDomain.semi.length || fallbackMentors.filter(m => m.domain === 'Semiconductor').length,
      cyber: byDomain.cyber.length || fallbackMentors.filter(m => m.domain === 'Cybersecurity').length,
      fullstack: byDomain.fullstack.length || fallbackMentors.filter(m => m.domain === 'Full-Stack').length,
      others: others.length || fallbackMentors.filter(m => !NAMED_TRACK_DOMAINS.includes(m.domain)).length
    };

    const bestMatch: Record<MentorCategoryTab, number> = {
      // Only real trajectory scores; mentors listed without a match show no %
      top: bestOf(sorted),
      all: bestOf(filteredMatches),
      ai: bestOf(byDomain.ai),
      semi: bestOf(byDomain.semi),
      cyber: bestOf(byDomain.cyber),
      fullstack: bestOf(byDomain.fullstack),
      others: bestOf(others)
    };

    return {
      topMatches: sorted.slice(0, 6),
      othersMatches: others,
      domainCounts: counts,
      domainBestMatch: bestMatch
    };
  }, [allMatches, fallbackMentors, currentUser, userProfile]);

  const matchBadgeLabel = (tab: MentorCategoryTab) =>
    domainCounts[tab] > 0 
      ? (domainBestMatch[tab] > 0 ? `⚡ ${domainBestMatch[tab]}% Match` : `${domainCounts[tab]} Mentors`) 
      : 'No mentors yet';

  const isLoadingActiveTab = TAB_DOMAIN_MAP[activeTab] ? isLoadingDomainMatches : isLoadingAllMatches;
  const activeTabError = TAB_DOMAIN_MAP[activeTab] ? domainMatchesError : allMatchesError;

  // Displayed mentors with search, category tab, company filter, and sorting
  const displayedMentors = useMemo(() => {
    const rawMatches = activeTab === 'top'
      ? topMatches
      : activeTab === 'all'
        ? allMatches
        : activeTab === 'others'
          ? othersMatches
          : domainMatches;

    const baseMatches = rawMatches.filter(m => !isSelfMentor(m.creator, currentUser));
    let list: TransitionMentor[] = baseMatches.map(toTransitionMentor);

    // If no matches found from trajectory matching, fall back to real verified mentors from database:
    if (list.length === 0) {
      if (fallbackMentors.length > 0) {
        const targetDomain = TAB_DOMAIN_MAP[activeTab];
        if (activeTab === 'top') {
          list = fallbackMentors.slice(0, 6);
        } else if (targetDomain) {
          const domainList = fallbackMentors.filter(m => m.domain === targetDomain);
          list = domainList.length > 0 ? domainList : fallbackMentors;
        } else if (activeTab === 'others') {
          const othersList = fallbackMentors.filter(m => !NAMED_TRACK_DOMAINS.includes(m.domain));
          list = othersList.length > 0 ? othersList : fallbackMentors;
        } else {
          list = fallbackMentors;
        }
      } else {
        list = [];
      }
    }

    // Explicitly guarantee user never sees their own mentor card in guidance list
    list = list.filter(m => !isSelfMentor(m, currentUser));

    // Company filter
    if (selectedCompany !== 'all') {
      list = list.filter(m =>
        m.company.toLowerCase().includes(selectedCompany.toLowerCase()) ||
        m.leapCompany.toLowerCase().includes(selectedCompany.toLowerCase())
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q) ||
        m.skills.some(s => s.toLowerCase().includes(q)) ||
        m.jumpStory.toLowerCase().includes(q)
      );
    }

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'match') {
        return b.matchScore - a.matchScore;
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'experience') {
        const expA = parseFloat(a.experience) || 0;
        const expB = parseFloat(b.experience) || 0;
        return expB - expA;
      }
      if (sortBy === 'price') {
        return a.price - b.price;
      }
      return 0;
    });
  }, [activeTab, topMatches, allMatches, othersMatches, domainMatches, selectedCompany, searchQuery, sortBy, currentUser, userProfile, fallbackMentors]);

  const currentTrackInfo = useMemo(() => {
    const trackMap: Record<MentorCategoryTab, { title: string; growthStat: string; count: number }> = {
      top: { title: 'Top Matches for You', growthStat: matchBadgeLabel('top'), count: domainCounts.top },
      ai: { title: 'AI & Data Science', growthStat: matchBadgeLabel('ai'), count: domainCounts.ai },
      semi: { title: 'Semiconductor & VLSI', growthStat: matchBadgeLabel('semi'), count: domainCounts.semi },
      cyber: { title: 'Cybersecurity & Cloud', growthStat: matchBadgeLabel('cyber'), count: domainCounts.cyber },
      fullstack: { title: 'Full-Stack & Systems', growthStat: matchBadgeLabel('fullstack'), count: domainCounts.fullstack },
      others: { title: 'Product & Leadership', growthStat: matchBadgeLabel('others'), count: domainCounts.others },
      all: { title: 'All Verified Mentors', growthStat: matchBadgeLabel('all'), count: domainCounts.all }
    };
    return trackMap[activeTab] || trackMap.top;
  }, [activeTab, domainCounts, domainBestMatch]);

  // Action: Book 1:1 Session with Mentor -> opens booking modal popup
  const handleBook1on1 = (mentor: TransitionMentor) => {
    const matchedExpert: Expert = (experts && experts.find(e => e.id === mentor.id)) || {
      id: mentor.id,
      name: mentor.name,
      role: mentor.role,
      company: mentor.company,
      domain: mentor.domain,
      experience: mentor.experience,
      rating: mentor.rating,
      reviewsCount: mentor.reviewsCount,
      sessionsCount: mentor.sessionsCount,
      price: mentor.price,
      location: 'Bengaluru / Remote',
      duration: '01:00',
      avatar: mentor.avatar,
      videoPoster: mentor.avatar,
      teaserTitle: `Teaser: 1:1 Career Switch into ${mentor.role} @ ${mentor.company}`,
      skills: mentor.skills,
      bio: mentor.jumpStory,
      verifiedEmail: `${mentor.id}@${mentor.company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      isVerifiedEmployer: true
    };

    if (setBookingDraft) {
      setBookingDraft({
        expert: matchedExpert,
        date: 'Tomorrow, 11 Sep',
        timeSlot: '07:00 PM - 08:00 PM',
        attachedCvName: userProfile.resumeFileName || '',
        sessionType: 'Career guidance',
        amount: mentor.price || 999,
        duration: '30 Mins'
      });
    }

    onSelectExpert(mentor.id);
    setIsBookingModalOpen(true);
  };

  // Action: View Mentor Profile -> navigates to expert profile page
  const handleViewMentorProfile = (mentorId: string) => {
    onSelectExpert(mentorId);
  };

  const scrollToMentors = () => {
    const el = document.getElementById('mentorsShowcaseSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUnlockClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      sessionStorage.setItem('peerpath_auto_unlock', '1');
      navigate('login-view', '/login?redirect=/peercomet&action=unlock');
    } else {
      setIsCalibrationModalOpen(true);
    }
  };

  return (
    <div className="content-wrapper peerpath-guidance-page">

      {isGoalLocked && (
        <div 
          className="peerpath-locked-unlock-banner"
          onClick={handleUnlockClick}
          title="Click to calibrate your dream career trajectory"
        >
          <div className="plub-left">
            <div className="plub-icon-wrap">
              <Lock size={26} className="text-amber plub-lock-icon" />
            </div>
            <div className="plub-text-col">
              <div className="plub-badge-row">
                <span className="plub-tag">Locked {BRAND.name}</span>
                <span className="plub-sub-tag">{BRAND.name} Transition Engine</span>
              </div>
              <h3 className="plub-title">Calibrate Your Target Career Trajectory</h3>
              <p className="plub-desc">
                Unlock verified transition roadmaps, recruiter shortlisting, and 1:1 mentorship from engineers who made your exact career jump.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            className="btn-plub-unlock"
            onClick={handleUnlockClick}
          >
            <Sparkles size={16} /> Unlock {BRAND.name}
          </button>
        </div>
      )}

      <div 
        className={`peerpath-main-content-flow ${isGoalLocked ? 'peerpath-locked-blur' : ''}`}
      >

        {!isCreatorMode && (
          <div className="peerpath-top-nav-switcher">
            <div className="ptn-left-group">
              <button 
                type="button"
                className="ptn-tab-btn active"
                onClick={() => {}}
              >
                <TrendingUp size={15} className="ptn-icon" />
                <span>{goalSet ? 'Matched Mentors' : 'Explore Mentors'}</span>
                <span className="ptn-badge-pill">{goalSet ? 'Target Matched' : 'Featured'}</span>
              </button>
              
              <button 
                type="button" 
                className="ptn-tab-btn ptn-mentors-highlight"
                onClick={() => onNavigate('experts-view')}
              >
                <div className="ptn-avatars-stack">
                  {experts.slice(0, 3).map((exp, idx) => (
                    <img key={exp.id || idx} src={exp.avatar || '/brand/android-chrome-192x192.png'} alt={exp.name} className="ptn-av" />
                  ))}
                  <span className="ptn-live-dot"></span>
                </div>
                <span className="ptn-label-main">Explore All Mentors</span>
              </button>
            </div>

            {!hasMentorAccess && (currentUser?.isMentorEligible || userProfile?.isMentorEligible) && (
              <button 
                type="button"
                className="ptn-become-mentor-btn"
                onClick={() => setIsCreatorWizardOpen(true)}
                title={`Register as a verified mentor on ${BRAND.name} (0% Platform Fee)`}
              >
                <span className="ptn-bm-sparkle-pill">
                  <Sparkles size={13} className="ptn-bm-sparkle-icon" />
                </span>
                <span className="ptn-bm-label">Become a Mentor</span>
                <span className="ptn-zero-fee-tag">0% Commission</span>
                <ArrowRight size={13} className="ptn-bm-arrow" />
              </button>
            )}
          </div>
        )}

        <div className="peerpath-hero-banner-card">
          <div className="phb-flex-layout">
            
            <div className="phb-left">
              <div className="peerpath-ecosystem-trust-badge">
                <span className="petb-dot"></span>
                <span><strong>{BRAND.name}</strong> • Backed by Shine's 4.5Cr+ Candidate Network</span>
              </div>

              <h1 className="phb-title">
                {currentUser && (userProfile.name || currentUser?.name)
                  ? `Targeted Mentors for ${userProfile.name || currentUser?.name}`
                  : 'Targeted Mentors for Your Career Transition'}
              </h1>
              <div className="phb-role-subtitle">
                <span>
                  Targeting: <strong>{userTargetRole || 'Staff & Lead Engineer'}</strong>
                  {userDreamCompany ? <> @ <strong>{userDreamCompany}</strong></> : <> @ <strong>Tier-1 Product Cos</strong></>}
                </span>
                <span className="phb-subtitle-dot">•</span>
                <span className="phb-current-role-inline">
                  {userCurrentRoleDisplay || 'Software Engineer'} {userCurrentCompany ? `@ ${userCurrentCompany}` : '@ High Growth Teams'}
                </span>
              </div>

              <p className="phb-desc">
                Connect directly with verified leaders &amp; engineers who made the exact career jump.
              </p>
            </div>

            {currentUser && goalSet ? (
              <div className="phb-right-avatar-showcase">
                <div className="phb-avatar-showcase-ring">
                  <img
                    src={currentUser?.avatar || userProfile.avatar || '/brand/android-chrome-192x192.png'}
                    alt={userProfile.name || currentUser?.name || 'Candidate'}
                    className="phb-avatar-showcase-img"
                  />
                  <span className="phb-verified-avatar-badge-large" title="Verified Candidate Profile">
                    <CheckCircle2 size={17} fill="#10B981" color="#FFFFFF" />
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-phb-edit-goal-pill"
                  onClick={() => setIsCalibrationModalOpen(true)}
                  title="Edit Target Career Goal & Trajectory Benchmark"
                >
                  <SlidersHorizontal size={11} />
                  <span>Edit Goal</span>
                </button>
              </div>
            ) : (
              <div className="phb-right-avatar-showcase phb-right-locked-showcase">
                <div className="phb-avatar-showcase-ring phb-locked-avatar-ring">
                  <div className="phb-locked-avatar-inner">
                    <Lock size={26} className="text-amber" />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-phb-edit-goal-pill btn-phb-unlock-pill"
                  onClick={handleUnlockClick}
                  title={`Unlock ${BRAND.name} to calibrate career trajectory`}
                >
                  <Sparkles size={12} />
                  <span>Unlock {BRAND.name}</span>
                </button>
              </div>
            )}

          </div>
        </div>


        <div className="peerpath-mentors-showcase-section" id="mentorsShowcaseSection">

          <div className="pms-section-header-compact">
            <div className="pms-compact-title-wrap">
              <h2 className="pms-compact-heading">
                <ShieldCheck size={18} className="text-emerald-600 pms-shield-icon" />
                <span>Verified Mentors</span>
                <span className="pms-compact-count-pill">
                  {isLoadingActiveTab || isSwitchingMode ? 'Loading...' : `${displayedMentors.length} Available`}
                </span>
              </h2>
            </div>

            <div className="pms-header-controls-wrap">
              <div className="pms-track-dropdown-container">
                <button
                  type="button"
                  className="pms-track-dropdown-trigger"
                  onClick={() => setIsTrackDropdownOpen(!isTrackDropdownOpen)}
                >
                  <div className="pms-trigger-left">
                    <span className="pms-trigger-kicker">SWITCH TRACK:</span>
                    <strong className="pms-trigger-title">{currentTrackInfo.title}</strong>
                  </div>
                  <div className="pms-trigger-right">
                    <span className="pms-trigger-badge">{currentTrackInfo.growthStat}</span>
                    <ChevronDown size={14} className={`pms-chevron ${isTrackDropdownOpen ? 'open' : ''}`} />
                  </div>
                </button>

                {isTrackDropdownOpen && (
                  <>
                    <div className="pms-dropdown-backdrop" onClick={() => setIsTrackDropdownOpen(false)} />
                    <div className="pms-track-dropdown-menu">
                      <div className="pms-dropdown-header">
                        <span>SELECT CAREER TRANSITION TRACK</span>
                      </div>
                      {[
                        {
                          id: 'top' as MentorCategoryTab,
                          title: 'Top Matches for You',
                          companies: 'Swiggy, Qualcomm, Razorpay',
                          growthStat: matchBadgeLabel('top'),
                          icon: Sparkles,
                          count: domainCounts.top
                        },
                        {
                          id: 'ai' as MentorCategoryTab,
                          title: 'AI & Data Science',
                          companies: 'Swiggy, Google, Microsoft',
                          growthStat: matchBadgeLabel('ai'),
                          icon: Cpu,
                          count: domainCounts.ai
                        },
                        {
                          id: 'semi' as MentorCategoryTab,
                          title: 'Semiconductor & VLSI',
                          companies: 'Qualcomm, NVIDIA, Intel',
                          growthStat: matchBadgeLabel('semi'),
                          icon: Zap,
                          count: domainCounts.semi
                        },
                        {
                          id: 'cyber' as MentorCategoryTab,
                          title: 'Cybersecurity & Cloud',
                          companies: 'Razorpay, AWS, Tier-1',
                          growthStat: matchBadgeLabel('cyber'),
                          icon: ShieldCheck,
                          count: domainCounts.cyber
                        },
                        {
                          id: 'fullstack' as MentorCategoryTab,
                          title: 'Full-Stack & Systems',
                          companies: 'Flipkart, Swiggy, Zepto',
                          growthStat: matchBadgeLabel('fullstack'),
                          icon: Code,
                          count: domainCounts.fullstack
                        },
                        {
                          id: 'others' as MentorCategoryTab,
                          title: 'Product & Leadership',
                          companies: 'Zepto, Razorpay, Swiggy',
                          growthStat: matchBadgeLabel('others'),
                          icon: Compass,
                          count: domainCounts.others
                        },
                        {
                          id: 'all' as MentorCategoryTab,
                          title: 'All Verified Mentors',
                          companies: '35+ Tier-1 Product Firms',
                          growthStat: matchBadgeLabel('all'),
                          icon: Layers,
                          count: domainCounts.all
                        }
                      ].map((t) => {
                        const IconComp = t.icon;
                        const isSelected = activeTab === t.id && !searchQuery;

                        return (
                          <div
                            key={t.id}
                            className={`pms-dropdown-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setActiveTab(t.id);
                              setSearchQuery('');
                              setIsTrackDropdownOpen(false);
                            }}
                          >
                            <div className="pms-item-icon">
                              <IconComp size={15} />
                            </div>
                            <div className="pms-item-details">
                              <div className="pms-item-name-row">
                                <strong className="pms-item-title">{t.title}</strong>
                                <span className="pms-item-growth">{t.growthStat}</span>
                              </div>
                              <span className="pms-item-sub">{t.companies} • {t.count} Mentors</span>
                            </div>
                            {isSelected && (
                              <Check size={14} className="pms-item-check" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="pms-compact-search">
                <Search size={13} className="pms-csearch-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mentor or skill..."
                  className="pms-csearch-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="pms-csearch-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

            </div>
          </div>
          
          {(isLoadingActiveTab || isSwitchingMode) ? (
            <div className="peerpath-mentors-loading-state">
              <Loader2 size={30} className="animate-spin text-purple-600 mb-3" style={{ margin: '0 auto' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Loading Verified Mentors &amp; Available Sessions...
              </h4>
              <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>
                Fetching verified mentors, trajectory match benchmarks, and live 1:1 session slots.
              </p>
            </div>
          ) : (activeTabError && displayedMentors.length === 0) ? (
            <div className="peerpath-mentors-empty-clean">
              <p>{activeTabError}</p>
              <button
                type="button"
                className="btn-pcpb-clear-search"
                onClick={() => {
                  setActiveTab('top');
                  setRefreshTrigger(prev => prev + 1);
                }}
              >
                Show Top Recommended Mentors
              </button>
            </div>
          ) : displayedMentors.length === 0 ? (
            <div className="peerpath-mentors-empty-clean">
              <p>
                {searchQuery
                  ? <>No mentors found matching "<strong>{searchQuery}</strong>"</>
                  : userTargetRole
                    ? <>No verified mentors found for <strong>{userTargetRole}</strong> {userDreamCompany ? <>@ <strong>{userDreamCompany}</strong></> : null} yet.</>
                    : 'No verified mentors found for this track yet.'}
              </p>
              <button
                type="button"
                className="btn-pcpb-clear-search"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
              >
                Browse All Verified Mentors
              </button>
            </div>
          ) : (
            <div className="peerpath-mentors-grid">
              {displayedMentors.map((mentor) => {
                const matchScore = mentor.matchScore;
                return (
                  <div key={mentor.id} className="pm-mentor-card-h">
                  
                  <div className="pm-h-col-left">
                    <div className="pm-avatar-container">
                      <img src={mentor.avatar} alt={mentor.name} className="pm-avatar-img" />
                      <span className="pm-online-dot" title="Available for 1:1 Sessions"></span>
                    </div>

                    <div className="pm-h-profile-details">
                      <div className="pm-h-name-row">
                        <h4 className="pm-mentor-name" title={mentor.name}>{mentor.name}</h4>
                        {matchScore > 0 && (
                          <span className="pm-match-badge">
                            <Zap size={10} fill="currentColor" /> {matchScore}% Match
                          </span>
                        )}
                      </div>

                      <p className="pm-role-company">
                        <span className="pm-role-name" title={mentor.role}>{mentor.role}</span>
                        <span className="pm-company-name" title={`@${mentor.company}`}>@{mentor.company}</span>
                      </p>

                      <div className="pm-meta-row">
                        <span className="pm-rating-text">
                          <Star size={10.5} fill="#F59E0B" color="#F59E0B" />
                          <strong>{mentor.reviewsCount > 0 ? mentor.rating.toFixed(1) : 'New'}</strong>
                        </span>
                        <span className="pm-meta-sep">•</span>
                        {mentor.experience && (
                          <>
                            <span className="pm-exp-text">{mentor.experience}</span>
                            <span className="pm-meta-sep">•</span>
                          </>
                        )}
                        <span className="pm-verified-text">
                          <CheckCircle2 size={10.5} className="text-emerald-600" />
                          Verified
                        </span>
                      </div>

                      <div className="pm-skills-row mt-1">
                        {mentor.skills.slice(0, 3).map((skill, sIdx) => (
                          <span key={sIdx} className="pm-skill-chip">{skill}</span>
                        ))}
                        {mentor.skills.length > 3 && (
                          <span className="pm-skill-chip-more">+{mentor.skills.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pm-h-col-center">
                    <div className="pm-h-transition-card">
                      <div className="pm-h-transition-header">
                        <span className="pm-h-trans-title">
                          <TrendingUp size={11} className="text-emerald-600" />
                          CAREER TRANSITION JOURNEY
                        </span>
                        <span className="pm-leap-pill-badge">
                          <CheckCircle2 size={10} className="text-emerald-600" />
                          Proven Pathway
                        </span>
                      </div>

                      <div className="pm-h-stepper-row">
                        <div className="pm-h-node from">
                          <span className="pm-h-node-label">Started At</span>
                          <strong className="pm-h-node-val" title={mentor.baselineRole}>{mentor.baselineRole}</strong>
                          <span className="pm-h-node-sub" title={mentor.baselineCompany}>{mentor.baselineCompany.replace(/\s+Services$/, '')}</span>
                        </div>

                        <div className="pm-h-node-arrow">
                          <ArrowRight size={13} strokeWidth={2.5} />
                        </div>

                        <div className="pm-h-node to">
                          <span className="pm-h-node-label leap">Switched To</span>
                          <strong className="pm-h-node-val" title={mentor.leapRole}>{mentor.leapRole}</strong>
                          <span className="pm-h-node-sub" title={`@${mentor.leapCompany}`}>@{mentor.leapCompany}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pm-h-col-right">
                    <div className="pm-h-price-wrap">
                      <div className="pm-h-price-main">
                        <span className="pm-h-price-prefix">Starts at</span>
                        <strong className="pm-h-price-num">₹{Math.max(499, Math.round(((mentor.price || 999) * 0.7) / 50) * 50 - 1)}</strong>
                        <span className="pm-h-price-unit">/ session</span>
                      </div>
                    </div>

                    <div className="pm-h-actions-group">
                      {isSelfMentor(mentor, currentUser) ? (
                        <button
                          type="button"
                          className="btn-pm-profile-view"
                          onClick={() => navigate('mentor-dashboard-view', '/mentor')}
                        >
                          <User size={12} />
                          <span>Your Mentor Studio</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-pm-book-session"
                          onClick={() => handleBook1on1(mentor)}
                          title="Book 1:1 Mentorship Session"
                        >
                          <Calendar size={13} />
                          <span>Book 1:1 Session</span>
                          <ArrowRight size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-pm-profile-view"
                        onClick={() => handleViewMentorProfile(mentor.id)}
                        title="View mentor profile & full trajectory"
                      >
                        <User size={12} />
                        <span>View Profile</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
          )}

        </div>

      </div>
    </div>
  );
};
