-- Org Engagements: funding pools org admins can create and distribute to their members

-- Tables
create table if not exists public.org_engagements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  budget_total bigint not null default 0,
  remaining bigint not null default 0,
  status text not null default 'active' check (status in ('draft','active','closed')),
  total_distributed bigint not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_engagement_recipients (
  engagement_id uuid not null references public.org_engagements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_amount bigint not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (engagement_id, user_id)
);

alter table public.org_engagements enable row level security;
alter table public.org_engagement_recipients enable row level security;

-- RLS: org admins can read their org engagements and recipients
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='org_engagements' and policyname='org_engagements_admin_read') then
    create policy org_engagements_admin_read on public.org_engagements for select to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.org_id = org_engagements.org_id and p.role in ('org_admin','master_admin')
        )
        or public.is_master_admin()
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='org_engagement_recipients' and policyname='org_engagement_recipients_admin_read') then
    create policy org_engagement_recipients_admin_read on public.org_engagement_recipients for select to authenticated
      using (
        exists (
          select 1 from public.org_engagements e
          join public.profiles p on p.org_id = e.org_id and p.user_id = auth.uid()
          where e.id = org_engagement_recipients.engagement_id and p.role in ('org_admin','master_admin')
        )
        or public.is_master_admin()
      );
  end if;
end $$;

-- Helper: my org (first one from profiles)
create or replace function public.get_my_org()
returns table (org_id uuid, name text)
language sql security definer set search_path=public as $$
  select o.id, o.name
  from public.profiles p
  join public.organizations o on o.id = p.org_id
  where p.user_id = auth.uid()
  limit 1;
$$;
alter function public.get_my_org() owner to postgres;
grant execute on function public.get_my_org() to anon, authenticated;

-- List engagements for my org
create or replace function public.list_org_engagements()
returns setof public.org_engagements
language sql security definer set search_path=public as $$
  select e.*
  from public.org_engagements e
  join public.profiles p on p.org_id = e.org_id and p.user_id = auth.uid()
  where p.role in ('org_admin','master_admin');
$$;
alter function public.list_org_engagements() owner to postgres;
grant execute on function public.list_org_engagements() to authenticated;

-- Create engagement (org admin)
create or replace function public.create_org_engagement(p_name text, p_description text default null)
returns public.org_engagements
language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_row public.org_engagements; begin
  select org_id into v_org from public.get_my_org();
  if v_org is null then raise exception 'no org'; end if;
  -- ensure org admin
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.org_engagements(org_id, name, description, status)
  values (v_org, p_name, p_description, 'active')
  returning * into v_row;
  return v_row;
end $$;
alter function public.create_org_engagement(text, text) owner to postgres;
grant execute on function public.create_org_engagement(text, text) to authenticated;

-- Fund engagement from org wallet
create or replace function public.fund_org_engagement(p_engagement_id uuid, p_amount bigint, p_reason text default 'Fund engagement')
returns json language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_balance bigint; v_remaining bigint; begin
  select org_id into v_org from public.org_engagements where id = p_engagement_id;
  if v_org is null then raise exception 'engagement not found'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  -- admin check
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then raise exception 'forbidden'; end if;

  -- ensure wallet
  insert into public.org_coin_wallets(org_id, balance) values (v_org, 0)
  on conflict (org_id) do nothing;

  select balance into v_balance from public.org_coin_wallets where org_id = v_org;
  if v_balance < p_amount then raise exception 'insufficient org funds'; end if;

  -- move funds
  update public.org_coin_wallets set balance = balance - p_amount, updated_at = now() where org_id = v_org;
  insert into public.org_coin_txns(org_id, amount, reason, ref_type, ref_id)
  values (v_org, -p_amount, p_reason, 'ENGAGEMENT', p_engagement_id);

  update public.org_engagements set budget_total = budget_total + p_amount, remaining = remaining + p_amount, updated_at = now()
  where id = p_engagement_id
  returning remaining into v_remaining;

  return json_build_object('ok', true, 'remaining', v_remaining);
end $$;
alter function public.fund_org_engagement(uuid, bigint, text) owner to postgres;
grant execute on function public.fund_org_engagement(uuid, bigint, text) to authenticated;

-- Manage recipients
create or replace function public.upsert_engagement_recipient(p_engagement_id uuid, p_user_email text, p_amount bigint)
returns json language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_user uuid; begin
  if p_amount is null or p_amount < 0 then raise exception 'invalid amount'; end if;
  select org_id into v_org from public.org_engagements where id = p_engagement_id;
  if v_org is null then raise exception 'engagement not found'; end if;
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then raise exception 'forbidden'; end if;

  v_user := public.get_user_id_by_email(p_user_email);
  if v_user is null then raise exception 'user not found'; end if;

  -- ensure recipient belongs to org (via profiles)
  if not exists (
    select 1 from public.profiles p where p.user_id = v_user and p.org_id = v_org
  ) then raise exception 'recipient not in org'; end if;

  insert into public.org_engagement_recipients(engagement_id, user_id, planned_amount)
  values (p_engagement_id, v_user, p_amount)
  on conflict (engagement_id, user_id) do update set planned_amount = excluded.planned_amount;

  return json_build_object('ok', true);
end $$;
alter function public.upsert_engagement_recipient(uuid, text, bigint) owner to postgres;
grant execute on function public.upsert_engagement_recipient(uuid, text, bigint) to authenticated;

create or replace function public.remove_engagement_recipient(p_engagement_id uuid, p_user_email text)
returns json language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_user uuid; begin
  select org_id into v_org from public.org_engagements where id = p_engagement_id;
  if v_org is null then raise exception 'engagement not found'; end if;
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then raise exception 'forbidden'; end if;

  v_user := public.get_user_id_by_email(p_user_email);
  if v_user is null then raise exception 'user not found'; end if;

  delete from public.org_engagement_recipients where engagement_id = p_engagement_id and user_id = v_user;
  return json_build_object('ok', true);
end $$;
alter function public.remove_engagement_recipient(uuid, text) owner to postgres;
grant execute on function public.remove_engagement_recipient(uuid, text) to authenticated;

-- Distribute engagement funds to recipients
create or replace function public.distribute_engagement(p_engagement_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_remaining bigint; v_total bigint; r record; begin
  select org_id, remaining into v_org, v_remaining from public.org_engagements where id = p_engagement_id;
  if v_org is null then raise exception 'engagement not found'; end if;
  if not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.org_id = v_org and p.role in ('org_admin','master_admin')
  ) then raise exception 'forbidden'; end if;

  select coalesce(sum(planned_amount),0) into v_total from public.org_engagement_recipients where engagement_id = p_engagement_id;
  if v_total = 0 then raise exception 'no recipients'; end if;
  if v_remaining < v_total then raise exception 'insufficient engagement funds'; end if;

  -- ensure student wallet rows exist and credit
  for r in select user_id, planned_amount from public.org_engagement_recipients where engagement_id = p_engagement_id loop
    insert into public.student_coin_wallets(user_id, org_id, balance) values (r.user_id, v_org, 0)
    on conflict (user_id, org_id) do nothing;
    update public.student_coin_wallets set balance = balance + r.planned_amount, updated_at = now()
      where user_id = r.user_id and org_id = v_org;
    insert into public.student_coin_txns(user_id, org_id, amount, reason, ref_type, ref_id)
      values (r.user_id, v_org, r.planned_amount, 'ENGAGEMENT_DISTRIBUTION', 'ENGAGEMENT', p_engagement_id);
  end loop;

  update public.org_engagements set remaining = remaining - v_total, total_distributed = total_distributed + v_total,
    status = case when remaining - v_total = 0 then 'closed' else status end,
    updated_at = now()
  where id = p_engagement_id;

  return json_build_object('ok', true, 'distributed', v_total);
end $$;
alter function public.distribute_engagement(uuid) owner to postgres;
grant execute on function public.distribute_engagement(uuid) to authenticated;
