import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Compass, Sparkles, Video, User, Clock, MapPin, GraduationCap, 
  Zap, CheckCircle2, ThumbsUp, Check, ArrowRight, TrendingUp,
  Briefcase, Star, Building2, UserCheck, ChevronLeft, ChevronRight, ChevronDown, Award, Plus, Lock, LockOpen, Users,
  ShieldCheck, Loader2, BarChart2, Target, Lightbulb, IndianRupee, Wifi, Filter, Info, Cpu, Code, BookOpen,
  Calendar, RefreshCw, Layers, ExternalLink, UserPlus, Search, X, SlidersHorizontal, XCircle, Quote
} from 'lucide-react';
import { ViewType, Expert, TrajectoryMatch } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateSalaryBenchmark } from '../../utils/salaryBenchmark';
import { peerpathApi } from '../../services/api';
import { BRAND } from '../../config/brand';
import { isGoalSet, isSelfMentor } from '../../utils/profile';
import { getUserAvatar } from '../../utils/avatar';

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



const PROVEN_SUCCESS_STORIES = [
  {
    id: 'story-rohan',
    name: 'Rohan Kulkarni',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=160',
    startCompany: 'Infosys',
    endCompany: 'Swiggy',
    targetRole: 'SDE-2',
    ctcJump: '₹6.2L ➔ ₹27.5 LPA',
    hike: '+343% Hike',
    rating: 5,
    mentorMentored: 'Priya Nair (Swiggy)',
    quote: 'My resume was rejected by every ATS. After 3 mock System Design sessions with my Swiggy mentor focusing on Kafka & caching, I cleared Swiggy SDE-2 with a 27.5 LPA offer!'
  },
  {
    id: 'story-sneha',
    name: 'Sneha Mukherjee',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=160',
    startCompany: 'Cognizant',
    endCompany: 'Microsoft',
    targetRole: 'Senior SDE (L63)',
    ctcJump: '₹8.0L ➔ ₹38.5 LPA',
    hike: '+381% Hike',
    rating: 5,
    mentorMentored: 'Vikram Malhotra (Microsoft)',
    quote: 'My mentor from Microsoft pointed out that my communication & concurrency trade-offs were weak. Fixing those 2 things helped me crack Microsoft Senior SDE!'
  },
  {
    id: 'story-amit',
    name: 'Amit Patil',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=160',
    startCompany: 'Wipro',
    endCompany: 'Uber',
    targetRole: 'Staff AI Architect',
    ctcJump: '₹9.0L ➔ ₹46.0 LPA',
    hike: '+411% Hike',
    rating: 5,
    mentorMentored: 'Rohan Deshmukh (Uber)',
    quote: 'The production RAG systems guidance and salary negotiation advice from my Uber mentor was worth 100x the session price. Cleared Uber Staff AI with a 46 LPA package!'
  }
];

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
    setIsLoginModalOpen,
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
  // Registration / personalization: career goal can be set for custom trajectory match %
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

  const [activeTab, setActiveTab] = useState<MentorCategoryTab>('top');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'experience' | 'price'>('match');
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState<boolean>(false);
  const [activePathway, setActivePathway] = useState<'service-to-product' | 'junior-to-senior' | 'qa-to-dev' | 'swe-to-ai'>('service-to-product');
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const storiesRef = useRef<HTMLDivElement>(null);

  const handleStoriesScroll = () => {
    if (!storiesRef.current) return;
    const container = storiesRef.current;
    const scrollLeft = container.scrollLeft;
    const card = container.querySelector('.cm-story-card') as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 12;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveStoryIndex(Math.min(Math.max(newIndex, 0), PROVEN_SUCCESS_STORIES.length - 1));
  };

  const scrollToStory = (index: number) => {
    if (!storiesRef.current) return;
    const container = storiesRef.current;
    const cards = container.getElementsByClassName('cm-story-card');
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      setActiveStoryIndex(index);
    }
  };

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
    // If not authenticated or goal is not set, do not call matchTrajectories;
    // seamlessly rely on platform verified mentors so no 503/401 errors occur.
    if (!currentUser || !goalSet) {
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
  }, [currentUser?.id, goalSet, userCurrentRole, userCurrentCompany, userProfile.experienceYears, userProfile.currentCtc, userTargetRole, userProfile.targetCtc, userDreamCompany, userProfile.skills, refreshTrigger]);

  // Re-fetch scoped to a single domain whenever a track tab that maps to one domain is selected or mode refreshes.
  useEffect(() => {
    const domain = TAB_DOMAIN_MAP[activeTab];
    if (!domain || !currentUser || !goalSet) {
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
  }, [activeTab, currentUser?.id, goalSet, userCurrentRole, userCurrentCompany, userProfile.experienceYears, userProfile.currentCtc, userTargetRole, userProfile.targetCtc, userDreamCompany, userProfile.skills, refreshTrigger]);

  // List of transition mentors derived exclusively from live platform verified experts
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
    const allAvailable = experts || [];
    const matchedExpert: Expert = allAvailable.find(e => e.id === mentor.id) || {
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

  const handlePersonalizeClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      setIsLoginModalOpen(true);
    } else {
      setIsCalibrationModalOpen(true);
    }
  };

  return (
    <div className="content-wrapper peerpath-guidance-page">

      <div className="peerpath-main-content-flow">

        {currentUser && !isCreatorMode && (
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
                    <img key={exp.id || idx} src={getUserAvatar(exp.name, exp.avatar)} alt={exp.name} className="ptn-av" />
                  ))}
                  <span className="ptn-live-dot"></span>
                </div>
                <span className="ptn-label-main">Browse All 35+ Mentors</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-cm-secondary-cta"
              onClick={handlePersonalizeClick}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              <SlidersHorizontal size={13} />
              <span>Personalize Target Role</span>
            </button>
          </div>
        )}

        {/* CANDIDATE MOTIVATION HERO SECTION */}
        <div className="cm-hero-container">
          <div className="cm-hero-content-split">
            <div className="cm-hero-left">
              <div className="cm-hero-badge-row">
                <span className="cm-trust-badge">
                  <Sparkles size={12} className="text-purple-600" />
                  <span>300,000+ Active Jobs on Shine • 1:1 Mentorship</span>
                </span>
              </div>

              <h1 className="cm-hero-main-title">
                You Have The Talent.<br />
                <span className="gradient-text">You Just Need The Right Direction.</span>
              </h1>

              <p className="cm-hero-subtitle">
                Stop sending 100s of resumes into ATS black holes. Connect 1:1 with Senior &amp; Staff Engineers at Google, Microsoft, Amazon, Swiggy, and Uber who made your exact jump and will guide you step-by-step.
              </p>

              {/* Mobile Mentors Social Proof Credibility Bar */}
              <div className="cm-hero-mobile-social-proof">
                <div className="cm-hm-avatars-group">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
                    alt="Tech Lead @ Google"
                    className="cm-hm-avatar"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120"
                    alt="Engineering Director @ Flipkart"
                    className="cm-hm-avatar"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120"
                    alt="Product Manager @ Microsoft"
                    className="cm-hm-avatar"
                  />
                </div>
                <div className="cm-hm-proof-text">
                  <div className="cm-hm-stars-row">
                    <div className="cm-hm-stars">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} fill="#F59E0B" color="#F59E0B" />
                      ))}
                    </div>
                    <span className="cm-hm-rating-num">4.9/5 Rating</span>
                  </div>
                  <span className="cm-hm-proof-label">1:1 Mentors from Google, Flipkart &amp; Microsoft</span>
                </div>
              </div>

              <div className="cm-hero-cta-group">
                {currentUser ? (
                  <>
                    <button
                      type="button"
                      className="btn-cm-primary-cta"
                      onClick={scrollToMentors}
                    >
                      <Search size={16} />
                      <span>Find Your Dream Mentor</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn-cm-secondary-cta"
                      onClick={handlePersonalizeClick}
                    >
                      <Target size={16} />
                      <span>Calibrate Career Target</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-cm-primary-cta"
                      onClick={() => navigate('login-view', '/login?redirect=/')}
                    >
                      <Sparkles size={16} />
                      <span>Unlock Your Trajectory</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn-cm-secondary-cta"
                      onClick={() => {
                        const el = document.getElementById('simulatorSection');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Compass size={16} />
                      <span>Explore Career Trajectory</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* HERO RIGHT VISUAL BANNER (DESKTOP) - Mentor Trajectory Graphic matching Image 2 */}
            <div className="cm-hero-right-banner" aria-hidden="true">
              <div className="cm-hero-visual-stage">
                {/* Soft ambient background glow */}
                <div className="cm-hvs-ambient-glow" />

                {/* Dotted curved trajectory connector SVG */}
                <svg className="cm-hvs-trajectory-svg" viewBox="0 0 440 380" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <marker id="cmArrowhead" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#8B5CF6" />
                    </marker>
                  </defs>
                  {/* Curve from Flipkart (left) up toward Google (top right) */}
                  <path
                    d="M 180 130 C 205 75, 235 60, 268 70"
                    stroke="#A78BFA"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    fill="none"
                  />
                  {/* Curve from Google (top right) down to Microsoft (bottom center) */}
                  <path
                    d="M 342 154 C 355 180, 340 205, 310 220"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    fill="none"
                    markerEnd="url(#cmArrowhead)"
                  />
                </svg>

                {/* Card 1: Top Right - Google Tech Lead */}
                <div className="cm-hvs-card cm-hvs-card-google">
                  <div className="cm-hvs-photo-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=280"
                      alt="Tech Lead @ Google"
                      className="cm-hvs-photo"
                    />
                  </div>
                  <div className="cm-hvs-badge">
                    <span className="cm-hvs-logo">
                      <svg viewBox="0 0 24 24" width="15" height="15">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                    </span>
                    <div className="cm-hvs-badge-text">
                      <strong className="cm-hvs-badge-role">Tech Lead</strong>
                      <span className="cm-hvs-badge-comp">@ Google</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Left Center - Flipkart Engineering Director */}
                <div className="cm-hvs-card cm-hvs-card-flipkart">
                  <div className="cm-hvs-photo-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=280"
                      alt="Engineering Director @ Flipkart"
                      className="cm-hvs-photo"
                    />
                  </div>
                  <div className="cm-hvs-badge">
                    <span className="cm-hvs-logo">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <rect x="4" y="7" width="16" height="14" rx="3" fill="#F59E0B"/>
                        <path d="M8 7V5a4 4 0 0 1 8 0v2" stroke="#EC4899" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                        <path d="M12 11v6m-2.5-3.5h5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <div className="cm-hvs-badge-text">
                      <strong className="cm-hvs-badge-role">Engineering Director</strong>
                      <span className="cm-hvs-badge-comp">@ Flipkart</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Bottom Center - Microsoft Product Manager */}
                <div className="cm-hvs-card cm-hvs-card-microsoft">
                  <div className="cm-hvs-photo-wrap">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=280"
                      alt="Product Manager @ Microsoft"
                      className="cm-hvs-photo"
                    />
                  </div>
                  <div className="cm-hvs-badge">
                    <span className="cm-hvs-logo">
                      <svg viewBox="0 0 24 24" width="15" height="15">
                        <rect x="2" y="2" width="9" height="9" fill="#F25022"/>
                        <rect x="13" y="2" width="9" height="9" fill="#7FBA00"/>
                        <rect x="2" y="13" width="9" height="9" fill="#00A4EF"/>
                        <rect x="13" y="13" width="9" height="9" fill="#FFB900"/>
                      </svg>
                    </span>
                    <div className="cm-hvs-badge-text">
                      <strong className="cm-hvs-badge-role">Product Manager</strong>
                      <span className="cm-hvs-badge-comp">@ Microsoft</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Left Floating Badge: Real people. Real guidance. Real growth. */}
                <div className="cm-hvs-growth-pill">
                  <div className="cm-hvs-growth-icon">
                    <TrendingUp size={16} />
                  </div>
                  <div className="cm-hvs-growth-text">
                    <span>Real people.</span>
                    <span>Real guidance.</span>
                    <strong>Real growth.</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="cm-stats-strip">
            <div className="cm-stat-item">
              <span className="cm-stat-number highlight">140%+</span>
              <span className="cm-stat-label">Average CTC Hike</span>
            </div>
            <div className="cm-stat-item">
              <span className="cm-stat-number">1:1 Private</span>
              <span className="cm-stat-label">Live Video Mocks &amp; Reviews</span>
            </div>
            <div className="cm-stat-item">
              <span className="cm-stat-number highlight">94%</span>
              <span className="cm-stat-label">Interview Clearing Rate</span>
            </div>
            <div className="cm-stat-item">
              <span className="cm-stat-number">500+</span>
              <span className="cm-stat-label">Engineers in Tier-1 Cos</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: INTERACTIVE CAREER TRANSITION SIMULATOR */}
        <div className="cm-pathway-sim-card" id="simulatorSection">
          <div className="cm-sim-header">
            <span className="cm-section-kicker" style={{ background: 'rgba(255,255,255,0.1)', color: '#C084FC', borderColor: 'rgba(255,255,255,0.2)' }}>
              CAREER JUMP SIMULATOR
            </span>
            <h2 className="cm-sim-title">Explore Your Target Career Trajectory</h2>
            <p className="cm-sim-subtitle">Select your current stage to see realistic salary jumps and the exact roadmap required.</p>
          </div>

          <div className="cm-sim-tabs">
            <button
              type="button"
              className={`cm-sim-tab-btn ${activePathway === 'service-to-product' ? 'active' : ''}`}
              onClick={() => setActivePathway('service-to-product')}
            >
              🚀 Service ➔ Tier-1 Product
            </button>
            <button
              type="button"
              className={`cm-sim-tab-btn ${activePathway === 'junior-to-senior' ? 'active' : ''}`}
              onClick={() => setActivePathway('junior-to-senior')}
            >
              ⚡ Junior SDE ➔ Senior / Staff Lead
            </button>
            <button
              type="button"
              className={`cm-sim-tab-btn ${activePathway === 'qa-to-dev' ? 'active' : ''}`}
              onClick={() => setActivePathway('qa-to-dev')}
            >
              🎯 QA / Support ➔ Full-Stack Dev
            </button>
            <button
              type="button"
              className={`cm-sim-tab-btn ${activePathway === 'swe-to-ai' ? 'active' : ''}`}
              onClick={() => setActivePathway('swe-to-ai')}
            >
              🧠 Traditional SWE ➔ AI / GenAI Lead
            </button>
          </div>

          {activePathway === 'service-to-product' && (
            <div className="cm-sim-body">
              <div className="cm-sim-metric-box">
                <span className="cm-sim-metric-label">Estimated CTC Jump (TCS/Infosys ➔ Swiggy/Uber)</span>
                <div className="cm-sim-jump-display">
                  <span className="cm-sim-old-val">₹6.5 LPA</span>
                  <ArrowRight size={20} className="text-purple-400" />
                  <span className="cm-sim-new-val">₹26.0 LPA</span>
                  <span className="cm-sim-hike-badge">+300% Jump</span>
                </div>
                <span className="cm-sim-target-note">
                  Target: SDE-2 @ Tier-1 Product Unicorns • Realistic Timeline: 8-12 Weeks
                </span>
              </div>
              <div className="cm-sim-highlights-list">
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Master High-Level Architecture (caching, Kafka messaging, DB sharding)</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>1:1 Mock Interviews to fix communication, algorithmic trade-offs &amp; edge cases</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>ATS-Optimized resume showing scalable system impact rather than maintenance tickets</span>
                </div>
              </div>
            </div>
          )}

          {activePathway === 'junior-to-senior' && (
            <div className="cm-sim-body">
              <div className="cm-sim-metric-box">
                <span className="cm-sim-metric-label">Estimated CTC Jump (SDE-1 ➔ Senior / Staff)</span>
                <div className="cm-sim-jump-display">
                  <span className="cm-sim-old-val">₹14.0 LPA</span>
                  <ArrowRight size={20} className="text-purple-400" />
                  <span className="cm-sim-new-val">₹38.5 LPA</span>
                  <span className="cm-sim-hike-badge">+175% Jump</span>
                </div>
                <span className="cm-sim-target-note">
                  Target: Senior / Staff Engineer @ Google, Microsoft • Realistic Timeline: 10-14 Weeks
                </span>
              </div>
              <div className="cm-sim-highlights-list">
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Low-Level Design (LLD), Object-Oriented Principles &amp; Clean Architecture</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Leadership Principles &amp; Amazon Bar Raiser behavioral evaluation preparation</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Multi-offer compensation negotiation strategies to get top-of-band equity &amp; base</span>
                </div>
              </div>
            </div>
          )}

          {activePathway === 'qa-to-dev' && (
            <div className="cm-sim-body">
              <div className="cm-sim-metric-box">
                <span className="cm-sim-metric-label">Estimated CTC Jump (QA / Support ➔ Full-Stack Dev)</span>
                <div className="cm-sim-jump-display">
                  <span className="cm-sim-old-val">₹5.0 LPA</span>
                  <ArrowRight size={20} className="text-purple-400" />
                  <span className="cm-sim-new-val">₹18.0 LPA</span>
                  <span className="cm-sim-hike-badge">+260% Jump</span>
                </div>
                <span className="cm-sim-target-note">
                  Target: Full-Stack Developer @ High Growth Startups • Realistic Timeline: 12-16 Weeks
                </span>
              </div>
              <div className="cm-sim-highlights-list">
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Live full-stack project building with React, Node.js, and PostgreSQL</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Data Structures &amp; Algorithm core problem solving for coding rounds</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Direct code review and portfolio feedback from working engineers</span>
                </div>
              </div>
            </div>
          )}

          {activePathway === 'swe-to-ai' && (
            <div className="cm-sim-body">
              <div className="cm-sim-metric-box">
                <span className="cm-sim-metric-label">Estimated CTC Jump (Traditional SWE ➔ AI / GenAI Lead)</span>
                <div className="cm-sim-jump-display">
                  <span className="cm-sim-old-val">₹16.0 LPA</span>
                  <ArrowRight size={20} className="text-purple-400" />
                  <span className="cm-sim-new-val">₹45.0 LPA</span>
                  <span className="cm-sim-hike-badge">+181% Jump</span>
                </div>
                <span className="cm-sim-target-note">
                  Target: GenAI &amp; LLM Systems Architect • Realistic Timeline: 8-12 Weeks
                </span>
              </div>
              <div className="cm-sim-highlights-list">
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Retrieval Augmented Generation (RAG) &amp; Vector Database architecture</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Model fine-tuning, latency optimization &amp; production MLOps deployment</span>
                </div>
                <div className="cm-sim-hl-item">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>GenAI system design mock interviews with Uber &amp; Google AI leads</span>
                </div>
              </div>
            </div>
          )}

          <div className="cm-sim-cta-wrap">
            <button
              type="button"
              className="btn-cm-sim-action"
              onClick={() => {
                if (currentUser) {
                  scrollToMentors();
                } else {
                  navigate('login-view', '/login?redirect=/');
                }
              }}
            >
              <Sparkles size={15} />
              <span>{currentUser ? 'Find Mentors For This Jump' : 'Unlock Your Trajectory'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>


        {currentUser && (
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
        )}

        {/* SECTION 3: CANDIDATE SUCCESS TRANSFORMATIONS */}
        <div style={{ marginTop: '36px' }}>
          <div className="cm-section-header">
            <span className="cm-section-kicker">PROVEN SUCCESS STORIES</span>
            <h2 className="cm-section-title">Engineers Who Made The Leap</h2>
            <p className="cm-section-desc">
              Real engineers who had the talent, got the right 1:1 direction, and cracked Tier-1 product roles.
            </p>
          </div>

          <div 
            ref={storiesRef} 
            onScroll={handleStoriesScroll}
            className="cm-stories-grid"
          >
            {PROVEN_SUCCESS_STORIES.map((story) => (
              <div key={story.id} className="cm-story-card">
                <div>
                  <div className="cm-story-top-row">
                    <div className="cm-story-rating">
                      {[...Array(story.rating)].map((_, i) => (
                        <Star key={i} size={13} fill="#F59E0B" color="#F59E0B" />
                      ))}
                    </div>
                    <span className="cm-story-verified-tag">
                      <ShieldCheck size={11} className="text-emerald-600" /> Verified Offer
                    </span>
                  </div>

                  <div className="cm-story-ctc-leap">
                    <span className="cm-story-ctc-text">{story.ctcJump}</span>
                    <span className="cm-story-hike-pill">{story.hike}</span>
                  </div>

                  <div className="cm-story-quote-wrap">
                    <Quote size={16} className="cm-story-quote-icon" />
                    <p className="cm-story-quote">{story.quote}</p>
                  </div>
                </div>

                <div className="cm-story-author">
                  <div className="cm-story-user-info">
                    <img src={story.avatar} alt={story.name} className="cm-story-avatar" />
                    <div>
                      <strong className="cm-story-name">
                        <span className="cm-privacy-blurred-name">{story.name}</span>
                        <span className="cm-privacy-badge">Candidate</span>
                      </strong>
                      <div className="cm-story-transition">
                        <span className="cm-story-company-prev">{story.startCompany}</span>
                        <ArrowRight size={11} className="cm-story-arrow" />
                        <span className="cm-story-company-next">{story.targetRole} @ {story.endCompany}</span>
                      </div>
                    </div>
                  </div>
                  <div className="cm-story-mentor-attribution">
                    <Sparkles size={11} className="text-purple-600" />
                    <span>Guided by <strong className="cm-privacy-blurred-name">{story.mentorMentored.split(' (')[0]}</strong> ({story.endCompany} Mentor)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Stories Interactive Navigation Bar */}
          <div className="cm-stories-mobile-nav">
            <button
              type="button"
              className="cm-story-nav-btn"
              onClick={() => scrollToStory(Math.max(0, activeStoryIndex - 1))}
              disabled={activeStoryIndex === 0}
              aria-label="Previous story"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="cm-stories-dots">
              {PROVEN_SUCCESS_STORIES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToStory(idx)}
                  className={`cm-story-dot ${activeStoryIndex === idx ? 'active' : ''}`}
                  aria-label={`Go to story ${idx + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="cm-story-nav-btn"
              onClick={() => scrollToStory(Math.min(PROVEN_SUCCESS_STORIES.length - 1, activeStoryIndex + 1))}
              disabled={activeStoryIndex === PROVEN_SUCCESS_STORIES.length - 1}
              aria-label="Next story"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="cm-stories-mobile-hint">
            <span>👈 Swipe cards or tap dots to explore all leaps 👉</span>
          </div>
        </div>

        {/* SECTION 7: CLOSING MOTIVATIONAL CTA */}
        <div className="cm-closing-cta-card">
          <h2 className="cm-closing-title">Your Talent Deserves A Tier-1 Stage. Stop Waiting For Luck.</h2>
          <p className="cm-closing-subtitle">
            One 45-minute conversation with an engineer who actually conducts interviews at Google, Swiggy, or Amazon 
            can change the trajectory of your next 10 years.
          </p>
          <button
            type="button"
            className="btn-cm-closing-action"
            onClick={() => {
              if (currentUser) {
                scrollToMentors();
              } else {
                navigate('login-view', '/login?redirect=/');
              }
            }}
          >
            {currentUser ? <Search size={18} /> : <Sparkles size={18} />}
            <span>{currentUser ? 'Find Your Transition Mentor Now' : 'Unlock Your Trajectory'}</span>
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};
