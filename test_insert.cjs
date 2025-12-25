
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testInsert() {
    const userId = 'USER_ID_PLACEHOLDER'; // Will be replaced manually or via argument if I was smarter, but I'll just hardcode after getting it.
    // Actually, I'll pass it as arg or just use the one I find.

    // For now I'll fetch it inside.
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    const user = users[0];
    console.log('Testing insert for user:', user.id);

    const payload = {
        user_id: user.id,
        column_id: 'test-col-' + Date.now(),
        label: 'Test Category',
        description: 'Test Desc',
        color: '#123456',
        is_visible: true,
        position: 100
        // Note: workspace_id is missing, like in LeadCategories.tsx
    };

    const { data, error } = await supabase
        .from('kanban_columns')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('❌ INSERT FAILED MESSAGE:', error.message);
        console.error('❌ INSERT FAILED DETAILS:', error.details);
        console.error('❌ INSERT FAILED HINT:', error.hint);
        console.error('❌ INSERT FAILED CODE:', error.code);
    } else {
        console.log('✅ INSERT SUCCESS:', data);

        // Clean up
        await supabase.from('kanban_columns').delete().eq('id', data.id);
    }
}

testInsert();
