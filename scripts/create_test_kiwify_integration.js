
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createKiwifyIntegration() {
    const userId = '5ad9b922-db1d-44dd-916b-9f212dcae2ae'; // Hardcoded from previous step

    const { data, error } = await supabase
        .from('integrations')
        .insert({
            user_id: userId,
            name: 'Kiwify Test Integration',
            platform: 'kiwify',
            slug: 'kiwify-test',
            is_active: true
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error creating integration:', error);
        return;
    }

    console.log('Created Kiwify Integration ID:', data.id);
}

createKiwifyIntegration();
