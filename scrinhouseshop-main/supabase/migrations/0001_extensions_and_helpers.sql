-- =============================================================================
-- 0001_extensions_and_helpers.sql
-- Extensions and shared helper functions used across every later migration.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive text (emails)
create extension if not exists "pg_trgm";    -- trigram search for products

-- Generic "updated_at" trigger, attached to every table that has that column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Slugify helper used by application code / triggers when a slug isn't supplied.
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  );
$$;
