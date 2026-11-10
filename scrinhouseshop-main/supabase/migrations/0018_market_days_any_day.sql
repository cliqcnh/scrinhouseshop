-- =============================================================================
-- 0018_market_days_any_day.sql
-- Drop the Tuesday/Saturday check constraint and support all 7 weekdays.
-- =============================================================================

alter table public.market_events drop constraint if exists market_events_day_check;

alter table public.market_events add constraint market_events_day_check check (
  day in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
);
