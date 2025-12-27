import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: sample, error } = await supabase
    .from('user_plans')
    .select('*')
    .limit(1)
    .single();

console.log('Sample record from user_plans:');
if (sample) {
    console.log('\nColumn names:', Object.keys(sample));
    console.log('\nFull record:', JSON.stringify(sample, null, 2));
} else {
    console.log('No records found');
}

if (error) console.error('Error:', error);
