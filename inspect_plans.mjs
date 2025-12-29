import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.anok.com.br';
const SUPABASE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJzZWxmaG9zdGVkIiwiaWF0IjoxNzY1ODUwMjU0LCJleHAiOjIwODEyMTAyNTR9.ROwHo2Z6Vu3thmznoW5J78lJwLWNAO99t3XJ_zJ31OA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTable() {
    const { data: columns, error } = await supabase
        .rpc('get_table_columns', { table_name: 'orders' });

    if (error) {
        // Fallback if RPC doesn't exist, try to select one row
        const { data, error: selectError } = await supabase.from('orders').select('*').limit(1);
        if (selectError) {
            console.error('Error fetching orders:', selectError);
        } else {
            if (data.length > 0) {
                console.log('Sample order keys:', Object.keys(data[0]));
                console.log('Sample order:', data[0]);
            } else {
                console.log('No orders found, check setup_database.sql or assume text column.');
            }
        }
        return;
    }
    console.log('Columns:', columns);
}

checkTable();
