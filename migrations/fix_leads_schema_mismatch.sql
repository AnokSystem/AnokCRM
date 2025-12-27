-- =============================================
-- Fix Leads Schema Mismatch
-- =============================================
-- Renames columns to match the application code (Frontend/Services)
-- Adds missing CPF/CNPJ separate columns

-- 1. Rename Address Columns
ALTER TABLE leads RENAME COLUMN postal_code TO address_zip;
ALTER TABLE leads RENAME COLUMN address TO address_street;
ALTER TABLE leads RENAME COLUMN neighborhood TO address_district;
ALTER TABLE leads RENAME COLUMN city TO address_city;
ALTER TABLE leads RENAME COLUMN state TO address_state;

-- 2. Add CPF and CNPJ columns (separating from cpf_cnpj)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Optional: Migrate existing data if any (assuming cpf_cnpj exists)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'cpf_cnpj') THEN
    UPDATE leads 
    SET 
      cpf = CASE WHEN length(cpf_cnpj) <= 14 THEN cpf_cnpj ELSE NULL END,
      cnpj = CASE WHEN length(cpf_cnpj) > 14 THEN cpf_cnpj ELSE NULL END
    WHERE cpf IS NULL AND cnpj IS NULL;
  END IF;
END $$;
