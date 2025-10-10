import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !service) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(url, service, { auth: { persistSession: false } }) as any;

  const { data: rows, error } = await admin
    .from('parent_consents')
    .select('id, student_id, parent_email, parent_name, status, created_at')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  console.log('[pending-consents] count:', rows?.length || 0);
  if (rows && rows.length) {
    console.log('[pending-consents] top rows:');
    for (const r of rows) {
      console.log(`- id=${r.id} student_id=${r.student_id} parent=${r.parent_email} name=${r.parent_name} created_at=${r.created_at}`);
    }
  }
}

main().catch((e) => {
  console.error('List pending consents failed:', e?.message || e);
  process.exit(1);
});
