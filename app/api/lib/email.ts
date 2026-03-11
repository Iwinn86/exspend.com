import { Resend } from 'resend';

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email disabled] Would have sent:', payload.subject, 'to', payload.to);
    return true;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.FROM_EMAIL ?? 'Exspend <noreply@exspend.com>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return true;
  } catch (err) {
    console.error('[Email error]', err);
    return false;
  }
}