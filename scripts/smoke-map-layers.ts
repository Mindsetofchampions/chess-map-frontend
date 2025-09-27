import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.scripts.local')) dotenvConfig({ path: '.env.scripts.local' });
else dotenvConfig();

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!url || !anon) throw new Error('Missing SUPABASE_URL/ANON');
  const email = process.env.MASTER_EMAIL;
  const password = process.env.MASTER_PASSWORD;
  const cleanup = process.env.SMOKE_CLEANUP === '1';

  // Prefer service role for deterministic writes in CI, else fall back to anon + sign-in.
  const client = createClient(url, serviceRole || anon, { auth: { persistSession: false } });
  let canWrite = Boolean(serviceRole);
  if (!canWrite) {
    if (email && password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('[warn] Sign-in failed; proceeding in read-only mode:', error.message);
        canWrite = false;
      } else {
        canWrite = true;
      }
    } else {
      console.warn('[warn] MASTER_EMAIL/PASSWORD not set; proceeding in read-only mode.');
    }
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

  async function insertWithCandidates(
    table: string,
    base: Record<string, any>,
    lat: number,
    lng: number,
  ) {
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

  let ssId: string | null = null;
  let evId: string | null = null;
  if (canWrite) {
    const ss = await insertWithCandidates(
      'safe_spaces',
      { name: 'SMOKE Safe Space', approved: true },
      39.9526,
      -75.1652,
    );
    ssId = ss.id;

    const ev = await insertWithCandidates(
      'events',
      { title: 'SMOKE Event', description: 'Seeded by smoke', starts_at: new Date().toISOString() },
      39.95,
      -75.17,
    );
    evId = ev.id;
  } else {
    console.log('[info] Read-only mode: skipping inserts');
  }

  console.log('Verifying presence...');
  if (canWrite && ssId && evId) {
    const { data: ssCheck } = await client
      .from('safe_spaces')
      .select('id,name')
      .eq('id', ssId)
      .maybeSingle();
    const { data: evCheck } = await client
      .from('events')
      .select('id,title')
      .eq('id', evId)
      .maybeSingle();
    console.log('Safe space:', ssCheck);
    console.log('Event:', evCheck);
  } else {
    const { data: ssAny } = await client.from('safe_spaces').select('id').limit(1);
    const { data: evAny } = await client.from('events').select('id').limit(1);
    console.log('[info] Read-only verify: rows present?', {
      safe_spaces: Array.isArray(ssAny) && ssAny.length > 0,
      events: Array.isArray(evAny) && evAny.length > 0,
    });
  }

  if (cleanup && canWrite) {
    console.log('Cleaning up inserted rows...');
    if (ssId) await client.from('safe_spaces').delete().eq('id', ssId);
    if (evId) await client.from('events').delete().eq('id', evId);
  }

  console.log('Map layers smoke complete.');
}

main().catch((e) => {
  console.error('Smoke map failed:', e?.message || e);
  process.exit(1);
});
