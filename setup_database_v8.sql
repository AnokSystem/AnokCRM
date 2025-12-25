-- Setup Database V8 - Fix is_admin() Function

-- The issue: The is_admin() function returns false even when the user has the admin role
-- Root cause: The function might not be properly configured as SECURITY DEFINER or has wrong ownership

-- 1. Recreate the function with proper settings (using CREATE OR REPLACE to avoid dropping dependencies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 3. Ensure the function owner has proper access (run as superuser/owner)
-- The function will execute with the privileges of its creator, bypassing RLS

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current user has the admin role. Runs with elevated privileges to bypass RLS.';
