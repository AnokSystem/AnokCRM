/**
 * Daily Bill Notifications Script
 * 
 * This script should run every day (e.g., at 9:00 AM) to send WhatsApp reminders for:
 * - Bills due tomorrow (D-1 reminder)
 * - Bills due today
 * 
 * Usage:
 * 1. Set up as cron job: node scripts/send_bill_notifications.js
 * 2. Or integrate with Supabase Scheduled Functions
 */

import { createClient } from '@supabase/supabase-js';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function getWebhookUrl() {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'bills_notification_webhook_url')
        .single();

    if (error || !data?.value) {
        throw new Error('URL do webhook de notificações não configurada! Configure em Admin > Configurações.');
    }

    return data.value;
}

async function sendWhatsAppMessage(instance, phone, message) {
    try {
        // Fetch webhook URL from database
        const N8N_WEBHOOK_URL = await getWebhookUrl();

        // Send via N8N (same structure as test script)
        const payload = {
            phone: phone,
            name: 'Sistema',
            email: 'sistema@anok.com.br',
            first_name: 'Sistema',
            flow_id: 'bill-notification',
            instance: instance,
            instance_name: instance,
            step: 1,
            current_step_order: 1,
            params: {
                message: message
            }
        };

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
        return false;
    }
}

async function sendBillNotifications() {
    console.log(`[${new Date().toISOString()}] Starting bill notifications...`);

    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    try {
        // 1. Get bills due tomorrow (D-1 reminder)
        const { data: billsTomorrow, error: error1 } = await supabase
            .from('bills')
            .select(`
                *,
                category:bill_categories(name)
            `)
            .eq('status', 'pending')
            .eq('due_date', tomorrow);

        if (error1) throw error1;

        console.log(`Found ${billsTomorrow?.length || 0} bills due tomorrow`);

        // Send D-1 reminders
        for (const bill of billsTomorrow || []) {
            // Get user notification settings
            const { data: settings } = await supabase
                .from('bill_notification_settings')
                .select('*')
                .eq('user_id', bill.user_id)
                .eq('enabled', true)
                .single();

            if (!settings || !settings.notify_1d_before) {
                console.log(`Skipping bill ${bill.id}: no settings or D-1 disabled`);
                continue;
            }

            const phone = settings.notification_phone;
            const instance = settings.whatsapp_instance;

            // Check if notification already sent today
            const { data: existingNotification } = await supabase
                .from('bill_notifications')
                .select('id')
                .eq('bill_id', bill.id)
                .eq('notification_type', 'reminder_1d')
                .gte('sent_at', today)
                .single();

            if (existingNotification) {
                console.log(`Notification already sent for bill ${bill.id}`);
                continue;
            }

            // Format message
            const message = `🔔 *Lembrete de Conta*\n\n` +
                `A conta *${bill.title}* vence amanhã!\n\n` +
                `💰 Valor: R$ ${bill.amount.toFixed(2)}\n` +
                `📅 Vencimento: ${format(new Date(bill.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n` +
                (bill.category ? `🏷️ Categoria: ${bill.category.name}\n` : '') +
                `\n_Não esqueça de efetuar o pagamento!_`;

            const sent = await sendWhatsAppMessage(instance, phone, message);

            if (sent) {
                // Log notification
                await supabase.from('bill_notifications').insert({
                    bill_id: bill.id,
                    notification_type: 'reminder_1d',
                    whatsapp_instance: instance,
                    phone: phone
                });
                console.log(`✅ Sent D-1 reminder for bill ${bill.id}`);
            } else {
                console.error(`❌ Failed to send D-1 reminder for bill ${bill.id}`);
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. Get bills due today
        const { data: billsToday, error: error2 } = await supabase
            .from('bills')
            .select(`
                *,
                category:bill_categories(name)
            `)
            .eq('status', 'pending')
            .eq('due_date', today);

        if (error2) throw error2;

        console.log(`Found ${billsToday?.length || 0} bills due today`);

        // Send due date reminders
        for (const bill of billsToday || []) {
            const { data: settings } = await supabase
                .from('bill_notification_settings')
                .select('*')
                .eq('user_id', bill.user_id)
                .eq('enabled', true)
                .single();

            if (!settings || !settings.notify_on_due_date) continue;

            const phone = settings.notification_phone;
            const instance = settings.whatsapp_instance;

            // Check if notification already sent
            const { data: existingNotification } = await supabase
                .from('bill_notifications')
                .select('id')
                .eq('bill_id', bill.id)
                .eq('notification_type', 'reminder_due')
                .gte('sent_at', today)
                .single();

            if (existingNotification) continue;

            const message = `⚠️ *Conta Vencendo Hoje*\n\n` +
                `A conta *${bill.title}* vence HOJE!\n\n` +
                `💰 Valor: R$ ${bill.amount.toFixed(2)}\n` +
                `📅 Vencimento: Hoje, ${format(new Date(bill.due_date), "dd 'de' MMMM", { locale: ptBR })}\n` +
                (bill.category ? `🏷️ Categoria: ${bill.category.name}\n` : '') +
                `\n_⏰ Último dia para pagamento sem multa!_`;

            const sent = await sendWhatsAppMessage(instance, phone, message);

            if (sent) {
                await supabase.from('bill_notifications').insert({
                    bill_id: bill.id,
                    notification_type: 'reminder_due',
                    whatsapp_instance: instance,
                    phone: phone
                });
                console.log(`✅ Sent due-date reminder for bill ${bill.id}`);
            } else {
                console.error(`❌ Failed to send due-date reminder for bill ${bill.id}`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`[${new Date().toISOString()}] Bill notifications completed!`);
        console.log(`Summary: ${billsTomorrow?.length || 0} D-1 reminders, ${billsToday?.length || 0} due-date reminders`);

    } catch (error) {
        console.error('Error in sendBillNotifications:', error);
        throw error;
    }
}

// Run the script
sendBillNotifications()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
