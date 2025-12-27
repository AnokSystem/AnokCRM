-- =====================================================
-- FIX RLS FOR PROFILES TABLE
-- =====================================================
-- Prevents "statement timeout" due to infinite recursion in policies.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Drop potentially problematic existing policies
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "can_view_own_profile_data" ON public.profiles;
DROP POLICY IF EXISTS "can_update_own_profile_data" ON public.profiles;

-- 2. Allow ALL authenticated users to READ profiles
-- (Needed so users can see names of other users in the system, e.g. "Assigned to X")
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow users to UDPATE ONLY their OWN profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 4. Allow users to INSERT (fallback)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
