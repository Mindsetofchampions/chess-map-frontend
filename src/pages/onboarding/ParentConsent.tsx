import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignaturePad from 'signature_pad';

import { useAuth } from '@/contexts/AuthContext';
import { notifyOnboarding } from '@/lib/notifyOnboarding';
import { supabase } from '@/lib/supabase';

export default function ParentConsent() {
  const { user, role } = useAuth() as any;
  const studentId = user?.id;
  const navigate = useNavigate();
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [sigPad, setSigPad] = useState<SignaturePad | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  // prevent unused var TypeScript error in some builds
  void checking;

  useEffect(() => {
    if (canvasRef.current && !sigPad) {
      const pad = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgba(255,255,255,0)',
        penColor: '#22C55E',
      });
      setSigPad(pad);
    }
  }, [canvasRef, sigPad]);

  // If this is a master/org admin, redirect them to appropriate dashboards
  useEffect(() => {
    if (role === 'master_admin') {
      navigate('/master/dashboard');
      return;
    }
    if (role === 'org_admin' || role === 'staff') {
      navigate('/org/dashboard');
      return;
    }
  }, [role, navigate]);

  // Ensure the student completed the initial checklist before allowing parent consent
  useEffect(() => {
    (async () => {
      if (!studentId) {
        setChecking(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('onboarding_responses')
          .select('eligible')
          .eq('student_id', studentId)
          .maybeSingle();
        const eligible = !!data?.eligible;
        if (!eligible) {
          // redirect back to student onboarding
          navigate('/onboarding/student');
        }
      } catch (err) {
        console.warn('Failed to check onboarding eligibility', err);
      } finally {
        setChecking(false);
      }
    })();
  }, [studentId]);

  function clearSig() {
    sigPad?.clear();
  }

  async function uploadParentId(): Promise<string | undefined> {
    if (!file || !studentId) return;
    const path = `${studentId}/${Date.now()}_${file.name}`;
    try {
      const { error } = await supabase.storage.from('parent_ids').upload(path, file, {
        cacheControl: 'no-store',
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = await supabase.storage.from('parent_ids').getPublicUrl(path);
      return pub.publicUrl;
    } catch (err: any) {
      // Provide clearer guidance when the storage bucket doesn't exist
      if (err?.message?.toLowerCase()?.includes('bucket not found') || err?.status === 404) {
        const guidance =
          "Storage bucket 'parent_ids' not found. Create a private bucket named 'parent_ids' in your Supabase project (Storage → New bucket) and re-run this action.";
        console.error(guidance, err);
        throw new Error(guidance);
      }
      throw err;
    }
  }

  async function submit() {
    if (!studentId) return alert('Not signed in.');
    if (!parentName || !parentEmail) return alert('Parent name and email required.');
    if (!sigPad || sigPad.isEmpty()) return alert('Signature is required.');

    setSubmitting(true);
    try {
      // rasterize signature and upload to storage
      const signatureDataUrl = sigPad.toDataURL('image/png');
      // Convert dataURL to blob
      const res = await fetch(signatureDataUrl);
      const blob = await res.blob();
      const sigPath = `${studentId}/${Date.now()}_signature.png`;
      const { error: sigErr } = await supabase.storage
        .from('parent_ids')
        .upload(sigPath, blob, { upsert: false });
      if (sigErr) throw sigErr;
      const { data: sigPub } = await supabase.storage.from('parent_ids').getPublicUrl(sigPath);

      // Try uploading parent ID if provided; handle guidance error for missing bucket
      let parentIdUrl: string | undefined;
      if (file) {
        try {
          parentIdUrl = await uploadParentId();
        } catch (idErr: any) {
          // If it's our guidance error about the missing bucket, surface it to the user and stop
          if (idErr?.message?.includes("Storage bucket 'parent_ids' not found")) {
            alert(idErr.message);
            return;
          }
          throw idErr;
        }
      }

      const payload = {
        student_id: studentId,
        parent_name: parentName,
        parent_email: parentEmail,
        signature_image_url: sigPub.publicUrl,
        parent_id_image_url: parentIdUrl,
        consent_signed: true,
        status: 'PENDING',
      };

      const { error } = await supabase
        .from('parent_consents')
        .upsert(payload, { onConflict: 'student_id' });
      if (error) throw error;

      // best-effort notification to parent/admin
      try {
        await notifyOnboarding('consent_submitted', {
          parent_email: parentEmail,
          student_id: studentId,
        });
      } catch (e) {
        // swallow notify failures
        console.warn('notify failed', e);
      }

      alert('Consent submitted. Awaiting review.');
      navigate('/dashboard');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='max-w-xl mx-auto p-6 space-y-4'>
      <h1 className='text-2xl font-bold text-white'>Parent/Guardian Consent</h1>

      <div className='bg-glass border-glass rounded-xl p-4 space-y-3'>
        <input
          className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white'
          placeholder='Parent/Guardian Full Name'
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
        />
        <input
          className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white'
          placeholder='Parent/Guardian Email'
          type='email'
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
        />
        <div className='space-y-2'>
          <div className='text-white'>Signature (draw in box):</div>
          <div className='bg-black/30 border border-glass rounded-lg'>
            <canvas ref={canvasRef} width={600} height={200} />
          </div>
          <button
            onClick={clearSig}
            className='bg-glass border-glass rounded px-3 py-1 text-gray-200'
          >
            Clear
          </button>
        </div>

        <div className='space-y-2'>
          <div className='text-white'>Upload Photo ID (front):</div>
          <input
            type='file'
            accept='image/*,application/pdf'
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className='text-gray-400 text-sm'>
            Only you (the student account) and admins can access this file.
          </p>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className='bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-4 py-2'
      >
        {submitting ? 'Submitting…' : 'Submit Consent'}
      </button>
    </div>
  );
}
