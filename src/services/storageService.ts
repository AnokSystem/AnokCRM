import { supabase } from '@/lib/supabase';

export const storageService = {
    async uploadFlowMedia(file: File): Promise<string | null> {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from('flow-media')
                .upload(filePath, file);

            if (error) {
                console.error('Error uploading file:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('flow-media')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error in uploadFlowMedia:', error);
            return null;
        }
    }
};
