SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation as event,
    action_statement as definition
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'profiles')
ORDER BY event_object_table, trigger_name;
