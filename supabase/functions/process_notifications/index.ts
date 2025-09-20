// @ts-nocheck
// The following import is for Deno runtime. TypeScript in the editor may not resolve
// Deno std modules; ignore type checks for this file to avoid false positives.
// deno-lint-ignore-file no-explicit-any
// @ts-ignore - Deno std import
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";

// Edge Function: process unprocessed notifications and send emails via Resend or SendGrid
// Environment variables required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (or a key with write access to system_notifications)
// - RESEND_API_KEY or SENDGRID_API_KEY
// - FROM_EMAIL

// Deno global in runtime; declare for editors that don't know Deno.
declare const Deno: any;

const SUPABASE_URL = Deno?.env?.get('SUPABASE_URL') as string;
const SUPABASE_KEY = Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const RESEND_API_KEY = Deno?.env?.get('RESEND_API_KEY');
const SENDGRID_API_KEY = Deno?.env?.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno?.env?.get('FROM_EMAIL') || 'no-reply@example.com';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

async function fetchUnprocessed() {
  const url = `${SUPABASE_URL}/rest/v1/system_notifications?processed=eq.false&select=*`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error('Failed to fetch notifications: ' + await res.text());
  return res.json();
}

async function markProcessed(id: string) {
  const url = `${SUPABASE_URL}/rest/v1/system_notifications?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ processed: true, processed_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error('Failed to mark processed: ' + await res.text());
  return res.json();
}

async function sendEmail(to: string, subject: string, text: string) {
  if (RESEND_API_KEY) {
    const payload = { from: FROM_EMAIL, to: [to], subject, text };
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Resend send failed: ' + await res.text());
    return;
  }
  if (SENDGRID_API_KEY) {
    const payload = { personalizations: [{ to: [{ email: to }] }], from: { email: FROM_EMAIL }, subject, content: [{ type: 'text/plain', value: text }] };
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('SendGrid send failed: ' + await res.text());
    return;
  }
  throw new Error('No mail provider configured');
}

serve(async (req: Request) => {
  try {
    const rows = await fetchUnprocessed();
    for (const r of rows) {
      try {
        // extract recipient from metadata
        const meta = r.metadata || {};
        const parentEmail = meta.parent_email || meta.to || null;
        if (!parentEmail) {
          await markProcessed(r.id);
          continue;
        }
        const subject = r.title || 'Notification from CHESS Quest';
        const body = r.body || (meta && meta.message) || 'You have a new notification';
        await sendEmail(parentEmail, subject, body);
        await markProcessed(r.id);
      } catch (err) {
        console.error('Failed processing notification', r.id, err);
        // leave unprocessed for retry; optionally set a retry count in metadata
      }
    }
    return new Response('processed', { status: 200 });
  } catch (err) {
    console.error('Process notifications failed', err);
    return new Response(String(err), { status: 500 });
  }
});
