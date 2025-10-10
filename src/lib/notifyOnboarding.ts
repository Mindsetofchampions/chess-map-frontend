type Event = 'consent_submitted' | 'consent_reviewed';

/**
 * Send onboarding-related notifications to admins/parents.
 *
 * Tries Supabase Edge Function first (supabase.functions.invoke),
 * then falls back to a Netlify function path if configured.
 */
export async function notifyOnboarding(event: Event, payload: Record<string, any>) {
  try {
    // Prefer Supabase Edge Functions when available; this automatically includes auth headers
    // and respects VITE_SUPABASE_URL from the configured client.
    const { supabase } = await import('@/lib/supabase');
    if (supabase?.functions?.invoke) {
      const resp = await supabase.functions.invoke('send_onboarding_notification', {
        body: { event, ...payload },
      });
      if (resp.error) throw new Error(resp.error.message || 'functions.invoke failed');
      return true;
    }
  } catch (e) {
    // fall through to Netlify path
    console.warn('notifyOnboarding: Supabase function invoke failed, trying Netlify path', e);
  }

  try {
    const base = (import.meta as any).env?.VITE_FUNCTIONS_BASE || '/.netlify/functions';
    const url = `${base}/send_onboarding_notification`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
    });
    if (!res.ok) throw new Error(`notify failed: ${await res.text()}`);
    return true;
  } catch (err) {
    console.warn('notifyOnboarding error (fallback)', err);
    return false;
  }
}
