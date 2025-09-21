// Use a fully-qualified Deno std URL so the Supabase CLI bundler can resolve it.
// We import the HTTP server helper from the Deno standard library.
import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

// Simple Supabase Edge Function to forward onboarding events to SendGrid.
// Environment variables required at deploy time:
// - SENDGRID_API_KEY
// - FROM_EMAIL

serve(async (req) => {
  try {
    const body = await req.json();
    const { event, parent_email, status, student_id, student_name, admin_name } = body as any;

    // Prefer RESEND_API_KEY (Resend) — fallback to SENDGRID_API_KEY for backward compatibility
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@example.com';

    if (!RESEND_API_KEY && !SENDGRID_API_KEY)
      return new Response('mail provider API key not configured', { status: 500 });
    if (!parent_email) return new Response('missing parent_email', { status: 400 });

    let subject = '';
    let text = '';

    if (event === 'consent_submitted') {
      subject = `Parent consent received for ${student_name || student_id}`;
      text = `We received a parent consent submission for ${student_name || student_id}. An admin will review shortly.`;
    } else if (event === 'consent_reviewed') {
      subject = `Parent consent ${status} for ${student_name || student_id}`;
      text = `Your child's (${student_name || student_id}) parent consent has been ${status} by ${admin_name || 'an admin'}.`;
    } else if (event === 'system_notification' || event === 'generic') {
      // Allow direct system notifications to pass through subject/text
      subject =
        subject || body?.subject || body?.title || `Notification for ${student_name || student_id}`;
      text =
        text ||
        body?.text ||
        body?.message ||
        `You have a notification regarding ${student_name || student_id}`;
    } else {
      return new Response('unknown event', { status: 400 });
    }

    // If RESEND_API_KEY is present use Resend (recommended). Otherwise fall back to SendGrid.
    if (RESEND_API_KEY) {
      const payload = {
        from: FROM_EMAIL,
        to: [parent_email],
        subject,
        text,
      };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(`resend error: ${errText}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    } else {
      const payload = {
        personalizations: [{ to: [{ email: parent_email }] }],
        from: { email: FROM_EMAIL },
        subject,
        content: [{ type: 'text/plain', value: text }],
      };

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(`sendgrid error: ${errText}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    return new Response('ok');
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
