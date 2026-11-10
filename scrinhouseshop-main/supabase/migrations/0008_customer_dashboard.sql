-- =============================================================================
-- 0008_customer_dashboard.sql
-- Wishlist, saved addresses, and product warranties schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Wishlist Items
-- ---------------------------------------------------------------------------
create table public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_user_product unique (user_id, product_id)
);

create index idx_wishlist_user on public.wishlist_items(user_id);

alter table public.wishlist_items enable row level security;

create policy "users manage own wishlist"
  on public.wishlist_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Addresses
-- ---------------------------------------------------------------------------
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text not null,
  region      text not null,
  city        text not null,
  landmark    text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_addresses_user on public.addresses(user_id);

alter table public.addresses enable row level security;

create policy "users manage own addresses"
  on public.addresses for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger set_addresses_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Warranties
-- ---------------------------------------------------------------------------
create table public.warranties (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid references public.order_items(id) on delete set null,
  product_id     uuid not null references public.products(id) on delete restrict,
  user_id        uuid references auth.users(id) on delete set null,
  imei_serial    text not null unique,
  customer_name  text not null,
  customer_phone text not null,
  status         text not null default 'active', -- active, expired, voided
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_warranties_user on public.warranties(user_id);
create index idx_warranties_serial on public.warranties(imei_serial);

alter table public.warranties enable row level security;

-- Globally readable by anyone using the serial search lookup, or by the owner
create policy "anyone lookup warranties by serial"
  on public.warranties for select
  to anon, authenticated
  using (true);

create policy "staff manage warranties"
  on public.warranties for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create trigger set_warranties_updated_at
  before update on public.warranties
  for each row execute function public.set_updated_at();
