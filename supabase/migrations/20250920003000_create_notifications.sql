-- Notifications table and trigger for parent_consents
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  notif_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);

create or replace function public.fn_parent_consents_notify() returns trigger as $$
declare
  notif jsonb;
begin
  if (tg_op = 'INSERT') then
    notif = jsonb_build_object('student_id', new.student_id, 'status', new.status);
    insert into public.notifications(user_id, notif_type, payload) values (null, 'parent_consent_submitted', notif);
    return new;
  elsif (tg_op = 'UPDATE') then
    if (old.status is distinct from new.status) then
      notif = jsonb_build_object('student_id', new.student_id, 'old', old.status, 'new', new.status);
      insert into public.notifications(user_id, notif_type, payload) values (null, 'parent_consent_status_changed', notif);
    end if;
    return new;
  end if;
  return new;
end; $$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_parent_consents_notify') then
    create trigger trg_parent_consents_notify after insert or update on public.parent_consents
    for each row execute function public.fn_parent_consents_notify();
  end if;
end $$;
