import React, { useEffect } from 'react';
import { 
  Check, Calendar, Sparkles, CalendarPlus, Video, ArrowRight, 
  FileText, UploadCloud, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { isResumeRecent } from '../../utils/resume';
import { BRAND } from '../../config/brand';

export const ConfirmedView: React.FC = () => {
  const { bookingDraft, navigate, userProfile, setIsCvSyncModalOpen, selectedExpert, currentUser } = useApp();
  
  const expert = bookingDraft.expert?.id ? bookingDraft.expert : selectedExpert;

  const date = bookingDraft.date;
  const timeSlot = bookingDraft.timeSlot;
  const sessionType = bookingDraft.sessionType || 'Career guidance';
  const paidAmount = bookingDraft.amount || expert.price || 0;

  useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }, []);

  const currentCv = bookingDraft.attachedCvName || userProfile?.resumeFileName || '';
  const isRecentlySynced = isResumeRecent(userProfile);

  if (!expert?.id || !date) {
    return (
      <div className="content-wrapper confirmation-card-wrapper">
        <h2>No recent booking</h2>
        <button className="btn-back-link" onClick={() => navigate('sessions-view')}>Go to My Sessions</button>
      </div>
    );
  }

  return (
    <div className="content-wrapper confirmation-card-wrapper">
      <div className="conf-card">
        
        <div className="conf-success-icon">
          <Check size={36} />
        </div>

        <h1 className="conf-title">Session Booked Successfully!</h1>
        <p className="conf-subtitle">We've sent a calendar invite and video room link to <strong>{currentUser?.email || userProfile?.email || 'your registered email'}</strong>.</p>

        <div className="conf-session-info-card">
          <img src={expert.avatar || '/brand/android-chrome-192x192.png'} alt={expert.name || 'Mentor'} className="conf-avatar" />
          <div className="conf-meta">
            <h3>{expert.name || 'Mentor'} • <span className="text-blue-600 font-semibold">{sessionType}</span></h3>
            <p>{expert.role || 'Tech Leader'} at {expert.company || 'Tech Company'}</p>
            <div className="conf-timing-badge">
              <Calendar size={13} /> {date} • {timeSlot}
            </div>
          </div>
          <div className="conf-price-badge">₹{paidAmount} Paid</div>
        </div>

        {/* Post-Booking CV Prep Card */}
        <div className="conf-cv-prep-card">
          <div className="conf-cv-prep-left">
            <div className="conf-cv-icon-box">
              <FileText size={20} className={isRecentlySynced ? "text-emerald-600" : "text-amber-600"} />
            </div>
            <div>
              <div className="conf-cv-title-row">
                <strong className="conf-cv-title">1:1 Session Profile: Attached Resume</strong>
                {isRecentlySynced ? (
                  <span className="conf-cv-synced-badge">
                    <CheckCircle2 size={12} /> Latest CV Synced
                  </span>
                ) : currentCv ? (
                  <span className="conf-cv-old-badge">
                    ⚠️ Last updated ~1 yr ago
                  </span>
                ) : (
                  <span className="conf-cv-old-badge">
                    No Resume Attached
                  </span>
                )}
              </div>
              <p className="conf-cv-desc">
                {isRecentlySynced 
                  ? `Your updated resume (${currentCv}) is attached to your session profile for ${expert.name}.`
                  : currentCv
                    ? `Currently attached: "${currentCv}". Want ${expert.name} to see your newest projects before the live call?`
                    : `No resume attached yet. Upload your latest CV so ${expert.name} can review your tech background before the call.`}
              </p>
            </div>
          </div>

          <button 
            type="button"
            className={isRecentlySynced ? "btn-outline-dark btn-sm-prep" : "btn-shine-gold btn-sm-prep"}
            onClick={() => setIsCvSyncModalOpen(true)}
          >
            <UploadCloud size={14} />
            <span>{isRecentlySynced ? 'Update Resume' : 'Upload Latest CV (1-Click)'}</span>
          </button>
        </div>

        <div className="conf-checklist-box">
          <h4><Sparkles size={16} /> What happens next?</h4>
          <ol>
            <li>Your candidate profile and Trajectory Gap Report have been automatically pre-loaded for {expert.name || 'your mentor'}.</li>
            <li>You will receive a WhatsApp reminder 15 minutes before the call starts.</li>
            <li>Post-session, your mentor will review and approve your <strong>{BRAND.name} Verified Peer Badge</strong>.</li>
          </ol>
        </div>

        <div className="conf-actions-row">
          <button className="btn-outline-dark" onClick={() => alert('Calendar (.ics) invite downloaded!')}>
            <CalendarPlus size={16} /> Add to Calendar
          </button>
          <button className="btn-shine-gold" onClick={() => navigate('sessions-view')}>
            <Video size={16} /> Go to My Sessions <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};
