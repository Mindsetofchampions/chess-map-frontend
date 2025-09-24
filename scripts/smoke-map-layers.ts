import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing SUPABASE_URL/ANON');
  const email = process.env.MASTER_EMAIL;
  const password = process.env.MASTER_PASSWORD;
  const cleanup = process.env.SMOKE_CLEANUP === '1';

  const client = createClient(url, anon, { auth: { persistSession: false } });
  if (email && password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } else {
    console.warn('[warn] MASTER_EMAIL/PASSWORD not set; attempting inserts will likely fail RLS.');
  }

  console.log('Inserting safe space and event...');
  const coordCandidates: Array<[string, string]> = [
    ['lat', 'lng'],
    ['latitude', 'longitude'],
    ['lat', 'longitude'],
    ['latitude', 'lng'],
    ['lat', 'lon'],
    ['latitude', 'lon'],
  ];

  async function insertWithCandidates(table: string, base: Record<string, any>, lat: number, lng: number) {
    let lastErr: any = null;
    for (const [latKey, lngKey] of coordCandidates) {
      try {
        const payload = { ...base, [latKey]: lat, [lngKey]: lng } as any;
        const { data, error } = await client.from(table).insert(payload).select('id').single();
        if (error) throw error;
        return data as { id: string };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  const ss = await insertWithCandidates('safe_spaces', { name: 'SMOKE Safe Space', approved: true }, 39.9526, -75.1652);
  const ssId = ss.id;

  const ev = await insertWithCandidates(
    'events',
    { title: 'SMOKE Event', description: 'Seeded by smoke', starts_at: new Date().toISOString() },
    39.95,
    -75.17,
  );
  const evId = ev.id;

  console.log('Verifying presence...');
  const { data: ssCheck } = await client.from('safe_spaces').select('id,name').eq('id', ssId).maybeSingle();
  const { data: evCheck } = await client.from('events').select('id,title').eq('id', evId).maybeSingle();
  console.log('Safe space:', ssCheck);
  console.log('Event:', evCheck);

  if (cleanup) {
    console.log('Cleaning up inserted rows...');
    await client.from('safe_spaces').delete().eq('id', ssId);
    await client.from('events').delete().eq('id', evId);
  }

  console.log('Map layers smoke complete.');
}

main().catch((e) => {
  console.error('Smoke map failed:', e?.message || e);
  process.exit(1);
});
