-- =============================================================================
-- 0029_receipts.sql
-- Digital receipt generator and verification system for sales & repairs.
-- =============================================================================

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  receipt_type text not null default 'repair', -- 'repair', 'sale', 'custom'
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  device_model text,
  imei_serial text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  tax numeric not null default 0,
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  payment_method text not null default 'cash', -- 'cash', 'momo', 'card', 'bank_transfer'
  payment_status text not null default 'paid', -- 'paid', 'partial', 'pending'
  warranty_duration text not null default '1 Week',
  warranty_terms text not null default 'All items and repairs have a 1-week non-damage warranty. Warranty covers manufacturer defects and workmanship only. Physical screen damage, cracks, water damage, or unauthorized tampering void the warranty.',
  warranty_expiry_date timestamptz,
  notes text,
  issued_by uuid references auth.users(id) on delete set null,
  issued_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_receipts_receipt_number on public.receipts(receipt_number);
create index if not exists idx_receipts_customer_phone on public.receipts(customer_phone);
create index if not exists idx_receipts_created_at on public.receipts(created_at desc);

alter table public.receipts enable row level security;

-- Staff have full permissions to manage receipts
drop policy if exists "staff manage receipts" on public.receipts;
create policy "staff manage receipts"
  on public.receipts for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Anyone can verify a receipt via public select
drop policy if exists "public verify receipts" on public.receipts;
create policy "public verify receipts"
  on public.receipts for select
  to anon, authenticated
  using (true);

drop trigger if exists set_receipts_updated_at on public.receipts;
create trigger set_receipts_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();
