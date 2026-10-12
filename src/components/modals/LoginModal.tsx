import React from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OtpLoginForm } from '../auth/OtpLoginForm';

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
            <span>PeerPath by Shine</span>
          </div>
          <h2 className="login-modal-title">Sign in to continue</h2>
          <p className="login-modal-subtitle">
            Use your mobile number. Already on Shine? Use the same number. New here? We'll create your account.
          </p>
        </div>

        <OtpLoginForm />

        <div className="fgb-sso-guarantee">
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          <span>We never share your number with mentors.</span>
        </div>
      </div>
    </div>
  );
};
