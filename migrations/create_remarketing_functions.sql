-- Function to get enrollments due for processing
-- Returns the next step details for each due enrollment
CREATE OR REPLACE FUNCTION get_due_remarketing_steps()
RETURNS TABLE (
    enrollment_id UUID,
    lead_id UUID,
    sequence_id UUID,
    current_step_order INTEGER,
    phone TEXT,
    lead_name TEXT,
    flow_id UUID,
    delay_days INTEGER,
    delay_hours INTEGER,
    next_steps_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as enrollment_id,
        e.lead_id,
        e.sequence_id,
        e.current_step_order,
        l.phone,
        l.name as lead_name,
        s.flow_id,
        s.delay_days,
        s.delay_hours,
        (
            SELECT count(*) 
            FROM remarketing_steps count_steps 
            WHERE count_steps.sequence_id = e.sequence_id 
            AND count_steps.step_order > e.current_step_order
        ) as next_steps_count
    FROM 
        remarketing_enrollments e
    JOIN 
        leads l ON e.lead_id = l.id
    JOIN 
        remarketing_steps s ON e.sequence_id = s.sequence_id AND e.current_step_order = s.step_order
    WHERE 
        e.status = 'active' 
        AND e.next_execution_at <= timezone('utc', now());
END;
$$ LANGUAGE plpgsql;

-- Function to process a step (advance or complete)
-- Called by n8n after successful send
CREATE OR REPLACE FUNCTION process_remarketing_step_result(
    p_enrollment_id UUID,
    p_sequence_id UUID,
    p_current_step_order INTEGER,
    p_has_next_steps BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    v_next_delay_days INTEGER;
    v_next_delay_hours INTEGER;
BEGIN
    IF p_has_next_steps THEN
        -- Get delay for the NEXT step
        SELECT delay_days, delay_hours INTO v_next_delay_days, v_next_delay_hours
        FROM remarketing_steps
        WHERE sequence_id = p_sequence_id
        AND step_order = p_current_step_order + 1;

        -- Update enrollment to next step
        UPDATE remarketing_enrollments
        SET 
            current_step_order = p_current_step_order + 1,
            next_execution_at = timezone('utc', now()) + (v_next_delay_days || ' days')::interval + (v_next_delay_hours || ' hours')::interval
        WHERE id = p_enrollment_id;
    ELSE
        -- No more steps, complete enrollment
        UPDATE remarketing_enrollments
        SET status = 'completed', next_execution_at = NULL
        WHERE id = p_enrollment_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
