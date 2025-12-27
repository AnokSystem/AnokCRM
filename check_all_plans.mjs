import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Getting ALL user_plans...\n');

const { data: allPlans, error } = await supabase
    .from('user_plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

if (error) {
    console.error('❌ Error:', error);
} else {
    console.log(`✅ Found ${allPlans.length} plans:\n`);
    allPlans.forEach((plan, i) => {
        console.log(`${i + 1}. User ID: ${plan.user_id}`);
        console.log(`   Plan: ${plan.plan}`);
        console.log(`   Status: ${plan.status}`);
        console.log(`   Max Instances: ${plan.max_instances}`);
        console.log(`   Created: ${plan.created_at}\n`);
    });
}
