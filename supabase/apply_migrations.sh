#!/usr/bin/env bash
# Apply Supabase migrations and create storage buckets for org onboarding features
# IMPORTANT: This script will execute SQL against the configured Supabase project via the supabase CLI.
# Make sure you are authenticated with `supabase login` and have selected the correct project.

set -euo pipefail

MIGRATIONS_DIR="$(cd "$(dirname "$0")" && pwd)/migrations"
SETUP_BUCKETS_SCRIPT="$(cd "$(dirname "$0")" && pwd)/setup_buckets.sh"

echo "This script will apply SQL migrations from: $MIGRATIONS_DIR"
read -p "Are you sure you want to proceed? This will modify your remote database. (yes/no): " yn
if [ "$yn" != "yes" ]; then
  echo "Aborting. No changes made."
  exit 1
fi

# Check supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found in PATH. Install from https://supabase.com/docs/guides/cli and log in first."
  exit 1
fi

# Ensure we can run a test query
echo "Running a connectivity test..."
supabase status || true

# Apply migrations in alphabetical order (should follow timestamp names)
for sql in "$MIGRATIONS_DIR"/*.sql; do
  echo "Applying $sql"
  # Use supabase db query to execute SQL (requires supabase CLI v1.72+)
  supabase db query < "$sql"
  echo "Applied $sql"
done

# Create buckets
if [ -x "$SETUP_BUCKETS_SCRIPT" ]; then
  echo "Creating storage buckets..."
  bash "$SETUP_BUCKETS_SCRIPT"
else
  echo "Bucket setup script not found or not executable: $SETUP_BUCKETS_SCRIPT"
fi

echo "Migrations and bucket setup complete."

echo "Next steps:"
echo " - Verify the new tables in Supabase dashboard or via SQL queries."
echo " - Adjust RLS policies if you need org_admins to have different permissions."
