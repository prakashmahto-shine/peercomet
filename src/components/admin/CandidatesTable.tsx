import React, { useState } from 'react';
import { 
  Search, SlidersHorizontal, Users, Briefcase, Building2, 
  MapPin, FileText, ExternalLink, CheckCircle2, XCircle, Eye, X, Sparkles 
} from 'lucide-react';
import { AdminUserData } from '../../types';

interface CandidatesTableProps {
  users: AdminUserData[];
  togglingUserId: string | null;
  onToggleMentorAccess: (user: AdminUserData) => void;
  onInspectCandidate: (user: AdminUserData) => void;
}

export const CandidatesTable: React.FC<CandidatesTableProps> = ({
  users,
  togglingUserId,
  onToggleMentorAccess,
  onInspectCandidate,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'candidates_only' | 'mentor_granted'>('all');

  const filtered = users.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      (user.name || '').toLowerCase().includes(query) ||
      (user.email || '').toLowerCase().includes(query) ||
      (user.currentCompany || '').toLowerCase().includes(query) ||
      (user.designation || '').toLowerCase().includes(query) ||
      (user.city || '').toLowerCase().includes(query) ||
      user.skills.some(s => s.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterRole === 'mentor_granted') return user.isMentorEligible || user.isMentor;
    if (filterRole === 'candidates_only') return !user.isMentorEligible && !user.isMentor;
    return true;
  });

  const formatExperience = (user: AdminUserData): string => {
    if (user.experienceYears && user.experienceYears !== 'null') {
      return user.experienceYears;
    }
    if (user.totalExperienceYears !== undefined && user.totalExperienceYears !== null) {
      return `${user.totalExperienceYears} yrs experience`;
    }
    return 'Not specified';
  };

  const getDisplayName = (user: AdminUserData): string => {
    if (user.name && user.name.trim() !== '' && user.name !== 'Unnamed User') {
      return user.name;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Candidate';
  };

  return (
    <div className="crm-content-section animate-fade-in">
      {/* Section Header */}
      <div className="crm-section-header">
        <div>
          <h2>Candidate Registrations</h2>
          <p>
            All registered platform users. Granting mentor access authorizes candidates to host 1:1 sessions while preserving their candidate account.
          </p>
        </div>
        <div className="crm-header-metric-pill">
          <span>Total Registered:</span>
          <strong>{users.length}</strong>
        </div>
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="admin-crm-toolbar">
        <div className="admin-crm-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-crm-search-input"
            placeholder="Search candidates by name, company, role, skills, city, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="admin-crm-filters">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <select
            className="admin-crm-select"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as any)}
          >
            <option value="all">All Candidates ({users.length})</option>
            <option value="candidates_only">Standard Candidates Only</option>
            <option value="mentor_granted">Mentor Rights Granted</option>
          </select>
          <span className="admin-records-count">
            Showing <strong>{filtered.length}</strong> of {users.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="admin-crm-table-container">
        <table className="admin-crm-table">
          <thead>
            <tr>
              <th>Candidate / User</th>
              <th>Current Role &amp; Company</th>
              <th>Experience &amp; Skills</th>
              <th>Resume / Profile</th>
              <th>Access Status</th>
              <th style={{ textAlign: 'right' }}>Admin Governance Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  <Users size={32} />
                  <p>No candidate records found matching current criteria.</p>
                </td>
              </tr>
            ) : (
              filtered.map(user => {
                const isBusy = togglingUserId === user.id;
                const hasCv = Boolean(user.resumeFileName || user.resumeUrl);
                const displayName = getDisplayName(user);
                const experienceText = formatExperience(user);

                return (
                  <tr key={user.id} className="admin-crm-row">
                    {/* User profile info */}
                    <td>
                      <div className="crm-user-profile-cell">
                        <img
                          src={user.avatar || '/brand/android-chrome-192x192.png'}
                          alt={displayName}
                          className="crm-user-avatar"
                        />
                        <div className="crm-user-names">
                          <span className="crm-user-name">{displayName}</span>
                          <span className="crm-user-email">{user.email || 'No email provided'}</span>
                          {user.mobile && (
                            <span className="crm-user-meta">📞 {user.mobile}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role & Company */}
                    <td>
                      <div className="crm-role-name">
                        <Briefcase size={13} className="text-slate-400 inline mr-1" />
                        <span>{user.designation || 'Software Engineer'}</span>
                      </div>
                      <div className="crm-company-pill">
                        <Building2 size={12} className="text-slate-400 inline mr-1" />
                        <span>{user.currentCompany || 'Independent / Fresher'}</span>
                      </div>
                      {user.city && (
                        <div className="crm-location-tag">
                          <MapPin size={11} className="inline mr-1" />
                          <span>{user.city}</span>
                        </div>
                      )}
                    </td>

                    {/* Experience & Skills */}
                    <td>
                      <div className="crm-exp-text">
                        {experienceText}
                      </div>
                      <div className="crm-skills-wrap">
                        {user.skills && user.skills.length > 0 ? (
                          user.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="crm-skill-chip">{skill}</span>
                          ))
                        ) : (
                          <span className="crm-no-skills">No skills tagged</span>
                        )}
                        {user.skills && user.skills.length > 3 && (
                          <span className="crm-skill-chip more">+{user.skills.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Resume / CV */}
                    <td>
                      {hasCv ? (
                        <a
                          href={user.resumeUrl || `/api/cv/resume`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-crm-cv"
                          title={user.resumeFileName || 'Candidate Resume'}
                        >
                          <FileText size={13} />
                          <span>View CV</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="crm-no-cv">No CV attached</span>
                      )}
                    </td>

                    {/* Access Status Badge */}
                    <td>
                      {user.isMentor ? (
                        <span className="crm-status-badge verified-mentor">
                          <Sparkles size={12} />
                          <span>Live Mentor</span>
                        </span>
                      ) : user.isMentorEligible ? (
                        <span className="crm-status-badge rights-granted">
                          <CheckCircle2 size={12} />
                          <span>Mentor Rights Granted</span>
                        </span>
                      ) : (
                        <span className="crm-status-badge candidate-only">
                          Candidate / Mentee
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="crm-actions-inline">
                        <button
                          type="button"
                          className="btn-crm-inspect"
                          onClick={() => onInspectCandidate(user)}
                          title="View candidate profile"
                        >
                          <Eye size={13} />
                          <span>Profile</span>
                        </button>

                        {user.isMentorEligible || user.isMentor ? (
                          <button
                            type="button"
                            className="btn-crm-revoke"
                            onClick={() => onToggleMentorAccess(user)}
                            disabled={isBusy}
                            title="Revoke mentor permissions from this candidate"
                          >
                            <XCircle size={14} />
                            <span>{isBusy ? 'Saving...' : 'Revoke Rights'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-crm-grant"
                            onClick={() => onToggleMentorAccess(user)}
                            disabled={isBusy}
                            title="Grant mentor access (user will also appear in Mentors table)"
                          >
                            <CheckCircle2 size={14} />
                            <span>{isBusy ? 'Saving...' : 'Grant Mentor Access'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
