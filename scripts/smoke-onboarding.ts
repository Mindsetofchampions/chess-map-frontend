import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

type TempUser = { id: string; email: string; password: string };

function randSuffix(len = 10) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

async function createTempUser(url: string, serviceKey: string, role: 'student' | 'master_admin') {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } }) as any;
  const email = `${role}_${Date.now()}_${randSuffix(6)}@test.local`;
  const password = `Tmp!${randSuffix(8)}_${Date.now().toString().slice(-4)}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, created_by_admin: 'smoke_onboarding' },
  });
  if (createErr) throw createErr;
  if (!created?.user?.id) throw new Error('Failed to create temporary user');

  // Assign role in user_roles for backend checks
  const roleValue = role === 'master_admin' ? 'master_admin' : 'student';
  const { error: roleErr } = await admin
    .from('user_roles')
    .upsert({ user_id: created.user.id, role: roleValue });
  if (roleErr) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    throw roleErr;
  }

  // Optional legacy profiles entry
  try {
    await admin
      .from('profiles')
      .upsert({ user_id: created.user.id, role: roleValue, display_name: email.split('@')[0] });
  } catch {}

  return { id: created.user.id, email, password } as TempUser;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) throw new Error('Missing SUPABASE_URL/ANON');
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for onboarding smoke');

  console.log('[onboarding] provisioning temp student...');
  const student = await createTempUser(url, service, 'student');
  const studentClient = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInErr } = await studentClient.auth.signInWithPassword({
    email: student.email,
    password: student.password,
  });
  if (signInErr) throw signInErr;

  // Upsert onboarding_responses with new fields
  console.log('[onboarding] upserting onboarding_responses...');
  const onbPayload = {
    student_id: (await studentClient.auth.getUser()).data.user?.id,
    checkboxes: { a: true },
    eligible: true,
    student_name: 'Test Student',
    student_age: 12,
    student_school: 'Test Middle School',
  } as any;
  const { error: onbErr } = await studentClient
    .from('onboarding_responses')
    .upsert(onbPayload, { onConflict: 'student_id' });
  if (onbErr) throw onbErr;

  // Insert parent consent and trigger notification
  console.log('[onboarding] inserting parent_consents...');
  const studentId = onbPayload.student_id;
  const { error: pcErr } = await studentClient.from('parent_consents').upsert(
    {
      student_id: studentId,
      parent_name: 'Test Parent',
      parent_email: 'parent@test.local',
      consent_signed: true,
      status: 'SUBMITTED',
      notes: 'smoke-onboarding',
    },
    { onConflict: 'student_id' },
  );
  if (pcErr) throw pcErr;

  // Verify system notification enqueued
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const { data: notif } = await admin
    .from('system_notifications')
    .select('id, title, metadata, created_at')
    .like('metadata->>event', 'consent_%')
    .order('created_at', { ascending: false })
    .limit(10);
  const found = Array.isArray(notif) && notif.length > 0;
  console.log('[onboarding] notification present?', found);
  if (found) console.log('[onboarding] notification sample:', notif[0]);

  // Ensure admin list visibility with student fields
  console.log('[onboarding] provisioning temp master admin for list check...');
  const master = await createTempUser(url, service, 'master_admin');
  const masterClient = createClient(url, anon, { auth: { persistSession: false } });
  const { error: masterSigninErr } = await masterClient.auth.signInWithPassword({
    email: master.email,
    password: master.password,
  });
  if (masterSigninErr) throw masterSigninErr;

  const { data: pcRow, error: pcReadErr } = await masterClient
    .from('parent_consents')
    .select('id, status, parent_email, student_id')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();
  if (pcReadErr) throw pcReadErr;
  const { data: onbRow, error: onbReadErr } = await masterClient
    .from('onboarding_responses')
    .select('student_name, student_age, student_school')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();
  if (onbReadErr) throw onbReadErr;
  console.log('[onboarding] admin list row:', { ...pcRow, onboarding: onbRow });
  const ok = Boolean(onbRow?.student_name) && typeof onbRow?.student_age !== 'undefined';
  console.log('[onboarding] admin list has student fields?', ok);

  // Cleanup
  const cleanup = process.env.SMOKE_CLEANUP !== '0';
  if (cleanup) {
    console.log('[onboarding] cleaning up rows and users...');
    try {
      await admin.from('parent_consents').delete().eq('student_id', studentId);
    } catch {}
    try {
      await admin.from('onboarding_responses').delete().eq('student_id', studentId);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(student.id);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(master.id);
    } catch {}
  } else {
    console.log('[onboarding] cleanup disabled via SMOKE_CLEANUP=0');
  }

  console.log('Onboarding smoke complete.');
}

main().catch((e) => {
  console.error('Smoke onboarding failed:', e?.message || e);
  process.exit(1);
});
