
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getIntegrationUser() {
    const { data, error } = await supabase
        .from('integrations')
        .select('user_id')
        .limit(1);

    if (error) {
        console.error('Error fetching integration:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('User ID from Integration:', data[0].user_id);
    } else {
        console.log('No integrations found.');
    }
}

getIntegrationUser();
