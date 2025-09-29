/*
  # Create Custom Types

  1. Custom Types
    - `user_role` enum for role hierarchy
    - `quest_type` enum for different quest formats
    - `quest_status` enum for quest approval workflow
    - `submission_status` enum for submission grading
    - `persona_key` enum for character sprites
*/

-- User role hierarchy
do $plpgsql$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='user_role'
  ) then
    execute 'create type public.user_role as enum (''master_admin'',''org_admin'',''staff'',''student'')';
  end if;
end
$plpgsql$;

-- Quest type for different formats
do $plpgsql$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='quest_type'
  ) then
    execute 'create type public.quest_type as enum (''mcq'',''text'',''video'')';
  end if;
end
$plpgsql$;

-- Quest approval status
do $plpgsql$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='quest_status'
  ) then
    execute 'create type public.quest_status as enum (''draft'',''submitted'',''approved'',''rejected'',''archived'')';
  end if;
end
$plpgsql$;

-- Submission grading status
do $plpgsql$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='submission_status'
  ) then
    execute 'create type public.submission_status as enum (''pending'',''accepted'',''rejected'',''autograded'')';
  end if;
end
$plpgsql$;

-- Persona characters
do $plpgsql$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='persona_key'
  ) then
    execute 'create type public.persona_key as enum (''hootie'',''kittykat'',''gino'',''hammer'',''badge'')';
  end if;
end
$plpgsql$;