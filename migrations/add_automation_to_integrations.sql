-- Add automation columns to integrations table for remarketing and category assignment
-- This allows automatic enrollment of leads in remarketing sequences and assignment to specific Kanban categories

-- Step 1: Add new columns to integrations table
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS remarketing_sequence_id UUID REFERENCES remarketing_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_category_id TEXT; -- column_id from kanban_columns table

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_remarketing ON integrations(remarketing_sequence_id);
CREATE INDEX IF NOT EXISTS idx_integrations_category ON integrations(default_category_id);

-- Step 3: Add comments for clarity
COMMENT ON COLUMN integrations.remarketing_sequence_id IS 'Auto-enroll leads in this remarketing sequence when webhook triggers';
COMMENT ON COLUMN integrations.default_category_id IS 'Auto-assign leads to this category/column in Kanban board';

-- Step 4: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'integrations' 
AND column_name IN ('remarketing_sequence_id', 'default_category_id')
ORDER BY ordinal_position;
