import React from 'react';
import { 
  ShieldCheck, ShieldAlert, ArrowRight, LogOut, 
  Lock, Award, Users, Banknote 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeerpathLogo, PeerpathSymbolSvg } from '../common/PeerpathLogo';
import { OtpLoginForm } from '../auth/OtpLoginForm';
import { BRAND } from '../../config/brand';

/**
 * Admins sign in with the same email code as everyone else. Access comes only from
 * ADMIN_EMAILS / ADMIN_USER_IDS on the server, never from the email address itself.
 */
export const AdminLoginView: React.FC = () => {
  const { currentUser, logout, navigate } = useApp();

  return (
    <div className="peerpath-admin-auth-stage">
      
      {/* Ambient Lighting */}
      <div className="admin-auth-ambient-orb orb-indigo"></div>
      <div className="admin-auth-ambient-orb orb-teal"></div>

      {/* Top Header */}
      <header className="admin-auth-top-bar">
        <PeerpathLogo size={36} showText={true} />
        <div className="admin-auth-status-chip">
          <span className="pulse-dot"></span>
          <span>Operations Console</span>
        </div>
        <button
          type="button"
          className="btn-admin-auth-portal-link"
          onClick={() => navigate('guidance-view', '/peercomet')}
        >
          <span>Candidate Portal</span>
          <ArrowRight size={13} />
        </button>
      </header>

      {/* 2-Column Executive Authentication Stage */}
      <div className="admin-auth-main-grid">
        
        {/* Left Feature Showcase */}
        <div className="admin-auth-showcase">
          <div className="admin-showcase-badge">
            <ShieldCheck size={14} className="text-amber-500" />
            <span>{BRAND.name} Enterprise Operations</span>
          </div>

          <h1 className="admin-showcase-title">
            Unified governance for the <span className="text-gradient-brand">{BRAND.name}</span> 1:1 mentorship marketplace.
          </h1>

          <p className="admin-showcase-desc">
            Evaluate candidate registrations, inspect resumes, grant mentor vetting rights, and oversee session bookings and platform GMV.
          </p>

          <div className="admin-showcase-pillars">
            <div className="admin-pillar-item">
              <div className="admin-pillar-icon purple">
                <Award size={18} />
              </div>
              <div>
                <strong>Role &amp; Mentor Rights Governance</strong>
                <p>One-click vetting to authorize candidates as paid mentors.</p>
              </div>
            </div>

            <div className="admin-pillar-item">
              <div className="admin-pillar-icon blue">
                <Users size={18} />
              </div>
              <div>
                <strong>Candidate Profile &amp; Resume Tracking</strong>
                <p>Real-time applicant database with CV previews &amp; career goals.</p>
              </div>
            </div>

            <div className="admin-pillar-item">
              <div className="admin-pillar-icon emerald">
                <Banknote size={18} />
              </div>
              <div>
                <strong>Escrow &amp; Platform Financials</strong>
                <p>15% platform clearing, GMV monitoring, and payout readiness.</p>
              </div>
            </div>
          </div>

          <div className="admin-showcase-security">
            <Lock size={15} className="text-slate-400" />
            <span>Restricted Access: {BRAND.name} internal operations &amp; vetted administrators only.</span>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="admin-auth-card-wrapper">
          <div className="admin-auth-card">
            
            <div className="admin-auth-card-header">
              <div className="admin-card-symbol-badge">
                <PeerpathSymbolSvg size={28} theme="light" />
              </div>
              <h2>{BRAND.name} CRM Portal</h2>
              <p>Enterprise Operations &amp; Mentor Governance</p>
            </div>

            {currentUser ? (
              /* Signed in as Candidate (non-admin) */
              <div className="admin-access-denied-block">
                <div className="admin-denied-banner">
                  <ShieldAlert size={20} className="text-rose-500 flex-shrink-0" />
                  <div>
                    <strong>Administrator Privileges Required</strong>
                    <p>
                      You are currently signed in as <strong>{currentUser.email}</strong> (Candidate account). 
                      This portal is restricted to authorized {BRAND.name} operations administrators.
                    </p>
                  </div>
                </div>

                <div className="admin-auth-actions-group">
                  <button
                    type="button"
                    className="btn-admin-primary"
                    onClick={() => logout(true)}
                  >
                    <LogOut size={15} />
                    <span>Switch to Administrator Account</span>
                  </button>

                  <button
                    type="button"
                    className="btn-admin-secondary"
                    onClick={() => navigate('guidance-view', '/peercomet')}
                  >
                    <span>Return to Candidate Directory (/peercomet)</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : (
              /* Internal Operations CRM Login */
              <div className="admin-login-form-wrapper">
                <OtpLoginForm />

                <div className="admin-card-trust-footer">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Internal operations access only</span>
                </div>

                <div className="admin-auth-footer">
                  <button
                    type="button"
                    className="btn-admin-exit-link"
                    onClick={() => navigate('guidance-view', '/peercomet')}
                  >
                    ← Return to {BRAND.name} Mentorship Portal
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
