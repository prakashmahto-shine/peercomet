import React from 'react';
import { useApp } from '../context/AppContext';

// Page / View Components
import { CareerGuidanceView } from '../components/views/CareerGuidanceView';
import { ProfileView } from '../components/views/ProfileView';
import { JobsView } from '../components/views/JobsView';
import { ExpertsGalleryView } from '../components/views/ExpertsGalleryView';
import { ExpertProfileView } from '../components/views/ExpertProfileView';
import { CommunityView } from '../components/views/CommunityView';
import { PaymentView } from '../components/views/PaymentView';
import { ConfirmedView } from '../components/views/ConfirmedView';
import { MySessionsView } from '../components/views/MySessionsView';
import { LiveVideoCallView } from '../components/views/LiveVideoCallView';
import { PostSessionView } from '../components/views/PostSessionView';
import { RecruiterView } from '../components/views/RecruiterView';
import { MentorDashboardView } from '../components/views/MentorDashboardView';
import { LoginView } from '../components/views/LoginView';
import { RegistrationView } from '../components/views/RegistrationView';
import { AdminDashboardView } from '../components/views/AdminDashboardView';

interface ViewRouterProps {
  onSelectExpert?: (expertId: string) => void;
  onOpenBooking?: (expertId: string) => void;
}

/**
 * ViewRouter Component
 * Renders the active page view based on the current URL path & user state
 */
export const ViewRouter: React.FC<ViewRouterProps> = ({
  onSelectExpert: customSelectExpert,
  onOpenBooking: customOpenBooking
}) => {
  const { 
    currentView, 
    navigate, 
    experts, 
    selectedExpert, 
    selectExpertById, 
    setIsBookingModalOpen,
    currentUser,
    isAuthLoading,
    userProfile,
    setIsCreatorWizardOpen
  } = useApp();

  const handleSelectExpert = (expertId: string) => {
    if (customSelectExpert) {
      customSelectExpert(expertId);
    } else {
      selectExpertById(expertId);
      navigate('expert-profile-view', `/expert/${expertId}`);
    }
  };

  const handleOpenBooking = (expertId: string) => {
    if (customOpenBooking) {
      customOpenBooking(expertId);
    } else {
      selectExpertById(expertId);
      setIsBookingModalOpen(true);
    }
  };

  switch (currentView) {
    // 1. Core Discovery & Career Trajectory
    case 'guidance-view':
    case 'dashboard-view':
      return (
        <CareerGuidanceView
          onNavigate={navigate}
          onSelectExpert={handleSelectExpert}
          experts={experts}
        />
      );

    case 'profile-view':
      return <ProfileView />;

    case 'jobs-view':
      return (
        <JobsView
          onNavigate={navigate}
          onSelectExpert={handleSelectExpert}
        />
      );

    // 2. 1:1 Mentorship & Experts Gallery
    case 'experts-view':
      return (
        <ExpertsGalleryView
          experts={experts}
          onSelectExpert={handleSelectExpert}
          onOpenBooking={handleOpenBooking}
          onNavigate={navigate}
        />
      );

    case 'expert-profile-view':
      return (
        <ExpertProfileView
          expert={selectedExpert}
          onNavigate={navigate}
          onOpenBooking={handleOpenBooking}
        />
      );

    // 3. Technical Community & Mentor Discussions
    case 'community-view':
      return <CommunityView />;

    // 4. Booking, Checkout & Schedule
    case 'payment-view':
      return <PaymentView />;

    case 'confirmed-view':
      return <ConfirmedView />;

    case 'sessions-view':
      return <MySessionsView />;

    // 5. Live WebRTC Video Room & Evaluation
    case 'live-call-view':
      return <LiveVideoCallView />;

    case 'post-session-view':
      return <PostSessionView />;

    // 6. Recruiter & Mentor Dashboards
    case 'recruiter-view':
      return <RecruiterView onNavigate={navigate} />;

    case 'mentor-dashboard-view':
      // Client-side guard only; the backend still needs real auth to enforce this
      if (isAuthLoading) return null;
      if (!currentUser) return <LoginView />;
      if (currentUser.role !== 'mentor' && !currentUser.creatorId) {
        return (
          <div className="content-wrapper" style={{ padding: '48px 16px', textAlign: 'center' }}>
            <h2>Creator Studio is for mentors</h2>
            <p style={{ margin: '12px 0 20px' }}>Set up your mentor profile to start hosting 1:1 sessions.</p>
            <button type="button" className="btn-shine-gold-sm" onClick={() => setIsCreatorWizardOpen(true)}>
              Become a Mentor
            </button>
          </div>
        );
      }
      return <MentorDashboardView />;

    case 'admin-dashboard-view':
      return <AdminDashboardView />;

    // 7. Authentication
    case 'login-view':
      return <LoginView />;

    case 'registration-view':
      if (isAuthLoading) return null;
      if (!currentUser) return <LoginView />;
      return (
        <>
          <CareerGuidanceView
            onNavigate={navigate}
            onSelectExpert={handleSelectExpert}
            experts={experts}
          />
          <RegistrationView />
        </>
      );

    default:
      return (
        <CareerGuidanceView
          onNavigate={navigate}
          onSelectExpert={handleSelectExpert}
          experts={experts}
        />
      );
  }
};
