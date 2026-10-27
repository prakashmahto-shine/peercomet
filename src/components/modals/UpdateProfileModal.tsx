import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProfileEditor } from '../profile/ProfileEditor';

// "Edit Profile" modal (also used to confirm details before a booking checkout)
export const UpdateProfileModal: React.FC = () => {
  const {
    isUpdateProfileModalOpen,
    setIsUpdateProfileModalOpen,
    pendingBookingCheckout,
    setPendingBookingCheckout,
    bookingDraft,
    navigate
  } = useApp();
  const [isBusy, setIsBusy] = useState<boolean>(false);

  if (!isUpdateProfileModalOpen) return null;

  const handleClose = () => {
    if (isBusy) return;
    if (pendingBookingCheckout) setPendingBookingCheckout(false);
    setIsUpdateProfileModalOpen(false);
  };

  const handleSaved = () => {
    setIsUpdateProfileModalOpen(false);
    if (pendingBookingCheckout) {
      setPendingBookingCheckout(false);
      navigate('payment-view');
    }
  };

  return (
    <div className="shine-modal-backdrop" onClick={handleClose}>
      <div className="shine-update-profile-surface" onClick={e => e.stopPropagation()}>
        <div className="sup-header">
          <div className="sup-header-titles">
            <h2 className="sup-title">{pendingBookingCheckout ? 'Confirm your details for the session' : 'Update your profile'}</h2>
            {pendingBookingCheckout && (
              <span className="sup-checkout-badge">
                <Sparkles size={12} className="text-amber-500" />
                <span>Your mentor sees these details before the session</span>
              </span>
            )}
          </div>
          <button type="button" className="btn-sup-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <ProfileEditor
          onSaved={handleSaved}
          onBusyChange={setIsBusy}
          submitLabel={pendingBookingCheckout ? 'Save & Continue to Pay' : 'Save Profile'}
          footerSummary={pendingBookingCheckout ? (
            <div className="sup-footer-summary">
              <span className="sup-f-lbl">Payable Amount</span>
              <div className="sup-f-price-line">
                <span className="sup-f-amount">₹{bookingDraft?.amount || 0}</span>
                <span className="sup-f-dot">•</span>
                <span className="sup-f-type">{bookingDraft?.sessionType || '1:1 Session'}</span>
              </div>
            </div>
          ) : undefined}
        />
      </div>
    </div>
  );
};
