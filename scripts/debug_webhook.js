/**
 * Script de Debug - Mostra o Payload Exato Enviado ao N8N
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function debug() {
    console.log('🔍 Debug: Verificando configuração...\n');

    // 1. Verificar webhook URL
    const { data: webhook } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'bills_notification_webhook_url')
        .single();

    if (!webhook?.value) {
        console.error('❌ Webhook não configurado no banco!');
        process.exit(1);
    }

    console.log('✅ Webhook URL:', webhook.value);

    // 2. Buscar configurações do usuário
    const { data: settings } = await supabase
        .from('bill_notification_settings')
        .select('*')
        .eq('enabled', true)
        .limit(1)
        .single();

    if (!settings) {
        console.error('❌ Nenhuma configuração de usuário encontrada!');
        process.exit(1);
    }

    console.log('\n✅ Configurações do usuário:');
    console.log('   Instância:', settings.whatsapp_instance);
    console.log('   Telefone:', settings.notification_phone);

    // 3. Criar payload de teste
    const payload = {
        phone: settings.notification_phone,
        name: 'Teste Debug',
        email: 'debug@teste.com',
        first_name: 'Debug',
        flow_id: 'bill-notification-debug',
        instance: settings.whatsapp_instance,
        instance_name: settings.whatsapp_instance,
        step: 1,
        current_step_order: 1,
        params: {
            message: '🧪 TESTE DE DEBUG\n\nSe você recebeu esta mensagem, o webhook está funcionando!'
        }
    };

    console.log('\n📦 Payload que será enviado:');
    console.log(JSON.stringify(payload, null, 2));

    // 4. Enviar
    console.log('\n📤 Enviando para N8N...');

    const response = await fetch(webhook.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    console.log('\n📨 Resposta do N8N:');
    console.log('   Status:', response.status);
    console.log('   Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
    console.log('   Body:', responseText);

    if (response.ok) {
        console.log('\n✅ Requisição enviada com sucesso!');
        console.log('💡 Se não recebeu no WhatsApp, o problema está no workflow N8N.');
        console.log('\n🔧 Verifique no N8N:');
        console.log('   1. O Webhook Node está ativo?');
        console.log('   2. Os dados estão sendo passados corretamente?');
        console.log('   3. O node Evolution API está configurado?');
        console.log('   4. Veja os logs de execução do workflow');
    } else {
        console.log('\n❌ Erro na requisição!');
    }
}

debug().then(() => process.exit(0)).catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
