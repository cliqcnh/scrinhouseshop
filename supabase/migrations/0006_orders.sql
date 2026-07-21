-- =============================================================================
-- 0006_orders.sql
-- Customer orders and order line-items. Paystack reference stored for
-- webhook reconciliation. Stock is decremented via a trigger on payment.
-- =============================================================================

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete restrict,
  status           public.order_status not null default 'pending_payment',

  -- Delivery address stored as a snapshot (never references a separate
  -- address table so historical orders survive address updates)
  delivery_address jsonb not null default '{}',

  -- Financials (GHS cedis, 2 decimal places)
  subtotal         numeric(12, 2) not null check (subtotal >= 0),
  delivery_fee     numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total            numeric(12, 2) not null check (total >= 0),

  -- Paystack
  paystack_ref     text unique,
  paystack_channel text,    -- "card", "mobile_money", etc.

  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_orders_user_id  on public.orders(user_id);
create index idx_orders_status   on public.orders(status);
create index idx_orders_paystack on public.orders(paystack_ref) where paystack_ref is not null;

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Order items (snapshot of product/variant at purchase time)
-- ---------------------------------------------------------------------------
create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,

  -- Nullable FK — preserved for relational lookup but the snapshot columns
  -- below are the authoritative record in case product is later deleted.
  variant_id     uuid references public.product_variants(id) on delete set null,
  product_id     uuid references public.products(id) on delete set null,

  -- Snapshot columns
  product_name   text not null,
  variant_label  text,          -- e.g. "256GB / Midnight"
  sku            text not null,
  image_url      text,

  price          numeric(12, 2) not null check (price >= 0),
  quantity       integer not null check (quantity > 0),
  subtotal       numeric(12, 2) not null check (subtotal >= 0),

  created_at     timestamptz not null default now()
);

create index idx_order_items_order_id   on public.order_items(order_id);
create index idx_order_items_variant_id on public.order_items(variant_id);

-- ---------------------------------------------------------------------------
-- Decrement stock when an order transitions to 'paid'
-- ---------------------------------------------------------------------------
create or replace function public.decrement_stock_on_paid()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'paid' and old.status = 'pending_payment' then
    update public.product_variants pv
    set stock_quantity = greatest(0, pv.stock_quantity - oi.quantity)
    from public.order_items oi
    where oi.order_id = new.id
      and oi.variant_id = pv.id;
  end if;
  return new;
end;
$$;

create trigger on_order_paid
  after update on public.orders
  for each row execute function public.decrement_stock_on_paid();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Orders: customers read/insert their own; staff manage all
create policy "customers read own orders"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "customers create orders"
  on public.orders for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "customers cancel pending orders"
  on public.orders for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending_payment')
  with check (user_id = auth.uid() and status = 'cancelled');

create policy "staff manage orders"
  on public.orders for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Order items: inherit order access
create policy "customers read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or public.is_staff())
    )
  );

create policy "system inserts order items"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

create policy "staff manage order items"
  on public.order_items for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
