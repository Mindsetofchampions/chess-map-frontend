import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

// Load env: prefer .env.scripts.local, else default .env
if (fs.existsSync('.env.scripts.local')) {
  dotenvConfig({ path: '.env.scripts.local' });
} else {
  dotenvConfig();
}

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

  // Services (find-or-create by org_id + category)
  const services = [
    { category: 'Tutoring', description: 'After-school math tutoring' },
    { category: 'Mentoring', description: 'Weekly mentorship sessions' },
  ];
  const serviceIds: Record<string, string> = {};
  let servicesCreated = 0;
  let servicesReused = 0;
  for (const s of services) {
    const { data: existingSvc, error: findSvcErr } = await admin
      .from('services')
      .select('id, category')
      .eq('org_id', orgId)
      .eq('category', s.category)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (findSvcErr) throw findSvcErr;
    if (existingSvc?.id) {
      serviceIds[existingSvc.category as string] = existingSvc.id as string;
      servicesReused += 1;
    } else {
      const { data: sv, error: svErr } = await admin
        .from('services')
        .insert({ org_id: orgId, category: s.category, description: s.description })
        .select('id, category')
        .single();
      if (svErr) throw svErr;
      serviceIds[sv.category as string] = sv.id as string;
      servicesCreated += 1;
    }
  }

  // Students (find-or-create by org_id + demographics.name)
  const students = ['Alice', 'Bob', 'Carlos', 'Dina'];
  const studentIds: string[] = [];
  let studentsCreated = 0;
  let studentsReused = 0;
  for (const name of students) {
    const { data: existingSt, error: findStErr } = await admin
      .from('students')
      .select('id')
      .eq('org_id', orgId)
      .contains('demographics', { name })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (findStErr) throw findStErr;
    if (existingSt?.id) {
      studentIds.push(existingSt.id as string);
      studentsReused += 1;
    } else {
      const { data: st, error: stErr } = await admin
        .from('students')
        .insert({ org_id: orgId, demographics: { name } })
        .select('id')
        .single();
      if (stErr) throw stErr;
      studentIds.push(st.id as string);
      studentsCreated += 1;
    }
  }

  // Attendance: mark some random present/absent; skip duplicates for (student_id, service_id, date)
  const statuses = ['present', 'absent', 'tardy'] as const;
  const today = new Date().toISOString().slice(0, 10);
  let attendanceCreated = 0;
  let attendanceSkipped = 0;
  for (const sid of studentIds) {
    for (const cat of Object.keys(serviceIds)) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const { count, error: findAttErr } = await admin
        .from('attendance')
        .select('id', { head: true, count: 'exact' })
        .eq('student_id', sid)
        .eq('service_id', serviceIds[cat])
        .eq('date', today);
      if (findAttErr) throw findAttErr;
      if ((count ?? 0) > 0) {
        attendanceSkipped += 1;
      } else {
        const { error: attErr } = await admin
          .from('attendance')
          .insert({ student_id: sid, service_id: serviceIds[cat], date: today, status });
        if (attErr) throw attErr;
        attendanceCreated += 1;
      }
    }
  }

  console.log('CAMS demo seed complete:', {
    orgId,
    services: { created: servicesCreated, reused: servicesReused },
    students: { created: studentsCreated, reused: studentsReused },
    attendance: { created: attendanceCreated, skipped: attendanceSkipped },
    studentCount: studentIds.length,
  });
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
