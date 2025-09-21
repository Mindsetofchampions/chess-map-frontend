import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(file = '.env.scripts.local'): Record<string, string> {
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

async function findUserIdByEmail(
  url: string,
  serviceKey: string,
  email: string,
): Promise<string | null> {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 50; i++) {
    // up to 10k users
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) break; // exhausted
    page++;
  }
  return null;
}

async function main() {
  const env = loadDotEnv();
  const url =
    process.env.SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.MASTER_EMAIL || env.MASTER_EMAIL;
  if (!url || !serviceKey) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env/.env.scripts.local');
    process.exit(1);
  }
  if (!email) {
  console.error('Set MASTER_EMAIL in env/.env.scripts.local to the account to promote');
    process.exit(1);
  }
  console.log(`Looking up user id for ${email}...`);
  const userId = await findUserIdByEmail(url, serviceKey, email);
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
  // Update profiles if present
  const { error: profErr } = await admin
    .from('profiles')
    .update({ role: 'master_admin' })
    .eq('user_id', userId);
  if (profErr) {
    console.warn('Warning: failed to update profiles (may not exist):', profErr.message);
  }
  console.log('✅ Granted master_admin role successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
