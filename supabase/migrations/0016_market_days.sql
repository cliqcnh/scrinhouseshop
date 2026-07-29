-- =============================================================================
-- 0016_market_days.sql
-- Database tables to support Tuesday & Saturday discount sales and live auctions.
-- =============================================================================

-- 1. Market Events table
create table public.market_events (
  id uuid primary key default gen_random_uuid(),
  day text not null check (day in ('tuesday', 'saturday')),
  start_time time not null,
  end_time time not null,
  title text not null,
  banner_url text,
  theme_image_url text,
  announcement text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Market Products table
create table public.market_products (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.market_events(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sale_type text not null check (sale_type in ('discount', 'auction')),
  created_at timestamptz not null default now(),
  constraint uq_event_product unique (event_id, product_id)
);

-- 3. Discount Rules table
create table public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  market_product_id uuid not null references public.market_products(id) on delete cascade unique,
  discount_percent numeric(5, 2),
  fixed_price numeric(12, 2),
  limit_quantity integer not null,
  limit_per_customer integer not null default 1,
  is_featured boolean not null default false,
  priority integer not null default 0,
  stock_remaining integer not null
);

-- 4. Auction Items table
create table public.auction_items (
  id uuid primary key default gen_random_uuid(),
  market_product_id uuid not null references public.market_products(id) on delete cascade unique,
  starting_price numeric(12, 2) not null,
  reserve_price numeric(12, 2) not null,
  min_increment numeric(12, 2) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  buy_now_price numeric(12, 2),
  auto_extend_minutes integer not null default 0,
  is_featured boolean not null default false,
  status text not null check (status in ('active', 'ended', 'cancelled')) default 'active'
);

-- 5. Auction Bids table
create table public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

-- 6. Auction Winners table
create table public.auction_winners (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auction_items(id) on delete cascade unique,
  user_id uuid references auth.users(id) on delete set null,
  winning_bid_id uuid references public.auction_bids(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  awarded_at timestamptz not null default now(),
  payment_deadline timestamptz not null,
  status text not null check (status in ('pending_payment', 'paid', 'expired')) default 'pending_payment'
);

-- 7. Market Notifications table
create table public.market_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.market_events enable row level security;
alter table public.market_products enable row level security;
alter table public.discount_rules enable row level security;
alter table public.auction_items enable row level security;
alter table public.auction_bids enable row level security;
alter table public.auction_winners enable row level security;
alter table public.market_notifications enable row level security;

-- Define Policies

-- public read access policies
create policy "anyone view enabled market events" on public.market_events for select using (true);
create policy "anyone view market products" on public.market_products for select using (true);
create policy "anyone view discount rules" on public.discount_rules for select using (true);
create policy "anyone view auction items" on public.auction_items for select using (true);
create policy "anyone view auction bids" on public.auction_bids for select using (true);

-- bid placement policies
create policy "authenticated insert bids" on public.auction_bids for insert to authenticated with check (auth.uid() = user_id);

-- users look up their own notifications and wins
create policy "users read own market notifications" on public.market_notifications for select to authenticated using (auth.uid() = user_id);
create policy "users manage own market notifications" on public.market_notifications for update to authenticated using (auth.uid() = user_id);
create policy "users read own wins" on public.auction_winners for select to authenticated using (auth.uid() = user_id);

-- staff manage policies
create policy "staff manage market events" on public.market_events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage market products" on public.market_products for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage discount rules" on public.discount_rules for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage auction items" on public.auction_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage auction bids" on public.auction_bids for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage auction winners" on public.auction_winners for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage market notifications" on public.market_notifications for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Place Bid RPC Function
-- ---------------------------------------------------------------------------
create or replace function public.place_bid(
  p_auction_id uuid,
  p_user_id uuid,
  p_amount numeric
)
returns json
language plpgsql
security definer
as $$
declare
  v_starting_price numeric;
  v_min_increment numeric;
  v_current_highest numeric;
  v_end_time timestamptz;
  v_status text;
  v_last_bid_time timestamptz;
  v_auto_extend_mins integer;
begin
  -- Select auction item details with exclusive lock
  select starting_price, min_increment, end_time, status, auto_extend_minutes
  into v_starting_price, v_min_increment, v_end_time, v_status, v_auto_extend_mins
  from public.auction_items
  where id = p_auction_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Auction item not found');
  end if;

  if v_status <> 'active' or v_end_time <= now() then
    return json_build_object('success', false, 'error', 'Auction is no longer active');
  end if;

  -- Check if same user is double bidding rapidly (within 3 seconds)
  select max(created_at)
  into v_last_bid_time
  from public.auction_bids
  where auction_id = p_auction_id and user_id = p_user_id;

  if v_last_bid_time is not null and v_last_bid_time > now() - interval '3 seconds' then
    return json_build_object('success', false, 'error', 'Please wait before placing another bid');
  end if;

  -- Get highest bid amount
  select coalesce(max(amount), 0)
  into v_current_highest
  from public.auction_bids
  where auction_id = p_auction_id;

  -- Validate bid amount
  if v_current_highest = 0 then
    if p_amount < v_starting_price then
      return json_build_object('success', false, 'error', 'Bid must be at least the starting price of GHS ' || v_starting_price);
    end if;
  else
    if p_amount < (v_current_highest + v_min_increment) then
      return json_build_object('success', false, 'error', 'Bid must be at least GHS ' || (v_current_highest + v_min_increment));
    end if;
  end if;

  -- Insert new bid
  insert into public.auction_bids (auction_id, user_id, amount)
  values (p_auction_id, p_user_id, p_amount);

  -- Autoextend feature: if bid in last X minutes, extend end_time by X minutes
  if v_auto_extend_mins > 0 and v_end_time - now() < (v_auto_extend_mins * interval '1 minute') then
    update public.auction_items
    set end_time = now() + (v_auto_extend_mins * interval '1 minute')
    where id = p_auction_id;
  end if;

  return json_build_object('success', true);
end;
$$;
