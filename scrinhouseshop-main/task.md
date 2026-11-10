# Security Hardening & Remediation — Task List

## 1. Database Migration & RLS Policy Hardening
- [x] `supabase/migrations/0014_security_hardening.sql` — Drop open `using (true)` policies on `warranties`, `reviews`, and `coupons`. Enforce owner checks (`user_id = auth.uid()` or `public.is_staff()`).

## 2. Checkout Server-Side Financial Math
- [x] `actions/checkout/place-order.ts` — Query `product_variants.price` server-side and calculate order subtotal from database prices.

## 3. Authentication & Redirect Security
- [x] Add updateProfilePhone action in customer.ts
- [x] Remove email/password fields from login-form.tsx
- [x] Remove email/password/name fields from register-form.tsx
- [x] Implement phone prompt page in auth/phone/page.tsx
- [x] Update auth/callback/route.ts to check and redirect when phone is missing
- [x] Compile and verify all unit tests pass
- [x] Create walkthrough.md summary with code changes

## 4. Admin Actions Defense-in-Depth Staff Guards
- [x] `actions/admin/orders.ts` — Add `await requireStaffUser()`.
- [x] `actions/admin/coupons.ts` — Add `await requireStaffUser()`.
- [x] `actions/admin/market-days.ts` — Add `await requireStaffUser()`.
- [x] `actions/admin/installments.ts` — Add `await requireStaffUser()`.
- [x] `actions/admin/repairs.ts` — Add `await requireStaffUser()`.
- [x] `actions/admin/trade-ins.ts` — Add `await requireStaffUser()`.
- [x] `actions/admin/blog.ts` — Add `await requireStaffUser()`.

## 5. PII Masking & Order Tracking
- [x] `actions/storefront/dashboard.ts` — Mask customer full name (`K*** M****`) and phone number (`024***5678`) on `trackOrder()`.

## 6. Security Response Headers
- [x] `next.config.ts` — Add `headers()` block returning CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy.

## 7. Timing-Safe Webhook Verification
- [x] `app/api/paystack/webhook/route.ts` — Use `crypto.timingSafeEqual()` for Paystack HMAC verification.

## 8. Verification & Testing
- [x] Run test suite (`npm test`), TypeScript check (`npx tsc --noEmit`), and production build (`npm run build`).
