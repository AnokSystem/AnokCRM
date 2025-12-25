-- =====================================================
-- ENSURE REMARKETING WORKSPACE & DEFAULTS
-- =====================================================
-- 1. Update the column creation trigger to restore Remarketing columns
--    BUT ONLY for the 'Remarketing' workspace.
-- 2. Create a trigger to auto-create 'Remarketing' workspace for new users.
-- 3. Backfill 'Remarketing' workspace for existing users.
-- 4. Backfill columns for existing users who already have the workspace but missing columns.

-- 1. UPDATE DEFAULT COLUMN LOGIC
CREATE OR REPLACE FUNCTION create_default_workspace_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- CHECK if workspace is 'Remarketing'
  IF NEW.name = 'Remarketing' THEN
    INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
    VALUES
      (NEW.user_id, NEW.id, 'reengajamento', 'Reengajamento', 'from-orange-500 to-orange-600', 0, true),
      (NEW.user_id, NEW.id, 'aquecimento', 'Aquecimento', 'from-yellow-500 to-yellow-600', 1, false),
      (NEW.user_id, NEW.id, 'conversao', 'Conversão', 'from-green-500 to-green-600', 2, false);
  ELSE
    -- Default for 'Geral' or any other custom workspace: ONLY 'Leads'
    INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
    VALUES
      (NEW.user_id, NEW.id, 'leads', 'Leads', 'from-blue-500 to-blue-600', 0, true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ENSURE TRIGGER EXISTS (It likely does, but ensuring it uses the new function)
DROP TRIGGER IF EXISTS trigger_create_default_workspace_columns ON workspaces;
CREATE TRIGGER trigger_create_default_workspace_columns
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace_columns();


-- 3. FUNCTION TO CREATE REMARKETING WORKSPACE
CREATE OR REPLACE FUNCTION ensure_remarketing_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert Remarketing Workspace if it doesn't exist (Triggered on User Create)
  -- Note: The 'workspaces' INSERT will trigger the column creation above.
  INSERT INTO workspaces (user_id, name, description, icon, color, is_default, position)
  VALUES (
    NEW.id, 
    'Remarketing', 
    'Leads de campanhas de remarketing', 
    'repeat', 
    'from-orange-500 to-orange-600', 
    false, 
    1
  )
  ON CONFLICT (user_id, name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER ON AUTH.USERS (New User Signup)
DROP TRIGGER IF EXISTS trigger_ensure_remarketing_workspace ON auth.users;
CREATE TRIGGER trigger_ensure_remarketing_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_remarketing_workspace();


-- 5. BACKFILL WORKSPACES FOR EXISTING USERS
-- Loop through all users and create Remarketing workspace if missing
DO $$
DECLARE 
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    INSERT INTO workspaces (user_id, name, description, icon, color, is_default, position)
    VALUES (
      user_rec.id, 
      'Remarketing', 
      'Leads de campanhas de remarketing', 
      'repeat', 
      'from-orange-500 to-orange-600', 
      false, 
      1
    )
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END $$;


-- 6. BACKFILL COLUMNS FOR EXISTING REMARKETING WORKSPACES
-- This handles users who already have 'Remarketing' workspace but might have had columns deleted.

-- Reengajamento
INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
SELECT w.user_id, w.id, 'reengajamento', 'Reengajamento', 'from-orange-500 to-orange-600', 0, true
FROM workspaces w
WHERE w.name = 'Remarketing'
AND NOT EXISTS (SELECT 1 FROM kanban_columns kc WHERE kc.workspace_id = w.id AND kc.column_id = 'reengajamento');

-- Aquecimento
INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
SELECT w.user_id, w.id, 'aquecimento', 'Aquecimento', 'from-yellow-500 to-yellow-600', 1, false
FROM workspaces w
WHERE w.name = 'Remarketing'
AND NOT EXISTS (SELECT 1 FROM kanban_columns kc WHERE kc.workspace_id = w.id AND kc.column_id = 'aquecimento');

-- Conversão
INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
SELECT w.user_id, w.id, 'conversao', 'Conversão', 'from-green-500 to-green-600', 2, false
FROM workspaces w
WHERE w.name = 'Remarketing'
AND NOT EXISTS (SELECT 1 FROM kanban_columns kc WHERE kc.workspace_id = w.id AND kc.column_id = 'conversao');

-- Summary:
-- New users -> Trigger ensures workspace -> Default logic ensures columns
-- Existing users w/o workspace -> Backfill creates workspace -> Trigger ensures columns
-- Existing users w/ workspace w/o columns -> Column Backfill ensures columns
