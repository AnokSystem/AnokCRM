-- Migration to fix user creation trigger
-- This ensures the handle_new_user function is robust and handles the profiles table correctly

-- 1. Create or Replace the function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.profiles
  -- Using ON CONFLICT to avoid errors if profile already exists (idempotency)
  INSERT INTO public.profiles (id, full_name, email, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email), -- Fallback to email if name is missing
    new.email,
    'active' -- Default status
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    status = COALESCE(public.profiles.status, 'active'); -- Keep existing status or set to active
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Grant necessary permissions (just in case)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
-- Anon and Authenticated usually don't need Insert on profiles if trigger does it as SECURITY DEFINER
