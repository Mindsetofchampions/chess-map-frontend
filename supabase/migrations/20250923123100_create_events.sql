-- Create events table and RLS policies
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  lat double precision,
  lng double precision,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.events enable row level security;

-- Read access for all authenticated users
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'Read events'
  ) then
    do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Read events') then
    execute 'drop policy "Read events" on public.events';
  end if;
end $plpgsql$;
create policy "Read events" on public.events 
      for select using (true);
  end if;
end $$;

-- Modify access only for master_admins
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'Modify events (master)'
  ) then
    do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='Modify events (master)') then
    execute 'drop policy "Modify events (master)" on public.events';
  end if;
end $plpgsql$;
create policy "Modify events (master)" on public.events 
      for all
      using (public.is_user_in_roles(auth.uid(), array['master_admin']))
      with check (public.is_user_in_roles(auth.uid(), array['master_admin']));
  end if;
end $$;

comment on table public.events is 'Global events displayed on maps.';
