
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getValidId() {
    const { data, error } = await supabase.from('integrations')
        .select('id')
        .eq('platform', 'kiwify')
        .eq('is_active', true)
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data) {
        fs.writeFileSync('valid_id.txt', data.id);
        console.log('ID Written to valid_id.txt');
    }
}

getValidId();
