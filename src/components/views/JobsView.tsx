import React, { useState, useMemo, useEffect } from 'react';
import { 
  Briefcase, MapPin, Clock, Share2, Bookmark, ArrowRight, Check, 
  Edit3, Filter, ArrowUpDown, ChevronDown, Search, X,
  Compass, Sparkles, UserCheck, Loader2, Award, CheckCircle2
} from 'lucide-react';
import { ViewType, ShineJob, GapAnalysisResult, PathwayTrackKey } from '../../types';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';

// Fallback initial jobs list if offline
const FALLBACK_JOBS: ShineJob[] = [
  {
    id: 'srp-job-1',
    title: 'Senior React / Java Developer',
    company: 'IQuest Management Consultants Pvt Ltd.',
    companyInitials: 'IM',
    companyColor: '#C026D3',
    postedTime: '3 days ago',
    exp: '5 to 10 Yrs',
    salary: '₹14 – ₹22 Lakh/Yr',
    salaryNum: 22,
    loc: 'Pune',
    domain: 'Full-Stack',
    requiredSkills: ['react.js', 'java', 'sql', 'typescript'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-2',
    title: 'AWS Java Full Stack Developer',
    company: 'SP Staffing Services Private Limited Hiring For Leading MNC Company',
    companyInitials: 'SS',
    companyColor: '#7C3AED',
    postedTime: '4 days ago',
    exp: '8 to 12 Yrs',
    salary: '₹26 – ₹38 Lakh/Yr',
    salaryNum: 38,
    loc: 'Bengaluru, Hyderabad, Pune',
    domain: 'Full-Stack',
    requiredSkills: ['java', 'spring boot', 'aws', 'micro-frontends'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-3',
    title: 'Lead UI & Micro-Frontend Architect',
    company: 'Swiggy Tech Labs',
    companyInitials: 'SW',
    companyColor: '#FC8019',
    postedTime: '1 day ago',
    exp: '4 to 8 Yrs',
    salary: '₹26 – ₹36 Lakh/Yr',
    salaryNum: 36,
    loc: 'Bengaluru / Hybrid',
    domain: 'Full-Stack',
    requiredSkills: ['react.js', 'micro-frontends', 'module federation', 'typescript', 'core web vitals'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-4',
    title: 'Staff UI Platform Architect',
    company: 'Razorpay Fintech Technologies',
    companyInitials: 'RZ',
    companyColor: '#0C2340',
    postedTime: '18 hours ago',
    exp: '5 to 9 Yrs',
    salary: '₹28 – ₹38 Lakh/Yr',
    salaryNum: 38,
    loc: 'Remote / Bengaluru',
    domain: 'Full-Stack',
    requiredSkills: ['react.js', 'component architecture', 'micro-frontends', 'typescript'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-5',
    title: 'Lead Technical Product Manager',
    company: 'Shine (HT Media Group)',
    companyInitials: 'SH',
    companyColor: '#1E3A8A',
    postedTime: '2 days ago',
    exp: '5 to 9 Yrs',
    salary: '₹28 – ₹38 Lakh/Yr',
    salaryNum: 38,
    loc: 'Gurugram / Hybrid',
    domain: 'Product Management',
    requiredSkills: ['prd discovery', 'product metrics', 'tech scoping', 'growth funnels', 'gtm strategy'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-6',
    title: 'Principal Search & Solr Database Cloud Architect',
    company: 'Adobe Systems India',
    companyInitials: 'AD',
    companyColor: '#E11D48',
    postedTime: '2 days ago',
    exp: '7 to 12 Yrs',
    salary: '₹38 – ₹48 Lakh/Yr',
    salaryNum: 48,
    loc: 'Noida / Remote',
    domain: 'Search & Data Infra',
    requiredSkills: ['apache solr', 'lucene engine', 'sub-10ms query optimization', 'inverted indexing'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-7',
    title: 'Production GenAI & LLM Systems Engineer',
    company: 'Swiggy AI Core Lab',
    companyInitials: 'SW',
    companyColor: '#FC8019',
    postedTime: '1 day ago',
    exp: '3 to 7 Yrs',
    salary: '₹30 – ₹45 Lakh/Yr',
    salaryNum: 45,
    loc: 'Bengaluru',
    domain: 'AI/ML',
    requiredSkills: ['langchain', 'vector embeddings', 'rag pipelines', 'python'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  },
  {
    id: 'srp-job-8',
    title: 'Staff Silicon Verification & RTL Architect',
    company: 'Qualcomm India Pvt Ltd',
    companyInitials: 'QC',
    companyColor: '#002B49',
    postedTime: '3 days ago',
    exp: '5 to 11 Yrs',
    salary: '₹32 – ₹42 Lakh/Yr',
    salaryNum: 42,
    loc: 'Bengaluru / Hyderabad',
    domain: 'Semiconductor',
    requiredSkills: ['systemverilog', 'uvm architecture', 'pcie/cxl', 'rtl design'],
    isActivelyHiring: true,
    isEarlyApplicant: true
  }
];

// Infer domain from job title & skills. Peerpath only has mentors for AI/ML, Semiconductor,
// Cybersecurity and Full-Stack — anything else (Sales, Marketing, Product, HR, etc.) is
// tagged 'Others' rather than silently guessed into one of those 4, which used to happen
// here (everything unrecognized fell through to 'Full-Stack').
const inferDomainFromJob = (job: ShineJob): string => {
  if (job.domain) return job.domain;
  const combined = (job.title + ' ' + job.requiredSkills.join(' ')).toLowerCase();
  if (combined.includes('product manager') || combined.includes('product management') || combined.includes('prd') || combined.includes('apm') || combined.includes('gpm')) {
    return 'Product Management';
  }
  if (combined.includes('search') || combined.includes('solr') || combined.includes('lucene') || combined.includes('data infra')) {
    return 'Search & Data Infra';
  }
  if (combined.includes('sales') || combined.includes('bdr') || combined.includes('sdr') || combined.includes('revenue') || combined.includes('gtm')) {
    return 'SaaS Sales';
  }
  if (combined.includes('marketing') || combined.includes('growth marketer') || combined.includes('seo') || combined.includes('sem')) {
    return 'Marketing';
  }
  if (combined.includes('security') || combined.includes('cyber') || combined.includes('pentest') || combined.includes('threat') || combined.includes('soc analyst') || combined.includes('vulnerability')) {
    return 'Cybersecurity';
  }
  if (combined.includes('silicon') || combined.includes('semiconductor') || combined.includes('vlsi') || combined.includes('asic') || combined.includes('fpga') || combined.includes('chip')) {
    return 'Semiconductor';
  }
  if (combined.includes('ai') || combined.includes('ml') || combined.includes('genai') || combined.includes('llm') || combined.includes('machine learning') || combined.includes('data scien')) {
    return 'AI/ML';
  }
  if (combined.includes('frontend') || combined.includes('backend') || combined.includes('full stack') || combined.includes('full-stack') || combined.includes('developer') || combined.includes('software engineer') || combined.includes('sde')) {
    return 'Full-Stack';
  }
  return 'Others';
};

interface JobsViewProps {
  onNavigate: (view: ViewType) => void;
  onSelectExpert?: (expertId: string) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  onNavigate,
  onSelectExpert
}) => {
  const { 
    userProfile, 
    addSkill, 
    showToast, 
    peerpathJobContext, 
    clearPeerpathJobContext,
    selectExpertById,
    setIsBookingModalOpen
  } = useApp();
  
  const [jobsList, setJobsList] = useState<ShineJob[]>(FALLBACK_JOBS);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);

  const [showEditSearch, setShowEditSearch] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [selectedLocFilter, setSelectedLocFilter] = useState<string>('all');
  
  const [appliedJobIds, setAppliedJobIds] = useState<Record<string, boolean>>({});
  const [savedJobIds, setSavedJobIds] = useState<Record<string, boolean>>({});
  const [loadingTwinsForJob, setLoadingTwinsForJob] = useState<Record<string, boolean>>({});

  // Dynamic Gap Analysis for targeted track
  const [apiGapResult, setApiGapResult] = useState<GapAnalysisResult | null>(null);

  // 1. Fetch live jobs from Backend API
  useEffect(() => {
    let isCurrent = true;
    setIsLoadingJobs(true);

    const trackKey = peerpathJobContext?.isFromPeerpath ? peerpathJobContext.trackKey : undefined;

    peerpathApi.getJobs({
      trackKey,
      loc: selectedLocFilter !== 'all' ? selectedLocFilter : undefined,
      q: searchKeyword.trim() || undefined
    })
      .then(fetched => {
        // Set even when empty, so a search with no matches doesn't keep showing the previous results
        if (isCurrent) setJobsList(fetched || []);
      })
      .catch(err => {
        console.warn('[Jobs API fallback]:', err);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingJobs(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [peerpathJobContext?.trackKey, peerpathJobContext?.isFromPeerpath, selectedLocFilter, searchKeyword]);

  // 2. Fetch pathway gap analysis if coming from Peerpath CTA
  useEffect(() => {
    if (!peerpathJobContext?.isFromPeerpath) {
      setApiGapResult(null);
      return;
    }

    let isCurrent = true;
    const domainKey = peerpathJobContext.trackKey || 'full-stack';
    const activeRole = userProfile.headline 
      ? userProfile.headline.split('|')[0].split('•')[0].split('@')[0].trim() 
      : 'Senior Frontend Developer';

    peerpathApi.runGapAnalysis({
      domain: domainKey,
      skills: userProfile.skills || [],
      currentRole: activeRole,
      currentCtc: userProfile.currentCtc || '₹7.5 LPA'
    }).then(res => {
      if (isCurrent && res) {
        setApiGapResult(res);
      }
    }).catch(err => {
      console.warn('[JobsView Gap Analysis Fallback]:', err);
    });

    return () => {
      isCurrent = false;
    };
  }, [peerpathJobContext?.isFromPeerpath, peerpathJobContext?.trackKey, userProfile.skills, userProfile.headline, userProfile.currentCtc]);

  // Booster skill requirement calculation when coming from Peerpath CTA
  const requiredBoosterSkills = useMemo(() => {
    if (apiGapResult?.missingBoosterSkills && apiGapResult.missingBoosterSkills.length > 0) {
      return apiGapResult.missingBoosterSkills;
    }
    return peerpathJobContext?.requiredBoosterSkills || [];
  }, [apiGapResult, peerpathJobContext]);

  const missingBoosterSkills = useMemo(() => {
    if (!peerpathJobContext?.isFromPeerpath || requiredBoosterSkills.length === 0) {
      return [];
    }
    const currentSkills = (userProfile.skills || []).map(s => s.toLowerCase());
    return requiredBoosterSkills.filter(reqSkill => {
      const rLower = reqSkill.toLowerCase();
      return !currentSkills.some(s => 
        s.includes(rLower) || 
        rLower.includes(s) || 
        s.replace(/[^a-z0-9]/g, '') === rLower.replace(/[^a-z0-9]/g, '')
      );
    });
  }, [peerpathJobContext, requiredBoosterSkills, userProfile.skills]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let list = [...jobsList];

    if (peerpathJobContext?.isFromPeerpath) {
      const trackKey = peerpathJobContext.trackKey;
      if (trackKey === 'arch') {
        list.sort((a, b) => (b.requiredSkills.includes('micro-frontends') ? 1 : 0) - (a.requiredSkills.includes('micro-frontends') ? 1 : 0));
      } else if (trackKey === 'pm') {
        list.sort((a, b) => (b.requiredSkills.includes('prd discovery') ? 1 : 0) - (a.requiredSkills.includes('prd discovery') ? 1 : 0));
      } else if (trackKey === 'search') {
        list.sort((a, b) => (b.requiredSkills.includes('apache solr') ? 1 : 0) - (a.requiredSkills.includes('apache solr') ? 1 : 0));
      }
    }

    return list.filter(job => {
      if (selectedLocFilter !== 'all' && !job.loc.toLowerCase().includes(selectedLocFilter.toLowerCase())) {
        return false;
      }
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(query);
        const matchCompany = job.company.toLowerCase().includes(query);
        const matchSkills = job.requiredSkills.some(s => s.toLowerCase().includes(query));
        if (!matchTitle && !matchCompany && !matchSkills) return false;
      }
      return true;
    });
  }, [jobsList, selectedLocFilter, searchKeyword, peerpathJobContext]);

  // PREP WITH PEER: Live API trajectory twin matching
  const handlePrepareWithPeer = async (job: ShineJob) => {
    const domain = inferDomainFromJob(job);
    setLoadingTwinsForJob(prev => ({ ...prev, [job.id]: true }));

    showToast(
      `Matching Mentors for ${job.title}...`,
      `Scanning verified trajectory twins for ${job.company}`,
      'info'
    );

    try {
      const activeRole = userProfile.headline 
        ? userProfile.headline.split('|')[0].split('•')[0].split('@')[0].trim() 
        : 'Senior Frontend Developer';

      const { matches, supportedDomain, message } = await peerpathApi.matchTrajectories({
        currentRole: activeRole,
        currentCompany: userProfile.currentCompany || userProfile.pastCompany,
        currentExperience: job.exp || userProfile.experienceYears || '4 Years',
        currentSalary: userProfile.currentCtc || '₹7.5 LPA',
        targetRole: job.title,
        targetPackage: job.salary,
        targetCompany: job.company,
        domain: domain,
        skills: job.requiredSkills
      });

      if (!supportedDomain) {
        showToast(
          `No mentors for "${domain}" yet`,
          message || `Peerpath doesn't cover this guild yet — check back soon!`,
          'info'
        );
      } else if (matches && matches.length > 0) {
        const top = matches[0];
        selectExpertById(top.creator.id);
        if (onSelectExpert) onSelectExpert(top.creator.id);

        showToast(
          top.isExactMatch ? `🎯 Found an Exact Trajectory Match!` : `⚡ Found ${matches.length} Verified Twins!`,
          top.isExactMatch
            ? `${top.creator.name} is currently ${top.creator.role} at ${top.creator.company} — exactly your target.`
            : `Top Match: ${top.creator.name} (${top.creator.role}) with ${top.trajectorySimilarityScore}% AI match.`,
          'success'
        );
        setIsBookingModalOpen(true);
      } else {
        onNavigate('experts-view');
      }
    } catch (err) {
      console.warn('[JobsView trajectory match fallback]:', err);
      onNavigate('experts-view');
    } finally {
      setLoadingTwinsForJob(prev => ({ ...prev, [job.id]: false }));
    }
  };

  const handleApply = (job: ShineJob) => {
    setAppliedJobIds(prev => ({ ...prev, [job.id]: true }));
    showToast(
      `Applied to ${job.company}!`,
      `Your Shine profile was sent directly to the hiring recruiter.`,
      'success'
    );
  };

  const handleSave = (job: ShineJob) => {
    const nextState = !savedJobIds[job.id];
    setSavedJobIds(prev => ({ ...prev, [job.id]: nextState }));
    showToast(
      nextState ? `Job Saved!` : `Job Removed`,
      `${job.title}`,
      'info'
    );
  };

  const handleShare = (job: ShineJob) => {
    navigator.clipboard?.writeText(window.location.href);
    showToast(`Link Copied!`, `Share ${job.title}`, 'info');
  };

  const handleQuickAddSkills = () => {
    missingBoosterSkills.forEach(skill => {
      addSkill(skill);
    });
    showToast(
      'Skills Added to Profile! 🚀',
      `Added ${missingBoosterSkills.join(' & ')} to your profile. You are now 100% eligible for recruiter shortlist!`,
      'success'
    );
  };

  const handleGoToProfileSkills = () => {
    onNavigate('profile-view');
    setTimeout(() => {
      const el = document.getElementById('skills-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-section-pulse');
        setTimeout(() => el.classList.remove('highlight-section-pulse'), 2500);
      }
    }, 120);
  };

  return (
    <div className="shine-srp-clean-page">
      
      {/* Top Sub-Action Bar */}
      <div className="shine-srp-subbar">
        <div className="srp-clean-container srp-subbar-row">
          
          {/* Left: Edit Search button */}
          <button 
            type="button" 
            className="srp-pill-btn srp-btn-edit"
            onClick={() => setShowEditSearch(!showEditSearch)}
          >
            <Edit3 size={13} className="mr-1.5" />
            <span>Edit search</span>
          </button>

          {/* Right: Sort & Filter buttons */}
          <div className="srp-subbar-right">
            <button 
              type="button" 
              className="srp-pill-btn srp-btn-sort"
              onClick={() => setSortBy(sortBy === 'relevance' ? 'date' : 'relevance')}
            >
              <ArrowUpDown size={13} className="mr-1.5 text-slate-500" />
              <span>Sort: <strong>{sortBy === 'relevance' ? 'Relevance' : 'Recent'}</strong></span>
              <ChevronDown size={13} className="ml-1 text-slate-400" />
            </button>

            <button 
              type="button" 
              className={`srp-pill-btn srp-btn-filter ${showFilterDropdown ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={13} className="mr-1.5 text-slate-500" />
              <span>Filter</span>
            </button>
          </div>

        </div>

        {/* Collapsible Edit Search Bar if opened */}
        {showEditSearch && (
          <div className="srp-clean-container srp-edit-search-drawer">
            <div className="srp-drawer-inner">
              <input 
                type="text" 
                placeholder="Search by Job Title, Skill or Company (e.g. Java, React, Swiggy, Pune)..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="srp-inline-search-input"
                autoFocus
              />
              {searchKeyword && (
                <button 
                  type="button" 
                  className="srp-clear-btn" 
                  onClick={() => setSearchKeyword('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Filter Bar if opened */}
        {showFilterDropdown && (
          <div className="srp-clean-container srp-filters-drawer">
            <div className="srp-filter-chips">
              <span className="srp-filter-label">Location:</span>
              {['all', 'Bengaluru', 'Pune', 'Hyderabad', 'Gurugram', 'Noida', 'Mumbai'].map(loc => (
                <button 
                  key={loc}
                  type="button" 
                  className={`srp-filter-chip ${selectedLocFilter === loc ? 'active' : ''}`}
                  onClick={() => setSelectedLocFilter(loc)}
                >
                  {loc === 'all' ? 'All Locations' : loc}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONDITIONAL PEERPATH ELIGIBILITY BANNER */}
      {peerpathJobContext?.isFromPeerpath && (
        <div className="srp-clean-container srp-peerpath-banner-wrapper">
          {missingBoosterSkills.length > 0 ? (
            /* Warning / Eligibility Gating Banner */
            <div className="srp-peerpath-eligibility-card srp-eligibility-warning">
              <div className="spe-card-header">
                <div className="spe-pill-wrap">
                  <span className="spe-track-badge">
                    <Briefcase size={12} className="mr-1 text-purple-600" />
                    PEERPATH MATCH: {peerpathJobContext.trackTitle.toUpperCase()}
                  </span>
                  <span className="spe-target-pkg">{peerpathJobContext.targetPackage}</span>
                </div>
                <button 
                  type="button" 
                  className="spe-btn-close" 
                  onClick={clearPeerpathJobContext}
                  title="Close Peerpath filter & view normal search"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="spe-body">
                <div className="spe-main-content">
                  <h3 className="spe-title">
                    ⚡ Fast-Track Recruiter Shortlist: Bridge Your Skill Gaps to Reach 95% Match
                  </h3>
                  <div className="spe-missing-chips">
                    <span className="spe-req-label">Identified Skill Gaps for this Role:</span>
                    {missingBoosterSkills.map((skillName, idx) => (
                      <span key={idx} className="spe-missing-chip">
                        + {skillName}
                      </span>
                    ))}
                  </div>
                  <p className="spe-desc">
                    All openings below are active and open. Top hiring teams at Swiggy, Razorpay & PhonePe prioritize applicants who bridge these {missingBoosterSkills.length} identified skill gaps. Complete them with verified mentors to skip standard ATS queues and unlock 1-click recruiter shortlisting.
                  </p>
                </div>

                <div className="spe-actions-column">
                  <button 
                    type="button" 
                    className="btn-spe-add-now"
                    onClick={handleQuickAddSkills}
                  >
                    <span>+ Bridge {missingBoosterSkills.length} Skill Gaps for Fast-Track Shortlist</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-spe-profile-link"
                    onClick={handleGoToProfileSkills}
                  >
                    <span>Update in Profile Page ➔</span>
                  </button>
                </div>
              </div>

              {/* Verified Mentors Twin Carousel from API */}
              {apiGapResult?.recommendedCreators && apiGapResult.recommendedCreators.length > 0 && (
                <div className="spe-mentors-preview-section">
                  <div className="spe-mentors-title">
                    <Sparkles size={12} className="text-amber-600" />
                    <span>Mentors Who Made This Jump Available for 1:1 Prep:</span>
                  </div>
                  <div className="spe-mentors-grid">
                    {apiGapResult.recommendedCreators.slice(0, 2).map((match, idx) => (
                      <div key={idx} className="spe-mentor-mini-card">
                        <div className="spe-mentor-profile">
                          <img 
                            src={match.creator.avatar} 
                            alt={match.creator.name} 
                            className="spe-mentor-avatar" 
                          />
                          <div>
                            <div className="spe-mentor-name-row">
                              <span className="spe-mentor-name">{match.creator.name}</span>
                              <span className="spe-mentor-jump">{match.jumpDelta}</span>
                            </div>
                            <div className="spe-mentor-role">{match.creator.role}</div>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="spe-mentor-book-btn"
                          onClick={() => {
                            selectExpertById(match.creator.id);
                            if (onSelectExpert) onSelectExpert(match.creator.id);
                            setIsBookingModalOpen(true);
                          }}
                        >
                          Prep ₹{match.creator.price}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Success / 100% Eligible Banner */
            <div className="srp-peerpath-eligibility-card srp-eligibility-success">
              <div className="spe-card-header">
                <div className="spe-pill-wrap">
                  <span className="spe-track-badge spe-badge-green">
                    <Check size={13} strokeWidth={3} className="mr-1 text-emerald-700" />
                    100% ELIGIBLE FOR SHORTLISTING
                  </span>
                  <span className="spe-target-pkg spe-pkg-green">{peerpathJobContext.targetPackage}</span>
                </div>
                <button 
                  type="button" 
                  className="spe-btn-close" 
                  onClick={clearPeerpathJobContext}
                  title="Close filter"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="spe-body">
                <div className="spe-main-content">
                  <h3 className="spe-title text-emerald-900">
                    🎉 Great! Your profile has all verified skills required for {peerpathJobContext.trackTitle} roles.
                  </h3>
                  <p className="spe-desc text-emerald-800">
                    Skills ({peerpathJobContext.requiredBoosterSkills.join(' & ')}) are updated on your profile. Apply below to be shortlisted directly!
                  </p>
                </div>
                <div className="spe-actions-column">
                  <button 
                    type="button" 
                    className="btn-spe-view-all"
                    onClick={clearPeerpathJobContext}
                  >
                    <span>View Standard Shine Jobs</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Jobs Feed List */}
      <div className="srp-clean-container srp-cards-stack">
        {isLoadingJobs ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' }}>
            <Loader2 size={28} className="animate-spin text-purple-600 mb-2" style={{ margin: '0 auto' }} />
            <p style={{ color: '#64748B', fontSize: '14px' }}>Loading verified jobs from Shine API...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' }}>
            <Briefcase size={36} style={{ color: '#94A3B8', margin: '0 auto 10px' }} />
            <h3>No jobs match the current filters</h3>
            <p style={{ color: '#64748B', fontSize: '13px' }}>Try resetting your location or keyword search.</p>
          </div>
        ) : (
          filteredJobs.map((job, idx) => {
            const isApplied = Boolean(appliedJobIds[job.id]);
            const isSaved = Boolean(savedJobIds[job.id]);

            return (
              <React.Fragment key={job.id}>
                <div className="srp-job-card-official">
                  
                  {/* Top Row: Company Logo Badge + Company Name + Posted Date + Status Badges */}
                  <div className="sjc-top-row">
                    <div className="sjc-company-info">
                      {job.companyInitials && (
                        <div 
                          className="sjc-initials-badge" 
                          style={{ backgroundColor: job.companyColor || '#7C3AED' }}
                        >
                          {job.companyInitials}
                        </div>
                      )}
                      <span className="sjc-company-name">{job.company}</span>
                      <span className="sjc-dot-sep">•</span>
                      <span className="sjc-posted-time">{job.postedTime}</span>
                    </div>

                    <div className="sjc-badges-wrap">
                      {job.isActivelyHiring && (
                        <span className="sjc-badge-actively-hiring">Actively Hiring</span>
                      )}
                      {job.isEarlyApplicant && (
                        <span className="sjc-badge-early-applicant">Be An Early Applicant</span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Big Bold Job Title */}
                  <h2 className="sjc-title">
                    {job.title}
                  </h2>

                  {/* Row 3: Metadata (Exp • Salary • Location) */}
                  <div className="sjc-meta-row">
                    <div className="sjc-meta-item">
                      <Briefcase size={14} className="sjc-icon" />
                      <span>{job.exp}</span>
                    </div>
                    <span className="sjc-dot-sep">•</span>
                    <div className="sjc-meta-item">
                      <Clock size={14} className="sjc-icon" />
                      <span>{job.salary}</span>
                    </div>
                    <span className="sjc-dot-sep">•</span>
                    <div className="sjc-meta-item">
                      <MapPin size={14} className="sjc-icon" />
                      <span>{job.loc}</span>
                    </div>
                  </div>

                  {/* Row 4: Required Skills (Left) + Action Buttons (Right) */}
                  <div className="sjc-bottom-row">
                    <div className="sjc-skills-block">
                      <span className="sjc-required-text">Required:</span>
                      <div className="sjc-skills-tags">
                        {job.requiredSkills.map((skill, sIdx) => {
                          const isBoosterMatch = peerpathJobContext?.isFromPeerpath && 
                            requiredBoosterSkills.some(bs => bs.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(bs.toLowerCase()));
                          
                          return (
                            <React.Fragment key={sIdx}>
                              <strong className={`sjc-skill-name ${isBoosterMatch ? 'sjc-skill-booster-highlight' : ''}`}>
                                {skill}
                              </strong>
                              {sIdx < job.requiredSkills.length - 1 && (
                                <span className="sjc-skill-bullet">•</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sjc-actions-block">
                      {/* Share Icon */}
                      <button 
                        type="button" 
                        className="sjc-btn-icon" 
                        onClick={() => handleShare(job)}
                        title="Share Job"
                      >
                        <Share2 size={16} />
                      </button>

                      {/* Bookmark Icon */}
                      <button 
                        type="button" 
                        className={`sjc-btn-icon ${isSaved ? 'is-saved' : ''}`} 
                        onClick={() => handleSave(job)}
                        title={isSaved ? "Saved" : "Save Job"}
                      >
                        <Bookmark size={16} className={isSaved ? "fill-blue-600 text-blue-600" : ""} />
                      </button>

                      {/* Peerpath Twin Prep Button (Live API Trajectory Twin Match) */}
                      <button 
                        type="button" 
                        className="sjc-btn-peerpath-prep"
                        onClick={() => handlePrepareWithPeer(job)}
                        disabled={loadingTwinsForJob[job.id]}
                        title={`Match with verified mentors who landed ${job.title}`}
                      >
                        {loadingTwinsForJob[job.id] ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Matching...</span>
                          </>
                        ) : (
                          <>
                            <Compass size={13} className="sjc-prep-icon" />
                            <span>Prep with Peer</span>
                          </>
                        )}
                      </button>

                      {/* Main Apply Button */}
                      <button 
                        type="button" 
                        className={`sjc-btn-apply ${isApplied ? 'is-applied' : ''}`}
                        onClick={() => handleApply(job)}
                        disabled={isApplied}
                      >
                        {isApplied ? (
                          <>
                            <Check size={14} strokeWidth={3} />
                            <span>Applied</span>
                          </>
                        ) : (
                          <>
                            <span>Apply</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Mid-Feed Mentorship & Direct Referral Strip inserted between job cards */}
                {idx === 1 && (
                  <div className="peerpath-mid-feed-banner" style={{ margin: '14px 0 18px 0' }}>
                    <div className="pmf-left">
                      <div className="pmf-avatars-row">
                        <img src="/avatars/saheli.jpg" alt="Saheli" className="pmf-avatar" />
                        <img src="/avatars/akash.jpg" alt="Akash" className="pmf-avatar" />
                        <img src="/avatars/ishita.jpg" alt="Ishita" className="pmf-avatar" />
                        <span className="pmf-online-dot"></span>
                      </div>
                      <div className="pmf-text-block">
                        <h3 className="pmf-title">Want 1:1 Interview Prep &amp; Direct Referrals?</h3>
                        <div className="pmf-benefits-row">
                          <span className="pmf-benefit-chip"><CheckCircle2 size={13} className="text-emerald-600" /> Resume Review</span>
                          <span className="pmf-benefit-chip"><CheckCircle2 size={13} className="text-emerald-600" /> Mock Interview</span>
                          <span className="pmf-benefit-chip"><CheckCircle2 size={13} className="text-emerald-600" /> Direct Referrals</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn-shine-gold-lg pmf-cta-btn" onClick={() => onNavigate('experts-view')}>
                      Explore Mentors <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

    </div>
  );
};
