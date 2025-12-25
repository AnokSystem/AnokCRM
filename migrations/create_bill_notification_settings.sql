-- Add bill notification settings table
-- This table stores per-user notification preferences for bills

CREATE TABLE IF NOT EXISTS bill_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- WhatsApp Configuration
    whatsapp_instance TEXT, -- Evolution API instance name
    notification_phone TEXT NOT NULL, -- Phone number to receive notifications (format: 5511999999999)
    
    -- Notification Toggles
    notify_1day_before BOOLEAN DEFAULT true,
    notify_on_due_date BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one config per user
    UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_bill_notification_settings_user ON bill_notification_settings(user_id);

-- RLS Policies
ALTER TABLE bill_notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON bill_notification_settings;
CREATE POLICY "Users can manage their own notification settings"
    ON bill_notification_settings FOR ALL
    USING (auth.uid() = user_id);

-- Update trigger
DROP TRIGGER IF EXISTS bill_notification_settings_updated_at_trigger ON bill_notification_settings;
CREATE TRIGGER bill_notification_settings_updated_at_trigger
    BEFORE UPDATE ON bill_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_bills_updated_at();
