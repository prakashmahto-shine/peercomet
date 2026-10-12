import React, { useState } from 'react';
import { ArrowRight, Mail, Phone, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Sign in / sign up with the user's Shine account: mobile -> OTP.
 * New mobiles (not on Shine yet) also enter name + email, which registers them on Shine.
 * Reuses the login page's `fgb-*` styles.
 */
export const OtpLoginForm: React.FC = () => {
  const { requestOtp, verifyOtp } = useApp();

  const [mobile, setMobile] = useState<string>('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [otp, setOtp] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!mobile.trim()) {
      setErrorMessage('Please enter your mobile number');
      return;
    }
    setIsLoading(true);
    const challenge = await requestOtp(mobile);
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
    if (!/^\d{4,6}$/.test(otp.trim())) {
      setErrorMessage('Please enter the OTP sent to your mobile');
      return;
    }
    if (!isRegistered && (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))) {
      setErrorMessage('Please enter your name and a valid email to create your account');
      return;
    }
    setIsLoading(true);
    await verifyOtp({
      requestId,
      mobile,
      otp,
      ...(isRegistered ? {} : { name: name.trim(), email: email.trim() })
    });
    setIsLoading(false);
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
            <label className="fgb-input-label">Mobile Number</label>
            <div className="fgb-input-container">
              <Phone size={16} className="fgb-input-icon" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter your 10-digit mobile number"
                className="fgb-text-input"
                autoFocus
              />
            </div>
          </div>

          <button type="submit" className="btn-fgb-primary" disabled={isLoading}>
            <span>{isLoading ? 'Sending OTP...' : 'Get OTP'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="fgb-form-fields">
          {!isRegistered && (
            <>
              <p className="fgb-subtitle">New here? Create your account in one step.</p>
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
                    autoFocus
                  />
                </div>
              </div>
              <div className="fgb-input-group">
                <label className="fgb-input-label">Email</label>
                <div className="fgb-input-container">
                  <Mail size={16} className="fgb-input-icon" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="fgb-text-input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="fgb-input-group">
            <label className="fgb-input-label">Enter the OTP sent to {mobile}</label>
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
                autoFocus={isRegistered}
              />
            </div>
          </div>

          <button type="submit" className="btn-fgb-primary" disabled={isLoading}>
            <span>{isLoading ? 'Verifying...' : isRegistered ? 'Verify & Sign In' : 'Create Account'}</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn-fgb-back-text"
            onClick={() => { setRequestId(null); setErrorMessage(''); }}
          >
            ← Change mobile number
          </button>
        </form>
      )}
    </>
  );
};
