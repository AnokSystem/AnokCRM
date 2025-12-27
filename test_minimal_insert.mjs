import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Try to insert with minimal fields
const { data, error } = await supabase
    .from('user_plans')
    .insert({
        user_id: '82a4ed82-49b7-44fd-a794-750aea79a3f9', // test456 user
        max_instances: 5
    })
    .select();

console.log('Insert result:');
if (error) {
    console.error('❌ Error:', error);
} else {
    console.log('✅ Success:', data);
}
