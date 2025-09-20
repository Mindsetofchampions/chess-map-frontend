#!/usr/bin/env bash
# Create required Supabase storage buckets for org onboarding
# Run from project root where supabase CLI is authenticated

set -euo pipefail

echo "Creating org_logos (public) and org_admin_ids (private) buckets..."

supabase storage create-bucket org_logos --public
supabase storage create-bucket org_admin_ids --public=false

echo "Buckets created."

echo "Remember: for private buckets you may want to add policies via supabase sql or dashboard. See supabase/storage_policies.sql"
