-- Disable automatic creation of 'Remarketing' workspace
DROP TRIGGER IF EXISTS trigger_ensure_remarketing_workspace ON auth.users;
DROP FUNCTION IF EXISTS ensure_remarketing_workspace();

-- Update the default column creation logic to ONLY create 'Leads'
-- This applies to ANY workspace created in the future (unless specific logic is added back)
CREATE OR REPLACE FUNCTION create_default_workspace_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Always create 'Leads' column for any new workspace (or restrict to default if preferred)
  -- User requested "somente a categoria Leads"
  
  -- We'll standardize to 'leads' id, 'Leads' label, Blue color
  INSERT INTO kanban_columns (user_id, workspace_id, column_id, label, color, position, is_default)
  VALUES
    (NEW.user_id, NEW.id, 'leads', 'Leads', 'from-blue-500 to-blue-600', 0, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger on workspaces table is active using the updated function
DROP TRIGGER IF EXISTS trigger_create_default_workspace_columns ON workspaces;
CREATE TRIGGER trigger_create_default_workspace_columns
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace_columns();
