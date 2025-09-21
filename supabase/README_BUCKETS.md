# Create Supabase Storage Buckets

This script helps create two private buckets required by the org onboarding flow:

- `org_logos` (private)
- `org_admin_ids` (private)

Prerequisites

- You have a Supabase project and a Service Role key (set in `SUPABASE_SERVICE_ROLE_KEY`).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present in `.env.local` or in your environment.

How to run

```bash
chmod +x supabase/create_buckets.sh
./supabase/create_buckets.sh
```

What it does

- Calls the Supabase Storage Admin REST API to create the two private buckets.
- Prints the API response and indicates if the bucket already exists.

After creating buckets

- Open Supabase dashboard → Storage and confirm both buckets exist and are private.
- Optionally apply storage policies from `supabase/storage_policies.sql` if you want custom RLS access to objects in the buckets.

Notes

- The script uses your Service Role key; keep it secret and do not commit it anywhere.
- If you prefer the Supabase Dashboard UI: go to Storage → New bucket, set the name and toggle "Public" off.
