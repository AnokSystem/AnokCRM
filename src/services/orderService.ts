
import { supabase } from '@/lib/supabase';
import { updateStock } from './productService';

export interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    width?: number;
    height?: number;
    subtotal: number;
}

export interface Order {
    id: string;
    user_id: string;
    client_name: string;
    client_id?: string;
    total_amount: number;
    status: 'orcamento' | 'aguardando_pagamento' | 'pago' | 'atrasado' | 'pending' | 'completed' | 'cancelled';
    items: OrderItem[];
    created_at: string;
}

export type CreateOrderData = Omit<Order, 'id' | 'user_id' | 'created_at'>;

const DEDUCT_STOCK_STATUSES = ['pago', 'aguardando_pagamento', 'atrasado'];

export async function createOrder(userId: string, order: CreateOrderData): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            client_name: order.client_name,
            client_id: order.client_id || null,
            total_amount: order.total_amount,
            status: order.status || 'pending',
            items: order.items
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating order:', error);
        return null;
    }

    // Deduct stock if applicable
    if (order.status && DEDUCT_STOCK_STATUSES.includes(order.status)) {
        for (const item of order.items) {
            await updateStock(item.product_id, -item.quantity);
        }
    }

    return data;
}

export async function getOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    return data || [];
}

export async function updateOrder(orderId: string, order: Partial<CreateOrderData>): Promise<Order | null> {
    // 1. Get current order to restore stock if needed
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (fetchError || !currentOrder) {
        console.error('Error fetching current order:', fetchError);
        return null;
    }

    // 2. Perform update
    const { data, error } = await supabase
        .from('orders')
        .update({
            ...(order.client_name && { client_name: order.client_name }),
            ...(order.client_id !== undefined && { client_id: order.client_id || null }),
            ...(order.total_amount && { total_amount: order.total_amount }),
            ...(order.status && { status: order.status }),
            ...(order.items && { items: order.items })
        })
        .eq('id', orderId)
        .select()
        .single();

    if (error) {
        console.error('Error updating order:', error);
        return null;
    }

    // 3. Handle Stock Updates
    // A. Revert old stock effect (add back if it was deducted)
    if (DEDUCT_STOCK_STATUSES.includes(currentOrder.status)) {
        for (const item of currentOrder.items) {
            // Assuming items have product_id and quantity
            // Use type assertion or check if needed, but OrderItem has them.
            await updateStock((item as any).product_id, (item as any).quantity);
        }
    }

    // B. Apply new stock effect (deduct if new status is valid)
    // Use the updated 'data' which has the NEW items and NEW status
    if (DEDUCT_STOCK_STATUSES.includes(data.status)) {
        for (const item of data.items) {
            await updateStock((item as any).product_id, -(item as any).quantity);
        }
    }

    return data;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
    // 1. Fetch order before deleting to check stock
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (fetchError) {
        console.error('Error fetching order for deletion:', fetchError);
        // creating error but continuing? No, better safe.
        // If we can't find it, we can't delete it or it is already gone.
        return false;
    }

    // 2. Restore stock if needed
    if (order && DEDUCT_STOCK_STATUSES.includes(order.status)) {
        for (const item of order.items) {
            await updateStock((item as any).product_id, (item as any).quantity);
        }
    }

    // 3. Delete
    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

    if (error) {
        console.error('Error deleting order:', error);
        return false;
    }

    return true;
}
