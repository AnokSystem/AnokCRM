import { supabase } from '@/lib/supabase';
import { adminService } from './adminService';

export interface Campaign {
    id: string;
    user_id: string;
    name: string;
    description: string;
    flow_id: string;
    category_id: string;
    instance_name?: string; // [NEW]
    status: 'agendada' | 'em_andamento' | 'concluida' | 'pausada' | 'rascunho';
    scheduled_at: string | null;
    stats: {
        total: number;
        sent: number;
        delivered: number;
        read: number;
    };
    created_at: string;
    updated_at: string;
}

export interface CampaignLog {
    id: string;
    campaign_id: string;
    lead_name: string;
    lead_phone: string;
    status: 'sent' | 'failed' | 'delivered' | 'read';
    error_message?: string;
    created_at: string;
}

export interface CreateCampaignData {
    name: string;
    description: string;
    flow_id: string;
    category_id: string;
    instance_name?: string; // [NEW]
    status?: 'agendada' | 'em_andamento' | 'rascunho';
    scheduled_at?: string | null;
    stats?: Campaign['stats'];
}

/**
 * Get all campaigns for a user
 */
export async function getCampaigns(userId: string): Promise<Campaign[]> {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
    }

    return data || [];
}

export async function getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
    const { data, error } = await supabase
        .from('campaign_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching campaign logs:', error);
        return [];
    }

    return data || [];
}

export async function triggerWebhook(campaignId: string, userId: string, instanceName?: string) {
    try {
        const webhookUrl = await adminService.getGlobalSetting('campaign_webhook_url');
        console.log('Fetching webhook URL result:', webhookUrl);

        if (!webhookUrl) {
            console.warn('Webhook global não configurado em admin_settings.');
            return { success: false, error: 'URL não configurada' };
        }

        console.log(`Triggering webhook to: ${webhookUrl}`);

        // Use fetch without await if we want fire-and-forget, but for test button we want feedback.
        // Let's await it for the test response.
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                campaign_id: campaignId,
                user_id: userId,
                instance: instanceName, // [NEW]
                test_event: campaignId === 'test'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Webhook triggered successfully');
        return { success: true };

    } catch (error: any) {
        console.error('Error in triggerWebhook:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
    userId: string,
    campaignData: CreateCampaignData
): Promise<Campaign | null> {
    const { data, error } = await supabase
        .from('campaigns')
        .insert({
            user_id: userId,
            name: campaignData.name,
            description: campaignData.description,
            flow_id: campaignData.flow_id,
            category_id: campaignData.category_id,
            instance_name: campaignData.instance_name, // [NEW]
            status: campaignData.status || 'rascunho',
            scheduled_at: campaignData.scheduled_at || null,
            stats: campaignData.stats || { total: 0, sent: 0, delivered: 0, read: 0 },
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating campaign:', error);
        throw error;
    }

    // Auto-trigger if sending now
    if (data && data.status === 'em_andamento') {
        console.log('Campaign created with "Send Now" - Triggering Webhook...');
        triggerWebhook(data.id, data.user_id, data.instance_name);
    }

    return data;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
    campaignId: string,
    updates: Partial<Campaign>
): Promise<Campaign | null> {
    const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

    if (error) {
        console.error('Error updating campaign:', error);
        throw error;
    }

    return data;
}

export async function updateCampaignStatus(
    campaignId: string,
    status: Campaign['status']
): Promise<boolean> {
    // First get the campaign to know the user_id
    const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('user_id, instance_name')
        .eq('id', campaignId)
        .single();

    if (fetchError || !campaign) {
        console.error('Error fetching campaign for status update:', fetchError);
        return false;
    }

    const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId);

    if (error) {
        console.error('Error updating campaign status:', error);
        return false;
    }

    // Trigger webhook if resuming/starting
    if (status === 'em_andamento') {
        triggerWebhook(campaignId, campaign.user_id, campaign.instance_name); // Pass instance
    }

    return true;
}


/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

    if (error) {
        console.error('Error deleting campaign:', error);
        throw error;
    }
}
