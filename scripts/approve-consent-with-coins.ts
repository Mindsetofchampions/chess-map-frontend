import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

function arg(name: string, fallback?: string) {
  const idx = process.argv.findIndex((v) => v === `--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function randId(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

async function ensureTempMaster(url: string, service: string) {
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const email = `master_${Date.now()}_${randId(6)}@test.local`;
  const password = `Adm!${randId(8)}_${Date.now().toString().slice(-4)}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'master_admin', created_by_admin: 'approve-consent-with-coins' },
  });
  if (createErr) throw createErr;
  const userId = created?.user?.id as string;
  if (!userId) throw new Error('Failed to create temp master');
  try {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'master_admin' });
  } catch {}
  try {
    await admin
      .from('profiles')
      .upsert({ user_id: userId, role: 'master_admin', display_name: email.split('@')[0] });
  } catch {}
  return { email, password, id: userId };
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !anon || !service) throw new Error('Missing SUPABASE_URL/ANON/SERVICE in env');

  const targetId = arg('id');
  const coins = Number(arg('coins', '50')) || 50;
  const notes = arg('notes', 'approved via script');

  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const client = createClient(url, anon, { auth: { persistSession: false } });

  let email = process.env.MASTER_EMAIL;
  let password = process.env.MASTER_PASSWORD;

  // Try to sign in as existing master; fall back to temp master
  let signedIn = false;
  if (email && password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    signedIn = !error;
    if (error) console.warn('[approve-consent] master sign-in failed, will create temp admin:', error.message);
  }
  let tempAdminId: string | undefined;
  if (!signedIn) {
    const temp = await ensureTempMaster(url, service);
    email = temp.email;
    password = temp.password;
    tempAdminId = temp.id;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  // Resolve target consent
  let consentId = targetId;
  if (!consentId) {
    const { data: row, error } = await admin
      .from('parent_consents')
      .select('id, student_id, status')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('No PENDING parent_consents found; pass --id <uuid>');
    consentId = row.id as string;
  }

  // Read student_id for wallet check
  const { data: consentRow, error: crErr } = await admin
    .from('parent_consents')
    .select('student_id, status')
    .eq('id', consentId)
    .maybeSingle();
  if (crErr) throw crErr;
  if (!consentRow?.student_id) throw new Error('Consent row missing student_id');
  const studentId = consentRow.student_id as string;

  // Approve via RPC with coin award
  const { error: rpcErr } = await client.rpc('approve_parent_consent', {
    p_id: consentId,
    p_admin_message: notes,
    p_award_coins: coins,
  });
  if (rpcErr) throw rpcErr;

  // Verify wallet balance
  const { data: wallet, error: wErr } = await admin
    .from('coin_wallets')
    .select('balance')
    .eq('user_id', studentId)
    .maybeSingle();
  if (wErr) throw wErr;
  const balance = Number(wallet?.balance || 0);
  if (balance < coins)
    throw new Error(`Expected wallet balance >= ${coins}, got ${wallet?.balance}`);
  console.log(`[approve-consent] wallet balance ok: ${balance} (>= ${coins})`);

  // Verify ledger entry
  const { data: ledger, error: lErr } = await admin
    .from('coin_ledger')
    .select('id, delta, kind, created_at')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (lErr) throw lErr;
  const found = (ledger || []).find((r: any) => Number(r.delta) === coins);
  console.log(`[approve-consent] ledger entry for +${coins} ${found ? 'found' : 'not found yet'}`);

  // Cleanup temp admin if it was created
  const cleanup = process.env.SMOKE_CLEANUP !== '0';
  if (cleanup && tempAdminId) {
    try {
      await admin.auth.admin.deleteUser(tempAdminId);
    } catch {}
  }

  console.log('Approve consent with coins complete.');
}

main().catch((e) => {
  console.error('Approve consent with coins failed:', e?.message || e);
  process.exit(1);
});
