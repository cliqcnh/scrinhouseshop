-- =============================================================================
-- 0012_installment_settings.sql
-- Store settings table for dynamic installment profit and deposit percentages.
-- =============================================================================

create table public.store_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger set_store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.store_settings enable row level security;

-- Public read policy (storefront and checkout need to read rates)
create policy "anyone view store settings" on public.store_settings
  for select to public using (true);

-- Staff manage policy
create policy "staff manage store settings" on public.store_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Insert default installment settings
insert into public.store_settings (key, value)
values (
  'installment_config',
  '{"profit_percentage": 20, "deposit_percentage": 40, "is_enabled": true}'::jsonb
)
on conflict (key) do nothing;
