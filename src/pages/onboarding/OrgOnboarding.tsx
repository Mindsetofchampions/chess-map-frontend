import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/contexts/AuthContext';
import { createSystemNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export default function OrgOnboarding() {
  const { user, refreshRole } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [orgName, setOrgName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);

  const step = useMemo(() => {
    if (!orgName.trim()) return 1;
    if (!logoFile) return 2;
    if (!idFile) return 3;
    return 4; // review
  }, [orgName, logoFile, idFile]);

  // Upload to private buckets (no public URL). The returned path is what we persist.
  const uploadFile = async (bucket: string, path: string, file: File) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return showError('Not signed in', 'Please sign in before submitting onboarding');
    if (!orgName.trim())
      return showError('Organization Name Required', 'Please provide your organization name');
    if (!logoFile) return showError('Logo Required', 'Please upload your organization logo');
    if (!idFile) return showError('Photo ID Required', 'Please upload a photo ID for the admin');

    setSubmitting(true);
    try {
      // Private buckets and RLS are provisioned via migrations; just use them.
      const logoBucket = 'org_logos';
      const idBucket = 'org_admin_ids';

      // Upload files
      const logoPath = `orgs/${user.id}/${Date.now()}_${logoFile.name}`;
      const idPath = `orgs/${user.id}/${Date.now()}_${idFile.name}`;

      await uploadFile(logoBucket, logoPath, logoFile);
      await uploadFile(idBucket, idPath, idFile);

      // Insert onboarding row
      const { error: insertErr } = await supabase.from('org_onboardings').insert({
        org_name: orgName,
        org_logo_path: logoPath,
        admin_id_path: idPath,
        submitted_by: user.id,
        submitter_email: user.email,
        status: 'pending',
      });

      if (insertErr) throw insertErr;

      // Update user metadata to mark onboarding submitted and org association
      const updates: any = {
        user_metadata: {
          ...(user.user_metadata || {}),
          org_onboarding_submitted: true,
          org_approved: false,
          org_name: orgName,
        },
      };

      const { error: updErr } = await supabase.auth.updateUser(updates);
      if (updErr) throw updErr;

      // Notify master admins (in-app) and email the submitter (best-effort)
      try {
        // In-app notification for master_admins
        await createSystemNotification({
          title: 'New Org Onboarding Submitted',
          body: `${orgName} submitted by ${user.email}`,
          created_by: user.id,
          target_role: 'master_admin',
        });

        // Email notification (edge function, best-effort) to submitter for receipt
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send_onboarding_notification`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              event: 'system_notification',
              parent_email: user.email,
              subject: 'Organization onboarding submitted',
              text: `We received your organization onboarding for ${orgName}. An admin will review it shortly.`,
            }),
          },
        );
      } catch (_) {
        // non-fatal
      }

      // Refresh role/metadata and navigate to a pending page
      await refreshRole();
      showSuccess('Submitted', 'Organization onboarding submitted and pending review.');
      // Send org_admin to their dashboard where we can show a pending banner
      navigate('/org/dashboard');
    } catch (err: any) {
      console.error('Org onboarding failed', err);
      showError('Submission Failed', err?.message || 'Unable to submit onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary p-8'>
      <div className='max-w-3xl mx-auto bg-glass border-glass rounded-2xl p-6'>
        <h1 className='text-2xl font-bold text-white mb-4'>Organization Onboarding</h1>

        {/* Stepper */}
        <div className='flex items-center gap-3 mb-6'>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`flex items-center gap-2 ${n === step ? 'opacity-100' : 'opacity-70'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${n <= step ? 'bg-electric-blue-500 text-white' : 'bg-white/10 text-gray-300'}`}
              >
                {n}
              </div>
              <div className='text-sm text-gray-200'>
                {n === 1 && 'Org details'}
                {n === 2 && 'Upload logo'}
                {n === 3 && 'Admin ID'}
                {n === 4 && 'Review & submit'}
              </div>
            </div>
          ))}
        </div>
        <p className='text-gray-300 mb-4'>
          Please provide your organization details, upload your logo, and a photo ID for the admin.
          Your organization will remain in pending status until approved by a master admin.
        </p>

        <label className='block text-sm text-gray-200 mb-1'>Organization Name</label>
        <input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className='w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-3'
        />

        <label className='block text-sm text-gray-200 mb-1'>Organization Logo (PNG/JPG)</label>
        <input
          type='file'
          accept='image/*'
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setLogoFile(file);
            if (file) {
              const url = URL.createObjectURL(file);
              setLogoPreview(url);
            } else setLogoPreview(null);
          }}
          className='w-full text-sm text-gray-300 mb-3'
        />
        {logoPreview && (
          <div className='mb-3'>
            <img
              src={logoPreview}
              alt='Logo preview'
              className='h-20 rounded border border-white/10'
            />
          </div>
        )}

        <label className='block text-sm text-gray-200 mb-1'>Admin Photo ID (PNG/JPG)</label>
        <input
          type='file'
          accept='image/*'
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setIdFile(file);
            if (file) {
              const url = URL.createObjectURL(file);
              setIdPreview(url);
            } else setIdPreview(null);
          }}
          className='w-full text-sm text-gray-300 mb-3'
        />
        {idPreview && (
          <div className='mb-6'>
            <img src={idPreview} alt='ID preview' className='h-20 rounded border border-white/10' />
          </div>
        )}

        <div className='flex gap-3'>
          <button
            onClick={submit}
            disabled={submitting}
            className='px-4 py-2 rounded bg-electric-blue-500 text-white disabled:opacity-50'
            title={step !== 4 ? 'Complete required steps before submitting' : undefined}
          >
            {submitting ? 'Submitting…' : step === 4 ? 'Submit Onboarding' : 'Continue'}
          </button>
          <button
            onClick={() => navigate('/master/dashboard')}
            className='px-4 py-2 rounded bg-glass border-glass text-gray-300'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
