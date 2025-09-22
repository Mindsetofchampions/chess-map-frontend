#!/usr/bin/env python3
import sys
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs

def normalize_conn(conn: str) -> str:
    # Remove surrounding square brackets if user pasted like [PASSWORD]
    return conn.strip().replace('\n', '').replace('\r', '').replace('[', '').replace(']', '')

def parse_pg_url(conn: str):
    if not conn.startswith('postgres://') and not conn.startswith('postgresql://'):
        return None
    u = urlparse(conn)
    q = parse_qs(u.query)
    # Extract first value from lists
    def pick(key, default=None):
        v = q.get(key)
        return v[0] if isinstance(v, list) and v else default

    params = {
        'host': u.hostname,
        'port': u.port or 5432,
        'dbname': (u.path.lstrip('/') or 'postgres'),
        'user': u.username,
        'password': u.password,
        # Default to require to avoid certificate validation issues
        'sslmode': pick('sslmode', 'require'),
    }
    return params

def load_env_local():
    repo_root = Path(__file__).resolve().parents[1]
    env_file = repo_root / '.env.scripts.local'
    if env_file.exists():
        try:
            for line in env_file.read_text(encoding='utf-8').splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    os.environ[k] = v
        except Exception:
            pass

def main():
    conn_arg = sys.argv[1] if len(sys.argv) >= 2 else None
    if not conn_arg:
        load_env_local()
    conn = normalize_conn(conn_arg or os.environ.get('SUPABASE_DB_URL', ''))
    if not conn:
        print('Usage: apply_migrations.py <POSTGRES_CONNECTION_STRING>')
        print('Or set SUPABASE_DB_URL in .env.scripts.local')
        sys.exit(2)
    # Lazy import so we only require psycopg2 when running
    try:
        import psycopg2
    except Exception as e:
        print('psycopg2 is required. Install with: pip install psycopg2-binary')
        raise

    migrations_dir = Path(__file__).resolve().parents[1] / 'supabase' / 'migrations'
    if not migrations_dir.exists():
        print('Migrations directory not found:', migrations_dir)
        sys.exit(1)

    sql_files = sorted([p for p in migrations_dir.glob('*.sql')])
    if not sql_files:
        print('No migration files found in', migrations_dir)
        sys.exit(0)

    print('Found', len(sql_files), 'migration files. Connecting to DB...')
    # Accept both DSN strings and URL forms; prefer structured params for URL
    url_params = parse_pg_url(conn)
    if url_params:
        conn_obj = psycopg2.connect(**url_params)
    else:
        conn_obj = psycopg2.connect(conn)
    conn_obj.autocommit = True
    cur = conn_obj.cursor()

    mig_only = os.environ.get('MIG_ONLY')
    mig_from = os.environ.get('MIG_FROM')
    started = False if mig_from else True

    for f in sql_files:
        if mig_only and f.name != mig_only:
            continue
        if not started:
            if f.name == mig_from:
                started = True
            else:
                continue
        print('\n--- Applying', f.name, '---')
        sql = f.read_text(encoding='utf-8')
        try:
            cur.execute(sql)
            print('OK')
        except Exception as e:
            print('ERROR applying', f.name)
            print(str(e))
            cur.close()
            conn_obj.close()
            sys.exit(1)

    cur.close()
    conn_obj.close()
    print('\nAll migrations applied successfully.')

if __name__ == '__main__':
    main()
