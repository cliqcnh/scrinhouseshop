-- =============================================================================
-- 0005_storage.sql
-- Storage bucket for product images/videos, uploaded by staff via the admin
-- panel. Public read (storefront needs to display images), staff-only write.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "product media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-media');

create policy "staff upload product media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-media' and public.is_staff());

create policy "staff update product media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-media' and public.is_staff())
  with check (bucket_id = 'product-media' and public.is_staff());

create policy "staff delete product media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-media' and public.is_staff());
