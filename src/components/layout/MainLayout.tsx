import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '../common/ToastContainer';
import { ProfileIncompleteBanner } from '../common/ProfileIncompleteBanner';
import { GlobalModals } from '../modals/GlobalModals';
import { ViewRouter, pathToView, getRouteByView } from '../../routes';

/**
 * Main Layout Component for Shine Peerpath
 * Coordinates Header, Active ViewRouter, Footer, Modals, and Toasts
 */
export const MainLayout: React.FC = () => {
  const {
    currentView,
    navigate,
    selectExpertById,
    setSearchQuery
  } = useApp();

  // URL routing & browser back/forward history synchronization
  useEffect(() => {
    const route = pathToView(window.location.pathname);
    if (route.view !== currentView) {
      navigate(route.view, window.location.pathname);
    }
    if (route.expertId) {
      selectExpertById(route.expertId);
    }

    const onPopState = () => {
      const r = pathToView(window.location.pathname);
      navigate(r.view, window.location.pathname);
      if (r.expertId) {
        selectExpertById(r.expertId);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Sync browser tab title and meta description with active route for SEO
  useEffect(() => {
    const routeMeta = getRouteByView(currentView);
    if (routeMeta?.title) {
      document.title = routeMeta.title;
    }
    if (routeMeta?.description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', routeMeta.description);
      }
    }
  }, [currentView]);

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    navigate('experts-view');
  };

  const currentRouteMeta = getRouteByView(currentView);
  const isAdminView = currentView === 'admin-dashboard-view';
  const showHeader = !currentRouteMeta.hideHeader && currentView !== 'login-view' && !isAdminView;
  const showFooter = !currentRouteMeta.hideFooter && currentView !== 'live-call-view' && currentView !== 'login-view' && !isAdminView;

  return (
    <div className={`app-root-container ${isAdminView ? 'admin-crm-root' : ''}`}>
      {/* Toast Notification Alerts */}
      <ToastContainer />

      {/* Navigation Header */}
      {showHeader && (
        <Header
          currentView={currentView}
          onNavigate={navigate}
          onOpenCreatorWizard={() => {}}
          onSearch={handleGlobalSearch}
        />
      )}

      {/* Profile Incomplete Notification Banner */}
      {!isAdminView && <ProfileIncompleteBanner />}

      {/* Dynamic View Router */}
      <main 
        className={`app-main-viewport ${isAdminView ? 'admin-crm-viewport' : ''}`} 
        style={{ minHeight: currentView === 'login-view' || isAdminView ? '100vh' : '80vh' }}
      >
        <ViewRouter />
      </main>

      {/* Footer */}
      {showFooter && <Footer />}

      {/* Application Modals */}
      <GlobalModals />
    </div>
  );
};
