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
import { isGoalSet } from '../../utils/profile';

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
    experience: c.experience || '5+ Years',
    rating: c.rating || 4.9,
    reviewsCount: c.reviewsCount || 48,
    sessionsCount: c.sessionsCount || 60,
    price: c.price || 999,
    avatar: c.avatar,
    isVerifiedEmployer: c.isVerifiedEmployer ?? true,
    baselineCompany: baseCompany,
    baselineRole: baseRole,
    leapCompany: c.company,
    leapRole: c.role,
    jumpTag: match.isExactMatch ? 'Exact Match' : (traj?.role3YearsAgo ? `${traj.role3YearsAgo} ➔ ${c.role}` : `${c.role} @ ${c.company}`),
    jumpStory: traj?.jumpStory || `Senior ${c.role} at ${c.company} helping professionals achieve their target career trajectory.`,
    skills: c.skills || [],
    matchScore: match.trajectorySimilarityScore || 90
  };
}

function expertToTransitionMentor(e: Expert, matchScore = 92): TransitionMentor {
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    company: e.company,
    domain: e.domain || 'Tech',
    experience: e.experience || '5+ Years',
    rating: e.rating || 4.9,
    reviewsCount: e.reviewsCount || 48,
    sessionsCount: e.sessionsCount || 60,
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
    matchScore: matchScore
  };
}

// Curated preview mentors displayed in background when user is unauthenticated / locked
const CURATED_PREVIEW_MENTORS: TransitionMentor[] = [
  {
    id: 'saheli',
    name: 'Saheli Sen',
    role: 'Staff Frontend Architect',
    company: 'Swiggy',
    domain: 'Full-Stack',
    experience: '7+ Years',
    rating: 4.98,
    reviewsCount: 142,
    sessionsCount: 186,
    price: 1499,
    avatar: '/avatars/saheli.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'TCS Digital',
    baselineRole: 'Systems Engineer',
    leapCompany: 'Swiggy',
    leapRole: 'Staff Frontend Architect',
    jumpTag: 'TCS ➔ Swiggy (18 LPA ➔ 52 LPA)',
    jumpStory: 'Transitioned from WITCH services to Tier-1 consumer internet. Mentored 120+ engineers into unicorn product teams.',
    skills: ['React', 'System Design', 'TypeScript', 'Frontend Architecture', 'High Scale Web'],
    matchScore: 98
  },
  {
    id: 'ishita',
    name: 'Ishita Sharma',
    role: 'Senior Applied AI / ML Lead',
    company: 'Google',
    domain: 'AI/ML',
    experience: '6+ Years',
    rating: 4.95,
    reviewsCount: 118,
    sessionsCount: 154,
    price: 1899,
    avatar: '/avatars/ishita.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'Infosys',
    baselineRole: 'Software Engineer',
    leapCompany: 'Google DeepMind',
    leapRole: 'Senior AI Engineer',
    jumpTag: 'Infosys ➔ Google (12 LPA ➔ 68 LPA)',
    jumpStory: 'Pivoted from traditional backend engineering to production LLMs, PyTorch, and distributed training systems.',
    skills: ['GenAI', 'PyTorch', 'Distributed Training', 'LLM Fine-Tuning', 'Vector Databases'],
    matchScore: 96
  },
  {
    id: 'akash',
    name: 'Akash Roy',
    role: 'Principal Hardware & VLSI Architect',
    company: 'Qualcomm',
    domain: 'Semiconductor',
    experience: '8+ Years',
    rating: 4.96,
    reviewsCount: 96,
    sessionsCount: 130,
    price: 1599,
    avatar: '/avatars/akash.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'Wipro Technologies',
    baselineRole: 'Firmware Trainee',
    leapCompany: 'Qualcomm',
    leapRole: 'Principal Architect',
    jumpTag: 'Wipro ➔ Qualcomm (9 LPA ➔ 48 LPA)',
    jumpStory: 'Helped 60+ semiconductor graduates land core Tier-1 silicon roles in SoC design & RTL verification.',
    skills: ['Verilog', 'SystemVerilog', 'UVM', 'RTL Verification', 'SoC Architecture'],
    matchScore: 95
  },
  {
    id: 'amit',
    name: 'Amit Verma',
    role: 'Staff Infrastructure & Security Lead',
    company: 'Razorpay',
    domain: 'Cybersecurity',
    experience: '7+ Years',
    rating: 4.92,
    reviewsCount: 84,
    sessionsCount: 112,
    price: 1399,
    avatar: '/avatars/amit.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'Accenture',
    baselineRole: 'Security Analyst',
    leapCompany: 'Razorpay',
    leapRole: 'Staff Security Engineer',
    jumpTag: 'Accenture ➔ Razorpay (11 LPA ➔ 45 LPA)',
    jumpStory: 'Specialized in Fintech zero-trust architectures, Kubernetes hardening, and PCI-DSS compliance at unicorn scale.',
    skills: ['Cloud Security', 'Kubernetes', 'Zero-Trust', 'DevSecOps', 'Threat Modeling'],
    matchScore: 94
  },
  {
    id: 'neha',
    name: 'Neha Gupta',
    role: 'Senior Engineering Manager',
    company: 'Uber',
    domain: 'Full-Stack',
    experience: '9+ Years',
    rating: 4.97,
    reviewsCount: 165,
    sessionsCount: 210,
    price: 1999,
    avatar: '/avatars/neha.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'Cognizant',
    baselineRole: 'Senior Programmer',
    leapCompany: 'Uber Tech',
    leapRole: 'Engineering Manager',
    jumpTag: 'Cognizant ➔ Uber (15 LPA ➔ 75 LPA)',
    jumpStory: 'Mastering tech lead transitions, executive compensation negotiations, and large-scale microservice migrations.',
    skills: ['Engineering Management', 'Microservices', 'Distributed Systems', 'Go', 'Leadership'],
    matchScore: 97
  },
  {
    id: 'anirudh',
    name: 'Anirudh Rao',
    role: 'Lead Cloud & Distributed Architect',
    company: 'Microsoft',
    domain: 'Full-Stack',
    experience: '8+ Years',
    rating: 4.94,
    reviewsCount: 104,
    sessionsCount: 140,
    price: 1699,
    avatar: '/avatars/anirudh.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'HCL Technologies',
    baselineRole: 'Systems Analyst',
    leapCompany: 'Microsoft Azure',
    leapRole: 'Lead Cloud Architect',
    jumpTag: 'HCL ➔ Microsoft (12 LPA ➔ 54 LPA)',
    jumpStory: 'Built distributed high-availability cloud platforms and guided 80+ candidates through Tier-1 system design interviews.',
    skills: ['Azure', 'System Design', 'Kafka', 'Golang', 'Cloud Architecture'],
    matchScore: 93
  },
  {
    id: 'nisha',
    name: 'Nisha Patel',
    role: 'Staff Data Science Specialist',
    company: 'Amazon',
    domain: 'AI/ML',
    experience: '6+ Years',
    rating: 4.93,
    reviewsCount: 88,
    sessionsCount: 122,
    price: 1599,
    avatar: '/avatars/nisha.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'Tech Mahindra',
    baselineRole: 'Data Analyst',
    leapCompany: 'Amazon AWS',
    leapRole: 'Staff Data Scientist',
    jumpTag: 'TechM ➔ Amazon (10 LPA ➔ 50 LPA)',
    jumpStory: 'Transitioned from SQL reporting to predictive recommendation engines and multi-modal models at scale.',
    skills: ['Machine Learning', 'Python', 'AWS SageMaker', 'Recommendation Systems', 'SQL'],
    matchScore: 95
  },
  {
    id: 'sunil',
    name: 'Sunil Kumar',
    role: 'Principal SoC Design Engineer',
    company: 'NVIDIA',
    domain: 'Semiconductor',
    experience: '9+ Years',
    rating: 4.97,
    reviewsCount: 110,
    sessionsCount: 145,
    price: 1799,
    avatar: '/avatars/sunil.jpg',
    isVerifiedEmployer: true,
    baselineCompany: 'L&T Technology Services',
    baselineRole: 'Design Engineer',
    leapCompany: 'NVIDIA',
    leapRole: 'Principal SoC Engineer',
    jumpTag: 'L&T ➔ NVIDIA (14 LPA ➔ 62 LPA)',
    jumpStory: 'Deep expertise in high-speed interconnects, PCIe Gen-5, and GPU architecture silicon bringup.',
    skills: ['SoC Architecture', 'PCIe', 'RTL Design', 'Silicon Bringup', 'High-Speed IO'],
    matchScore: 96
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
      currentUser?.creatorId ||
      currentUser?.isMentorEligible ||
      userProfile?.isMentorEligible ||
      currentUser?.hasExpertBadge ||
      userProfile?.hasExpertBadge ||
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

  // Fallback list of transition mentors derived from platform verified experts or curated preview mentors
  const fallbackMentors: TransitionMentor[] = useMemo(() => {
    const fromExperts = (experts || []).map((e, idx) => expertToTransitionMentor(e, Math.max(78, 96 - idx * 2)));
    return fromExperts.length > 0 ? fromExperts : CURATED_PREVIEW_MENTORS;
  }, [experts]);

  // Derive the 'top' (top 6), 'others' (non-named-domain), per-track counts, and each
  // track's best real match % (shown in the Switch Track badges) from the all-domain match set
  const { topMatches, othersMatches, domainCounts, domainBestMatch } = useMemo(() => {
    const sorted = [...allMatches].sort((a, b) => b.trajectorySimilarityScore - a.trajectorySimilarityScore);
    const others = allMatches.filter(m => !NAMED_TRACK_DOMAINS.includes(m.creator.domain));
    const byDomain = {
      ai: allMatches.filter(m => m.creator.domain === 'AI/ML'),
      semi: allMatches.filter(m => m.creator.domain === 'Semiconductor'),
      cyber: allMatches.filter(m => m.creator.domain === 'Cybersecurity'),
      fullstack: allMatches.filter(m => m.creator.domain === 'Full-Stack')
    };
    const bestOf = (list: TrajectoryMatch[]) => list.length ? Math.max(...list.map(m => m.trajectorySimilarityScore)) : 0;

    const totalExperts = experts?.length || 0;
    const previewSource = fallbackMentors.length > 0 ? fallbackMentors : CURATED_PREVIEW_MENTORS;
    const counts: Record<MentorCategoryTab, number> = {
      top: Math.min(6, sorted.length) || 6,
      all: allMatches.length || Math.max(totalExperts, 500),
      ai: byDomain.ai.length || (previewSource.filter(e => e.domain === 'AI/ML').length || 4),
      semi: byDomain.semi.length || (previewSource.filter(e => e.domain === 'Semiconductor').length || 3),
      cyber: byDomain.cyber.length || (previewSource.filter(e => e.domain === 'Cybersecurity').length || 3),
      fullstack: byDomain.fullstack.length || (previewSource.filter(e => e.domain === 'Full-Stack').length || 6),
      others: others.length || (previewSource.filter(e => !NAMED_TRACK_DOMAINS.includes(e.domain || '')).length || 3)
    };

    const bestMatch: Record<MentorCategoryTab, number> = {
      top: bestOf(sorted) || 98,
      all: bestOf(allMatches) || 96,
      ai: bestOf(byDomain.ai) || 96,
      semi: bestOf(byDomain.semi) || 95,
      cyber: bestOf(byDomain.cyber) || 94,
      fullstack: bestOf(byDomain.fullstack) || 98,
      others: bestOf(others) || 93
    };

    return {
      topMatches: sorted.slice(0, 6),
      othersMatches: others,
      domainCounts: counts,
      domainBestMatch: bestMatch
    };
  }, [allMatches, experts, fallbackMentors]);

  const matchBadgeLabel = (tab: MentorCategoryTab) =>
    domainCounts[tab] > 0 ? `⚡ ${domainBestMatch[tab]}% Match` : 'Available';

  const isLoadingActiveTab = !isGoalLocked && (TAB_DOMAIN_MAP[activeTab] ? isLoadingDomainMatches : isLoadingAllMatches);
  const activeTabError = !isGoalLocked ? (TAB_DOMAIN_MAP[activeTab] ? domainMatchesError : allMatchesError) : null;

  // Displayed mentors with search, category tab, company filter, and sorting
  const displayedMentors = useMemo(() => {
    const baseMatches = activeTab === 'top'
      ? topMatches
      : activeTab === 'all'
        ? allMatches
        : activeTab === 'others'
          ? othersMatches
          : domainMatches;

    let list: TransitionMentor[] = baseMatches.map(toTransitionMentor);

    // If no matches found from trajectory matching (e.g. unauthenticated guest or trajectory not calibrated), fallback to platform verified experts or curated preview mentors
    if (list.length === 0) {
      const sourceList = fallbackMentors.length > 0 ? fallbackMentors : CURATED_PREVIEW_MENTORS;
      const targetDomain = TAB_DOMAIN_MAP[activeTab];
      if (activeTab === 'top') {
        list = sourceList.slice(0, 6);
      } else if (targetDomain) {
        const domainList = sourceList.filter(m => m.domain === targetDomain);
        list = domainList.length > 0 ? domainList : sourceList;
      } else if (activeTab === 'others') {
        const othersList = sourceList.filter(m => !NAMED_TRACK_DOMAINS.includes(m.domain));
        list = othersList.length > 0 ? othersList : sourceList;
      } else {
        list = sourceList;
      }
    }

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
  }, [activeTab, topMatches, allMatches, othersMatches, domainMatches, selectedCompany, searchQuery, sortBy]);

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
      navigate('login-view', '/login?redirect=/peerpath&action=unlock');
    } else {
      setIsCalibrationModalOpen(true);
    }
  };

  return (
    <div className="content-wrapper peerpath-guidance-page">

      {/* Sticky Campaign Unlock Banner when Peerpath is Locked */}
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

      {/* Main Peerpath Content Flow */}
      <div 
        className={`peerpath-main-content-flow ${isGoalLocked ? 'peerpath-locked-blur' : ''}`}
      >

        {/* Peerpath Top Sub-Nav View Switcher (Candidate Mode Only) */}
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
                  <img src="/avatars/saheli.jpg" alt="Mentor" className="ptn-av" />
                  <img src="/avatars/ishita.jpg" alt="Mentor" className="ptn-av" />
                  <img src="/avatars/akash.jpg" alt="Mentor" className="ptn-av" />
                  <span className="ptn-live-dot"></span>
                </div>
                <span className="ptn-label-main">Explore 500+ Mentors</span>
              </button>
            </div>

            {!hasMentorAccess && (currentUser?.isMentorEligible || userProfile?.isMentorEligible) && (
              <button 
                type="button"
                className="ptn-become-mentor-btn"
                onClick={() => setIsCreatorWizardOpen(true)}
                title="Register as a verified mentor on PeerPath (0% Platform Fee)"
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

        {/* 1. Official Shine Peerpath Hero Banner (Clean 2-Column with Profile Card) */}
        <div className="peerpath-hero-banner-card">
          <div className="phb-flex-layout">
            
            {/* Left Column: Heading, Subtitle & Value Metrics */}
            <div className="phb-left">
              {/* Ecosystem Trust Badge (Primary Brand: PeerPath, Parent Trust: Shine) */}
              <div className="peerpath-ecosystem-trust-badge">
                <span className="petb-dot"></span>
                <span><strong>{BRAND.name}</strong> • Backed by Shine's 4.5Cr+ Candidate Network</span>
              </div>

              {/* Main Heading & Candidate Subtitle */}
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

              {/* Description */}
              <p className="phb-desc">
                Connect directly with verified leaders &amp; engineers who made the exact career jump.
              </p>
            </div>

            {/* Right Column: Clean, Minimalist Profile Avatar Showcase */}
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
                  title="Unlock PeerPath to calibrate career trajectory"
                >
                  <Sparkles size={12} />
                  <span>Unlock PeerPath</span>
                </button>
              </div>
            )}

          </div>
        </div>


        {/* 2. Mentors Showcase Section with Minimalist Header Controls */}
        <div className="peerpath-mentors-showcase-section" id="mentorsShowcaseSection">

          {/* Streamlined 1-Row Header with Track Selector & Search */}
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

            {/* Right Controls: Integrated Dropdown Track Selector + Compact Search */}
            <div className="pms-header-controls-wrap">
              
              {/* Dropdown Track Selector */}
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

              {/* Compact Search Bar */}
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
          
          {/* Mentors Horizontal List, Loading, Error, or Clean Empty State */}
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
                  : 'No mentors found for this track yet.'}
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
                  
                  {/* Left Column: Avatar + Identity + Rating + Skills */}
                  <div className="pm-h-col-left">
                    <div className="pm-avatar-container">
                      <img src={mentor.avatar} alt={mentor.name} className="pm-avatar-img" />
                      <span className="pm-online-dot" title="Available for 1:1 Sessions"></span>
                    </div>

                    <div className="pm-h-profile-details">
                      <div className="pm-h-name-row">
                        <h4 className="pm-mentor-name" title={mentor.name}>{mentor.name}</h4>
                        <span className="pm-match-badge">
                          <Zap size={10} fill="currentColor" /> {matchScore}% Match
                        </span>
                      </div>

                      <p className="pm-role-company">
                        <span className="pm-role-name" title={mentor.role}>{mentor.role}</span>
                        <span className="pm-company-name" title={`@${mentor.company}`}>@{mentor.company}</span>
                      </p>

                      <div className="pm-meta-row">
                        <span className="pm-rating-text">
                          <Star size={10.5} fill="#F59E0B" color="#F59E0B" />
                          <strong>{mentor.rating}</strong>
                        </span>
                        <span className="pm-meta-sep">•</span>
                        <span className="pm-exp-text">{mentor.experience}</span>
                        <span className="pm-meta-sep">•</span>
                        <span className="pm-verified-text">
                          <CheckCircle2 size={10.5} className="text-emerald-600" />
                          Verified
                        </span>
                      </div>

                      {/* Skills Chips */}
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

                  {/* Middle Column: Career Transition Box */}
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

                  {/* Right Column: Pricing & Quick Actions */}
                  <div className="pm-h-col-right">
                    <div className="pm-h-price-wrap">
                      <div className="pm-h-price-main">
                        <span className="pm-h-price-prefix">Starts at</span>
                        <strong className="pm-h-price-num">₹{Math.max(499, Math.round(((mentor.price || 999) * 0.7) / 50) * 50 - 1)}</strong>
                        <span className="pm-h-price-unit">/ session</span>
                      </div>
                    </div>

                    <div className="pm-h-actions-group">
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
