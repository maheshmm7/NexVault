import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationCenterContext = createContext(null);

const MAX_NOTIFICATIONS = 50;

export function NotificationCenterProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Dynamically partition browser notifications based on the authenticated user ID
  const storageKey = user ? `notificationInbox_${user.id}` : 'notificationInbox';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setNotifications(raw ? JSON.parse(raw) : []);
    } catch {
      setNotifications([]);
    }
  }, [storageKey]);

  const addNotification = useCallback(({ type, title, message }) => {
    const entry = {
      id: Date.now().toString(),
      type: type || 'info',
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setNotifications(prev => {
      const updated = [entry, ...prev].slice(0, MAX_NOTIFICATIONS);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [storageKey]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [storageKey]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [storageKey]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationCenterContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        unreadCount,
      }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  return useContext(NotificationCenterContext);
}
