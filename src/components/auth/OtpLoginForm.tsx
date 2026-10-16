import React, { useState } from 'react';
import { ArrowRight, Mail, Zap, UserCheck, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Passwordless sign-in / sign-up: email -> 6-digit code.
 * A new email gets an account on verification and then goes to registration (/register).
 * Mentors sign up the same way, then use "Become a Mentor".
 * Includes development 1-click bypass and auto-fill helpers.
 */
export const OtpLoginForm: React.FC = () => {
  const { requestOtp, verifyOtp, devBypassLogin } = useApp();

  const [email, setEmail] = useState<string>('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [otp, setOtp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isDevEnvironment = 
    Boolean((import.meta as any)?.env?.DEV) || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('10.') || 
    window.location.hostname.startsWith('192.168.');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      return;
    }
    setIsLoading(true);
    const challenge = await requestOtp(email);
    setIsLoading(false);
    if (challenge) {
      setRequestId(challenge.requestId);
      setIsRegistered(challenge.isRegistered);
      setOtp('');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!requestId) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrorMessage('Please enter the 6-digit code (in dev use 123456)');
      return;
    }
    setIsLoading(true);
    await verifyOtp({ requestId, email, otp });
    setIsLoading(false);
  };

  const handleResend = async () => {
    setErrorMessage('');
    setIsLoading(true);
    const challenge = await requestOtp(email);
    setIsLoading(false);
    if (challenge) {
      setRequestId(challenge.requestId);
      setOtp('');
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="fgb-error-alert">
          <span>{errorMessage}</span>
        </div>
      )}

      {!requestId ? (
        <form onSubmit={handleSendOtp} className="fgb-form-fields">
          <div className="fgb-input-group">
            <label className="fgb-input-label">Email</label>
            <div className="fgb-input-container">
              <Mail size={16} className="fgb-input-icon" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="fgb-text-input"
                autoFocus
              />
            </div>
          </div>

          <button type="submit" className="btn-fgb-primary" disabled={isLoading}>
            <span>{isLoading ? 'Sending code...' : 'Email me a code'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="fgb-form-fields">
          <div className="fgb-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="fgb-input-label" style={{ marginBottom: 0 }}>
                Enter the 6-digit code sent to {email}
              </label>
              {isDevEnvironment && (
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  style={{
                    background: '#EDE9FE',
                    border: '1px solid #DDD6FE',
                    color: '#7C3AED',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    cursor: 'pointer'
                  }}
                  title="Click to auto-fill development code"
                >
                  ⚡ Fill 123456
                </button>
              )}
            </div>
            <div className="fgb-input-container">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                maxLength={6}
                className="fgb-text-input text-center font-bold tracking-widest text-lg"
                autoFocus
              />
            </div>
          </div>

          {!isRegistered && (
            <p className="fgb-subtitle">New here? After this step you'll create your profile.</p>
          )}

          <button type="submit" className="btn-fgb-primary" disabled={isLoading}>
            <span>{isLoading ? 'Verifying...' : isRegistered ? 'Verify & Sign In' : 'Verify & Continue'}</span>
            <ArrowRight size={16} />
          </button>

          <button type="button" className="btn-fgb-back-text" onClick={handleResend} disabled={isLoading}>
            Didn't get it? Send a new code
          </button>
          <button
            type="button"
            className="btn-fgb-back-text"
            onClick={() => { setRequestId(null); setErrorMessage(''); }}
          >
            ← Use a different email
          </button>
        </form>
      )}

      {/* Dev Quick Bypass Section */}
      {isDevEnvironment && (
        <div style={{
          marginTop: '20px',
          padding: '12px 14px',
          background: 'rgba(248, 250, 252, 0.95)',
          border: '1px dashed #CBD5E1',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Zap size={12} className="text-amber-500" />
              Dev Quick Bypass
            </span>
            <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600 }}>Default Code: 123456</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => devBypassLogin('candidate')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7C3AED')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
            >
              <UserCheck size={13} className="text-purple-600" />
              <span>Candidate</span>
            </button>
            <button
              type="button"
              onClick={() => devBypassLogin('mentor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7C3AED')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
            >
              <Shield size={13} className="text-blue-600" />
              <span>Mentor</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
