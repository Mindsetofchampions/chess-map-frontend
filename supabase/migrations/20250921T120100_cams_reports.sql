-- Aggregate report RPCs
create or replace function public.report_attendance_by_org()
returns table (
  org_id uuid,
  present int,
  absent int,
  tardy int
) language sql stable as $$
  select s.org_id,
    sum(case when a.status='present' then 1 else 0 end) as present,
    sum(case when a.status='absent' then 1 else 0 end) as absent,
    sum(case when a.status='tardy' then 1 else 0 end) as tardy
  from public.attendance a
  join public.students s on s.id = a.student_id
  group by s.org_id
$$;

create or replace function public.report_attendance_by_service()
returns table (
  service_id uuid,
  present int,
  absent int,
  tardy int
) language sql stable as $$
  select a.service_id,
    sum(case when a.status='present' then 1 else 0 end) as present,
    sum(case when a.status='absent' then 1 else 0 end) as absent,
    sum(case when a.status='tardy' then 1 else 0 end) as tardy
  from public.attendance a
  group by a.service_id
$$;
