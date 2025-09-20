/*
  Seed test organization and test user via service role (local/dev use).

  Usage (bash):
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:test -- --email test.user@example.com --role org_admin

  Notes:
  - Requires SUPABASE_SERVICE_ROLE_KEY (never commit this).
  - Creates org 'test-org' if missing, ensures org wallet.
  - Creates auth user if missing (email), assigns role and org membership.
*/

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const argv = process.argv.slice(2);
function getArg(name: string, fallback?: string) {
  const idx = argv.findIndex(a => a === `--${name}`);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  const kv = argv.find(a => a.startsWith(`--${name}=`));
  if (kv) return kv.split('=')[1];
  return fallback;
}

const email = getArg('email', 'test.user@example.com')!;
const displayName = getArg('name', 'Test User')!;
const role = (getArg('role', 'org_admin')! as 'student' | 'org_admin' | 'staff');
const orgSlug = getArg('org', 'test-org')!;
const orgRole = (getArg('orgRole', role === 'org_admin' ? 'org_admin' : 'student')! as 'org_admin' | 'staff' | 'student');
const password = getArg('password');

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Ensure organization exists
  let orgId: string | null = null;
  {
    const { data: orgRow, error: orgErr } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (orgErr) throw orgErr;
    if (orgRow?.id) {
      orgId = orgRow.id as string;
    } else {
      const { data: insOrg, error: insErr } = await admin
        .from('organizations')
        .insert({ name: 'Test Organization', slug: orgSlug })
        .select('id')
        .single();
      if (insErr) throw insErr;
      orgId = insOrg.id as string;
    }
    // Ensure org wallet
    try {
      await admin.from('org_coin_wallets').insert({ org_id: orgId, balance: 0 });
    } catch (_) {
      // ignore conflict
    }
  }

  // Create or fetch auth user
  let userId: string | null = null;
  {
    const { data: found, error: findErr } = await admin.auth.admin.listUsers();
    if (findErr) throw findErr;
    const existing = found.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      userId = existing.id;
    } else {
      const tmpPass = password || `Temp_${Math.random().toString(36).slice(2, 10)}!aA`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tmpPass,
        email_confirm: true,
        user_metadata: { display_name: displayName }
      });
      if (createErr) throw createErr;
      if (!created.user) throw new Error('User creation failed');
      userId = created.user.id;
      console.log(`Created user ${email} with temporary password: ${tmpPass}`);
    }
  }

  if (!userId || !orgId) throw new Error('Missing userId or orgId');

  // Assign role in user_roles
  {
    const { error: roleErr } = await admin
      .from('user_roles')
      .upsert({ user_id: userId, role, assigned_by: userId })
      .select();
    if (roleErr) throw roleErr;
  }

  // Upsert profile (legacy)
  {
    try {
      await admin
        .from('profiles')
  .upsert({ user_id: userId, display_name: displayName, role: role === 'org_admin' ? 'org_admin' : 'student', org_id: orgId })
        .select();
    } catch (_) {}
  }

  // Add membership
  {
    const { error: memErr } = await admin
      .from('memberships')
      .upsert({ user_id: userId, org_id: orgId, role: orgRole as any })
      .select();
    if (memErr) throw memErr;
  }

  console.log(`Seed complete. Org ${orgSlug} (${orgId}); user ${email} (${userId}) role=${role}, orgRole=${orgRole}`);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
