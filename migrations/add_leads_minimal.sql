-- ==========================================
-- MINIMAL Leads Table Migration
-- ==========================================
-- Execute este arquivo COMPLETO de uma vez

-- Step 1: Create leads table (basic version)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  column_id TEXT NOT NULL DEFAULT 'leads-novos',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add user_id foreign key
ALTER TABLE leads 
  ADD CONSTRAINT leads_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Step 3: Add unique constraint
ALTER TABLE leads 
  ADD CONSTRAINT leads_user_phone_unique 
  UNIQUE(user_id, phone);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_column_id ON leads(column_id);

-- Step 5: Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id);

-- Done! Table created successfully.
