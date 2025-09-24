-- Normalize coordinate columns and add required fields if missing

-- Safe spaces: ensure lat/lng and approved
do $$
begin
  -- lat
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='safe_spaces' and column_name='lat'
  ) then
    if exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='safe_spaces' and column_name='latitude'
    ) then
      alter table public.safe_spaces rename column latitude to lat;
    else
      alter table public.safe_spaces add column lat double precision;
    end if;
  end if;

  -- lng
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='safe_spaces' and column_name='lng'
  ) then
    if exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='safe_spaces' and column_name='longitude'
    ) then
      alter table public.safe_spaces rename column longitude to lng;
    elsif exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='safe_spaces' and column_name='lon'
    ) then
      alter table public.safe_spaces rename column lon to lng;
    else
      alter table public.safe_spaces add column lng double precision;
    end if;
  end if;

  -- approved
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='safe_spaces' and column_name='approved'
  ) then
    alter table public.safe_spaces add column approved boolean not null default true;
  end if;
end $$;

-- Events: ensure lat/lng
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='lat'
  ) then
    if exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='latitude'
    ) then
      alter table public.events rename column latitude to lat;
    else
      alter table public.events add column lat double precision;
    end if;
  end if;

  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='lng'
  ) then
    if exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='longitude'
    ) then
      alter table public.events rename column longitude to lng;
    elsif exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='lon'
    ) then
      alter table public.events rename column lon to lng;
    else
      alter table public.events add column lng double precision;
    end if;
  end if;
end $$;
