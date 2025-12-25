-- Setup Database V12 - Instance Quota Control

-- Add max_instances column to user_plans
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS max_instances INTEGER DEFAULT 1;

-- Update existing records to have a default limit
UPDATE public.user_plans SET max_instances = 1 WHERE max_instances IS NULL;

-- Make it NOT NULL after setting defaults
ALTER TABLE public.user_plans ALTER COLUMN max_instances SET NOT NULL;

COMMENT ON COLUMN public.user_plans.max_instances IS 'Maximum number of WhatsApp instances this user can create';
