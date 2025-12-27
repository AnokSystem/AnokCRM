
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetching() {
    console.log('Testing data fetching...');

    // 1. Get a user (hack: just get the first one found in profiles or use known ID if possible, but for test scripts we might need to list users, which we can't easily do with anon key unless RLS allows. 
    // actually we can just look at workspaces directly if RLS allows public read, which it usually doesn't. 
    // Let's assume we have full access with service role or just try to list workspaces mostly.)
    // Wait, I don't have service role key in env here easily unless I hardcode or read from file. 
    // Let's try to just use the anon key. If RLS blocks it, that's a finding.

    // Try to find ANY workspace
    const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('*').limit(1);

    if (wsError) {
        console.error('Error fetching workspaces:', wsError);
    } else {
        console.log('Workspaces found:', workspaces?.length);
        if (workspaces && workspaces.length > 0) {
            const wsId = workspaces[0].id;
            console.log('Checking columns for workspace:', wsId);

            const { data: cols, error: colError } = await supabase.from('kanban_columns').select('*').eq('workspace_id', wsId);
            if (colError) console.error('Error fetching columns:', colError);
            else console.log('Columns found:', cols?.length, cols);
        }
    }

    // Check remarketing sequences
    const { data: seqs, error: seqError } = await supabase.from('remarketing_sequences').select('*').limit(5);
    if (seqError) console.error('Error fetching sequences:', seqError);
    else console.log('Sequences found:', seqs?.length);

}

testFetching();
