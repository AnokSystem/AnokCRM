-- Forcefully drop the constraint if it exists (to fix broken states)
ALTER TABLE campaign_logs DROP CONSTRAINT IF EXISTS unique_campaign_lead;

-- Remove duplicates (keeping the latest one based on id/created_at)
DELETE FROM campaign_logs a USING campaign_logs b
WHERE a.id < b.id
AND a.campaign_id = b.campaign_id
AND a.lead_phone = b.lead_phone;

-- Re-add UNIQUE constraint
ALTER TABLE campaign_logs
ADD CONSTRAINT unique_campaign_lead UNIQUE (campaign_id, lead_phone);
