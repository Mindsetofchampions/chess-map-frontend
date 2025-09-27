/**
 * Smoke test for admin_generate_link
 *
 * Usage env vars:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - MASTER_EMAIL
 * - MASTER_PASSWORD
 * - TARGET_EMAIL (email to generate link for)
 * - REDIRECT_ORIGIN (optional; e.g., https://chesscompanions.app)
 */

import dotenv from 'dotenv';
// Load env from .env, then override with .env.local and .env.scripts.local if present
dotenv.config();
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.scripts.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const MASTER_EMAIL = process.env.MASTER_EMAIL as string;
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD as string;
  const TARGET_EMAIL = (process.env.TARGET_EMAIL as string) || MASTER_EMAIL;
  const REDIRECT_ORIGIN =
    (process.env.REDIRECT_ORIGIN as string | undefined) || 'https://chesscompanions.app';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_URL/ANON_KEY');
  if (!MASTER_EMAIL || !MASTER_PASSWORD) throw new Error('Missing MASTER_EMAIL/PASSWORD');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
  });
  if (signInErr || !signIn.session) throw new Error(`Master sign-in failed: ${signInErr?.message}`);

  const token = signIn.session.access_token;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin_generate_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: TARGET_EMAIL, type: 'magiclink', redirectTo: REDIRECT_ORIGIN }),
  });

  const body = await resp.json();
  if (!resp.ok) {
    console.error('Magic link failed:', body);
    process.exit(1);
  }

  console.log('Magic link URL:', body.url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
