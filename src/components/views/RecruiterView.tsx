import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Award, Mail, FileText } from 'lucide-react';
import { ViewType } from '../../types';
import { peerpathApi } from '../../services/api';

interface RecruiterViewProps {
  onNavigate: (view: ViewType) => void;
}

interface CandidateRoleMatch {
  candidate: {
    id: string;
    name: string;
    headline: string;
    location: string;
    skills: string[];
    badges: Array<{ title: string }>;
    avatar?: string;
  };
  matchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
}

const ROLE_TITLE = 'Staff UI & Micro-Frontend Architect';
const REQUIRED_SKILLS = ['React.js', 'TypeScript', 'Micro-Frontends', 'Module Federation'];

export const RecruiterView: React.FC<RecruiterViewProps> = ({ onNavigate }) => {
  const [showVerifiedOnly, setShowVerifiedOnly] = useState<boolean>(true);
  const [matches, setMatches] = useState<CandidateRoleMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    peerpathApi.matchRecruiterCandidates({
      roleTitle: ROLE_TITLE,
      requiredSkills: REQUIRED_SKILLS,
      peerVerifiedOnly: showVerifiedOnly
    }).then(result => {
      if (isCurrent) setMatches(result.matches as CandidateRoleMatch[]);
    }).catch(() => {
      if (isCurrent) setMatches([]);
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [showVerifiedOnly]);

  return (
    <div className="content-wrapper recruiter-portal-layout">
      <div className="recruiter-top-banner">
        <div>
          <span className="recruiter-badge-tag"><ShieldAlert size={14} /> SHINE RECRUITER TALENT SEARCH</span>
          <h1 className="recruiter-heading">Candidate Search: Thin-Pool Domains (AI/ML, SaaS, Semiconductor)</h1>
          <p>Filter candidates verified by senior engineering peers to skip generic GenAI resumes.</p>
        </div>
        <div className="recruiter-filter-toggle-box">
          <label className="toggle-peer-verified">
            <input 
              type="checkbox" 
              checked={showVerifiedOnly} 
              onChange={(e) => setShowVerifiedOnly(e.target.checked)} 
            />
            <span className="toggle-slider"></span>
            <strong>Show Peer-Verified Candidates Only</strong>
          </label>
        </div>
      </div>

      <div className="recruiter-results-grid">
        {isLoading && <div className="recruiter-candidate-card">Calculating role fit...</div>}
        {!isLoading && matches.length === 0 && (
          <div className="recruiter-candidate-card">No candidates match the current filters.</div>
        )}
        {matches.map(({ candidate, matchPercent, matchedSkills, missingSkills, explanation }) => (
        <div className="recruiter-candidate-card verified-highlight" key={candidate.id}>
          <div className="r-card-header">
            <div className="r-candidate-meta">
              <img src={candidate.avatar || '/brand/android-chrome-192x192.png'} alt={candidate.name} className="r-avatar" />
              <div>
                <div className="r-name-row">
                  <h3>{candidate.name}</h3>
                  {candidate.badges.length > 0 && (
                    <span className="r-gold-shield"><ShieldCheck size={14} /> PEER-VERIFIED</span>
                  )}
                </div>
                <p className="r-title">{candidate.headline} • {candidate.location}</p>
              </div>
            </div>
            <div className="r-match-score">{matchPercent}% Match</div>
          </div>

          <div className="r-verified-box r-match-explanation">
            <Award size={22} className="r-v-icon" />
            <div className="r-v-text">
              <strong>Role fit for {ROLE_TITLE}</strong>
              <p>{explanation}</p>
            </div>
          </div>

          <div className="r-skills-row">
            {matchedSkills.map(skill => <span className="r-skill" key={skill}>✓ {skill}</span>)}
            {missingSkills.map(skill => <span className="r-skill r-skill-missing" key={skill}>Missing: {skill}</span>)}
          </div>

          <div className="r-card-actions">
            <button className="btn-shine-gold-sm" onClick={() => alert(`Interview invite sent to ${candidate.name}!`)}>
              <Mail size={14} /> Schedule Interview
            </button>
            <button className="btn-outline-dark-sm" onClick={() => onNavigate('profile-view')}>
              <FileText size={14} /> View Full Verified CV
            </button>
          </div>
        </div>
        ))}
      </div>

    </div>
  );
};
