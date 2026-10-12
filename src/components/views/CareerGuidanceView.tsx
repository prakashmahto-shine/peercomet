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
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    company: c.company,
    domain: c.domain,
    experience: c.experience,
    rating: c.rating,
    reviewsCount: c.reviewsCount,
    sessionsCount: c.sessionsCount,
    price: c.price,
    avatar: c.avatar,
    isVerifiedEmployer: c.isVerifiedEmployer,
    baselineCompany: c.trajectory.company3YearsAgo,
    baselineRole: c.trajectory.role3YearsAgo,
    leapCompany: c.company,
    leapRole: c.role,
    jumpTag: match.isExactMatch ? 'Exact Match' : `${c.trajectory.role3YearsAgo} ➔ ${c.role}`,
    jumpStory: c.trajectory.jumpStory,
    skills: c.skills,
    matchScore: match.trajectorySimilarityScore
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
    setIsCreatorWizardOpen, 
    currentUser, 
    isCreatorMode,
    isCalibrationModalOpen,
    setIsCalibrationModalOpen,
    bootcamps,
    registeredBootcampIds,
    registerForBootcamp,
    setBookingDraft,
    setIsBookingModalOpen,
    toggleFollowMentor,
    isFollowingMentor
  } = useApp();

  const [activeTab, setActiveTab] = useState<MentorCategoryTab>('top');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'experience' | 'price'>('match');
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState<boolean>(false);
  const isMentor = currentUser?.role === 'mentor';

  // Automatically trigger Unlock/Calibration modal if candidate is not calibrated
  useEffect(() => {
    if (!userProfile.isCalibrated && !isCreatorMode) {
      setIsCalibrationModalOpen(true);
    }
  }, [userProfile.isCalibrated, isCreatorMode]);

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
  const userCurrentRole = userProfile.pastCompanyRole
    || (userProfile.headline ? userProfile.headline.split('|')[0].split('•')[0].split('@')[0].trim() : '')
    || 'Software Engineer';

  const [allMatches, setAllMatches] = useState<TrajectoryMatch[]>([]);
  const [isLoadingAllMatches, setIsLoadingAllMatches] = useState<boolean>(true);
  const [allMatchesError, setAllMatchesError] = useState<string | null>(null);

  const [domainMatches, setDomainMatches] = useState<TrajectoryMatch[]>([]);
  const [isLoadingDomainMatches, setIsLoadingDomainMatches] = useState<boolean>(false);
  const [domainMatchesError, setDomainMatchesError] = useState<string | null>(null);

  // Fetch across all domains whenever the candidate context changes — powers the 'top'/'all'/'others'
  // tabs (which intentionally mix domains) and the per-track mentor counts in the Switch Track dropdown.
  useEffect(() => {
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
      if (isCurrent) setAllMatches(matches || []);
    }).catch(err => {
      console.warn('[CareerGuidanceView all-domain trajectory match]:', err);
      if (isCurrent) setAllMatchesError('Failed to load matched mentors. Please try again.');
    }).finally(() => {
      if (isCurrent) setIsLoadingAllMatches(false);
    });

    return () => { isCurrent = false; };
  }, [userCurrentRole, userCurrentCompany, userProfile.experienceYears, userProfile.currentCtc, userTargetRole, userProfile.targetCtc, userDreamCompany, userProfile.skills]);

  // Re-fetch scoped to a single domain whenever a track tab that maps to one domain is selected.
  useEffect(() => {
    const domain = TAB_DOMAIN_MAP[activeTab];
    if (!domain) {
      setDomainMatches([]);
      setDomainMatchesError(null);
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
      if (isCurrent) setDomainMatchesError('Failed to load matched mentors for this track. Please try again.');
    }).finally(() => {
      if (isCurrent) setIsLoadingDomainMatches(false);
    });

    return () => { isCurrent = false; };
  }, [activeTab, userCurrentRole, userCurrentCompany, userProfile.experienceYears, userProfile.currentCtc, userTargetRole, userProfile.targetCtc, userDreamCompany, userProfile.skills]);

  // Derive the 'top' (top 5), 'others' (non-named-domain), per-track counts, and each
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

    const counts: Record<MentorCategoryTab, number> = {
      top: Math.min(5, sorted.length),
      all: allMatches.length,
      ai: byDomain.ai.length,
      semi: byDomain.semi.length,
      cyber: byDomain.cyber.length,
      fullstack: byDomain.fullstack.length,
      others: others.length
    };

    const bestMatch: Record<MentorCategoryTab, number> = {
      top: bestOf(sorted),
      all: bestOf(allMatches),
      ai: bestOf(byDomain.ai),
      semi: bestOf(byDomain.semi),
      cyber: bestOf(byDomain.cyber),
      fullstack: bestOf(byDomain.fullstack),
      others: bestOf(others)
    };

    return {
      topMatches: sorted.slice(0, 5),
      othersMatches: others,
      domainCounts: counts,
      domainBestMatch: bestMatch
    };
  }, [allMatches]);

  const matchBadgeLabel = (tab: MentorCategoryTab) =>
    domainCounts[tab] > 0 ? `⚡ ${domainBestMatch[tab]}% Match` : 'No mentors yet';

  const isLoadingActiveTab = TAB_DOMAIN_MAP[activeTab] ? isLoadingDomainMatches : isLoadingAllMatches;
  const activeTabError = TAB_DOMAIN_MAP[activeTab] ? domainMatchesError : allMatchesError;

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

  return (
    <div className="content-wrapper peerpath-guidance-page">

      {/* Sticky Campaign Unlock Banner when Peerpath is Locked */}
      {!userProfile.isCalibrated && !isCreatorMode && (
        <div 
          className="peerpath-locked-unlock-banner"
          onClick={() => setIsCalibrationModalOpen(true)}
          title="Click to calibrate your dream career trajectory"
        >
          <div className="plub-left">
            <div className="plub-icon-wrap">
              <Lock size={26} className="text-amber" />
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
            onClick={(e) => {
              e.stopPropagation();
              setIsCalibrationModalOpen(true);
            }}
          >
            <Sparkles size={16} /> Unlock {BRAND.name}
          </button>
        </div>
      )}

      {/* Main Peerpath Content Flow */}
      <div 
        className={`peerpath-main-content-flow ${!userProfile.isCalibrated && !isCreatorMode ? 'peerpath-locked-blur' : ''}`}
        onClick={() => {
          if (!userProfile.isCalibrated && !isCreatorMode) {
            setIsCalibrationModalOpen(true);
          }
        }}
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
                <span>Matched Mentors</span>
                <span className="ptn-badge-pill">Target Matched</span>
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

            {!isMentor && (currentUser?.isMentorEligible ?? false) && (
              <button 
                type="button"
                className="ptn-become-mentor-btn"
                onClick={() => setIsCreatorWizardOpen(true)}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Become a Mentor</span>
                <span className="ptn-zero-fee-tag">0% Fee</span>
              </button>
            )}
          </div>
        )}

        {/* 1. Official Shine Peerpath Hero Banner (Clean 2-Column with Profile Card) */}
        <div className="peerpath-hero-banner-card">
          <div className="phb-flex-layout">
            
            {/* Left Column: Heading, Subtitle & Value Metrics */}
            <div className="phb-left">
              {/* Ecosystem Trust Badge (Zomato/Blinkit Trust model) */}
              <div className="peerpath-ecosystem-trust-badge">
                <span className="petb-dot"></span>
                <span><strong>{BRAND.tagline}</strong> • Backed by 3.5Cr+ Candidate Network</span>
              </div>

              {/* Main Heading & Candidate Subtitle */}
              <h1 className="phb-title">
                Targeted Mentors for {userProfile.name || 'Prakash Mahto'}
              </h1>
              <div className="phb-role-subtitle">
                <span>Targeting: <strong>{userTargetRole}</strong> @ <strong>{userDreamCompany}</strong></span>
                <span className="phb-subtitle-dot">•</span>
                <span className="phb-current-role-inline">
                  {(userProfile.headline ? userProfile.headline.split('|')[0].split('•')[0].split('@')[0].trim() : 'Senior Software Engineer')} @ {userCurrentCompany}
                </span>
              </div>

              {/* Description */}
              <p className="phb-desc">
                Connect directly with verified leaders & engineers who made the exact career jump.
              </p>
            </div>

            {/* Right Column: Clean, Minimalist Profile Avatar Showcase */}
            <div className="phb-right-avatar-showcase">
              <div className="phb-avatar-showcase-ring">
                <img
                  src={currentUser?.avatar || '/avatars/prakash.jpg'}
                  alt={userProfile.name || 'Prakash Mahto'}
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
                title="Edit Target Role & Compensation Benchmark"
              >
                <SlidersHorizontal size={11} />
                <span>Edit Goal</span>
              </button>
            </div>

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
                <span className="pms-compact-count-pill">{displayedMentors.length} Available</span>
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
                          companies: 'Zepto, Shine (HT Media)',
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
          {isLoadingActiveTab ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' }}>
              <Loader2 size={28} className="animate-spin text-purple-600 mb-2" style={{ margin: '0 auto' }} />
              <p style={{ color: '#64748B', fontSize: '14px' }}>Matching you with verified trajectory mentors...</p>
            </div>
          ) : activeTabError ? (
            <div className="peerpath-mentors-empty-clean">
              <p>{activeTabError}</p>
              <button
                type="button"
                className="btn-pcpb-clear-search"
                onClick={() => setActiveTab('top')}
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
                  setActiveTab('top');
                }}
              >
                Show Top Recommended Mentors
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
