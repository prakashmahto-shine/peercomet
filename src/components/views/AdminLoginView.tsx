import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertCircle, ArrowRight, LogOut, 
  Mail, Lock, Award, Users, Banknote, Eye, EyeOff 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeerpathLogo, PeerpathSymbolSvg } from '../common/PeerpathLogo';

export const AdminLoginView: React.FC = () => {
  const { 
    currentUser, 
    adminLogin, 
    logout, 
    navigate 
  } = useApp();

  const [adminEmail, setAdminEmail] = useState<string>('admin@peerpath.com');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState<boolean>(false);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    if (!adminEmail.trim()) {
      setAdminAuthError('Please enter administrator work email.');
      return;
    }
    if (!adminPassword) {
      setAdminAuthError('Please enter internal security password.');
      return;
    }
    setIsAdminSubmitting(true);
    const success = await adminLogin({
      email: adminEmail.trim(),
      password: adminPassword
    });
    setIsAdminSubmitting(false);
    if (!success) {
      setAdminAuthError('Access Denied: Invalid administrator credentials.');
    }
  };

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
          onClick={() => navigate('guidance-view', '/peerpath')}
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
            <span>PeerPath Enterprise Operations</span>
          </div>

          <h1 className="admin-showcase-title">
            Unified governance for the <span className="text-gradient-brand">PeerPath</span> 1:1 mentorship marketplace.
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
            <span>Restricted Access: PeerPath internal operations &amp; vetted administrators only.</span>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="admin-auth-card-wrapper">
          <div className="admin-auth-card">
            
            <div className="admin-auth-card-header">
              <div className="admin-card-symbol-badge">
                <PeerpathSymbolSvg size={28} theme="light" />
              </div>
              <h2>PeerPath CRM Portal</h2>
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
                      This portal is restricted to authorized PeerPath operations administrators.
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
                    onClick={() => navigate('guidance-view', '/peerpath')}
                  >
                    <span>Return to Candidate Directory (/peerpath)</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : (
              /* Internal Operations CRM Login */
              <div className="admin-login-form-wrapper">
                {adminAuthError && (
                  <div className="admin-error-notice">
                    <AlertCircle size={15} />
                    <span>{adminAuthError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminSubmit} className="admin-form-fields">
                  <div className="admin-form-group">
                    <label>Administrator Work Email</label>
                    <div className="admin-input-wrapper">
                      <Mail size={16} className="admin-field-icon" />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        placeholder="admin@peerpath.com"
                        className="admin-text-field"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Internal Security Password</label>
                    <div className="admin-input-wrapper">
                      <Lock size={16} className="admin-field-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="Enter password"
                        className="admin-text-field"
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-admin-primary"
                    disabled={isAdminSubmitting}
                  >
                    <span>{isAdminSubmitting ? 'Authenticating...' : 'Authorize & Open CRM'}</span>
                    <ShieldCheck size={16} />
                  </button>
                </form>

                <div className="admin-card-trust-footer">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>SOC-2 Type II · Internal Operations Access Only</span>
                </div>

                <div className="admin-auth-footer">
                  <button
                    type="button"
                    className="btn-admin-exit-link"
                    onClick={() => navigate('guidance-view', '/peerpath')}
                  >
                    ← Return to PeerPath Mentorship Portal
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
