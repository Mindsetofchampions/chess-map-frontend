import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth() as any;
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.id) return setOk(false);
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
  }, [user?.id]);

  if (ok === null) return <div className="p-6 text-white">Checking onboarding…</div>;
  if (!ok) return <Navigate to="/onboarding/start" replace />;

  return <>{children}</>;
}
