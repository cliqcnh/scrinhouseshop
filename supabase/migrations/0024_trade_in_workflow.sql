-- =============================================================================
-- 0024_trade_in_workflow.sql
-- Modify Trade-In statuses to support valuation acceptance and credit release.
-- =============================================================================

-- 1. Update check constraint on trade_in_requests status
alter table public.trade_in_requests drop constraint if exists trade_in_requests_status_check;
alter table public.trade_in_requests add constraint trade_in_requests_status_check check (status in ('pending', 'valued', 'accepted', 'completed', 'rejected'));

-- 2. Allow users to update their own trade-ins status
drop policy if exists "users update own trade in status" on public.trade_in_requests;
create policy "users update own trade in status" on public.trade_in_requests
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Trigger to enforce user updates are only for accepting a valuation
create or replace function public.check_trade_in_user_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    -- Verify status is changing from 'valued' to 'accepted'
    if old.status <> 'valued' or new.status <> 'accepted' then
      raise exception 'Unauthorized status transition';
    end if;
    -- Verify no other column is modified
    if old.brand <> new.brand or
       old.model <> new.model or
       old.storage <> new.storage or
       old.condition_grade <> new.condition_grade or
       old.screen_condition <> new.screen_condition or
       old.battery_health <> new.battery_health or
       old.estimated_value <> new.estimated_value or
       old.contact_phone <> new.contact_phone or
       old.user_id <> new.user_id then
      raise exception 'Cannot modify trade-in details; only status can be updated.';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger on_trade_in_user_update
  before update on public.trade_in_requests
  for each row execute function public.check_trade_in_user_update();

-- 4. Update processing trigger to release funds only when status becomes 'completed'
create or replace function public.process_trade_in_to_wallet()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' and new.user_id is not null then
    update public.wallets
    set balance = balance + new.estimated_value,
        updated_at = now()
    where id = new.user_id;

    insert into public.wallet_transactions (user_id, type, amount, description, reference_id)
    values (
      new.user_id,
      'trade_in',
      new.estimated_value,
      'Trade-in value for ' || new.brand || ' ' || new.model,
      new.id
    );
  end if;
  return new;
end;
$$;