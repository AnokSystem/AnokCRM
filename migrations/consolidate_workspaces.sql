-- =====================================================
-- CONSOLIDATE WORKSPACES & DISAMBIGUATE
-- =====================================================
-- This migration fixes the issue where multiple workspaces named "Geral"
-- confused users. It renames the main workspace (Admin's) to "CRM Principal"
-- and others to "Meu Pessoal" to ensure users pick the right one.

DO $$
DECLARE
  admin_workspace_id UUID;
  admin_user_id UUID;
BEGIN
  -- 1. IDENTIFY THE "MAIN" WORKSPACE
  -- We assume the "Main" workspace is the one with the most columns or created first (by admin)
  -- Or explicitly, the one that belongs to 'admin3@admin.com' if we could know ID, but we can't reliably.
  -- Heuristic: The workspace named 'Geral' that has the most columns associated with it.

  SELECT w.id, w.user_id 
  INTO admin_workspace_id, admin_user_id
  FROM workspaces w
  LEFT JOIN kanban_columns kc ON kc.workspace_id = w.id
  WHERE w.name = 'Geral'
  GROUP BY w.id, w.user_id
  ORDER BY COUNT(kc.id) DESC, w.created_at ASC
  LIMIT 1;

  -- 2. RENAME MAIN WORKSPACE
  IF admin_workspace_id IS NOT NULL THEN
    UPDATE workspaces
    SET name = 'CRM Principal (Time)',
        icon = 'users'
    WHERE id = admin_workspace_id;
  END IF;

  -- 3. RENAME OTHER "GERAL" WORKSPACES
  -- This prevents confusion. Any "Geral" that is NOT the main one becomes "Meu Pessoal"
  UPDATE workspaces
  SET name = 'Meu Workspace (Vazio)'
  WHERE name = 'Geral' AND id != admin_workspace_id;

  -- 4. OPTIONAL: Grant Access (Already done by RLS, but ensuring clean slate)
  -- If we wanted to, we could delete the empty ones here, but renaming is safer.

END $$;
