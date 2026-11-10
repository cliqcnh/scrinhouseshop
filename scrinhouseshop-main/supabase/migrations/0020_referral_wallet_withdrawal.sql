-- =============================================================================
-- 0020_referral_wallet_withdrawal.sql
-- Implement referral reward config, wallets, transactions, and withdrawal requests.
-- =============================================================================

-- 1. Create admin_settings table
create table public.admin_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Seed default referral reward (e.g. 50 GHS)
insert into public.admin_settings (key, value) values ('referral_reward_amount', '50.00') on conflict do nothing;

-- 2. Create wallets table
create table public.wallets (
  id         uuid primary key references public.profiles(id) on delete cascade,
  balance    numeric(12, 2) not null default 0.00 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create wallet_transactions table
create table public.wallet_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('referral_reward', 'refund', 'trade_in', 'purchase_payment', 'withdrawal_debit', 'withdrawal_refund', 'admin_adjustment')),
  amount       numeric(12, 2) not null, -- signed (positive for credits, negative for debits)
  description  text not null,
  reference_id uuid, -- links to order_id, trade_in_id, withdrawal_id, etc.
  created_at   timestamptz not null default now()
);

-- 4. Create withdrawal_requests table
create table public.withdrawal_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  payment_method  text not null check (payment_method in ('momo', 'bank')),
  payment_details jsonb not null default '{}',
  status          text not null check (status in ('pending', 'approved', 'rejected', 'paid')) default 'pending',
  notes           text,
  transaction_ref text,
  paid_amount     numeric(12, 2) check (paid_amount >= 0),
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 5. Auto-create wallet for new user profiles
create or replace function public.handle_new_user_wallet()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.wallets (id, balance) values (new.id, 0.00) on conflict do nothing;
  return new;
end;
$$;

create trigger on_profile_created_create_wallet
  after insert on public.profiles
  for each row execute function public.handle_new_user_wallet();

-- Backfill wallets for existing profiles
insert into public.wallets (id, balance)
select id, 0.00 from public.profiles
on conflict do nothing;

-- 6. Trigger to process referral rewards when an order is completed/delivered
create or replace function public.process_referral_reward_on_delivered()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ref_by_id uuid;
  is_first_completed boolean;
  reward_amount numeric(12, 2);
  reward_amount_txt text;
begin
  if new.status = 'delivered' and (old.status is null or old.status <> 'delivered') then
    -- Check if this is the customer's first completed (delivered) order
    select not exists (
      select 1 from public.orders
      where user_id = new.user_id
        and status = 'delivered'
        and id <> new.id
    ) into is_first_completed;

    if is_first_completed then
      -- Find who referred them
      select referred_by into ref_by_id
      from public.profiles
      where id = new.user_id;

      if ref_by_id is not null then
        select value into reward_amount_txt
        from public.admin_settings
        where key = 'referral_reward_amount';

        reward_amount := coalesce(reward_amount_txt::numeric, 50.00);

        -- Credit referrer
        update public.wallets
        set balance = balance + reward_amount,
            updated_at = now()
        where id = ref_by_id;

        -- Record transaction
        insert into public.wallet_transactions (user_id, type, amount, description, reference_id)
        values (
          ref_by_id,
          'referral_reward',
          reward_amount,
          'Referral reward for first completed purchase of referred customer',
          new.id
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_order_delivered_referral
  after update on public.orders
  for each row execute function public.process_referral_reward_on_delivered();

-- 7. Trigger to process order refund to wallet
create or replace function public.process_refund_to_wallet()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'refunded' and old.status <> 'refunded' then
    update public.wallets
    set balance = balance + new.total,
        updated_at = now()
    where id = new.user_id;

    insert into public.wallet_transactions (user_id, type, amount, description, reference_id)
    values (
      new.user_id,
      'refund',
      new.total,
      'Refund for order #' || upper(substr(new.id::text, 1, 8)),
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger on_order_refunded_wallet
  after update on public.orders
  for each row execute function public.process_refund_to_wallet();

-- 8. Trigger to process trade-in quote to wallet
create or replace function public.process_trade_in_to_wallet()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and old.status <> 'approved' and new.user_id is not null then
    update public.wallets
    set balance = balance + new.estimated_value,
        updated_at = now()
    where id = new.user_id;

    insert into public.wallet_transactions (user_id, type, amount, description, reference_id)
    values (
      new.user_id,
      'trade_in',
      new.estimated_value,
      'Approved trade-in value for ' || new.brand || ' ' || new.model,
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger on_trade_in_approved_wallet
  after update on public.trade_in_requests
  for each row execute function public.process_trade_in_to_wallet();

-- 9. Trigger for order wallet payments (deducts on placement, refunds if cancelled)
alter table public.orders add column if not exists wallet_amount_applied numeric(12, 2) not null default 0.00;

create or replace function public.process_order_wallet_payment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Deduct on placement
  if tg_op = 'INSERT' and new.wallet_amount_applied > 0 then
    update public.wallets
    set balance = balance - new.wallet_amount_applied,
        updated_at = now()
    where id = new.user_id;

    insert into public.wallet_transactions (user_id, type, amount, description, reference_id)
    values (
      new.user_id,
      'purchase_payment',
      -new.wallet_amount_applied,
      'Payment for order #' || upper(substr(new.id::text, 1, 8)),
      new.id
    );
  end if;

  -- Refund on cancellation
  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' and old.wallet_amount_applied > 0 then
    update public.wallets
    set balance = balance + old.wallet_amount_applied,
        updated_at = now()
    where id = new.user_id;

    insert into public.wallet_transactions (user_id, type, amount, description, reference_id)
    values (
      new.user_id,
      'refund',
      old.wallet_amount_applied,
      'Refund for cancelled order #' || upper(substr(new.id::text, 1, 8)),
      new.id
    );
  end if;

  return new;
end;
$$;

create trigger on_order_wallet_payment_trigger
  after insert or update on public.orders
  for each row execute function public.process_order_wallet_payment();

-- 10. Row Level Security Policies
alter table public.admin_settings enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.withdrawal_requests enable row level security;

-- Admin settings access
create policy "staff manage settings"
  on public.admin_settings for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Wallets access
create policy "customers read own wallets"
  on public.wallets for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

create policy "staff manage wallets"
  on public.wallets for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Wallet transactions access
create policy "customers read own transactions"
  on public.wallet_transactions for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "staff manage transactions"
  on public.wallet_transactions for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Withdrawal requests access
create policy "customers view own withdrawals"
  on public.withdrawal_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "customers submit withdrawals"
  on public.withdrawal_requests for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "staff manage withdrawals"
  on public.withdrawal_requests for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
