// Notifications hook

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/api';
import type { Notification } from '@/types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getAll();
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId?: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      if (notificationId) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    refresh,
  };
}
