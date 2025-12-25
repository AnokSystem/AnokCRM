
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkColumn() {
    console.log('Checking for is_visible column in kanban_columns...');

    // Try to insert a dummy row to check schema constraints or just select
    // Selecting might not fail if column missing unless we select specific column?
    // Actually, Supabase client might just ignore extra columns in select? 
    // Let's try to perform an RPC or just a raw select of that column.

    const { data, error } = await supabase
        .from('kanban_columns')
        .select('is_visible, description')
        .limit(1);

    if (error) {
        console.error('Error selecting is_visible:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('\n❌ IMPACT: The "is_visible" column is MISSING. The migration was not run.');
        } else {
            console.log('\n❌ IMPACT: Database error:', error.message);
        }
    } else {
        console.log('\n✅ SUCCESS: The "is_visible" column exists (or at least the select query did not fail).');
        console.log('Sample data:', data);
    }
}

checkColumn();
