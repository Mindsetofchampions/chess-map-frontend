// Inspect function definitions for get_my_wallet/get_my_ledger in the remote DB
// Usage:
//   SUPABASE_DB_PASSWORD=... npm run -s db:inspect
// or set SUPABASE_DB_URL directly in .env.scripts.local

import fs from 'fs';
import path from 'path';

// load env
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve('.env.scripts.local') });
} catch {}

function ensureSsl(url: string): string {
  return url.includes('sslmode=')
    ? url
    : url.includes('?')
      ? `${url}&sslmode=require`
      : `${url}?sslmode=require`;
}

function readPoolerTemplate(): string | null {
  const p = path.resolve('supabase', '.temp', 'pooler-url');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').trim();
}

function composeDbUrl(): string {
  const direct = process.env.SUPABASE_DB_URL?.trim();
  if (direct) return ensureSsl(direct);
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) throw new Error('Missing SUPABASE_DB_URL or SUPABASE_DB_PASSWORD');
  const template = readPoolerTemplate();
  if (!template) throw new Error('Missing supabase/.temp/pooler-url template');
  return ensureSsl(template.replace('[YOUR-PASSWORD]', encodeURIComponent(password)));
}

async function main() {
  const url = composeDbUrl();
  const { Client } = await import('pg');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const q = `
    select
      n.nspname as schema,
      p.proname as name,
      oid::regprocedure as signature,
      pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('get_my_wallet','get_my_ledger')
    order by signature::text;
  `;
  const res = await client.query(q);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch((e) => {
  console.error('Inspect failed:', e.message || e);
  process.exit(1);
});
