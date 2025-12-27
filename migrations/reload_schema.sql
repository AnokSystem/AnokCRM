-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload config';

-- Verify columns exist
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'user_plans'
    AND column_name IN ('subscription_end_date', 'status', 'subscription_start_date');
