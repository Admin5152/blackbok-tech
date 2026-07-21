/**
 * Deliver a notification across outbound channels (email + web push).
 * In-app rows are already persisted by DB triggers before the webhook runs.
 */
import {
  sendNotificationEmails,
  type DirectEmailEvent,
  type NotifyEmailPayload,
} from './notifyEmail';
import { sendNotificationPush } from './notifyPush';

export type FanoutResult = {
  email: Awaited<ReturnType<typeof sendNotificationEmails>> & { error?: string };
  push: Awaited<ReturnType<typeof sendNotificationPush>> & { error?: string };
};

export async function deliverNotificationChannels(
  payload: NotifyEmailPayload,
  env = process.env,
  opts?: { force?: boolean; customerEmail?: string | null },
): Promise<FanoutResult> {
  const email: FanoutResult['email'] = {};
  const push: FanoutResult['push'] = {};

  try {
    Object.assign(email, await sendNotificationEmails(payload, env, opts));
  } catch (err) {
    email.error = err instanceof Error ? err.message : String(err);
  }

  try {
    Object.assign(push, await sendNotificationPush(payload, env, opts));
  } catch (err) {
    push.error = err instanceof Error ? err.message : String(err);
  }

  return { email, push };
}

/** Client create path — email + push (webhook skips these titles to avoid dupes). */
export async function sendDirectLifecycleNotify(
  event: DirectEmailEvent,
  opts: {
    userId: string;
    displayId?: string | null;
    referenceId?: string | null;
    extraBody?: string;
    customerEmail?: string | null;
  },
  env = process.env,
): Promise<FanoutResult> {
  const ref = (opts.displayId || '').trim() || 'your request';
  const map: Record<
    DirectEmailEvent,
    { type: string; title: string; body: string }
  > = {
    order_placed: {
      type: 'order',
      title: 'Order received',
      body: `We received order ${ref} and will process it shortly.${opts.extraBody ? ` ${opts.extraBody}` : ''}`,
    },
    trade_submitted: {
      type: 'trade',
      title: 'Trade-in received',
      body: `We received your trade-in request ${ref}.${opts.extraBody ? ` ${opts.extraBody}` : ''}`,
    },
    repair_submitted: {
      type: 'repair',
      title: 'Repair request received',
      body: `We received your repair request ${ref}.${opts.extraBody ? ` ${opts.extraBody}` : ''}`,
    },
  };

  const row = map[event];
  return deliverNotificationChannels(
    {
      user_id: opts.userId,
      title: row.title,
      body: row.body,
      type: row.type,
      reference_id: opts.referenceId ? String(opts.referenceId) : null,
    },
    env,
    { force: true, customerEmail: opts.customerEmail },
  );
}
