import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA';

const supabase = createClient(supabaseUrl, anonKey);

async function testProfileAccess() {
    console.log('--- TESTING PROFILE ACCESS ---');

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

    // Test 1: Simple profile select without joins
    console.log('\n1. Testing simple profile select:');
    const { data: simpleData, error: simpleError } = await supabase
        .from('profiles')
        .select('*');

    if (simpleError) {
        console.error('❌ Simple select failed:', simpleError.message);
    } else {
        console.log(`✓ Found ${simpleData.length} profiles`);
        simpleData.forEach(p => console.log(`  - ${p.full_name} (${p.email})`));
    }

    // Test 2: Select with user_plans join
    console.log('\n2. Testing with user_plans join:');
    const { data: joinData, error: joinError } = await supabase
        .from('profiles')
        .select(`*, user_plans(plan_id, active_features)`);

    if (joinError) {
        console.error('❌ Join query failed:', joinError.message);
    } else {
        console.log(`✓ Found ${joinData.length} profiles with plans`);
    }

    // Test 3: Full Admin Panel query
    console.log('\n3. Testing full Admin Panel query:');
    const { data: fullData, error: fullError } = await supabase
        .from('profiles')
        .select(`
      *,
      user_plans(plan_id, active_features),
      user_roles(role)
    `)
        .order('created_at', { ascending: false });

    if (fullError) {
        console.error('❌ Full query failed:', fullError.message);
    } else {
        console.log(`✓ Full query succeeded! Found ${fullData.length} users`);
    }
}

testProfileAccess();
