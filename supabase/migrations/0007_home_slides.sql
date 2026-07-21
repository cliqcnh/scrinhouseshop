-- =============================================================================
-- 0007_home_slides.sql
-- Homepage hero banner slides with customizable images, titles, subtitles,
-- link URLs and action button text.
-- =============================================================================

create table public.home_slides (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,
  title         text,
  subtitle      text,
  link_url      text not null default '/',
  button_text   text not null default 'Shop Now',
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_home_slides_display_order on public.home_slides(display_order);
create index idx_home_slides_active        on public.home_slides(is_active);

create trigger set_home_slides_updated_at
  before update on public.home_slides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.home_slides enable row level security;

create policy "active slides are public" on public.home_slides
  for select to anon, authenticated using (is_active or public.is_staff());

create policy "staff manage slides" on public.home_slides
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
