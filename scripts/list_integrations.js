
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listIntegrations() {
    const { data, error } = await supabase
        .from('integrations')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Integrations:', data);

    // Suggest an ID
    const braipParams = data.find(i => i.platform === 'braip');
    if (braipParams) {
        console.log('\nSUGGESTED BRAIP ID:', braipParams.id);
    }
}

listIntegrations();
