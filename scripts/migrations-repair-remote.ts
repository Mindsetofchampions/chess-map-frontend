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

const target = process.argv[2]?.trim();

async function main() {
  if (!target) {
    console.error('Usage: ts-node scripts/migrations-repair-remote.ts <version>');
    console.error('Example: ts-node scripts/migrations-repair-remote.ts 20250927');
    process.exit(2);
  }

  let dbUrl: string;
  try {
    dbUrl = composeDbUrl();
  } catch (e: any) {
    console.error('✖', e.message);
    process.exit(2);
  }

  console.log(`➡️  Repairing remote migration status to reverted for ${target} ...`);
  const args = ['migration', 'repair', '--db-url', dbUrl, '--status', 'reverted', target];
  const child = spawn('supabase', args, { stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Migration repair successful. You can retry db push.');
    } else {
      console.error(`❌ supabase migration repair failed with exit code ${code}`);
    }
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err?.message || err);
  process.exit(1);
});
