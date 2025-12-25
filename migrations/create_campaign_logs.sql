-- Create campaign_logs table for tracking message status
CREATE TABLE IF NOT EXISTS campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_name TEXT,
    lead_phone TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sent', 'failed', 'delivered', 'read'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster querying by campaign
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON campaign_logs(campaign_id);

-- RLS Policies
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view logs for their campaigns
-- We join with campaigns table to check user_id
CREATE POLICY "Users can view own campaign logs"
    ON campaign_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_logs.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Allow inserting logs (usually done by service_role/n8n, but allowing auth users if needed for testing)
CREATE POLICY "Users can insert campaign logs"
    ON campaign_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_logs.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );
