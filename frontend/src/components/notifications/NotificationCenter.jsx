import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, Settings, Filter, CheckCheck, Volume2 } from 'lucide-react';
import { sendTestNotification } from '../../utils/testNotification';

const NOTIFICATION_ICONS = {
  profit: '💰',
  validator: '🔷',
  price: '📈',
  liquidation: '⚡',
  bundle: '📦',
  system: '🔔'
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    sound: true,
    browser: true,
    showBadge: true
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('mev_notifications');
    if (stored) setNotifications(JSON.parse(stored));
    
    const storedSettings = localStorage.getItem('mev_notification_settings');
    if (storedSettings) setSettings(JSON.parse(storedSettings));
    
    const handleStorageChange = () => {
      const updated = localStorage.getItem('mev_notifications');
      if (updated) setNotifications(JSON.parse(updated));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('mev_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('mev_notification_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.category === filter;
  });

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAsUnread = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: false } : n
    ));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteAll = () => {
    if (confirm('Delete all notifications?')) {
      setNotifications([]);
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {settings.showBadge && unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col">
          {!showSettings ? (
            <>
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 border-b border-gray-700 flex items-center gap-2 overflow-x-auto">
                {['all', 'unread', 'profit', 'validator', 'price', 'liquidation', 'bundle'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                  <button
                    onClick={deleteAll}
                    className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete all
                  </button>
                </div>
              )}

              <div className="overflow-y-auto flex-1">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors ${
                        !notification.read ? 'bg-gray-800/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{NOTIFICATION_ICONS[notification.category]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-white">{notification.title}</h4>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {getTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                          {notification.action && (
                            <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                              {notification.action}
                            </button>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {!notification.read ? (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Mark read
                              </button>
                            ) : (
                              <button
                                onClick={() => markAsUnread(notification.id)}
                                className="text-xs text-gray-400 hover:text-white"
                              >
                                Mark unread
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Sound Notifications</h4>
                    <p className="text-xs text-gray-400">Play sound for new notifications</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, sound: !settings.sound })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.sound ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.sound ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Browser Notifications</h4>
                    <p className="text-xs text-gray-400">Show browser push notifications</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!settings.browser && Notification.permission === 'default') {
                        Notification.requestPermission().then(permission => {
                          setSettings({ ...settings, browser: permission === 'granted' });
                        });
                      } else {
                        setSettings({ ...settings, browser: !settings.browser });
                      }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.browser ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.browser ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Show Badge Count</h4>
                    <p className="text-xs text-gray-400">Display unread count on bell icon</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showBadge: !settings.showBadge })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.showBadge ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.showBadge ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      sendTestNotification();
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    Send Test Notification
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Test your notification settings
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
