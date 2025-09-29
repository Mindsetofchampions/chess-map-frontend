-- Create safe_spaces table and RLS policies
create extension if not exists pgcrypto;

create table if not exists public.safe_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  lat double precision,
  lng double precision,
  grade_level text,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.safe_spaces enable row level security;

-- Read access for all authenticated users
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'safe_spaces' and policyname = 'Read safe_spaces'
  ) then
    do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Read safe_spaces') then
    execute 'drop policy "Read safe_spaces" on public.safe_spaces';
  end if;
end $plpgsql$;
create policy "Read safe_spaces" on public.safe_spaces 
      for select using (true);
  end if;
end $$;

-- Modify access only for master_admins
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'safe_spaces' and policyname = 'Modify safe_spaces (master)'
  ) then
    do $plpgsql$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='safe_spaces' and policyname='Modify safe_spaces (master)') then
    execute 'drop policy "Modify safe_spaces (master)" on public.safe_spaces';
  end if;
end $plpgsql$;
create policy "Modify safe_spaces (master)" on public.safe_spaces 
      for all
      using (public.is_user_in_roles(auth.uid(), array['master_admin']))
      with check (public.is_user_in_roles(auth.uid(), array['master_admin']));
  end if;
end $$;

comment on table public.safe_spaces is 'Designated safe locations shown on maps.';
