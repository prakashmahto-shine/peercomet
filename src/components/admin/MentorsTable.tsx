import React, { useState } from 'react';
import { 
  Search, Award, Sparkles, XCircle, Briefcase, 
  Building2, Eye, X, CheckCircle2, SlidersHorizontal 
} from 'lucide-react';
import { AdminUserData } from '../../types';

interface MentorsTableProps {
  users: AdminUserData[];
  creators: any[];
  togglingUserId: string | null;
  onToggleMentorAccess: (user: AdminUserData) => void;
  onToggleCreatorStatus: (creatorId: string, currentStatus: string) => void;
  onInspectCandidate: (user: AdminUserData) => void;
}

export const MentorsTable: React.FC<MentorsTableProps> = ({
  users,
  creators,
  togglingUserId,
  onToggleMentorAccess,
  onToggleCreatorStatus,
  onInspectCandidate,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'pending_setup'>('all');

  // All users who have mentor rights granted OR are mentors
  const eligibleUsers = users.filter(u => u.isMentorEligible || u.isMentor);

  // Map creators by owner_user_id or id for easy joining
  const creatorMap = new Map<string, any>();
  creators.forEach(c => {
    if (c.ownerUserId) creatorMap.set(c.ownerUserId.toLowerCase(), c);
    creatorMap.set(c.id.toLowerCase(), c);
  });

  const filtered = eligibleUsers.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    const creator = creatorMap.get(user.id.toLowerCase()) || (user.creatorId ? creatorMap.get(user.creatorId.toLowerCase()) : null);
    
    const matchesSearch = 
      !query ||
      (user.name || '').toLowerCase().includes(query) ||
      (user.email || '').toLowerCase().includes(query) ||
      (user.currentCompany || '').toLowerCase().includes(query) ||
      (user.designation || '').toLowerCase().includes(query) ||
      (creator?.domain || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    const isLive = user.isMentor || (creator && creator.status === 'approved');
    if (filterStatus === 'live') return isLive;
    if (filterStatus === 'pending_setup') return !isLive;
    return true;
  });

  const getDisplayName = (user: AdminUserData): string => {
    if (user.name && user.name.trim() !== '' && user.name !== 'Unnamed User') {
      return user.name;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Mentor';
  };

  return (
    <div className="crm-content-section animate-fade-in">
      {/* Section Header */}
      <div className="crm-section-header">
        <div>
          <h2>Mentors Roster</h2>
          <p>
            Vetted mentors authorized by PeerPath Admin. Users appear here once mentor rights are granted from the candidate pool.
          </p>
        </div>
        <div className="crm-header-metric-pill highlight">
          <span>Active / Eligible Mentors:</span>
          <strong>{eligibleUsers.length}</strong>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-crm-toolbar">
        <div className="admin-crm-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-crm-search-input"
            placeholder="Search mentors by name, company, domain, email..."
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
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Vetted Mentors ({eligibleUsers.length})</option>
            <option value="live">Live in Directory</option>
            <option value="pending_setup">Profile Setup Pending</option>
          </select>
          <span className="admin-records-count">
            Showing <strong>{filtered.length}</strong> of {eligibleUsers.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="admin-crm-table-container">
        <table className="admin-crm-table">
          <thead>
            <tr>
              <th>Mentor Name &amp; Contact</th>
              <th>Current Role &amp; Company</th>
              <th>Domain / Track</th>
              <th>Session Fee</th>
              <th>Directory Status</th>
              <th style={{ textAlign: 'right' }}>Admin Governance Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  <Award size={32} />
                  <p>No mentors found. Grant mentor rights to candidates to add them here.</p>
                </td>
              </tr>
            ) : (
              filtered.map(user => {
                const isBusy = togglingUserId === user.id;
                const displayName = getDisplayName(user);
                const creator = creatorMap.get(user.id.toLowerCase()) || (user.creatorId ? creatorMap.get(user.creatorId.toLowerCase()) : null);
                const isLive = Boolean(creator && creator.status === 'approved');
                const isPaused = Boolean(creator && creator.status === 'paused');

                return (
                  <tr key={user.id} className="admin-crm-row">
                    {/* User profile info */}
                    <td>
                      <div className="crm-user-profile-cell">
                        <img
                          src={creator?.avatar || user.avatar || '/brand/android-chrome-192x192.png'}
                          alt={displayName}
                          className="crm-user-avatar"
                        />
                        <div className="crm-user-names">
                          <span className="crm-user-name">{displayName}</span>
                          <span className="crm-user-email">{user.email || 'No email'}</span>
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
                        <span>{creator?.role || user.designation || 'Specialist'}</span>
                      </div>
                      <div className="crm-company-pill">
                        <Building2 size={12} className="text-slate-400 inline mr-1" />
                        <span>{creator?.company || user.currentCompany || 'Independent'}</span>
                      </div>
                    </td>

                    {/* Domain Track */}
                    <td>
                      {creator?.domain ? (
                        <span className="crm-domain-pill">{creator.domain}</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Self-Guided Mentor</span>
                      )}
                    </td>

                    {/* Pricing */}
                    <td>
                      {creator?.price ? (
                        <div>
                          <strong className="text-slate-900">₹{creator.price}</strong>
                          <span className="text-xs text-slate-500"> / hr</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Default rate</span>
                      )}
                    </td>

                    {/* Directory Status Badge */}
                    <td>
                      {isLive ? (
                        <span className="crm-status-badge verified-mentor">
                          <Sparkles size={12} />
                          <span>LIVE IN DIRECTORY</span>
                        </span>
                      ) : isPaused ? (
                        <span className="crm-status-badge candidate-only">
                          <span>LISTING PAUSED</span>
                        </span>
                      ) : (
                        <span className="crm-status-badge rights-granted">
                          <CheckCircle2 size={12} />
                          <span>RIGHTS GRANTED (READY)</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="crm-actions-inline">
                        <button
                          type="button"
                          className="btn-crm-inspect"
                          onClick={() => onInspectCandidate(user)}
                          title="View dossier"
                        >
                          <Eye size={13} />
                          <span>Dossier</span>
                        </button>

                        {creator && (
                          <button
                            type="button"
                            className={`btn-crm-toggle-status ${creator.status === 'approved' ? 'pause' : 'activate'}`}
                            onClick={() => onToggleCreatorStatus(creator.id, creator.status)}
                          >
                            {creator.status === 'approved' ? 'Pause' : 'Activate'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-crm-revoke"
                          onClick={() => onToggleMentorAccess(user)}
                          disabled={isBusy}
                          title="Revoke mentor permissions (user remains a candidate)"
                        >
                          <XCircle size={14} />
                          <span>{isBusy ? 'Saving...' : 'Revoke Access'}</span>
                        </button>
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
