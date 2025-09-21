-- Create safe_spaces and store_items tables and approval/update functions

-- safe_spaces: created by orgs, require approval by masteradmin
create table if not exists safe_spaces (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null,
  name text not null,
  description text,
  address text,
  lat double precision,
  lng double precision,
  grade_level text, -- 'ES' | 'MS' | 'HS' or null for all
  contact_info jsonb,
  approved boolean default false,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_safe_spaces_org on safe_spaces(org_id);
create index if not exists idx_safe_spaces_grade on safe_spaces(grade_level);

-- store_items: items that orgs can list for students to buy with coins
create table if not exists store_items (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null,
  title text not null,
  description text,
  category text,
  price_coins integer not null default 0,
  image_url text,
  active boolean default true,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_store_items_org on store_items(org_id);

-- Function: org submits safe_space for approval (sets approved = false)
create or replace function public.submit_safe_space(p_org_id uuid, p_name text, p_description text, p_address text, p_lat double precision, p_lng double precision, p_grade_level text, p_contact jsonb)
returns uuid language plpgsql security definer as $$
declare
  new_id uuid;
begin
  insert into safe_spaces(org_id, name, description, address, lat, lng, grade_level, contact_info, approved, created_by)
  values(p_org_id, p_name, p_description, p_address, p_lat, p_lng, p_grade_level, p_contact, false, auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

-- Function: master_admin approves safe_space
create or replace function public.approve_safe_space(p_safe_space_id uuid)
returns boolean language plpgsql security definer as $$
begin
  update safe_spaces set approved = true, approved_by = auth.uid(), approved_at = now() where id = p_safe_space_id;
  return true;
end;
$$;

grant execute on function public.submit_safe_space to authenticated;
grant execute on function public.approve_safe_space to authenticated;
