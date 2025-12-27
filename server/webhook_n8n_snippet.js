// [NEW] n8n Integration for Access Provisioning
// Endpoint to receive payment confirmation from n8n
app.post('/webhook/n8n/access', async (req, res) => {
    const { secret, email, plan, phone, name } = req.body;

    // 1. Verify Secret
    const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || 'anok_secret_key_123';
    if (secret !== N8N_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Invalid Secret' });
    }

    if (!email || !plan) {
        return res.status(400).json({ error: 'Missing email or plan' });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '12345678';
    const displayName = name || email.split('@')[0];

    console.log(`[n8n] Provisioning access for ${email} - Plan: ${plan}`);

    try {
        let userId = null;
        let userCreated = false;

        // 2. Create user via direct Supabase Admin API
        const createUserResponse = await fetch(`https://supabase.anok.com.br/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                email: email,
                password: cleanPhone,
                email_confirm: true,
                user_metadata: { name: displayName, phone: phone }
            })
        });

        const createUserData = await createUserResponse.json();

        if (createUserResponse.ok) {
            userId = createUserData.id;
            userCreated = true;
            console.log(`[n8n] New User Created: ${userId}`);
        } else if (createUserData.code === 'user_already_exists' || (createUserData.msg && createUserData.msg.includes('already'))) {
            console.log(`[n8n] User exists, fetching ID...`);

            const { data: publicUser } = await supabase.from('users').select('id').eq('email', email).single();
            if (publicUser) {
                userId = publicUser.id;
            } else {
                return res.status(500).json({ error: 'User exists but not found in database' });
            }
        } else {
            console.error('[n8n] Create user failed:', createUserData);
            return res.status(500).json({ error: 'Failed to create account', details: createUserData });
        }

        if (!userId) {
            return res.status(500).json({ error: 'Could not resolve User ID' });
        }

        // 3. Update/Create in public.users
        const { error: updateError } = await supabase.from('users').upsert({
            id: userId,
            email: email,
            name: displayName,
            phone: phone,
            subscription_status: 'active',
            plan: plan,
            updated_at: new Date()
        }, { onConflict: 'id' });

        if (updateError) {
            console.error(`[n8n] Update failed:`, updateError);
            return res.status(500).json({ error: 'Database update failed' });
        }

        console.log(`[n8n] Success! Access granted for ${email}`);
        res.json({
            success: true,
            message: 'Access granted',
            user_created: userCreated,
            credentials: { login: email, password: cleanPhone }
        });

    } catch (err) {
        console.error('[n8n] Unexpected error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});
