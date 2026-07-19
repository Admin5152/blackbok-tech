import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { tradeFriendlyError } from '../lib/tradeErrors';

export type NotificationType = 'info' | 'order' | 'repair' | 'trade' | 'promo';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Reads the current user's notifications and subscribes to realtime changes.
 *
 * RLS is expected to scope reads to `auth.uid() = user_id`; the explicit
 * `.eq('user_id', userId)` filter below is defensive and also drives the
 * realtime filter so the channel only fires for this user's rows.
 */
export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Track the current authenticated user. Re-runs on sign-in/sign-out so the
  // subscription and query stay in sync without forcing a page reload.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setNotifications((data ?? []) as Notification[]);
    } catch (err: unknown) {
      setError(tradeFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch + subscribe whenever the user changes. The cleanup runs on every
  // user change AND on unmount, so the channel never leaks.
  useEffect(() => {
    fetchNotifications();
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          setNotifications((prev) => {
            if (payload.eventType === 'INSERT') {
              const incoming = payload.new as Notification;
              if (prev.some((n) => n.id === incoming.id)) return prev;
              return [incoming, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              const incoming = payload.new as Notification;
              return prev.map((n) => (n.id === incoming.id ? incoming : n));
            }
            if (payload.eventType === 'DELETE') {
              const removed = payload.old as Pick<Notification, 'id'>;
              return prev.filter((n) => n.id !== removed.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // The client is a Proxy when env vars are missing; ignore.
      }
      channelRef.current = null;
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    if (!userId) return;
    // Optimistic update so the badge reacts instantly.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (updateError) {
      setError(updateError.message);
      // Fall back to truth on failure.
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (updateError) {
      setError(updateError.message);
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  const removeNotification = useCallback(async (id: string): Promise<void> => {
    if (!userId) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const { error: deleteError } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId);
    if (deleteError) {
      setError(deleteError.message);
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  const clearAllNotifications = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setNotifications([]);
    const { error: deleteError } = await supabase.from('notifications').delete().eq('user_id', userId);
    if (deleteError) {
      setError(deleteError.message);
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  const unreadCount = notifications.reduce((count, n) => count + (n.is_read ? 0 : 1), 0);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    refetch: fetchNotifications,
  };
}
