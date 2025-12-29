-- Add limit columns to plans table if they don't exist
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_leads INTEGER DEFAULT 500;

-- Update Plano Essencial (Remove Financeiro, Set Limits)
UPDATE public.plans
SET 
    features = ARRAY['live_chat', 'leads', 'campaigns', 'reports']::text[],
    max_users = 1,
    max_leads = 500
WHERE name ILIKE '%essencial%';

-- Update Plano Performance
UPDATE public.plans
SET 
    max_users = 3,
    max_leads = 2000
WHERE name ILIKE '%performance%';

-- Update Plano Elite
UPDATE public.plans
SET 
    max_users = 10,
    max_leads = NULL -- Unlimited
WHERE name ILIKE '%elite%';

-- Verify
SELECT name, max_users, max_leads, features FROM public.plans;
