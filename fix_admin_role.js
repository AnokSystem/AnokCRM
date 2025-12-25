
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixAdmin() {
    const email = 'admin3@admin.com';
    console.log(`Fixing admin role for ${email}...`);

    // 1. Get correct User ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found!');
        return;
    }
    console.log('Correct User ID:', user.id);

    // 2. Check if role exists
    const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (existingRole) {
        console.log('Role already exists for this ID:', existingRole);
    } else {
        console.log('Role missing. creating...');
        const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' });

        if (error) console.error('Error inserting role:', error);
        else console.log('Role inserted successfully!');
    }

    // 3. Ensure Profile exists too
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile) {
        console.log('Profile missing, creating...');
        await supabase.from('profiles').insert({
            id: user.id,
            email: email,
            full_name: 'Admin User'
        });
        console.log('Profile created.');
    }

}

fixAdmin();
