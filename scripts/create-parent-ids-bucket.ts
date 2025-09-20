import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role) before running this script.');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const bucketId = 'parent_ids';

  try {
    // Check existing buckets
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) throw listErr;
    const exists = buckets?.some(b => b.name === bucketId);
    if (exists) {
      console.log(`Bucket '${bucketId}' already exists. No action taken.`);
      process.exit(0);
    }

    // Create bucket (private)
    const { data, error } = await supabase.storage.createBucket(bucketId, { public: false });
    if (error) throw error;
    console.log(`Created bucket '${bucketId}':`, data);
    process.exit(0);
  } catch (err: any) {
    console.error('Failed to create bucket:', err.message || err);
    process.exit(2);
  }
}

main();
