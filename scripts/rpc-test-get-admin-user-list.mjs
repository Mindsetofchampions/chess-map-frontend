import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(file = '.env.local') {
  const out = {};
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {}
  return out;
}

async function main() {
  const env = loadDotEnv();
  const URL = process.env.SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const MASTER_EMAIL = process.env.MASTER_EMAIL || env.MASTER_EMAIL;
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || env.MASTER_PASSWORD;

  if (!URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');

  // Prefer master login with anon key
  if (MASTER_EMAIL && MASTER_PASSWORD && ANON_KEY) {
    const s = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: loginData, error: loginError } = await s.auth.signInWithPassword({ email: MASTER_EMAIL, password: MASTER_PASSWORD });
    if (loginError) {
      console.log(JSON.stringify({ mode: 'master', ok: false, error: { message: loginError.message } }, null, 2));
      return;
    }
    const { data: userInfo } = await s.auth.getUser();
    const user = userInfo?.user;
    const masterCheck = await s.rpc('is_master_admin');
    const masterOk = !masterCheck.error && !!masterCheck.data;
    const res = await s.rpc('get_admin_user_list');
    console.log(JSON.stringify({
      mode: 'master',
      user: user ? { id: user.id, email: user.email } : null,
      isMaster: masterOk,
      ok: !res.error,
      dataCount: Array.isArray(res.data) ? res.data.length : null,
      sample: Array.isArray(res.data) ? res.data.slice(0,3) : null,
      error: res.error ? { message: res.error.message, code: res.error.code } : null
    }, null, 2));
    return;
  }

  // Fallback: service or anon key direct RPC
  const KEY = SERVICE_KEY || ANON_KEY;
  if (!KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or ANON key to run test');
  const s = createClient(URL, KEY, { auth: { persistSession: false } });
  const res = await s.rpc('get_admin_user_list');
  console.log(JSON.stringify({
    mode: SERVICE_KEY ? 'service' : 'anon',
    ok: !res.error,
    expectedSecureError: !!res.error,
    dataCount: Array.isArray(res.data) ? res.data.length : null,
    error: res.error ? { message: res.error.message, code: res.error.code } : null
  }, null, 2));
}

main().catch((e) => {
  try {
    console.error(e && e.stack ? e.stack : e);
  } catch {
    console.error(String(e));
  }
  process.exit(1);
});
