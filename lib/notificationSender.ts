/**
 * Outbound notification channels.
 *
 * In-app rows are written by DB triggers (notify_on_*_status).
 * Production fan-out (email + web push) runs via:
 *   - POST /api/notify/email  (Supabase webhook on notifications INSERT)
 *   - POST /api/email/event   (client create path for order/trade/repair)
 *
 * SMS / WhatsApp remain optional ops expansions via trade_config.notification_channel.
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
 * Console / no-op for SMS/WhatsApp until an ops provider is configured.
 * Email + push are handled by the server webhook /api/notify/email — do not
 * duplicate them here from the browser.
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
    if (channel === 'in_app' || channel === 'email') {
      return { ok: true, skipped: true };
    }
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

/** Shared singleton for future SMS/WhatsApp providers */
export const defaultNotificationSender: NotificationSender = new ConsoleNotificationSender();
