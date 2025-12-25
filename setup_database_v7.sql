-- Setup Database V7 - Fix Profiles RLS for Admin Panel

-- The issue: Admins cannot see the user list because RLS policies on profiles are too restrictive
-- This script ensures both regular users AND admins can properly read profiles

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 2. Enable RLS (in case it wasn't enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for regular users
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 4. Create policies for admins (using the is_admin function)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ( public.is_admin() );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING ( public.is_admin() );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING ( public.is_admin() );

-- Note: Multiple SELECT policies work as OR - so admins can see all profiles, users can see their own
