import React from 'react';
import { 
  Users, Award, Banknote, CalendarCheck, 
  ArrowRight, CheckCircle2, Sparkles, TrendingUp 
} from 'lucide-react';
import { AdminOverviewStats, AdminUserData, AdminBookingData } from '../../types';
import { AdminSection } from './AdminSidebar';
import { BRAND } from '../../config/brand';

interface AdminOverviewSectionProps {
  overview: AdminOverviewStats | null;
  users: AdminUserData[];
  bookings: AdminBookingData[];
  onSelectSection: (section: AdminSection) => void;
  onInspectCandidate: (user: AdminUserData) => void;
  onToggleMentorAccess: (user: AdminUserData) => void;
  togglingUserId: string | null;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({
  overview,
  users,
  bookings,
  onSelectSection,
  onInspectCandidate,
  onToggleMentorAccess,
  togglingUserId,
}) => {
  const totalUsers = overview?.totalUsers ?? users.length;
  const eligibleMentors = overview?.eligibleMentors ?? users.filter(u => u.isMentorEligible || u.isMentor).length;
  const totalBookings = overview?.totalBookings ?? bookings.length;
  const totalGmv = overview?.totalGmv ?? bookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const platformRevenue = overview?.platformEarnings ?? Math.round(totalGmv * 0.15);

  const recentUsers = users.slice(0, 5);
  const conversionRate = totalUsers > 0 ? Math.round((eligibleMentors / totalUsers) * 100) : 0;

  return (
    <div className="crm-content-section animate-fade-in">
      {/* Section Header */}
      <div className="crm-section-header">
        <div>
          <h2>Executive Business Overview</h2>
          <p>
            Key operational metrics for candidate registrations, mentor vetting rights, and financial clearing.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-crm-kpi-strip">
        <div className="admin-kpi-card" onClick={() => onSelectSection('candidates')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon blue">
            <Users size={20} />
          </div>
          <div className="admin-kpi-data">
            <span className="admin-kpi-title">Candidate Pipeline</span>
            <strong className="admin-kpi-value">{totalUsers}</strong>
            <span className="admin-kpi-subtext">Registered candidates →</span>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => onSelectSection('mentors')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon amber">
            <Award size={20} />
          </div>
          <div className="admin-kpi-data">
            <span className="admin-kpi-title">Mentors Authorized</span>
            <strong className="admin-kpi-value">{eligibleMentors}</strong>
            <span className="admin-kpi-subtext">Vetted mentor rights →</span>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => onSelectSection('payments')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon emerald">
            <CalendarCheck size={20} />
          </div>
          <div className="admin-kpi-data">
            <span className="admin-kpi-title">Mentorship Bookings</span>
            <strong className="admin-kpi-value">{totalBookings}</strong>
            <span className="admin-kpi-subtext">Session ledger →</span>
          </div>
        </div>

        <div className="admin-kpi-card" onClick={() => onSelectSection('payments')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-icon indigo">
            <Banknote size={20} />
          </div>
          <div className="admin-kpi-data">
            <span className="admin-kpi-title">Platform GMV</span>
            <strong className="admin-kpi-value">₹{totalGmv.toLocaleString('en-IN')}</strong>
            <span className="admin-kpi-subtext">{BRAND.name} Cut: ₹{platformRevenue.toLocaleString('en-IN')} →</span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Recent Registrations & Pipeline Summary */}
      <div className="crm-overview-grid">
        {/* Left: Recent Registrations */}
        <div className="crm-overview-panel">
          <div className="crm-panel-header">
            <h3>Recent Candidate Signups</h3>
            <button
              type="button"
              className="btn-panel-action"
              onClick={() => onSelectSection('candidates')}
            >
              <span>View All Candidates</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="crm-panel-body">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No candidates registered yet.</p>
            ) : (
              <div className="crm-recent-users-list">
                {recentUsers.map(u => {
                  const name = u.name && u.name !== 'Unnamed User' ? u.name : (u.email ? u.email.split('@')[0] : 'Candidate');
                  const isBusy = togglingUserId === u.id;

                  return (
                    <div key={u.id} className="crm-recent-user-item">
                      <img
                        src={u.avatar || '/brand/android-chrome-192x192.png'}
                        alt={name}
                        className="crm-recent-avatar"
                      />
                      <div className="crm-recent-info">
                        <strong>{name}</strong>
                        <span>{u.designation || 'Software Engineer'} · {u.currentCompany || 'Fresher'}</span>
                      </div>

                      <div className="crm-recent-actions">
                        <button
                          type="button"
                          className="btn-crm-inspect"
                          onClick={() => onInspectCandidate(u)}
                        >
                          Dossier
                        </button>

                        {u.isMentorEligible || u.isMentor ? (
                          <span className="crm-status-badge rights-granted">
                            <Sparkles size={11} />
                            <span>Mentor</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-crm-grant-sm"
                            onClick={() => onToggleMentorAccess(u)}
                            disabled={isBusy}
                          >
                            <CheckCircle2 size={12} />
                            <span>Grant Access</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Operations Highlights */}
        <div className="crm-overview-panel">
          <div className="crm-panel-header">
            <h3>Operations Performance</h3>
          </div>

          <div className="crm-panel-body crm-operations-metrics">
            <div className="crm-op-stat-box">
              <div className="crm-op-stat-left">
                <span className="crm-op-label">Mentor Vetting Rate</span>
                <span className="crm-op-sub">Candidates authorized as mentors</span>
              </div>
              <strong className="crm-op-number">{conversionRate}%</strong>
            </div>

            <div className="crm-op-stat-box">
              <div className="crm-op-stat-left">
                <span className="crm-op-label">Platform Take Rate</span>
                <span className="crm-op-sub">{BRAND.name} revenue share</span>
              </div>
              <strong className="crm-op-number text-emerald-600">15.0%</strong>
            </div>

            <div className="crm-op-shortcuts">
              <span className="crm-shortcuts-title">Quick Actions</span>
              <div className="crm-shortcut-buttons">
                <button
                  type="button"
                  className="btn-crm-shortcut"
                  onClick={() => onSelectSection('candidates')}
                >
                  <Users size={14} />
                  <span>Review Candidates Table</span>
                </button>
                <button
                  type="button"
                  className="btn-crm-shortcut"
                  onClick={() => onSelectSection('mentors')}
                >
                  <Award size={14} />
                  <span>Manage Mentors Roster</span>
                </button>
                <button
                  type="button"
                  className="btn-crm-shortcut"
                  onClick={() => onSelectSection('payments')}
                >
                  <Banknote size={14} />
                  <span>Inspect Payments Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
