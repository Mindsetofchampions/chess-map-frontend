import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

console.log('[smoke] booting e2e');
if (fs.existsSync('.env.scripts.local')) {
  dotenvConfig({ path: '.env.scripts.local' });
} else {
  dotenvConfig();
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function signInEmail(client: any, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // optional for cleanup-only
  if (!url || !anon) throw new Error('Missing SUPABASE_URL and/or ANON KEY in env');

  const ORG_EMAIL = process.env.ORG_EMAIL;
  const ORG_PASSWORD = process.env.ORG_PASSWORD;
  const MASTER_EMAIL = process.env.MASTER_EMAIL;
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

  if (!ORG_EMAIL || !ORG_PASSWORD) throw new Error('Set ORG_EMAIL and ORG_PASSWORD in env to run authenticated smoke.');

  const org = createClient(url, anon, { auth: { persistSession: false } });
  console.log('Signing in as org admin/staff...');
  await signInEmail(org, ORG_EMAIL, ORG_PASSWORD);

  // Create a minimal quest (submitted status)
  console.log('Creating a test quest...');
  const title = `SMOKE ${new Date().toISOString()}`;
  // Pick an attribute id if available; else try to select first attribute
  let attributeId: string | null = process.env.SMOKE_ATTRIBUTE_ID || null;
  if (!attributeId) {
    const { data: attrs, error: attrsErr } = await org.from('attributes').select('id').limit(1);
    if (attrsErr) throw attrsErr;
    attributeId = attrs?.[0]?.id ?? null;
  }
  if (!attributeId) throw new Error('No attribute_id found; seed attributes table or set SMOKE_ATTRIBUTE_ID');

  const { data: created, error: createErr } = await org.rpc('create_quest', {
    p_title: title,
    p_description: 'Automated smoke test quest',
    p_attribute_id: attributeId,
    p_reward_coins: 1,
    p_qtype: 'text',
    p_grade_bands: ['ES'],
    p_seats_total: 1,
    p_lat: null,
    p_lng: null,
    p_config: { meta: { smoke: true } },
  });
  if (createErr) throw createErr;
  const quest = Array.isArray(created) ? created[0] : created;
  console.log('Quest created:', { id: quest?.id, status: quest?.status });

  // Optionally approve as master
  if (MASTER_EMAIL && MASTER_PASSWORD) {
    console.log('Signing in as master to approve quest...');
    const master = createClient(url, anon, { auth: { persistSession: false } });
    await signInEmail(master, MASTER_EMAIL, MASTER_PASSWORD);
    try {
      const { data: approved, error: approveErr } = await master.rpc('approve_quest', { p_quest_id: quest.id });
      if (approveErr) throw approveErr;
      console.log('Quest approved response:', approved);
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      if (msg.includes('approve_quest') && msg.includes('does not exist')) {
        console.warn('[warn] approve_quest RPC not found; skipping approval step.');
      } else {
        throw err;
      }
    }
  } else {
    console.log('MASTER_EMAIL/PASSWORD not set; skipping approval step.');
  }

  console.log('Smoke test complete.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    const msg = (e && (e.message || e.error || e.msg)) || e;
    console.error('Smoke test failed:', msg);
    if (e && e.stack) console.error(e.stack);
    process.exit(1);
  });
