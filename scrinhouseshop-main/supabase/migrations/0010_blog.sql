-- =============================================================================
-- 0010_blog.sql
-- Blog posts table, trigger, and RLS policies.
-- =============================================================================

create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  content         text not null,
  cover_image_url text,
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_posts_slug on public.posts(slug);
create index idx_posts_published on public.posts(is_published, published_at);

create trigger set_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.posts enable row level security;

-- Policies
create policy "published posts are public" on public.posts
  for select to anon, authenticated using (is_published or public.is_staff());

create policy "staff manage posts" on public.posts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
