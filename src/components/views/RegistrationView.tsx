import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProfileEditor } from '../profile/ProfileEditor';
import { BRAND } from '../../config/brand';

/**
 * Registration step 1 of 2: the user's profile (upload a resume to fill it, or type it in).
 * Users can also skip this and browse mentors; a reminder banner stays visible across the app.
 */
export const RegistrationView: React.FC = () => {
  const { currentUser, userProfile, navigate, showToast } = useApp();

  const handleSaved = () => {
    showToast('Profile saved', 'Now tell us your career goal to see matching mentors.', 'success');
    navigate('guidance-view', '/peerpath');
  };

  const handleSkip = () => {
    showToast('Profile pending', 'You can complete your profile anytime from the top banner.', 'info');
    navigate('guidance-view', '/peerpath');
  };

  return (
    <div className="shine-modal-backdrop" onClick={handleSkip}>
      <div className="shine-update-profile-surface" onClick={e => e.stopPropagation()}>
        <div className="sup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="sup-header-titles">
            <span className="sup-checkout-badge">Step 1 of 2 · Your profile</span>
            <h2 className="sup-title">Welcome to {BRAND.name}{userProfile.firstName || currentUser?.name ? `, ${userProfile.firstName || currentUser?.name}` : ''}</h2>
            <p className="sup-resume-subtext">
              Upload your resume and we'll fill in your profile, or enter your details yourself.
            </p>
          </div>
          <button
            type="button"
            className="btn-sup-close"
            onClick={handleSkip}
            title="Skip for now"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {/* Re-mount when the profile finishes loading so the form starts from saved values */}
        <ProfileEditor
          key={`${currentUser?.id}-${userProfile.email}`}
          onSaved={handleSaved}
          onSkip={handleSkip}
          submitLabel="Save & Continue"
        />
      </div>
    </div>
  );
};
