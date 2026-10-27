import React, { useEffect, useState } from 'react';
import { X, Award, Star, CheckCircle2, ShieldCheck, Sparkles, User, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MentorAssessmentModal: React.FC = () => {
  const { 
    isAssessmentModalOpen, 
    setIsAssessmentModalOpen, 
    assessmentDraftSession, 
    completeSession
  } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [badgeTitle, setBadgeTitle] = useState<string>('');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fresh form for every session being assessed (the modal stays mounted between opens)
  useEffect(() => {
    if (!assessmentDraftSession) return;
    setRating(5);
    setBadgeTitle(`${assessmentDraftSession.expert.domain} Competency Verified`);
    setFeedbackNotes('');
    setSelectedSkills([]);
  }, [assessmentDraftSession?.id]);

  if (!isAssessmentModalOpen || !assessmentDraftSession) return null;

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  // The badge is issued to the session's candidate by the backend (POST /sessions/:id/assess)
  const handleIssueBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentDraftSession || isSubmitting) return;
    if (!feedbackNotes.trim()) return;
    setIsSubmitting(true);
    const ok = await completeSession(
      assessmentDraftSession.id,
      rating,
      feedbackNotes.trim(),
      badgeTitle.trim() || undefined,
      selectedSkills.length > 0 ? selectedSkills : undefined
    );
    setIsSubmitting(false);
    if (ok) setIsAssessmentModalOpen(false);
  };

  const availableSkillTags = Array.from(new Set([
    ...(assessmentDraftSession.expert.skills || []),
    ...(assessmentDraftSession.expert.trajectory?.keyJumpSkills || []),
    'System Design',
    'Problem Solving',
    'Communication'
  ]));

  return (
    <div className="app-modal-backdrop open">
      <div className="app-modal-card assessment-modal-card">
        <button 
          className="modal-close-btn" 
          onClick={() => setIsAssessmentModalOpen(false)}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="assessment-modal-header">
          <div className="assessment-badge-pill">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Official Shine Mentor Evaluation</span>
          </div>
          <h2 className="assessment-modal-title">Post-Session Candidate Assessment</h2>
          <p className="assessment-modal-subtitle">
            Evaluate <strong>{assessmentDraftSession.candidateName}</strong> and issue their recruiter-facing <strong>Shine Verified Skill Badge</strong>.
          </p>
        </div>

        {/* Candidate Summary Box */}
        <div className="as-candidate-summary-box">
          <div className="as-candidate-avatar-wrap">
            <img 
              src={assessmentDraftSession.candidateAvatar || '/brand/android-chrome-192x192.png'} 
              alt={assessmentDraftSession.candidateName} 
              className="as-candidate-avatar"
            />
          </div>
          <div className="as-candidate-info">
            <h4>{assessmentDraftSession.candidateName}</h4>
            <p>{assessmentDraftSession.candidateRole || 'Candidate'}</p>
            <span className="as-session-time-chip">
              Session: {assessmentDraftSession.date} • {assessmentDraftSession.timeSlot}
            </span>
          </div>
        </div>

        <form onSubmit={handleIssueBadge} className="assessment-form-stack">
          
          <div className="as-modal-body">
            {/* Star Rating Selector */}
            <div className="as-field-group">
              <label className="as-field-label">
                <Star size={14} className="text-amber-500" /> 1. Overall Candidate Proficiency Rating
              </label>
              <div className="as-star-rating-row">
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <button
                    type="button"
                    key={starVal}
                    className={`as-star-btn ${rating >= starVal ? 'active-star' : ''}`}
                    onClick={() => setRating(starVal)}
                  >
                    <Star size={20} fill={rating >= starVal ? '#F59E0B' : 'none'} color={rating >= starVal ? '#F59E0B' : '#CBD5E1'} />
                  </button>
                ))}
                <span className="as-rating-text">
                  {rating === 5 ? '⭐⭐⭐⭐⭐ Exceptional (Top 5%)' : `${rating} out of 5 Stars`}
                </span>
              </div>
            </div>

            {/* Verified Skills Checklist */}
            <div className="as-field-group">
              <label className="as-field-label">
                <CheckCircle2 size={14} className="text-blue-500" /> 2. Verified Technical Skills (Select all demonstrated)
              </label>
              <div className="as-skills-pill-grid">
                {availableSkillTags.map((skill) => {
                  const isChecked = selectedSkills.includes(skill);
                  return (
                    <button
                      type="button"
                      key={skill}
                      className={`as-skill-chip ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {isChecked && <CheckCircle2 size={12} />}
                      <span>{skill}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Badge Title Input */}
            <div className="as-field-group">
              <label className="as-field-label">
                <Award size={14} className="text-purple-500" /> 3. Verified Skill Badge Title (Displayed on Candidate's Profile)
              </label>
              <input 
                type="text" 
                value={badgeTitle}
                onChange={(e) => setBadgeTitle(e.target.value)}
                className="as-text-input"
                required
              />
            </div>

            {/* Feedback & Recommendations Notes */}
            <div className="as-field-group">
              <label className="as-field-label">
                <FileText size={14} className="text-emerald-500" /> 4. Mentor Feedback & Recruiter Recommendation Notes
              </label>
              <textarea 
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="as-textarea-input"
                placeholder="Write feedback for the candidate..."
                required
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="as-modal-footer">
            <button 
              type="button" 
              className="btn-as-cancel"
              onClick={() => setIsAssessmentModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-as-issue-badge"
            >
              <Award size={16} />
              <span>Issue Shine Verified Skill Badge</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
