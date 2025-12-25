
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('*');
    if (wsError) console.error('Workspaces Error:', wsError);
    console.log('Workspaces:', workspaces);

    const { data: columns, error: colError } = await supabase.from('kanban_columns').select('*');
    if (colError) console.error('Columns Error:', colError);
    console.log('Columns:', columns);
}

checkData();
