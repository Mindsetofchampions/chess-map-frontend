// ts-node compatible migration fixer
import fs from 'fs';
import path from 'path';

type Fix = { file: string; rules: number[]; warnings: string[] };

const CANDIDATE_DIRS = ['supabase/migrations','db/migrations','migrations'];

function findRoot(): string {
  for (const d of CANDIDATE_DIRS) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      return d;
    }
  }
  throw new Error(`No migrations folder found in: ${CANDIDATE_DIRS.join(', ')}`);
}

function backupDir(dir: string): string {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
  const out = `${dir}__backup_${stamp}`;
  fs.cpSync(dir, out, { recursive: true });
  return out;
}

function escapeSqlLiteral(s: string): string {
  return s.replace(/'/g,"''");
}

function fixContent(raw: string, file: string): { out: string; rules: number[]; warnings: string[] } {
  let out = raw;
  const rules: number[] = [];
  const warnings: string[] = [];

  // Rule 1: Remove IF NOT EXISTS from CREATE POLICY statements
  const originalPolicyCount = (out.match(/create\s+policy.*?if\s+not\s+exists/gi) || []).length;
  out = out.replace(/create\s+policy\s+(.*?)\s+if\s+not\s+exists\s+/gi, 'create policy $1 ');
  if (originalPolicyCount > 0) {
    rules.push(1);
  }

  // Rule 2: CREATE TYPE IF NOT EXISTS -> DO block
  out = out.replace(/create\s+type\s+if\s+not\s+exists\s+public\.(\w+)\s+as\s+enum\s*\(([\s\S]*?)\)\s*;/gi,
    (_m, name, vals) => {
      rules.push(2);
      // Double all single quotes in the enum values
      const doubledVals = vals.replace(/'/g, "''");
      const inner = `create type public.${name} as enum (${doubledVals.trim()})`;
      return [
        'do $plpgsql$',
        'begin',
        "  if not exists (",
        "    select 1 from pg_type t",
        "    join pg_namespace n on n.oid=t.typnamespace",
        "    where n.nspname='public' and t.typname='"+name+"'",
        "  ) then",
        "    execute '"+escapeSqlLiteral(inner)+"';",
        '  end if;',
        'end',
        '$plpgsql$;'
      ].join('\n');
    });

  // Rule 3: execute $$...$$ -> execute '...';
  out = out.replace(/execute\s+\$\$([\s\S]*?)\$\$/gi, (_m, inner) => {
    rules.push(3);
    return `execute '${escapeSqlLiteral(inner.trim())}'`;
  });

  // Rule 4: INSERT policies with USING -> WITH CHECK only
  out = out.replace(/(create\s+policy\s+["'][^"']+["']\s+on\s+[.\w]+\s+for\s+insert)([\s\S]*?);/gi,
    (_m, head, tail) => {
      const usingMatch = tail.match(/using\s*\(([\s\S]*?)\)/i);
      const withCheckMatch = tail.match(/with\s+check\s*\(([\s\S]*?)\)/i);
      
      if (usingMatch && !withCheckMatch) {
        rules.push(4);
        const predicate = usingMatch[1].trim();
        return `${head}\n  with check (${predicate});`;
      } else if (usingMatch && withCheckMatch) {
        rules.push(4);
        const predicate = withCheckMatch[1].trim();
        return `${head}\n  with check (${predicate});`;
      }
      
      return _m; // No change needed
    });

  // Rule 5: Add drop-if-exists before create policy
  out = out.replace(/create\s+policy\s+"([^"]+)"\s+on\s+([.\w]+)\s/gi, (m, pname, tbl) => {
    rules.push(5);
    const [schema, table] = tbl.includes('.') ? tbl.split('.') : ['public', tbl];
    const dropBlock = [
      'do $plpgsql$ begin',
      "  if exists (select 1 from pg_policies where schemaname='"+schema+"' and tablename='"+table+"' and policyname='"+pname+"') then",
      "    execute 'drop policy \""+escapeSqlLiteral(pname)+"\" on "+schema+"."+table+"';",
      '  end if;',
      'end $plpgsql$;'
    ].join('\n');
    return dropBlock + '\n' + `create policy "${pname}" on ${schema}.${table} `;
  });

  // Rule 6: CREATE TRIGGER IF NOT EXISTS -> drop + create
  out = out.replace(/create\s+trigger\s+(\w+)\s+(.*?)\s+on\s+([.\w]+)\s/gi, (m, tname, mid, tbl) => {
    if (!/if\s+not\s+exists/i.test(m)) return m; // leave normal creates
    rules.push(6);
    const [schema, table] = tbl.includes('.') ? tbl.split('.') : ['public', tbl];
    const cleanMid = mid.replace(/if\s+not\s+exists\s*/gi, '').trim();
    return [
      `drop trigger if exists ${tname} on ${schema}.${table};`,
      `create trigger ${tname} ${cleanMid} on ${schema}.${table} `
    ].join('\n');
  });

  // Rule 7: Ensure SECURITY DEFINER functions have search_path
  out = out.replace(/(create\s+or\s+replace\s+function[\s\S]*?language\s+plpgsql)([\s\S]*?)(\$\$[\s\S]*?\$\$)/gi,
    (m, head, middle, body) => {
      if (!/security\s+definer/i.test(middle)) return m;
      if (!/set\s+search_path/i.test(middle)) {
        rules.push(7);
        return `${head} security definer set search_path = public${body}`;
      }
      return m;
    });

  // Rule 8: Normalize end; → end before closing tag
  out = out.replace(/end;\s*\$plpgsql\$\s*;/gi, 'end $plpgsql$;');
  if (raw !== out && !rules.includes(8)) {
    rules.push(8);
  }

  // Rule 9: Remove verification selects
  const verifySelectPattern = /(^|\n)\s*select\s+'(MISSING|COIN)[\s\S]*?;\s*/gi;
  const originalVerifyCount = (out.match(verifySelectPattern) || []).length;
  out = out.replace(verifySelectPattern, (m) => {
    rules.push(9);
    return '\n-- removed verification select\n';
  });

  return { out, rules, warnings };
}

function run() {
  try {
    const root = findRoot();
    console.log(`📁 Found migrations directory: ${root}`);
    
    const backup = backupDir(root);
    console.log(`💾 Created backup: ${backup}`);
    
    const report: Fix[] = [];
    const files = fs.readdirSync(root).filter(f => f.endsWith('.sql')).sort();
    
    console.log(`🔍 Processing ${files.length} migration files...`);

    for (const f of files) {
      const p = path.join(root, f);
      const raw = fs.readFileSync(p, 'utf8');
      const { out, rules, warnings } = fixContent(raw, f);
      
      if (raw !== out) {
        fs.writeFileSync(p, out, 'utf8');
        console.log(`✅ Fixed: ${f} (rules: ${rules.join(', ')})`);
      } else {
        console.log(`✓ No changes: ${f}`);
      }
      
      report.push({ file: f, rules: Array.from(new Set(rules)).sort((a,b)=>a-b), warnings });
    }

    // Generate report
    const lines: string[] = [];
    lines.push('# MIGRATION FIX REPORT');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Root Directory:** \`${root}\``);
    lines.push(`**Backup Location:** \`${backup}\``);
    lines.push('');
    lines.push('## Files Processed');
    lines.push('');
    
    let totalRules = 0;
    let totalWarnings = 0;
    
    for (const r of report) {
      const rulesApplied = r.rules.length;
      const warningsCount = r.warnings.length;
      totalRules += rulesApplied;
      totalWarnings += warningsCount;
      
      lines.push(`- **${r.file}** → ${rulesApplied > 0 ? `rules applied: ${r.rules.join(', ')}` : 'no changes'}${warningsCount > 0 ? ` | warnings: ${warningsCount}` : ''}`);
      
      if (r.warnings.length > 0) {
        r.warnings.forEach(w => lines.push(`  - ⚠️ ${w}`));
      }
    }
    
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Files processed:** ${files.length}`);
    lines.push(`- **Files modified:** ${report.filter(r => r.rules.length > 0).length}`);
    lines.push(`- **Total fixes applied:** ${totalRules}`);
    lines.push(`- **Total warnings:** ${totalWarnings}`);
    lines.push('');
    lines.push('## Fix Rules Applied');
    lines.push('');
    lines.push('1. Remove IF NOT EXISTS from CREATE POLICY statements');
    lines.push('2. Convert CREATE TYPE IF NOT EXISTS to conditional DO blocks');
    lines.push('3. Convert execute $$...$$ to execute \'...\' with proper quoting');
    lines.push('4. Fix INSERT policies to use WITH CHECK instead of USING');
    lines.push('5. Add drop-if-exists before CREATE POLICY for idempotency');
    lines.push('6. Convert CREATE TRIGGER IF NOT EXISTS to drop + create pattern');
    lines.push('7. Ensure SECURITY DEFINER functions have search_path set');
    lines.push('8. Normalize DO block ending format');
    lines.push('9. Remove verification SELECT statements');
    
    fs.writeFileSync('MIGRATION_FIX_REPORT.md', lines.join('\n'), 'utf8');
    console.log(`📊 Migration fix complete. Generated: MIGRATION_FIX_REPORT.md`);
    
  } catch (error: any) {
    console.error('❌ Migration fix failed:', error.message);
    process.exit(1);
  }
}

run();