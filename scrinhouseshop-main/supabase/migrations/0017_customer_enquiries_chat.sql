-- =============================================================================
-- 0017_customer_enquiries_chat.sql
-- Add user_id and session_token columns to product_enquiries table.
-- =============================================================================

alter table public.product_enquiries 
  add column user_id uuid references public.profiles(id) on delete set null,
  add column session_token text;

-- Create indexes for performance
create index idx_product_enquiries_user_id on public.product_enquiries(user_id);
create index idx_product_enquiries_session_token on public.product_enquiries(session_token);
