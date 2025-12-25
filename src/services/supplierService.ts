
import { supabase } from '@/lib/supabase';
import type { Supplier } from '@/types';

export interface SupplierData {
    razao_social: string;
    nome_fantasia?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    telefone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
    social_media?: string;
    notes?: string;
}

export async function getSuppliers(userId: string) {
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
    }

    return data;
}

export async function createSupplier(userId: string, supplier: SupplierData) {
    const { data, error } = await supabase
        .from('suppliers')
        .insert([{ ...supplier, user_id: userId }])
        .select()
        .single();

    if (error) {
        console.error('Error creating supplier:', error);
        return null;
    }

    return data;
}

export async function updateSupplier(id: string, supplier: Partial<SupplierData>) {
    const { data, error } = await supabase
        .from('suppliers')
        .update(supplier)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating supplier:', error);
        return null;
    }

    return data;
}

export async function deleteSupplier(id: string) {
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting supplier:', error);
        return false;
    }

    return true;
}
