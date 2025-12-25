
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupAdmin() {
    const email = 'admin3@admin.com';
    const password = 'admin123';

    console.log(`Signing in as ${email}...`);

    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error('Error signing in:', signInError.message);
        return;
    }

    if (!user) {
        console.error('No user returned after sign in.');
        return;
    }

    console.log('User signed in. ID:', user.id);

    // 1. Ensure Profile Exists
    console.log('Checking/Creating profile...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile) {
        console.log('Profile not found, creating one...');
        const { error: insertProfileError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: email,
                full_name: 'Admin User',
                created_at: new Date().toISOString()
            });

        if (insertProfileError) {
            console.error('Error creating profile:', insertProfileError.message);
            // Continue anyway, maybe the table doesn't exist or permissions issue, 
            // but we want to try assigning the role.
        } else {
            console.log('Profile created successfully.');
        }
    } else {
        console.log('Profile already exists.');
    }

    // 2. Assign Admin Role
    console.log('Assigning admin role...');
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
            user_id: user.id,
            role: 'admin'
        });

    if (roleError) {
        console.error('Error assigning role:', roleError.message);
        import('fs').then(fs => fs.writeFileSync('error_role.txt', JSON.stringify(roleError, null, 2)));
        // If it's a duplicate key error, that's fine, they are already admin.
        if (roleError.code === '23505') {
            console.log('User is already an admin.');
        }
    } else {
        console.log('Admin role assigned successfully!');
    }
}

setupAdmin();
