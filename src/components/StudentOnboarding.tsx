import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const StudentOnboarding: React.FC = () => {
  const { user, refreshUser } = useAuth() as any;
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeHIPAA, setAgreeHIPAA] = useState(false);
  const [parentName, setParentName] = useState('');
  // parentSigned file handling will be added in a follow-up (uploads require storage wiring)
  // const [parentSigned, setParentSigned] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOnboarding = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Save minimal onboarding flags in user_metadata via auth update (or profile table if present)
      const updates: any = { user_metadata: { ...(user?.user_metadata || {}), onboarding_completed: true, parent_consent: { agreePrivacy, agreeHIPAA, parentName } } };
      // Use Supabase auth admin path: update user by current session
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No session token');
  // supabase-js v2 uses updateUser for profile updates
  // Note: updating user_metadata via client can be limited by RLS; consider server-side RPC if needed
  // @ts-ignore
  await supabase.auth.updateUser({ data: updates.user_metadata });
      // Refresh local user
      if (refreshUser) await refreshUser();
    } catch (e: any) {
      console.error('Onboarding save failed', e);
      setError(e?.message || 'Failed to save onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-glass border-glass rounded-xl p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-3">Welcome — A few quick steps</h2>
      <p className="text-sm text-gray-200 mb-4">Complete onboarding and parent consent to access quests, the map, and the store.</p>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
          <span className="text-sm text-gray-200">I consent to the app's privacy policy for student participation</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={agreeHIPAA} onChange={(e) => setAgreeHIPAA(e.target.checked)} />
          <span className="text-sm text-gray-200">I consent to health/film/media releases (if applicable)</span>
        </label>

        <label className="block">
          <div className="text-sm text-gray-200">Parent/Guardian name</div>
          <input className="mt-1 p-2 rounded w-full bg-black/20 border border-white/10" value={parentName} onChange={(e) => setParentName(e.target.value)} />
        </label>

        <label className="block">
          <div className="text-sm text-gray-200">Parent signature (upload ID or signed form)</div>
          <div className="text-xs text-gray-400">Upload will be supported in a follow-up (requires storage + admin review workflow)</div>
        </label>

        {error ? <div className="text-rose-400">{error}</div> : null}

        <div className="flex items-center gap-2">
          <button disabled={!agreePrivacy || !agreeHIPAA || !parentName || submitting} onClick={submitOnboarding} className="px-4 py-2 rounded bg-emerald-500 text-white disabled:opacity-50">Complete Onboarding</button>
        </div>
      </div>
    </div>
  );
};

export default StudentOnboarding;
