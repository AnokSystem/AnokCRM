-- Add description column to kanban_columns table
ALTER TABLE kanban_columns 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Verify it worked (optional select, mainly just for feedback if running interactively)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kanban_columns' AND column_name = 'description';
