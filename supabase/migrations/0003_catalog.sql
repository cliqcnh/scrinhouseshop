-- =============================================================================
-- 0003_catalog.sql
-- Categories, brands, suppliers, products, variants, images, videos.
-- =============================================================================

create type public.product_type as enum ('phone', 'accessory', 'repair_part');
create type public.product_condition as enum ('brand_new', 'uk_used');

-- ---------------------------------------------------------------------------
-- Categories (supports nesting: Phones > Brand New / UK Used, Accessories >
-- Chargers > Fast Chargers, etc.)
-- ---------------------------------------------------------------------------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid references public.categories(id) on delete set null,
  name          text not null,
  slug          text not null unique,
  description   text,
  image_url     text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_categories_parent_id on public.categories(parent_id);
create index idx_categories_slug on public.categories(slug);

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  logo_url    text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_brands_slug on public.brands(slug);

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Suppliers (referenced by products; full purchase-order workflow arrives in
-- the Inventory phase, but the relationship is foundational to the catalog).
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  email        citext,
  phone        text,
  address      text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid not null references public.categories(id),
  brand_id           uuid references public.brands(id),
  supplier_id        uuid references public.suppliers(id),
  name               text not null,
  slug               text not null unique,
  description        text,
  product_type       public.product_type not null,
  condition          public.product_condition,
  sku                text not null unique,
  barcode            text,
  base_price         numeric(12, 2) not null check (base_price >= 0),
  compare_at_price   numeric(12, 2) check (compare_at_price is null or compare_at_price >= base_price),
  cost_price         numeric(12, 2) check (cost_price is null or cost_price >= 0),
  tags               text[] not null default '{}',
  is_featured        boolean not null default false,
  is_active          boolean not null default true,
  seo_title          text,
  seo_description    text,
  avg_rating         numeric(3, 2) not null default 0 check (avg_rating between 0 and 5),
  review_count       integer not null default 0,
  view_count         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_products_category_id on public.products(category_id);
create index idx_products_brand_id on public.products(brand_id);
create index idx_products_slug on public.products(slug);
create index idx_products_sku on public.products(sku);
create index idx_products_type_active on public.products(product_type, is_active);
create index idx_products_tags on public.products using gin (tags);
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Product variants (storage / colour combinations, each with its own stock)
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.products(id) on delete cascade,
  sku                text not null unique,
  storage            text,
  color              text,
  price              numeric(12, 2) not null check (price >= 0),
  compare_at_price   numeric(12, 2) check (compare_at_price is null or compare_at_price >= price),
  stock_quantity     integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  weight_grams       integer,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (product_id, storage, color)
);

create index idx_variants_product_id on public.product_variants(product_id);
create index idx_variants_stock on public.product_variants(stock_quantity);

create trigger set_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Product images & videos
-- ---------------------------------------------------------------------------
create table public.product_images (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  variant_id     uuid references public.product_variants(id) on delete cascade,
  url            text not null,
  alt_text       text,
  display_order  integer not null default 0,
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index idx_product_images_product_id on public.product_images(product_id);
create unique index uq_product_primary_image
  on public.product_images(product_id)
  where is_primary;

create table public.product_videos (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  title       text,
  display_order integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_product_videos_product_id on public.product_videos(product_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — catalog data is public read (active rows only),
-- writes restricted to staff.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_videos enable row level security;

create policy "active categories are public" on public.categories
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "staff manage categories" on public.categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "active brands are public" on public.brands
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "staff manage brands" on public.brands
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff only suppliers" on public.suppliers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "active products are public" on public.products
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "staff manage products" on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "active variants are public" on public.product_variants
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "staff manage variants" on public.product_variants
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "product images are public" on public.product_images
  for select to anon, authenticated using (true);
create policy "staff manage product images" on public.product_images
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "product videos are public" on public.product_videos
  for select to anon, authenticated using (true);
create policy "staff manage product videos" on public.product_videos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
