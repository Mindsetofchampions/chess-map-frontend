import { supabase } from '@/lib/supabase';

/**
 * Try to parse a Supabase Storage public URL into bucket + object path.
 * Supports URLs like: .../storage/v1/object/public/<bucket>/<path>
 */
export function parseStoragePublicUrl(url?: string): { bucket: string; path: string } | null {
  if (!url) return null;
  try {
    // Normalize by stripping query string
    const [base] = url.split('?');

    // Try multiple known markers in order of specificity
    const markers = [
      '/storage/v1/object/public/', // public objects
      '/storage/v1/object/sign/', // already-signed path form
      '/storage/v1/object/', // generic (may be private/auth)
    ];

    let rest: string | null = null;
    for (const marker of markers) {
      const idx = base.indexOf(marker);
      if (idx !== -1) {
        rest = base.slice(idx + marker.length); // may start with <bucket>/<path>
        break;
      }
    }
    if (!rest) return null;

    // If the URL contained the 'sign/' marker, rest is still <bucket>/<path>
    const firstSlash = rest.indexOf('/');
    if (firstSlash === -1) return null;
    const bucket = rest.slice(0, firstSlash);
    const path = rest.slice(firstSlash + 1);
    if (!bucket || !path) return null;
    return { bucket, path: decodeURIComponent(path) };
  } catch {
    return null;
  }
}

/**
 * Generate a short-lived signed URL from a stored (possibly public) URL.
 * If parsing fails, returns the original URL.
 */
export async function getSignedUrlFromStoredUrl(
  url?: string,
  expiresIn: number = 60 * 10,
): Promise<string | undefined> {
  if (!url) return undefined;

  // Guard 1: data/blob URLs or non-http
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // Guard 2: already signed (common Supabase pattern includes token or /object/sign/)
  try {
    const u = new URL(
      url,
      typeof window !== 'undefined' ? window.location.origin : 'https://local',
    );
    const qs = u.searchParams;
    if (
      qs.has('token') ||
      qs.has('signature') ||
      qs.has('expires') ||
      u.pathname.includes('/storage/v1/object/sign/')
    ) {
      return url; // already signed, just use it
    }
  } catch {
    // If URL constructor fails, fall through; we'll try to parse generically
  }

  // Guard 3: not a Supabase storage URL — don't attempt to sign
  if (!url.includes('/storage/v1/object/')) return url;

  const parsed = parseStoragePublicUrl(url);
  if (!parsed) return url;
  const { bucket, path } = parsed;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl ?? url;
  } catch {
    return url;
  }
}

const BUCKET = 'map_assets';

export async function uploadQuestImage(file: File, pathPrefix = 'quests'): Promise<string> {
  const session = await supabase.auth.getSession();
  const userId: string | undefined = session?.data?.session?.user?.id;
  if (!userId) throw new Error('Must be signed in to upload images');

  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${pathPrefix}/${userId}/${fileName}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
    metadata: { uploader_id: userId },
  });

  if (error) throw error;

  return getPublicUrl(data?.path || filePath);
}

export function getPublicUrl(path: string): string {
  // For public buckets, this will be a valid public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
