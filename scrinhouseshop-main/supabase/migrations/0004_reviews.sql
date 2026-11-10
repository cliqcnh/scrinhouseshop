-- =============================================================================
-- 0004_reviews.sql
-- Product reviews + a trigger that keeps products.avg_rating/review_count in sync.
-- =============================================================================

create table public.reviews (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products(id) on delete cascade,
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  rating              smallint not null check (rating between 1 and 5),
  title               text,
  body                text,
  is_verified_purchase boolean not null default false,
  is_approved         boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (product_id, profile_id)
);

create index idx_reviews_product_id on public.reviews(product_id);
create index idx_reviews_profile_id on public.reviews(profile_id);

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
  set avg_rating   = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where product_id = target_product_id and is_approved), 0),
      review_count = (select count(*) from public.reviews where product_id = target_product_id and is_approved)
  where p.id = target_product_id;
  return null;
end;
$$;

create trigger refresh_product_rating_on_change
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

alter table public.reviews enable row level security;

create policy "approved reviews are public" on public.reviews
  for select to anon, authenticated
  using (is_approved or profile_id = auth.uid() or public.is_staff());

create policy "customers create own reviews" on public.reviews
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy "customers update own reviews" on public.reviews
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "customers delete own reviews" on public.reviews
  for delete to authenticated
  using (profile_id = auth.uid());

create policy "staff manage all reviews" on public.reviews
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
