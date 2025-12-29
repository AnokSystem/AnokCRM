import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPlans() {
    const { data: plans, error } = await supabase
        .from('plans')
        .select('*');

    if (error) {
        console.error('Error fetching plans:', error);
        return;
    }

    console.log('Plans found:', plans.length);
    plans.forEach(p => {
        console.log(`Plan: ${p.name}`);
        console.log(`ID: ${p.id}`);
        console.log(`Features:`, p.features);
        console.log(`Max Users: ${p.max_users}`);
        console.log(`Max Leads: ${p.max_leads}`);
        console.log(`Max WA Instances: ${p.max_instances}`);
        console.log('---');
    });
}

checkPlans();
