import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

function randId(len = 8) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

async function ensureStudent(url: string, service: string) {
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const email = `student_${Date.now()}_${randId(6)}@test.local`;
  const password = `Tmp!${randId(8)}_${Date.now().toString().slice(-4)}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', created_by_admin: 'smoke_consent_award' },
  });
  if (createErr) throw createErr;
  const userId = created?.user?.id as string;
  if (!userId) throw new Error('Failed to create student');
  try {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'student' });
  } catch {}
  try {
    await admin
      .from('profiles')
      .upsert({ user_id: userId, role: 'student', display_name: email.split('@')[0] });
  } catch {}
  return { id: userId, email, password } as { id: string; email: string; password: string };
}

async function ensureAdmin(url: string, service: string) {
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const email = `admin_${Date.now()}_${randId(6)}@test.local`;
  const password = `Adm!${randId(8)}_${Date.now().toString().slice(-4)}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'master_admin', created_by_admin: 'smoke_consent_award' },
  });
  if (createErr) throw createErr;
  const userId = created?.user?.id as string;
  if (!userId) throw new Error('Failed to create admin');
  try {
    await admin.from('user_roles').upsert({ user_id: userId, role: 'master_admin' });
  } catch {}
  try {
    await admin
      .from('profiles')
      .upsert({ user_id: userId, role: 'master_admin', display_name: email.split('@')[0] });
  } catch {}
  return { id: userId, email, password } as { id: string; email: string; password: string };
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) throw new Error('Missing SUPABASE_URL/ANON');
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY required');

  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const student = await ensureStudent(url, service);
  const tempAdmin = await ensureAdmin(url, service);

  // Sign in as admin with anon client to perform RPC as authenticated master_admin
  const client = createClient(url, anon);
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: tempAdmin.email,
    password: tempAdmin.password,
  });
  if (signInErr) throw signInErr;

  // Insert a pending parent consent for the student
  const { data: inserted, error: insErr } = await admin
    .from('parent_consents')
    .insert({
      student_id: student.id,
      parent_name: 'Smoke Parent',
      parent_email: `parent_${randId()}@test.local`,
      consent_signed: true,
      status: 'PENDING',
      signature_image_url: 'https://placekitten.com/200/200',
      parent_id_image_url: 'https://placekitten.com/201/201',
      notes: 'smoke-consent-award',
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  const consentId = inserted!.id as string;

  // Approve with coin award via RPC
  const award = 123;
  const { error: apprErr } = await client.rpc('approve_parent_consent', {
    p_id: consentId,
    p_admin_message: 'approved via smoke',
    p_award_coins: award,
  });
  if (apprErr) throw apprErr;

  // Verify coin_wallets balance
  const { data: wallet, error: wErr } = await admin
    .from('coin_wallets')
    .select('user_id, balance')
    .eq('user_id', student.id)
    .maybeSingle();
  if (wErr) throw wErr;
  if (!wallet || Number(wallet.balance) < award)
    throw new Error(`Expected wallet balance >= ${award}, got ${wallet?.balance}`);
  console.log('[smoke-consent-award] coin_wallets balance ok:', wallet.balance);

  // Verify ledger entry exists
  const { data: ledger, error: lErr } = await admin
    .from('coin_ledger')
    .select('id, user_id, delta, kind, created_at')
    .eq('user_id', student.id)
    .order('created_at', { ascending: false })
    .limit(5);
  if (lErr) throw lErr;
  const found = (ledger || []).find(
    (r: any) => Number(r.delta) === award && r.kind === 'manual_adjust',
  );
  if (!found) throw new Error('Expected coin_ledger entry for award not found');
  console.log('[smoke-consent-award] coin_ledger entry ok:', found.id);

  // Cleanup
  const cleanup = process.env.SMOKE_CLEANUP !== '0';
  if (cleanup) {
    try {
      await admin.from('parent_consents').delete().eq('id', consentId);
    } catch {}
    try {
      await admin.from('coin_ledger').delete().eq('user_id', student.id);
    } catch {}
    try {
      await admin.from('coin_wallets').delete().eq('user_id', student.id);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(student.id);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(tempAdmin.id);
    } catch {}
  } else {
    console.log('[smoke-consent-award] cleanup disabled via SMOKE_CLEANUP=0');
  }

  console.log('Smoke consent award complete.');
}

main().catch((e) => {
  console.error('Smoke consent award failed:', e?.message || e);
  process.exit(1);
});
