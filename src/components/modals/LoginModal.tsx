import React from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OtpLoginForm } from '../auth/OtpLoginForm';
import { BRAND } from '../../config/brand';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen } = useApp();

  if (!isLoginModalOpen) return null;

  return (
    <div className="app-modal-backdrop open">
      <div className="app-modal-card login-modal-card">
        <button
          className="modal-close-btn"
          onClick={() => setIsLoginModalOpen(false)}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="login-modal-header">
          <div className="login-badge-pill">
            <Sparkles size={13} className="text-amber-500" />
            <span>{BRAND.tagline}</span>
          </div>
          <h2 className="login-modal-title">Sign in to continue</h2>
          <p className="login-modal-subtitle">
            We'll email you a 6-digit code. No password needed. New here? We'll create your account.
          </p>
        </div>

        <OtpLoginForm />

        <div className="fgb-sso-guarantee">
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          <span>Sign-in codes expire in 10 minutes and work only once.</span>
        </div>
      </div>
    </div>
  );
};
