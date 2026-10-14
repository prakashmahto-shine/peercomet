import React, { useState } from 'react';
import { X, ArrowRight, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BRAND } from '../../config/brand';

const TRACKS: Record<string, { title: string; domain: string }> = {
  'AI/ML': { title: 'AI/ML (Generative AI & LLMs)', domain: 'AI/ML' },
  'Semi-conductor': { title: 'Semi-conductor (VLSI & Silicon)', domain: 'Semiconductor' },
  'Cyber-security': { title: 'Cyber-security (Cloud & AppSec)', domain: 'Cybersecurity' },
  'Full-stack': { title: 'Full-stack Architecture', domain: 'Full-Stack' },
};

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

  // Pre-fill modal with user's saved profile values when opening (both for initial calibration and "Edit Goal")
  React.useEffect(() => {
    if (isCalibrationModalOpen) {
      setCurrentRole(userProfile?.designation || userProfile?.pastCompanyRole || '');
      setCurrentCompany(userProfile?.currentCompany || userProfile?.pastCompany || '');
      setDreamCompany(userProfile?.dreamCompany || userProfile?.targetCompany || '');

      const existingRole = (userProfile?.targetRole || '').trim();
      const existingDomain = (userProfile?.domain || '').trim().toLowerCase();

      const matchedKey = Object.keys(TRACKS).find(
        k => TRACKS[k].title.toLowerCase() === existingRole.toLowerCase() ||
             TRACKS[k].domain.toLowerCase() === existingDomain ||
             (existingRole && existingRole.toLowerCase().includes(k.toLowerCase()))
      );

      if (matchedKey) {
        setTargetTrack(matchedKey);
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
  }, [isCalibrationModalOpen, userProfile]);

  if (!isCalibrationModalOpen) return null;

  const notWorking = Boolean(userProfile?.currentlyNotWorking);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRole = targetTrack === 'Others' ? customTargetRole.trim() : TRACKS[targetTrack].title;
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
      domain: targetTrack === 'Others' ? undefined : TRACKS[targetTrack].domain,
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
          <h2 className="tcm-title">
            Your Career Goal
          </h2>
          <p className="tcm-desc">
            Tell us where you want to go next. We'll show mentors who made a similar move.
            You can change this any time with "Edit Goal".
          </p>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="tcm-form">

          {/* Section 1: Target Track Dropdown */}
          <div className="tcm-field-compact">
            <label className="tcm-group-label">
              <span>🎯 Target Role / Domain *</span>
            </label>
            <div className="tcm-select-wrapper">
              <select
                value={targetTrack}
                onChange={e => setTargetTrack(e.target.value)}
                className="tcm-select-compact"
              >
                <option value="AI/ML">🤖 AI / ML (Generative AI &amp; LLM Systems)</option>
                <option value="Semi-conductor">⚡ Semi-conductor (VLSI &amp; Silicon Design)</option>
                <option value="Cyber-security">🛡️ Cyber Security (Cloud &amp; AppSec)</option>
                <option value="Full-stack">💻 Full-Stack &amp; Frontend Architecture</option>
                <option value="Others">✨ Others (Enter Custom Role...)</option>
              </select>
              <ChevronDown size={15} className="tcm-select-arrow" />
            </div>

            {/* Custom Role Input when "Others" is selected */}
            {targetTrack === 'Others' && (
              <div className="mt-1.5 animate-fade-in">
                <input
                  type="text"
                  value={customTargetRole}
                  onChange={e => setCustomTargetRole(e.target.value)}
                  placeholder="Type your dream role (e.g. Lead Product Manager, Cloud DevOps)"
                  className="tcm-input-compact"
                  required
                />
              </div>
            )}
          </div>

          {/* Section 2: Baseline & Target Inputs (2x2 Grid) */}
          <div className="tcm-grid-row">
            {!notWorking && (<>
            {/* Current Role */}
            <div className="tcm-field-compact">
              <label className="tcm-group-label">
                <span>📍 Current Role</span>
              </label>
              <input
                type="text"
                value={currentRole}
                onChange={e => setCurrentRole(e.target.value)}
                placeholder="e.g. Senior Frontend Dev"
                className="tcm-input-compact"
                required
              />
            </div>

            {/* Current Company */}
            <div className="tcm-field-compact">
              <label className="tcm-group-label">
                <span>🏢 Current Company</span>
              </label>
              <input
                type="text"
                value={currentCompany}
                onChange={e => setCurrentCompany(e.target.value)}
                placeholder="e.g. TCS / Infosys / Startup"
                className="tcm-input-compact"
                required
              />
              <div className="tcm-mini-chips">
                {['TCS', 'Infosys', 'Cognizant', 'Startup'].map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCurrentCompany(c)}
                    className="tcm-mini-chip-btn"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            </>)}

            {/* Target Company (Full width or paired) */}
            <div className="tcm-field-compact" style={{ gridColumn: 'span 2' }}>
              <label className="tcm-group-label">
                <span>🎯 Target Company</span>
              </label>
              <input
                type="text"
                value={dreamCompany}
                onChange={e => setDreamCompany(e.target.value)}
                placeholder="e.g. Swiggy, Flipkart, Google, Razorpay"
                className="tcm-input-compact"
                required
              />
              <div className="tcm-mini-chips">
                {['Swiggy', 'Flipkart', 'Google', 'Razorpay', 'CRED'].map(dc => (
                  <button
                    type="button"
                    key={dc}
                    onClick={() => setDreamCompany(dc)}
                    className="tcm-mini-chip-btn"
                  >
                    {dc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional target salary */}
          <div className="tcm-field-compact">
            <label className="tcm-group-label">
              <span>💰 Target Salary (LPA, optional)</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={targetCtcLpa}
              onChange={e => setTargetCtcLpa(e.target.value)}
              placeholder="e.g. 25"
              className="tcm-input-compact"
            />
          </div>

          {/* Hero Action CTA */}
          <div className="tcm-actions-block">
            <button
              type="submit"
              className="btn-tcm-hero-submit"
              disabled={isSaving}
            >
              <span>{isSaving ? 'Saving…' : 'Save Goal & See Matched Mentors'}</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

