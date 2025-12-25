-- Setup Database V13 - User Profile Fields

-- Add additional profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.phone IS 'User contact phone number';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL or base64 of user profile picture';
