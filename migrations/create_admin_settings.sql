-- ==========================================
-- Admin Global Settings Migration
-- ==========================================

-- Table to store global system settings (like n8n webhook)
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS: Only Admins can manage this table
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone (authenticated) can READ (needed for users to fetch webhook url internally)
-- OR: better security -> Only server functions trigger it. 
-- For this MVP without a backend layer, we'll allow Authenticated Users to READ specific settings if needed,
-- or strictly restrict to Admins if we only trigger from Admin context?
-- Wait, the USER triggers the campaign from their dashboard. So the USER's browser needs to fetch the ID.
-- BUT, we want to hide the URL if possible?
-- If we fetch it in frontend, it's exposed. 
-- Let's allow Authenticated READ for now. Ideally, we would use a Supabase Function.
CREATE POLICY "Authenticated users can read admin_settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only Admins can INSERT/UPDATE/DELETE
-- Assuming there's a way to distinguish admins.
-- We generally check `user_roles` or `is_admin` claim.
-- Using the existing `user_roles` table check strategy:

CREATE POLICY "Admins can manage admin_settings"
  ON admin_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Insert default entry for n8n Webhook
INSERT INTO admin_settings (key, value, description)
VALUES ('campaign_webhook_url', '', 'URL do Webhook Global do n8n para disparos de campanha')
ON CONFLICT (key) DO NOTHING;
