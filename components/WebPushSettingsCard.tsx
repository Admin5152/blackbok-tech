/**
 * Enable browser Web Push + send a self-test notification.
 * Push is on by default for signed-in users (App auto-enables unless opted out).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Send } from 'lucide-react';
import {
  disableWebPush,
  enableWebPush,
  ensureWebPushEnabledByDefault,
  getExistingPushSubscription,
  getVapidPublicKey,
  isWebPushSupported,
  requestTestWebPush,
} from '../lib/webPushClient';

type Props = {
  isLight: boolean;
  signedIn: boolean;
};

export function WebPushSettingsCard({ isLight, signedIn }: Props) {
  const [supported] = useState(() => isWebPushSupported());
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasVapid = Boolean(getVapidPublicKey());

  const refresh = useCallback(async () => {
    if (!supported) {
      setEnabled(false);
      return;
    }
    try {
      const sub = await getExistingPushSubscription();
      setEnabled(Boolean(sub));
    } catch {
      setEnabled(false);
    }
  }, [supported]);

  useEffect(() => {
    if (!signedIn || !supported || !hasVapid) {
      void refresh();
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await ensureWebPushEnabledByDefault();
      if (cancelled) return;
      if (result === 'enabled') {
        setEnabled(true);
        setMessage('Browser notifications are on for this device.');
      } else {
        await refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, supported, hasVapid, refresh]);

  const onEnable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await enableWebPush();
      setEnabled(true);
      setMessage('Browser push enabled for this device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await disableWebPush();
      setEnabled(false);
      setMessage('Browser push disabled on this device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!enabled) await enableWebPush();
      const result = await requestTestWebPush();
      setEnabled(true);
      setMessage(
        result.sent > 0
          ? `Test push sent (${result.sent}). Check your system notifications.`
          : 'No subscription delivered — try enabling again.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) return null;

  const card = isLight
    ? 'rounded-2xl border border-black/10 bg-black/[0.02] p-4 space-y-3'
    : 'rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3';
  const muted = isLight ? 'text-black/55' : 'text-white/55';

  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-[#CDA032]/15 p-2 text-[#CDA032]">
          <BellRing size={16} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-black tracking-tight">Browser notifications</p>
          <p className={`text-xs leading-relaxed ${muted}`}>
            On by default when you sign in — order, repair, and trade updates on this device,
            even when the BlackBox tab is closed. You can turn them off anytime.
          </p>
        </div>
      </div>

      {!supported && (
        <p className="text-xs text-red-500">This browser does not support Web Push.</p>
      )}
      {supported && !hasVapid && (
        <p className="text-xs text-amber-600">
          Push is not configured yet. An admin must run <code className="text-[10px]">npm run generate:vapid</code> and set{' '}
          <code className="text-[10px]">VITE_VAPID_PUBLIC_KEY</code>.
        </p>
      )}

      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      {message && <p className={`text-xs ${muted}`}>{message}</p>}

      <div className="flex flex-wrap gap-2">
        {!enabled ? (
          <button
            type="button"
            disabled={busy || !supported || !hasVapid}
            onClick={() => void onEnable()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#CDA032] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
            Turn on notifications
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDisable()}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 ${
              isLight ? 'border-black/15' : 'border-white/15'
            }`}
          >
            Disable
          </button>
        )}
        <button
          type="button"
          disabled={busy || !supported || !hasVapid}
          onClick={() => void onTest()}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-40 ${
            isLight ? 'border-black/15' : 'border-white/15'
          }`}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Send test
        </button>
      </div>
    </div>
  );
}
