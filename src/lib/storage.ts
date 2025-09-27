import { supabase } from '@/lib/supabase';

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
