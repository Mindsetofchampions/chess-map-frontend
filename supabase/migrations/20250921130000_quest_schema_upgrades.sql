/*
  Quest schema upgrades

  - Ensure quest_type enum includes 'numeric'
  - Add columns to quests: seats_total, seats_taken, grade_bands, lat, lng
  - Add constraints for valid grade bands and seat bounds
  - Add trigger to sync lat/lng <-> location geography
  - Backfill lat/lng from existing location
  - Helpful indexes
*/

-- 1) Extend enum quest_type with 'numeric'
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'quest_type' and e.enumlabel = 'numeric'
  ) then
    alter type public.quest_type add value 'numeric';
  end if;
end$$;

-- 2) Add new columns if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quests' and column_name = 'seats_total'
  ) then
    alter table public.quests add column seats_total integer;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quests' and column_name = 'seats_taken'
  ) then
    alter table public.quests add column seats_taken integer default 0;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quests' and column_name = 'grade_bands'
  ) then
    alter table public.quests add column grade_bands text[] default array[]::text[];
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quests' and column_name = 'lat'
  ) then
    alter table public.quests add column lat double precision;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quests' and column_name = 'lng'
  ) then
    alter table public.quests add column lng double precision;
  end if;
end$$;

-- 3) Constraints (idempotent)
do $$
begin
  -- valid grade bands must be subset of ['ES','MS','HS']
  if not exists (
    select 1 from pg_constraint
    where conname = 'quests_grade_bands_valid'
  ) then
    alter table public.quests
      add constraint quests_grade_bands_valid
      check (grade_bands <@ array['ES','MS','HS']::text[]);
  end if;

  -- non-negative seats
  if not exists (
    select 1 from pg_constraint
    where conname = 'quests_seats_non_negative'
  ) then
    alter table public.quests
      add constraint quests_seats_non_negative
      check ((seats_total is null or seats_total >= 0) and (seats_taken is null or seats_taken >= 0));
  end if;

  -- seats_taken cannot exceed seats_total when both present
  if not exists (
    select 1 from pg_constraint
    where conname = 'quests_seats_bounds'
  ) then
    alter table public.quests
      add constraint quests_seats_bounds
      check (seats_total is null or seats_taken is null or seats_taken <= seats_total);
  end if;
end$$;

-- 4) Sync trigger to keep geography and lat/lng aligned
create or replace function public.sync_quest_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If lat/lng provided, derive location (lng, lat)
  if (new.lat is not null and new.lng is not null) then
    new.location := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  elsif (new.location is not null) then
    -- If only location provided, derive lat/lng
    new.lat := ST_Y(ST_SetSRID(new.location::geometry, 4326));
    new.lng := ST_X(ST_SetSRID(new.location::geometry, 4326));
  end if;
  return new;
end
$$;

drop trigger if exists trg_sync_quest_location on public.quests;
create trigger trg_sync_quest_location
before insert or update on public.quests
for each row execute function public.sync_quest_location();

-- 5) Backfill lat/lng for existing rows that only have location
update public.quests q
set lat = ST_Y(ST_SetSRID(q.location::geometry, 4326)),
    lng = ST_X(ST_SetSRID(q.location::geometry, 4326))
where q.location is not null and (q.lat is null or q.lng is null);

-- 6) Helpful indexes (idempotent)
create index if not exists idx_quests_grade_bands_gin on public.quests using gin (grade_bands);
create index if not exists idx_quests_lat_lng on public.quests (lat, lng);
create index if not exists idx_quests_attribute_id on public.quests (attribute_id);
