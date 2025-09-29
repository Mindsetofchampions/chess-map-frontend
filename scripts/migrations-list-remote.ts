import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

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
  if (direct && /^postgres(ql)?:\/\//i.test(direct)) return ensureSsl(direct);
  const pw = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!pw) throw new Error('Missing DB credentials (SUPABASE_DB_URL or SUPABASE_DB_PASSWORD).');
  const template = readPoolerTemplate();
  if (!template) throw new Error('Missing supabase/.temp/pooler-url template.');
  const url = template.replace('[YOUR-PASSWORD]', encodeURIComponent(pw));
  return ensureSsl(url);
}

async function main() {
  let dbUrl: string;
  try {
    dbUrl = composeDbUrl();
  } catch (e: any) {
    console.error('✖', e.message);
    process.exit(2);
  }

  console.log('➡️  Listing remote migrations (using secure DB URL) ...');
  const child = spawn('supabase', ['migration', 'list', '--db-url', dbUrl], {
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err?.message || err);
  process.exit(1);
});
