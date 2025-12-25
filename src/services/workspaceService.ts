import { supabase } from '@/lib/supabase';

export interface Workspace {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
    is_default: boolean;
    position: number;
    created_at: string;
    updated_at: string;
}

export interface CreateWorkspaceData {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    position?: number;
    is_default?: boolean;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching workspaces:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get user's default workspace
 */
export async function getDefaultWorkspace(userId: string): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

    if (error) {
        console.error('Error fetching default workspace:', error);
        return null;
    }

    return data;
}

/**
 * Get a specific workspace by ID
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (error) {
        console.error('Error fetching workspace:', error);
        return null;
    }

    return data;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
    userId: string,
    workspaceData: CreateWorkspaceData
): Promise<Workspace | null> {
    // Get the highest position
    const { data: existingWorkspaces } = await supabase
        .from('workspaces')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1);

    const nextPosition = existingWorkspaces && existingWorkspaces.length > 0
        ? existingWorkspaces[0].position + 1
        : 0;

    const { data, error } = await supabase
        .from('workspaces')
        .insert({
            user_id: userId,
            name: workspaceData.name,
            description: workspaceData.description || null,
            icon: workspaceData.icon || 'briefcase',
            color: workspaceData.color || 'from-blue-500 to-blue-600',
            is_default: false,
            position: workspaceData.position ?? nextPosition,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating workspace:', error);
        throw error;
    }

    return data;
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
    workspaceId: string,
    updates: Partial<CreateWorkspaceData>
): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)
        .select()
        .single();

    if (error) {
        console.error('Error updating workspace:', error);
        throw error;
    }

    return data;
}

/**
 * Delete a workspace (only if not default)
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
    // First check if it's not default
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) {
        throw new Error('Workspace not found');
    }

    if (workspace.is_default) {
        throw new Error('Cannot delete default workspace');
    }

    const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

    if (error) {
        console.error('Error deleting workspace:', error);
        throw error;
    }

    return true;
}

/**
 * Reorder workspaces
 */
export async function reorderWorkspaces(
    userId: string,
    workspaceIds: string[]
): Promise<boolean> {
    // Update position for each workspace
    const updates = workspaceIds.map((id, index) =>
        supabase
            .from('workspaces')
            .update({ position: index })
            .eq('id', id)
            .eq('user_id', userId)
    );

    try {
        await Promise.all(updates);
        return true;
    } catch (error) {
        console.error('Error reordering workspaces:', error);
        throw error;
    }
}

/**
 * Get workspace column count (number of leads per column)
 */
export async function getWorkspaceStats(workspaceId: string) {
    // Get all columns for this workspace
    const { data: columns } = await supabase
        .from('kanban_columns')
        .select('column_id')
        .eq('workspace_id', workspaceId);

    if (!columns) return {};

    // Get lead counts per column
    const stats: Record<string, number> = {};

    for (const col of columns) {
        const { count } = await supabase
            .from('chats')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('column_id', col.column_id);

        stats[col.column_id] = count || 0;
    }

    return {
        totalLeads: Object.values(stats).reduce((a, b) => a + b, 0),
        byColumn: stats,
    };
}
