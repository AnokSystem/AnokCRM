import { supabase } from '@/lib/supabase';

export interface Flow {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
    nodes_count: number;
    status: 'ativo' | 'inativo' | 'rascunho';
    created_at: string;
    updated_at: string;
}

export interface CreateFlowData {
    name: string;
    description?: string;
    nodes?: any[];
    edges?: any[];
    nodes_count?: number;
    status?: 'ativo' | 'inativo' | 'rascunho';
}

export async function getFlows(userId: string): Promise<Flow[]> {
    const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching flows:', error);
        throw error;
    }

    return data || [];
}

export async function getFlow(id: string): Promise<Flow | null> {
    const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching flow:', error);
        return null;
    }

    return data;
}

export async function createFlow(userId: string, flowData: CreateFlowData): Promise<Flow | null> {
    const { data, error } = await supabase
        .from('flows')
        .insert({
            user_id: userId,
            ...flowData,
            nodes: flowData.nodes || [],
            edges: flowData.edges || [],
            nodes_count: flowData.nodes_count || 0
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating flow:', error);
        throw error;
    }

    return data;
}

export async function updateFlow(id: string, flowData: Partial<CreateFlowData>): Promise<Flow | null> {
    const { data, error } = await supabase
        .from('flows')
        .update({
            ...flowData,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating flow:', error);
        console.error('Update payload:', flowData);
        throw error;
    }

    return data;
}

export async function deleteFlow(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting flow:', error);
        throw error;
    }

    return true;
}
