import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth() as any;
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.id) return setOk(false);

      // Short-circuit for org_admins: if an org_admin hasn't completed org onboarding
      // (org_approved flag in user metadata or profile), redirect them to the org onboarding page.
      if (role === 'org_admin') {
        const metadataApproved = user?.user_metadata?.org_approved === true || user?.user_metadata?.org_approved === 'true';
        // Also allow checking a DB-backed org_onboardings table for a pending/approved record
        if (!metadataApproved) {
          // mark as not-ok so we can redirect to org onboarding
          setOk(false);
          return;
        }
      }

      // Student onboarding flow (unchanged)
      const studentId = user.id;
      const { data: onb } = await supabase
        .from('onboarding_responses')
        .select('eligible')
        .eq('student_id', studentId)
        .maybeSingle();

      const { data: pc } = await supabase
        .from('parent_consents')
        .select('status')
        .eq('student_id', studentId)
        .maybeSingle();

      const eligible = !!onb?.eligible;
      // Allow access when student completed the checklist and either
      // (a) parent consent is approved, or (b) parent consent is pending review.
      const consentStatus = pc?.status ?? null;
      const consentAllowed = consentStatus === 'APPROVED' || consentStatus === 'PENDING';

      setOk(eligible && consentAllowed);
    })();
  }, [user?.id, role]);

  if (ok === null) return <div className="p-6 text-white">Checking onboarding…</div>;

  // If user is an org_admin and not ok, route them to the org onboarding page
  if (!ok && role === 'org_admin') return <Navigate to="/onboarding/org" replace />;

  if (!ok) return <Navigate to="/onboarding/start" replace />;

  return <>{children}</>;
}
