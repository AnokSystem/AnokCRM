
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function forceAssignRole() {
    const email = 'admin3@admin.com';
    console.log(`Looking up user ${email}...`);

    // Get User ID by listing users (Service Key allows this)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
        console.error('User not found in list.');
        return;
    }

    console.log('Found user ID:', targetUser.id);

    // Direct Insert
    console.log('Attempting to insert into user_roles...');
    const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: targetUser.id, role: 'admin' });

    if (error) {
        console.error('Error assigning role:', error);
    } else {
        console.log('Successfully assigned admin role!');
    }
}

forceAssignRole();
