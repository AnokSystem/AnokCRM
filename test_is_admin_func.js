import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA';

const supabase = createClient(supabaseUrl, anonKey);

async function testIsAdminFunction() {
    console.log('--- TESTING is_admin() FUNCTION ---');

    // Sign in as admin
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin3@admin.com',
        password: 'admin123'
    });

    if (authError) {
        console.error('Login failed:', authError);
        return;
    }

    console.log('✓ Logged in as:', authData.user.email);
    console.log('User ID:', authData.user.id);

    // Call is_admin() function
    const { data: isAdminResult, error: isAdminError } = await supabase.rpc('is_admin');

    if (isAdminError) {
        console.error('❌ is_admin() error:', isAdminError);
    } else {
        console.log('is_admin() returned:', isAdminResult);
    }

    // Manually check the role
    const { data: roleCheck, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

    if (roleError) {
        console.error('❌ Manual role check error:', roleError);
    } else {
        console.log('Manual role check result:', roleCheck);
    }
}

testIsAdminFunction();
