import { supabase } from '@/lib/supabase';

// ==========================================
// Lead Interface
// ==========================================

export interface Lead {
    id: string;
    user_id: string;
    workspace_id: string | null;
    name: string;
    phone: string;
    email: string | null;
    company: string | null;

    // Profile
    is_person: boolean; // true = PF, false = PJ
    cpf: string | null;
    cnpj: string | null;
    birth_date: string | null;

    // Address
    address_zip: string | null;
    address_street: string | null;
    address_number: string | null;
    address_district: string | null;
    address_city: string | null;
    address_state: string | null;

    column_id: string;
    source: string | null;
    notes: string | null;
    tags: string[] | null;
    custom_fields: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface CreateLeadData {
    name: string;
    phone: string;
    email?: string;
    company?: string;

    // Profile
    is_person?: boolean;
    cpf?: string;
    cnpj?: string;
    birth_date?: string;

    // Address
    address_zip?: string;
    address_street?: string;
    address_number?: string;
    address_district?: string;
    address_city?: string;
    address_state?: string;

    workspace_id?: string;
    column_id?: string;
    source?: string;
    notes?: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
    remarketing_id?: string;
}


// CRM Interfaces
export interface LeadTask {
    id: string;
    lead_id: string;
    user_id: string;
    title: string;
    description?: string;
    completed: boolean;
    due_date?: string;
    created_at: string;
}

export interface LeadOrder {
    id: string;
    lead_id: string;
    user_id: string;
    title: string;
    description?: string;
    status: 'pending' | 'paid' | 'cancelled';
    items?: any[];
    amount: number;
    created_at: string;
}

export interface LeadAttachment {
    id: string;
    lead_id: string;
    user_id: string;
    file_name: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
    created_at: string;
}

// ==========================================
// Lead CRUD Operations
// ==========================================

/**
 * Get all leads for a specific workspace
 */
export async function getLeadsByWorkspace(
    userId: string,
    workspaceId: string
): Promise<Lead[]> {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        // .eq('user_id', userId) // <-- REMOVE THIS
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching leads:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get all leads for a user (across workspaces)
 */
export async function getAllLeads(userId: string): Promise<Lead[]> {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all leads:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (error) {
        console.error('Error fetching lead:', error);
        return null;
    }

    return data;
}

/**
 * Create a new lead
 */
export async function createLead(
    userId: string,
    leadData: CreateLeadData
): Promise<Lead | null> {
    const { data, error } = await supabase
        .from('leads')
        .insert({
            user_id: userId,
            workspace_id: leadData.workspace_id || null,
            name: leadData.name,
            phone: leadData.phone,
            email: leadData.email || null,
            company: leadData.company || null,

            is_person: leadData.is_person !== undefined ? leadData.is_person : true,
            cpf: leadData.cpf || null,
            cnpj: leadData.cnpj || null,
            birth_date: leadData.birth_date || null,

            // Address
            address_zip: leadData.address_zip || null,
            address_street: leadData.address_street || null,
            address_number: leadData.address_number || null,
            address_district: leadData.address_district || null,
            address_city: leadData.address_city || null,
            address_state: leadData.address_state || null,

            column_id: leadData.column_id || 'leads-novos',
            source: leadData.source || 'manual',
            notes: leadData.notes || null,
            tags: leadData.tags || null,
            custom_fields: leadData.custom_fields || {},
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating lead:', error);
        throw error;
    }

    return data;
}

/**
 * Update an existing lead
 */
export async function updateLead(
    leadId: string,
    updates: Partial<CreateLeadData>
): Promise<Lead | null> {
    const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

    if (error) {
        console.error('Error updating lead:', error);
        throw error;
    }

    return data;
}

/**
 * Update lead's kanban column (for drag & drop)
 */
export async function updateLeadColumn(
    leadId: string,
    newColumnId: string
): Promise<void> {
    const { error } = await supabase
        .from('leads')
        .update({ column_id: newColumnId })
        .eq('id', leadId);

    if (error) {
        console.error('Error updating lead column:', error);
        throw error;
    }
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<void> {
    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

    if (error) {
        console.error('Error deleting lead:', error);
        throw error;
    }
}

/**
 * Import multiple leads in batch
 */
export async function importLeads(
    userId: string,
    workspaceId: string,
    leads: CreateLeadData[]
): Promise<number> {
    const leadsToInsert = leads.map(lead => ({
        user_id: userId,
        workspace_id: workspaceId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || null,
        company: lead.company || null,
        column_id: lead.column_id || 'leads-novos',
        source: lead.source || 'import',
        notes: lead.notes || null,
        tags: lead.tags || null,
        custom_fields: lead.custom_fields || {},

        // Profile
        is_person: lead.is_person !== undefined ? lead.is_person : true,
        cpf: lead.cpf || null,
        cnpj: lead.cnpj || null,
        birth_date: lead.birth_date || null,

        // Address
        address_zip: lead.address_zip || null,
        address_street: lead.address_street || null,
        address_number: lead.address_number || null,
        address_district: lead.address_district || null,
        address_city: lead.address_city || null,
        address_state: lead.address_state || null,

        // Remarketing
        remarketing_id: lead.remarketing_id || null
    }));

    const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

    if (error) {
        console.error('Error importing leads:', error);
        throw error;
    }

    // Enroll in remarketing if specified
    if (data && data.length > 0) {
        // Filter leads that have a remarketing_id
        const leadsWithRemarketing = data.filter((lead: any) => lead.remarketing_id);

        if (leadsWithRemarketing.length > 0) {
            // Group by sequence to optimize (get delays once per sequence)
            const sequenceGroups: Record<string, typeof leadsWithRemarketing> = {};
            leadsWithRemarketing.forEach((lead: any) => {
                const seqId = lead.remarketing_id;
                if (!sequenceGroups[seqId]) sequenceGroups[seqId] = [];
                sequenceGroups[seqId].push(lead);
            });

            // Process each sequence group
            await Promise.all(Object.keys(sequenceGroups).map(async (seqId) => {
                try {
                    // Get first step delay for this sequence
                    const { data: steps } = await supabase
                        .from('remarketing_steps')
                        .select('delay_days, delay_hours')
                        .eq('sequence_id', seqId)
                        .eq('step_order', 1)
                        .single();

                    const delayDays = steps?.delay_days || 0;
                    const delayHours = steps?.delay_hours || 0;

                    const now = new Date();
                    now.setDate(now.getDate() + delayDays);
                    now.setHours(now.getHours() + delayHours);
                    const nextRun = now.toISOString();

                    const enrollmentsToInsert = sequenceGroups[seqId].map((lead: any) => ({
                        lead_id: lead.id,
                        sequence_id: seqId,
                        status: 'active',
                        current_step_order: 1,
                        next_execution_at: nextRun
                    }));

                    const { error: enrollError } = await supabase
                        .from('remarketing_enrollments')
                        .insert(enrollmentsToInsert);

                    if (enrollError) console.error('Error batch enrolling:', enrollError);

                } catch (e) {
                    console.error(`Error processing sequence ${seqId} for import:`, e);
                }
            }));
        }
    }

    return data?.length || 0;
}

/**
 * Search leads by name, phone, email, or company
 */
export async function searchLeads(
    userId: string,
    workspaceId: string | null,
    query: string
): Promise<Lead[]> {
    let supabaseQuery = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`);

    if (workspaceId) {
        supabaseQuery = supabaseQuery.eq('workspace_id', workspaceId);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
        console.error('Error searching leads:', error);
        throw error;
    }

    return data || [];
}

// ==========================================
// Lead Tasks Operations
// ==========================================

export async function getLeadTasks(leadId: string): Promise<LeadTask[]> {
    const { data, error } = await supabase
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createLeadTask(
    userId: string,
    leadId: string,
    task: { title: string; due_date?: string }
): Promise<LeadTask> {
    const { data, error } = await supabase
        .from('lead_tasks')
        .insert({
            user_id: userId,
            lead_id: leadId,
            title: task.title,
            completed: false,
            due_date: task.due_date || null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function toggleLeadTask(taskId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
        .from('lead_tasks')
        .update({ completed })
        .eq('id', taskId);

    if (error) throw error;
}

export async function deleteLeadTask(taskId: string): Promise<void> {
    const { error } = await supabase
        .from('lead_tasks')
        .delete()
        .eq('id', taskId);

    if (error) throw error;
}

// ==========================================
// Lead Orders Operations
// ==========================================

export async function getLeadOrders(leadId: string): Promise<LeadOrder[]> {
    const { data, error } = await supabase
        .from('lead_orders')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createLeadOrder(
    userId: string,
    leadId: string,
    order: { title: string; description?: string; amount: number; status?: 'pending' | 'paid' | 'cancelled'; items?: any[] }
): Promise<LeadOrder> {
    const { data, error } = await supabase
        .from('lead_orders')
        .insert({
            user_id: userId,
            lead_id: leadId,
            title: order.title,
            description: order.description,
            amount: order.amount,
            status: order.status || 'pending',
            items: order.items || []
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteLeadOrder(orderId: string): Promise<void> {
    const { error } = await supabase
        .from('lead_orders')
        .delete()
        .eq('id', orderId);

    if (error) throw error;
}

// ==========================================
// Lead Attachments Operations
// ==========================================

export async function getLeadAttachments(leadId: string): Promise<LeadAttachment[]> {
    const { data, error } = await supabase
        .from('lead_attachments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createLeadAttachment(
    userId: string,
    leadId: string,
    file: { name: string; url: string; type: string; size: number }
): Promise<LeadAttachment> {
    const { data, error } = await supabase
        .from('lead_attachments')
        .insert({
            user_id: userId,
            lead_id: leadId,
            file_name: file.name,
            file_url: file.url,
            file_type: file.type,
            file_size: file.size
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteLeadAttachment(attachmentId: string): Promise<void> {
    const { error } = await supabase
        .from('lead_attachments')
        .delete()
        .eq('id', attachmentId);

    if (error) throw error;
}
