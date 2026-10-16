import { useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';

const MODAL_BACKDROP_SELECTORS = [
  '.app-modal-backdrop',
  '.shine-modal-backdrop',
  '.tcm-modal-backdrop',
  '.modal-backdrop-blur',
  '.crm-modal-backdrop',
  '.rzp-modal-backdrop',
  '.video-modal-backdrop',
  '.linkedin-modal-backdrop',
  '.analytics-modal-backdrop',
  '.modal-backdrop',
  '[role="dialog"]'
];

const SELECTOR_STRING = MODAL_BACKDROP_SELECTORS.join(', ');

/**
 * Universal Root-Level Modal Scroll Lock Hook
 * 
 * Ensures that whenever ANY modal, popup, or overlay is open in the application:
 * 1. Background page (<html> and <body>) is strictly locked and cannot scroll.
 * 2. Trackpad / mouse-wheel / touch gestures on the modal backdrop are intercepted so they cannot bubble to the root window.
 * 3. Scrolling INSIDE modal cards remains 100% fluid and functional with isolated overscroll.
 * 4. Automatically monitors both AppContext modal flags and DOM mutations (for local view-level modals).
 */
export const useRootModalScrollLock = () => {
  const appContext = useContext(AppContext);

  const isStateModalActive = Boolean(
    appContext && (
      appContext.isBookingModalOpen ||
      appContext.isLoginModalOpen ||
      appContext.isAssessmentModalOpen ||
      appContext.isCvSyncModalOpen ||
      appContext.isUpdateProfileModalOpen ||
      appContext.isCalibrationModalOpen ||
      appContext.currentView === 'registration-view'
    )
  );

  useEffect(() => {
    let isCurrentlyLocked = false;

    const checkShouldLock = (): boolean => {
      if (isStateModalActive) return true;
      const domModal = document.querySelector(SELECTOR_STRING);
      return Boolean(domModal);
    };

    const applyLock = () => {
      if (isCurrentlyLocked) return;
      isCurrentlyLocked = true;
      document.documentElement.classList.add('peerpath-modal-open');
      document.body.classList.add('peerpath-modal-open');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overscrollBehavior = 'none';
    };

    const releaseLock = () => {
      if (!isCurrentlyLocked) return;
      isCurrentlyLocked = false;
      document.documentElement.classList.remove('peerpath-modal-open');
      document.body.classList.remove('peerpath-modal-open');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
    };

    const syncLock = () => {
      const shouldLock = checkShouldLock();
      if (shouldLock) {
        applyLock();
      } else {
        releaseLock();
      }
    };

    // Prevent trackpad / mousewheel leakage when interacting with backdrop overlay
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.matches(SELECTOR_STRING)) {
        e.preventDefault();
      }
    };

    // Prevent touch gestures on backdrop overlay from scrolling mobile viewport
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.matches(SELECTOR_STRING)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Initial check
    syncLock();

    // DOM MutationObserver to detect any popup dynamically inserted into the DOM
    const observer = new MutationObserver(() => {
      syncLock();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'open']
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      releaseLock();
    };
  }, [isStateModalActive]);
};
