/**
 * Sends the public contact form to your inbox via Web3Forms
 * (https://web3forms.com). Create a free access key, add the destination
 * email in their dashboard, then set VITE_WEB3FORMS_ACCESS_KEY in .env.
 */
export type ContactFormPayload = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export async function sendContactFormEmail(
  payload: ContactFormPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const accessKey = (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined)?.trim();
  if (!accessKey) {
    return {
      ok: false,
      error:
        'Contact email is not configured yet. Add VITE_WEB3FORMS_ACCESS_KEY to your environment (e.g. `.env.local`).',
    };
  }

  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: accessKey,
      subject: `[BlackBox contact] ${payload.subject}`,
      from_name: payload.name,
      name: payload.name,
      email: payload.email,
      replyto: payload.email,
      phone: payload.phone || undefined,
      message: [
        `Subject: ${payload.subject}`,
        '',
        payload.message,
        '',
        `— Sent from the website contact form (${payload.email})`,
      ].join('\n'),
    }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  if (!res.ok || data.success === false) {
    const msg =
      (typeof data.message === 'string' && data.message) ||
      'Could not send your message. Please try again in a moment.';
    return { ok: false, error: msg };
  }

  return { ok: true };
}
