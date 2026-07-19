/**
 * Outbound notification channels (SMS / WhatsApp / email).
 *
 * Role in flow: in-app rows are written by DB triggers (notify_on_trade_status).
 * This interface is the expansion point for ops providers — wired later via
 * Database Webhook on `notifications` INSERT or an Edge Function fan-out.
 *
 * Channel selection reads `trade_config.notification_channel` when present.
 */
import { getTradeConfigValue } from './tradeApi';

export type NotificationChannel = 'in_app' | 'sms' | 'whatsapp' | 'email';

export interface OutboundNotificationPayload {
  userId: string;
  title: string;
  body: string;
  /** trade | order | repair | … */
  type: string;
  referenceId?: string | null;
  /** Destination phone/email when channel needs it */
  to?: string | null;
}

export interface NotificationSender {
  /** Preferred channel(s) from ops config */
  resolveChannel(): Promise<NotificationChannel>;
  /** Best-effort send; must never throw into customer UX */
  send(payload: OutboundNotificationPayload): Promise<{ ok: boolean; skipped?: boolean }>;
}

/**
 * Console / no-op sender until an ops provider is configured.
 * TODO(ops): provider pending — plug Twilio / WhatsApp Business / Resend here.
 */
export class ConsoleNotificationSender implements NotificationSender {
  async resolveChannel(): Promise<NotificationChannel> {
    const raw = (await getTradeConfigValue('notification_channel', 'in_app')).toLowerCase();
    if (raw === 'sms' || raw === 'whatsapp' || raw === 'email' || raw === 'in_app') {
      return raw;
    }
    return 'in_app';
  }

  async send(payload: OutboundNotificationPayload): Promise<{ ok: boolean; skipped?: boolean }> {
    const channel = await this.resolveChannel();
    // In-app is already persisted by the SQL trigger — skip duplicate delivery.
    if (channel === 'in_app') {
      return { ok: true, skipped: true };
    }
    // TODO(ops): provider pending — replace console with real SMS/WhatsApp/email.
    console.info('[NotificationSender]', channel, {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      referenceId: payload.referenceId,
      to: payload.to ?? null,
    });
    return { ok: true, skipped: true };
  }
}

/** Shared singleton for future webhook / Edge Function callers */
export const defaultNotificationSender: NotificationSender = new ConsoleNotificationSender();
