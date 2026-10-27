import React from 'react';
import { 
  Users, Award, Banknote, LayoutDashboard, 
  ExternalLink, LogOut, ShieldCheck 
} from 'lucide-react';
import { PeerpathLogo } from '../common/PeerpathLogo';
import { UserAccount } from '../../types';
import { BRAND } from '../../config/brand';

export type AdminSection = 'overview' | 'candidates' | 'mentors' | 'payments';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  candidateCount: number;
  mentorCount: number;
  paymentCount: number;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onNavigateCandidatePortal: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSelectSection,
  candidateCount,
  mentorCount,
  paymentCount,
  currentUser,
  onLogout,
  onNavigateCandidatePortal,
}) => {
  return (
    <aside className="crm-sidebar">
      {/* 1. Brand Header */}
      <div className="crm-sidebar-header">
        <PeerpathLogo size={34} showText={true} />
        <div className="crm-sidebar-tag-row">
          <span className="crm-backoffice-badge">Admin Portal</span>
        </div>
      </div>

      {/* 2. Navigation Menu */}
      <div className="crm-sidebar-menu-wrap">
        <div className="crm-sidebar-section-label">BUSINESS MANAGEMENT</div>
        <nav className="crm-sidebar-nav">
          <button
            type="button"
            className={`crm-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => onSelectSection('overview')}
          >
            <LayoutDashboard size={18} />
            <span className="crm-nav-label">Dashboard Overview</span>
          </button>

          <button
            type="button"
            className={`crm-nav-item ${activeSection === 'candidates' ? 'active' : ''}`}
            onClick={() => onSelectSection('candidates')}
          >
            <Users size={18} />
            <span className="crm-nav-label">Candidates</span>
            <span className="crm-nav-counter">{candidateCount}</span>
          </button>

          <button
            type="button"
            className={`crm-nav-item ${activeSection === 'mentors' ? 'active' : ''}`}
            onClick={() => onSelectSection('mentors')}
          >
            <Award size={18} />
            <span className="crm-nav-label">Mentors Roster</span>
            <span className={`crm-nav-counter ${mentorCount > 0 ? 'highlight' : ''}`}>
              {mentorCount}
            </span>
          </button>

          <button
            type="button"
            className={`crm-nav-item ${activeSection === 'payments' ? 'active' : ''}`}
            onClick={() => onSelectSection('payments')}
          >
            <Banknote size={18} />
            <span className="crm-nav-label">Payments &amp; Escrow</span>
            <span className="crm-nav-counter">{paymentCount}</span>
          </button>
        </nav>
      </div>

      {/* 3. Bottom User Profile & Switcher */}
      <div className="crm-sidebar-footer">
        <button
          type="button"
          className="btn-crm-candidate-portal-cta"
          onClick={onNavigateCandidatePortal}
          title={`Open ${BRAND.name} Candidate Portal`}
        >
          <span>Candidate Portal</span>
          <ExternalLink size={13} />
        </button>

        <div className="crm-sidebar-user-card">
          <div className="crm-sidebar-avatar">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="crm-sidebar-user-details">
            <span className="crm-user-display-name">{currentUser?.name || 'Administrator'}</span>
            <span className="crm-user-display-role">Operations Lead</span>
          </div>
          <button
            type="button"
            className="btn-crm-sidebar-logout"
            onClick={onLogout}
            title="Sign out of Admin Console"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
