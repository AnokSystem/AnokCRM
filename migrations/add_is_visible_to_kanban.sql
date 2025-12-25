-- Add is_visible column to kanban_columns table
ALTER TABLE kanban_columns 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
