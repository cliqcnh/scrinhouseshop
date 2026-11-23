-- =============================================================================
-- 0030_coupons_rls_fix.sql
-- Allow storefront customers to look up active discount promo codes.
-- =============================================================================

-- Ensure active coupons can be read by anyone (authenticated or anon) validating a code
drop policy if exists "anyone view active coupons" on public.coupons;
create policy "anyone view active coupons" on public.coupons
  for select to public
  using (is_active = true);

-- Ensure staff can manage all coupons
drop policy if exists "staff manage coupons" on public.coupons;
create policy "staff manage coupons"
  on public.coupons for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
