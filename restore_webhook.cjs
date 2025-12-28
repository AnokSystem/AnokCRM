const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'webhook.js');
let content = fs.readFileSync(filePath, 'utf8');

// The new correct code for the endpoint
const newEndpointCode = `
// [NEW] n8n Integration for Access Provisioning
// Endpoint to receive payment confirmation from n8n
app.post('/webhook/n8n/access', async (req, res) => {
    const { secret, email, plan, phone, name } = req.body;
    
    // Trim plan name to avoid whitespace issues
    const cleanPlanName = plan ? plan.trim() : '';

    // 1. Verify Secret
    const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || 'anok_secret_key_123';
    if (secret !== N8N_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Invalid Secret' });
    }

    if (!email || !plan) {
        return res.status(400).json({ error: 'Missing email or plan' });
    }

    const cleanPhone = phone ? phone.replace(/\\D/g, '') : '12345678'; // Fallback password
    const displayName = name || email.split('@')[0];

    console.log(\`[n8n] 🚀 Request: \${email} | Plan: "\${plan}" | Clean Plan: "\${cleanPlanName}"\`);
    console.log(\`[n8n] Provisioning access for \${email} - Plan: \${plan}\`);

    try {
        let userId = null;
        let userCreated = false;

        // 2. Create user via HTTP API
        const createUserResponse = await fetch(\`\${SUPABASE_URL}/auth/v1/admin/users\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': \`Bearer \${SUPABASE_KEY}\`
            },
            body: JSON.stringify({
                email: email,
                password: cleanPhone,
                email_confirm: true,
                user_metadata: { name: displayName, phone: phone }
            })
        });

        const result = await createUserResponse.json();

        if (createUserResponse.ok) {
            userId = result.id;
            userCreated = true;
            console.log(\`[n8n] ✅ User created: \${userId}\`);
        } else if (result.code === '23505' || (result.msg && result.msg.includes('already'))) {
            console.log('[n8n] User exists in Auth, extracting ID from response...');
            const getUserResponse = await fetch(\`\${SUPABASE_URL}/auth/v1/admin/users\`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': \`Bearer \${SUPABASE_KEY}\`
                }
            });

            const usersData = await getUserResponse.json();
            const existingUser = usersData.users?.find(u => u.email === email);

            if (existingUser && existingUser.id) {
                userId = existingUser.id;
                console.log(\`[n8n] Found user ID: \${userId}\`);
            } else {
                return res.status(500).json({ error: 'User exists but could not retrieve ID' });
            }
        } else {
            console.error('[n8n] ❌ Failed:', result);
            return res.status(500).json({ error: 'Create failed', details: result });
        }

        if (!userId) {
            return res.status(500).json({ error: 'Could not resolve User ID' });
        }

        // 3. Lookup plan by name
        console.log(\`[n8n] Looking up plan '\${cleanPlanName}' in database...\`);

        const { data: plansFound, error: planError } = await supabase
            .from('plans')
            .select('id, name, max_instances, features')
            .ilike('name', \`%\${cleanPlanName}%\`);

        let planData = null;

        if (!planError && plansFound && plansFound.length > 0) {
            planData = plansFound.find(p => p.name.toLowerCase() === cleanPlanName.toLowerCase());
            if (!planData) planData = plansFound[0];
        }

        if (planData) {
             console.log(\`[n8n] ✅ Plan Found: "\${planData.name}" (ID: \${planData.id})\`);
             console.log(\`[n8n] 📋 Plan Features:\`, planData.features);
        } else {
             console.log(\`[n8n] ❌ Plan NOT found for query: \${cleanPlanName}\`);
        }

        if (!planData) {
            console.error('[n8n] Plan not found:', cleanPlanName);
            return res.status(400).json({ error: \`Plan '\${cleanPlanName}' not found in database\` });
        }

        const maxInstances = planData.max_instances || (cleanPlanName.toLowerCase().includes('elite') ? 10 : (cleanPlanName.toLowerCase().includes('performance') ? 3 : 1));

        // Update Auth Metadata
        const updateMetaResponse = await fetch(\`\${SUPABASE_URL}/auth/v1/admin/users/\${userId}\`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': \`Bearer \${SUPABASE_KEY}\`
            },
            body: JSON.stringify({
                user_metadata: {
                    name: displayName,
                    phone: phone,
                    plan: cleanPlanName,
                    subscription_status: 'active'
                }
            })
        });

        // 3. Update Profile Data
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: displayName,
                phone: phone
            });

        // 4. Update user_plans
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30);

        const { error: upErr } = await supabase.from('user_plans').upsert({
            user_id: userId,
            plan_id: planData.id,
            max_instances: maxInstances,
            active_features: planData.features || [],
            subscription_start_date: now.toISOString(),
            subscription_end_date: endDate.toISOString(),
            status: 'active'
        }, { onConflict: 'user_id' });

        if (upErr) {
            console.error('[n8n] user_plans update failed:', upErr);
        } else {
            console.log('[n8n] ✅ Plan assigned successfully: ' + planData.id);
            console.log(\`[n8n] 💾 Features Saved:\`, planData.features || []);
        }

        console.log(\`[n8n] ✅ Success for \${email}\`);
        res.json({ 
            success: true, 
            message: 'Access granted', 
            user_created: userCreated, 
            assigned_plan: planData.name,
            assigned_features: planData.features || [],
            credentials: { login: email, password: cleanPhone } 
        });

    } catch (err) {
        console.error('[n8n] ERROR:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});
`;

// Identify the start and end of the corrupted block
// Start at the specific route definition
const startMarker = "app.post('/webhook/n8n/access', async (req, res) => {";
// End at the start of the next section
const endMarker = "/* ==========================================================================";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find code block markers.');
    console.log('Start found:', startIndex);
    console.log('End found:', endIndex);
    process.exit(1);
}

// Replace the content
const newContent = content.substring(0, startIndex) + newEndpointCode.trim() + '\n\n' + content.substring(endIndex);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully restored webhook.js');
