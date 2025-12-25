
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.anok.com.br';
// Using ANON key to simulate client-side access
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAccess() {
    const email = 'admin3@admin.com';
    const password = 'admin123';

    console.log('1. Signing in...');
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('Login failed:', loginError.message);
        return;
    }

    if (!user) {
        console.error('No user returned.');
        return;
    }

    console.log('Logged in as:', user.id);

    console.log('2. Attempting to read user rules...');
    // This matches the query in AuthContext.tsx
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

    if (error) {
        console.error('Query FAILED:', error);
        console.error('Message:', error.message);
        console.error('Detail:', error.details);
        console.error('Hint:', error.hint);
    } else {
        console.log('Query SUCCESS. Result:', data);
        if (!data) {
            console.log('WARNING: Query returned no data (null). The user might not have the role, or RLS is filtering it out silently.');
        } else {
            console.log('CONFIRMED: Admin role is readable!');
        }
    }
}

verifyAccess();
