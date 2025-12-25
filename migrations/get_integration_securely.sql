-- Secure Function for Webhook Server to fetch Integration config
-- Needed because the Webhook Server runs as 'anon' (or service_role) and shouldn't need a user session.
-- RLS normally blocks 'anon' from seeing integrations.

CREATE OR REPLACE FUNCTION get_integration_securely(integration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (God Mode for this specific query)
SET search_path = public -- Security best practice
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', i.id,
        'user_id', i.user_id,
        'platform', i.platform,
        'event_type', i.event_type,
        'flow_id', i.flow_id,
        'is_active', i.is_active
    )
    INTO result
    FROM integrations i
    WHERE i.id = integration_id;

    RETURN result;
END;
$$;

-- Grant access to anon (so the webhook server can call it)
GRANT EXECUTE ON FUNCTION get_integration_securely(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_integration_securely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_integration_securely(UUID) TO service_role;
