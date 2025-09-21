import { useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function ParentConsentInline({ student }: { student: any }) {
  const [sig, setSig] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function uploadFile(bucket: 'parent_ids' | 'signatures', file: File) {
    const org_id = (await supabase.auth.getUser()).data.user?.user_metadata?.org_id;
    if (!org_id) throw new Error('No org id');
    const path = `${org_id}/${student.id}/${bucket === 'signatures' ? 'signature' : 'id'}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 30);
    return signed?.signedUrl ?? null;
  }

  async function submit() {
    if (!sig && !idDoc) return;
    setLoading(true);
    try {
      let signature_url: string | null = null;
      let id_doc_url: string | null = null;
      if (sig) signature_url = await uploadFile('signatures', sig);
      if (idDoc) id_doc_url = await uploadFile('parent_ids', idDoc);
      await supabase.from('parents').insert({
        student_id: student.id,
        consent_signed: !!signature_url,
        signature_url,
        id_doc_url,
      });
      // eslint-disable-next-line no-alert
      alert('Parent consent saved.');
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(e.message ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <label className='text-xs'>Signature</label>
      <input type='file' accept='image/*' onChange={(e) => setSig(e.target.files?.[0] ?? null)} />
      <label className='text-xs'>Photo ID</label>
      <input type='file' accept='image/*' onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)} />
      <button
        disabled={loading}
        onClick={submit}
        className='px-3 py-1 rounded bg-indigo-600 disabled:bg-indigo-900'
      >
        {loading ? 'Uploading…' : 'Save'}
      </button>
    </div>
  );
}
