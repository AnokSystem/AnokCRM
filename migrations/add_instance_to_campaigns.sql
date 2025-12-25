-- Add instance_name to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- Update existing campaigns to have a default value if needed (optional, skipping for now)
-- COMMENT ON COLUMN campaigns.instance_name IS 'The WhatsApp instance name to use for sending messages';
