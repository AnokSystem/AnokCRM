-- Remplaces the function used to process remarketing steps
-- Adds logic to:
-- 1. Log completion in the lead's notes
-- 2. Mark the enrollment as 'completed' (removing it from active view)

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
    v_sequence_name TEXT;
    v_lead_id UUID;
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
        
        -- 1. Fetch sequence name and lead_id for logging
        SELECT s.name, e.lead_id INTO v_sequence_name, v_lead_id
        FROM remarketing_enrollments e
        JOIN remarketing_sequences s ON s.id = e.sequence_id
        WHERE e.id = p_enrollment_id;

        -- 2. Log completion in Lead's notes
        -- Appends to existing notes or creates new
        UPDATE leads
        SET notes = COALESCE(notes, '') || E'\n\n' || 
                    '[System] Remarketing "' || COALESCE(v_sequence_name, 'Sequência') || 
                    '" finalizado em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
        WHERE id = v_lead_id;

        -- 3. Set status to completed (removes from Kanban/Dashboard)
        UPDATE remarketing_enrollments
        SET status = 'completed', next_execution_at = NULL
        WHERE id = p_enrollment_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
