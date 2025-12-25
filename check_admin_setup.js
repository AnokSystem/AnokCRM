import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAdminSetup() {
    console.log('--- CHECKING ADMIN SETUP ---');

    // 1. Find admin3 user
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const admin = users.find(u => u.email === 'admin3@admin.com');

    if (!admin) {
        console.error('❌ Admin user not found!');
        return;
    }

    console.log('✓ Admin user found:', admin.id);

    // 2. Check if admin has a role
    const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', admin.id);

    if (roleError) {
        console.error('❌ Error checking roles:', roleError);
    } else {
        console.log(`Roles for admin: ${roles.length}`);
        roles.forEach(r => console.log(`  - Role: ${r.role}`));
    }

    // 3. Check if admin has a profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', admin.id)
        .single();

    if (profileError) {
        console.error('❌ Error checking profile:', profileError);
    } else {
        console.log('✓ Profile exists:', profile.full_name);
    }

    // 4. Test the is_admin() function directly
    console.log('\n--- Testing is_admin() function ---');
    const { data: testResult, error: testError } = await supabase.rpc('is_admin');

    if (testError) {
        console.error('❌ is_admin() function error:', testError);
    } else {
        console.log('is_admin() result:', testResult);
    }
}

checkAdminSetup();
