
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSchema() {
    console.log('--- CHECKING SCHEMA ---');

    // Attempt to insert a dummy column with description to see if it fails
    // Actually, safer to select. But SELECT * might not show us metadata easily if no rows.
    // Let's try to select specific column.

    // Test 1: Count rows
    const { data: count, error: countError } = await supabase
        .from('kanban_columns')
        .select('count');
    console.log('Row count check:', countError ? countError.message : 'OK');

    // Test 2: Try to select 'description' column
    const { data, error } = await supabase
        .from('kanban_columns')
        .select('description')
        .limit(1);

    if (error) {
        console.log('ERROR selecting description:', error.message);
        // "Could not find column 'description' in table."
    } else {
        console.log('SUCCESS: description column exists.');
    }
}

checkSchema();
