import React, { useState } from 'react';
import { 
  Sparkles, DollarSign, Calendar, Clock, ShieldCheck, Award, 
  Zap, ArrowRight, CheckCircle2, TrendingUp, Users, Video, 
  ChevronDown, ChevronUp, HelpCircle, Check, Heart, 
  Shield, Laptop, MessageSquare, Briefcase, Building2, Flame
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';

export const BecomeMentorLandingView: React.FC = () => {
  const { 
    currentUser, 
    userProfile, 
    setIsCreatorWizardOpen, 
    navigate,
    experts 
  } = useApp();

  // Interactive Earnings Calculator State
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);
  const [ratePerSession, setRatePerSession] = useState<number>(1499);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const monthlySessions = sessionsPerWeek * 4;
  const monthlyEarnings = monthlySessions * ratePerSession;
  const annualEarnings = monthlyEarnings * 12;

  const handleOpenWizard = () => {
    setIsCreatorWizardOpen(true);
  };

  const faqItems = [
    {
      q: "How much time commitment is expected from me as a mentor?",
      a: "As little or as much as you prefer! Most mentors host between 2 to 4 sessions per week (on weekends or weekday evenings). You set your own availability days and time slots directly in your profile."
    },
    {
      q: "Does Shine PeerPath take any commission from my session fees?",
      a: "Zero percent (0%) platform commission! You keep 100% of your listed session price. For example, if you list a 45-minute 1:1 call for ₹1,499, you receive the full ₹1,499."
    },
    {
      q: "How and when do I receive payouts?",
      a: "All completed sessions and earnings are tracked in your Mentor Studio dashboard and settled directly to your UPI ID or bank account."
    },
    {
      q: "Do I need to prepare lesson plans or slide decks before calls?",
      a: "No! PeerPath is designed for focused 1:1 guidance. Before every call, you can review the candidate's verified resume, current experience, target company goals, and specific career questions directly in your dashboard."
    },
    {
      q: "Can I update my availability anytime?",
      a: "Yes. From your Mentor Studio, you can toggle active days, update time slots, or pause new bookings anytime to match your schedule."
    }
  ];

  return (
    <div className="become-mentor-page-wrap">
      
      {/* 1. Hero Section with Glowing Accents */}
      <section className="bml-hero-section">
        <div className="bml-hero-glow-blob" />
        
        <div className="bml-hero-container">
          {/* Top Launch Pill */}
          <div className="bml-pill-badge">
            <Sparkles size={14} className="text-amber-400" />
            <span>Shine PeerPath Mentor Network • 0% Platform Commission</span>
          </div>

          <h1 className="bml-hero-headline">
            Turn Your Career Journey into <br className="hidden-mobile" />
            <span className="bml-headline-gradient">High-Impact Mentorship & Revenue</span>
          </h1>

          <p className="bml-hero-subhead">
            Join India’s top software engineers, architects, and product leaders from Swiggy, Qualcomm, Google, and Razorpay. 
            Guide ambitious professionals through 1:1 career pivots, interview prep, and roadmap calibration on your own schedule.
          </p>

          {/* Action Buttons */}
          <div className="bml-hero-cta-row">
            <button 
              type="button" 
              className="btn-bml-primary-cta"
              onClick={handleOpenWizard}
            >
              <Zap size={18} fill="currentColor" />
              <span>Create Your Mentor Profile (2 Mins)</span>
              <ArrowRight size={18} />
            </button>

            <button 
              type="button" 
              className="btn-bml-secondary-cta"
              onClick={() => {
                const el = document.getElementById('bml-calculator-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <TrendingUp size={16} />
              <span>Calculate Earnings Potential</span>
            </button>
          </div>

          {/* Key Value Metric Badges */}
          <div className="bml-hero-metrics-strip">
            <div className="bml-metric-pill">
              <span className="bml-metric-icon">🪙</span>
              <div className="bml-metric-text">
                <strong>0% Commission</strong>
                <small>100% Payout to You</small>
              </div>
            </div>

            <div className="bml-metric-pill">
              <span className="bml-metric-icon">⏰</span>
              <div className="bml-metric-text">
                <strong>Flexible Hours</strong>
                <small>Set Your Own Slots</small>
              </div>
            </div>

            <div className="bml-metric-pill">
              <span className="bml-metric-icon">🎥</span>
              <div className="bml-metric-text">
                <strong>Live Video Rooms</strong>
                <small>Built-in 1:1 Calling</small>
              </div>
            </div>

            <div className="bml-metric-pill">
              <span className="bml-metric-icon">🛡️</span>
              <div className="bml-metric-text">
                <strong>Verified Profile</strong>
                <small>Shine Mentor Badge</small>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 2. Interactive Earnings Simulator Section */}
      <section className="bml-calculator-section" id="bml-calculator-section">
        <div className="bml-calc-container">
          <div className="bml-calc-header">
            <span className="bml-calc-tag">SIMULATE YOUR REVENUE</span>
            <h2 className="bml-calc-title">How Much Can You Earn as a PeerPath Mentor?</h2>
            <p className="bml-calc-desc">
              Choose how many sessions you'd like to host per week and your preferred hourly rate. 
              Top mentors on PeerPath earn upwards of ₹1,00,000 every month on weekend hours alone.
            </p>
          </div>

          <div className="bml-calc-card">
            {/* Left Controls: Sliders & Presets */}
            <div className="bml-calc-controls">
              
              {/* Control 1: Sessions per week */}
              <div className="bml-calc-group">
                <div className="bml-calc-label-row">
                  <label>1:1 Sessions per Week</label>
                  <span className="bml-calc-val-pill">{sessionsPerWeek} Sessions ({sessionsPerWeek} hrs/wk)</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1"
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(parseInt(e.target.value) || 1)}
                  className="bml-range-slider"
                />
                <div className="bml-slider-ticks">
                  <span>1 session</span>
                  <span>3 (Recommended)</span>
                  <span>5 sessions</span>
                  <span>10 sessions</span>
                </div>
              </div>

              {/* Control 2: Rate per session */}
              <div className="bml-calc-group" style={{ marginTop: '28px' }}>
                <div className="bml-calc-label-row">
                  <label>Your Fee per 45-Min Session</label>
                  <span className="bml-calc-val-pill">₹{ratePerSession.toLocaleString('en-IN')}</span>
                </div>
                <input 
                  type="range" 
                  min="499" 
                  max="4999" 
                  step="100"
                  value={ratePerSession}
                  onChange={(e) => setRatePerSession(parseInt(e.target.value) || 499)}
                  className="bml-range-slider"
                />
                <div className="bml-slider-ticks">
                  <span>₹499 (Starter)</span>
                  <span>₹1,499 (Popular)</span>
                  <span>₹2,999</span>
                  <span>₹4,999 (Staff/VP)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="bml-calc-presets">
                <span className="bml-presets-label">Popular setups:</span>
                <button 
                  type="button" 
                  className={`btn-bml-preset ${sessionsPerWeek === 2 && ratePerSession === 999 ? 'active' : ''}`}
                  onClick={() => { setSessionsPerWeek(2); setRatePerSession(999); }}
                >
                  Weekend Casual (2 calls @ ₹999)
                </button>
                <button 
                  type="button" 
                  className={`btn-bml-preset ${sessionsPerWeek === 4 && ratePerSession === 1499 ? 'active' : ''}`}
                  onClick={() => { setSessionsPerWeek(4); setRatePerSession(1499); }}
                >
                  Pro Mentor (4 calls @ ₹1,499)
                </button>
                <button 
                  type="button" 
                  className={`btn-bml-preset ${sessionsPerWeek === 6 && ratePerSession === 2499 ? 'active' : ''}`}
                  onClick={() => { setSessionsPerWeek(6); setRatePerSession(2499); }}
                >
                  Senior Lead (6 calls @ ₹2,499)
                </button>
              </div>
            </div>

            {/* Right Display: Projected Earnings Dashboard */}
            <div className="bml-calc-result-box">
              <div className="bml-cr-kicker">
                <Flame size={14} className="text-amber-400" />
                <span>PROJECTED EARNINGS (100% TO YOU)</span>
              </div>

              <div className="bml-cr-primary">
                <span className="bml-cr-amount">₹{monthlyEarnings.toLocaleString('en-IN')}</span>
                <span className="bml-cr-period">/ month</span>
              </div>

              <p className="bml-cr-annual">
                That's approximately <strong>₹{annualEarnings.toLocaleString('en-IN')} / year</strong> in supplementary income for just {sessionsPerWeek} hours a week!
              </p>

              <div className="bml-cr-breakdown-list">
                <div className="bml-cr-row">
                  <span>Sessions Completed</span>
                  <strong>{monthlySessions} candidate calls / mo</strong>
                </div>
                <div className="bml-cr-row">
                  <span>Platform Commission</span>
                  <strong className="text-emerald-400">₹0 (0% Fee)</strong>
                </div>
                <div className="bml-cr-row">
                  <span>Payout Frequency</span>
                  <strong>Weekly Direct UPI / Bank</strong>
                </div>
              </div>

              <button 
                type="button" 
                className="btn-bml-calc-cta"
                onClick={handleOpenWizard}
              >
                <span>Claim This Rate & Start Mentoring</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* 3. Why Leading Engineers Mentor on PeerPath (4 Key Value Pillars) */}
      <section className="bml-pillars-section">
        <div className="bml-container">
          <div className="bml-section-header-center">
            <span className="bml-section-kicker">BUILT FOR TECH PROFESSIONALS</span>
            <h2 className="bml-section-heading">Why India’s Top Engineers Mentor on Shine PeerPath</h2>
            <p className="bml-section-sub">
              We took away all the hassle of freelance mentoring — no endless LinkedIn DM scheduling, no chasing payment receipts, and no awkward candidate prep.
            </p>
          </div>

          <div className="bml-pillars-grid">
            
            <div className="bml-pillar-card">
              <div className="bml-pillar-icon-box bg-emerald">
                <DollarSign size={24} className="text-emerald-600" />
              </div>
              <h3 className="bml-pillar-title">100% Direct Payouts</h3>
              <p className="bml-pillar-desc">
                We believe your time is yours. Zero platform cuts during our active creator program. 
                Candidates book sessions directly and you receive 100% of your earnings via UPI or bank transfer.
              </p>
            </div>

            <div className="bml-pillar-card">
              <div className="bml-pillar-icon-box bg-indigo">
                <Briefcase size={24} className="text-indigo-600" />
              </div>
              <h3 className="bml-pillar-title">Candidate Profile Briefing</h3>
              <p className="bml-pillar-desc">
                Never enter a call unprepared. Before each session, you receive the candidate's verified resume, 
                current experience, dream company targets, and specific skill queries directly in your dashboard.
              </p>
            </div>

            <div className="bml-pillar-card">
              <div className="bml-pillar-icon-box bg-purple">
                <Video size={24} className="text-purple-600" />
              </div>
              <h3 className="bml-pillar-title">Built-In 1:1 Video Calls</h3>
              <p className="bml-pillar-desc">
                Host live 1:1 video mentorship sessions directly inside the PeerPath platform in your browser. 
                Complete with video, audio, and screen sharing without needing third-party meeting downloads.
              </p>
            </div>

            <div className="bml-pillar-card">
              <div className="bml-pillar-icon-box bg-amber">
                <Award size={24} className="text-amber-600" />
              </div>
              <h3 className="bml-pillar-title">Verified Mentor Credentials</h3>
              <p className="bml-pillar-desc">
                Stand out as a verified mentor with official company and domain badges (@Swiggy, @Qualcomm). 
                Build an impressive public mentoring portfolio and gain recognition across Shine's candidate network.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* 4. Simple 3-Step Onboarding Journey */}
      <section className="bml-steps-section">
        <div className="bml-container">
          <div className="bml-section-header-center">
            <span className="bml-section-kicker">FAST & SEAMLESS SETUP</span>
            <h2 className="bml-section-heading">Start Mentoring in 3 Simple Steps</h2>
            <p className="bml-section-sub">Get your profile live and start receiving session requests today.</p>
          </div>

          <div className="bml-steps-grid">
            
            <div className="bml-step-card">
              <div className="bml-step-number">01</div>
              <h4 className="bml-step-title">Set Up Your Profile</h4>
              <p className="bml-step-desc">
                Fill in your current designation, company, key skills, and past career trajectory jump in our 2-minute wizard.
              </p>
            </div>

            <div className="bml-step-card">
              <div className="bml-step-number">02</div>
              <h4 className="bml-step-title">Choose Pricing & Hours</h4>
              <p className="bml-step-desc">
                Decide your fee per 1:1 session and select the days & time slots you wish to be available for bookings.
              </p>
            </div>

            <div className="bml-step-card">
              <div className="bml-step-number">03</div>
              <h4 className="bml-step-title">Host Calls & Earn</h4>
              <p className="bml-step-desc">
                Accept candidate requests, conduct 1:1 video guidance calls directly in your browser, and get paid directly to your bank.
              </p>
            </div>

          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button 
              type="button" 
              className="btn-bml-primary-cta"
              onClick={handleOpenWizard}
            >
              <Zap size={18} fill="currentColor" />
              <span>Launch Your Mentor Profile Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>



      {/* 6. FAQ Accordion Section */}
      <section className="bml-faq-section">
        <div className="bml-container" style={{ maxWidth: '840px' }}>
          <div className="bml-section-header-center">
            <span className="bml-section-kicker">QUESTIONS & ANSWERS</span>
            <h2 className="bml-section-heading">Frequently Asked Questions</h2>
            <p className="bml-section-sub">Everything you need to know about becoming a mentor on Shine PeerPath.</p>
          </div>

          <div className="bml-faq-list">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`bml-faq-item ${isOpen ? 'open' : ''}`}>
                  <button 
                    type="button" 
                    className="bml-faq-question-btn"
                    onClick={() => toggleFaq(idx)}
                  >
                    <span>{item.q}</span>
                    {isOpen ? <ChevronUp size={18} className="text-indigo-600" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="bml-faq-answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* 7. Bottom High-Converting CTA Banner */}
      <section className="bml-bottom-banner-section">
        <div className="bml-container">
          <div className="bml-bottom-banner-card">
            <div className="bml-bbc-content">
              <span className="bml-bbc-badge">
                <Sparkles size={14} className="text-amber-400" />
                <span>Join 500+ Verified Tech Mentors</span>
              </span>
              <h2 className="bml-bbc-title">
                Ready to Shape Careers & Monetize Your Experience?
              </h2>
              <p className="bml-bbc-desc">
                Setup takes under 2 minutes. Get approved, set your custom pricing, and start hosting 1:1 sessions today with zero platform commission.
              </p>
              
              <div className="bml-bbc-btn-wrap">
                <button 
                  type="button" 
                  className="btn-bml-primary-cta"
                  onClick={handleOpenWizard}
                >
                  <Zap size={18} fill="currentColor" />
                  <span>Start Hosting 1:1 Sessions Now</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
