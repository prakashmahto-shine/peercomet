import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileText, Lock, Cookie, AlertTriangle, 
  Mail, Phone, MapPin, CheckCircle2, ChevronRight, 
  ExternalLink, Copy, HelpCircle, ArrowLeft, Send, Sparkles, Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';
import { ViewType } from '../../types';

export type StaticPageTab = 'terms' | 'privacy' | 'cookies' | 'security' | 'contact';

interface StaticPageViewProps {
  initialTab?: StaticPageTab;
}

export const StaticPageView: React.FC<StaticPageViewProps> = ({ initialTab = 'terms' }) => {
  const { navigate, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<StaticPageTab>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);

  // Contact form state
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Mentorship Session Inquiry');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Sync tab if initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const switchTab = (tab: StaticPageTab) => {
    setActiveTab(tab);
    const viewMap: Record<StaticPageTab, { view: ViewType; path: string }> = {
      terms: { view: 'terms-view', path: '/terms' },
      privacy: { view: 'privacy-view', path: '/privacy' },
      cookies: { view: 'cookies-view', path: '/cookies' },
      security: { view: 'security-view', path: '/security' },
      contact: { view: 'contact-view', path: '/contact' }
    };
    const target = viewMap[tab];
    navigate(target.view, target.path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Link Copied', 'Page URL copied to clipboard.', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName || !ticketEmail || !ticketMessage) {
      showToast('Missing Fields', 'Please complete all fields before submitting.', 'warning');
      return;
    }
    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      showToast('Support Request Sent', `Thank you ${ticketName}. Ticket #${Math.floor(100000 + Math.random() * 900000)} has been opened. Our support desk will reply within 4 business hours.`, 'success');
      setTicketName('');
      setTicketEmail('');
      setTicketMessage('');
    }, 800);
  };

  return (
    <div className="static-legal-page-root">
      
      {/* Top Banner / Hero */}
      <section className="slp-hero-header">
        <div className="content-wrapper slp-hero-content">
          <div className="slp-top-back-wrap">
            <button 
              type="button" 
              className="slp-modern-back-btn" 
              onClick={() => navigate('guidance-view', '/peercomet')}
              title={`Return to ${BRAND.name}`}
            >
              <ArrowLeft size={14} className="slp-back-arrow" />
              <span>Back to {BRAND.name}</span>
            </button>
          </div>

          <div className="slp-hero-badge">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>OFFICIAL GOVERNANCE &amp; POLICIES • {BRAND.name.toUpperCase()}</span>
          </div>

          <h1 className="slp-hero-title">
            Terms, Privacy &amp; Trust Governance
          </h1>
          <p className="slp-hero-sub">
            Clear, transparent policies, robust user protections, and direct support resources for candidates, mentors, and recruiters across the {BRAND.name} network.
          </p>

          <div className="slp-hero-meta">
            <span className="slp-meta-item">
              <strong>Effective Date:</strong> January 1, 2026
            </span>
            <span className="slp-meta-dot">•</span>
            <span className="slp-meta-item">
              <strong>Last Updated:</strong> October 2026
            </span>
            <span className="slp-meta-dot">•</span>
            <span className="slp-meta-item">
              <strong>Entity:</strong> HT Media Group • {BRAND.domain}
            </span>
            <button type="button" className="slp-btn-copy" onClick={handleCopyLink} title="Copy page link">
              {copiedLink ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Container with Sidebar + Content */}
      <div className="content-wrapper slp-main-layout">
        
        {/* Left Sticky Navigation Sidebar */}
        <aside className="slp-sidebar">
          <nav className="slp-nav-card">
            <div className="slp-nav-header">
              <span>DOCUMENT NAVIGATION</span>
            </div>

            <button 
              type="button" 
              className={`slp-nav-item ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => switchTab('terms')}
            >
              <FileText size={18} className="slp-nav-icon" />
              <div className="slp-nav-text">
                <span className="slp-nav-label">Terms of Service</span>
                <span className="slp-nav-desc">User agreement &amp; session rules</span>
              </div>
              <ChevronRight size={15} className="slp-nav-chevron" />
            </button>

            <button 
              type="button" 
              className={`slp-nav-item ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => switchTab('privacy')}
            >
              <Lock size={18} className="slp-nav-icon" />
              <div className="slp-nav-text">
                <span className="slp-nav-label">Privacy Policy</span>
                <span className="slp-nav-desc">DPDP Act &amp; candidate data safety</span>
              </div>
              <ChevronRight size={15} className="slp-nav-chevron" />
            </button>

            <button 
              type="button" 
              className={`slp-nav-item ${activeTab === 'cookies' ? 'active' : ''}`}
              onClick={() => switchTab('cookies')}
            >
              <Cookie size={18} className="slp-nav-icon" />
              <div className="slp-nav-text">
                <span className="slp-nav-label">Cookie Policy</span>
                <span className="slp-nav-desc">Session security &amp; cookies</span>
              </div>
              <ChevronRight size={15} className="slp-nav-chevron" />
            </button>

            <button 
              type="button" 
              className={`slp-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => switchTab('security')}
            >
              <ShieldCheck size={18} className="slp-nav-icon" />
              <div className="slp-nav-text">
                <span className="slp-nav-label">Security &amp; Fraud Alert</span>
                <span className="slp-nav-desc">Safety precautions &amp; screening</span>
              </div>
              <ChevronRight size={15} className="slp-nav-chevron" />
            </button>

            <button 
              type="button" 
              className={`slp-nav-item ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => switchTab('contact')}
            >
              <Mail size={18} className="slp-nav-icon" />
              <div className="slp-nav-text">
                <span className="slp-nav-label">Contact &amp; Support</span>
                <span className="slp-nav-desc">Helpdesk &amp; office addresses</span>
              </div>
              <ChevronRight size={15} className="slp-nav-chevron" />
            </button>
          </nav>

          {/* Trust Guarantees Mini-Box */}
          <div className="slp-trust-box">
            <h4>{BRAND.name} Trust Guarantees</h4>
            <ul className="slp-trust-list">
              <li>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>100% Satisfaction Guarantee</span>
              </li>
              <li>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>End-to-End Encrypted Live Calls</span>
              </li>
              <li>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>Verified Mentor Identity Screening</span>
              </li>
              <li>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>Never Pay Money for Job Offers</span>
              </li>
            </ul>

            <div className="slp-parent-badge">
              <Building2 size={13} className="text-amber-500" />
              <span>An <strong>HT Media Group</strong> Enterprise</span>
            </div>
          </div>
        </aside>

        <main className="slp-article-container">
          {activeTab === 'terms' && (
            <article className="slp-article">
              <div className="slp-article-header">
                <span className="slp-article-kicker">USER AGREEMENT</span>
                <h2>Terms of Service</h2>
                <p className="slp-lead-para">
                  Welcome to {BRAND.name}. By accessing or using the {BRAND.name} platform (a specialized 1:1 career transition, skill-gap analysis, and verified peer mentorship service operated as an initiative under HT Media Limited / {BRAND.domain}), you agree to be bound by these Terms of Service.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>1. Eligibility &amp; Account Responsibility</h3>
                <p>
                  You must be at least 18 years of age or possess the legal capacity to enter into binding agreements under applicable laws (including the Indian Contract Act, 1872). When creating an account through passwordless OTP verification or Single Sign-On (SSO), you agree to provide true, accurate, and current information regarding your career background, education, and identity.
                </p>
                <p>
                  You are solely responsible for maintaining the confidentiality of your account credentials, devices, and any actions performed through your logged-in profile.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>2. Platform Scope &amp; Mentorship Services</h3>
                <p>
                  {BRAND.name} provides candidate-to-mentor connections, structured 1:1 video consultation rooms, AI-powered skill-gap analyzer roadmaps, and cryptographic peer-verified badges. {BRAND.name} acts as a technology intermediary:
                </p>
                <ul>
                  <li>
                    <strong>Mentors are independent professionals:</strong> Mentors provide guidance based on their domain experience. They are not direct employees or exclusive agents of {BRAND.name}.
                  </li>
                  <li>
                    <strong>No Placement Guarantee:</strong> While mentorship substantially accelerates interview readiness and role transitions, {BRAND.name} does not guarantee job placement, interview offers, or compensation packages at specific employers.
                  </li>
                </ul>
              </div>

              <div className="slp-section-block">
                <h3>3. Mentorship Sessions &amp; Code of Conduct</h3>
                <p>
                  All participants in 1:1 sessions (candidates and mentors alike) are required to uphold professional, respectful conduct:
                </p>
                <ul>
                  <li><strong>Punctuality:</strong> Both parties must join scheduled sessions on time via the provided in-browser WebRTC room.</li>
                  <li><strong>Zero Tolerance for Harassment:</strong> Any abusive, discriminatory, sexually explicit, or predatory behavior will result in immediate lifetime account termination.</li>
                  <li><strong>Private Call Recordings:</strong> Any session recordings generated via the built-in call room are strictly private to the session participants for review purposes and may not be published publicly without prior mutual written consent.</li>
                </ul>
              </div>

              <div className="slp-section-block highlight-card">
                <h3>4. 100% Satisfaction Guarantee &amp; Refund Policy</h3>
                <p>
                  We stand behind the quality of every verified mentorship interaction:
                </p>
                <ul>
                  <li>
                    <strong>Mentor No-Show:</strong> If a mentor fails to join a confirmed session within 15 minutes of the start time, the candidate is entitled to an immediate 100% full refund or a free reschedule.
                  </li>
                  <li>
                    <strong>Quality Discontent:</strong> If a session suffers from severe technical disruption or falls fundamentally short of the stated scope, candidates may request a review within 48 hours of completion by emailing <a href={`mailto:support@${BRAND.domain}`}>support@{BRAND.domain}</a>. Valid claims are refunded in full.
                  </li>
                  <li>
                    <strong>Candidate Cancellation:</strong> Sessions may be rescheduled or cancelled with full credit up to 12 hours prior to the scheduled slot. Cancellations within 12 hours may be subject to a nominal mentor retention fee.
                  </li>
                </ul>
              </div>

              <div className="slp-section-block">
                <h3>5. Mentor Rights &amp; 0% Commission Policy</h3>
                <p>
                  Mentors on {BRAND.name} receive 100% of their set booking fees during platform promotional tiers with 0% platform take-rate (excluding standard statutory taxes and bank gateway processing fees). Mentors retain full ownership of their proprietary coaching frameworks and educational notes.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>6. Governing Law &amp; Dispute Resolution</h3>
                <p>
                  These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the competent courts in Gurugram, Haryana / New Delhi, India.
                </p>
              </div>
            </article>
          )}

          {activeTab === 'privacy' && (
            <article className="slp-article">
              <div className="slp-article-header">
                <span className="slp-article-kicker">DATA PROTECTION</span>
                <h2>Privacy Policy</h2>
                <p className="slp-lead-para">
                  At {BRAND.name}, safeguarding your career data, identity, and personal communications is our foundational priority. This Privacy Policy explains how HT Media Limited and {BRAND.name} collect, process, and protect your information in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and global privacy benchmarks.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>1. Information We Collect</h3>
                <p>We collect only the information essential to deliver high-impact mentorship and career progression tools:</p>
                <ul>
                  <li>
                    <strong>Account &amp; Identity Data:</strong> Name, email address, mobile number, current company, title, years of experience, and optional profile photograph.
                  </li>
                  <li>
                    <strong>Career &amp; Skill Profile:</strong> Resume/CV uploads (parsed locally for skill-gap trajectory recommendations), target roles, preferred compensation bands, and verified peer badges.
                  </li>
                  <li>
                    <strong>Session &amp; Booking Details:</strong> Scheduled appointment times, prep questions submitted to mentors, shared code snippets, and post-session rating feedback.
                  </li>
                  <li>
                    <strong>Technical Diagnostics:</strong> IP address, browser type, device telemetry, and WebRTC connection diagnostics to ensure HD video stream stability.
                  </li>
                </ul>
              </div>

              <div className="slp-section-block highlight-card">
                <h3>2. Our Strict &ldquo;Never Sell&rdquo; Commitment</h3>
                <p>
                  <strong>{BRAND.name} does not sell, lease, or monetize your personal candidate data to third-party data brokers or advertisers.</strong> Your contact details (mobile phone and email) are never shared with recruiters unless you explicitly choose to make your verified skill scorecard available for hiring sourcing.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>3. Video Call Security &amp; Room Privacy</h3>
                <p>
                  Live mentorship sessions are hosted over peer-to-peer WebRTC connections with end-to-end encryption in transit (DTLS-SRTP). Audio and video streams are routed securely through high-performance signaling relays and are not eavesdropped or analyzed for unauthorized advertising.
                </p>
                <p>
                  If an in-browser session recording is enabled by mutual consent, it is stored in secure encrypted cloud storage accessible solely by the mentee and mentor for asynchronous review.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>4. Your Rights Under DPDP Act 2023</h3>
                <p>You maintain complete ownership of your personal data:</p>
                <ul>
                  <li><strong>Right to Access &amp; Summary:</strong> View all stored profile data and booking history at any time.</li>
                  <li><strong>Right to Correction:</strong> Update or modify your career profile details via the Candidate Profile Editor.</li>
                  <li><strong>Right to Erasure:</strong> Request permanent deletion of your profile, badges, and session logs by writing to <a href={`mailto:privacy@${BRAND.domain}`}>privacy@{BRAND.domain}</a>.</li>
                </ul>
              </div>

              <div className="slp-section-block">
                <h3>5. Grievance Redressal &amp; Privacy Officer</h3>
                <p>
                  In accordance with the Information Technology Act, 2000 and DPDP Act, 2023, queries or grievances may be addressed to our designated Grievance Officer:
                </p>
                <div className="slp-info-callout">
                  <strong>Grievance &amp; Privacy Officer:</strong> HT Media Limited / {BRAND.name}<br />
                  <strong>Email:</strong> <a href={`mailto:privacy@${BRAND.domain}`}>privacy@{BRAND.domain}</a> / <a href={`mailto:compliance@${BRAND.domain}`}>compliance@{BRAND.domain}</a><br />
                  <strong>Address:</strong> Unitech Cyber Park, Tower C, 9th Floor, Sector 39, Gurugram, Haryana 122001
                </div>
              </div>
            </article>
          )}

          {activeTab === 'cookies' && (
            <article className="slp-article">
              <div className="slp-article-header">
                <span className="slp-article-kicker">BROWSER STORAGE</span>
                <h2>Cookie Policy</h2>
                <p className="slp-lead-para">
                  This Cookie Policy explains how {BRAND.name} uses cookies, local browser storage, and related web technologies to authenticate your account, secure your sessions, and deliver a personalized learning experience.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>1. What Are Cookies?</h3>
                <p>
                  Cookies are compact text files placed on your device when you visit websites. They allow web platforms to remember your login state, preserve your skill-filter preferences, and provide resilient real-time communication during live calls.
                </p>
              </div>

              <div className="slp-section-block">
                <h3>2. Categories of Cookies We Use</h3>
                <div className="slp-table-responsive">
                  <table className="slp-cookie-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Purpose</th>
                        <th>Lifespan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Essential / Auth</strong></td>
                        <td>Stores your secure httpOnly session token and authentication state. Required for logging in.</td>
                        <td>Session / 30 Days</td>
                      </tr>
                      <tr>
                        <td><strong>Preferences</strong></td>
                        <td>Remembers UI theme mode, candidate goal trajectory track, and mentor dashboard toggles.</td>
                        <td>1 Year</td>
                      </tr>
                      <tr>
                        <td><strong>Diagnostics</strong></td>
                        <td>Measures WebRTC latency and audio/video packet drop rates during calls to optimize server routing.</td>
                        <td>Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="slp-section-block">
                <h3>3. Managing Cookie Preferences</h3>
                <p>
                  You can modify or disable non-essential cookies at any time through your browser settings (Chrome, Safari, Firefox, Edge). Please note that disabling essential authentication cookies will prevent you from signing in or joining live mentorship rooms.
                </p>
              </div>
            </article>
          )}

          {activeTab === 'security' && (
            <article className="slp-article">
              <div className="slp-article-header">
                <span className="slp-article-kicker">TRUST &amp; SAFETY</span>
                <h2>Security &amp; Fraud Prevention Alert</h2>
                <p className="slp-lead-para">
                  HT Media Limited and {BRAND.name} maintain a zero-compromise approach toward candidate safety, fraud detection, and information security.
                </p>
              </div>

              {/* Critical Alert Warning Box */}
              <div className="slp-warning-banner">
                <div className="slp-wb-icon">
                  <AlertTriangle size={24} className="text-amber-500" />
                </div>
                <div className="slp-wb-content">
                  <h4>⚠️ Critical Warning: Never Pay Money for Job Offers</h4>
                  <p>
                    <strong>{BRAND.name} NEVER asks candidates or job seekers for money, security deposits, or upfront fees in exchange for guaranteed interview calls, appointment letters, or mentorship placements.</strong>
                  </p>
                  <p>
                    Anyone soliciting funds promising confirmed jobs at reputed companies while impersonating {BRAND.name} is a fraudulent actor. Please report such solicitations immediately to <a href={`mailto:compliance@${BRAND.domain}`}>compliance@{BRAND.domain}</a>.
                  </p>
                </div>
              </div>

              <div className="slp-section-block">
                <h3>1. Official Communications Verification</h3>
                <p>To protect yourself against phishing and email spoofing, verify that communications originate solely from authorized domains:</p>
                <ul>
                  <li><strong>Official Email Domains:</strong> <code>@{BRAND.domain}</code> and <code>@htmedia.in</code>.</li>
                  <li><strong>Official Helpline:</strong> <code>080-10062222</code> / <code>080-47105151</code> (9:00 AM – 7:00 PM IST).</li>
                  <li><strong>Official Website:</strong> <code>https://{BRAND.domain}</code>.</li>
                </ul>
              </div>

              <div className="slp-section-block">
                <h3>2. Verified Mentor Identity Screening</h3>
                <p>Every mentor on {BRAND.name} undergoes a multi-layer verification gate prior to hosting paid sessions:</p>
                <ul>
                  <li><strong>LinkedIn &amp; Corporate Domain Verification:</strong> Mentors verify employment at top-tier tech organizations (Google, Microsoft, Flipkart, Amazon, Uber, Meta, etc.).</li>
                  <li><strong>Domain Track Record:</strong> Evaluation of open-source contributions, technical publications, or verifiable architectural leadership.</li>
                  <li><strong>Zero-Escrow Bank Settlement:</strong> Mentor payouts require verified PAN and bank verification to eliminate anonymous bad actors.</li>
                </ul>
              </div>

              <div className="slp-section-block">
                <h3>3. Infrastructure &amp; Technical Security</h3>
                <ul>
                  <li><strong>TLS 1.3 Encryption:</strong> All web traffic is strictly encrypted using modern cryptographic ciphers in transit.</li>
                  <li><strong>Role-Based Access Control:</strong> Strict least-privilege policies protect internal candidate databases.</li>
                  <li><strong>Cryptographic Skill Badges:</strong> Peer-verified credential badges issued to candidates cannot be tampered with or forged.</li>
                </ul>
              </div>
            </article>
          )}

          {activeTab === 'contact' && (
            <article className="slp-article">
              <div className="slp-article-header">
                <span className="slp-article-kicker">HELPDESK &amp; CHANNELS</span>
                <h2>Contact Us &amp; Support</h2>
                <p className="slp-lead-para">
                  We are here to support your career growth. Reach out to our dedicated support, mentor onboarding, or trust and safety teams through any of the channels below.
                </p>
              </div>

              {/* Direct Channels Cards Grid */}
              <div className="slp-contact-cards-grid">
                <div className="slp-contact-card">
                  <div className="scc-icon-wrap purple">
                    <Mail size={22} />
                  </div>
                  <h4>Candidate &amp; Mentor Support</h4>
                  <p>Inquiries about session bookings, rescheduling, and roadmap guidance.</p>
                  <a href={`mailto:support@${BRAND.domain}`} className="scc-action-link">
                    support@{BRAND.domain} ↗
                  </a>
                  <span className="scc-response-time">Average response: &lt; 4 hours</span>
                </div>

                <div className="slp-contact-card">
                  <div className="scc-icon-wrap amber">
                    <ShieldCheck size={22} />
                  </div>
                  <h4>Trust, Safety &amp; Compliance</h4>
                  <p>Report suspicious calls, fake recruiters, or policy violations.</p>
                  <a href={`mailto:compliance@${BRAND.domain}`} className="scc-action-link">
                    compliance@{BRAND.domain} ↗
                  </a>
                  <span className="scc-response-time">Urgent triage: &lt; 2 hours</span>
                </div>

                <div className="slp-contact-card">
                  <div className="scc-icon-wrap blue">
                    <Phone size={22} />
                  </div>
                  <h4>Official Telephone Helpline</h4>
                  <p>Direct customer assistance for {BRAND.name} candidates.</p>
                  <a href="tel:08010062222" className="scc-action-link">
                    080-10062222
                  </a>
                  <span className="scc-response-time">Mon–Sat • 9:00 AM – 7:00 PM IST</span>
                </div>
              </div>

              {/* Office Locations */}
              <div className="slp-section-block">
                <h3>Our Office Locations</h3>
                <div className="slp-offices-row">
                  <div className="slp-office-card">
                    <div className="soc-header">
                      <MapPin size={16} className="text-purple-600" />
                      <strong>HT Media Corporate Headquarters</strong>
                    </div>
                    <p>
                      HT Media Limited, Unitech Cyber Park, Tower C, 9th Floor, Sector 39, Gurugram, Haryana 122001, India.
                    </p>
                  </div>
                  <div className="slp-office-card">
                    <div className="soc-header">
                      <MapPin size={16} className="text-blue-600" />
                      <strong>Bengaluru Technology &amp; Innovation Hub</strong>
                    </div>
                    <p>
                      HT Media Digital, Outer Ring Road Tech Corridor, Bellandur, Bengaluru, Karnataka 560103, India.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Support Ticket Form */}
              <div className="slp-ticket-form-card">
                <div className="stfc-header">
                  <Sparkles size={18} className="text-purple-600" />
                  <div>
                    <h4>Submit a Support Request</h4>
                    <p>Need assistance with a booking or account? Send us a message directly.</p>
                  </div>
                </div>

                <form onSubmit={handleContactSubmit} className="stfc-form">
                  <div className="stfc-row-2">
                    <div className="stfc-field">
                      <label>Your Full Name *</label>
                      <input 
                        type="text" 
                        value={ticketName} 
                        onChange={(e) => setTicketName(e.target.value)} 
                        placeholder="e.g. Rahul Sharma"
                        required 
                      />
                    </div>
                    <div className="stfc-field">
                      <label>Registered Email Address *</label>
                      <input 
                        type="email" 
                        value={ticketEmail} 
                        onChange={(e) => setTicketEmail(e.target.value)} 
                        placeholder="e.g. rahul@example.com"
                        required 
                      />
                    </div>
                  </div>

                  <div className="stfc-field">
                    <label>Inquiry Category</label>
                    <select 
                      value={ticketCategory} 
                      onChange={(e) => setTicketCategory(e.target.value)}
                    >
                      <option value="Mentorship Session Inquiry">Mentorship Session Inquiry</option>
                      <option value="Refund & 100% Satisfaction Guarantee">Refund &amp; 100% Satisfaction Guarantee</option>
                      <option value="Mentor Onboarding Application">Mentor Onboarding Application</option>
                      <option value="Fraud / Fake Recruiter Report">Report Fraud / Fake Recruiter</option>
                      <option value="Technical Support (Video Room / WebRTC)">Technical Support (Video Room / WebRTC)</option>
                      <option value="Other / General Feedback">Other / General Feedback</option>
                    </select>
                  </div>

                  <div className="stfc-field">
                    <label>Message / Details *</label>
                    <textarea 
                      rows={4} 
                      value={ticketMessage} 
                      onChange={(e) => setTicketMessage(e.target.value)} 
                      placeholder="Please describe your query or session booking details..."
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="stfc-btn-submit"
                    disabled={isSubmittingTicket}
                  >
                    <Send size={15} />
                    <span>{isSubmittingTicket ? 'Sending Request...' : 'Send Support Request'}</span>
                  </button>
                </form>
              </div>

            </article>
          )}

        </main>
      </div>

    </div>
  );
};

export default StaticPageView;
