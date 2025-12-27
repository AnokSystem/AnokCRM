-- =============================================
-- ROBUST FIX: Align Leads Schema with Application
-- =============================================
-- This script handles "mixed" states where some columns might already exist.

DO $$
BEGIN

  -- 1. ADDRESS ZIP (postal_code -> address_zip)
  -- ---------------------------------------------------------
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='postal_code') THEN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='address_zip') THEN
       -- Both exist: Move data and drop old
       UPDATE leads SET address_zip = postal_code WHERE address_zip IS NULL;
       ALTER TABLE leads DROP COLUMN postal_code;
    ELSE
       -- Only old exists: Rename
       ALTER TABLE leads RENAME COLUMN postal_code TO address_zip;
    END IF;
  ELSE
    -- Old doesn't exist. Ensure new exists.
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_zip TEXT;
  END IF;

  -- 2. ADDRESS STREET (address -> address_street)
  -- ---------------------------------------------------------
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='address') THEN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='address_street') THEN
       UPDATE leads SET address_street = address WHERE address_street IS NULL;
       ALTER TABLE leads DROP COLUMN address;
    ELSE
       ALTER TABLE leads RENAME COLUMN address TO address_street;
    END IF;
  ELSE
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_street TEXT;
  END IF;

  -- 3. ADDRESS DISTRICT (neighborhood -> address_district)
  -- ---------------------------------------------------------
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='neighborhood') THEN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='address_district') THEN
       UPDATE leads SET address_district = neighborhood WHERE address_district IS NULL;
       ALTER TABLE leads DROP COLUMN neighborhood;
    ELSE
       ALTER TABLE leads RENAME COLUMN neighborhood TO address_district;
    END IF;
  ELSE
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_district TEXT;
  END IF;

  -- 4. ADDRESS CITY (city -> address_city)
  -- ---------------------------------------------------------
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='city') THEN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='address_city') THEN
       UPDATE leads SET address_city = city WHERE address_city IS NULL;
       ALTER TABLE leads DROP COLUMN city;
    ELSE
       ALTER TABLE leads RENAME COLUMN city TO address_city;
    END IF;
  ELSE
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_city TEXT;
  END IF;

  -- 5. ADDRESS STATE (state -> address_state)
  -- ---------------------------------------------------------
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='state') THEN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='address_state') THEN
       UPDATE leads SET address_state = state WHERE address_state IS NULL;
       ALTER TABLE leads DROP COLUMN state;
    ELSE
       ALTER TABLE leads RENAME COLUMN state TO address_state;
    END IF;
  ELSE
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_state TEXT;
  END IF;

  -- 6. ENSURE OTHER COLUMNS EXIST
  -- ---------------------------------------------------------
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS address_number TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS cnpj TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS birth_date DATE;

END $$;
