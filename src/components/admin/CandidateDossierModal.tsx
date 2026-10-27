import React from 'react';
import { X, FileText, ExternalLink } from 'lucide-react';
import { AdminUserData } from '../../types';

interface CandidateDossierModalProps {
  candidate: AdminUserData;
  isBusy: boolean;
  onClose: () => void;
  onToggleMentorAccess: (user: AdminUserData) => void;
}

export const CandidateDossierModal: React.FC<CandidateDossierModalProps> = ({
  candidate,
  isBusy,
  onClose,
  onToggleMentorAccess,
}) => {
  const displayName = candidate.name && candidate.name !== 'Unnamed User' 
    ? candidate.name 
    : (candidate.email ? candidate.email.split('@')[0] : 'Candidate');

  const experienceText = candidate.experienceYears && candidate.experienceYears !== 'null'
    ? candidate.experienceYears
    : (candidate.totalExperienceYears !== undefined && candidate.totalExperienceYears !== null
      ? `${candidate.totalExperienceYears} yrs experience`
      : 'Not specified');

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal-content" onClick={e => e.stopPropagation()}>
        <div className="crm-modal-header">
          <div className="crm-modal-title-group">
            <h3>Candidate Profile</h3>
            <span className="crm-candidate-id">ID: {candidate.id}</span>
          </div>
          <button
            type="button"
            className="btn-crm-modal-close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="crm-modal-body">
          {/* Hero / Avatar */}
          <div className="crm-dossier-hero">
            <img
              src={candidate.avatar || '/brand/android-chrome-192x192.png'}
              alt={displayName}
              className="crm-dossier-avatar"
            />
            <div className="crm-dossier-basics">
              <h4>{displayName}</h4>
              <p>{candidate.email || 'No email provided'}</p>
              {candidate.mobile && <p>📞 {candidate.mobile}</p>}
              {candidate.city && <p className="crm-dossier-loc">📍 {candidate.city}</p>}
            </div>
          </div>

          {/* Grid fields */}
          <div className="crm-dossier-grid">
            <div className="crm-dossier-field">
              <label>Current Role</label>
              <div>{candidate.designation || 'Not specified'}</div>
            </div>
            <div className="crm-dossier-field">
              <label>Company</label>
              <div>{candidate.currentCompany || 'Not specified'}</div>
            </div>
            <div className="crm-dossier-field">
              <label>Total Experience</label>
              <div>{experienceText}</div>
            </div>
            <div className="crm-dossier-field">
              <label>Career Goal / Ambition</label>
              <div>{candidate.careerGoal || candidate.targetRole || 'Not specified'}</div>
            </div>
          </div>

          {/* Skills */}
          <div className="crm-dossier-section">
            <label>Verified / Tagged Skills</label>
            <div className="crm-dossier-skills">
              {candidate.skills && candidate.skills.length > 0 ? (
                candidate.skills.map(s => (
                  <span key={s} className="crm-skill-chip">{s}</span>
                ))
              ) : (
                <span className="text-slate-400 text-xs">No skills tagged</span>
              )}
            </div>
          </div>

          {/* Resume Document */}
          <div className="crm-dossier-section">
            <label>Resume Document</label>
            {candidate.resumeFileName || candidate.resumeUrl ? (
              <div className="crm-dossier-cv-card">
                <FileText size={18} className="text-indigo-600" />
                <span>{candidate.resumeFileName || 'candidate_resume.pdf'}</span>
                <a
                  href={candidate.resumeUrl || `/api/cv/resume`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-crm-cv-action"
                >
                  <span>Open Document</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No resume uploaded</p>
            )}
          </div>

          {/* Mentor Rights Status & Action */}
          <div className="crm-dossier-rights-card">
            <div>
              <strong>Mentor Rights Status</strong>
              <p className="text-xs text-slate-500">
                {candidate.isMentorEligible
                  ? 'Access Granted: User is listed in the Mentors Roster and can host 1:1 sessions.'
                  : 'Candidate account: Cannot access Creator Studio until granted mentor access.'}
              </p>
            </div>
            <button
              type="button"
              className={candidate.isMentorEligible ? 'btn-crm-revoke' : 'btn-crm-grant'}
              onClick={() => onToggleMentorAccess(candidate)}
              disabled={isBusy}
            >
              {candidate.isMentorEligible ? 'Revoke Mentor Access' : 'Grant Mentor Access'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
