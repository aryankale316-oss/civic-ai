import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import apiClient, { assetBaseURL } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const realtimeIdsRef = useRef(new Set());
  const realtimeNotificationsRef = useRef(new Map());

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      realtimeIdsRef.current.clear();
      realtimeNotificationsRef.current.clear();
      return undefined;
    }

    let active = true;
    const refresh = async () => {
      try {
        const { data } = await apiClient.get('/notifications');
        if (!active) return;
        // Preserve any Socket.IO notifications received while this request was
        // in flight so a slow initial fetch cannot make them disappear.
        const serverIds = new Set(data.notifications.map((item) => item.id));
        const realtimeOnly = [...realtimeNotificationsRef.current.values()]
          .filter((item) => !serverIds.has(item.id));
        const merged = [...realtimeOnly, ...data.notifications].slice(0, 50);
        setNotifications(merged);
        setUnreadCount(Math.max(data.unread_count, merged.filter((item) => !item.is_read).length));
      } catch {
        // Socket.IO and the next polling pass remain available as fallbacks.
      }
    };
    void refresh();

    const token = localStorage.getItem('token');
    const socket = io(assetBaseURL, { auth: { token } });
    socketRef.current = socket;

    socket.on('notification', (notification) => {
      const isNew = !realtimeIdsRef.current.has(notification.id);
      realtimeIdsRef.current.add(notification.id);
      realtimeNotificationsRef.current.set(notification.id, notification);
      setNotifications((prev) => [notification, ...prev.filter((item) => item.id !== notification.id)].slice(0, 50));
      if (isNew && !notification.is_read) setUnreadCount((prev) => prev + 1);
    });
    socket.on('connect', refresh);

    // Keep the bell current if a browser blocks Socket.IO or briefly loses its
    // connection; notifications are persisted in PostgreSQL.
    const intervalId = window.setInterval(refresh, 30000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const realtimeItem = realtimeNotificationsRef.current.get(id);
    if (realtimeItem) realtimeNotificationsRef.current.set(id, { ...realtimeItem, is_read: true });
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // Best-effort — local state is already optimistically updated.
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    realtimeNotificationsRef.current = new Map(
      [...realtimeNotificationsRef.current].map(([id, item]) => [id, { ...item, is_read: true }])
    );
    setUnreadCount(0);
    try {
      await apiClient.patch('/notifications/read-all');
    } catch {
      // Best-effort — local state is already optimistically updated.
    }
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
