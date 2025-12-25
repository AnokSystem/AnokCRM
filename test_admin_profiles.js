import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA';

const supabase = createClient(supabaseUrl, anonKey);

async function testAdminQuery() {
    console.log('--- TESTING ADMIN PANEL QUERY ---');

    // 1. Sign in as admin
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin3@admin.com',
        password: 'admin123'
    });

    if (authError) {
        console.error('Login failed:', authError);
        return;
    }

    console.log('✓ Logged in as:', authData.user.email);

    // 2. Try the exact query from Admin.tsx
    const { data, error } = await supabase
        .from('profiles')
        .select(`
      *,
      user_plans(plan_id, active_features),
      user_roles(role)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Query FAILED:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
    } else {
        console.log(`✓ Query SUCCESS! Found ${data.length} users`);
        data.forEach(u => {
            console.log(`  - ${u.full_name || 'No Name'} (${u.email})`);
        });
    }
}

testAdminQuery();
