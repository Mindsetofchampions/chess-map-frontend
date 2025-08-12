import supabase from './supabaseClient';

type UploadParams = {
  file: File;
  userId: string;
  questId?: string; // optional; will auto-generate if missing
};

/** why: single call that uploads file and writes quest_evidence row */
export async function uploadQuestEvidence({ file, userId, questId }: UploadParams) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const id = questId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now()));
  const path = `user/${userId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase
    .storage
    .from('quest-evidence')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { data, error: dbErr } = await supabase
    .from('quest_evidence')
    .insert({ user_id: userId, quest_id: id, url: path })
    .select('id, url')
    .single();
  if (dbErr) throw dbErr;

  return { id: data.id, path: data.url, questId: id };
}
