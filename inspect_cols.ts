
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY; // Anon key usually can't inspect schema easily unless exposed. 
// But we can try to insert and see error, or select limit 0.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking columns by attempting trivial insert...");
    // We can't query information_schema with anon key usually.
    // Try to select single row and log keys.

    const { data, error } = await supabase.from('leads').select('*').limit(1);

    if (error) {
        console.error("Error selecting:", error);
    } else if (data && data.length > 0) {
        console.log("Found row keys:", Object.keys(data[0]));
    } else {
        console.log("No data found, can't infer keys easily from select.");
    }
}

checkColumns();
