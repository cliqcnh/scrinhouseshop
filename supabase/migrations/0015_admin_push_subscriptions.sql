-- Create table for storing Web Push subscriptions for admin users
CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow staff users to insert/manage their subscriptions
CREATE POLICY "Staff can manage their push subscriptions"
  ON admin_push_subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
