-- =============================================================================
-- 0021_product_installments.sql
-- Allow customizing installment plan values per product.
-- =============================================================================

alter table public.products add column if not exists allow_installments boolean not null default true;
alter table public.products add column if not exists installment_profit_percentage integer check (installment_profit_percentage between 0 and 100);
alter table public.products add column if not exists installment_deposit_percentage integer check (installment_deposit_percentage between 0 and 100);

-- Existing non-phone products should not have installments enabled by default
update public.products set allow_installments = false where product_type != 'phone';
