import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const CHECKS = [
  {
    key: 'age_confirm',
    label: 'I confirm I meet the minimum age requirement or have parental consent.',
  },
  { key: 'tos_accept', label: 'I agree to the Terms of Service.' },
  { key: 'privacy_accept', label: 'I agree to the Privacy Policy.' },
  { key: 'code_of_conduct', label: 'I agree to follow the Code of Conduct.' },
];

export default function StudentOnboarding() {
  const { user, role } = useAuth() as any;
  const studentId = user?.id;
  const navigate = useNavigate();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [eligible, setEligible] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState<string>('');
  const [studentSchool, setStudentSchool] = useState('');
  const [saving, setSaving] = useState(false);
  const allChecked = useMemo(() => CHECKS.every((c) => checks[c.key]), [checks]);

  useEffect(() => {
    if (!studentId) return;
    // redirect master/org_admin users to appropriate dashboards
    if (role === 'master_admin') {
      navigate('/master/dashboard');
      return;
    }
    if (role === 'org_admin' || role === 'staff') {
      navigate('/org/dashboard');
      return;
    }

    let cancelled = false;
    +(async () => {
      const { data } = await supabase
        .from('onboarding_responses')
        .select('*, student_name, student_age, student_school')
        .eq('student_id', studentId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setChecks(data.checkboxes || {});
        setEligible(!!data.eligible);
        if (data.student_name) setStudentName(data.student_name);
        if (typeof data.student_age === 'number') setStudentAge(String(data.student_age));
        if (data.student_school) setStudentSchool(data.student_school);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, role, navigate]);

  async function save() {
    if (!studentId) return;
    setSaving(true);
    try {
      const ageVal = studentAge ? Math.max(0, Number(studentAge)) : null;
      const payload = {
        student_id: studentId,
        checkboxes: checks,
        eligible: allChecked,
        student_name: studentName || null,
        student_age: Number.isFinite(ageVal as number) ? (ageVal as number) : null,
        student_school: studentSchool || null,
      } as any;
      const { data, error } = await supabase
        .from('onboarding_responses')
        .upsert(payload, { onConflict: 'student_id' })
        .select()
        .maybeSingle();
      if (error) throw error;
      setEligible(data?.eligible ?? false);
      alert('Saved.');
      // if user just became eligible, navigate to parent consent step
      if (data?.eligible) {
        navigate('/onboarding/parent');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='max-w-xl mx-auto p-6 space-y-4'>
      <h1 className='text-2xl font-bold text-white'>Student Onboarding</h1>
      <div className='bg-glass border-glass rounded-xl p-4 space-y-3'>
        <input
          className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white'
          placeholder='Your full name'
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
        />
        <input
          className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white'
          placeholder='Your age'
          inputMode='numeric'
          value={studentAge}
          onChange={(e) => setStudentAge(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <input
          className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white'
          placeholder='Your school (optional)'
          value={studentSchool}
          onChange={(e) => setStudentSchool(e.target.value)}
        />
      </div>
      <div className='bg-glass border-glass rounded-xl p-4 space-y-3'>
        {CHECKS.map((item) => (
          <label key={item.key} className='flex gap-3 text-white items-center'>
            <input
              type='checkbox'
              checked={!!checks[item.key]}
              onChange={(e) => setChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className='bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-4 py-2'
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <div className='text-gray-300'>Status: {eligible ? 'Eligible ✅' : 'Incomplete ❌'}</div>
    </div>
  );
}
