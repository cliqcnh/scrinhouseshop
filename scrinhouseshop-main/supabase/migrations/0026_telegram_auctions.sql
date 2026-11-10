-- =============================================================================
-- 0026_telegram_auctions.sql
-- Isolated database tables & PL/pgSQL RPCs for Scrinhouse Telegram Auction Bot
-- =============================================================================

-- 1. Sequence for Bidder ID formatting (SRH001, SRH002, etc.)
create sequence if not exists public.telegram_bidder_id_seq start with 1 increment by 1;

create or replace function public.next_bidder_id()
returns text
language plpgsql
as $$
declare
  val integer;
begin
  select nextval('public.telegram_bidder_id_seq') into val;
  return 'SRH' || lpad(val::text, 3, '0');
end;
$$;

-- 2. Telegram Auction Users table
create table if not exists public.telegram_auction_users (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  telegram_id       bigint not null unique,
  telegram_username text,
  full_name         text not null,
  phone             text not null,
  bidder_id         text not null unique default public.next_bidder_id(),
  status            text not null check (status in ('active', 'suspended')) default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_telegram_users_telegram_id on public.telegram_auction_users(telegram_id);
create index if not exists idx_telegram_users_bidder_id on public.telegram_auction_users(bidder_id);

create trigger set_telegram_auction_users_updated_at
  before update on public.telegram_auction_users
  for each row execute function public.set_updated_at();

-- 3. Telegram Auctions table
create table if not exists public.telegram_auctions (
  id                 uuid primary key default gen_random_uuid(),
  auction_number     text not null unique,
  product_id         uuid references public.products(id) on delete set null,
  title              text not null,
  description        text,
  starting_price     numeric(12, 2) not null check (starting_price >= 0),
  minimum_increment  numeric(12, 2) not null default 100 check (minimum_increment > 0),
  current_bid        numeric(12, 2) not null default 0,
  current_bidder_id  uuid references public.telegram_auction_users(id) on delete set null,
  start_time         timestamptz not null,
  end_time           timestamptz not null,
  status             text not null check (status in ('upcoming', 'active', 'paused', 'ended', 'cancelled')) default 'upcoming',
  anti_snipe_enabled boolean not null default true,
  extension_minutes  integer not null default 2,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_telegram_auctions_status on public.telegram_auctions(status);
create index if not exists idx_telegram_auctions_number on public.telegram_auctions(auction_number);

create trigger set_telegram_auctions_updated_at
  before update on public.telegram_auctions
  for each row execute function public.set_updated_at();

-- 4. Telegram Auction Bids table
create table if not exists public.telegram_auction_bids (
  id         uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.telegram_auctions(id) on delete cascade,
  bidder_id  uuid not null references public.telegram_auction_users(id) on delete cascade,
  amount     numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_telegram_bids_auction_id on public.telegram_auction_bids(auction_id);
create index if not exists idx_telegram_bids_bidder_id on public.telegram_auction_bids(bidder_id);

-- 5. Telegram Auction Winners table
create table if not exists public.telegram_auction_winners (
  id             uuid primary key default gen_random_uuid(),
  auction_id     uuid not null references public.telegram_auctions(id) on delete cascade unique,
  bidder_id      uuid references public.telegram_auction_users(id) on delete set null,
  winning_amount numeric(12, 2) not null,
  order_id       uuid references public.orders(id) on delete set null,
  payment_status text not null check (payment_status in ('pending_payment', 'paid', 'cancelled')) default 'pending_payment',
  created_at     timestamptz not null default now()
);

-- RLS Policies
alter table public.telegram_auction_users enable row level security;
alter table public.telegram_auctions enable row level security;
alter table public.telegram_auction_bids enable row level security;
alter table public.telegram_auction_winners enable row level security;

create policy "anyone read telegram_auctions" on public.telegram_auctions for select using (true);
create policy "anyone read telegram_auction_bids" on public.telegram_auction_bids for select using (true);
create policy "anyone read telegram_auction_winners" on public.telegram_auction_winners for select using (true);
create policy "anyone read telegram_auction_users" on public.telegram_auction_users for select using (true);

create policy "staff manage telegram_auctions" on public.telegram_auctions for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage telegram_auction_users" on public.telegram_auction_users for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage telegram_auction_bids" on public.telegram_auction_bids for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff manage telegram_auction_winners" on public.telegram_auction_winners for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 6. Atomic Bid Placement RPC
create or replace function public.place_telegram_bid(
  p_auction_id uuid,
  p_bidder_id uuid,
  p_amount numeric
)
returns json
language plpgsql
security definer
as $$
declare
  v_starting_price numeric;
  v_min_increment numeric;
  v_current_bid numeric;
  v_current_bidder uuid;
  v_end_time timestamptz;
  v_start_time timestamptz;
  v_status text;
  v_anti_snipe boolean;
  v_ext_mins integer;
  v_user_status text;
  v_new_end_time timestamptz;
  v_extended boolean := false;
  v_prev_bidder_id uuid;
begin
  -- 1. Check bidder status
  select status into v_user_status
  from public.telegram_auction_users
  where id = p_bidder_id;

  if not found then
    return json_build_object('success', false, 'error', 'Bidder profile not found. Please register first.');
  end if;

  if v_user_status <> 'active' then
    return json_build_object('success', false, 'error', 'Your bidding account is currently suspended.');
  end if;

  -- 2. Lock auction record FOR UPDATE
  select starting_price, minimum_increment, current_bid, current_bidder_id, start_time, end_time, status, anti_snipe_enabled, extension_minutes
  into v_starting_price, v_min_increment, v_current_bid, v_current_bidder, v_start_time, v_end_time, v_status, v_anti_snipe, v_ext_mins
  from public.telegram_auctions
  where id = p_auction_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Auction not found.');
  end if;

  if v_status <> 'active' then
    return json_build_object('success', false, 'error', 'Auction is not currently active.');
  end if;

  if now() < v_start_time then
    return json_build_object('success', false, 'error', 'Auction has not started yet.');
  end if;

  if now() >= v_end_time then
    return json_build_object('success', false, 'error', 'Auction has ended.');
  end if;

  -- 3. Calculate minimum required bid
  v_prev_bidder_id := v_current_bidder;
  
  if v_current_bid = 0 then
    if p_amount < v_starting_price then
      return json_build_object('success', false, 'error', 'Bid must be at least the starting price of GH₵' || v_starting_price, 'min_required', v_starting_price);
    end if;
  else
    if p_amount < (v_current_bid + v_min_increment) then
      return json_build_object('success', false, 'error', 'Bid must be at least GH₵' || (v_current_bid + v_min_increment), 'min_required', (v_current_bid + v_min_increment));
    end if;
  end if;

  -- 4. Check if bid triggers anti-sniping extension (bid within final 2 minutes)
  v_new_end_time := v_end_time;
  if v_anti_snipe and (v_end_time - now()) <= interval '2 minutes' then
    v_new_end_time := now() + (v_ext_mins * interval '1 minute');
    v_extended := true;
  end if;

  -- 5. Record the bid
  insert into public.telegram_auction_bids (auction_id, bidder_id, amount)
  values (p_auction_id, p_bidder_id, p_amount);

  -- 6. Update auction current state
  update public.telegram_auctions
  set current_bid = p_amount,
      current_bidder_id = p_bidder_id,
      end_time = v_new_end_time,
      updated_at = now()
  where id = p_auction_id;

  return json_build_object(
    'success', true,
    'amount', p_amount,
    'extended', v_extended,
    'new_end_time', v_new_end_time,
    'previous_bidder_id', v_prev_bidder_id
  );
end;
$$;
