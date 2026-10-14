import React, { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { peerpathApi } from '../../services/api';
import { AdminOverviewStats, AdminUserData, AdminBookingData } from '../../types';
import { AdminSidebar, AdminSection } from '../admin/AdminSidebar';
import { CandidatesTable } from '../admin/CandidatesTable';
import { MentorsTable } from '../admin/MentorsTable';
import { PaymentsTable } from '../admin/PaymentsTable';
import { AdminOverviewSection } from '../admin/AdminOverviewSection';
import { CandidateDossierModal } from '../admin/CandidateDossierModal';
import { AdminLoginView } from './AdminLoginView';

export const AdminDashboardView: React.FC = () => {
  const { 
    currentUser, 
    isAuthLoading, 
    logout, 
    navigate, 
    showToast 
  } = useApp();

  const [activeSection, setActiveSection] = useState<AdminSection>('candidates');
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [bookings, setBookings] = useState<AdminBookingData[]>([]);
  const [creators, setCreators] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [inspectCandidate, setInspectCandidate] = useState<AdminUserData | null>(null);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [overviewData, usersData, bookingsData, creatorsData] = await Promise.all([
        peerpathApi.getAdminOverview().catch(() => null),
        peerpathApi.getAdminUsers().catch(() => []),
        peerpathApi.getAdminBookings().catch(() => []),
        peerpathApi.getAdminCreators().catch(() => [])
      ]);

      if (overviewData) setOverview(overviewData);
      setUsers(usersData || []);
      setBookings(bookingsData || []);
      setCreators(creatorsData || []);
    } catch (err) {
      showToast('Admin Load Failed', 'Could not load backoffice data. Ensure admin permissions.', 'warning');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchData();
    }
  }, [currentUser?.isAdmin]);

  // Auth Guard: if not authenticated as Admin, show separate AdminLoginView
  if (isAuthLoading) {
    return (
      <div className="admin-crm-loading-screen">
        <div className="admin-crm-loading-spinner"></div>
        <p>Loading PeerPath Backoffice CRM...</p>
      </div>
    );
  }

  if (!currentUser?.isAdmin) {
    return <AdminLoginView />;
  }

  // Toggle mentor rights: updates user, reflects in Candidates and Mentors tables
  const handleToggleMentorAccess = async (user: AdminUserData) => {
    const nextStatus = !user.isMentorEligible;
    setTogglingUserId(user.id);
    try {
      await peerpathApi.toggleMentorAccess(user.id, nextStatus);
      
      // Update local state immediately
      setUsers(prev => prev.map(u => {
        if (u.id === user.id) {
          return {
            ...u,
            isMentorEligible: nextStatus,
            creatorStatus: nextStatus ? 'approved' : 'inactive'
          };
        }
        return u;
      }));

      if (inspectCandidate && inspectCandidate.id === user.id) {
        setInspectCandidate(prev => prev ? {
          ...prev,
          isMentorEligible: nextStatus,
          creatorStatus: nextStatus ? 'approved' : 'inactive'
        } : null);
      }

      setOverview(prev => prev ? {
        ...prev,
        eligibleMentors: nextStatus ? prev.eligibleMentors + 1 : Math.max(0, prev.eligibleMentors - 1)
      } : null);

      showToast(
        nextStatus ? 'Mentor Access Granted' : 'Mentor Access Revoked',
        `${user.name || 'Candidate'} ${nextStatus ? 'now appears in the Mentors Roster and can host sessions.' : 'mentor rights have been revoked.'}`,
        nextStatus ? 'success' : 'info'
      );
    } catch (err) {
      showToast('Action Failed', err instanceof Error ? err.message : 'Could not update mentor access.', 'warning');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleToggleCreatorStatus = async (creatorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'approved' ? 'paused' : 'approved';
    try {
      await peerpathApi.updateCreatorStatus(creatorId, nextStatus);
      setCreators(prev => prev.map(c => c.id === creatorId ? { ...c, status: nextStatus } : c));
      showToast('Mentor Status Updated', `Status changed to ${nextStatus}.`, 'success');
    } catch (err) {
      showToast('Action Failed', 'Could not update status.', 'warning');
    }
  };

  const mentorCount = users.filter(u => u.isMentorEligible || u.isMentor).length;

  return (
    <div className="crm-layout-container animate-fade-in">
      {/* 1. Left Enterprise CRM Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        candidateCount={users.length}
        mentorCount={mentorCount}
        paymentCount={bookings.length}
        currentUser={currentUser}
        onLogout={() => logout(true)}
        onNavigateCandidatePortal={() => navigate('guidance-view', '/peerpath')}
      />

      {/* 2. Main CRM Content Workspace */}
      <div className="crm-main-viewport">
        {/* Top Header Bar */}
        <header className="crm-top-action-bar">
          <div className="crm-top-breadcrumbs">
            <span className="crm-crumb-parent">PeerPath Admin</span>
            <span className="crm-crumb-divider">/</span>
            <span className="crm-crumb-current">
              {activeSection === 'overview' && 'Dashboard Overview'}
              {activeSection === 'candidates' && 'Candidates Management'}
              {activeSection === 'mentors' && 'Mentors Roster'}
              {activeSection === 'payments' && 'Payments & GMV Ledger'}
            </span>
          </div>

          <div className="crm-top-actions">
            <button
              type="button"
              className="btn-crm-refresh"
              onClick={fetchData}
              disabled={isRefreshing}
              title="Sync latest live data from database"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <button
              type="button"
              className="btn-crm-candidate-app"
              onClick={() => navigate('guidance-view', '/peerpath')}
              title="Open public candidate directory"
            >
              <span>Candidate Portal</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </header>

        {/* Dynamic Section Render */}
        <main className="crm-section-viewport">
          {activeSection === 'overview' && (
            <AdminOverviewSection
              overview={overview}
              users={users}
              bookings={bookings}
              onSelectSection={setActiveSection}
              onInspectCandidate={setInspectCandidate}
              onToggleMentorAccess={handleToggleMentorAccess}
              togglingUserId={togglingUserId}
            />
          )}

          {activeSection === 'candidates' && (
            <CandidatesTable
              users={users}
              togglingUserId={togglingUserId}
              onToggleMentorAccess={handleToggleMentorAccess}
              onInspectCandidate={setInspectCandidate}
            />
          )}

          {activeSection === 'mentors' && (
            <MentorsTable
              users={users}
              creators={creators}
              togglingUserId={togglingUserId}
              onToggleMentorAccess={handleToggleMentorAccess}
              onToggleCreatorStatus={handleToggleCreatorStatus}
              onInspectCandidate={setInspectCandidate}
            />
          )}

          {activeSection === 'payments' && (
            <PaymentsTable
              bookings={bookings}
              overview={overview}
            />
          )}
        </main>

        {/* Candidate Dossier Inspector Modal */}
        {inspectCandidate && (
          <CandidateDossierModal
            candidate={inspectCandidate}
            isBusy={togglingUserId === inspectCandidate.id}
            onClose={() => setInspectCandidate(null)}
            onToggleMentorAccess={handleToggleMentorAccess}
          />
        )}
      </div>
    </div>
  );
};
