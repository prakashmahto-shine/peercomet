import React, { useState, useEffect } from 'react';
import { Search, Play, ShieldCheck, Star, ChevronLeft, ChevronRight, SearchX, Compass, Users, TrendingUp, Sparkles, ArrowRight, X, User } from 'lucide-react';
import { Expert, ViewType } from '../../types';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { isSelfMentor } from '../../utils/profile';

const DOMAIN_OPTIONS = [
  'Full-Stack',
  'AI/ML',
  'Product Management',
  'Search & Data Infra',
  'Semiconductor',
  'Cybersecurity',
  'SaaS Sales',
  'Marketing'
];

interface ExpertsGalleryViewProps {
  experts: Expert[];
  onSelectExpert: (expertId: string) => void;
  onOpenBooking: (expertId: string) => void;
  onNavigate: (view: ViewType) => void;
}

export const ExpertsGalleryView: React.FC<ExpertsGalleryViewProps> = ({
  experts,
  onSelectExpert,
  onOpenBooking,
  onNavigate,
}) => {
  const { setIsCreatorWizardOpen, currentUser, isCreatorMode, navigateToCreatorStudio, userProfile } = useApp();
  const isMentor = currentUser?.role === 'mentor';
  const [activeDomain, setActiveDomain] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expFilter, setExpFilter] = useState<string>('all');
  const [priceLimit, setPriceLimit] = useState<number>(2500);
  const [sortOrder, setSortOrder] = useState<string>('trajectory');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Live creators fetched from Backend API
  const [creatorsList, setCreatorsList] = useState<Expert[]>(experts);

  useEffect(() => {
    let isCurrent = true;
    // Debounced so typing in search doesn't fire a request per keystroke
    const timer = setTimeout(() => {
      peerpathApi.getCreators(activeDomain !== 'all' ? activeDomain : undefined, searchTerm.trim() || undefined)
        .then(fetched => {
          // Set even when empty, so a search with no matches doesn't keep showing the previous results
          if (isCurrent) setCreatorsList(fetched || []);
        })
        .catch(err => console.warn('[Creators API]:', err));
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [activeDomain, searchTerm]);

  const filteredExperts = creatorsList.filter((exp) => {
    if (isSelfMentor(exp, currentUser, userProfile)) return false;
    if (activeDomain !== 'all' && exp.domain.toLowerCase() !== activeDomain.toLowerCase()) return false;
    if (exp.price > priceLimit) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = exp.name.toLowerCase().includes(q);
      const matchRole = exp.role.toLowerCase().includes(q);
      const matchCompany = exp.company.toLowerCase().includes(q);
      const matchSkills = exp.skills.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchRole && !matchCompany && !matchSkills) return false;
    }
    if (expFilter !== 'all') {
      const expYears = parseInt(exp.experience);
      if (expFilter === '3-5' && (expYears < 3 || expYears > 5)) return false;
      if (expFilter === '6-8' && (expYears < 6 || expYears > 8)) return false;
      if (expFilter === '9+' && expYears < 9) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'rating') return b.rating - a.rating;
    if (sortOrder === 'sessions') return b.sessionsCount - a.sessionsCount;
    if (sortOrder === 'trajectory') {
      const getScore = (e: Expert) => {
        let score = 0;
        const targetRoleLower = (userProfile?.targetRole || userProfile?.headline || '').toLowerCase();
        const dreamCompanyLower = (userProfile?.dreamCompany || userProfile?.targetCompany || '').toLowerCase();
        const curCompanyLower = (userProfile?.currentCompany || userProfile?.pastCompany || '').toLowerCase();
        
        if (dreamCompanyLower && e.company.toLowerCase().includes(dreamCompanyLower)) score += 40;
        if (targetRoleLower && e.role.toLowerCase().includes(targetRoleLower)) score += 30;
        if (curCompanyLower && e.trajectory?.company3YearsAgo?.toLowerCase().includes(curCompanyLower)) score += 20;
        const sharedSkills = e.skills.filter(s => (userProfile?.skills || []).some(us => us.toLowerCase().includes(s.toLowerCase())));
        score += Math.min(10, sharedSkills.length * 2);
        return score;
      };
      return getScore(b) - getScore(a);
    }
    return 0;
  });

  const PAGE_SIZE = 9;
  const totalPages = Math.ceil(filteredExperts.length / PAGE_SIZE);
  const paginatedExperts = filteredExperts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCardClick = (id: string) => {
    onSelectExpert(id);
    onNavigate('expert-profile-view');
  };

  const handleClearFilters = () => {
    setActiveDomain('all');
    setSearchTerm('');
    setExpFilter('all');
    setPriceLimit(2500);
    setSortOrder('trajectory');
  };

  return (
    <div className="content-wrapper gallery-page-wrapper">
      {/* ⚡ Sticky Gallery Controls & Domain Filter Strip */}
      <div className="gallery-sticky-top-bar">
        {/* 1-Row Compact Gallery Control Toolbar */}
        <div className="gallery-compact-header-row">
          <div className="g-title-left-wrap">
            <h1 className="g-compact-main-title">
              Explore Mentors
              <span className="g-count-badge">{filteredExperts.length} Active</span>
            </h1>
            <button 
              type="button" 
              className="btn-g-matched-switch"
              onClick={() => onNavigate('guidance-view')}
              title="Switch to your personalized matched career pathway"
            >
              <TrendingUp size={13} />
              <span>Matched for You</span>
            </button>
          </div>

          <div className="g-controls-right-wrap">
            <div className="g-search-filter-box-compact">
              <Search size={14} className="g-search-icon" />
              <input 
                type="text" 
                placeholder="Search mentor, skill, company..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="g-search-clear-btn" 
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="g-dropdowns-compact">
              <select className="select-pill-compact" value={expFilter} onChange={(e) => setExpFilter(e.target.value)}>
                <option value="all">Exp: All</option>
                <option value="3-5">3 - 5 Yrs</option>
                <option value="6-8">6 - 8 Yrs</option>
                <option value="9+">9+ Yrs</option>
              </select>
              <select className="select-pill-compact" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="trajectory">Sort: Trajectory Fit</option>
                <option value="rating">Sort: Highest Rating</option>
                <option value="sessions">Sort: Most Sessions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Horizontal Domain Chips Strip */}
        <div className="gallery-domain-chips-strip">
          {['all', ...DOMAIN_OPTIONS].map((dom) => (
            <button
              key={dom}
              className={`f-pill-compact ${activeDomain.toLowerCase() === dom.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveDomain(dom)}
            >
              {dom === 'all' ? 'All Domains' : dom}
            </button>
          ))}
        </div>
      </div>

      <div className="gallery-layout-grid">
        <aside className="gallery-sidebar">
          <div className="sidebar-header">
            <h3>Filters</h3>
            <span className="clear-filters-link" onClick={handleClearFilters} style={{ cursor: 'pointer' }}>Clear All</span>
          </div>

          <div className="filter-section">
            <label className="filter-section-title">Career / Domain</label>
            <div className="checkbox-list">
              {DOMAIN_OPTIONS.map((dom) => (
                <label key={dom} className="custom-checkbox">
                  <input 
                    type="checkbox" 
                    checked={activeDomain === 'all' || activeDomain.toLowerCase() === dom.toLowerCase()} 
                    onChange={() => setActiveDomain(activeDomain.toLowerCase() === dom.toLowerCase() ? 'all' : dom)}
                  />
                  <span>{dom}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-section-title">Trust & Verification</label>
            <div className="checkbox-list">
              <label className="custom-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Work Email Verified 🛡️</span>
              </label>
              <label className="custom-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Provides Internal Referrals</span>
              </label>
              <label className="custom-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Issues Recruiter Badges</span>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title-flex">
              <label className="filter-section-title">Price Limit</label>
              <span className="price-val-display">₹{priceLimit}</span>
            </div>
            <input 
              type="range" 
              min="500" 
              max="2500" 
              step="100" 
              value={priceLimit}
              className="price-slider"
              onChange={(e) => setPriceLimit(Number(e.target.value))}
            />
          </div>
        </aside>

        <div className="expert-cards-container">
          {filteredExperts.length === 0 ? (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' }}>
              <SearchX size={48} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
              <h3>No experts found</h3>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Try resetting filters or adjusting search terms.</p>
            </div>
          ) : (
            paginatedExperts.map((exp) => {
              const isSelf = Boolean(
                currentUser && (
                  exp.id === currentUser.id ||
                  (currentUser.username && exp.id.toLowerCase() === currentUser.username.toLowerCase()) ||
                  (currentUser.name && exp.name.toLowerCase() === currentUser.name.toLowerCase())
                )
              );

              return (
                <div key={exp.id} className={`expert-teaser-card ${isSelf ? 'self-expert-card' : ''}`} id={`card-${exp.id}`}>
                  <div className="card-video-thumb-wrap" onClick={() => handleCardClick(exp.id)}>
                    <img src={exp.videoPoster} alt={exp.name} className="card-video-thumb-img" />
                    <div className="video-thumb-play-overlay">
                      <div className="thumb-play-btn"><Play size={20} fill="#0f172a" /></div>
                    </div>
                    <span className="thumb-duration-badge">{exp.duration}</span>
                  </div>

                  <div className="card-content-body">
                    <div className="card-expert-info">
                      <img src={exp.avatar} alt={exp.name} className="card-avatar-img" />
                      <div className="card-meta-text">
                        <div className="card-name-row">
                          <h3 className="card-expert-name">
                            {exp.name} <ShieldCheck size={15} className="verified-badge-shield" />
                            {isSelf && <span className="my-listing-badge">⭐ Your Listing</span>}
                          </h3>
                        </div>
                        <p className="card-expert-role">{exp.role} at <strong>{exp.company}</strong></p>
                      </div>
                    </div>

                    <div className="card-stats-row">
                      <span className="card-exp">{exp.experience}</span>
                      <span className="card-rating"><Star size={13} className="star-gold" /> {exp.rating}</span>
                    </div>

                    <div className="card-skills-row">
                      {exp.skills.slice(0, 2).map((s) => (
                        <span key={s} className="card-skill-tag">{s}</span>
                      ))}
                    </div>

                    <div className="card-footer-structured">
                      <div className="card-footer-meta-row">
                        <div className="card-price-main">
                          <span className="card-price-prefix">Starts at</span>
                          <strong className="card-price-amount">₹{exp.price || 499}</strong>
                        </div>
                        <span className="card-services-badge">4 Services Available</span>
                      </div>

                      <div className="card-footer-actions-row">
                        <button 
                          type="button"
                          className="btn-card-action-flex btn-profile-view-flex" 
                          onClick={() => handleCardClick(exp.id)}
                          title={`View ${exp.name}'s profile and career journey`}
                        >
                          <User size={13} />
                          <span>Profile</span>
                        </button>
                        {isSelf ? (
                          <button 
                            type="button"
                            className="btn-card-action-flex btn-edit-listing-flex" 
                            onClick={() => navigateToCreatorStudio('teaser')} 
                            title="Manage your mentor profile, slots and pricing"
                          >
                            Edit Listing
                          </button>
                        ) : (
                          <button 
                            type="button"
                            className="btn-card-action-flex btn-book-session-flex" 
                            onClick={() => onOpenBooking(exp.id)}
                            title="Book a 1:1 mentorship session"
                          >
                            Book Session
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Centered Modern Shine Pagination */}
      {totalPages > 1 && (
        <div className="gallery-pagination">
          <button 
            type="button" 
            className="pg-btn" 
            disabled={currentPage === 1}
            onClick={() => {
              if (currentPage > 1) {
                setCurrentPage(currentPage - 1);
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }
            }}
          >
            <ChevronLeft size={16} />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button 
              key={pageNum}
              type="button" 
              className={`pg-btn ${currentPage === pageNum ? 'active' : ''}`}
              onClick={() => {
                setCurrentPage(pageNum);
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }}
            >
              {pageNum}
            </button>
          ))}
          
          <button 
            type="button" 
            className="pg-btn"
            disabled={currentPage === totalPages}
            onClick={() => {
              if (currentPage < totalPages) {
                setCurrentPage(currentPage + 1);
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

    </div>
  );
};
