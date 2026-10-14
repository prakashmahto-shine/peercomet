import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertCircle, ArrowRight, LogOut, 
  Mail, KeyRound, CheckCircle, Lock, Award, Users, Banknote 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeerpathLogo, PeerpathSymbolSvg } from '../common/PeerpathLogo';

export const AdminLoginView: React.FC = () => {
  const { 
    currentUser, 
    requestOtp, 
    verifyOtp, 
    logout, 
    navigate 
  } = useApp();

  const [adminEmail, setAdminEmail] = useState<string>('admin@peerpath.com');
  const [adminOtp, setAdminOtp] = useState<string>('');
  const [adminRequestId, setAdminRequestId] = useState<string | null>(null);
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState<boolean>(false);

  const handleAdminSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    if (!adminEmail.trim()) {
      setAdminAuthError('Please enter an authorized administrator email.');
      return;
    }
    setIsAdminSubmitting(true);
    const challenge = await requestOtp(adminEmail.trim());
    setIsAdminSubmitting(false);
    if (challenge) {
      setAdminRequestId(challenge.requestId);
      setAdminOtp('');
    } else {
      setAdminAuthError('Failed to send security code. Please try again.');
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    if (!adminRequestId) return;
    if (!/^\d{6}$/.test(adminOtp.trim())) {
      setAdminAuthError('Please enter the 6-digit verification code.');
      return;
    }
    setIsAdminSubmitting(true);
    const success = await verifyOtp({
      requestId: adminRequestId,
      email: adminEmail.trim(),
      otp: adminOtp.trim()
    });
    setIsAdminSubmitting(false);
    if (!success) {
      setAdminAuthError('Invalid code or session expired. Please retry.');
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
              /* Not signed in: OTP Sign-In */
              <div className="admin-login-form-wrapper">
                {adminAuthError && (
                  <div className="admin-error-notice">
                    <AlertCircle size={15} />
                    <span>{adminAuthError}</span>
                  </div>
                )}

                {!adminRequestId ? (
                  <form onSubmit={handleAdminSendOtp} className="admin-form-fields">
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

                      {/* Quick demo helper pills */}
                      <div className="admin-quick-pills">
                        <span className="admin-quick-label">Quick Access:</span>
                        <button
                          type="button"
                          className="btn-quick-email"
                          onClick={() => setAdminEmail('admin@peerpath.com')}
                        >
                          admin@peerpath.com
                        </button>
                        <button
                          type="button"
                          className="btn-quick-email"
                          onClick={() => setAdminEmail('admin@shine.com')}
                        >
                          admin@shine.com
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-admin-primary"
                      disabled={isAdminSubmitting}
                    >
                      <span>{isAdminSubmitting ? 'Sending Security Code...' : 'Send Security OTP'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAdminVerify} className="admin-form-fields">
                    <div className="admin-form-group">
                      <label>Enter 6-Digit Admin Verification Code</label>
                      <div className="admin-input-wrapper">
                        <KeyRound size={16} className="admin-field-icon" />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={adminOtp}
                          onChange={e => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          maxLength={6}
                          className="admin-text-field admin-otp-field"
                          autoFocus
                          required
                        />
                      </div>
                      <div className="admin-demo-code-banner">
                        <CheckCircle size={13} className="text-emerald-600" />
                        <span>Sent to <strong>{adminEmail}</strong> (Demo code: <code>123456</code>)</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-admin-primary"
                      disabled={isAdminSubmitting}
                    >
                      <span>{isAdminSubmitting ? 'Verifying...' : 'Verify & Open CRM'}</span>
                      <ShieldCheck size={16} />
                    </button>

                    <div className="admin-sub-actions">
                      <button
                        type="button"
                        className="btn-admin-link"
                        onClick={() => { setAdminRequestId(null); setAdminAuthError(''); }}
                      >
                        ← Change Administrator Email
                      </button>
                    </div>
                  </form>
                )}

                <div className="admin-card-trust-footer">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>SOC-2 Type II · 256-Bit Encrypted RBAC Access</span>
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
