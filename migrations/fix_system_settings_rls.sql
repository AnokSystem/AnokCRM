-- =====================================================
-- FIX RLS FOR SYSTEM_SETTINGS
-- =====================================================
-- The application uses 'system_settings' (not admin_settings) to store global webhooks.
-- Regular users need READ access to this table to trigger campaigns using the global webhook.

-- 1. Ensure RLS is enabled
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Allow ALL authenticated users to READ settings
DROP POLICY IF EXISTS "Authenticated users can read system_settings" ON system_settings;
CREATE POLICY "Authenticated users can read system_settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow ONLY ADMINS to INSERT/UPDATE/DELETE
-- (We use the user_roles table to check for 'admin' role)

DROP POLICY IF EXISTS "Admins can manage system_settings" ON system_settings;
CREATE POLICY "Admins can manage system_settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 4. Verify/Ensure 'campaign_webhook_url' key exists (optional, helps preventing nulls)
INSERT INTO system_settings (key, value, description)
VALUES ('campaign_webhook_url', '', 'URL Global do n8n para Campanhas')
ON CONFLICT (key) DO NOTHING;
