-- =============================================================================
-- 0009_repairs.sql
-- Repair estimates and booking tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Repair Estimates (set by admin)
-- ---------------------------------------------------------------------------
create table public.repair_estimates (
  id           uuid primary key default gen_random_uuid(),
  device_model text not null, -- e.g. "iPhone 15 Pro"
  service_type text not null, -- e.g. "Screen Replacement", "Battery Replacement", "Charging Port Repair"
  price        numeric not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint uq_model_service unique (device_model, service_type)
);

alter table public.repair_estimates enable row level security;

-- Globally readable by anyone booking a repair
create policy "anyone read active repair estimates"
  on public.repair_estimates for select
  using (is_active = true);

create policy "staff manage repair estimates"
  on public.repair_estimates for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create trigger set_repair_estimates_updated_at
  before update on public.repair_estimates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Repair Bookings
-- ---------------------------------------------------------------------------
create table public.repair_bookings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text not null,
  device_model      text not null,
  service_type      text not null,
  issue_description text not null,
  estimated_amount  numeric not null,
  status            text not null default 'pending', -- pending, processing, repairing, completed, delivered, cancelled
  delivery_method   text not null default 'pickup_delivery', -- pickup_delivery, walk_in
  pickup_address    jsonb, -- name, phone, region, city, landmark
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_repair_bookings_user on public.repair_bookings(user_id);

alter table public.repair_bookings enable row level security;

-- Customers can view their own bookings, staff can manage all
create policy "users select own repair bookings"
  on public.repair_bookings for select
  to authenticated
  using (user_id = auth.uid());

create policy "anyone insert repair bookings"
  on public.repair_bookings for insert
  with check (true); -- allows guests and authenticated users to book

create policy "staff manage repair bookings"
  on public.repair_bookings for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create trigger set_repair_bookings_updated_at
  before update on public.repair_bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed Data for Estimates
-- ---------------------------------------------------------------------------
insert into public.repair_estimates (device_model, service_type, price) values
  ('iPhone 15 Pro Max', 'Screen Replacement', 2900),
  ('iPhone 15 Pro Max', 'Battery Replacement', 950),
  ('iPhone 15 Pro',     'Screen Replacement', 2500),
  ('iPhone 15 Pro',     'Battery Replacement', 950),
  ('iPhone 14 Pro Max', 'Screen Replacement', 2400),
  ('iPhone 14 Pro Max', 'Battery Replacement', 850),
  ('iPhone 14 Pro',     'Screen Replacement', 2100),
  ('iPhone 14 Pro',     'Battery Replacement', 850),
  ('iPhone 13 Pro Max', 'Screen Replacement', 1850),
  ('iPhone 13 Pro Max', 'Battery Replacement', 750),
  ('iPhone 13',         'Screen Replacement', 1250),
  ('iPhone 13',         'Battery Replacement', 650),
  ('iPhone 12',         'Screen Replacement', 950),
  ('iPhone 12',         'Battery Replacement', 550),
  ('iPhone 11',         'Screen Replacement', 750),
  ('iPhone 11',         'Battery Replacement', 450)
on conflict (device_model, service_type) do update set price = excluded.price;
