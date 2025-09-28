// Push Supabase migrations to remote DB using CLI with a provided DB URL or pooled password
// Usage:
//  - Set SUPABASE_DB_URL in .env.scripts.local (full postgresql URL incl password)
//    OR set SUPABASE_DB_PASSWORD (pooled password) and this script will compose the URL
//  - Then run: npm run -s db:push:remote

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables from .env.scripts.local (ESM-friendly)
dotenv.config({ path: path.resolve('.env.scripts.local') });

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
  // Only accept a Postgres connection string for direct DB URL
  if (direct && /^postgres(ql)?:\/\//i.test(direct)) {
    return ensureSsl(direct);
  }
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      'Missing DB credentials. Provide either SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.scripts.local.',
    );
  }
  const template = readPoolerTemplate();
  if (!template) {
    throw new Error(
      'Missing supabase/.temp/pooler-url template. Run `supabase projects list` once or paste your pooled URL.',
    );
  }
  const url = template.replace('[YOUR-PASSWORD]', encodeURIComponent(password));
  return ensureSsl(url);
}

async function main() {
  let dbUrl: string;
  try {
    dbUrl = composeDbUrl();
  } catch (e: any) {
    console.error('✖', e.message);
    console.error('\nHow to fix:');
    console.error(
      '- Option A: Add SUPABASE_DB_URL to .env.scripts.local (find in Supabase → Settings → Database → Pooled connection string)',
    );
    console.error(
      '- Option B: Add SUPABASE_DB_PASSWORD to .env.scripts.local and ensure supabase/.temp/pooler-url exists',
    );
    process.exit(2);
  }

  console.log('➡️  Applying migrations to remote database via Supabase CLI...');
  const args = ['db', 'push', '--db-url', dbUrl, '--include-all', '--yes'];
  const child = spawn('supabase', args, { stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Migrations applied successfully.');
    } else {
      console.error(`❌ supabase db push failed with exit code ${code}`);
      process.exit(code ?? 1);
    }
  });
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err?.message || err);
  process.exit(1);
});
