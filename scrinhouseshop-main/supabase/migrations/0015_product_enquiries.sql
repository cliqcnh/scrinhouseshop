-- =============================================================================
-- 0015_product_enquiries.sql
-- Table schema for customer product enquiries and admin message threads.
-- =============================================================================

create table public.product_enquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  status text not null default 'pending' check (status in ('pending', 'replied', 'closed')),
  created_at timestamp with time zone not null default now()
);

create table public.product_enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.product_enquiries(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  message text not null,
  created_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.product_enquiries enable row level security;
alter table public.product_enquiry_messages enable row level security;

-- Policies for product_enquiries
-- Anyone (even anonymous storefront users) can create product enquiries
create policy "anyone create product enquiries"
  on public.product_enquiries for insert
  with check (true);

-- Only staff can read and manage product enquiries
create policy "staff manage product enquiries"
  on public.product_enquiries for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Policies for product_enquiry_messages
-- Anyone can insert messages (customer submitting initial message, admin sending replies)
create policy "anyone create product enquiry messages"
  on public.product_enquiry_messages for insert
  with check (true);

-- Only staff can read and update messages
create policy "staff manage product enquiry messages"
  on public.product_enquiry_messages for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
