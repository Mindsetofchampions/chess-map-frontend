import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

function randId(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

async function ensureBucket(url: string, service: string, bucket = 'parent_ids') {
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const { data: list } = await admin.storage.listBuckets();
  const exists = Array.isArray(list) && !!list.find((b: any) => b.id === bucket);
  if (!exists) {
    console.log(`[smoke-parent] creating bucket ${bucket}...`);
    await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: 10485760 });
  }
}

async function createTempStudent(url: string, service: string) {
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const email = `student_${Date.now()}_${randId(6)}@test.local`;
  const password = `Tmp!${randId(8)}_${Date.now().toString().slice(-4)}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', created_by_admin: 'smoke_parent_consents' },
  });
  if (createErr) throw createErr;
  const userId = created?.user?.id as string;
  if (!userId) throw new Error('Failed to create student');
  // assign role for consistency with backend checks
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

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) throw new Error('Missing SUPABASE_URL/ANON');
  if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY required');

  await ensureBucket(url, service, 'parent_ids');

  // Create a temp student and a consent row with dummy URLs to exercise the guard paths
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;
  const student = await createTempStudent(url, service);
  const studentId = student.id;

  // Non-storage URL (should bypass signing)
  const httpImage = 'https://placekitten.com/200/200';
  // Already-signed-ish URL (should bypass signing)
  const signedLike = `${url}/storage/v1/object/sign/parent_ids/sample/path.png?token=${randId(32)}&expires=9999999999`;

  console.log('[smoke-parent] upserting parent_consents row...');
  const { error: upErr } = await admin.from('parent_consents').upsert(
    {
      student_id: studentId,
      parent_name: 'Guard Test Parent',
      parent_email: `parent_${randId()}@test.local`,
      consent_signed: true,
      status: 'PENDING',
      signature_image_url: httpImage,
      parent_id_image_url: signedLike,
      notes: 'smoke-parent-consents guard test',
    },
    { onConflict: 'student_id' },
  );
  if (upErr) throw upErr;

  // As an admin, read back the row and ensure it exists
  const { data: row, error: readErr } = await admin
    .from('parent_consents')
    .select('id, signature_image_url, parent_id_image_url')
    .eq('student_id', studentId)
    .maybeSingle();
  if (readErr) throw readErr;
  console.log('[smoke-parent] consent row inserted with urls:', {
    signature: row?.signature_image_url,
    parent_id: row?.parent_id_image_url,
  });

  // Cleanup consent row
  const cleanup = process.env.SMOKE_CLEANUP !== '0';
  if (cleanup) {
    try {
      await admin.from('parent_consents').delete().eq('student_id', studentId);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(student.id);
    } catch {}
  } else {
    console.log('[smoke-parent] cleanup disabled via SMOKE_CLEANUP=0');
  }

  console.log('Parent consents smoke complete.');
}

main().catch((e) => {
  console.error('Smoke parent consents failed:', e?.message || e);
  process.exit(1);
});
