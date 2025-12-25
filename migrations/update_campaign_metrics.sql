-- Update function to calculate Sent (total attempts), Delivered (success), and Failed
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_total_sent INTEGER;
    v_delivered INTEGER;
    v_failed INTEGER;
BEGIN
    -- Calculate Successful Sends (delivered)
    SELECT COUNT(*) INTO v_delivered
    FROM campaign_logs
    WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'sent';

    -- Calculate Failed Sends
    SELECT COUNT(*) INTO v_failed
    FROM campaign_logs
    WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'failed';

    -- Calculate Total Sent (Attempts) = Delivered + Failed
    v_total_sent := v_delivered + v_failed;

    -- Update campaign stats
    -- We use jsonb_set to update specific keys, preserving 'total' if it exists.
    -- However, simple concatenation || is easier and safer if we just want to overwrite these keys.
    UPDATE campaigns
    SET stats = COALESCE(stats, '{}'::jsonb) ||
                jsonb_build_object(
                    'sent', v_total_sent,
                    'delivered', v_delivered,
                    'failed', v_failed
                )
    WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already created, but we can ensure it exists
DROP TRIGGER IF EXISTS trg_update_campaign_stats ON campaign_logs;

CREATE TRIGGER trg_update_campaign_stats
AFTER INSERT OR UPDATE OR DELETE ON campaign_logs
FOR EACH ROW
EXECUTE FUNCTION update_campaign_stats();
