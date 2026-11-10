-- =============================================================================
-- 0011_installments_and_categories.sql
-- Category display order updates, new electronics categories, and installment applications schema.
-- =============================================================================

-- 1. Re-order existing top categories so Repair Parts is second after Phones
update public.categories set display_order = 1 where slug = 'phones';
update public.categories set display_order = 2 where slug = 'repair-parts';
update public.categories set display_order = 3 where slug = 'accessories';

-- 2. Insert new electronics categories
insert into public.categories (id, parent_id, name, slug, description, display_order)
values
  (
    '10000000-0000-0000-0000-000000000020',
    null,
    'Tablets & iPads',
    'tablets-ipads',
    'Apple iPads, Samsung Galaxy Tabs, and high-performance tablets.',
    4
  ),
  (
    '10000000-0000-0000-0000-000000000021',
    null,
    'Laptops',
    'laptops',
    'MacBooks, Windows laptops, and ultrabooks for work and gaming.',
    5
  ),
  (
    '10000000-0000-0000-0000-000000000022',
    null,
    'Gaming Consoles',
    'gaming-consoles',
    'PlayStation 5, Xbox Series X, Nintendo Switch, and gaming gear.',
    6
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

-- 3. Add installment columns to public.orders
alter table public.orders add column if not exists is_installment boolean not null default false;
alter table public.orders add column if not exists installment_deposit numeric(12, 2) default 0;
alter table public.orders add column if not exists installment_balance numeric(12, 2) default 0;

-- 4. Create public.installment_applications table
create table public.installment_applications (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid references public.orders(id) on delete cascade,
  user_id               uuid references public.profiles(id) on delete set null,
  product_id            uuid references public.products(id) on delete set null,
  variant_id            uuid references public.product_variants(id) on delete set null,
  base_price            numeric(12, 2) not null check (base_price >= 0),
  total_price           numeric(12, 2) not null check (total_price >= 0),
  deposit_amount        numeric(12, 2) not null check (deposit_amount >= 0),
  remaining_balance     numeric(12, 2) not null check (remaining_balance >= 0),
  ghana_card_number     text not null,
  ghana_card_front_url   text not null,
  ghana_card_back_url    text not null,
  status                text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'completed')),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_installment_order_id on public.installment_applications(order_id);
create index idx_installment_user_id on public.installment_applications(user_id);
create index idx_installment_status on public.installment_applications(status);

create trigger set_installment_applications_updated_at
  before update on public.installment_applications
  for each row execute function public.set_updated_at();

-- 5. Row Level Security (RLS)
alter table public.installment_applications enable row level security;

create policy "users view own installment applications" on public.installment_applications
  for select to authenticated using (auth.uid() = user_id or public.is_staff());

create policy "users create installment applications" on public.installment_applications
  for insert to authenticated with check (auth.uid() = user_id or public.is_staff());

create policy "staff manage installment applications" on public.installment_applications
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
