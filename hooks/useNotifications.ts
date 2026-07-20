import { useState, useEffect, useCallback, useRef, useId } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
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

const ALLOWED_TYPES = new Set<NotificationType>([
  'info',
  'order',
  'repair',
  'trade',
  'promo',
]);

/** Coerce legacy rows (`message`, order_ready, …) into the shape the UI expects. */
function normalizeNotification(raw: Record<string, unknown>): Notification | null {
  const id = raw.id != null ? String(raw.id) : '';
  if (!id) return null;

  const title = String(raw.title ?? '').trim() || 'Notification';
  const body = String(raw.body ?? raw.message ?? '').trim();

  let type = String(raw.type ?? 'info').toLowerCase() as NotificationType;
  if (type.startsWith('order_')) type = 'order';
  if (!ALLOWED_TYPES.has(type)) type = 'info';

  const reference_id =
    raw.reference_id != null
      ? String(raw.reference_id)
      : raw.order_id != null
        ? String(raw.order_id)
        : null;

  return {
    id,
    user_id: String(raw.user_id ?? ''),
    title,
    body,
    type,
    reference_id,
    is_read: Boolean(raw.is_read),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function normalizeList(rows: unknown): Notification[] {
  if (!Array.isArray(rows)) return [];
  const out: Notification[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const n = normalizeNotification(row as Record<string, unknown>);
    if (n) out.push(n);
  }
  return out;
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
  // Unique suffix so Navbar bell + /account/notifications can both subscribe
  // without clobbering the same Realtime channel name.
  const instanceId = useId().replace(/:/g, '');

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured()) {
      setUserId(null);
      setLoading(false);
      return;
    }

    supabase.auth
      .getUser()
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
    if (!userId || !isSupabaseConfigured()) {
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
      setNotifications(normalizeList(data));
    } catch (err: unknown) {
      setError(tradeFriendlyError(err));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchNotifications();
    if (!userId || !isSupabaseConfigured()) return;

    let channel: RealtimeChannel;
    try {
      channel = supabase
        .channel(`notifications-${userId}-${instanceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload: { eventType?: string; new?: unknown; old?: unknown }) => {
            setNotifications((prev) => {
              if (payload.eventType === 'INSERT') {
                const incoming = normalizeNotification(
                  (payload.new || {}) as Record<string, unknown>,
                );
                if (!incoming) return prev;
                if (prev.some((n) => n.id === incoming.id)) return prev;
                return [incoming, ...prev];
              }
              if (payload.eventType === 'UPDATE') {
                const incoming = normalizeNotification(
                  (payload.new || {}) as Record<string, unknown>,
                );
                if (!incoming) return prev;
                return prev.map((n) => (n.id === incoming.id ? incoming : n));
              }
              if (payload.eventType === 'DELETE') {
                const removed = payload.old as { id?: string } | undefined;
                if (!removed?.id) return prev;
                return prev.filter((n) => n.id !== String(removed.id));
              }
              return prev;
            });
          },
        )
        .subscribe();
    } catch (err: unknown) {
      setError(tradeFriendlyError(err));
      return;
    }

    channelRef.current = channel;

    return () => {
      try {
        if (isSupabaseConfigured()) supabase.removeChannel(channel);
      } catch {
        // Ignore Proxy / already-removed channel.
      }
      channelRef.current = null;
    };
  }, [userId, fetchNotifications, instanceId]);

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      if (!userId || !isSupabaseConfigured()) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .eq('user_id', userId);
        if (updateError) {
          setError(tradeFriendlyError(updateError));
          void fetchNotifications();
        }
      } catch (err: unknown) {
        setError(tradeFriendlyError(err));
        void fetchNotifications();
      }
    },
    [userId, fetchNotifications],
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId || !isSupabaseConfigured()) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (updateError) {
        setError(tradeFriendlyError(updateError));
        void fetchNotifications();
      }
    } catch (err: unknown) {
      setError(tradeFriendlyError(err));
      void fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  const removeNotification = useCallback(
    async (id: string): Promise<void> => {
      if (!userId || !isSupabaseConfigured()) return;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      try {
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (deleteError) {
          setError(tradeFriendlyError(deleteError));
          void fetchNotifications();
        }
      } catch (err: unknown) {
        setError(tradeFriendlyError(err));
        void fetchNotifications();
      }
    },
    [userId, fetchNotifications],
  );

  const clearAllNotifications = useCallback(async (): Promise<void> => {
    if (!userId || !isSupabaseConfigured()) return;
    setNotifications([]);
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      if (deleteError) {
        setError(tradeFriendlyError(deleteError));
        void fetchNotifications();
      }
    } catch (err: unknown) {
      setError(tradeFriendlyError(err));
      void fetchNotifications();
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
