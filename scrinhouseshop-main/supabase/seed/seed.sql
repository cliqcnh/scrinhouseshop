-- =============================================================================
-- Development seed data. Run with:
--   supabase db reset   (applies migrations then this file), or
--   psql "$DATABASE_URL" -f supabase/seed/seed.sql
--
-- Images point at picsum.photos placeholders — swap for real product photography
-- before going live. Everything else (schema, relationships, pricing shape) is
-- representative of real ScrinHouse catalog data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, description, display_order) values
  ('10000000-0000-0000-0000-000000000001', 'Phones', 'phones', 'Brand new and UK-used smartphones.', 1),
  ('10000000-0000-0000-0000-000000000002', 'Accessories', 'accessories', 'Chargers, cases, earbuds and more.', 2),
  ('10000000-0000-0000-0000-000000000003', 'Repair Parts', 'repair-parts', 'Genuine screens, batteries and components.', 3);

insert into public.categories (id, parent_id, name, slug, description, display_order) values
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Brand New', 'phones-brand-new', 'Sealed, brand new smartphones.', 1),
  ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'UK Used', 'phones-uk-used', 'Grade-A UK-used smartphones.', 2),
  ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Chargers', 'chargers', 'Wall, wireless and fast chargers.', 1),
  ('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Cases & Protection', 'cases-protection', 'Cases, tempered glass and screen protectors.', 2),
  ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'Audio', 'audio', 'Earbuds, AirPods and Bluetooth speakers.', 3),
  ('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'Screens', 'screens', 'OLED / LCD / GX OLED replacement screens.', 1),
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', 'Batteries', 'batteries', 'Replacement batteries.', 2);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
insert into public.brands (id, name, slug) values
  ('20000000-0000-0000-0000-000000000001', 'Apple', 'apple'),
  ('20000000-0000-0000-0000-000000000002', 'Samsung', 'samsung'),
  ('20000000-0000-0000-0000-000000000003', 'Xiaomi', 'xiaomi'),
  ('20000000-0000-0000-0000-000000000004', 'Anker', 'anker'),
  ('20000000-0000-0000-0000-000000000005', 'Baseus', 'baseus'),
  ('20000000-0000-0000-0000-000000000006', 'Spigen', 'spigen');

-- ---------------------------------------------------------------------------
-- Products — Phones
-- ---------------------------------------------------------------------------
insert into public.products
  (id, category_id, brand_id, name, slug, description, product_type, condition, sku, base_price, compare_at_price, tags, is_featured, avg_rating, review_count)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    'iPhone 15 Pro', 'iphone-15-pro',
    'A17 Pro chip, titanium design, and a 48MP main camera with 5x telephoto zoom.',
    'phone', 'brand_new', 'SH-IP15P', 8999.00, 9999.00,
    array['5g', 'titanium', 'flagship'], true, 4.8, 124
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra',
    'Galaxy AI, a 200MP camera, and a built-in S Pen for maximum productivity.',
    'phone', 'brand_new', 'SH-SGS24U', 8499.00, null,
    array['5g', 's-pen', 'flagship'], true, 4.7, 89
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    'iPhone 12 (UK Used, Grade A)', 'iphone-12-uk-used',
    'Fully tested UK-used iPhone 12 in excellent condition with a minimum 85% battery health.',
    'phone', 'uk_used', 'SH-IP12U', 2799.00, 3299.00,
    array['uk-used', 'value'], true, 4.5, 210
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
    'Xiaomi Redmi Note 13 Pro', 'xiaomi-redmi-note-13-pro',
    'A 200MP camera and 120W HyperCharge in an affordable, brand-new package.',
    'phone', 'brand_new', 'SH-XRN13P', 2399.00, null,
    array['budget', 'fast-charging'], false, 4.4, 56
  );

-- ---------------------------------------------------------------------------
-- Products — Accessories
-- ---------------------------------------------------------------------------
insert into public.products
  (id, category_id, brand_id, name, slug, description, product_type, sku, base_price, compare_at_price, tags, is_featured, avg_rating, review_count)
values
  (
    '30000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004',
    'Anker 20W USB-C Fast Charger', 'anker-20w-usb-c-fast-charger',
    'Compact PIQ 3.0 fast charger, safe for all USB-C phones.',
    'accessory', 'SH-ANK20W', 129.00, 159.00,
    array['fast-charging', 'usb-c'], true, 4.9, 340
  ),
  (
    '30000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000006',
    'Spigen Rugged Armor Case', 'spigen-rugged-armor-case',
    'Military-grade drop protection with a slim, flexible TPU build.',
    'accessory', 'SH-SPGRA', 149.00, null,
    array['case', 'protective'], true, 4.6, 178
  ),
  (
    '30000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001',
    'AirPods Pro (2nd generation)', 'airpods-pro-2nd-gen',
    'Active Noise Cancellation, Adaptive Audio, and USB-C charging case.',
    'accessory', 'SH-APP2', 1899.00, 2199.00,
    array['audio', 'wireless'], true, 4.8, 402
  ),
  (
    '30000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005',
    'Baseus Tempered Glass Screen Protector', 'baseus-tempered-glass-protector',
    '9H hardness tempered glass with an anti-fingerprint coating.',
    'accessory', 'SH-BSTG', 39.00, null,
    array['screen-protector'], false, 4.3, 96
  );

-- ---------------------------------------------------------------------------
-- Products — Repair Parts
-- ---------------------------------------------------------------------------
insert into public.products
  (id, category_id, name, slug, description, product_type, sku, base_price, tags, is_featured, avg_rating, review_count)
values
  (
    '30000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000009',
    'iPhone 13 OLED Screen Assembly', 'iphone-13-oled-screen',
    'Genuine-grade OLED replacement screen with True Tone support, for certified technicians.',
    'repair_part', 'SH-RP-IP13OLED', 899.00,
    array['oled', 'screen'], false, 4.6, 41
  ),
  (
    '30000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000010',
    'iPhone 12 Replacement Battery', 'iphone-12-replacement-battery',
    '0-cycle replacement battery with installation-ready flex cable.',
    'repair_part', 'SH-RP-IP12BAT', 249.00,
    array['battery'], false, 4.5, 63
  );

-- ---------------------------------------------------------------------------
-- Variants
-- ---------------------------------------------------------------------------
insert into public.product_variants (product_id, sku, storage, color, price, stock_quantity) values
  ('30000000-0000-0000-0000-000000000001', 'SH-IP15P-128-BLK', '128GB', 'Black Titanium', 8999.00, 12),
  ('30000000-0000-0000-0000-000000000001', 'SH-IP15P-256-BLK', '256GB', 'Black Titanium', 9699.00, 8),
  ('30000000-0000-0000-0000-000000000001', 'SH-IP15P-128-BLU', '128GB', 'Blue Titanium', 8999.00, 5),

  ('30000000-0000-0000-0000-000000000002', 'SH-SGS24U-256-BLK', '256GB', 'Titanium Black', 8499.00, 10),
  ('30000000-0000-0000-0000-000000000002', 'SH-SGS24U-512-BLK', '512GB', 'Titanium Black', 9299.00, 4),

  ('30000000-0000-0000-0000-000000000003', 'SH-IP12U-64-BLK', '64GB', 'Black', 2799.00, 18),
  ('30000000-0000-0000-0000-000000000003', 'SH-IP12U-128-WHT', '128GB', 'White', 3099.00, 9),

  ('30000000-0000-0000-0000-000000000004', 'SH-XRN13P-256-BLU', '256GB', 'Ocean Blue', 2399.00, 22),

  ('30000000-0000-0000-0000-000000000010', 'SH-ANK20W-WHT', null, 'White', 129.00, 150),
  ('30000000-0000-0000-0000-000000000011', 'SH-SPGRA-CLR', null, 'Matte Black', 149.00, 75),
  ('30000000-0000-0000-0000-000000000012', 'SH-APP2-WHT', null, 'White', 1899.00, 40),
  ('30000000-0000-0000-0000-000000000013', 'SH-BSTG-CLR', null, 'Clear', 39.00, 300),

  ('30000000-0000-0000-0000-000000000020', 'SH-RP-IP13OLED-01', null, null, 899.00, 30),
  ('30000000-0000-0000-0000-000000000021', 'SH-RP-IP12BAT-01', null, null, 249.00, 60);

-- ---------------------------------------------------------------------------
-- Images (one primary image per product; placeholders)
-- ---------------------------------------------------------------------------
insert into public.product_images (product_id, url, alt_text, is_primary, display_order) values
  ('30000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/iphone15pro/800/800', 'iPhone 15 Pro', true, 1),
  ('30000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/s24ultra/800/800', 'Samsung Galaxy S24 Ultra', true, 1),
  ('30000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/iphone12used/800/800', 'iPhone 12 UK Used', true, 1),
  ('30000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/redminote13/800/800', 'Xiaomi Redmi Note 13 Pro', true, 1),
  ('30000000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/anker20w/800/800', 'Anker 20W Charger', true, 1),
  ('30000000-0000-0000-0000-000000000011', 'https://picsum.photos/seed/spigencase/800/800', 'Spigen Rugged Armor Case', true, 1),
  ('30000000-0000-0000-0000-000000000012', 'https://picsum.photos/seed/airpodspro2/800/800', 'AirPods Pro 2nd generation', true, 1),
  ('30000000-0000-0000-0000-000000000013', 'https://picsum.photos/seed/baseusglass/800/800', 'Baseus Tempered Glass', true, 1),
  ('30000000-0000-0000-0000-000000000020', 'https://picsum.photos/seed/ip13oled/800/800', 'iPhone 13 OLED Screen', true, 1),
  ('30000000-0000-0000-0000-000000000021', 'https://picsum.photos/seed/ip12battery/800/800', 'iPhone 12 Battery', true, 1);
