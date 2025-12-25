import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTables() {
    console.log('--- CHECKING TABLES ---');

    // Check profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('count');

    console.log('Profiles table:', profileError ? `ERROR: ${profileError.message}` : `EXISTS (${profiles?.[0]?.count || 0} rows)`);

    // Check user_plans
    const { data: userPlans, error: userPlansError } = await supabase
        .from('user_plans')
        .select('count');

    console.log('user_plans table:', userPlansError ? `ERROR: ${userPlansError.message}` : `EXISTS (${userPlans?.[0]?.count || 0} rows)`);

    // Check user_roles
    const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('count');

    console.log('user_roles table:', userRolesError ? `ERROR: ${userRolesError.message}` : `EXISTS (${userRoles?.[0]?.count || 0} rows)`);

    // Check plans
    const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('count');

    console.log('plans table:', plansError ? `ERROR: ${plansError.message}` : `EXISTS (${plans?.[0]?.count || 0} rows)`);
}

checkTables();
