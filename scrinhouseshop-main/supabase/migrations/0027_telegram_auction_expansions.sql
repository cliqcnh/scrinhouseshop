-- =============================================================================
-- 0027_telegram_auction_expansions.sql
-- Feature expansions for Scrinhouse Telegram Auction Bot:
-- Product images, descriptions, channel message tracking, and participant tracking.
-- =============================================================================

-- 1. Add image array & Telegram channel message tracking to telegram_auctions
alter table public.telegram_auctions
  add column if not exists images text[] not null default '{}',
  add column if not exists channel_message_id bigint,
  add column if not exists channel_chat_id text;

-- 2. Create Telegram Auction Participants table
create table if not exists public.telegram_auction_participants (
  id              uuid primary key default gen_random_uuid(),
  auction_id      uuid not null references public.telegram_auctions(id) on delete cascade,
  auction_user_id uuid not null references public.telegram_auction_users(id) on delete cascade,
  telegram_id     bigint not null,
  joined_at       timestamptz not null default now(),
  first_bid_at    timestamptz,
  last_bid_at     timestamptz,
  bid_count       integer not null default 0,
  status          text not null check (status in ('joined', 'active_bidder', 'winner', 'outbid')) default 'joined',
  constraint uq_telegram_auction_participant unique (auction_id, auction_user_id)
);

create index if not exists idx_participants_auction_id on public.telegram_auction_participants(auction_id);
create index if not exists idx_participants_user_id on public.telegram_auction_participants(auction_user_id);
create index if not exists idx_participants_joined_at on public.telegram_auction_participants(joined_at);

-- Enable RLS for participants table
alter table public.telegram_auction_participants enable row level security;

create policy "anyone read telegram_auction_participants" on public.telegram_auction_participants for select using (true);
create policy "staff manage telegram_auction_participants" on public.telegram_auction_participants for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 3. Update place_telegram_bid RPC to also maintain participant bid metrics
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
  v_telegram_id bigint;
  v_new_end_time timestamptz;
  v_extended boolean := false;
  v_prev_bidder_id uuid;
begin
  -- 1. Check bidder status
  select status, telegram_id into v_user_status, v_telegram_id
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

  -- 6. Upsert participant bid stats
  insert into public.telegram_auction_participants (
    auction_id,
    auction_user_id,
    telegram_id,
    joined_at,
    first_bid_at,
    last_bid_at,
    bid_count,
    status
  ) values (
    p_auction_id,
    p_bidder_id,
    v_telegram_id,
    now(),
    now(),
    now(),
    1,
    'active_bidder'
  )
  on conflict (auction_id, auction_user_id)
  do update set
    first_bid_at = coalesce(public.telegram_auction_participants.first_bid_at, now()),
    last_bid_at = now(),
    bid_count = public.telegram_auction_participants.bid_count + 1,
    status = 'active_bidder';

  -- 7. Update auction current state
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
