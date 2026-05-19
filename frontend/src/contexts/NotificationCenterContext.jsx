import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationCenterContext = createContext(null);

export function NotificationCenterProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Fetch from DB
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      const mapped = res.data.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        isRead: n.is_read
      }));
      setNotifications(mapped);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  const addNotification = useCallback(async ({ type, title, message }) => {
    if (!user) return;
    try {
      await api.post('/notifications', { type, title, message });
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to add notification:", err);
    }
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    if (!user) return;
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  }, [user]);

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
        refresh: fetchNotifications
      }}
    >
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  return useContext(NotificationCenterContext);
}
