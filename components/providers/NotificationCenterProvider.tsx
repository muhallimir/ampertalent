'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getImpersonationSession } from '@/lib/admin-impersonation';
import { useUserProfile } from '@/hooks/useUserProfile';

export interface SeekerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp?: string;
  createdAt?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
}

interface NotificationCenterContextValue {
  notifications: SeekerNotification[];
  unreadCount: number;
  isLoading: boolean;
  hasLoaded: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  updateNotifications: (updater: (prev: SeekerNotification[]) => SeekerNotification[]) => void;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | undefined>(undefined);

const buildHeaders = (includeJson = false): HeadersInit => {
  const headers: HeadersInit = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (typeof window !== 'undefined') {
    const impersonationSession = getImpersonationSession();
    if (impersonationSession) {
      headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id;
      headers['x-admin-user-id'] = impersonationSession.adminId;
    }
  }

  return headers;
};

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUserProfile();
  const [notifications, setNotifications] = useState<SeekerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const latestNotificationIdRef = useRef<string | null>(null);
  const lastUnreadCountRef = useRef<number>(0);
  const notificationsRef = useRef<SeekerNotification[]>([]);

  const refreshNotifications = useCallback(
    async (options?: { showSpinner?: boolean; showToastOnNew?: boolean }) => {
      const showSpinner = options?.showSpinner ?? false;
      // const showToastOnNew = options?.showToastOnNew ?? false;

      if (!profile?.id || profile.role !== 'seeker') {
        setHasLoaded(true);
        setNotifications([]);
        setUnreadCount(0);
        latestNotificationIdRef.current = null;
        lastUnreadCountRef.current = 0;
        return;
      }

      if (showSpinner) {
        setIsLoading(true);
      }

      try {
        const response = await fetch('/api/seeker/notifications', {
          headers: buildHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          const nextNotifications = data.notifications || [];
          const nextUnreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : 0;

          setNotifications(nextNotifications);
          notificationsRef.current = nextNotifications;
          setUnreadCount(nextUnreadCount);

          const newestId = nextNotifications[0]?.id ?? null;
          // const hadPrevious = Boolean(latestNotificationIdRef.current);
          // const hasNew = Boolean(newestId && latestNotificationIdRef.current && newestId !== latestNotificationIdRef.current);
          latestNotificationIdRef.current = newestId;
          lastUnreadCountRef.current = nextUnreadCount;
        }
      } catch (error) {
        console.error('Error refreshing seeker notifications:', error);
      } finally {
        if (showSpinner) {
          setIsLoading(false);
        }
        setHasLoaded(true);
      }
    },
    [profile?.id, profile?.role],
  );

  useEffect(() => {
    refreshNotifications({ showSpinner: true });
  }, [refreshNotifications]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!notificationId) return false;

    try {
      const response = await fetch('/api/seeker/notifications', {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify({ notificationId, markAsRead: true }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      setNotifications((prev) => prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)));
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/seeker/notifications', {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount(0);
      }
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }, []);

  const updateNotifications = useCallback((updater: (prev: SeekerNotification[]) => SeekerNotification[]) => {
    setNotifications((prev) => updater(prev));
  }, []);

  const handleRealtimeSync = useCallback(() => {
    refreshNotifications({ showToastOnNew: true });
  }, [refreshNotifications]);

  // Universal handler: any realTimeNotification event triggers a refresh,
  // covering all current and future notification types automatically.
  useEffect(() => {
    window.addEventListener('realTimeNotification', handleRealtimeSync as EventListener);
    return () => window.removeEventListener('realTimeNotification', handleRealtimeSync as EventListener);
  }, [handleRealtimeSync]);

  const value = useMemo<NotificationCenterContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      hasLoaded,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      updateNotifications,
    }),
    [notifications, unreadCount, isLoading, hasLoaded, refreshNotifications, markAsRead, markAllAsRead, updateNotifications],
  );

  useEffect(() => {
    const handleToastClick = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      const toastNotificationId = detail?.data?.notificationId;

      const targetId = toastNotificationId || notificationsRef.current.find((notif) => !notif.read)?.id;

      if (targetId) {
        markAsRead(targetId);
      }
    };

    window.addEventListener('realTimeToastClick', handleToastClick as EventListener);
    return () => window.removeEventListener('realTimeToastClick', handleToastClick as EventListener);
  }, [markAsRead]);

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationCenterProvider');
  }
  return context;
}
