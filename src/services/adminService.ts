
import { supabase } from '@/lib/supabase';

export const adminService = {
    async getGlobalSetting(key: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) {
            console.error(`Error fetching setting ${key}:`, error);
            return null;
        }

        return data?.value || null;
    },

    async setGlobalSetting(key: string, value: string, userId: string) {
        const { error } = await supabase
            .from('system_settings')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (error) {
            console.error(`Error setting ${key}:`, error);
            throw error;
        }
    }
};

