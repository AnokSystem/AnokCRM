-- ==========================================
-- Update Leads Schema V2 - Enhanced Registration
-- ==========================================

-- Add Person Type (PF/PJ)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'PF'; -- 'PF' or 'PJ'

-- Add Identification
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lastname TEXT;

-- Add Date of Birth (Age will be calculated on frontend)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Add Detailed Address
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state TEXT;

-- Index for CPF/CNPJ search
CREATE INDEX IF NOT EXISTS idx_leads_cpf_cnpj ON leads(cpf_cnpj);

-- Add comment explaining new columns
COMMENT ON COLUMN leads.person_type IS 'Type of entity: PF (Pessoa Física) or PJ (Pessoa Jurídica)';
