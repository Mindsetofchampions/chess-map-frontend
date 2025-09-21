import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function loadDotEnv(file = '.env.local') {
  const env: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(path.resolve(file), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      let key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      // strip optional quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch (err) {
    // ignore
  }
  return env;
}

async function main() {
  const env = loadDotEnv();
  const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const orgId = randomUUID();
  const userId = randomUUID();

  console.log('Using orgId=', orgId, 'userId=', userId);

  // 1) Try to call the assign_organization_admin RPC (requires migration applied)
  try {
    console.log('Calling assign_organization_admin RPC...');
    const { data, error } = await supabase.rpc('assign_organization_admin', {
      p_org_id: orgId,
      p_user_id: userId,
    });
    if (error) {
      console.error('RPC assign_organization_admin error:', error);
    } else {
      console.log('RPC assign_organization_admin success:', data);
    }
  } catch (err) {
    console.error('RPC call failed (migration applied?)', err);
  }

  // 2) Attempt to upload a small test file to org_logos and org_admin_ids
  const testBuffer = Buffer.from('this is a test file for org ' + orgId);

  async function tryUpload(bucket: string) {
    try {
      const filePath = `test-${bucket}-${Date.now()}.txt`;
      console.log(`Uploading to bucket ${bucket} -> ${filePath}`);
      const res = await supabase.storage.from(bucket).upload(filePath, testBuffer, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false,
        // metadata must be strings
        metadata: { uploader_id: userId, org_id: orgId },
      });
      // @ts-ignore
      if (res.error) {
        console.error('Upload error for', bucket, res.error);
      } else {
        // @ts-ignore
        console.log('Upload success:', res.data?.path || res);
      }
    } catch (err) {
      console.error('Upload failed for', bucket, err);
    }
  }

  await tryUpload('org_logos');
  await tryUpload('org_admin_ids');

  // 3) Try to get a signed URL for one of the files (if uploaded)
  try {
    const listRes = await supabase.storage.from('org_logos').list('', { limit: 10 });
    // @ts-ignore
    if (listRes.error) {
      console.error('List error:', listRes.error);
    } else {
      // @ts-ignore
      console.log('List returned', listRes.data?.length || 0, 'items');
      // @ts-ignore
      if (listRes.data && listRes.data.length > 0) {
        // @ts-ignore
        const first = listRes.data[0].name || listRes.data[0].path;
        const { data: urlData, error: urlErr } = await supabase.storage
          .from('org_logos')
          .createSignedUrl(first, 60);
        if (urlErr) console.error('signed url error', urlErr);
        else console.log('signed url:', urlData?.signedUrl || urlData);
      }
    }
  } catch (err) {
    console.error('Signed url/list failed', err);
  }

  console.log(
    'Test script completed. If uploads failed, ensure migrations and storage policies are applied and buckets exist.',
  );
  process.exit(0);
}

main();
