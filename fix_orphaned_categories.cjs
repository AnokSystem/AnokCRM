
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixOrphanedCategories() {
    console.log('Starting migration of orphaned categories...');

    // 1. Get all users
    const { data: users, error: userError } = await supabase.from('profiles').select('id');
    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        // 2. Get default workspace for this user
        const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();

        if (wsError || !workspace) {
            console.log(`User ${user.id} has no default workspace. Skipping.`);
            continue;
        }

        console.log(`User ${user.id} default workspace: ${workspace.id}`);

        // 3. Update orphaned columns (workspace_id IS NULL)
        const { data: updated, error: updateError } = await supabase
            .from('kanban_columns')
            .update({ workspace_id: workspace.id })
            .eq('user_id', user.id)
            .is('workspace_id', null)
            .select();

        if (updateError) {
            console.error(`Error updating columns for user ${user.id}:`, updateError);
        } else {
            console.log(`Updated ${updated.length} orphaned columns for user ${user.id}.`);
        }
    }

    console.log('Migration complete.');
}

fixOrphanedCategories();
