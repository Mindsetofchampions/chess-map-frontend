import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth() as any;
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.id) return setOk(false);

      // Org roles (org_admin, staff): allow access unconditionally and show status banners in dashboard
      // This avoids repeated prompts and hard redirects; org onboarding page remains accessible via link.
      if (role === 'org_admin' || role === 'staff') {
        setOk(true);
        return;
      }

      // Master admin: no onboarding gate
      if (role === 'master_admin') {
        setOk(true);
        return;
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

  if (ok === null) return <div className='p-6 text-white'>Checking onboarding…</div>;

  // If user is an org role and not ok, route to org onboarding
  if (!ok && (role === 'org_admin' || role === 'staff'))
    return <Navigate to='/onboarding/org' replace />;

  if (!ok) return <Navigate to='/onboarding/start' replace />;

  return <>{children}</>;
}
