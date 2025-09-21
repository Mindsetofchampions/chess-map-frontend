#!/usr/bin/env node

/**
 * CHESS Map Frontend System Verification Script
 *
 * Performs comprehensive read-only verification of frontend/backend wiring
 * without modifying any source files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const results = {
  environment: {},
  build: {},
  routes: {},
  testIds: {},
  supabase: {},
  sprites: {},
  preview: {},
};

/**
 * Execute shell command and capture output
 */
function execCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      timeout: 60000,
      ...options,
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
      exitCode: error.status,
    };
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

/**
 * Read file content safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8');
  } catch {
    return null;
  }
}

/**
 * Search for string in files
 */
function searchInFiles(pattern, directory = 'src') {
  try {
    const result = execCommand(
      `grep -r "${pattern}" ${directory} --include="*.ts" --include="*.tsx" || true`,
    );
    return result.output.split('\n').filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

/**
 * Environment Snapshot
 */
console.log(`${colors.blue}${colors.bold}1. Environment Snapshot${colors.reset}`);

// Check Node and npm versions
const nodeVersion = execCommand('node -v');
const npmVersion = execCommand('npm -v');

results.environment.nodeVersion = nodeVersion.success ? nodeVersion.output : 'FAIL';
results.environment.npmVersion = npmVersion.success ? npmVersion.output : 'FAIL';

console.log(`Node.js: ${nodeVersion.output}`);
console.log(`npm: ${npmVersion.output}`);

// Check environment variables
const envFiles = ['.env', '.env.scripts.local', '.env.example'];
let envVars = {};

envFiles.forEach((file) => {
  const content = readFile(file);
  if (content) {
    const lines = content.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^([A-Z_]+)=/);
      if (match) {
        envVars[match[1]] = 'present';
      }
    });
  }
});

const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const optionalVars = ['VITE_MAPBOX_TOKEN'];

requiredVars.forEach((varName) => {
  const present = !!envVars[varName];
  results.environment[varName] = present ? 'PASS' : 'FAIL';
  console.log(`${varName}: ${present ? '✅ PASS' : '❌ FAIL'}`);
});

optionalVars.forEach((varName) => {
  const present = !!envVars[varName];
  results.environment[varName] = present ? 'PASS' : 'WARN';
  console.log(`${varName}: ${present ? '✅ PASS' : '⚠️ WARN (optional)'}`);
});

/**
 * Install & Static Checks
 */
console.log(`\n${colors.blue}${colors.bold}2. Install & Static Checks${colors.reset}`);

// Install dependencies
console.log('Running npm install...');
const installResult = execCommand('npm install');
results.build.install = installResult.success ? 'PASS' : 'FAIL';
console.log(`Install: ${installResult.success ? '✅ PASS' : '❌ FAIL'}`);
if (!installResult.success) {
  console.log(`Error: ${installResult.output.split('\n').slice(0, 5).join('\n')}`);
}

// Type check
console.log('Running type check...');
const typeCheckResult = execCommand('npm run type-check');
results.build.typeCheck = typeCheckResult.success ? 'PASS' : 'FAIL';
console.log(`Type Check: ${typeCheckResult.success ? '✅ PASS' : '❌ FAIL'}`);
if (!typeCheckResult.success) {
  console.log(`Errors: ${typeCheckResult.output.split('\n').slice(0, 20).join('\n')}`);
}

// Build
console.log('Running build...');
const buildResult = execCommand('npm run build');
results.build.build = buildResult.success ? 'PASS' : 'FAIL';
console.log(`Build: ${buildResult.success ? '✅ PASS' : '❌ FAIL'}`);
if (!buildResult.success) {
  console.log(`Errors: ${buildResult.output.split('\n').slice(0, 40).join('\n')}`);
}

/**
 * Routes & Components Presence
 */
console.log(`\n${colors.blue}${colors.bold}3. Routes & Components${colors.reset}`);

const expectedRoutes = [
  '/login',
  '/signup',
  '/dashboard',
  '/quests',
  '/quests/:id',
  '/master/dashboard',
  '/master/quests/approvals',
  '/admin/diagnostics',
];

expectedRoutes.forEach((route) => {
  const found = searchInFiles(route, 'src') > 0;
  results.routes[route] = found ? 'PASS' : 'FAIL';
  console.log(`Route ${route}: ${found ? '✅ PASS' : '❌ FAIL'}`);
});

// Check SystemDiagnostics page exists
const diagnosticsExists = fileExists('src/pages/admin/SystemDiagnostics.tsx');
results.routes.diagnosticsPage = diagnosticsExists ? 'PASS' : 'FAIL';
console.log(`SystemDiagnostics page: ${diagnosticsExists ? '✅ PASS' : '❌ FAIL'}`);

/**
 * Test IDs Presence
 */
console.log(`\n${colors.blue}${colors.bold}4. Test IDs${colors.reset}`);

const expectedTestIds = [
  'btn-login',
  'btn-signup',
  'btn-logout',
  'chip-wallet',
  'table-ledger',
  'btn-play-',
  'btn-choice-',
  'btn-approve-',
  'btn-run-all',
  'btn-run-env',
  'btn-run-conn',
  'btn-run-auth',
  'btn-run-wallet',
  'btn-run-quests',
  'btn-run-sprites',
  'btn-run-map',
  'btn-run-routes',
];

expectedTestIds.forEach((testId) => {
  const count =
    searchInFiles(`data-testid="${testId}`, 'src') +
    searchInFiles(`data-testid={\`${testId}`, 'src');
  results.testIds[testId] = count >= 1 ? 'PASS' : 'FAIL';
  console.log(`${testId}: ${count >= 1 ? '✅ PASS' : '❌ FAIL'} (${count} matches)`);
});

/**
 * Supabase Helpers & RPC Wiring
 */
console.log(`\n${colors.blue}${colors.bold}5. Supabase Helpers${colors.reset}`);

const expectedHelpers = ['rpcSubmitMcq', 'rpcApproveQuest', 'getMyWallet', 'getMyLedger'];
const expectedRpcs = ['submit_mcq_answer', 'approve_quest', 'get_my_wallet', 'get_my_ledger'];

expectedHelpers.forEach((helper) => {
  const exported = searchInFiles(`export.*${helper}`, 'src/lib/supabase.ts') > 0;
  const used = searchInFiles(`import.*${helper}`, 'src') > 0;
  results.supabase[`${helper}_export`] = exported ? 'PASS' : 'FAIL';
  results.supabase[`${helper}_used`] = used ? 'PASS' : 'FAIL';
  console.log(`${helper} exported: ${exported ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`${helper} used: ${used ? '✅ PASS' : '❌ FAIL'}`);
});

expectedRpcs.forEach((rpc) => {
  const found = searchInFiles(rpc, 'src/lib/supabase.ts') > 0;
  results.supabase[`rpc_${rpc}`] = found ? 'PASS' : 'FAIL';
  console.log(`RPC ${rpc}: ${found ? '✅ PASS' : '❌ FAIL'}`);
});

/**
 * Sprites / Assets Presence
 */
console.log(`\n${colors.blue}${colors.bold}6. Sprites & Assets${colors.reset}`);

const expectedSprites = ['hootie.gif', 'kittykat.gif', 'gino.gif', 'hammer.gif', 'badge.gif'];

expectedSprites.forEach((sprite) => {
  const exists = fileExists(`src/assets/personas/${sprite}`);
  results.sprites[sprite] = exists ? 'PASS' : 'FAIL';
  console.log(`${sprite}: ${exists ? '✅ PASS' : '❌ FAIL'}`);
});

// Check sprites.ts functions
const spritesFile = readFile('src/lib/sprites.ts');
const hasRegisterSprites = spritesFile && spritesFile.includes('registerPersonaSprites');
const hasCreateMarker = spritesFile && spritesFile.includes('createPersonaMarker');

results.sprites.registerPersonaSprites = hasRegisterSprites ? 'PASS' : 'FAIL';
results.sprites.createPersonaMarker = hasCreateMarker ? 'PASS' : 'FAIL';

console.log(`registerPersonaSprites: ${hasRegisterSprites ? '✅ PASS' : '❌ FAIL'}`);
console.log(`createPersonaMarker: ${hasCreateMarker ? '✅ PASS' : '❌ FAIL'}`);

/**
 * Preview Check
 */
console.log(`\n${colors.blue}${colors.bold}7. Preview Check${colors.reset}`);

if (buildResult.success) {
  try {
    console.log('Starting preview server...');
    const previewProcess = execCommand('timeout 20s npm run preview -- --port 4173 &');

    // Wait for server to start (CJS-safe, no top-level await)
    execCommand('node -e "setTimeout(()=>{},5000)"');

    // Test diagnostics route
    const curlResult = execCommand(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/admin/diagnostics',
    );
    const httpCode = curlResult.output;

    if (httpCode === '200') {
      // Check if page contains expected test ID
      const pageContent = execCommand('curl -s http://localhost:4173/admin/diagnostics');
      const hasTestId = pageContent.output.includes('data-testid="btn-run-all"');

      results.preview.status = hasTestId ? 'PASS' : 'FAIL';
      results.preview.httpCode = httpCode;
      console.log(
        `Preview /admin/diagnostics: ${hasTestId ? '✅ PASS' : '❌ FAIL'} (HTTP ${httpCode})`,
      );
    } else {
      results.preview.status = 'FAIL';
      results.preview.httpCode = httpCode;
      console.log(`Preview /admin/diagnostics: ❌ FAIL (HTTP ${httpCode})`);
    }
  } catch (error) {
    results.preview.status = 'SKIP';
    results.preview.error = error.message;
    console.log(`Preview check: ⚠️ SKIP (${error.message})`);
  }
} else {
  results.preview.status = 'SKIP';
  results.preview.reason = 'Build failed';
  console.log('Preview check: ⚠️ SKIP (build failed)');
}

/**
 * Generate Report
 */
const reportContent = `# CHESS Map Frontend System Verification Report

**Generated:** ${new Date().toISOString()}
**Version:** 0.1.0

## 🌍 Environment

| Check | Status | Details |
|-------|--------|---------|
| Node.js | ${results.environment.nodeVersion !== 'FAIL' ? '✅ PASS' : '❌ FAIL'} | ${results.environment.nodeVersion} |
| npm | ${results.environment.npmVersion !== 'FAIL' ? '✅ PASS' : '❌ FAIL'} | ${results.environment.npmVersion} |
| VITE_SUPABASE_URL | ${results.environment.VITE_SUPABASE_URL === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.environment.VITE_SUPABASE_URL === 'PASS' ? 'Present' : 'Missing - required for database connection'} |
| VITE_SUPABASE_ANON_KEY | ${results.environment.VITE_SUPABASE_ANON_KEY === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.environment.VITE_SUPABASE_ANON_KEY === 'PASS' ? 'Present' : 'Missing - required for database connection'} |
| VITE_MAPBOX_TOKEN | ${results.environment.VITE_MAPBOX_TOKEN === 'PASS' ? '✅ PASS' : '⚠️ WARN'} | ${results.environment.VITE_MAPBOX_TOKEN === 'PASS' ? 'Present' : 'Optional - map will show bubbles only'} |

## 🔨 Build & Type-Check

| Check | Status | Details |
|-------|--------|---------|
| Dependencies Install | ${results.build.install === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.build.install === 'PASS' ? 'All dependencies installed successfully' : 'Installation failed'} |
| TypeScript Check | ${results.build.typeCheck === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.build.typeCheck === 'PASS' ? 'No type errors found' : 'Type errors detected'} |
| Production Build | ${results.build.build === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.build.build === 'PASS' ? 'Build completed successfully' : 'Build failed'} |

## 🛣️ Routes

| Route | Status |
|-------|--------|
| /login | ${results.routes['/login'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /signup | ${results.routes['/signup'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /dashboard | ${results.routes['/dashboard'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /quests | ${results.routes['/quests'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /quests/:id | ${results.routes['/quests/:id'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /master/dashboard | ${results.routes['/master/dashboard'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /master/quests/approvals | ${results.routes['/master/quests/approvals'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| /admin/diagnostics | ${results.routes['/admin/diagnostics'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| SystemDiagnostics Page | ${results.routes.diagnosticsPage === 'PASS' ? '✅ PASS' : '❌ FAIL'} |

## 🎯 Test IDs

| Test ID | Status | Count |
|---------|--------|-------|
${expectedTestIds.map((id) => `| ${id} | ${results.testIds[id] === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.testIds[id + '_count'] || 0} |`).join('\n')}

## 🔗 Supabase Integration

| Helper Function | Export | Usage | RPC Name |
|----------------|---------|-------|----------|
| rpcSubmitMcq | ${results.supabase.rpcSubmitMcq_export === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.rpcSubmitMcq_used === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.rpc_submit_mcq_answer === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| rpcApproveQuest | ${results.supabase.rpcApproveQuest_export === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.rpcApproveQuest_used === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.rpc_approve_quest === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| getMyWallet | ${results.supabase.getMyWallet_export === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.getMyWallet_used === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.rpc_get_my_wallet === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| getMyLedger | ${results.supabase.getMyLedger_export === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.getMyLedger_used === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${results.supabase.rpc_get_my_ledger === 'PASS' ? '✅ PASS' : '❌ FAIL'} |

## 🎨 Sprites & Assets

| Asset | Status |
|-------|--------|
| hootie.gif | ${results.sprites['hootie.gif'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| kittykat.gif | ${results.sprites['kittykat.gif'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| gino.gif | ${results.sprites['gino.gif'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| hammer.gif | ${results.sprites['hammer.gif'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| badge.gif | ${results.sprites['badge.gif'] === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| registerPersonaSprites | ${results.sprites.registerPersonaSprites === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| createPersonaMarker | ${results.sprites.createPersonaMarker === 'PASS' ? '✅ PASS' : '❌ FAIL'} |

## 🌐 Preview Check

| Check | Status | Details |
|-------|--------|---------|
| /admin/diagnostics | ${results.preview.status === 'PASS' ? '✅ PASS' : results.preview.status === 'SKIP' ? '⚠️ SKIP' : '❌ FAIL'} | ${results.preview.httpCode ? `HTTP ${results.preview.httpCode}` : results.preview.reason || results.preview.error || 'Unknown'} |

## 🗄️ Backend SQL Verify

Run this in Supabase SQL (expect: no rows):

\`\`\`sql
with issues as (
  -- enums
  select 'MISSING enum quest_type' where to_regtype('public.quest_type') is null
  union all select 'MISSING enum quest_status' where to_regtype('public.quest_status') is null
  union all select 'MISSING enum submission_status' where to_regtype('public.submission_status') is null

  -- core tables
  union all select 'MISSING table quests' where to_regclass('public.quests') is null
  union all select 'MISSING table quest_submissions' where to_regclass('public.quest_submissions') is null
  union all select 'MISSING table coin_wallets' where to_regclass('public.coin_wallets') is null
  union all select 'MISSING table coin_ledger' where to_regclass('public.coin_ledger') is null

  -- quests columns
  union all select 'MISSING quests.qtype::quest_type' where not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='qtype' and udt_name='quest_type')
  union all select 'MISSING quests.status::quest_status' where not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='status' and udt_name='quest_status')
  union all select 'MISSING quests.active::bool' where not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='active' and udt_name='bool')
  union all select 'MISSING quests.reward_coins::int' where not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='reward_coins')
  union all select 'MISSING quests.config::jsonb' where not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='quests' and column_name='config' and udt_name='jsonb')

  -- RLS enabled
  union all select 'RLS DISABLED on quests' where exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='quests' and c.relrowsecurity=false)
  union all select 'RLS DISABLED on quest_submissions' where exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='quest_submissions' and c.relrowsecurity=false)

  -- policies present
  union all select 'MISSING policy: quests SELECT' where not exists (
    select 1 from pg_policies where schemaname='public' and tablename='quests' and lower(cmd)='select')
  union all select 'MISSING policy: submissions INSERT' where not exists (
    select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and lower(cmd)='insert')
  union all select 'MISSING policy: submissions UPDATE' where not exists (
    select 1 from pg_policies where schemaname='public' and tablename='quest_submissions' and lower(cmd)='update')
  union all select 'MISSING policy: quests master update any' where not exists (
    select 1 from pg_policies where schemaname='public' and tablename='quests' and policyname='quests: master update any')

  -- triggers
  union all select 'MISSING trigger: trg_submission_reward' where not exists (
    select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='quest_submissions' and t.tgname='trg_submission_reward')
  union all select 'MISSING trigger: trg_quest_approved_budget' where not exists (
    select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='quests' and t.tgname='trg_quest_approved_budget')

  -- index guard
  union all select 'MISSING unique budget index' where not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uq_coin_ledger_budget_one_per_quest')

  -- RPCs present
  union all select 'MISSING RPC submit_mcq_answer(uuid,text)' where to_regprocedure('public.submit_mcq_answer(uuid,text)') is null
  union all select 'MISSING RPC approve_quest(uuid)' where to_regprocedure('public.approve_quest(uuid)') is null
  union all select 'MISSING RPC get_my_wallet()' where to_regprocedure('public.get_my_wallet()') is null
  union all select 'MISSING RPC get_my_ledger(integer,integer)' where to_regprocedure('public.get_my_ledger(integer,integer)') is null
)
select * from issues;
\`\`\`

### Results: (paste after running)

\`\`\`
[Paste the SQL query results here]
\`\`\`

## 🚀 Deployment Readiness

${getDeploymentReadiness()}

## 🛠️ Remediation Steps

${getRemediationSteps()}

---

*System verification completed at ${new Date().toLocaleString()}*
`;

// Write report
fs.writeFileSync('SYSTEM_REPORT.md', reportContent);

/**
 * Helper functions for report generation
 */
function getDeploymentReadiness() {
  const critical = [
    results.environment.VITE_SUPABASE_URL === 'PASS',
    results.environment.VITE_SUPABASE_ANON_KEY === 'PASS',
    results.build.typeCheck === 'PASS',
    results.build.build === 'PASS',
    results.routes.diagnosticsPage === 'PASS',
  ];

  const allCriticalPass = critical.every(Boolean);

  if (allCriticalPass) {
    return `### 🟢 READY FOR DEPLOYMENT

All critical systems are operational:
- ✅ Environment variables configured
- ✅ TypeScript compilation successful
- ✅ Production build successful
- ✅ System diagnostics accessible

The application is ready for testing deployment.`;
  } else {
    return `### 🔴 NOT READY FOR DEPLOYMENT

Critical issues must be resolved before deployment:
${critical
  .map((pass, i) => {
    const checks = ['Supabase URL', 'Supabase Key', 'Type Check', 'Build', 'Diagnostics'];
    return pass ? `- ✅ ${checks[i]}` : `- ❌ ${checks[i]}`;
  })
  .join('\n')}`;
  }
}

function getRemediationSteps() {
  const issues = [];

  if (results.environment.VITE_SUPABASE_URL !== 'PASS') {
    issues.push('- Add VITE_SUPABASE_URL to .env file');
  }
  if (results.environment.VITE_SUPABASE_ANON_KEY !== 'PASS') {
    issues.push('- Add VITE_SUPABASE_ANON_KEY to .env file');
  }
  if (results.build.typeCheck !== 'PASS') {
    issues.push('- Fix TypeScript errors: `npm run type-check`');
  }
  if (results.build.build !== 'PASS') {
    issues.push('- Fix build errors: `npm run build`');
  }

  if (issues.length === 0) {
    return 'No critical issues found. System is ready for deployment.';
  }

  return `Critical issues to resolve:\n${issues.join('\n')}`;
}

/**
 * Console Summary
 */
console.log(`\n${colors.bold}📊 SYSTEM CHECK SUMMARY${colors.reset}`);

const allChecks = [
  ...Object.values(results.environment),
  ...Object.values(results.build),
  ...Object.values(results.routes),
  ...Object.values(results.testIds),
  ...Object.values(results.supabase),
  ...Object.values(results.sprites),
];

const passCount = allChecks.filter((r) => r === 'PASS').length;
const failCount = allChecks.filter((r) => r === 'FAIL').length;
const warnCount = allChecks.filter((r) => r === 'WARN').length;
const skipCount = allChecks.filter((r) => r === 'SKIP').length;

console.log(`${colors.green}✅ PASS: ${passCount}${colors.reset}`);
console.log(`${colors.red}❌ FAIL: ${failCount}${colors.reset}`);
console.log(`${colors.yellow}⚠️ WARN: ${warnCount}${colors.reset}`);
console.log(`${colors.blue}⏭️ SKIP: ${skipCount}${colors.reset}`);

const overallStatus = failCount === 0 ? 'PASS' : 'FAIL';
console.log(
  `\n${colors.bold}Overall Status: ${overallStatus === 'PASS' ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`}${colors.reset}`,
);

console.log(
  `\n${colors.blue}${colors.bold}SYSTEM CHECK COMPLETE — see SYSTEM_REPORT.md${colors.reset}`,
);
