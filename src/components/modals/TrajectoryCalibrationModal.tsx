import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ArrowRight, ChevronDown, Check, Briefcase, 
  Building2, Target, IndianRupee, Brain, Cpu, 
  ShieldCheck, Code2, Sparkles, LucideIcon 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TrackOption {
  key: string;
  title: string;
  domain: string;
  subtitle: string;
  icon: LucideIcon;
  badgeColor: string;
}

const TRACK_OPTIONS: TrackOption[] = [
  {
    key: 'Full-stack',
    title: 'Full-Stack Architecture',
    domain: 'Full-Stack',
    subtitle: 'Frontend, backend, cloud & distributed systems',
    icon: Code2,
    badgeColor: '#ECFDF5'
  },
  {
    key: 'AI/ML',
    title: 'AI / Machine Learning',
    domain: 'AI/ML',
    subtitle: 'Generative AI, LLMs, computer vision & infra',
    icon: Brain,
    badgeColor: '#FAF5FF'
  },
  {
    key: 'Semi-conductor',
    title: 'Semiconductor & VLSI',
    domain: 'Semiconductor',
    subtitle: 'Silicon design, RTL verification & FPGA architecture',
    icon: Cpu,
    badgeColor: '#FEF3C7'
  },
  {
    key: 'Cyber-security',
    title: 'Cybersecurity & AppSec',
    domain: 'Cybersecurity',
    subtitle: 'Cloud security, threat defense & DevSecOps',
    icon: ShieldCheck,
    badgeColor: '#EFF6FF'
  },
  {
    key: 'Others',
    title: 'Custom Target Role',
    domain: 'Others',
    subtitle: 'Product management, DevOps, engineering leadership & more',
    icon: Sparkles,
    badgeColor: '#FFF1F2'
  }
];

export const TrajectoryCalibrationModal: React.FC = () => {
  const {
    isCalibrationModalOpen,
    setIsCalibrationModalOpen,
    userProfile,
    calibrateCandidateProfile,
    showToast,
    currentUser
  } = useApp();

  const [currentRole, setCurrentRole] = useState<string>('');
  const [currentCompany, setCurrentCompany] = useState<string>('');
  const [dreamCompany, setDreamCompany] = useState<string>('');
  const [targetTrack, setTargetTrack] = useState<string>('Full-stack');
  const [customTargetRole, setCustomTargetRole] = useState<string>('');
  const [targetCtcLpa, setTargetCtcLpa] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close custom dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Pre-fill modal with user's saved profile values when opening
  useEffect(() => {
    if (isCalibrationModalOpen) {
      const initialRole = userProfile?.designation || userProfile?.headline?.split('@')[0]?.split('|')[0]?.trim() || userProfile?.pastCompanyRole || currentUser?.headline || '';
      const initialCompany = userProfile?.currentCompany || userProfile?.pastCompany || currentUser?.company || '';
      setCurrentRole(initialRole);
      setCurrentCompany(initialCompany);
      setDreamCompany(userProfile?.dreamCompany || userProfile?.targetCompany || '');

      const existingRole = (userProfile?.targetRole || '').trim();
      const existingDomain = (userProfile?.domain || '').trim().toLowerCase();

      const matchedOption = TRACK_OPTIONS.find(
        opt => opt.title.toLowerCase() === existingRole.toLowerCase() ||
               opt.domain.toLowerCase() === existingDomain ||
               (existingRole && existingRole.toLowerCase().includes(opt.key.toLowerCase()))
      );

      if (matchedOption) {
        setTargetTrack(matchedOption.key);
        setCustomTargetRole('');
      } else if (existingRole) {
        setTargetTrack('Others');
        setCustomTargetRole(existingRole);
      } else {
        setTargetTrack('Full-stack');
        setCustomTargetRole('');
      }

      if (userProfile?.targetCtc) {
        const match = userProfile.targetCtc.match(/[\d.]+/);
        setTargetCtcLpa(match ? match[0] : '');
      } else {
        setTargetCtcLpa('');
      }
    }
  }, [isCalibrationModalOpen, userProfile, currentUser]);

  if (!isCalibrationModalOpen) return null;

  const notWorking = Boolean(userProfile?.currentlyNotWorking);
  const activeTrackOption = TRACK_OPTIONS.find(t => t.key === targetTrack) || TRACK_OPTIONS[0];
  const ActiveIcon = activeTrackOption.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRole = targetTrack === 'Others' ? customTargetRole.trim() : activeTrackOption.title;
    if (!targetRole) return showToast('Target role needed', 'Please enter the role you want to move into.', 'warning');
    if (!dreamCompany.trim()) return showToast('Target company needed', 'Please enter the company you want to join.', 'warning');
    const lpa = targetCtcLpa.trim() === '' ? null : Number(targetCtcLpa);
    if (lpa !== null && (Number.isNaN(lpa) || lpa <= 0 || lpa > 1000)) {
      return showToast('Check target salary', 'Enter it in lakhs per annum, e.g. 25.', 'warning');
    }
    setIsSaving(true);
    const success = await calibrateCandidateProfile({
      currentRole: notWorking ? '' : currentRole,
      currentCompany: notWorking ? '' : currentCompany,
      dreamCompany: dreamCompany.trim(),
      targetRole,
      domain: targetTrack === 'Others' ? undefined : activeTrackOption.domain,
      targetCtc: lpa !== null ? `${lpa} LPA` : undefined
    });
    if (success) {
      try {
        sessionStorage.setItem(`shine_goal_prompted_${currentUser?.id || 'guest'}`, '1');
      } catch {}
    }
    setIsSaving(false);
  };

  return (
    <div className="tcm-modal-backdrop" onClick={() => setIsCalibrationModalOpen(false)}>
      <div 
        className="tcm-modal-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="tcm-header">
          <button
            onClick={() => setIsCalibrationModalOpen(false)}
            className="tcm-close-btn"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
          <div className="tcm-tag-row">
            <span className="tcm-tag-badge">
              <Target size={11} /> Trajectory Goal
            </span>
          </div>
          <h2 className="tcm-title">
            Set Your Career Target
          </h2>
          <p className="tcm-desc">
            Match with verified mentors who made this exact move.
          </p>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="tcm-form">

          {/* Section 1: Current Baseline (Pre-filled from Profile / Resume, Editable) */}
          {!notWorking && (
            <div className="tcm-grid-row">
              {/* Current Role */}
              <div className="tcm-field-compact">
                <label className="tcm-group-label">
                  <Briefcase size={13} className="text-slate-400" />
                  <span>Current Role</span>
                </label>
                <input
                  type="text"
                  value={currentRole}
                  onChange={e => setCurrentRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Dev"
                  className="tcm-input-compact"
                  required={!notWorking}
                />
              </div>

              {/* Current Company */}
              <div className="tcm-field-compact">
                <label className="tcm-group-label">
                  <Building2 size={13} className="text-slate-400" />
                  <span>Current Company</span>
                </label>
                <input
                  type="text"
                  value={currentCompany}
                  onChange={e => setCurrentCompany(e.target.value)}
                  placeholder="e.g. TCS / Infosys / Startup"
                  className="tcm-input-compact"
                  required={!notWorking}
                />
              </div>
            </div>
          )}

          {/* Section 2: Destination Target Role / Domain (Custom Premium Dropdown) */}
          <div className="tcm-field-compact" ref={dropdownRef}>
            <label className="tcm-group-label">
              <Target size={13} className="text-purple-600" />
              <span>Target Role / Domain *</span>
            </label>

            <div className="tcm-custom-select-wrap">
              <button
                type="button"
                className={`tcm-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                onClick={() => setIsDropdownOpen(prev => !prev)}
                aria-expanded={isDropdownOpen}
              >
                <div className="tcm-st-left">
                  <div className="tcm-st-icon" style={{ background: activeTrackOption.badgeColor }}>
                    <ActiveIcon size={15} className="text-purple-700" />
                  </div>
                  <span className="tcm-st-title">{activeTrackOption.title}</span>
                </div>
                <ChevronDown size={16} className={`tcm-st-chevron ${isDropdownOpen ? 'rotated' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="tcm-dropdown-popover">
                  <div className="tcm-dropdown-options-list">
                    {TRACK_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = targetTrack === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className={`tcm-option-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setTargetTrack(opt.key);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="tcm-opt-icon" style={{ background: opt.badgeColor }}>
                            <Icon size={16} className={isSelected ? 'text-purple-700' : 'text-slate-600'} />
                          </div>
                          <div className="tcm-opt-text">
                            <div className="tcm-opt-title-line">
                              <span className="tcm-opt-title">{opt.title}</span>
                              {isSelected && <Check size={14} className="text-purple-600" />}
                            </div>
                            <span className="tcm-opt-sub">{opt.subtitle}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Role Input when "Others" is selected */}
            {targetTrack === 'Others' && (
              <div className="mt-2 animate-fade-in">
                <input
                  type="text"
                  value={customTargetRole}
                  onChange={e => setCustomTargetRole(e.target.value)}
                  placeholder="Specify dream role (e.g. Lead Product Manager, Cloud DevOps)"
                  className="tcm-input-compact"
                  autoFocus
                  required
                />
              </div>
            )}
          </div>

          {/* Section 3: Target Company */}
          <div className="tcm-field-compact">
            <label className="tcm-group-label">
              <Building2 size={13} className="text-blue-500" />
              <span>Target Company *</span>
            </label>
            <input
              type="text"
              value={dreamCompany}
              onChange={e => setDreamCompany(e.target.value)}
              placeholder="e.g. Swiggy, Flipkart, Google, Razorpay"
              className="tcm-input-compact"
              required
            />
          </div>

          {/* Section 4: Target Salary */}
          <div className="tcm-field-compact">
            <label className="tcm-group-label">
              <IndianRupee size={13} className="text-emerald-600" />
              <span>Target Salary (optional)</span>
            </label>
            <div className="tcm-salary-input-wrap">
              <input
                type="number"
                min={0}
                step="0.5"
                value={targetCtcLpa}
                onChange={e => setTargetCtcLpa(e.target.value)}
                placeholder="e.g. 25"
                className="tcm-input-compact tcm-salary-input"
              />
              <span className="tcm-salary-suffix">LPA</span>
            </div>
          </div>

          {/* Hero Action CTA */}
          <div className="tcm-actions-block" style={{ marginTop: '4px' }}>
            <button
              type="submit"
              className="btn-tcm-hero-submit"
              disabled={isSaving}
            >
              <span>{isSaving ? 'Saving Goal…' : 'Save Goal & See Matched Mentors'}</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
