import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useAppContext } from '../App';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeReturnTo, saveReturnTo } from '../lib/returnTo';
import {
  IDLE_TIMEOUT_MS,
  ACTIVITY_THROTTLE_MS,
  IDLE_CHECK_INTERVAL_MS,
  SESSION_IDLE_STORAGE_KEY,
  SESSION_IDLE_BROADCAST_CHANNEL,
  SESSION_IDLE_FORCE_LOGOUT_KEY,
  SESSION_EXPIRED_REASON,
  APP_USER_STORAGE_KEY,
  MANUAL_SIGNOUT_FLAG,
} from '../lib/sessionIdleConfig';

type IdleBroadcastMessage =
  | { type: 'activity'; lastActivity: number; tabId: string }
  | { type: 'force_logout'; tabId: string; returnTo?: string };

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

function readStoredLastActivity(): number {
  if (typeof window === 'undefined') return Date.now();
  try {
    const raw = localStorage.getItem(SESSION_IDLE_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

function writeStoredLastActivity(timestamp: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_IDLE_STORAGE_KEY, String(timestamp));
  } catch {
    /* storage unavailable */
  }
}

function clearStoredLastActivity(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_IDLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function clearForceLogoutFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_IDLE_FORCE_LOGOUT_KEY);
  } catch {
    /* ignore */
  }
}

function buildAuthRedirect(returnTo: string): string {
  const safeReturn = sanitizeReturnTo(returnTo) ?? '/';
  saveReturnTo(safeReturn);
  return `/auth?reason=${SESSION_EXPIRED_REASON}&returnTo=${encodeURIComponent(safeReturn)}`;
}

function buildReturnToFromLocation(pathname: string, search: unknown): string {
  const path = pathname || '/';
  if (search && typeof search === 'object' && !Array.isArray(search)) {
    const entries = Object.entries(search as Record<string, unknown>).filter(
      ([, value]) => value != null && value !== '',
    );
    if (entries.length > 0) {
      const qs = new URLSearchParams(
        entries.map(([key, value]) => [key, String(value)]),
      ).toString();
      if (qs) return `${path}?${qs}`;
    }
  }
  return path;
}

/**
 * Strict 12-minute idle logout with cross-tab activity sync.
 *
 * Timing guarantee: logout fires when `Date.now() - lastActivity >= IDLE_TIMEOUT_MS`
 * (± IDLE_CHECK_INTERVAL_MS poll tolerance), regardless of Supabase JWT refresh.
 *
 * Mount once at the authenticated app root via `SessionTimeoutProvider`.
 */
export function useIdleLogout(): void {
  const { user, authReady, setUser, navigateTo } = useAppContext();
  const location = useLocation();

  const lastActivityRef = useRef<number>(Date.now());
  const lastLocalResetRef = useRef<number>(0);
  const loggingOutRef = useRef(false);
  const tabIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const channelRef = useRef<BroadcastChannel | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authUnsubRef = useRef<(() => void) | null>(null);

  const isAuthenticated = authReady && !!user;

  const getReturnTo = useCallback((): string => {
    return buildReturnToFromLocation(location.pathname, location.search);
  }, [location.pathname, location.search]);

  const performIdleSignOut = useCallback(
    async (returnTo?: string, source: 'local' | 'remote' = 'local') => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      const safeReturn = sanitizeReturnTo(returnTo) ?? sanitizeReturnTo(getReturnTo()) ?? '/';

      try {
        localStorage.removeItem(APP_USER_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setUser(null);

      if (source === 'local') {
        try {
          localStorage.setItem(SESSION_IDLE_FORCE_LOGOUT_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }

        try {
          channelRef.current?.postMessage({
            type: 'force_logout',
            tabId: tabIdRef.current,
            returnTo: safeReturn,
          } satisfies IdleBroadcastMessage);
        } catch {
          /* ignore */
        }

        if (isSupabaseConfigured()) {
          try {
            await getSupabaseClient().auth.signOut();
          } catch {
            /* network failure — local state already cleared */
          }
        }
      }

      clearStoredLastActivity();
      navigateTo(buildAuthRedirect(safeReturn));
    },
    [getReturnTo, navigateTo, setUser],
  );

  const performIdleSignOutRef = useRef(performIdleSignOut);
  performIdleSignOutRef.current = performIdleSignOut;

  const recordActivity = useCallback(
    (timestamp: number, fromLocal: boolean) => {
      if (!isAuthenticated || loggingOutRef.current) return;
      if (timestamp <= lastActivityRef.current) return;

      if (fromLocal) {
        const now = Date.now();
        if (now - lastLocalResetRef.current < ACTIVITY_THROTTLE_MS) return;
        lastLocalResetRef.current = now;
      }

      lastActivityRef.current = timestamp;
      writeStoredLastActivity(timestamp);

      if (fromLocal) {
        try {
          channelRef.current?.postMessage({
            type: 'activity',
            lastActivity: timestamp,
            tabId: tabIdRef.current,
          } satisfies IdleBroadcastMessage);
        } catch {
          /* ignore */
        }
      }
    },
    [isAuthenticated],
  );

  const recordActivityRef = useRef(recordActivity);
  recordActivityRef.current = recordActivity;

  const checkIdle = useCallback(() => {
    if (!isAuthenticated || loggingOutRef.current) return;
    if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
      void performIdleSignOutRef.current();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isAuthenticated) {
      loggingOutRef.current = false;
      return;
    }

    loggingOutRef.current = false;

    const now = Date.now();
    const stored = readStoredLastActivity();
    lastActivityRef.current = Math.max(stored, now);
    lastLocalResetRef.current = 0;
    writeStoredLastActivity(lastActivityRef.current);

    const onLocalActivity = () => recordActivityRef.current(Date.now(), true);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivityRef.current(Date.now(), true);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_IDLE_STORAGE_KEY && event.newValue) {
        const ts = Number(event.newValue);
        if (Number.isFinite(ts)) recordActivityRef.current(ts, false);
        return;
      }
      if (event.key === SESSION_IDLE_FORCE_LOGOUT_KEY && event.newValue) {
        void performIdleSignOutRef.current(undefined, 'remote');
      }
    };

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(SESSION_IDLE_BROADCAST_CHANNEL);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<IdleBroadcastMessage>) => {
        const msg = event.data;
        if (!msg || msg.tabId === tabIdRef.current) return;
        if (msg.type === 'activity') {
          recordActivityRef.current(msg.lastActivity, false);
        } else if (msg.type === 'force_logout') {
          void performIdleSignOutRef.current(msg.returnTo, 'remote');
        }
      };
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onLocalActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    if (isSupabaseConfigured()) {
      const { data: sub } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          loggingOutRef.current = false;
          clearForceLogoutFlag();
          const ts = Date.now();
          lastActivityRef.current = ts;
          writeStoredLastActivity(ts);
          return;
        }

        if (event !== 'SIGNED_OUT') return;
        if (loggingOutRef.current) return;

        try {
          if (sessionStorage.getItem(MANUAL_SIGNOUT_FLAG)) {
            sessionStorage.removeItem(MANUAL_SIGNOUT_FLAG);
            setUser(null);
            clearStoredLastActivity();
            clearForceLogoutFlag();
            return;
          }
        } catch {
          /* ignore */
        }

        const idleFlag = (() => {
          try {
            return localStorage.getItem(SESSION_IDLE_FORCE_LOGOUT_KEY);
          } catch {
            return null;
          }
        })();

        setUser(null);
        try {
          localStorage.removeItem(APP_USER_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        clearStoredLastActivity();

        if (idleFlag && location.pathname !== '/auth') {
          loggingOutRef.current = true;
          clearForceLogoutFlag();
          navigateTo(buildAuthRedirect(getReturnTo()));
        }
      });
      authUnsubRef.current = () => sub.subscription.unsubscribe();
    }

    checkIntervalRef.current = setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onLocalActivity);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
      channel?.close();
      channelRef.current = null;
      authUnsubRef.current?.();
      authUnsubRef.current = null;
    };
  }, [checkIdle, getReturnTo, isAuthenticated, location.pathname, navigateTo, setUser]);
}
