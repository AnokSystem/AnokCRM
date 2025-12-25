-- =====================================================
-- SHARE CRM DATA (OPEN RLS)
-- =====================================================
-- This migration updates RLS policies to allow all authenticated users
-- to view and manage leads and kanban columns, effectively creating
-- a shared CRM environment for the team.

-- 1. WORKSPACES
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;

-- Allow all authenticated users to view all workspaces (Shared View)
CREATE POLICY "Authenticated users can view all workspaces"
  ON workspaces FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow formatting/admin tasks on workspaces
CREATE POLICY "Authenticated users can insert workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update workspaces"
  ON workspaces FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete workspaces"
  ON workspaces FOR DELETE
  USING (auth.role() = 'authenticated');


-- 2. KANBAN COLUMNS
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- Drop old strict policies if they exist (assuming default RLS was applied implicitly or explicitly)
-- (We will just create permissive policies which act as "OR" if multiple exist, but best to clean up)
-- Since we don't know exact names of previous policies on kanban_columns (they weren't in add_workspaces.sql),
-- we will drop generic named ones if they exist or just rely on creating new broad ones.

CREATE POLICY "Authenticated users can view all columns"
  ON kanban_columns FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert columns"
  ON kanban_columns FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update columns"
  ON kanban_columns FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete columns"
  ON kanban_columns FOR DELETE
  USING (auth.role() = 'authenticated');


-- 3. CHATS (OLD LEADS / WHATSAPP)
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;

-- Shared Chats Access
CREATE POLICY "Authenticated users can view all chats"
  ON chats FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert chats"
  ON chats FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update chats"
  ON chats FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete chats"
  ON chats FOR DELETE
  USING (auth.role() = 'authenticated');


-- 4. LEADS (NEW CRM LEADS)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can create own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

-- Shared Leads Access
CREATE POLICY "Authenticated users can view all leads"
  ON leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE
  USING (auth.role() = 'authenticated');
