
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ID = '12721fa1-cff4-4dfc-82ff-044b28dc07be';

async function switchPlatform(platform) {
    const { data, error } = await supabase
        .from('integrations')
        .update({ platform: platform })
        .eq('id', ID)
        .select();

    if (error) {
        console.error('Error updating platform:', error);
    } else {
        console.log(`Successfully switched platform to: ${platform}`);
    }
}

// Get args
const targetPlatform = process.argv[2];
if (!targetPlatform) {
    console.error('Please provide platform name (kiwify/braip)');
} else {
    switchPlatform(targetPlatform);
}
