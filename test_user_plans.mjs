import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('Testing user_plans table access...\n');

// Try to select from user_plans
const { data, error } = await supabase
    .from('user_plans')
    .select('*')
    .limit(1);

if (error) {
    console.error('❌ Error:', error);
} else {
    console.log('✅ Success! Table structure:');
    console.log(data);
}

// Get table info
const { data: tableData, error: tableError } = await supabase
    .from('user_plans')
    .select('*')
    .limit(0);

if (!tableError) {
    console.log('\n📋 Available columns:', Object.keys(tableData?.[0] || {}));
}
