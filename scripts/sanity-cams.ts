import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

// Load env: prefer .env.scripts.local, else default .env
if (fs.existsSync('.env.scripts.local')) {
  dotenvConfig({ path: '.env.scripts.local' });
} else {
  dotenvConfig();
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or API key in env');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const svc = await supabase.from('services').select('id, category, org_id').limit(5);
  if (svc.error) throw svc.error;

  const rep = await supabase.rpc('report_attendance_by_service');
  if (rep.error) throw rep.error;

  const labelById = Object.fromEntries((svc.data ?? []).map((s: any) => [s.id, s.category]));
  const sample = (rep.data ?? []).slice(0, 5).map((r: any) => ({
    service_id: r.service_id,
    category: labelById[r.service_id] || '(unknown)',
    present: r.present,
    absent: r.absent,
    tardy: r.tardy,
  }));

  console.log('Services (up to 5):', svc.data);
  console.log('Report by service (sample up to 5):', sample);
  console.log('OK: CAMS data present:', {
    services: svc.data?.length ?? 0,
    reportRows: rep.data?.length ?? 0,
  });
}

main().catch((e) => {
  console.error('Sanity check failed:', e);
  process.exit(1);
});
