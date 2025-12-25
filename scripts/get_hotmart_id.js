import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', 'hotmart');

    if (error) {
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        console.log('FOUND:', data.length);
        console.log('VALID_ID:' + data[0].id);
    } else {
        console.log('NO_HOTMART_INTEGRATION');
    }
}

run();
