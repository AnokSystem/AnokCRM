-- Add status column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing users to active
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- Add check constraint for status
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE profiles 
ADD CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'suspended'));
