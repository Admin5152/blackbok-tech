/** Public support channels for BlackBox Ghana */
export const SUPPORT_EMAIL = 'blackboxxxghana@gmail.com';

/** Digits only (no +) for wa.me links — Ghana 0543033659 → 233543033659 */
export const WHATSAPP_NUMBER = '233543033659';

export const WHATSAPP_DISPLAY = '+233 543 033 659';

export const SUPPORT_PHONE_TEL = `+${WHATSAPP_NUMBER}`;

export function whatsAppUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function mailtoSupport(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject?.trim()) params.set('subject', subject.trim());
  if (body?.trim()) params.set('body', body.trim());
  const q = params.toString();
  return q ? `mailto:${SUPPORT_EMAIL}?${q}` : `mailto:${SUPPORT_EMAIL}`;
}
