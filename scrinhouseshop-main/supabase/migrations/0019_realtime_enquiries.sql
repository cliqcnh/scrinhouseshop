-- =============================================================================
-- 0019_realtime_enquiries.sql
-- Enable Supabase Realtime publication for enquiries and messages.
-- =============================================================================

-- Enable Realtime
alter publication supabase_realtime add table public.product_enquiries;
alter publication supabase_realtime add table public.product_enquiry_messages;
