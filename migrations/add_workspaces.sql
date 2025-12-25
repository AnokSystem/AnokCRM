-- =============================================
-- Migration: Add Workspace System for Lead CRM
-- Description: Creates workspaces table and updates existing tables
-- to support multi-workspace lead management
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CREATE WORKSPACES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'briefcase', -- lucide icon name
  color TEXT DEFAULT 'from-blue-500 to-blue-600', -- tailwind gradient
  is_default BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_default ON workspaces(user_id, is_default);

-- =============================================
-- 2. UPDATE KANBAN_COLUMNS TABLE
-- =============================================

-- Add workspace_id column to kanban_columns
ALTER TABLE kanban_columns 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for workspace filtering
CREATE INDEX IF NOT EXISTS idx_kanban_columns_workspace ON kanban_columns(workspace_id);

-- =============================================
-- 3. UPDATE CHATS TABLE (will become leads)
-- =============================================

-- Add workspace_id to chats (leads)
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create index for workspace filtering
CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats(workspace_id);

-- =============================================
-- 4. CREATE DEFAULT WORKSPACES FOR EXISTING USERS
-- =============================================

-- Insert default workspaces for all existing users
INSERT INTO workspaces (user_id, name, description, icon, color, is_default, position)
SELECT 
  u.id,
  'Geral',
  'Workspace principal para todos os leads',
  'layout-dashboard',
  'from-blue-500 to-blue-600',
  true,
  0
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.user_id = u.id
);

-- Insert Campanhas workspace
INSERT INTO workspaces (user_id, name, description, icon, color, is_default, position)
SELECT 
  u.id,
  'Campanhas',
  'Leads vindos de campanhas de marketing',
  'megaphone',
  'from-purple-500 to-purple-600',
  false,
  1
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.user_id = u.id AND w.name = 'Campanhas'
);

-- Insert Remarketing workspace
INSERT INTO workspaces (user_id, name, description, icon, color, is_default, position)
SELECT 
  u.id,
  'Remarketing',
  'Leads de campanhas de remarketing',
  'repeat',
  'from-orange-500 to-orange-600',
  false,
  2
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.user_id = u.id AND w.name = 'Remarketing'
);

-- =============================================
-- 5. MIGRATE EXISTING DATA
-- =============================================

-- Link existing kanban columns to default workspace
UPDATE kanban_columns kc
SET workspace_id = (
  SELECT w.id 
  FROM workspaces w 
  WHERE w.user_id = kc.user_id 
  AND w.is_default = true 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Link existing chats to default workspace
UPDATE chats c
SET workspace_id = (
  SELECT w.id 
  FROM workspaces w 
  WHERE w.user_id = c.user_id 
  AND w.is_default = true 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- =============================================
-- 6. CREATE DEFAULT COLUMNS FOR NEW WORKSPACES
-- =============================================

-- Function to create default columns for a workspace
CREATE OR REPLACE FUNCTION create_default_workspace_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default columns for non-default workspaces or if it's the first workspace
  IF NEW.name = 'Campanhas' THEN
    INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
    VALUES
      (NEW.user_id, NEW.id, 'novo-lead', 'Novo Lead', 'from-blue-500 to-blue-600', 0, true),
      (NEW.user_id, NEW.id, 'qualificado', 'Qualificado', 'from-green-500 to-green-600', 1, false),
      (NEW.user_id, NEW.id, 'proposta', 'Proposta Enviada', 'from-yellow-500 to-yellow-600', 2, false),
      (NEW.user_id, NEW.id, 'fechado', 'Fechado', 'from-purple-500 to-purple-600', 3, false);
  ELSIF NEW.name = 'Remarketing' THEN
    INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
    VALUES
      (NEW.user_id, NEW.id, 'reengajamento', 'Reengajamento', 'from-orange-500 to-orange-600', 0, true),
      (NEW.user_id, NEW.id, 'aquecimento', 'Aquecimento', 'from-yellow-500 to-yellow-600', 1, false),
      (NEW.user_id, NEW.id, 'conversao', 'Conversão', 'from-green-500 to-green-600', 2, false);
  ELSIF NEW.name = 'Geral' THEN
    -- Use existing default structure
    INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
    VALUES
      (NEW.user_id, NEW.id, 'leads-novos', 'Leads Novos', 'from-blue-500 to-blue-600', 0, true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create default columns
DROP TRIGGER IF EXISTS trigger_create_default_workspace_columns ON workspaces;
CREATE TRIGGER trigger_create_default_workspace_columns
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace_columns();

-- =============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own workspaces
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own workspaces
CREATE POLICY "Users can create own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own workspaces
CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own workspaces (except default)
CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- =============================================
-- 8. HELPER FUNCTIONS
-- =============================================

-- Function to get user's default workspace
CREATE OR REPLACE FUNCTION get_default_workspace(p_user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM workspaces 
  WHERE user_id = p_user_id AND is_default = true 
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- =============================================
-- Migration Complete
-- =============================================

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Workspace migration completed successfully!';
END $$;
