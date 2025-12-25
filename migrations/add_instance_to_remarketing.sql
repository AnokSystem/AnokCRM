-- 1. Add instance_name column to remarketing_sequences table
ALTER TABLE remarketing_sequences 
ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- 2. Update the Optimistic Fetch Function to include instance_name
DROP FUNCTION IF EXISTS fetch_and_advance_remarketing();

CREATE OR REPLACE FUNCTION fetch_and_advance_remarketing()
RETURNS TABLE (
    enrollment_id UUID,
    lead_id UUID,
    sequence_id UUID,
    current_step_order INTEGER,
    phone TEXT,
    lead_name TEXT,
    flow_id UUID,
    instance_name TEXT -- New Output
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_next_delay_days INTEGER;
    v_next_delay_hours INTEGER;
    v_has_next BOOLEAN;
BEGIN
    FOR r IN 
        SELECT 
            e.id as e_id, e.lead_id, e.sequence_id, e.current_step_order,
            l.phone, l.name as lead_name,
            s.flow_id,
            seq.instance_name -- Fetch instance from sequence
        FROM remarketing_enrollments e
        JOIN leads l ON e.lead_id = l.id
        JOIN remarketing_steps s ON e.sequence_id = s.sequence_id AND e.current_step_order = s.step_order
        JOIN remarketing_sequences seq ON e.sequence_id = seq.id
        WHERE e.status = 'active'
        AND e.next_execution_at <= now()
        LIMIT 50
    LOOP
        -- Return this row
        enrollment_id := r.e_id;
        lead_id := r.lead_id;
        sequence_id := r.sequence_id;
        current_step_order := r.current_step_order;
        phone := r.phone;
        lead_name := r.lead_name;
        flow_id := r.flow_id;
        instance_name := r.instance_name; -- Map to output logic
        
        RETURN NEXT;

        -- Check for next step
        SELECT EXISTS(
            SELECT 1 FROM remarketing_steps rs
            WHERE rs.sequence_id = r.sequence_id AND rs.step_order = r.current_step_order + 1
        ) INTO v_has_next;

        IF v_has_next THEN
            -- Get delay for NEXT step
            SELECT delay_days, delay_hours INTO v_next_delay_days, v_next_delay_hours
            FROM remarketing_steps rs
            WHERE rs.sequence_id = r.sequence_id AND rs.step_order = r.current_step_order + 1;

            -- Advance
            UPDATE remarketing_enrollments
            SET 
                current_step_order = r.current_step_order + 1,
                next_execution_at = now() + (v_next_delay_days || ' days')::interval + (v_next_delay_hours || ' hours')::interval
            WHERE id = r.e_id;
        ELSE
            -- Complete
            UPDATE remarketing_enrollments
            SET status = 'completed', next_execution_at = NULL
            WHERE id = r.e_id;
        END IF;

    END LOOP;
END;
$$;
