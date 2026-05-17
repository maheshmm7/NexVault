import { createContext, useContext, useState, useCallback } from 'react';

const NotificationCenterContext = createContext(null);

const MAX_NOTIFICATIONS = 50;
const STORAGE_KEY = 'notificationInbox';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

export function NotificationCenterProvider({ children }) {
  const [notifications, setNotifications] = useState(() => loadFromStorage());

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
      // Prepend new entry; trim to max cap
      const updated = [entry, ...prev].slice(0, MAX_NOTIFICATIONS);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

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
