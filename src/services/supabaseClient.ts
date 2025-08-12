import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

export class EnvMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvMissingError';
  }
}

/**
 * Environment status checker
 */
export const envStatus = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const ok = Boolean(url && key && !url.includes('YOUR_') && !key.includes('YOUR_'));
  return { ok, url, key } as const;
})();

/**
 * Supabase client instance
 */
let supabase: SupabaseClient;

if (envStatus.ok) {
  supabase = createClient(envStatus.url!, envStatus.key!, {
    auth: { 
      persistSession: true, 
      flowType: 'pkce',
      autoRefreshToken: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
} else {
  supabase = new Proxy({} as SupabaseClient, {
    get() {
      throw new EnvMissingError(
        'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      );
    },
  });
}

/**
 * Check if environment is properly configured
 */
export function isEnvReady(): boolean {
  return envStatus.ok;
}

/**
 * Wait for auth session to be ready
 */
export async function awaitReadySession(client: SupabaseClient = supabase!): Promise<Session | null> {
  try {
    const { data } = await client.auth.getSession();
    if (data?.session) {
      window.dispatchEvent(new CustomEvent('auth:ready', { detail: { session: data.session } }));
      return data.session;
    }
  } catch {}

  return new Promise<Session | null>((resolve) => {
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      window.dispatchEvent(new CustomEvent('auth:ready', { detail: { session } }));
      resolve(session);
      setTimeout(() => sub.subscription.unsubscribe(), 0);
    });
    setTimeout(() => {
      try { sub.subscription.unsubscribe(); } catch {}
      resolve(null);
    }, 5000); // Increased timeout for better reliability
  });
}

/**
 * Get current auth session with error handling
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    if (!isEnvReady()) {
      throw new EnvMissingError('Supabase environment not configured');
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error in getCurrentSession:', error);
    return null;
  }
}

/**
 * Safe auth operations with error handling
 */
export const authOperations = {
  async signIn(email: string, password: string) {
    if (!isEnvReady()) {
      throw new EnvMissingError('Supabase environment not configured');
    }
    
    return await supabase.auth.signInWithPassword({ email, password });
  },
  
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    if (!isEnvReady()) {
      throw new EnvMissingError('Supabase environment not configured');
    }
    
    return await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
  },
  
  async signOut() {
    if (!isEnvReady()) {
      return { error: null }; // Allow sign out even without env
    }
    
    return await supabase.auth.signOut();
  }
};

export default supabase;