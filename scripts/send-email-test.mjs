/**
 * Send a test email with Resend.
 *
 * Prerequisites:
 *   - RESEND_API_KEY in .env
 *   - Domain blackboxghana.com Verified in Resend (or EMAIL_FROM=…@resend.dev for sandbox)
 *
 *   npm run test:email
 *   npm run test:email -- someone@example.com
 */

import { Resend } from 'resend';

const to = (process.argv[2] || process.env.EMAIL_TO || process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();

const apiKey = (process.env.RESEND_API_KEY || '').trim();
const from =
  (process.env.EMAIL_FROM || 'BlackBox <noreply@blackboxghana.com>').trim();

if (!apiKey) {
  console.error('Missing RESEND_API_KEY in .env');
  process.exit(1);
}
if (!to) {
  console.error('Usage: npm run test:email -- you@email.com');
  process.exit(1);
}

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: 'BlackBox email test',
  html: `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5;">
      <h2 style="color:#B38B21;margin:0 0 12px;">BlackBox Tech</h2>
      <p>This is a test email from your Node / Resend setup.</p>
      <p>If you received this at <strong>${to}</strong>, sending works.</p>
      <p style="color:#666;font-size:12px;">From: ${from}</p>
    </div>
  `,
  text: `BlackBox Tech — test email. If you got this at ${to}, sending works. From: ${from}`,
});

if (error) {
  console.error('Send failed:', error.message);
  console.error(
    'If the error mentions domain verification, finish DNS in Resend → Domains → blackboxghana.com, then retry.\n' +
      'For a quick sandbox test, set EMAIL_FROM=BlackBox <onboarding@resend.dev> (can only send to your Resend account email).',
  );
  process.exit(1);
}

console.log('Sent OK. id=', data?.id);
console.log('Check inbox:', to);
