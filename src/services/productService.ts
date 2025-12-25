
import { supabase } from '@/lib/supabase';

export interface Product {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    price: number;
    unit: string;
    image_base64?: string;
    stock_quantity: number;
    created_at: string;
}

export type CreateProductData = Omit<Product, 'id' | 'user_id' | 'created_at'>;

export async function getProducts(userId: string): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }

    return data || [];
}

export async function createProduct(userId: string, product: CreateProductData): Promise<Product | null> {
    const { data, error } = await supabase
        .from('products')
        .insert({
            user_id: userId,
            name: product.name,
            description: product.description,
            price: product.price,
            unit: product.unit,
            image_base64: product.image_base64,
            stock_quantity: product.stock_quantity || 0
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
        return null;
    }

    return data;
}

export async function updateProduct(id: string, userId: string, product: Partial<CreateProductData>): Promise<Product | null> {
    const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating product:', error);
        return null;
    }

    return data;
}

export async function deleteProduct(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting product:', error);
        return false;
    }

    return true;
}

export async function updateStock(productId: string, quantityDelta: number): Promise<boolean> {
    // 1. Get current stock
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

    if (fetchError || !product) {
        console.error('Error fetching product for stock update:', fetchError);
        return false;
    }

    const newStock = (product.stock_quantity || 0) + quantityDelta;

    // 2. Update stock
    const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

    if (updateError) {
        console.error('Error updating stock:', updateError);
        return false;
    }

    return true;
}
