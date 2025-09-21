import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(file = '.env.scripts.local'): Record<string, string> {
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
  } catch (_e) {
    // ignore
  }
  return out;
}

async function main() {
  const env = loadDotEnv();

  const URL =
    process.env.SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY =
    process.env.SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY;
  const MASTER_EMAIL = process.env.MASTER_EMAIL || env.MASTER_EMAIL;
  const MASTER_PASSWORD = process.env.MASTER_PASSWORD || env.MASTER_PASSWORD;

  if (!URL) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
    process.exit(1);
  }

  // If master creds + anon key exist, sign in and call RPC as the master user (preferred)
  if (MASTER_EMAIL && MASTER_PASSWORD && ANON_KEY) {
    const s = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: loginData, error: loginError } = await s.auth.signInWithPassword({
      email: MASTER_EMAIL,
      password: MASTER_PASSWORD,
    });
    if (loginError) {
      console.log(
        JSON.stringify(
          { mode: 'master', ok: false, error: { message: loginError.message } },
          null,
          2,
        ),
      );
      process.exit(1);
    }
    const { data: userInfo } = await s.auth.getUser();
    const user = userInfo?.user;
    // Check master gate directly
    let isMaster: boolean | null = null;
    try {
      const { data: masterCheck, error: masterErr } = await s.rpc('is_master_admin');
      if (!masterErr) isMaster = !!masterCheck;
    } catch {}
    const { data, error } = await s.rpc('get_admin_user_list');
    console.log(
      JSON.stringify(
        {
          mode: 'master',
          user: user ? { id: user.id, email: user.email } : null,
          isMaster,
          ok: !error,
          dataCount: Array.isArray(data) ? data.length : null,
          sample: Array.isArray(data) ? data.slice(0, 3) : null,
          error: error
            ? { message: error.message, code: (error as any).code, details: (error as any).details }
            : null,
        },
        null,
        2,
      ),
    );
    return;
  }

  // Otherwise, call with service role (or anon without login). Expect Forbidden as a secure success signal
  const KEY = SERVICE_KEY || ANON_KEY;
  if (!KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY or ANON key to run test');
    process.exit(1);
  }
  const s = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await s.rpc('get_admin_user_list');
  console.log(
    JSON.stringify(
      {
        mode: SERVICE_KEY ? 'service' : 'anon',
        ok: !error,
        expectedSecureError: !!error,
        dataCount: Array.isArray(data) ? data.length : null,
        error: error
          ? { message: error.message, code: (error as any).code, details: (error as any).details }
          : null,
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
