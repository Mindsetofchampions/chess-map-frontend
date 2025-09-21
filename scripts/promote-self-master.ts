import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(file = '.env.local'): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {}
  return out;
}

async function main() {
  const env = loadDotEnv();
  const URL =
    process.env.SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASE_URL;
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY;
  const MASTER_EMAIL = process.env.MASTER_EMAIL || env.MASTER_EMAIL;
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || env.MASTER_PASSWORD;

  if (!URL || !ANON_KEY) {
    console.error('Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or equivalents)');
    process.exit(1);
  }
  if (!MASTER_EMAIL || !MASTER_PASSWORD) {
    console.error('Set MASTER_EMAIL and MASTER_PASSWORD in env/.env.local');
    process.exit(1);
  }

  const s = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: loginError } = await s.auth.signInWithPassword({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
  });
  if (loginError) {
    console.error('Login failed:', loginError.message);
    process.exit(1);
  }

  const { data, error } = await s.rpc('promote_self_to_master');
  console.log(
    JSON.stringify(
      {
        ok: !error,
        data,
        error: error ? { message: error.message, code: (error as any).code } : null,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
