const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'webhook.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the problematic section
const oldSection = `        if (createError) {
            if (createError.message.includes('registered') || createError.status === 422) {
                console.log(\`[n8n] User \${email} already exists. Updating plan...\`);
                // User exists, fetch ID to update public table
                const { data: existingUser } = await supabase.auth.admin.listUsers(); 
                // listUsers is inefficient for looking up one, but admin.getUserByEmail might not be available in all versions.
                // Better: query public.users logic below will handle the ID retrieval implicitly if we just upsert/update there.
                
                // Let's get the ID from public.users to be safe
                const { data: publicUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email)
                    .single();
                
                if (publicUser) userId = publicUser.id;
            } else {
                console.error('[n8n] Failed to create auth user:', createError);
                return res.status(500).json({ error: 'Failed to create account', details: createError });
            }
        } else {
            console.log(\`[n8n] New User Created: \${newUser.user.id}\`);
            userId = newUser.user.id;
        }`;

const newSection = `        
        if (createUserResponse.ok) {
            userId = result.id;
            userCreated = true;
            console.log(\`[n8n] ✅ User created: \${userId}\`);
        } else if (result.code === '23505' || (result.msg && result.msg.includes('already'))) {
            console.log('[n8n] User exists, getting ID...');
            const { data: pu } = await supabase.from('users').select('id').eq('email', email).single();
            if (pu) userId = pu.id;
            else return res.status(500).json({ error: 'User exists but not in DB' });
        } else {
            console.error('[n8n] ❌ Failed:', result);
            return res.status(500).json({ error: 'Create failed', details: result });
        }`;

// Try both \r\n and \n versions
content = content.replace(oldSection.replace(/\n/g, '\r\n'), newSection.replace(/\n/g, '\r\n'));
content = content.replace(oldSection, newSection);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully!');
