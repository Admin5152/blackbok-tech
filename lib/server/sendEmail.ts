/**
 * Server-only email send via Resend.
 * Never import this from browser/React code.
 */
import { Resend } from 'resend';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export function getEmailFrom(env = process.env): string {
  return (
    env.EMAIL_FROM?.trim() ||
    'BlackBox <noreply@blackboxghana.com>'
  );
}

export function getAdminInbox(env = process.env): string {
  return (
    env.EMAIL_TO?.trim() ||
    env.ADMIN_EMAIL?.trim() ||
    'gadielmenz@gmail.com'
  );
}

export async function sendEmail(
  input: SendEmailInput,
  env = process.env,
): Promise<{ id: string }> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY in environment.');
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: getEmailFrom(env),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  if (error) {
    throw new Error(error.message || 'Resend send failed');
  }
  if (!data?.id) {
    throw new Error('Resend returned no email id');
  }
  return { id: data.id };
}
