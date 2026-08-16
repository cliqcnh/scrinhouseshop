-- =============================================================================
-- 0023_installment_frequency.sql
-- Introduce frequency plans and record payments for Hire Purchase installments.
-- =============================================================================

-- Add installment_frequency to installment_applications
alter table public.installment_applications
  add column if not exists installment_frequency text not null default 'monthly'
  check (installment_frequency in ('monthly', 'weekend'));

-- Create installment_payments table
create table if not exists public.installment_payments (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid references public.installment_applications(id) on delete cascade,
  amount            numeric(12, 2) not null check (amount > 0),
  payment_ref       text,
  payment_method    text not null default 'paystack',
  created_at        timestamptz not null default now()
);

-- Enable RLS
alter table public.installment_payments enable row level security;

-- RLS Policies
create policy "users view own installment payments" on public.installment_payments
  for select to authenticated using (
    exists (
      select 1 from public.installment_applications
      where id = application_id and (user_id = auth.uid() or public.is_staff())
    )
  );

create policy "users insert own installment payments" on public.installment_payments
  for insert to authenticated with check (
    exists (
      select 1 from public.installment_applications
      where id = application_id and user_id = auth.uid()
    )
  );

-- Trigger to update remaining balance on payment insert
create or replace function public.handle_installment_payment()
returns trigger as $$
begin
  update public.installment_applications
  set remaining_balance = greatest(0, remaining_balance - new.amount),
      status = case when remaining_balance - new.amount <= 0 then 'completed'::text else status end,
      updated_at = now()
  where id = new.application_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_installment_payment_inserted
  after insert on public.installment_payments
  for each row execute function public.handle_installment_payment();
