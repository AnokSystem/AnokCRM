import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔍 Testing user_plans table with new subscription columns...\n');

async function testSubscriptionColumns() {
    try {
        // 1. Select all user_plans to see new columns
        const { data: plans, error } = await supabase
            .from('user_plans')
            .select('*')
            .limit(5);

        if (error) {
            console.error('❌ Error:', error);
            return;
        }

        console.log('✅ Successfully queried user_plans table\n');
        console.log(`Found ${plans?.length || 0} records\n`);

        if (plans && plans.length > 0) {
            plans.forEach((plan, i) => {
                console.log(`Record ${i + 1}:`);
                console.log('  - user_id:', plan.user_id);
                console.log('  - plan_id:', plan.plan_id);
                console.log('  - status:', plan.status || 'NOT SET');
                console.log('  - subscription_start_date:', plan.subscription_start_date || 'NOT SET');
                console.log('  - subscription_end_date:', plan.subscription_end_date || 'NOT SET');
                console.log('  - max_instances:', plan.max_instances || 'NOT SET');

                // Calculate days remaining
                if (plan.subscription_end_date) {
                    const endDate = new Date(plan.subscription_end_date);
                    const now = new Date();
                    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    console.log('  - days_remaining:', daysRemaining);
                }
                console.log('');
            });
        } else {
            console.log('⚠️ No records found in user_plans table');
        }

        // 2. Test query for expiring subscriptions
        console.log('\n🔍 Testing query for subscriptions expiring in 1 day...\n');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        const { data: expiring, error: expiringError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('status', 'active')
            .gte('subscription_end_date', tomorrow.toISOString())
            .lte('subscription_end_date', dayAfterTomorrow.toISOString());

        if (expiringError) {
            console.error('❌ Error:', expiringError);
        } else {
            console.log(`✅ Found ${expiring?.length || 0} subscriptions expiring in 1 day`);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

testSubscriptionColumns();
