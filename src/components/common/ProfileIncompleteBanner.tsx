import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isProfileComplete, getMissingMandatoryFields } from '../../utils/profile';

/**
 * Top notification banner displayed across the app when the signed-in user's
 * mandatory registration fields have not been completed yet.
 * Stays visible until all mandatory fields (resume, skills, experience, role, city) are filled.
 */
export const ProfileIncompleteBanner: React.FC = () => {
  const { currentUser, isAuthLoading, userProfile, currentView, navigate } = useApp();

  // Only show when user is signed in, profile is incomplete, and not already on /register or login
  if (
    isAuthLoading ||
    !currentUser ||
    isProfileComplete(userProfile) ||
    currentView === 'registration-view' ||
    currentView === 'login-view' ||
    currentView === 'admin-dashboard-view'
  ) {
    return null;
  }

  const missing = getMissingMandatoryFields(userProfile);
  const handleComplete = () => {
    navigate('registration-view', '/register');
  };

  return (
    <aside className="profile-incomplete-banner" role="status" aria-live="polite">
      <div className="pib-container">
        <div className="pib-left">
          <div className="pib-icon-box">
            <AlertCircle size={15} className="pib-icon text-amber-600" />
          </div>
          <div className="pib-text-box">
            <p className="pib-message">
              <strong>Complete Registration:</strong> Your profile is missing mandatory details ({missing.join(', ')}). Fill them in to unlock full mentor matching and 1:1 sessions.
            </p>
          </div>
        </div>
        <div className="pib-actions">
          <button
            type="button"
            className="pib-btn-cta"
            onClick={handleComplete}
          >
            <span>Complete Registration</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
