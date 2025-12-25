-- Secure Function for Webhook Server to UPSERT Leads
-- Allows 'anon' server logic to insert/update leads without needing RLS policies opening up the whole table.

CREATE OR REPLACE FUNCTION upsert_lead_securely(
    p_user_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_source TEXT,
    p_custom_fields JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (Bypass RLS)
SET search_path = public
AS $$
DECLARE
    v_lead_id UUID;
BEGIN
    -- Perform Upsert (Insert or Update on Conflict)
    INSERT INTO leads (user_id, name, phone, email, source, custom_fields, updated_at)
    VALUES (p_user_id, p_name, p_phone, p_email, p_source, p_custom_fields, NOW())
    ON CONFLICT (user_id, phone) DO UPDATE
    SET 
        -- Update name if provided and not empty? Or keep existing?
        -- Generally sales data is trusted. Let's update basic info and merge fields.
        email = COALESCE(EXCLUDED.email, leads.email), 
        custom_fields = leads.custom_fields || EXCLUDED.custom_fields, -- Merge new vars into existing
        updated_at = NOW()
    RETURNING id INTO v_lead_id;

    RETURN jsonb_build_object('id', v_lead_id, 'success', true);
END;
$$;

-- Grant access to anon (so the webhook server can call it)
GRANT EXECUTE ON FUNCTION upsert_lead_securely(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION upsert_lead_securely(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_lead_securely(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
