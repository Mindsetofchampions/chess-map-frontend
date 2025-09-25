import dotenv from 'dotenv';
// Load envs
dotenv.config();
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.scripts.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.MASTER_EMAIL as string;
  const password = process.env.MASTER_PASSWORD as string;
  if (!url || !anon) throw new Error('Missing SUPABASE_URL/ANON_KEY');
  if (!email || !password) throw new Error('Missing MASTER_EMAIL/PASSWORD');

  const supabase = createClient(url, anon);
  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !signIn.session) throw new Error(`Sign-in failed: ${error?.message}`);
  const token = signIn.session.access_token;

  const resp = await fetch(`${url}/rest/v1/rpc/actor_is_master_admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}',
  });
  const text = await resp.text();
  console.log('RPC status:', resp.status);
  console.log('RPC body:', text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
