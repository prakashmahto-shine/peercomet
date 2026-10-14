import React, { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Passwordless sign-in / sign-up: email -> 6-digit code.
 * A new email gets an account on verification and then goes to registration (/register).
 * Mentors sign up the same way, then use "Become a Mentor".
 * Reuses the login page's `fgb-*` styles.
 */
export const OtpLoginForm: React.FC = () => {
  const { requestOtp, verifyOtp } = useApp();

  const [email, setEmail] = useState<string>('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [otp, setOtp] = useState<string>('');
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
    </>
  );
};
