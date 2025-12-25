/**
 * Test Script: Integration Automation
 * 
 * This script tests the new remarketing enrollment and category assignment features
 * for integration webhooks.
 * 
 * Usage: node scripts/test_integration_automation.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const WEBHOOK_URL = 'http://localhost:3000/webhook/integration';

async function testIntegrationAutomation() {
    console.log('🧪 Testing Integration Automation\n');

    // Test 1: Verify integration has automation fields
    console.log('Test 1: Checking if automation columns exist...');
    const { data: integrations, error: intError } = await supabase
        .from('integrations')
        .select('id, name, remarketing_sequence_id, default_category_id')
        .limit(1);

    if (intError) {
        console.error('❌ Error fetching integrations:', intError.message);
        console.log('\n⚠️  Make sure to run the migration first:');
        console.log('   node apply_migration.js migrations/add_automation_to_integrations.sql');
        return;
    }

    console.log('✅ Integration table has automation columns');

    if (!integrations || integrations.length === 0) {
        console.log('\n⚠️  No integrations found. Please create one first via the UI.');
        return;
    }

    const integration = integrations[0];
    console.log(`   Using integration: ${integration.name} (ID: ${integration.id})`);
    console.log(`   Remarketing: ${integration.remarketing_sequence_id || 'Not configured'}`);
    console.log(`   Category: ${integration.default_category_id || 'Auto-detect'}`);

    // Test 2: Send test webhook
    console.log('\nTest 2: Sending test webhook payload...');
    const testPayload = {
        buyer: {
            name: 'Test Automation Lead',
            email: 'automation@test.com',
            checkout_phone: '5511999999999',
            document: '12345678900'
        },
        product: {
            name: 'Test Product - Automation'
        },
        price: {
            value: 97.00
        },
        status: 'APPROVED',
        transaction: 'TEST_AUTOMATION_' + Date.now()
    };

    try {
        const response = await fetch(`${WEBHOOK_URL}?id=${integration.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });

        const result = await response.json();
        console.log('✅ Webhook processed successfully');
        console.log('   Response:', JSON.stringify(result, null, 2));

        // Test 3: Verify lead was created
        console.log('\nTest 3: Verifying lead creation...');
        const { data: lead } = await supabase
            .from('leads')
            .select('*, remarketing_enrollments(*)')
            .eq('phone', '5511999999999')
            .single();

        if (lead) {
            console.log('✅ Lead created successfully');
            console.log(`   Lead ID: ${lead.id}`);
            console.log(`   Column: ${lead.column_id}`);
            console.log(`   Workspace: ${lead.workspace_id}`);

            // Test 4: Verify remarketing enrollment
            if (integration.remarketing_sequence_id) {
                console.log('\nTest 4: Verifying remarketing enrollment...');
                const { data: enrollment } = await supabase
                    .from('remarketing_enrollments')
                    .select('*')
                    .eq('lead_id', lead.id)
                    .eq('sequence_id', integration.remarketing_sequence_id)
                    .single();

                if (enrollment) {
                    console.log('✅ Lead enrolled in remarketing sequence');
                    console.log(`   Status: ${enrollment.status}`);
                    console.log(`   Next execution: ${enrollment.next_execution_at}`);
                } else {
                    console.log('❌ Lead NOT enrolled in remarketing sequence');
                }
            } else {
                console.log('\nTest 4: Skipped (no remarketing sequence configured)');
            }

            // Test 5: Verify category assignment
            console.log('\nTest 5: Verifying category assignment...');
            if (integration.default_category_id) {
                if (lead.column_id === integration.default_category_id) {
                    console.log('✅ Lead assigned to configured category');
                    console.log(`   Category: ${lead.column_id}`);
                } else {
                    console.log('❌ Lead NOT in configured category');
                    console.log(`   Expected: ${integration.default_category_id}`);
                    console.log(`   Got: ${lead.column_id}`);
                }
            } else {
                console.log('✅ Lead assigned to auto-detected category');
                console.log(`   Category: ${lead.column_id}`);
            }

        } else {
            console.log('❌ Lead not found');
        }

    } catch (error) {
        console.error('❌ Error sending webhook:', error.message);
    }

    console.log('\n🎉 Test completed!\n');
}

testIntegrationAutomation();
