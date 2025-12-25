-- Add instance_name to integrations table

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'instance_name') THEN 
        ALTER TABLE integrations ADD COLUMN instance_name TEXT; 
    END IF; 
END $$;
