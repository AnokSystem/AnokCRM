-- Drop existing policy to avoid conflicts
DROP POLICY IF EXISTS "Users can view own campaign logs" ON campaign_logs;

-- Recreate policy with clear logic
-- Users can see logs if they own the campaign
CREATE POLICY "Users can view own campaign logs"
ON campaign_logs FOR SELECT
USING (
    campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
);

-- Ensure RLS is enabled
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions (just in case)
GRANT ALL ON campaign_logs TO authenticated;
GRANT ALL ON campaign_logs TO service_role;
