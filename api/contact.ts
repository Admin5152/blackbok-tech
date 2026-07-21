/**
 * Public contact form — confirmation email to the customer.
 * Staff still receive the message via WhatsApp (opened by the Contact page).
 * POST /api/contact
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendContactConfirmationToCustomer } from '../lib/server/notifyEmail';
import { parseRequestBody } from '../lib/server/parseRequestBody';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseRequestBody(req.body);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'Name, email, subject, and message are required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    const sent = await sendContactConfirmationToCustomer(
      { name, email, subject, message },
      process.env,
    );
    res.status(200).json({ ok: true, id: sent.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/contact]', message);
    res.status(500).json({ error: message });
  }
}
