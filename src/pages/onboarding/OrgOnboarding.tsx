import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';

export default function OrgOnboarding() {
  const { user, refreshRole } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [orgName, setOrgName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkBucket = async (bucket: string) => {
    try {
      const { data, error } = await supabase.storage.getBucket(bucket);
      if (error) return false;
      return !!data;
    } catch (e) { return false; }
  };

  const uploadFile = async (bucket: string, path: string, file: File) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = await supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!user) return showError('Not signed in', 'Please sign in before submitting onboarding');
    if (!orgName.trim()) return showError('Organization Name Required', 'Please provide your organization name');
    if (!logoFile) return showError('Logo Required', 'Please upload your organization logo');
    if (!idFile) return showError('Photo ID Required', 'Please upload a photo ID for the admin');

    setSubmitting(true);
    try {
      // Ensure buckets exist
      const logoBucket = 'org_logos';
      const idBucket = 'org_admin_ids';

      const logoExists = await checkBucket(logoBucket);
      const idExists = await checkBucket(idBucket);

      if (!logoExists || !idExists) {
        showError('Storage Buckets Missing', `Please create private buckets: '${logoBucket}' and '${idBucket}' in your Supabase project (Storage → New bucket).`);
        setSubmitting(false);
        return;
      }

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
        status: 'pending'
      });

      if (insertErr) throw insertErr;

      // Update user metadata to mark onboarding submitted and org association
      const updates: any = {
        user_metadata: {
          ...(user.user_metadata || {}),
          org_onboarding_submitted: true,
          org_approved: false,
          org_name: orgName
        }
      };

      const { error: updErr } = await supabase.auth.updateUser(updates as any);
      if (updErr) throw updErr;

      // Refresh role/metadata and navigate to a pending page
      await refreshRole();
      showSuccess('Submitted', 'Organization onboarding submitted. An admin will review and approve.');
      navigate('/master/quests/approvals');
    } catch (err: any) {
      console.error('Org onboarding failed', err);
      showError('Submission Failed', err?.message || 'Unable to submit onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary p-8">
      <div className="max-w-3xl mx-auto bg-glass border-glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Organization Onboarding</h1>
        <p className="text-gray-300 mb-4">Please provide your organization details, upload your logo, and a photo ID for the admin. Your organization will remain in pending status until approved by a master admin.</p>

        <label className="block text-sm text-gray-200 mb-1">Organization Name</label>
        <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full bg-glass border-glass rounded-xl px-3 py-2 text-white mb-3" />

        <label className="block text-sm text-gray-200 mb-1">Organization Logo (PNG/JPG)</label>
        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-300 mb-3" />

        <label className="block text-sm text-gray-200 mb-1">Admin Photo ID (PNG/JPG)</label>
        <input type="file" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-300 mb-6" />

        <div className="flex gap-3">
          <button onClick={submit} disabled={submitting} className="px-4 py-2 rounded bg-electric-blue-500 text-white disabled:opacity-50">Submit Onboarding</button>
          <button onClick={() => navigate('/master/dashboard')} className="px-4 py-2 rounded bg-glass border-glass text-gray-300">Cancel</button>
        </div>
      </div>
    </div>
  );
}
