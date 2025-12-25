-- =====================================================
-- REVERT TO ISOLATED CRM (MULTI-TENANT)
-- =====================================================
-- This migration restores strict Row Level Security (RLS) to ensure
-- each user can ONLY see their own data.
-- It also updates the default column creation logic to include a full set
-- of default categories for new users.

-- 1. RESTORE WORKSPACES RLS
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Drop shared policies
DROP POLICY IF EXISTS "Authenticated users can view all workspaces" ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can delete workspaces" ON workspaces;

-- Drop isolated policies (to avoid conflicts if they already exist)
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;

CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = user_id);


-- 2. RESTORE KANBAN COLUMNS RLS
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- Drop shared policies
DROP POLICY IF EXISTS "Authenticated users can view all columns" ON kanban_columns;
DROP POLICY IF EXISTS "Authenticated users can insert columns" ON kanban_columns;
DROP POLICY IF EXISTS "Authenticated users can update columns" ON kanban_columns;
DROP POLICY IF EXISTS "Authenticated users can delete columns" ON kanban_columns;

-- Drop isolated policies
DROP POLICY IF EXISTS "Users can view own columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can insert own columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can update own columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can delete own columns" ON kanban_columns;

CREATE POLICY "Users can view own columns"
  ON kanban_columns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own columns"
  ON kanban_columns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own columns"
  ON kanban_columns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own columns"
  ON kanban_columns FOR DELETE
  USING (auth.uid() = user_id);


-- 3. RESTORE CHATS/LEADS RLS
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Drop shared policies
DROP POLICY IF EXISTS "Authenticated users can view all chats" ON chats;
DROP POLICY IF EXISTS "Authenticated users can insert chats" ON chats;
DROP POLICY IF EXISTS "Authenticated users can update chats" ON chats;
DROP POLICY IF EXISTS "Authenticated users can delete chats" ON chats;

-- Drop isolated policies
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;

CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);


ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop shared policies
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

-- Drop isolated policies
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can create own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id);


-- =====================================================
-- 4. ENHANCED DEFAULT COLUMNS TRIGGER
-- =====================================================
-- CLEANUP: Remove previously created default columns that are no longer wanted
DELETE FROM kanban_columns 
WHERE column_id IN ('reengajamento', 'aquecimento', 'conversao', 'novo-lead', 'qualificado', 'proposta', 'fechado', 'acabamento', 'pre-impressao', 'producao', 'finalizado');

-- This ensures every new workspace gets the standard set of categories/columns

CREATE OR REPLACE FUNCTION create_default_workspace_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default columns for non-default workspaces or if it's the first workspace
  -- DEFAULT FOR ALL NEW WORKSPACES (Only 'Leads' column as requested)
  INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
  VALUES
    (NEW.user_id, NEW.id, 'leads', 'Leads', 'from-blue-500 to-blue-600', 0, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger (just to be safe)
DROP TRIGGER IF EXISTS trigger_create_default_workspace_columns ON workspaces;
CREATE TRIGGER trigger_create_default_workspace_columns
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace_columns();
