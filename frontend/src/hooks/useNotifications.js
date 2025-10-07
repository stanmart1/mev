import { useEffect, useCallback } from 'react';

export function useNotifications() {
  const playSound = () => {
    const settings = JSON.parse(localStorage.getItem('mev_notification_settings') || '{"sound":true}');
    if (settings.sound) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKDf8sFuIwUugc3y2Ik2CBhku+zooVARC0yl4fG5ZRwFNo3V7859KQUofsz');
      audio.play().catch(() => {});
    }
  };

  const showBrowserNotification = (title, message) => {
    const settings = JSON.parse(localStorage.getItem('mev_notification_settings') || '{"browser":true}');
    if (settings.browser && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  const addNotification = useCallback((notification) => {
    const notifications = JSON.parse(localStorage.getItem('mev_notifications') || '[]');
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      read: false,
      ...notification
    };
    notifications.unshift(newNotification);
    localStorage.setItem('mev_notifications', JSON.stringify(notifications.slice(0, 100)));
    
    playSound();
    showBrowserNotification(notification.title, notification.message);
    
    window.dispatchEvent(new Event('storage'));
  }, []);

  return { addNotification };
}
