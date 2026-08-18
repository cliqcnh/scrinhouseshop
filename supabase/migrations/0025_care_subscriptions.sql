-- =============================================================================
-- 0025_care_subscriptions.sql
-- Phone Protection Subscription (ScrinHouse Care)
-- =============================================================================

-- 1. CARE PLAN TIERS
create table if not exists public.care_tiers (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  slug                      text not null unique,
  price                     numeric(12, 2) not null check (price >= 0),
  screen_limit              integer not null default 1,
  screen_copay_percentage   numeric(12, 2) not null default 50.00,
  battery_discount          numeric(12, 2) not null default 15.00,
  charging_port_free_count  integer not null default 0,
  back_glass_discount       numeric(12, 2) not null default 15.00,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

drop trigger if exists set_care_tiers_updated_at on public.care_tiers;
create trigger set_care_tiers_updated_at
  before update on public.care_tiers
  for each row execute function public.set_updated_at();

alter table public.care_tiers enable row level security;

drop policy if exists "anyone view active care tiers" on public.care_tiers;
create policy "anyone view active care tiers" on public.care_tiers
  for select to public using (is_active = true or public.is_staff());

drop policy if exists "staff manage care tiers" on public.care_tiers;
create policy "staff manage care tiers" on public.care_tiers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());


-- 2. CUSTOMER CARE SUBSCRIPTIONS
create table if not exists public.care_subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  tier_id                   uuid not null references public.care_tiers(id) on delete restrict,
  imei_serial               text not null,
  device_model              text not null,
  status                    text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'cancelled', 'expired')),
  paystack_ref              text unique,
  price_paid                numeric(12, 2) not null default 0.00,
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_care_subs_user on public.care_subscriptions(user_id);
create index if not exists idx_care_subs_status on public.care_subscriptions(status);

drop trigger if exists set_care_subscriptions_updated_at on public.care_subscriptions;
create trigger set_care_subscriptions_updated_at
  before update on public.care_subscriptions
  for each row execute function public.set_updated_at();

alter table public.care_subscriptions enable row level security;

drop policy if exists "users view own care subscriptions" on public.care_subscriptions;
create policy "users view own care subscriptions" on public.care_subscriptions
  for select to authenticated using (auth.uid() = user_id or public.is_staff());

drop policy if exists "users insert own care subscriptions" on public.care_subscriptions;
create policy "users insert own care subscriptions" on public.care_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "staff manage care subscriptions" on public.care_subscriptions;
create policy "staff manage care subscriptions" on public.care_subscriptions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());


-- 3. CARE CLAIMS LEDGER
create table if not exists public.care_claims (
  id                        uuid primary key default gen_random_uuid(),
  subscription_id           uuid not null references public.care_subscriptions(id) on delete cascade,
  repair_booking_id         uuid references public.repair_bookings(id) on delete set null,
  claim_type                text not null check (claim_type in ('screen', 'battery', 'charging_port', 'back_glass', 'other')),
  part_cost                 numeric(12, 2) not null check (part_cost >= 0),
  excess_paid               numeric(12, 2) not null default 0.00 check (excess_paid >= 0),
  co_pay_paid               numeric(12, 2) not null default 0.00 check (co_pay_paid >= 0),
  notes                     text,
  created_at                timestamptz not null default now()
);

alter table public.care_claims enable row level security;

drop policy if exists "users view own care claims" on public.care_claims;
create policy "users view own care claims" on public.care_claims
  for select to authenticated using (
    (select user_id from public.care_subscriptions s where s.id = subscription_id) = auth.uid()
    or public.is_staff()
  );

drop policy if exists "staff manage care claims" on public.care_claims;
create policy "staff manage care claims" on public.care_claims
  for all to authenticated using (public.is_staff()) with check (public.is_staff());


-- 4. INSERT DEFAULT SEED TIERS
insert into public.care_tiers (name, slug, price, screen_limit, screen_copay_percentage, battery_discount, charging_port_free_count, back_glass_discount)
values
  ('Student Care', 'student-care', 29.00, 1, 50.00, 15.00, 0, 15.00),
  ('Care Standard', 'care-standard', 39.00, 1, 40.00, 15.00, 0, 15.00),
  ('Courier & Rider Care', 'rider-care', 49.00, 1, 30.00, 20.00, 1, 20.00),
  ('Care Business', 'care-business', 79.00, 2, 20.00, 25.00, 99, 25.00)
on conflict (slug) do update
set name = excluded.name,
    price = excluded.price,
    screen_limit = excluded.screen_limit,
    screen_copay_percentage = excluded.screen_copay_percentage,
    battery_discount = excluded.battery_discount,
    charging_port_free_count = excluded.charging_port_free_count,
    back_glass_discount = excluded.back_glass_discount;
