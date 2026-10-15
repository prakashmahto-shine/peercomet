import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ArrowUpRight, Sparkles, Compass, Briefcase, Award, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeerpathLogo, PeerpathSymbolSvg } from '../common/PeerpathLogo';
import { BRAND } from '../../config/brand';

export const Footer: React.FC = () => {
  const { navigate, currentView } = useApp();
  const [isBlogsOpen, setIsBlogsOpen] = useState<boolean>(false);
  const [isJobsOpen, setIsJobsOpen] = useState<boolean>(false);

  // Check if current view is inside Peerpath ecosystem
  const isPeerpathView = [
    'guidance-view',
    'experts-view',
    'expert-profile-view',
    'community-view',
    'mentor-dashboard-view',
    'sessions-view',
    'payment-view',
    'confirmed-view',
    'live-call-view',
    'post-session-view',
    'recruiter-view',
    'profile-view'
  ].includes(currentView);

  const partners = [
    { name: 'Shine.com', label: 'Jobs & Recruitment Portal', src: 'https://staticcand.shine.com/c/s1/images/candidate/nova/home/shine-logo.svg', isShine: true },
    { name: 'Hindustan Times', label: 'Leading National Daily', src: 'https://www.shine.com/nova/assets/partner-sites/hindustan-times.svg' },
    { name: 'Live Mint', label: 'Premium Business Journalism', src: 'https://www.shine.com/nova/assets/partner-sites/live-mint.svg' },
    { name: 'Live Hindustan', label: 'Hindi News & Vernacular Reach', src: 'https://www.shine.com/nova/assets/partner-sites/live-hindustan.svg' },
    { name: 'OTT Play', label: 'Smart Streaming & Media', src: 'https://www.shine.com/nova/assets/partner-sites/ott-play.svg' },
    { name: 'Fab Play', label: 'Interactive Tech & Content', src: 'https://www.shine.com/nova/assets/partner-sites/fab-play.svg' },
  ];

  return (
    <footer className={`shine-official-footer-wrapper ${isPeerpathView ? 'peerpath-standalone-footer' : 'shine-jobs-footer'}`}>
      


      {/* 2. Main Footer Body */}
      <div className="footer-main-navy-section">
        <div className="content-wrapper" style={{ paddingTop: '36px', paddingBottom: '30px' }}>
          
          {/* Top Brand & Trust Header inside Footer */}
          <div className="footer-top-brand-strip">
            <div className="ftbs-left">
              {isPeerpathView ? (
                <div className="ftbs-peerpath-brand">
                  <PeerpathLogo size={38} textColor="#FFFFFF" subTextColor="#CBD5E1" theme="dark" />
                </div>
              ) : (
                <div className="ftbs-shine-brand">
                  <img 
                    src="https://staticcand.shine.com/c/s1/images/candidate/nova/home/shine-logo.svg" 
                    alt="Shine Logo" 
                    className="ftbs-shine-logo"
                  />
                  <span className="ftbs-tagline">Connecting 4.5 Crore+ Job Seekers with 300,000+ Employers</span>
                </div>
              )}
            </div>

            <div className="ftbs-right-parent">
              <div className="ht-media-badge-pill">
                <span className="ht-dot"></span>
                <span>An <strong>HT Media Group</strong> Enterprise</span>
              </div>
            </div>
          </div>

          {/* Contextual Footer Columns */}
          <div className="footer-columns-row">
            
            {isPeerpathView ? (
              /* Peerpath Platform Focused Navigation Columns */
              <>
                <div className="footer-nav-col">
                  <h4>Explore Mentors</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('experts-view'); }}>AI & GenAI Specialists</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('experts-view'); }}>Frontend & Mobile Architects</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('experts-view'); }}>Backend & Distributed Systems</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('experts-view'); }}>Product & Growth Leaders</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('experts-view'); }}>VLSI & Semiconductor Leads</a></li>
                  </ul>
                </div>

                <div className="footer-nav-col">
                  <h4>Transition Roadmaps</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('guidance-view'); }}>Services ➔ Product Switch</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('guidance-view'); }}>Non-AI ➔ GenAI / ML Jump</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('guidance-view'); }}>Mid-Level ➔ Staff Architect</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('guidance-view'); }}>Salary & Comp Negotiation</a></li>
                  </ul>
                </div>

                <div className="footer-nav-col">
                  <h4>For Mentors</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('guidance-view'); }}>Become a Mentor (0% Fee)</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('mentor-dashboard-view'); }}>Mentor Studio Portal</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('sessions-view'); }}>Manage Availability & Calls</a></li>
                    <li><a href="#!">Earnings & Bank Payouts</a></li>
                  </ul>
                </div>

                <div className="footer-nav-col">
                  <h4>Shine Hiring Moat</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('recruiter-view'); }}>Verified Skill Scorecard</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('recruiter-view'); }}>Fast-Track to 300k+ Recruiters</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('jobs-view'); }}>Shine Jobs Portal ↗</a></li>
                  </ul>
                </div>

                <div className="footer-nav-col">
                  <h4>Trust & Help</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!">100% Satisfaction Guarantee</a></li>
                    <li><a href="#!">Verified Mentors Screening</a></li>
                    <li><a href="#!">Contact {BRAND.name} Support</a></li>
                    <li><a href="#!">Privacy & Call Security</a></li>
                  </ul>
                </div>
              </>
            ) : (
              /* Shine Jobs Portal Navigation Columns */
              <>
                <div className="footer-nav-col">
                  <h4>Job Seekers</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('jobs-view'); }}>Job Search</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('jobs-view'); }}>Create Free Job Alert</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('jobs-view'); }}>Job Assistance Services</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('profile-view'); }}>Update Resume Profile</a></li>
                  </ul>
                </div>

                <div className="footer-nav-col">
                  <div className="footer-accordion-item">
                    <div className="accordion-title-flex" onClick={() => setIsBlogsOpen(!isBlogsOpen)}>
                      <h4>Trending Blogs</h4>
                      {isBlogsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {isBlogsOpen && (
                      <ul className="footer-sub-links">
                        <li><a href="#!">Top Tech Salaries 2026</a></li>
                        <li><a href="#!">AI Resume Writing Guide</a></li>
                        <li><a href="#!">Notice Period Rules in India</a></li>
                      </ul>
                    )}
                  </div>

                  <div className="footer-accordion-item" style={{ marginTop: '18px' }}>
                    <div className="accordion-title-flex" onClick={() => setIsJobsOpen(!isJobsOpen)}>
                      <h4>Trending Jobs</h4>
                      {isJobsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {isJobsOpen && (
                      <ul className="footer-sub-links">
                        <li><a href="#!">Remote Frontend Roles</a></li>
                        <li><a href="#!">Data Scientist Jobs in Bangalore</a></li>
                        <li><a href="#!">Semiconductor VLSI Openings</a></li>
                      </ul>
                    )}
                  </div>
                </div>

                <div className="footer-nav-col">
                  <h4>Employers</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!">Employer Home</a></li>
                    <li><a href="#!">Recruiter India</a></li>
                    <li><a href="#!">Post a Job</a></li>
                    <li><a href="#!" onClick={(e) => { e.preventDefault(); navigate('recruiter-view'); }}>Verified Scorecard Inbounds</a></li>
                  </ul>
                </div>

                <div className="footer-nav-col footer-peerpath-col">
                  <div className="f-peerpath-brand-title">
                    <div className="f-peerpath-icon-badge">
                      <Compass size={14} />
                    </div>
                    <span>{BRAND.name.toUpperCase()}</span>
                    <span className="f-shine-sub">by {BRAND.parentDomain}</span>
                  </div>
                  <p className="f-peerpath-tagline">
                    1:1 Career Transition Mentorship from Swiggy, Google & Qualcomm Leads.
                  </p>
                  <ul className="footer-links-list f-peerpath-links">
                    <li>
                      <a href="#!" onClick={(e) => { e.preventDefault(); navigate('guidance-view'); }}>
                        <Sparkles size={13} className="text-amber-400" /> Explore Mentors & Roadmaps ↗
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="footer-nav-col">
                  <h4>Company</h4>
                  <ul className="footer-links-list">
                    <li><a href="#!">About HT Media Group</a></li>
                    <li><a href="#!">Contact Us</a></li>
                    <li><a href="#!">Fraud Alert</a></li>
                    <li><a href="#!">FAQ's</a></li>
                  </ul>
                </div>
              </>
            )}

          </div>

          {/* HIGHLY HIGHLIGHTED OUR PARTNER SITES & HT MEDIA GROUP ECOSYSTEM (WITH SMOOTH AUTO-SCROLLER) */}
          <div className="footer-highlighted-partners-showcase">
            <div className="f-partner-header-flex">
              <div className="f-partner-title-wrap">
                <span className="f-partner-kicker">HT MEDIA GROUP ECOSYSTEM</span>
                <h3 className="f-partner-heading">Our Network Partner Brands</h3>
              </div>
              <p className="f-partner-subdesc">
                Backed by India's premier journalism, media & recruitment network reaching <strong>4.5 Crore+ professionals</strong>.
              </p>
            </div>

            {/* Smooth Infinite Auto-Scroller Track */}
            <div className="f-partner-marquee-viewport">
              <div className="f-partner-marquee-track">
                {[...partners, ...partners, ...partners].map((p, idx) => (
                  <div 
                    key={idx} 
                    className={`f-partner-card ${p.isShine ? 'f-shine-featured-card' : ''}`} 
                    title={`${p.name} - ${p.label}`}
                  >
                    <div className="f-partner-img-wrapper">
                      <img 
                        src={p.src} 
                        alt={p.name} 
                        className={`f-partner-logo-img ${p.isShine ? 'logo-shine-official' : ''}`} 
                      />
                    </div>
                    <span className="f-partner-card-label">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Download App & Ecosystem Promo Strip */}
          <div className="footer-promo-strip">
            <div className="download-app-banner">
              <div className="dab-left-brand">
                <div className="dab-shine-badge">
                  <img 
                    src="https://staticcand.shine.com/c/s1/images/candidate/nova/home/shine-logo.svg" 
                    alt="Shine App" 
                    className="dab-shine-logo" 
                  />
                </div>
                <div className="download-app-text">
                  <h3>Download Shine App</h3>
                  <p>Get instant job alerts and recruiter updates on Android & iOS</p>
                </div>
              </div>
              <button className="btn-footer-get-app">
                Get Shine App <ArrowUpRight size={14} />
              </button>
            </div>

            {isPeerpathView ? (
              <div className="peerpath-footer-cta-box shine-bridge">
                <div className="pfcb-left-brand">
                  <div className="dab-shine-badge">
                    <img 
                      src="https://staticcand.shine.com/c/s1/images/candidate/nova/home/shine-logo.svg" 
                      alt="Shine Jobs" 
                      className="dab-shine-logo" 
                    />
                  </div>
                  <div className="pfcb-text">
                    <h4>Looking for Immediate Job Openings?</h4>
                    <p>Browse 300,000+ active tech & executive jobs on Shine.com</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-pfcb-explore"
                  onClick={() => navigate('jobs-view')}
                >
                  <Briefcase size={13} />
                  <span>Go to Shine Jobs</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            ) : (
              <div className="peerpath-footer-cta-box">
                <div className="pfcb-text">
                  <h4>Switching into AI or Engineering Leadership?</h4>
                  <p>Book 1:1 transition roadmap coaching on {BRAND.tagline}</p>
                </div>
                <button 
                  type="button" 
                  className="btn-pfcb-explore"
                  onClick={() => navigate('guidance-view')}
                >
                  <Sparkles size={13} />
                  <span>Explore {BRAND.name}</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom Bar Co-Branding */}
      <div className="footer-bottommost-bar">
        <div className="content-wrapper footer-bottom-flex">
          <div className="fb-left">
            <div className="fb-peerpath-brand-mini">
              <div className="fb-peerpath-icon">
                <PeerpathSymbolSvg size={18} theme="dark" />
              </div>
              <span className="fb-brand-name">{BRAND.name.toUpperCase()}</span>
              <span className="fb-brand-by">by <strong style={{ color: '#FCD34D' }}>{BRAND.parentDomain}</strong></span>
            </div>
            <span className="fb-co-brand-text">
              • © {new Date().getFullYear()} HT Media Group Enterprise • All Rights Reserved
            </span>
          </div>

          <div className="fb-center-links">
            <a href="#!">T&C</a>
            <span>|</span>
            <a href="#!">Privacy Policy</a>
            <span>|</span>
            <a href="#!">Cookie Policy</a>
            <span>|</span>
            <a href="#!">Security & Fraud</a>
          </div>

          <div className="fb-right-social">
            <span className="social-label">CONNECT WITH US:</span>
            <div className="social-icon-links">
              <a href="#!" className="s-icon" title="Facebook">f</a>
              <a href="#!" className="s-icon" title="Instagram">📷</a>
              <a href="#!" className="s-icon" title="LinkedIn">in</a>
              <a href="#!" className="s-icon" title="X">𝕏</a>
              <a href="#!" className="s-icon" title="YouTube">▶</a>
            </div>
          </div>

        </div>
      </div>

    </footer>
  );
};


