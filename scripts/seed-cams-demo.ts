import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create demo org
  const orgName = 'CAMS Demo Org';
  let orgId: string;
  {
    const { data: existing, error } = await admin
      .from('organizations')
      .select('id')
      .eq('name', orgName)
      .maybeSingle();
    if (error) throw error;
    if (existing?.id) orgId = existing.id as string;
    else {
      const { data: ins, error: insErr } = await admin
        .from('organizations')
        .insert({ name: orgName, status: 'active' })
        .select('id')
        .single();
      if (insErr) throw insErr;
      orgId = ins.id as string;
    }
  }

  // Services
  const services = [
    { category: 'Tutoring', description: 'After-school math tutoring' },
    { category: 'Mentoring', description: 'Weekly mentorship sessions' },
  ];
  const serviceIds: Record<string, string> = {};
  for (const s of services) {
    const { data: sv, error: svErr } = await admin
      .from('services')
      .insert({ org_id: orgId, category: s.category, description: s.description })
      .select('id, category')
      .single();
    if (svErr) throw svErr;
    serviceIds[sv.category] = sv.id as string;
  }

  // Students
  const students = ['Alice', 'Bob', 'Carlos', 'Dina'];
  const studentIds: string[] = [];
  for (const name of students) {
    const { data: st, error: stErr } = await admin
      .from('students')
      .insert({ org_id: orgId, demographics: { name } })
      .select('id')
      .single();
    if (stErr) throw stErr;
    studentIds.push(st.id as string);
  }

  // Attendance: mark some random present/absent
  const statuses = ['present', 'absent', 'tardy'] as const;
  const today = new Date().toISOString().slice(0, 10);
  for (const sid of studentIds) {
    for (const cat of Object.keys(serviceIds)) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const { error: attErr } = await admin
        .from('attendance')
        .insert({ student_id: sid, service_id: serviceIds[cat], date: today, status });
      if (attErr) throw attErr;
    }
  }

  console.log('CAMS demo seed complete:', { orgId, serviceIds, studentCount: studentIds.length });
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
