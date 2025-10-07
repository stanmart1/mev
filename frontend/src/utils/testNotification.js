export function sendTestNotification() {
  const notifications = JSON.parse(localStorage.getItem('mev_notifications') || '[]');
  const testNotification = {
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    read: false,
    category: 'profit',
    title: 'Test Notification',
    message: 'This is a test notification to verify your notification settings are working correctly.',
    action: 'Dismiss'
  };
  
  notifications.unshift(testNotification);
  localStorage.setItem('mev_notifications', JSON.stringify(notifications.slice(0, 100)));
  
  const settings = JSON.parse(localStorage.getItem('mev_notification_settings') || '{"sound":true,"browser":true}');
  
  if (settings.sound) {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKDf8sFuIwUugc3y2Ik2CBhku+zooVARC0yl4fG5ZRwFNo3V7859KQUofsz');
    audio.play().catch(() => {});
  }
  
  if (settings.browser && Notification.permission === 'granted') {
    new Notification('Test Notification', {
      body: 'This is a test notification to verify your notification settings are working correctly.',
      icon: '/favicon.ico'
    });
  }
  
  window.dispatchEvent(new Event('storage'));
}
