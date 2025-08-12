import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

export class EnvMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvMissingError';
  }
}

export const envStatus = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const ok = Boolean(url && key);
  return { ok, url, key } as const;
})();

let supabase: SupabaseClient | null = null;

if (envStatus.ok) {
  supabase = createClient(envStatus.url!, envStatus.key!, {
    auth: { persistSession: true, flowType: 'pkce' },
  });
} else {
  supabase = new Proxy({} as SupabaseClient, {
    get() {
      throw new EnvMissingError(
        'Missing Supabase environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    },
  });
}

export async function awaitReadySession(client: SupabaseClient = supabase!): Promise<Session | null> {
  try {
    const { data } = await client.auth.getSession();
    if (data?.session) {
      window.dispatchEvent(new CustomEvent('auth:ready', { detail: { session: data.session } }));
      return data.session;
    }
  } catch {}

  return new Promise<Session | null>((resolve) => {
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
      window.dispatchEvent(new CustomEvent('auth:ready', { detail: { session } }));
      resolve(session);
      setTimeout(() => sub.subscription.unsubscribe(), 0);
    });
    setTimeout(() => {
      try { sub.subscription.unsubscribe(); } catch {}
      resolve(null);
    }, 2500);
  });
}

export default supabase!;
