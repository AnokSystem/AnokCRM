
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
// SERVICE ROLE KEY to bypass RLS
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function debugUsers() {
    console.log('--- DEBUG USER DATA ---');

    // 1. Check Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) console.error('Auth Error:', authError);
    console.log(`Auth Users Found: ${users.length}`);
    users.forEach(u => console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${u.email_confirmed_at}`));

    // 2. Check Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) console.error('Profile Error:', profileError);
    console.log(`Profiles Found: ${profiles?.length || 0}`);
    profiles?.forEach(p => console.log(`- ID: ${p.id} | Name: ${p.full_name}`));

    // 3. Check User Plans
    const { data: plans, error: planError } = await supabase.from('user_plans').select('*');
    if (planError) console.error('Plan Error:', planError);
    console.log(`User Plans Found: ${plans?.length || 0}`);
    plans?.forEach(p => console.log(`- UserID: ${p.user_id} | PlanID: ${p.plan_id}`));

}

debugUsers();
