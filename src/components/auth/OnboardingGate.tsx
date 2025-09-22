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

      // Org roles (org_admin, staff): use org onboarding gate that relies on organization.status
      if (role === 'org_admin' || role === 'staff') {
        // Try to determine org id
        let orgId = user?.user_metadata?.org_id as string | undefined;
        if (!orgId) {
          const { data: myOrg } = await supabase.rpc('get_my_org');
          const row = Array.isArray(myOrg) ? myOrg?.[0] : myOrg;
          orgId = row?.id || row?.org_id;
        }

        if (orgId) {
          const { data: orgRow } = await supabase
            .from('organizations')
            .select('status')
            .eq('id', orgId)
            .maybeSingle();
          const status = orgRow?.status as string | undefined;
          if (status === 'approved' || status === 'active') {
            setOk(true);
            return;
          }
          if (status === 'pending') {
            // Allow access; dashboard can show pending banner
            setOk(true);
            return;
          }
        }

        // Fallback: check last onboarding submission for this user
        const { data: lastOnb } = await supabase
          .from('org_onboardings')
          .select('status')
          .eq('submitted_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastOnb?.status === 'pending') {
          setOk(true);
          return;
        }

        // No org or rejected/no submission: force onboarding
        setOk(false);
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
