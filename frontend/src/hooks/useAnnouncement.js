import { useEffect, useRef } from 'react';

/**
 * Hook for screen reader announcements
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const useAnnouncement = (message, priority = 'polite') => {
  const announcerRef = useRef(null);

  useEffect(() => {
    if (!announcerRef.current) {
      // Create announcer element if it doesn't exist
      announcerRef.current = document.createElement('div');
      announcerRef.current.setAttribute('role', 'status');
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.setAttribute('aria-atomic', 'true');
      announcerRef.current.className = 'sr-only';
      document.body.appendChild(announcerRef.current);
    }

    if (message) {
      // Clear and set new message
      announcerRef.current.textContent = '';
      setTimeout(() => {
        announcerRef.current.textContent = message;
      }, 100);
    }

    return () => {
      if (announcerRef.current && !message) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, [message, priority]);
};

export default useAnnouncement;
