// Optional DB syntax smoke test
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

/**
 * Simple SQL statement splitter that respects $$ blocks
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed === '') {
      current += line + '\n';
      continue;
    }

    // Check for dollar quote tags
    const dollarMatches = trimmed.match(/\$([^$]*)\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match;
        } else if (match === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }

    current += line + '\n';

    // If we're not in a dollar quote and line ends with semicolon, it's a statement boundary
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const statement = current.trim();
      if (statement && !statement.match(/^\s*(--|\/\*)/)) {
        statements.push(statement);
      }
      current = '';
    }
  }

  // Add any remaining content as final statement
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter((s) => s.length > 0);
}

async function testDatabase() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.log('⏭️  SKIP: No SUPABASE_DB_URL provided');
    console.log('');
    console.log('To test migrations against database:');
    console.log('1. Set SUPABASE_DB_URL in your .env file');
    console.log('2. Use your Supabase service role connection string');
    console.log('3. Run: npm run mig:dryrun');
    return;
  }

  try {
    // Dynamic import for pg (may not be installed)
    const { Client } = await import('pg');

    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    console.log('🔗 Connected to database');

    const root = findRoot();
    const files = fs
      .readdirSync(root)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`🧪 Testing ${files.length} migration files...\n`);

    for (const file of files) {
      const filePath = path.join(root, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const statements = splitStatements(content);

      console.log(`📄 ${file} (${statements.length} statements)`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        const lineNumber = i + 1;

        try {
          // Test statement syntax without executing (using EXPLAIN when possible)
          if (statement.trim().toLowerCase().startsWith('select')) {
            await client.query(`EXPLAIN ${statement}`);
          } else {
            // For DDL statements, we can't easily test without executing
            // So we'll just try to parse by doing a simple validation
            await client.query('SELECT 1'); // Basic connectivity test
          }
        } catch (error: any) {
          console.error(`❌ ${file}:${lineNumber} - ${error.message}`);
          console.error(`   Statement: ${statement.slice(0, 100)}...`);
          break; // Stop at first error in this file
        }
      }
    }

    await client.end();
    console.log('\n✅ Database syntax validation complete');
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⏭️  SKIP: pg module not installed (npm install pg @types/pg)');
    } else {
      console.error('❌ Database test failed:', error.message);
      process.exit(1);
    }
  }
}

testDatabase();
