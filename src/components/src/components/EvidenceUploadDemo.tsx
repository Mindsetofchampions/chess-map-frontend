import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadQuestEvidence, getEvidenceSignedUrl } from '../services/evidenceService';

export default function EvidenceUploadDemo() {
  const { user } = useAuth(); // expects { id } on user
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  return (
    <div className="p-4 border rounded-xl">
      <div className="font-semibold mb-2">Upload Evidence (demo)</div>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-2"
      />
      <button
        className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        disabled={!file || !user?.id}
        onClick={async () => {
          try {
            setStatus('Uploading...');
            const res = await uploadQuestEvidence({ file: file!, userId: user!.id });
            setStatus(`Saved row ${res.id}`);
            const url = await getEvidenceSignedUrl(res.path, 300);
            setPreviewUrl(url);
          } catch (e: any) {
            setStatus(e.message || 'Upload failed');
          }
        }}
      >
        Upload
      </button>

      {status && <div className="mt-2 text-sm">{status}</div>}
      {previewUrl && (
        <div className="mt-3">
          <div className="text-sm mb-1">Preview (5 min link):</div>
          <img src={previewUrl} alt="evidence" className="max-w-xs rounded" />
        </div>
      )}
    </div>
  );
}
