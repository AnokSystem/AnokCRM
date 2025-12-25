
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function simulate() {
    console.log('Fetching integration...');
    // Fetch generic integration (Braip or Hotmart)
    const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('is_active', true)
        .limit(1);

    if (error || !integrations?.length) {
        console.error('No active integration found to test with.', error);
        return;
    }

    const integration = integrations[0];
    console.log('Using Integration ID:', integration.id);
    console.log('Integration Flow ID:', integration.flow_id);

    const payload = {
        type: 'PURCHASE_APPROVED',
        product: { name: 'Produto Teste Simulation' },
        price: { value: 100.00 },
        payment: { status: 'approved' },
        buyer: {
            name: 'Simulated User',
            email: 'simulated@test.com',
            checkout_phone: '5511999998888',
            address: {
                zip_code: '01001000',
                address: 'Rua Teste',
                number: '123',
                neighborhood: 'Centro',
                city: 'São Paulo',
                state: 'SP'
            }
        },
        transaction: 'TX-SIM-' + Date.now(),
        status: 'approved'
    };

    console.log('Sending Webhook Request...');

    // Simulate Braip Payload Structure (or Hotmart structure used above)
    // Actually Hotmart structure is used above in `webhook.js` logic for `buyer`
    // Let's wrap it if needed. `webhook.js` checks `payload.buyer` for Hotmart.
    // If Braip, it checks `payload.client_name` etc.

    // Let's force it to be "hotmart" compatible if platform is hotmart, or braip if braip.
    let finalPayload = payload;
    if (integration.platform === 'braip') {
        finalPayload = {
            type: 'VENDA_COMPLETA', // Braip event
            client_name: 'Simulated User',
            client_email: 'simulated@test.com',
            client_cel: '5511999998888',
            payment_status: 'paid', // Normalized to approved
            total_value: 10000, // cents
            trans_cod: 'TX-SIM-' + Date.now(),
            product_name: 'Produto Braip'
        };
    } else if (integration.platform === 'kiwify') {
        finalPayload = {
            order_status: 'paid',
            Customer: {
                full_name: 'Simulated User',
                mobile: '5511999998888'
            }
        }
    }

    try {
        const url = `http://localhost:3000/webhook/integration?id=${integration.id}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload)
        });
        console.log('Webhook Response:', res.status, res.statusText);
        console.log(await res.text());

        // DEBUG: Fetch the lead to check workspace_id
        console.log('--- Verifying Lead Data ---');
        await new Promise(r => setTimeout(r, 2000)); // Wait for upsert

        const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('email', 'simulated@test.com')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lead) {
            console.log('Lead Found:', {
                id: lead.id,
                name: lead.name,
                workspace_id: lead.workspace_id,
                column_id: lead.column_id,
                phone: lead.phone
            });

            // Also fetch the workspace name for this ID
            if (lead.workspace_id) {
                const { data: ws } = await supabase
                    .from('workspaces')
                    .select('name, is_default')
                    .eq('id', lead.workspace_id)
                    .single();
                // Fetch columns for this workspace
                const { data: cols } = await supabase
                    .from('kanban_columns')
                    .select('column_id, label, is_default')
                    .eq('workspace_id', lead.workspace_id);

                const result = {
                    lead,
                    workspace: ws,
                    columns: cols
                };
                const fs = require('fs');
                fs.writeFileSync('simulation_results.json', JSON.stringify(result, null, 2));
                console.log('Results written to simulation_results.json');
            } else {
                console.log('WARNING: Lead has NO workspace_id');
            }
        } else {
            console.log('Lead not found in DB!');
        }

    } catch (e) {
        console.error('Webhook Call Failed:', e);
    }
}

simulate();
