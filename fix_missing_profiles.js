
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixProfiles() {
    console.log('--- FIXING MISSING PROFILES ---');

    // 1. Get all Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) { console.error('Auth Error:', authError); return; }

    // 2. Get all Profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id');
    if (profileError) { console.error('Profile Error:', profileError); return; }

    const existingIds = new Set(profiles.map(p => p.id));

    // 3. Find missing
    const missingUsers = users.filter(u => !existingIds.has(u.id));

    console.log(`Found ${missingUsers.length} missing profiles.`);

    for (const u of missingUsers) {
        console.log(`Creating profile for ${u.email}...`);
        const { error } = await supabase.from('profiles').insert({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || 'Usuário Sem Nome'
        });
        if (error) console.error('Error creating profile:', error);
        else console.log('Success.');
    }
}

fixProfiles();
