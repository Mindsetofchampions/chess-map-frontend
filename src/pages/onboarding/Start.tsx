import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function OnboardingStart() {
  const { user, role } = useAuth() as any;
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      // If a master lands on the onboarding start page, send them to approvals
      if (role === 'master_admin') {
        navigate('/master/dashboard');
        return;
      }

      // Org roles should go through org onboarding flow, not student
      if (role === 'org_admin' || role === 'staff') {
        const approved =
          user?.user_metadata?.org_approved === true || user?.user_metadata?.org_approved === 'true';
        const submitted =
          user?.user_metadata?.org_onboarding_submitted === true ||
          user?.user_metadata?.org_onboarding_submitted === 'true';

        if (approved || submitted) {
          navigate('/org/dashboard');
        } else {
          navigate('/onboarding/org');
        }
        return;
      }
      if (!user?.id) return;
      try {
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
        const consentStatus = pc?.status ?? null;
        const consentAllowed = consentStatus === 'APPROVED' || consentStatus === 'PENDING';

        if (eligible && consentAllowed) {
          navigate('/dashboard');
        }
      } catch (err) {
        console.warn('Failed to check onboarding state', err);
      }
    })();
  }, [user?.id, role, navigate]);

  return (
    <div className='max-w-xl mx-auto p-6 space-y-4'>
      <h1 className='text-2xl font-bold text-white'>Welcome — Complete Onboarding</h1>
      <p className='text-gray-300'>Please complete both steps to access the site:</p>
      <ol className='list-decimal ml-6 text-gray-200 space-y-2'>
        <li>
          <Link className='text-cyber-green-300 underline' to='/onboarding/student'>
            Student Qualifying Questions
          </Link>
        </li>
        <li>
          <Link className='text-cyber-green-300 underline' to='/onboarding/parent'>
            Parent Consent & ID Upload
          </Link>
        </li>
      </ol>
    </div>
  );
}
