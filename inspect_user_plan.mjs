import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserPlan() {
    // First get user ID
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'jonatas@anok.com.br'); // Removed .single()

    if (profileError || !profiles || profiles.length === 0) {
        console.error('User not found or error:', profileError);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);

    for (const profile of profiles) {
        console.log(`User: ${profile.id} (${profile.email})`);

        const { data: userPlans, error: planError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_id', profile.id);

        if (planError) {
            console.error('Error fetching user plans:', planError);
            continue;
        }

        userPlans.forEach(p => {
            console.log(`  Plan ID: ${p.plan_id}`);
            console.log(`  Active Features:`, p.active_features);
        });
    }
}

checkUserPlan();
