import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA';

const supabase = createClient(supabaseUrl, anonKey);

async function testInstanceRLS() {
    console.log('--- TESTING WHATSAPP INSTANCE RLS ---');

    // Login as kona
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'kona@anok.com.br',
        password: 'kona123'
    });

    if (authError) {
        console.error('Login failed:', authError);
        return;
    }

    console.log('✓ Logged in as:', authData.user.email);
    console.log('User ID:', authData.user.id);

    // Query instances
    const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*');

    if (error) {
        console.error('❌ Query failed:', error);
    } else {
        console.log(`✓ Query succeeded! Found ${data.length} instances`);
        data.forEach(inst => {
            console.log(`  - ${inst.display_name} (${inst.instance_name}) - Owner: ${inst.user_id}`);
        });
    }
}

testInstanceRLS();
