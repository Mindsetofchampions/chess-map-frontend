#!/usr/bin/env python3
import sys
import os
from pathlib import Path

def normalize_conn(conn: str) -> str:
    # Remove surrounding square brackets if user pasted like [PASSWORD]
    return conn.replace('[', '').replace(']', '')

def main():
    if len(sys.argv) < 2:
        print('Usage: apply_migrations.py <POSTGRES_CONNECTION_STRING>')
        sys.exit(2)
    conn = normalize_conn(sys.argv[1])
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
    conn_obj = psycopg2.connect(conn)
    conn_obj.autocommit = True
    cur = conn_obj.cursor()

    for f in sql_files:
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
