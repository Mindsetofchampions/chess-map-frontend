import fs from 'fs';
import path from 'path';

const CANDIDATE_DIRS = ['supabase/migrations', 'db/migrations', 'migrations'];

function findRoot(): string {
  for (const d of CANDIDATE_DIRS) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      return d;
    }
  }
  throw new Error(`No migrations folder found in: ${CANDIDATE_DIRS.join(', ')}`);
}

function fail(msg: string) {
  console.error('❌', msg);
  process.exitCode = 1;
}

function warn(msg: string) {
  console.warn('⚠️ ', msg);
}

function check(content: string, file: string) {
  // Check 1: Unbalanced $$/$plpgsql$ delimiters
  const dollarCount = (content.match(/\$plpgsql\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    fail(`${file}: unbalanced $plpgsql$ delimiters (found ${dollarCount})`);
  }

  // Check 2: Statements missing semicolons (basic check for CREATE/ALTER lines)
  const statements = content
    .split('\n')
    .filter((line) => /^\s*(create|alter|drop|insert|update|delete)\s/i.test(line.trim()));
  for (const stmt of statements) {
    if (!stmt.trim().endsWith(';') && !stmt.includes('$$')) {
      warn(`${file}: statement may be missing semicolon: ${stmt.trim().slice(0, 50)}...`);
    }
  }

  // Check 3: execute $$ still present
  if (/\bexecute\s+\$\$/i.test(content)) {
    fail(`${file}: found 'execute $$ ... $$' (should be single-quoted execute)`);
  }

  // Check 4: INSERT policies with USING still present
  const insertPolicyPattern = /create\s+policy[\s\S]+?for\s+insert[\s\S]+?using\s*\(/gi;
  if (insertPolicyPattern.test(content)) {
    fail(`${file}: INSERT policy uses USING (must be WITH CHECK only)`);
  }

  // Check 5: CREATE TRIGGER IF NOT EXISTS still present
  if (/create\s+trigger[\s\S]+?if\s+not\s+exists/i.test(content)) {
    fail(`${file}: CREATE TRIGGER IF NOT EXISTS not allowed`);
  }

  // Check 6: CREATE TYPE IF NOT EXISTS still present
  if (/create\s+type\s+if\s+not\s+exists/i.test(content)) {
    fail(`${file}: 'create type if not exists' must be converted to conditional DO block`);
  }

  // Check 7: CREATE POLICY IF NOT EXISTS still present
  if (/create\s+policy[\s\S]+?if\s+not\s+exists/i.test(content)) {
    fail(`${file}: 'create policy if not exists' is not valid PostgreSQL syntax`);
  }

  // Check 8: Suspicious verification selects
  if (/select\s+'(MISSING|COIN[\s\S]*?MISSING)'/i.test(content)) {
    warn(`${file}: contains verification SELECT; remove from migrations`);
  }

  // Check 9: Unbalanced DO blocks
  const doCount = (content.match(/\bdo\s+\$plpgsql\$/gi) || []).length;
  const endCount = (content.match(/\bend\s+\$plpgsql\$\s*;/gi) || []).length;
  if (doCount !== endCount) {
    fail(`${file}: unbalanced DO blocks (${doCount} DO, ${endCount} END)`);
  }

  // Check 10: Functions without search_path (security check)
  const securityDefinerFunctions =
    content.match(/create\s+or\s+replace\s+function[\s\S]*?security\s+definer[\s\S]*?\$\$/gi) || [];
  for (const func of securityDefinerFunctions) {
    if (!/set\s+search_path/i.test(func)) {
      warn(`${file}: SECURITY DEFINER function missing 'set search_path = public'`);
    }
  }
}

function run() {
  try {
    const root = findRoot();
    console.log(`📁 Found migrations directory: ${root}`);

    const files = fs
      .readdirSync(root)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    console.log(`🔍 Checking ${files.length} migration files...`);

    for (const f of files) {
      const p = path.join(root, f);
      const raw = fs.readFileSync(p, 'utf8');
      check(raw, f);
    }

    if (process.exitCode) {
      console.error('\n❌ Static checks found issues. Run `npm run mig:fix` to fix them.');
      process.exit(process.exitCode);
    } else {
      console.log('\n✅ All static migration checks passed.');
    }
  } catch (error: any) {
    console.error('❌ Static check failed:', error.message);
    process.exit(1);
  }
}

run();
