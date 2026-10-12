import React, { useState } from 'react';
import { ArrowRight, Mail, Phone, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Passwordless sign-in / sign-up: email -> 6-digit code.
 * A new email also enters a name (and optionally a mobile number), which creates the account.
 * Mentors sign up the same way, then use "Become a Mentor".
 * Reuses the login page's `fgb-*` styles.
 */
export const OtpLoginForm: React.FC = () => {
  const { requestOtp, verifyOtp } = useApp();

  const [email, setEmail] = useState<string>('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [otp, setOtp] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      setErrorMessage('Please enter the 6-digit code from your email');
      return;
    }
    if (!isRegistered && name.trim().length < 2) {
      setErrorMessage('Please enter your name to create your account');
      return;
    }
    setIsLoading(true);
    await verifyOtp({
      requestId,
      email,
      otp,
      ...(isRegistered ? {} : { name: name.trim(), mobile: mobile.trim() || undefined })
    });
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
            <label className="fgb-input-label">Enter the 6-digit code sent to {email}</label>
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
            <>
              <p className="fgb-subtitle">New here? Tell us your name to create your account.</p>
              <div className="fgb-input-group">
                <label className="fgb-input-label">Full Name</label>
                <div className="fgb-input-container">
                  <User size={16} className="fgb-input-icon" />
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="fgb-text-input"
                  />
                </div>
              </div>
              <div className="fgb-input-group">
                <label className="fgb-input-label">Mobile Number (optional)</label>
                <div className="fgb-input-container">
                  <Phone size={16} className="fgb-input-icon" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="fgb-text-input"
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-fgb-primary" disabled={isLoading}>
            <span>{isLoading ? 'Verifying...' : isRegistered ? 'Verify & Sign In' : 'Create Account'}</span>
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
    </>
  );
};
