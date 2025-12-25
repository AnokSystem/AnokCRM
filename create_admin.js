
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://supabase.anok.com.br';
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwicmVmIjoic2VsZmhvc3RlZCIsImlhdCI6MTc2NTg1MDI1NCwiZXhwIjoyMDgxMjEwMjU0fQ.sNGCdzSWpPvwfN6MEGIssi7ZKDTAMBCzgPFNV9qswcA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
    const email = 'admin3@admin.com';
    const password = 'admin123';
    const fullName = 'Admin User';

    console.log(`Attempting to sign up user: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });

    fs.writeFileSync('output.txt', JSON.stringify({ data: authData, error: authError }, null, 2));

    if (authError) {
        console.error('Error signing up:', authError.message);

        if (authError.message.includes('already registered')) {
            console.log('User already exists. Attempting to sign in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                console.error('Error signing in:', signInError.message);
                fs.appendFileSync('output.txt', '\nSignIn Error: ' + JSON.stringify(signInError));
                return;
            }

            if (signInData.user) {
                console.log('Signed in successfully. User ID:', signInData.user.id);
                await assignRole(signInData.user.id);
            }
        }
        // Check if user was created despite error (common in Supabase with email config issues)
        if (authData?.user) {
            console.log('User object returned despite error. ID:', authData.user.id);
            await assignRole(authData.user.id);
        }
        return;
    }

    if (authData.user) {
        console.log('User created successfully. User ID:', authData.user.id);
        await assignRole(authData.user.id);
    } else {
        console.log('User created, but session is null.');
    }
}

async function assignRole(userId) {
    console.log(`Attempting to assign 'admin' role to user: ${userId}`);

    const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

    if (error) {
        console.error('Error assigning role:', error.message);
        const logMsg = `\nRole Assignment Error: ${JSON.stringify(error)}`;
        fs.appendFileSync('output.txt', logMsg);
    } else {
        console.log('Successfully assigned admin role!');
        fs.appendFileSync('output.txt', '\nSuccessfully assigned admin role!');
    }
}

createAdmin();
