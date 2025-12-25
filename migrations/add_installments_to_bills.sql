-- Migration to add installments tracking to bills table

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_installment INTEGER DEFAULT 1;

-- Add check constraint to ensure current_installment is valid
ALTER TABLE public.bills
ADD CONSTRAINT check_installments 
CHECK (
  (total_installments IS NULL) OR 
  (current_installment > 0 AND current_installment <= total_installments)
);

-- Comments
COMMENT ON COLUMN bills.total_installments IS 'Total number of installments (e.g., 12 for a yearly plan paid monthly). Null if indefinite.';
COMMENT ON COLUMN bills.current_installment IS 'Current installment number (e.g., 1, 2, 3...). Defaults to 1.';
