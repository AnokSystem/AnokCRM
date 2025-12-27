import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Setup
const SUPABASE_URL = 'https://supabase.anok.com.br';
// Using SERVICE_ROLE_KEY provided by user to bypass RLS
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('Webhook Server Starting...');
console.log('Connected to Supabase (Service Role Mode):', SUPABASE_URL);

// Evolution API Webhook Endpoint
app.post('/webhook/evolution', async (req, res) => {
    try {
        const data = req.body;
        const type = data.type;

        if (type === 'MESSAGES_UPSERT') {
            const message = data.data;
            const remoteJid = message.key.remoteJid;
            const fromMe = message.key.fromMe;
            const content = message.message?.conversation || message.message?.extendedTextMessage?.text || '[Mídia]';
            const timestamp = new Date(parseInt(message.messageTimestamp) * 1000).toISOString();
            const instanceName = data.instance;

            const normalizedJid = remoteJid.includes('@g.us') ? remoteJid : `${remoteJid.replace(/\D/g, '')}@s.whatsapp.net`;

            const { data: instanceData } = await supabase
                .from('whatsapp_instances')
                .select('user_id')
                .eq('name', instanceName)
                .single();

            if (instanceData?.user_id) {
                await supabase.from('chats').upsert({
                    user_id: instanceData.user_id,
                    instance_name: instanceName,
                    remote_jid: normalizedJid,
                    last_message_content: content.substring(0, 50),
                    last_message_time: timestamp,
                    unread_count: fromMe ? 0 : undefined
                }, { onConflict: 'user_id,instance_name,remote_jid' });

                await supabase.from('messages').upsert({
                    user_id: instanceData.user_id,
                    remote_jid: normalizedJid,
                    message_id: message.key.id,
                    from_me: fromMe,
                    content: content,
                    timestamp: timestamp,
                    status: fromMe ? 'sent' : 'received'
                }, { onConflict: 'user_id,message_id,remote_jid' });
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Error');
    }
});

// [NEW] Sales Integration Endpoint
app.post('/webhook/integration', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).send('Missing integration ID');

        console.log(`[Sales Webhook] Processing: ${id}`);
        const payload = req.body;

        // 1. Fetch Integration
        // Service Role can query ALL tables, no RPC needed
        const { data: integration, error: intError } = await supabase
            .from('integrations')
            .select('*')
            .eq('id', id)
            .single();

        if (intError || !integration) {
            console.error('Integration not found:', intError);
            return res.status(404).send({ error: 'Integration not found', details: intError });
        }

        if (!integration.is_active) {
            return res.status(403).send('Integration is inactive');
        }

        // 2. Normalize Data
        let leadData = {
            name: '',
            email: '',
            phone: '',
            cpf: null,
            cnpj: null,
            is_person: true,
            birth_date: null,
            address: {
                zip: null,
                street: null,
                number: null,
                district: null,
                city: null,
                state: null
            },
            custom_fields: {}
        };

        if (integration.platform === 'hotmart') {
            const buyer = payload.buyer || {};
            const address = buyer.address || payload.address || {};

            leadData.name = buyer.name || payload.first_name || 'Cliente Hotmart';
            leadData.email = buyer.email || payload.email;
            leadData.phone = buyer.checkout_phone || payload.phone_checkout_number;

            // Document
            const doc = buyer.document || '';
            const cleanDoc = doc.replace(/\D/g, '');
            if (cleanDoc.length > 11) {
                leadData.is_person = false;
                leadData.cnpj = cleanDoc;
            } else {
                leadData.is_person = true;
                leadData.cpf = cleanDoc;
            }

            // Address
            leadData.address = {
                zip: address.zipcode || address.zip_code,
                street: address.address,
                number: address.number,
                district: address.neighborhood,
                city: address.city,
                state: address.state
            };

            leadData.custom_fields = {
                product: payload.product?.name,
                price: payload.price?.value,
                status: payload.status,
                transaction: payload.transaction
            };

        } else if (integration.platform === 'kiwify') {
            const customer = payload.Customer || payload.customer || {};
            const address = customer.Address || customer.address || {};

            leadData.name = customer.full_name || customer.name;
            leadData.email = customer.email;
            leadData.phone = customer.mobile;

            // Document
            if (customer.CNPJ) {
                leadData.is_person = false;
                leadData.cnpj = customer.CNPJ.replace(/\D/g, '');
            } else {
                leadData.is_person = true;
                leadData.cpf = (customer.CPF || customer.cpf || '').replace(/\D/g, '');
            }

            // Address
            leadData.address = {
                zip: address.ZipCode || address.zipcode,
                street: address.Street || address.street,
                number: address.Number || address.number,
                district: address.Neighborhood || address.neighborhood,
                city: address.City || address.city,
                state: address.State || address.state
            };

            leadData.custom_fields = {
                product: payload.Product?.name,
                status: payload.order_status
            };

        } else if (integration.platform === 'braip') {
            leadData.name = payload.client_name;
            leadData.email = payload.client_email;
            leadData.phone = payload.client_cel;

            // Document
            if (payload.client_cnpj) {
                leadData.is_person = false;
                leadData.cnpj = payload.client_cnpj.replace(/\D/g, '');
            } else {
                leadData.is_person = true;
                leadData.cpf = (payload.client_cpf || '').replace(/\D/g, '');
            }

            // Address
            leadData.address = {
                zip: payload.client_zip_code,
                street: payload.client_address,
                number: payload.client_number,
                district: payload.client_neighborhood || payload.client_district,
                city: payload.client_city,
                state: payload.client_state
            };

            leadData.custom_fields = {
                product: payload.product_name,
                status: payload.status_name,
                value: (payload.value_cents || 0) / 100
            };
        }

        if (!leadData.phone) {
            console.warn('Skipping: No Phone in payload', payload);
            return res.status(200).send('Skipped: No Phone');
        }

        const cleanPhone = leadData.phone.replace(/\D/g, '');

        // 3. Get Default Workspace and Column

        // Fetch all workspaces for the user to be sure we find one (Robust Fix)
        const { data: userWorkspaces } = await supabase
            .from('workspaces')
            .select('id, name, is_default')
            .eq('user_id', integration.user_id)
            .order('created_at', { ascending: true });

        // Logic: Default -> Name="Geral" -> First Available
        const workspace = userWorkspaces?.find(w => w.is_default)
            || userWorkspaces?.find(w => w.name === 'Geral')
            || userWorkspaces?.[0];

        const workspaceId = workspace?.id;

        // Then get the default column for this workspace
        let columnId = 'leads-novos'; // Global fallback

        if (workspaceId) {
            // Fetch columns for this specific workspace
            const { data: workspaceColumns } = await supabase
                .from('kanban_columns')
                .select('column_id, is_default, position, label')
                .eq('workspace_id', workspaceId)
                .order('position', { ascending: true });

            // Logic: Label="Leads" -> ID="leads"/"leads-novos" -> Default -> First Available
            const targetColumn = workspaceColumns?.find(c => c.label?.toLowerCase() === 'leads')
                || workspaceColumns?.find(c => c.column_id === 'leads')
                || workspaceColumns?.find(c => c.column_id === 'leads-novos')
                || workspaceColumns?.find(c => c.is_default)
                || workspaceColumns?.[0];

            if (targetColumn) {
                columnId = targetColumn.column_id;
            }
        }

        // 4. Upsert Lead
        // Service Role requires NO RPC. It works natively.
        const { data: leads, error: upsertError } = await supabase.from('leads').upsert({
            user_id: integration.user_id,
            name: leadData.name || 'Lead Integracao',
            phone: cleanPhone,
            email: leadData.email,
            column_id: columnId, // 🆕 Assign to default column for Kanban visibility
            workspace_id: workspaceId, // 🆕 Assign to workspace for Kanban filtering

            // Profile & Document
            is_person: leadData.is_person,
            cpf: leadData.cpf,
            cnpj: leadData.cnpj,

            // Address
            address_zip: leadData.address.zip,
            address_street: leadData.address.street,
            address_number: leadData.address.number,
            address_district: leadData.address.district,
            address_city: leadData.address.city,
            address_state: leadData.address.state,

            source: integration.platform,
            custom_fields: leadData.custom_fields,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,phone' })
            .select();

        if (upsertError) {
            console.error('Error saving lead (Service Role):', upsertError);
            return res.status(500).send({ error: 'Error saving lead', details: upsertError });
        }

        const lead = leads?.[0];

        // 4. Register Sale (Order) if Applicable
        // We consider a sale if there is a product and value
        if (lead && lead.id) {
            const status = leadData.custom_fields.status || '';
            const isPurchase = status.toUpperCase().includes('APPROVED') || status.toUpperCase().includes('COMPLETE') || status.toUpperCase().includes('PAID');

            // Extract Value (Handle cents from Braip vs float from others)
            let rawValue = leadData.custom_fields.value || leadData.custom_fields.price || 0;
            let amount = parseFloat(rawValue);

            // If Braip (usually in cents if field is value_cents), logical check:
            // But we mapped logic above: Braip -> value: payload.value_cents
            // If value is integer and platform is Braip, likely cents.
            if (integration.platform === 'braip' && Number.isInteger(amount)) {
                amount = amount / 100;
            }

            // Create Order if it's a purchase event
            if (isPurchase && amount > 0) {
                const orderTitle = leadData.custom_fields.product || `Venda ${integration.platform}`;

                await supabase.from('lead_orders').insert({
                    lead_id: lead.id,
                    user_id: integration.user_id,
                    title: orderTitle,
                    description: `Venda automática via integração ${integration.name}. Transação: ${leadData.custom_fields.transaction || 'N/A'}`,
                    amount: amount,
                    status: 'paid',
                    items: [{
                        product_name: orderTitle,
                        quantity: 1,
                        unit_price: amount
                    }]
                });
                console.log(`[Sales Webhook] Order created for lead ${lead.id}`);
            } // End Order Creation Logic


            // 5. Trigger Automated Flow (n8n)
            // MOVED: Runs regardless of Order Creation success (as long as Lead exists)
            const flowDebug = { flow_id: integration.flow_id, is_active: integration.is_active, triggered: false };
            console.log(`[DEBUG] Flow Check -> flow_id: ${integration.flow_id}, Active: ${integration.is_active}`);

            if (integration.flow_id) {
                try {
                    console.log(`[Flow] Triggering Flow ${integration.flow_id} for Lead ${lead.id}`);
                    // URL oficial do Workflow de Envio (API Automação Anok)
                    const N8N_WEBHOOK_URL = 'https://api-automacao.anok.com.br/webhook/91726a6f-834b-47c9-9e27-dd830de416bc';

                    const n8nPayload = {
                        phone: cleanPhone,
                        name: lead.name,
                        email: lead.email, // Email field for {{email}} variable
                        first_name: lead.name.split(' ')[0], // Alias for friendly greeting
                        lead_name: lead.name,
                        flow_id: integration.flow_id,
                        instance: integration.instance_name || 'default',
                        instance_name: integration.instance_name || 'default',
                        step: 1,
                        current_step_order: 1,
                        lead_id: lead.id,
                        custom_fields: leadData.custom_fields,
                        // Expand params with all friendly variables
                        params: {
                            ...leadData.custom_fields,
                            first_name: lead.name.split(' ')[0],
                            name: lead.name,
                            phone: cleanPhone,
                            email: lead.email, // Email in params too
                            product_name: leadData.custom_fields.product,
                            product_value: leadData.custom_fields.value,
                            checkout_url: leadData.custom_fields.checkout_url || '' // Might need mapping in normalization
                        }
                    };
                    console.log('[DEBUG] Sending to n8n:', JSON.stringify(n8nPayload));

                    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(n8nPayload)
                    });

                    const text = await n8nRes.text();
                    flowDebug.triggered = true;
                    flowDebug.n8n_status = n8nRes.status;
                    flowDebug.n8n_response = text;
                    flowDebug.payload = n8nPayload;

                    console.log('[Flow] n8n Response:', n8nRes.status, text);

                } catch (flowError) {
                    console.error('Error triggering flow:', flowError);
                    flowDebug.error = flowError.message;
                }
            } else {
                console.log('[DEBUG] No flow_id linked to this integration.');
                flowDebug.reason = 'No flow_id linked';
            }

            // Return detailed info for debugging (Simulation Script will print this)
            return res.status(200).json({ status: 'OK', flow_debug: flowDebug });

        } // This closes the `if (lead && lead.id)` block

    } catch (error) {
        console.error('Integration Server Error:', error);
        res.status(500).send('Internal Error');
    }
});

// [NEW] n8n Integration for Access Provisioning
// Endpoint to receive payment confirmation from n8n
app.post('/webhook/n8n/access', async (req, res) => {
    const { secret, email, plan } = req.body;

    // 1. Verify Secret
    const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || 'anok_secret_key_123';
    if (secret !== N8N_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Invalid Secret' });
    }

    if (!email || !plan) {
        return res.status(400).json({ error: 'Missing email or plan' });
    }

    console.log(`[n8n] Provisioning access for ${email} - Plan: ${plan}`);

    try {
        // 2. Find User by Email
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (userError || !user) {
            console.error(`[n8n] User not found: ${email}`);
            return res.status(404).json({ error: 'User not found in CRM' });
        }

        // 3. Update User Subscription
        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_status: 'active',
                plan: plan,
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error(`[n8n] Failed to update user ${user.id}:`, updateError);
            return res.status(500).json({ error: 'Database update failed' });
        }

        console.log(`[n8n] Success! Access granted for ${email}`);
        res.json({ success: true, message: 'Access granted' });

    } catch (err) {
        console.error('[n8n] Unexpected error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
});
