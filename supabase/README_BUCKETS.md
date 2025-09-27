# Create Supabase Storage Buckets

This script helps create storage buckets used by the app:

- `org_logos` (private)
- `org_admin_ids` (private)
- `map_assets` (public) — quest and map images intended for public consumption

Prerequisites

- You have a Supabase project and a Service Role key (set in `SUPABASE_SERVICE_ROLE_KEY`).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present in `.env.scripts.local` or in your environment.

How to run

```bash
chmod +x supabase/create_buckets.sh
./supabase/create_buckets.sh
```

What it does

- Calls the Supabase Storage Admin REST API to create the two private buckets.
- Prints the API response and indicates if the bucket already exists.

After creating buckets

- Open Supabase dashboard → Storage and confirm all buckets exist (map_assets should be public).
- Optionally apply storage policies from `supabase/storage_policies.sql` if you want custom RLS access to objects in the buckets.

Notes

- The script uses your Service Role key; keep it secret and do not commit it anywhere.
- If you prefer the Supabase Dashboard UI: go to Storage → New bucket, set the name and toggle "Public" appropriately.

Uploading images to map_assets

- When uploading via the app or scripts, include metadata key `uploader_id = auth.uid()`.
- Public read is enabled by making the bucket public; URLs are of the form:
	`${SUPABASE_URL}/storage/v1/object/public/map_assets/<path/to/file>`

Policies overview

- `map_assets` has public SELECT, authenticated INSERT (metadata.uploader_id must match), and UPDATE/DELETE allowed to uploader or master_admin.
