import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

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

  // Optional: sign in using MASTER_EMAIL/PASSWORD if present
  const MASTER_EMAIL = process.env.MASTER_EMAIL;
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
  if (MASTER_EMAIL && MASTER_PASSWORD && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || key)) {
    try {
      await supabase.auth.signInWithPassword({ email: MASTER_EMAIL, password: MASTER_PASSWORD });
    } catch (e) {
      // ignore; continue unauthenticated
    }
  }

  const out: any = { columns: {}, rpcs: {} };

  // Verify quests new columns are selectable
  const q = await supabase
    .from('quests')
    .select('id, seats_total, seats_taken, grade_bands, lat, lng')
    .limit(1);
  if (q.error) {
    out.columns = { ok: false, error: q.error.message };
  } else {
    const row = (q.data || [])[0] || {};
    out.columns = {
      ok: true,
      present: {
        seats_total: Object.prototype.hasOwnProperty.call(row, 'seats_total'),
        seats_taken: Object.prototype.hasOwnProperty.call(row, 'seats_taken'),
        grade_bands: Object.prototype.hasOwnProperty.call(row, 'grade_bands'),
        lat: Object.prototype.hasOwnProperty.call(row, 'lat'),
        lng: Object.prototype.hasOwnProperty.call(row, 'lng'),
      },
    };
  }

  async function checkRpc(name: string, args: Record<string, any>) {
    const r = await supabase.rpc(name as any, args as any);
    if (r.error) {
      const msg = r.error.message || '';
      const exists = !/function .* does not exist|No function matches/i.test(msg);
      return { exists, error: msg };
    }
    return { exists: true, ok: true };
  }

  // Find a real quest id to exercise RPCs if available
  let questId = '00000000-0000-0000-0000-000000000000';
  try {
    const qPick = await supabase
      .from('quests')
      .select('id,seats_total,seats_taken,status')
      .order('created_at', { ascending: false })
      .limit(1);
    if (!qPick.error && qPick.data && qPick.data.length > 0) {
      questId = qPick.data[0].id as string;
    }
  } catch {}

  out.rpcs.reserve_seat = await checkRpc('reserve_seat', { p_quest_id: questId });
  out.rpcs.cancel_seat = await checkRpc('cancel_seat', { p_quest_id: questId });
  out.rpcs.submit_text = await checkRpc('submit_text', { p_quest_id: questId, p_text: 'test' });
  out.rpcs.submit_numeric = await checkRpc('submit_numeric', { p_quest_id: questId, p_value: 1 });

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error('Sanity check failed:', e);
  process.exit(1);
});
