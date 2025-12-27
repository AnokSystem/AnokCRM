import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, 'server', 'webhook.js');
let content = readFileSync(filePath, 'utf8');

console.log('Starting fix...');

// Use regex to find and replace - more flexible
content = content.replace(
    /if \(createError\) \{[\s\S]*?userId = newUser\.user\.id;\s*\}/,
    `if (createUserResponse.ok) {
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
        }`
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed!');
