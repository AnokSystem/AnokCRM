-- Function to update campaign stats based on logs
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_sent INT;
    v_failed INT;
BEGIN
    -- Count logs for this campaign
    SELECT COUNT(*) INTO v_sent 
    FROM campaign_logs 
    WHERE campaign_id = NEW.campaign_id AND status = 'sent';

    SELECT COUNT(*) INTO v_failed 
    FROM campaign_logs 
    WHERE campaign_id = NEW.campaign_id AND status = 'failed';
    
    -- Update campaign stats (keeping existing 'total' or other fields)
    UPDATE campaigns
    SET stats = COALESCE(stats, '{}'::jsonb) || 
                jsonb_build_object(
                    'sent', v_sent,
                    'failed', v_failed
                )
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS trg_update_campaign_stats ON campaign_logs;

CREATE TRIGGER trg_update_campaign_stats
AFTER INSERT OR UPDATE OR DELETE ON campaign_logs
FOR EACH ROW
EXECUTE FUNCTION update_campaign_stats();
