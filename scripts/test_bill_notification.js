/**
 * Script de Teste de Notificações de Contas
 * 
 * Este script envia uma notificação de teste imediatamente para verificar
 * se o sistema de WhatsApp está funcionando corretamente.
 * 
 * Usage: node scripts/test_bill_notification.js
 */

import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
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

        console.log(`\n📤 Enviando mensagem via N8N...`);
        console.log(`   Webhook: ${N8N_WEBHOOK_URL.substring(0, 50)}...`);
        console.log(`   Instância: ${instance}`);
        console.log(`   Telefone: ${phone}`);

        // Send via N8N (same structure as webhook.js)
        const payload = {
            phone: phone,
            name: 'Teste Notificação',
            email: 'teste@sistema.com',
            first_name: 'Sistema',
            flow_id: 'bill-notification-test',
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

        const responseText = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${responseText.substring(0, 200)}`);

        return response.ok;
    } catch (error) {
        console.error('❌ Erro ao enviar:', error.message);
        return false;
    }
}

async function testBillNotification() {
    console.log('🧪 Iniciando teste de notificações de contas...\n');

    try {
        // 1. Buscar configurações de notificação de qualquer usuário
        const { data: settings, error: settingsError } = await supabase
            .from('bill_notification_settings')
            .select('*')
            .eq('enabled', true)
            .limit(1)
            .single();

        if (settingsError || !settings) {
            console.error('❌ Nenhuma configuração de notificação encontrada!');
            console.log('\n💡 Configure as notificações na página Financeiro primeiro.');
            process.exit(1);
        }

        console.log('✅ Configurações encontradas:');
        console.log(`   Usuário: ${settings.user_id}`);
        console.log(`   Instância: ${settings.whatsapp_instance}`);
        console.log(`   Telefone: ${settings.notification_phone}`);
        console.log(`   Notificar D-1: ${settings.notify_1d_before ? 'Sim' : 'Não'}`);
        console.log(`   Notificar no dia: ${settings.notify_on_due_date ? 'Sim' : 'Não'}`);

        // 2. Buscar uma conta pendente deste usuário
        const { data: bill } = await supabase
            .from('bills')
            .select('*, category:bill_categories(name)')
            .eq('user_id', settings.user_id)
            .eq('status', 'pending')
            .order('due_date', { ascending: true })
            .limit(1)
            .single();

        if (!bill) {
            console.log('\n⚠️  Nenhuma conta pendente encontrada.');
            console.log('💡 Cadastre uma conta pendente na página Financeiro para testar.');
            process.exit(0);
        }

        console.log('\n✅ Conta encontrada para teste:');
        console.log(`   Título: ${bill.title}`);
        console.log(`   Valor: R$ ${bill.amount.toFixed(2)}`);
        console.log(`   Vencimento: ${format(new Date(bill.due_date), 'dd/MM/yyyy')}`);
        if (bill.category) {
            console.log(`   Categoria: ${bill.category.name}`);
        }

        // 3. Enviar notificação de teste
        const message = `🧪 *TESTE DE NOTIFICAÇÃO*\n\n` +
            `Este é um teste do sistema de lembretes de contas a pagar.\n\n` +
            `📋 *Exemplo de notificação:*\n\n` +
            `🔔 *Lembrete de Conta*\n\n` +
            `A conta *${bill.title}* vence em breve!\n\n` +
            `💰 Valor: R$ ${bill.amount.toFixed(2)}\n` +
            `📅 Vencimento: ${format(new Date(bill.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n` +
            (bill.category ? `🏷️ Categoria: ${bill.category.name}\n` : '') +
            `\n✅ *Sistema funcionando corretamente!*`;

        const sent = await sendWhatsAppMessage(
            settings.whatsapp_instance,
            settings.notification_phone,
            message
        );

        if (sent) {
            console.log('\n✅ SUCESSO! Notificação de teste enviada.');
            console.log('📱 Verifique seu WhatsApp para confirmar o recebimento.');
        } else {
            console.log('\n❌ FALHA ao enviar notificação.');
            console.log('💡 Verifique:');
            console.log('   1. A instância WhatsApp está conectada?');
            console.log('   2. O número está no formato correto? (com código do país)');
            console.log('   3. A API Evolution está online?');
        }

        console.log('\n🎯 Teste concluído!\n');

    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error);
        process.exit(1);
    }
}

// Executar teste
testBillNotification()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
