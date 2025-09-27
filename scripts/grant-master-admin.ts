import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {}
  return out;
}
function loadEnvAll(): Record<string, string> {
  // Merge precedence: process.env > .env.scripts.local > .env.local
  const scripts = parseEnvFile('.env.scripts.local');
  const local = parseEnvFile('.env.local');
  return { ...local, ...scripts, ...process.env } as any;
}

async function findUserIdByEmailWithSDK(
  url: string,
  serviceKey: string,
  email: string,
): Promise<string | null> {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed (page ${page}): ${error.message}`);
    const users = data?.users || [];
    const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (users.length < perPage) break; // last page
    page += 1;
  }
  return null;
}

async function main() {
  const env = loadEnvAll();
  const url =
    process.env.SUPABASE_URL ||
    (env as any).SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    (env as any).VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (env as any).SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    (env as any).SERVICE_ROLE_KEY;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    (env as any).SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    (env as any).VITE_SUPABASE_ANON_KEY;
  const email = process.env.MASTER_EMAIL || (env as any).MASTER_EMAIL;
  const password = process.env.MASTER_PASSWORD || (env as any).MASTER_PASSWORD;
  if (!url || !serviceKey) {
    console.error(
      'Need SUPABASE_URL and SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in env/.env.scripts.local',
    );
    process.exit(1);
  }
  if (!email) {
    console.error('Set MASTER_EMAIL in env/.env.scripts.local to the account to promote');
    process.exit(1);
  }
  let userId: string | null = null;
  if (anonKey && password) {
    try {
      console.log(`Attempting login to fetch user id for ${email}...`);
      const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
      const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        console.warn('Login path failed, will fall back to admin lookup:', signInErr.message);
      } else {
        userId = signInData?.user?.id || null;
        // Best-effort sign out to avoid leaving a session (though persistSession: false)
        await userClient.auth.signOut();
      }
    } catch (e: any) {
      console.warn('Login-based lookup errored, falling back to admin lookup:', e?.message || e);
    }
  }
  if (!userId) {
    console.log(`Looking up user id for ${email} (via admin SDK)...`);
    userId = await findUserIdByEmailWithSDK(url, serviceKey, email);
  }
  if (!userId) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }
  console.log(`Found user id: ${userId}`);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  // Upsert into user_roles
  const { error: upsertErr } = await admin
    .from('user_roles')
    .upsert({ user_id: userId, role: 'master_admin' }, { onConflict: 'user_id' });
  if (upsertErr) {
    console.error('Failed to upsert user_roles:', upsertErr);
    process.exit(1);
  }
  // Ensure profiles row exists as actor_is_master_admin reads from profiles
  const { error: profErr } = await admin
    .from('profiles')
    .upsert({ user_id: userId, role: 'master_admin' as any }, { onConflict: 'user_id' });
  if (profErr) {
    console.warn('Warning: failed to upsert profiles:', profErr.message);
  }
  console.log('✅ Granted master_admin role successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
