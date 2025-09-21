#!/usr/bin/env bash
set -euo pipefail

# Create private Supabase storage buckets using the admin REST API.
# Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or in .env.scripts.local
# Usage:
#   chmod +x supabase/create_buckets.sh
#   ./supabase/create_buckets.sh

# Load .env.scripts.local if present
if [ -f ".env.scripts.local" ]; then
  # shellcheck disable=SC1091
  set -a
  source .env.scripts.local
  set +a
fi

: "${SUPABASE_URL:?Need SUPABASE_URL in env or .env.scripts.local}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Need SUPABASE_SERVICE_ROLE_KEY in env or .env.scripts.local}"

create_bucket() {
  local name="$1"
  echo "Creating bucket: $name (private)"

  http_code=$(curl -sS -o /tmp/create_bucket_resp.json -w "%{http_code}" -X POST "${SUPABASE_URL%/}/storage/v1/bucket" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\",\"public\":false}")

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "Bucket $name created or returned success (HTTP $http_code)."
    cat /tmp/create_bucket_resp.json
  elif [ "$http_code" = "409" ]; then
    echo "Bucket $name already exists (HTTP 409)."
    cat /tmp/create_bucket_resp.json
  else
    echo "Failed to create bucket $name, HTTP $http_code"
    cat /tmp/create_bucket_resp.json
    exit 1
  fi
}

create_bucket "org_logos"
create_bucket "org_admin_ids"

echo "All done. If you need custom storage policies, apply supabase/storage_policies.sql in your Supabase SQL editor."
