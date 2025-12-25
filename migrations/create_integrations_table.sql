-- Integrations Table and User Status Check

-- 1. Create User Status Table (for subscription checks)
-- This table will control if the webhooks process or not.
CREATE TABLE IF NOT EXISTS user_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    plan_name TEXT DEFAULT 'free',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for user_status
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own status"
ON user_status FOR SELECT
USING (auth.uid() = user_id);

-- Only service role (admins) usually update this, but we allow user read
-- Trigger to auto-create status on user create could be added here or handled by app logic
-- For now, we assume rows are inserted/managed by admin logic.

-- 2. Create Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('hotmart', 'braip', 'kiwify')), -- expandable
    event_type TEXT NOT NULL, -- e.g., 'PURCHASE_APPROVED', 'CART_ABANDONED'
    flow_id UUID REFERENCES flows(id), -- The flow to trigger
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own integrations"
ON integrations FOR ALL
USING (auth.uid() = user_id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);

-- 4. Initial Population of user_status (Safe insert for existing users)
-- This ensures current users have a status so their webhooks work immediately.
INSERT INTO user_status (user_id, is_active)
SELECT id, true FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
