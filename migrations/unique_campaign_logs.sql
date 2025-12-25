-- Remove duplicates if any exist (keep the latest one)
DELETE FROM campaign_logs a USING campaign_logs b
WHERE a.id < b.id
AND a.campaign_id = b.campaign_id
AND a.lead_phone = b.lead_phone;

-- Add UNIQUE constraint
ALTER TABLE campaign_logs
ADD CONSTRAINT unique_campaign_lead UNIQUE (campaign_id, lead_phone);
