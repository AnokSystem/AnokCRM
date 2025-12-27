-- Add max_instances column to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS max_instances INTEGER DEFAULT 1;

-- Set default values based on plan name (optional - adjust as needed)
UPDATE plans SET max_instances = 1 WHERE name ILIKE '%essencial%' OR name ILIKE '%basic%';
UPDATE plans SET max_instances = 3 WHERE name ILIKE '%performance%' OR name ILIKE '%pro%';
UPDATE plans SET max_instances = 10 WHERE name ILIKE '%elite%' OR name ILIKE '%premium%';

-- Verify the changes
SELECT id, name, price, max_instances FROM plans ORDER BY price;
