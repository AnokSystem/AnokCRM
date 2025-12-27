import { createClient } from '@supabase/supabase-js';

// Supabase Config
const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const email = process.argv[2];
const days = parseInt(process.argv[3]);

if (!email || isNaN(days)) {
    console.log('❌ Uso: node set_expiration_date.mjs <email> <dias_para_vencer>');
    console.log('Exemplo: node set_expiration_date.mjs maria@gmail.com 0');
    process.exit(1);
}

async function setExpiration() {
    console.log(`🔍 Buscando usuário: ${email}...`);

    // 1. Get User ID
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError || !profiles) {
        console.error('❌ Usuário não encontrado:', profileError?.message);
        return;
    }

    const userId = profiles.id;
    console.log(`✅ ID encontrado: ${userId}`);

    // 2. Calculate New Date (End of Day)
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days); // Add days

    // IMPORTANT: Set to end of day to avoid premature "overdue" status
    newDate.setHours(23, 59, 59, 999);

    console.log(`📅 Definindo vencimento para: ${newDate.toISOString()} (${days} dias a partir de hoje)`);

    // 3. Update Plan
    const { error: updateError } = await supabase
        .from('user_plans')
        .update({
            subscription_end_date: newDate.toISOString(),
            status: 'active' // Ensure active status
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError.message);
    } else {
        console.log('✅ Sucesso! Data de vencimento atualizada para o final do dia.');
        console.log('👉 Agora rode o workflow do n8n para testar.');
    }
}

setExpiration();
