import React, { useMemo, useState, useEffect } from 'react';
import { 
  X, Video, Clock, ArrowRight, Lock, 
  CheckCircle2, Calendar, RefreshCw, 
  TrendingUp, FileText, Sparkles, Compass, Check,
  QrCode, Smartphone, CreditCard, Building, ShieldCheck, Loader2, Shield,
  Upload, Zap, AlertCircle, Briefcase
} from 'lucide-react';
import { Expert } from '../../types';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { formatBookingDate } from '../../utils/bookingDates';
import { BRAND } from '../../config/brand';
import { isResumeRecent } from '../../utils/resume';
import { isSelfMentor } from '../../utils/profile';

// Used only when a mentor has no saved availability
const DEFAULT_TIME_SLOTS = ['10:00 AM - 11:00 AM', '02:00 PM - 03:00 PM', '06:30 PM - 07:30 PM', '08:00 PM - 09:00 PM'];

// '06:30 PM - 07:30 PM' -> { time, label: '06:30 PM', period: 'Evening', startHour: 18, startMin: 30 }
const parseSlot = (time: string) => {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let startHour = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') startHour += 12;
  const startMin = Number(m[2]);
  const period = startHour < 12 ? 'Morning' : startHour < 17 ? 'Afternoon' : startHour < 21 ? 'Evening' : 'Late Eve';
  return { time, label: `${m[1]}:${m[2]} ${m[3].toUpperCase()}`, period, startHour, startMin };
};

interface BookingModalProps {
  expert?: Expert;
  isOpen: boolean;
  selectedDate?: string;
  selectedTime?: string;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  onSelectTime: (timeStr: string) => void;
  onProceedToPay: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  expert: propExpert,
  isOpen,
  selectedDate,
  selectedTime,
  onClose,
  onSelectDate,
  onSelectTime,
}) => {
  const { 
    currentUser,
    userProfile, 
    bookingDraft, 
    setBookingDraft, 
    selectedExpert,
    setIsBookingModalOpen,
    bookSession,
    navigate,
    showToast,
    uploadResume
  } = useApp();

  // Next 14 days starting from today; filtered below to the mentor's available weekdays
  const next7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const fullDateStr = formatBookingDate(d);
      days.push({
        dateObj: d,
        fullDateStr,
        dayOfWeek,
        month,
        dayNum,
        isToday: i === 0,
        isTomorrow: i === 1,
        tag: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayOfWeek
      });
    }
    return days;
  }, []);

  // The mentor being booked (an empty placeholder has no id)
  const pickExpert = (e?: Expert) => (e && e.id ? e : undefined);
  const expert: Expert = pickExpert(propExpert) || pickExpert(bookingDraft?.expert) || selectedExpert;

  const expertName = expert?.name || 'Mentor';
  const expertAvatar = expert?.avatar || '/brand/android-chrome-192x192.png';
  const expertRole = expert?.role || 'Tech Leader';
  const expertCompany = expert?.company || 'Top Tech Firm';
  const expertPrice = expert?.price || 1399;

  // Booking calendar is driven by the mentor's saved availability, minus slots already booked
  const availableDays = expert?.availability?.days?.length ? expert.availability.days : null;
  const mentorSlots = expert?.availability?.timeSlots?.length ? expert.availability.timeSlots : DEFAULT_TIME_SLOTS;

  const [bookedSlots, setBookedSlots] = useState<Array<{ date: string; timeSlot: string }>>([]);
  const refreshBookedSlots = () => {
    if (!expert?.id) return;
    peerpathApi.getBookedSlots(expert.id).then(setBookedSlots).catch(err => console.warn('[API getBookedSlots]:', err));
  };
  useEffect(() => {
    if (isOpen) refreshBookedSlots();
  }, [isOpen, expert?.id]);

  const bookableDays = next7Days.filter(d => !availableDays || availableDays.includes(d.dayOfWeek)).slice(0, 7);

  // Ignore a stale/invalid draft date (e.g. from an earlier visit) and fall back to the first bookable day
  const activeDateStr = bookableDays.some(d => d.fullDateStr === selectedDate) ? (selectedDate as string) : (bookableDays[0]?.fullDateStr || '');
  const activeDayObj = bookableDays.find(d => d.fullDateStr === activeDateStr);
  const isSelectedDateToday = activeDayObj ? activeDayObj.isToday : false;

  const availableSlots = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return mentorSlots
      .map(parseSlot)
      .filter((slot): slot is NonNullable<ReturnType<typeof parseSlot>> => slot !== null)
      .filter(slot => !bookedSlots.some(b => b.date === activeDateStr && b.timeSlot === slot.time))
      .filter(slot => !isSelectedDateToday || slot.startHour * 60 + slot.startMin > nowMinutes);
  }, [mentorSlots.join('|'), bookedSlots, activeDateStr, isSelectedDateToday]);

  const activeTime = availableSlots.some(slot => slot.time === selectedTime) ? (selectedTime as string) : (availableSlots[0]?.time || '');

  // 4 Harmonized 1:1 Services
  const sessionOfferings = useMemo(() => {
    const base = expertPrice || 1399;
    const getPrice = (id: string, fallback: number) => {
      const found = expert?.serviceOfferings?.find(s => s.id === id);
      return found && found.price !== undefined ? found.price : fallback;
    };
    const getDur = (id: string, fallback: string) => {
      const found = expert?.serviceOfferings?.find(s => s.id === id);
      return found && found.duration ? found.duration : fallback;
    };

    return [
      {
        id: 'career-guidance',
        title: 'Career Guidance & Strategy',
        icon: Compass,
        duration: getDur('career-guidance', '45 Mins'),
        price: getPrice('career-guidance', base),
        iconColor: '#7C3AED',
        iconBg: '#F5F3FF'
      },
      {
        id: 'interview-prep',
        title: '1:1 Mock Interview & Scorecard',
        icon: Video,
        duration: getDur('interview-prep', '60 Mins'),
        price: getPrice('interview-prep', base),
        iconColor: '#059669',
        iconBg: '#ECFDF5'
      },
      {
        id: 'resume-review',
        title: 'CV Audit & ATS Teardown',
        icon: FileText,
        duration: getDur('resume-review', '30 Mins'),
        price: getPrice('resume-review', Math.max(499, Math.round((base * 0.7) / 50) * 50 - 1)),
        iconColor: '#D97706',
        iconBg: '#FEF3C7'
      },
      {
        id: 'salary-negotiation',
        title: 'Salary & Offer Negotiation',
        icon: TrendingUp,
        duration: getDur('salary-negotiation', '30 Mins'),
        price: getPrice('salary-negotiation', Math.max(699, Math.round((base * 0.85) / 50) * 50 - 1)),
        iconColor: '#2563EB',
        iconBg: '#EFF6FF'
      }
    ];
  }, [expertPrice, expert?.serviceOfferings]);

  const [selectedSessionId, setSelectedSessionId] = useState<string>('career-guidance');

  // Keep selected session in sync with booking draft when opened with pre-selected service
  useEffect(() => {
    if (bookingDraft?.sessionType) {
      const draftTitle = bookingDraft.sessionType.toLowerCase();
      const matched = sessionOfferings.find(s => 
        s.title.toLowerCase() === draftTitle || 
        s.id === bookingDraft.sessionType ||
        (draftTitle.includes('career') && s.id === 'career-guidance') ||
        (draftTitle.includes('mock') || draftTitle.includes('interview')) && s.id === 'interview-prep' ||
        (draftTitle.includes('cv') || draftTitle.includes('resume')) && s.id === 'resume-review' ||
        (draftTitle.includes('salary') || draftTitle.includes('negotiation')) && s.id === 'salary-negotiation'
      );
      if (matched) {
        setSelectedSessionId(matched.id);
      }
    }
  }, [bookingDraft?.sessionType, sessionOfferings]);

  const activeSession = sessionOfferings.find(s => s.id === selectedSessionId) || sessionOfferings[0];
  const payableAmount = activeSession.price;

  // Razorpay Gateway Modal simulation state
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState<boolean>(false);
  const [rzpMethod, setRzpMethod] = useState<'qr' | 'upi' | 'card' | 'netbanking'>('qr');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploadingCv, setIsUploadingCv] = useState<boolean>(false);

  const currentCvName = userProfile?.resumeFileName || bookingDraft?.attachedCvName || '';

  // Uploads the resume so the mentor can download it before the session
  const handleCvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingCv(true);
    const result = await uploadResume(file);
    setIsUploadingCv(false);
    if (result) {
      showToast('📄 Resume Attached', `${expertName} can download it before the session.`, 'success');
    }
  };

  const isSelf = isSelfMentor(expert, currentUser);

  // 1-Click direct opening of Razorpay Gateway (No intermediate friction screens)
  const handleOpenRazorpay = () => {
    if (isSelf) {
      showToast('Self-booking not allowed', 'You cannot book a mentorship session with yourself.', 'info');
      return;
    }
    if (!activeDateStr || !activeTime) {
      showToast('Pick a slot', 'Please choose an available date and time slot.', 'info');
      return;
    }
    const slotTime = activeTime;
    if (setBookingDraft) {
      setBookingDraft({
        expert,
        date: activeDateStr,
        timeSlot: slotTime,
        attachedCvName: currentCvName,
        sessionType: activeSession.title,
        amount: payableAmount,
        duration: activeSession.duration
      });
    }
    setIsRazorpayModalOpen(true);
  };

  const handleCompletePayment = async () => {
    if (isSelf) {
      showToast('Self-booking not allowed', 'You cannot book a mentorship session with yourself.', 'info');
      return;
    }
    const slotTime = activeTime;
    setIsProcessing(true);
    const booked = await bookSession(expert, activeDateStr, slotTime, activeSession.id);
    setIsProcessing(false);
    setIsRazorpayModalOpen(false);
    if (!booked) {
      // e.g. slot taken meanwhile: keep the modal open with fresh availability so they can pick again
      refreshBookedSlots();
      return;
    }
    onClose();
    setIsBookingModalOpen(false);
    if (setBookingDraft) {
      setBookingDraft({
        expert,
        date: booked.date,
        timeSlot: booked.timeSlot,
        attachedCvName: currentCvName,
        sessionType: booked.sessionType || activeSession.title,
        amount: booked.amountPaid ?? payableAmount,
        duration: activeSession.duration
      });
    }
    navigate('confirmed-view');
  };

  if (!isOpen || !expert?.id) return null;

  if (isSelf) {
    return (
      <div className="app-modal-backdrop open" onClick={onClose}>
        <div className="app-modal-card bfm-modal-card" style={{ maxWidth: '440px', padding: '32px 24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            This is Your Mentor Profile
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
            You cannot book a mentorship session with yourself. You can manage your availability, pricing, and service offerings in the Mentor Studio.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-pm-profile-view"
              onClick={() => {
                onClose();
                setIsBookingModalOpen(false);
              }}
              style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '8px' }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn-shine-gold"
              onClick={() => {
                onClose();
                setIsBookingModalOpen(false);
                navigate('mentor-dashboard-view', '/mentor');
              }}
              style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Briefcase size={14} />
              <span>Go to Mentor Studio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-modal-backdrop open" onClick={onClose}>
      <div className="app-modal-card bfm-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Top Header */}
        <div className="bfm-header">
          <div className="bfm-mentor-identity">
            <div className="bfm-avatar-wrap">
              <img src={expertAvatar} alt={expertName} className="bfm-avatar" />
              <span className="bfm-online-dot"></span>
            </div>
            <div className="bfm-mentor-meta">
              <div className="bfm-name-row">
                <span className="bfm-sub-label">Booking 1:1 Session with</span>
                <div className="bfm-name-flex">
                  <h3 className="bfm-mentor-name">{expertName}</h3>
                  <span className="bfm-verified-pill" title="Verified Practitioner">
                    <CheckCircle2 size={13} />
                  </span>
                </div>
              </div>
              <p className="bfm-role-text">{expertRole} • {expertCompany}</p>
            </div>
          </div>

          <button className="bfm-close-btn" onClick={onClose} aria-label="Close booking modal">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Middle Container: Fits on all screen heights & Windows displays */}
        <div className="bfm-scroll-content">
          
          {/* Enhanced Interactive Session Goal Selector */}
          <div className="bfm-services-selector">
            <div className="bfm-services-header-row">
              <span className="bfm-services-label">
                <Sparkles size={12} className="text-amber-500" />
                <span>Select Session Goal</span>
              </span>
              <span className="bfm-services-meta-badge">
                <Clock size={11} className="text-indigo-600" />
                <span>30 Mins Live Mentorship</span>
              </span>
            </div>
            <div className="bfm-services-chips">
              {sessionOfferings.map((session) => {
                const isSelected = selectedSessionId === session.id;
                const IconComp = session.icon;
                return (
                  <button
                    type="button"
                    key={session.id}
                    className={`bfm-service-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="bfm-sc-icon-wrap" style={{ background: session.iconBg, color: session.iconColor }}>
                      <IconComp size={15} />
                    </div>
                    <div className="bfm-sc-info">
                      <span className="bfm-sc-name">{session.title}</span>
                      <span className="bfm-sc-price">₹{session.price}</span>
                    </div>
                    {isSelected && (
                      <div className="bfm-sc-check-badge">
                        <Check size={9} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 1: Select Date */}
          <div className="bfm-section">
            <div className="bfm-section-header">
              <div className="bfm-sec-title">
                <Calendar size={13} className="text-blue-600" />
                <span>1. Select Date</span>
              </div>
              <span className="bfm-active-date-badge">{activeDateStr}</span>
            </div>

            <div className="bfm-dates-strip">
              {bookableDays.map((d) => {
                const isSelected = activeDateStr === d.fullDateStr;
                return (
                  <button
                    type="button"
                    key={d.fullDateStr}
                    className={`bfm-date-card ${isSelected ? 'active' : ''} ${d.isToday ? 'today' : ''}`}
                    onClick={() => onSelectDate(d.fullDateStr)}
                  >
                    <span className="bfm-d-tag">{d.tag}</span>
                    <strong className="bfm-d-num">{d.dayNum}</strong>
                    <span className="bfm-d-month">{d.month}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Time Slot */}
          <div className="bfm-section">
            <div className="bfm-section-header">
              <div className="bfm-sec-title">
                <Clock size={13} className="text-indigo-600" />
                <span>2. Choose Time Slot</span>
              </div>
              <span className="bfm-duration-pill">30 Mins Live Video</span>
            </div>

            {availableSlots.length > 0 ? (
              <div className="bfm-slots-grid">
                {availableSlots.map((slot) => {
                  const isSelected = activeTime === slot.time;
                  return (
                    <button
                      type="button"
                      key={slot.time}
                      className={`bfm-slot-card ${isSelected ? 'active' : ''}`}
                      onClick={() => onSelectTime(slot.time)}
                    >
                      <span className="bfm-slot-time">{slot.label}</span>
                      <span className="bfm-slot-period">{slot.period}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bk-no-slots-box">
                <Clock size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <strong>No open slots on this date.</strong>
                  <p>Please select another date from the calendar.</p>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Attached Candidate CV / Mentor Dossier */}
          {(() => {
            const hasCv = Boolean(currentCvName);
            // "Ready" only if the resume was actually uploaded in the last 30 days
            const isSynced = hasCv && isResumeRecent(userProfile);
            const mentorFirstName = expertName.split(' ')[0];

            return (
              <div className={`bfm-cv-section ${isSynced ? 'synced' : ''}`}>
                <div className="bfm-section-header">
                  <div className="bfm-sec-title">
                    <FileText size={13} className={isSynced ? "text-emerald-600" : "text-amber-600"} />
                    <span>3. Pre-Call Dossier for {mentorFirstName}</span>
                  </div>
                  {isSynced ? (
                    <span className="bfm-cv-badge-ready">
                      <CheckCircle2 size={11} /> 100% Ready for {mentorFirstName}
                    </span>
                  ) : hasCv ? (
                    <span className="bfm-cv-badge-warn">
                      <AlertCircle size={11} /> Outdated CV (~1 yr old)
                    </span>
                  ) : (
                    <span className="bfm-cv-badge-warn">
                      <AlertCircle size={11} /> Optional • No CV Attached
                    </span>
                  )}
                </div>

                <div className="bfm-cv-card">
                  <div className="bfm-cv-left">
                    <div className={`bfm-cv-icon-box ${isSynced ? 'ready' : ''}`}>
                      {isSynced ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <FileText size={16} className={hasCv ? "text-amber-600" : "text-slate-400"} />
                      )}
                    </div>
                    <div className="bfm-cv-details">
                      <div className="bfm-cv-name-row">
                        <span className="bfm-cv-name">{hasCv ? currentCvName : 'No CV attached yet'}</span>
                      </div>
                      {isSynced ? (
                        <div className="bfm-cv-subtext ready">
                          ✨ Synced • {mentorFirstName} will review your updated projects before the call
                        </div>
                      ) : hasCv ? (
                        <div className="bfm-cv-subtext warn">
                          ⚠️ Mentor reviews this before call • Upload latest CV for tailored interview prep & referrals
                        </div>
                      ) : (
                        <div className="bfm-cv-subtext" style={{ color: '#64748b' }}>
                          Upload your latest CV so {mentorFirstName} can review your experience before the live session
                        </div>
                      )}
                    </div>
                  </div>

                  <label className={`btn-bfm-cv-upload ${isSynced ? 'synced' : ''} ${isUploadingCv ? 'loading' : ''}`}>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={handleCvFileChange}
                      disabled={isUploadingCv}
                      style={{ display: 'none' }}
                    />
                    {isUploadingCv ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : isSynced ? (
                      <>
                        <Upload size={12} />
                        <span>Replace CV</span>
                      </>
                    ) : (
                      <>
                        <Zap size={12} className="fill-amber-400 text-amber-400" />
                        <span>Upload Latest CV</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Modal Pinned Bottom Bar: Always 100% Visible on Windows, Mac & Mobile */}
        <div className="bfm-footer-pinned">
          <div className="bfm-footer">
            <div className="bfm-footer-price-block">
              <div className="bfm-price-line">
                <span className="bfm-p-curr">₹</span>
                <span className="bfm-p-amount">{payableAmount}</span>
                <span className="bfm-p-session">/ session</span>
              </div>
              <div className="bfm-trust-line">
                <span className="bfm-trust-item">
                  <RefreshCw size={11} className="text-emerald-600" /> Free Reschedule Anytime
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="btn-shine-gold-lg bfm-pay-btn" 
              onClick={handleOpenRazorpay}
            >
              <Lock size={15} />
              <span>Pay ₹{payableAmount} & Confirm</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="bfm-secure-bar">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>Instant Confirmation • Powered by <strong>Razorpay Secure Gateway</strong></span>
          </div>
        </div>

      </div>

      {/* Realistic Interactive Razorpay Modal Popup */}
      {isRazorpayModalOpen && (
        <div className="rzp-modal-backdrop" onClick={() => !isProcessing && setIsRazorpayModalOpen(false)}>
          <div className="rzp-modal-surface" onClick={e => e.stopPropagation()}>
            
            {/* Razorpay Top Header */}
            <div className="rzp-m-header">
              <div className="rzp-m-brand">
                <div className="rzp-m-logo">
                  <strong>Shine</strong><span>.com</span>
                </div>
                <div className="rzp-m-sub">{BRAND.name} Mentorship</div>
              </div>
              <div className="rzp-m-price-box">
                <span className="rzp-m-price-lbl">Payable Amount</span>
                <span className="rzp-m-price-val">₹{payableAmount}</span>
              </div>
              <button 
                type="button" 
                className="rzp-m-close"
                onClick={() => !isProcessing && setIsRazorpayModalOpen(false)}
                disabled={isProcessing}
              >
                <X size={18} />
              </button>
            </div>

            {/* Razorpay Body Grid */}
            <div className="rzp-m-body">
              
              {/* Left Method Tabs */}
              <div className="rzp-m-tabs">
                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'qr' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('qr')}
                >
                  <QrCode size={16} />
                  <span>QR Code</span>
                  <span className="rzp-fast-tag">FAST</span>
                </button>

                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'upi' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('upi')}
                >
                  <Smartphone size={16} />
                  <span>UPI / QR</span>
                </button>

                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('card')}
                >
                  <CreditCard size={16} />
                  <span>Card</span>
                </button>

                <button 
                  type="button" 
                  className={`rzp-tab-btn ${rzpMethod === 'netbanking' ? 'active' : ''}`}
                  onClick={() => setRzpMethod('netbanking')}
                >
                  <Building size={16} />
                  <span>Netbanking</span>
                </button>
              </div>

              {/* Right Method Panel */}
              <div className="rzp-m-content">
                {rzpMethod === 'qr' && (
                  <div className="rzp-qr-pane">
                    <div className="rzp-qr-box">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=shine.peerpath@razorpay&pn=${encodeURIComponent(BRAND.name)}&am=${payableAmount}&cu=INR`} 
                        alt="Scan UPI QR Code" 
                        className="rzp-qr-img"
                      />
                    </div>
                    <div className="rzp-qr-text">
                      <strong>Scan and pay with any UPI App</strong>
                      <p>Google Pay • PhonePe • Paytm • CRED • BHIM</p>
                    </div>
                  </div>
                )}

                {rzpMethod === 'upi' && (
                  <div className="rzp-upi-pane">
                    <div className="rzp-upi-fast-apps">
                      <div className="rzp-app-item">
                        <span className="rzp-app-dot gpay"></span> Google Pay
                      </div>
                      <div className="rzp-app-item">
                        <span className="rzp-app-dot phonepe"></span> PhonePe
                      </div>
                      <div className="rzp-app-item">
                        <span className="rzp-app-dot paytm"></span> Paytm
                      </div>
                    </div>
                    <div className="rzp-upi-custom-input">
                      <input type="text" placeholder="Enter any UPI ID (e.g. yourname@upi)" />
                    </div>
                  </div>
                )}

                {rzpMethod === 'card' && (
                  <div className="rzp-card-pane">
                    <div className="rzp-card-input-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="4111 2222 3333 4444" defaultValue="4532 8901 2345 6789" />
                    </div>
                    <div className="rzp-card-dual-grid">
                      <div>
                        <label>Expiry (MM/YY)</label>
                        <input type="text" placeholder="12/28" defaultValue="10/28" />
                      </div>
                      <div>
                        <label>CVV</label>
                        <input type="password" placeholder="•••" defaultValue="890" maxLength={4} />
                      </div>
                    </div>
                  </div>
                )}

                {rzpMethod === 'netbanking' && (
                  <div className="rzp-nb-pane">
                    <div className="rzp-nb-grid">
                      <span className="rzp-nb-pill active">HDFC Bank</span>
                      <span className="rzp-nb-pill">ICICI Bank</span>
                      <span className="rzp-nb-pill">SBI</span>
                      <span className="rzp-nb-pill">Axis Bank</span>
                      <span className="rzp-nb-pill">Kotak</span>
                      <span className="rzp-nb-pill">All Other Banks</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Razorpay Modal Footer */}
            <div className="rzp-m-footer">
              <div className="rzp-m-sec-brand">
                <ShieldCheck size={14} className="text-blue-600" />
                <span>Secured by <strong>Razorpay</strong></span>
              </div>
              
              <button 
                type="button" 
                className="btn-rzp-submit" 
                onClick={handleCompletePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Pay ₹{payableAmount}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default BookingModal;
