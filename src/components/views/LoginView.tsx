import React from 'react';
import { 
  Eye, EyeOff, ShieldCheck, User, Sparkles, MessageSquare, 
  Mail, ArrowRight, Lock, Phone, Users, BookOpen, TrendingUp, 
  CheckCircle2, Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeerpathLogo } from '../common/PeerpathLogo';
import { OtpLoginForm } from '../auth/OtpLoginForm';

export const LoginView: React.FC = () => {
  const { navigate } = useApp();
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const campaign = urlParams.get('campaign') || urlParams.get('utm_campaign');
  const actionParam = urlParams.get('action');

  return (
    <div className="peerpath-master-login-page">
      
      {/* Radiant Pastel Background Ambient Lighting */}
      <div className="light-ambient-orb orb-purple"></div>
      <div className="light-ambient-orb orb-cyan"></div>
      <div className="light-ambient-orb orb-rose"></div>

      <div className="login-canvas-container">
        
        {/* Top Navbar */}
        <header className="login-canvas-navbar">
          <PeerpathLogo size={42} showText={true} textColor="#0F172A" subTextColor="#64748B" theme="light" />

          <div className="navbar-shine-badge" title="An initiative by Shine.com">
            <span className="nsb-label">AN INITIATIVE BY</span>
            <div className="nsb-logo-pill">
              <img 
                src="https://staticcand.shine.com/c/s1/images/candidate/nova/home/shine-logo.svg" 
                alt="Shine.com" 
                className="shine-pill-img" 
              />
            </div>
          </div>
        </header>

        {/* Main Content Split: Left (Story + Center Mentors) & Right (Frosted Glass Form) */}
        <main className="login-main-stage">
          
          {/* =========================================================================
              LEFT STAGE: Value Story + Center Floating Mentors
             ========================================================================= */}
          <div className="stage-left-content">
            
            {/* Left Story Column */}
            <div className="story-column">
              
              <div className="story-badge-pill">
                <Sparkles size={13} className="text-purple-600" />
                <span>1:1 Mentorship for Your Career</span>
              </div>

              <h1 className="story-main-title">
                Learn from people who've been <span className="story-gradient-blue">where you</span> <span className="story-gradient-purple">want to be.</span>
              </h1>

              <p className="story-sub-text">
                Get personalized guidance, roadmaps and real insights from verified professionals to accelerate your career.
              </p>

              {/* Sleek Trust & Proof Bar */}
              <div className="story-trust-metrics">
                <div className="stm-item">
                  <span className="stm-stat">500+</span>
                  <span className="stm-label">Verified Mentors</span>
                </div>
                <div className="stm-dot">•</div>
                <div className="stm-item">
                  <span className="stm-stat">4.9 ★</span>
                  <span className="stm-label">Avg. Rating</span>
                </div>
                <div className="stm-dot">•</div>
                <div className="stm-item">
                  <span className="stm-stat">100k+</span>
                  <span className="stm-label">Candidate Network</span>
                </div>
              </div>
            </div>

            {/* Center Floating Mentors Cluster */}
            <div className="floating-mentors-cluster">
              
              {/* Decorative SVG Connection Curves with Arrowhead */}
              <svg className="cluster-curves-svg" viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#C084FC" stopOpacity="0.8" />
                  </linearGradient>
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <polygon points="0 1, 8 4, 0 7" fill="#818CF8" />
                  </marker>
                </defs>
                <path 
                  d="M 170 340 C 90 280, 80 180, 160 140 C 230 100, 270 170, 260 210" 
                  stroke="url(#curveGrad)" 
                  strokeWidth="2.5" 
                  strokeDasharray="6 6"
                  markerEnd="url(#arrowhead)"
                />
              </svg>

              {/* Card 1: Top Center (Google Tech Lead) */}
              <div className="floating-mentor-card card-top-center">
                <div className="fmc-image-wrap">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80" 
                    alt="Tech Lead at Google" 
                    className="fmc-photo"
                  />
                  <div className="fmc-tag-badge">
                    <svg className="tag-icon-svg" viewBox="0 0 24 24" width="14" height="14">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <div className="fmc-tag-text">
                      <strong>Tech Lead</strong>
                      <span>@ Google</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Middle Left (Flipkart Engineering Director) */}
              <div className="floating-mentor-card card-mid-left">
                <div className="fmc-image-wrap">
                  <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80" 
                    alt="Engineering Director at Flipkart" 
                    className="fmc-photo"
                  />
                  <div className="fmc-tag-badge">
                    <div className="flipkart-mini-logo-box">
                      <span className="fk-f-icon">🛍️</span>
                    </div>
                    <div className="fmc-tag-text">
                      <strong>Engineering Director</strong>
                      <span>@ Flipkart</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Bottom Right (Microsoft Product Manager) */}
              <div className="floating-mentor-card card-bottom-center">
                <div className="fmc-image-wrap">
                  <img 
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80" 
                    alt="Product Manager at Microsoft" 
                    className="fmc-photo"
                  />
                  <div className="fmc-tag-badge">
                    <div className="ms-mini-grid">
                      <span className="ms-dot r"></span>
                      <span className="ms-dot g"></span>
                      <span className="ms-dot b"></span>
                      <span className="ms-dot y"></span>
                    </div>
                    <div className="fmc-tag-text">
                      <strong>Product Manager</strong>
                      <span>@ Microsoft</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Floating Motivational Outcome Pill */}
              <div className="floating-outcome-card">
                <div className="foc-icon-box">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <div className="foc-text">
                  <strong>Real people.</strong>
                  <strong>Real guidance.</strong>
                  <span>Real growth.</span>
                </div>
              </div>

            </div>

          </div>

          {/* =========================================================================
              RIGHT STAGE: High-End Frosted Glass Sign-In Box
             ========================================================================= */}
          <div className="stage-right-form">
            
            <div className="frosted-glass-sign-in-box">
              
              {/* Campaign / Invite Banner */}
              {actionParam === 'unlock' ? (
                <div className="fgb-campaign-pill unlock" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                  <Sparkles size={13} className="text-amber-600 flex-shrink-0" />
                  <span>Unlock PeerPath • Sign in to set goal &amp; find mentors</span>
                </div>
              ) : utmSource === 'whatsapp' ? (
                <div className="fgb-campaign-pill whatsapp">
                  <MessageSquare size={13} className="text-emerald-600 flex-shrink-0" />
                  <span>WhatsApp Invite: Access your 1:1 Mentors</span>
                </div>
              ) : utmSource === 'email' ? (
                <div className="fgb-campaign-pill email">
                  <Mail size={13} className="text-blue-600 flex-shrink-0" />
                  <span>Email Invite: Access your 1:1 Mentors</span>
                </div>
              ) : campaign ? (
                <div className="fgb-campaign-pill default">
                  <Sparkles size={13} className="text-amber-600 flex-shrink-0" />
                  <span>Fast-track 1:1 mentorship access</span>
                </div>
              ) : null}

              {/* Box Header */}
              <div className="fgb-header">
                <h2 className="fgb-title">{actionParam === 'unlock' ? 'Unlock PeerPath 🚀' : 'Welcome 👋'}</h2>
                <p className="fgb-subtitle">
                  {actionParam === 'unlock' 
                    ? 'Sign in or create your account to calibrate goal and match with mentors'
                    : 'Sign in or create your account with your email'}
                </p>
              </div>

              <OtpLoginForm />

              {/* Passwordless sign-in note */}
              <div className="fgb-sso-guarantee">
                <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>No password needed:</strong> we'll email you a 6-digit code. New here? We'll create your account.
                </span>
              </div>

            </div>

          </div>

        </main>

        {/* =========================================================================
            BOTTOM TRUST STRIP: Top Tech Company Mentors + Minimal SaaS Footer
           ========================================================================= */}
        <footer className="login-canvas-footer">
          <div className="lcf-trust-strip">
            <span className="lcf-trust-label">MENTORS FROM LEADING TECH TEAMS</span>
            <div className="lcf-logos-row">
              <span className="lcf-logo-pill">
                <span className="lcf-brand-dot google"></span> Google
              </span>
              <span className="lcf-logo-pill">
                <span className="lcf-brand-dot microsoft"></span> Microsoft
              </span>
              <span className="lcf-logo-pill">
                <span className="lcf-brand-dot flipkart"></span> Flipkart
              </span>
              <span className="lcf-logo-pill">
                <span className="lcf-brand-dot amazon"></span> Amazon
              </span>
              <span className="lcf-logo-pill">
                <span className="lcf-brand-dot uber"></span> Uber
              </span>
              <span className="lcf-logo-pill">
                <span className="lcf-brand-dot meta"></span> Meta
              </span>
            </div>
          </div>

          <div className="lcf-bottom-bar">
            <span>© {new Date().getFullYear()} PeerPath • Backed by 4.5Cr+ Candidate Network by Shine.com</span>
            <div className="lcf-links">
              <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('privacy-view'); }}>Privacy Policy</a>
              <span className="lcf-divider">•</span>
              <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('terms-view'); }}>Terms of Service</a>
              <span className="lcf-divider">•</span>
              <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('contact-view'); }}>Support</a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};
