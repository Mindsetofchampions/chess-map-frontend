type Event = 'consent_submitted' | 'consent_reviewed';

export async function notifyOnboarding(event: Event, payload: Record<string, any>) {
  // The Edge Function is expected to be deployed at this relative path in Supabase Functions
  // When running locally with `supabase start` or deployed, set FUNCTION_BASE or call full URL.
  const FUNCTION_BASE =
    (process.env.REACT_APP_SUPABASE_FUNCTIONS_URL as string) || '/.netlify/functions';

  try {
    const url = `${FUNCTION_BASE}/send_onboarding_notification`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
    });
    if (!res.ok) throw new Error(`notify failed: ${await res.text()}`);
    return true;
  } catch (err) {
    console.warn('notifyOnboarding error', err);
    return false;
  }
}
