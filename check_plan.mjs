import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Checking user_plans for planotest@example.com...\n');

// Get user ID from auth
const getUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
});

const usersData = await getUserResponse.json();
const testUser = usersData.users?.find(u => u.email === 'planotest@example.com');

if (testUser) {
    console.log('✅ User found:', testUser.id);

    // Check user_plans
    const { data: planData, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', testUser.id)
        .single();

    if (error) {
        console.error('❌ Error getting plan:', error);
    } else if (planData) {
        console.log('\n✅ PLAN FOUND:');
        console.log(JSON.stringify(planData, null, 2));
    } else {
        console.log('\n❌ No plan found for this user!');
    }
} else {
    console.log('❌ User not found');
}
