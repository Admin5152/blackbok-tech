/**
 * Web Push fan-out for `notifications` rows.
 */
import { isClientHandledCreateTitle, type NotifyEmailPayload } from './notifyEmail';
import { notificationAbsoluteUrl } from './notificationDeepLink';
import { formatServerError } from './serverError';
import { configureWebPushFromEnv, sendWebPushToUser } from './webPushSend';

export async function sendNotificationPush(
  payload: NotifyEmailPayload,
  env = process.env,
  opts?: { force?: boolean },
): Promise<{ sent?: number; failed?: number; skipped?: string; error?: string }> {
  if (!opts?.force && isClientHandledCreateTitle(payload.title)) {
    return { skipped: 'client_handles_create' };
  }

  try {
    configureWebPushFromEnv(env);
  } catch (err) {
    return { skipped: 'vapid_missing', error: formatServerError(err) };
  }

  const title = (payload.title || 'BlackBox').trim();
  const body = (payload.body || '').trim() || 'You have a new update.';
  const url = notificationAbsoluteUrl(payload, env);
  const tag = payload.id
    ? `bb-${payload.id}`
    : `bb-${payload.type || 'info'}-${payload.reference_id || 'general'}`;

  try {
    const result = await sendWebPushToUser(
      payload.user_id,
      { title, body, url, tag },
      env,
    );
    return { sent: result.sent, failed: result.failed };
  } catch (err) {
    return { skipped: 'send_failed', error: formatServerError(err) };
  }
}
