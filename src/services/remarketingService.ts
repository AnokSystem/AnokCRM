import { supabase } from '@/lib/supabase';

export interface RemarketingStep {
    id: string;
    sequence_id: string;
    flow_id: string;
    delay_days: number;
    delay_hours: number;
    step_order: number;
}

export interface RemarketingSequence {
    id: string;
    user_id: string;
    name: string;
    description: string;
    status: 'ativo' | 'inativo' | 'rascunho';
    instance_name?: string; // [NEW]
    leads_vinculados: number; // calculated field
    created_at: string;
    steps: RemarketingStepWithFlow[];
}

export interface RemarketingStepWithFlow extends RemarketingStep {
    flow_name?: string;
}

export async function getSequences(userId: string): Promise<RemarketingSequence[]> {
    const { data: sequences, error } = await supabase
        .from('remarketing_sequences')
        .select(`
      *,
      steps:remarketing_steps (
        id,
        sequence_id,
        flow_id,
        delay_days,
        delay_hours,
        step_order,
        flows (
          name
        )
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching sequences:', error);
        throw error;
    }

    // Transform data to match interface
    // Fetch counts of associated leads (active or all? usually all linked, or maybe just active. Let's count all non-cancelled? Or just all.)
    // Let's count 'active' and 'completed' as "vinculados".

    // Fetch enrollment counts
    const { data: enrollmentCounts, error: countError } = await supabase
        .from('remarketing_enrollments')
        .select('sequence_id');

    if (countError) console.error('Error fetching counts', countError);

    const counts: Record<string, number> = {};
    if (enrollmentCounts) {
        enrollmentCounts.forEach(e => {
            counts[e.sequence_id] = (counts[e.sequence_id] || 0) + 1;
        });
    }

    return sequences.map(seq => ({
        ...seq,
        leads_vinculados: counts[seq.id] || 0,
        steps: seq.steps
            ? seq.steps.sort((a: any, b: any) => a.step_order - b.step_order).map((step: any) => ({
                ...step,
                flow_name: step.flows?.name || 'Fluxo removido'
            }))
            : []
    }));
}

export async function createSequence(
    userId: string,
    sequenceData: { name: string; description: string; instance_name?: string; steps: any[] } // [UPDATED]
) {
    // 1. Create Sequence
    const { data: seq, error: seqError } = await supabase
        .from('remarketing_sequences')
        .insert({
            user_id: userId,
            name: sequenceData.name,
            description: sequenceData.description,
            instance_name: sequenceData.instance_name, // [NEW]
            status: 'ativo'
        })
        .select()
        .single();

    if (seqError) throw seqError;

    // 2. Create Steps
    if (sequenceData.steps.length > 0) {
        const stepsToInsert = sequenceData.steps.map((step, index) => ({
            sequence_id: seq.id,
            flow_id: step.fluxo_id,
            delay_days: step.dias_espera,
            delay_hours: step.horas_espera,
            step_order: index + 1
        }));

        const { error: stepsError } = await supabase
            .from('remarketing_steps')
            .insert(stepsToInsert);

        if (stepsError) throw stepsError;
    }

    return seq;
}

export async function updateSequence(
    sequenceId: string,
    updates: { name: string; description: string; instance_name?: string; steps: any[] } // [UPDATED]
) {
    // 1. Update Sequence Details
    const { error: seqError } = await supabase
        .from('remarketing_sequences')
        .update({
            name: updates.name,
            description: updates.description,
            instance_name: updates.instance_name // [NEW]
        })
        .eq('id', sequenceId);

    if (seqError) throw seqError;

    // 2. Replace Steps (Delete all and re-create)
    const { error: deleteError } = await supabase
        .from('remarketing_steps')
        .delete()
        .eq('sequence_id', sequenceId);

    if (deleteError) throw deleteError;

    if (updates.steps.length > 0) {
        const stepsToInsert = updates.steps.map((step, index) => ({
            sequence_id: sequenceId,
            flow_id: step.fluxo_id,
            delay_days: step.dias_espera,
            delay_hours: step.horas_espera,
            step_order: index + 1
        }));

        const { error: insertError } = await supabase
            .from('remarketing_steps')
            .insert(stepsToInsert);

        if (insertError) throw insertError;
    }
}

export async function deleteSequence(sequenceId: string) {
    const { error } = await supabase
        .from('remarketing_sequences')
        .delete()
        .eq('id', sequenceId);

    if (error) throw error;
}

export async function toggleSequenceStatus(sequenceId: string, currentStatus: string) {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    const { error } = await supabase
        .from('remarketing_sequences')
        .update({ status: newStatus })
        .eq('id', sequenceId);

    if (error) throw error;
    return newStatus;
}

// Enrollment Functions

export async function enrollLead(leadId: string, sequenceId: string) {
    // Check if lead is already enrolled in this sequence (handled by UNIQUE constraint but good to be explicit)

    // Get first step delay
    const { data: steps, error: stepsError } = await supabase
        .from('remarketing_steps')
        .select('delay_days, delay_hours')
        .eq('sequence_id', sequenceId)
        .eq('step_order', 1)
        .single();

    if (stepsError) throw stepsError; // Or handle if no steps

    const delayDays = steps?.delay_days || 0;
    const delayHours = steps?.delay_hours || 0;

    // Calculate next execution
    // We can use Javascript Date manipulation or let Postgres handle it.
    // JS is fine here.
    const now = new Date();
    now.setDate(now.getDate() + delayDays);
    now.setHours(now.getHours() + delayHours);

    const { error } = await supabase
        .from('remarketing_enrollments')
        .insert({
            lead_id: leadId,
            sequence_id: sequenceId,
            status: 'active',
            current_step_order: 1,
            next_execution_at: now.toISOString()
        });

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error('Lead já está vinculado a esta sequência.');
        }
        throw error;
    }
}

export async function getEnrollmentsByLead(leadId: string) {
    const { data, error } = await supabase
        .from('remarketing_enrollments')
        .select(`
      *,
      sequences:remarketing_sequences (name)
    `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function cancelEnrollment(enrollmentId: string) {
    const { error } = await supabase
        .from('remarketing_enrollments')
        .update({ status: 'cancelled', next_execution_at: null })
        .eq('id', enrollmentId);

    if (error) throw error;
}

export async function getRemarketingBoardData(userId: string) {
    // 1. Fetch Active Sequences (Columns)
    const { data: sequences, error: seqError } = await supabase
        .from('remarketing_sequences')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

    if (seqError) throw seqError;

    // 2. Fetch Active Enrollments (Cards) with Lead Data
    // We join with leads table to get card details
    // Note: This relies on Supabase resolving the foreign key 'lead_id' to 'leads' table
    const { data: enrollments, error: enrError } = await supabase
        .from('remarketing_enrollments')
        .select(`
            *,
            lead:leads (
                id, name, lastname, phone, company, email,
                person_type, cpf_cnpj, birth_date,
                address, address_number, neighborhood, city, state, postal_code,
                notes
            )
        `)
        .eq('status', 'active');
    //.in('sequence_id', sequences.map(s => s.id)); // Optional optimization

    if (enrError) throw enrError;

    // 3. Map to Kanban Format
    const columns = sequences.map((seq, index) => ({
        id: seq.id,
        user_id: seq.user_id,
        workspace_id: 'remarketing-virtual', // Dummy ID
        column_id: seq.id, // Use sequence ID as column ID
        label: seq.name,
        color: 'from-orange-500 to-orange-600',
        position: index,
        is_default: false
    }));

    // Filter enrollments that belong to fetched sequences and have valid lead data
    const leads = enrollments
        .filter(enr => enr.lead && sequences.find(s => s.id === enr.sequence_id))
        .map(enr => {
            const l = enr.lead;
            return {
                ...l,
                // Essential mapping for Kanban Card
                Id: l.id, // Legacy support if needed
                id: l.id,

                // Virtual Column Assignment
                workspace_id: 'remarketing-virtual',
                column_id: enr.sequence_id, // This places the card in the sequence column

                // Construct standard fields
                nome: l.name ? l.name.split(' ')[0] : '',
                sobrenome: l.lastname || (l.name ? l.name.split(' ').slice(1).join(' ') : ''),

                // Metadata for display
                remarketing_enrollment_id: enr.id,
                remarketing_step: enr.current_step_order,
                remarketing_next_run: enr.next_execution_at
            };
        });

    return { columns, leads };
}
