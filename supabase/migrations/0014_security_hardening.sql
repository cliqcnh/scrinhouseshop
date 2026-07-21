-- =============================================================================
-- 0014_security_hardening.sql
-- Hardening RLS policies for Warranties, Reviews, and Coupons.
-- =============================================================================

-- 1. HARDEN WARRANTIES POLICY (C-02)
-- Drop open table-read policy that exposed all customer PII and serial numbers
drop policy if exists "anyone lookup warranties by serial" on public.warranties;

-- Scoped policy: users can view their own warranties; staff can view all
drop policy if exists "owners view own warranties" on public.warranties;
create policy "owners view own warranties"
  on public.warranties for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());


-- 2. HARDEN REVIEWS POLICY (C-03)
-- Drop wide-open insert policy that allowed unauthenticated impersonation
drop policy if exists "anyone create reviews" on public.reviews;
drop policy if exists "customers create own reviews" on public.reviews;

create policy "authenticated create own reviews"
  on public.reviews for insert
  to authenticated
  with check (
    profile_id = auth.uid() 
    or public.is_staff()
  );


-- 3. HARDEN COUPONS POLICY (H-04)
-- Drop open table-read policy that exposed all active promo codes
drop policy if exists "anyone view active coupons" on public.coupons;

-- Coupons are managed by staff and validated server-side per-code via validateCoupon()
drop policy if exists "staff manage coupons" on public.coupons;
create policy "staff manage coupons"
  on public.coupons for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
