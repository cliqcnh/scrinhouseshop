-- Allow authenticated customers to see guest repair bookings made with their email.
-- Bookings with a user_id remain restricted to that user.
drop policy if exists "users select own repair bookings" on public.repair_bookings;

create policy "users select own repair bookings"
  on public.repair_bookings for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
