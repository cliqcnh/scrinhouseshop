-- =============================================================================
-- 0002_roles_and_profiles.sql
-- RBAC (roles/permissions) + profiles table that extends auth.users.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,       -- customer, admin, super_admin, technician, rider, sales_staff
  description text,
  is_staff    boolean not null default false, -- true for any non-customer role
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,        -- e.g. "products.manage", "orders.refund"
  description text,
  created_at  timestamptz not null default now()
);

create table public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create trigger set_roles_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create type public.account_status as enum ('active', 'suspended', 'banned');

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role_id       uuid not null references public.roles(id),
  full_name     text,
  phone         text,
  avatar_url    text,
  status        public.account_status not null default 'active',
  loyalty_points integer not null default 0,
  referral_code  text unique,
  referred_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_profiles_role_id on public.profiles(role_id);
create index idx_profiles_referral_code on public.profiles(referral_code);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile (as "customer") whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  customer_role_id uuid;
begin
  select id into customer_role_id from public.roles where name = 'customer';

  insert into public.profiles (id, role_id, full_name, avatar_url, referral_code)
  values (
    new.id,
    customer_role_id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    upper(substr(replace(new.id::text, '-', ''), 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used everywhere by RLS policies: is the current user staff / a given role?
create or replace function public.current_role_name()
returns text
language sql
stable
security definer set search_path = public
as $$
  select r.name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((
    select r.is_staff
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
  ), false);
$$;

create or replace function public.has_role(role_names text[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_role_name() = any(role_names), false);
$$;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;

create policy "roles are readable by authenticated users"
  on public.roles for select
  to authenticated
  using (true);

create policy "only super_admin manages roles"
  on public.roles for all
  to authenticated
  using (public.has_role(array['super_admin']))
  with check (public.has_role(array['super_admin']));

create policy "permissions readable by staff"
  on public.permissions for select
  to authenticated
  using (public.is_staff());

create policy "only super_admin manages permissions"
  on public.permissions for all
  to authenticated
  using (public.has_role(array['super_admin']))
  with check (public.has_role(array['super_admin']));

create policy "role_permissions readable by staff"
  on public.role_permissions for select
  to authenticated
  using (public.is_staff());

create policy "only super_admin manages role_permissions"
  on public.role_permissions for all
  to authenticated
  using (public.has_role(array['super_admin']))
  with check (public.has_role(array['super_admin']));

create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "staff manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Seed the fixed role set. Permissions themselves are added/managed later
-- (Phase 5 — Admin/Employee management) but the role vocabulary is needed now
-- because auth.handle_new_user() depends on the "customer" role existing.
insert into public.roles (name, description, is_staff) values
  ('customer',     'Storefront customer',                         false),
  ('super_admin',  'Full system access',                          true),
  ('admin',        'Store administrator',                         true),
  ('sales_staff',  'Sales / order support staff',                 true),
  ('technician',   'Repairs phones booked for service',           true),
  ('rider',        'Handles pickup and delivery logistics',       true);
