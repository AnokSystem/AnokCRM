-- Fix ensure_remarketing_workspace to run with SECURITY DEFINER
-- This ensures it bypasses RLS policies on workspaces/kanban_columns during user creation

CREATE OR REPLACE FUNCTION ensure_remarketing_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert Remarketing Workspace if it doesn't exist
  -- Runs as SECURITY DEFINER to bypass RLS
  INSERT INTO public.workspaces (user_id, name, description, icon, color, is_default, position)
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
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation transaction
  RAISE WARNING 'Error creating remarketing workspace for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
