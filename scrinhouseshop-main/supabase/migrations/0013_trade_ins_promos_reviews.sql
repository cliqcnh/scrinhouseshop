-- =============================================================================
-- 0013_trade_ins_promos_reviews.sql
-- Tables for Trade-In Requests, Coupons, and extending Customer Product Reviews.
-- =============================================================================

-- 1. TRADE-IN REQUESTS TABLE
create table if not exists public.trade_in_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  brand             text not null,
  model             text not null,
  storage           text not null,
  condition_grade   text not null,
  screen_condition text not null,
  battery_health    text not null,
  estimated_value   numeric(12, 2) not null check (estimated_value >= 0),
  contact_phone     text not null,
  notes             text,
  images            text[] default '{}',
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_trade_ins_user on public.trade_in_requests(user_id);
create index if not exists idx_trade_ins_status on public.trade_in_requests(status);

drop trigger if exists set_trade_in_requests_updated_at on public.trade_in_requests;
create trigger set_trade_in_requests_updated_at
  before update on public.trade_in_requests
  for each row execute function public.set_updated_at();

alter table public.trade_in_requests enable row level security;

drop policy if exists "users view own trade ins" on public.trade_in_requests;
create policy "users view own trade ins" on public.trade_in_requests
  for select to authenticated using (auth.uid() = user_id or public.is_staff());

drop policy if exists "users create trade ins" on public.trade_in_requests;
create policy "users create trade ins" on public.trade_in_requests
  for insert to public with check (true);

drop policy if exists "staff manage trade ins" on public.trade_in_requests;
create policy "staff manage trade ins" on public.trade_in_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());


-- 2. COUPONS TABLE
create table if not exists public.coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  discount_type     text not null check (discount_type in ('percentage', 'fixed')),
  discount_value    numeric(12, 2) not null check (discount_value > 0),
  min_order_amount  numeric(12, 2) not null default 0 check (min_order_amount >= 0),
  max_uses          integer,
  used_count        integer not null default 0,
  is_active         boolean not null default true,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons(code);

alter table public.coupons enable row level security;

drop policy if exists "anyone view active coupons" on public.coupons;
create policy "anyone view active coupons" on public.coupons
  for select to public using (is_active = true);

drop policy if exists "staff manage coupons" on public.coupons;
create policy "staff manage coupons" on public.coupons
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Insert initial welcome coupon code
insert into public.coupons (code, discount_type, discount_value, min_order_amount)
values ('WELCOME50', 'fixed', 50.00, 200.00)
on conflict (code) do nothing;


-- 3. EXTEND EXISTING REVIEWS TABLE
alter table public.reviews
  add column if not exists user_name text default 'Verified Customer',
  add column if not exists comment text,
  add column if not exists images text[] default '{}',
  add column if not exists status text default 'approved';

-- Allow guest & customer review creation policy safely
drop policy if exists "anyone create reviews" on public.reviews;
create policy "anyone create reviews" on public.reviews
  for insert to public with check (true);
