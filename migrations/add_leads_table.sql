-- ==========================================
-- Lead Management System Migration
-- ==========================================
-- Creates dedicated leads table for CRM
-- Separate from chats (WhatsApp messages)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CREATE LEADS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Workspace reference (nullable, no FK constraint for standalone operation)
  workspace_id UUID,
  
  -- Lead Information
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  
  -- Kanban Position
  column_id TEXT NOT NULL DEFAULT 'leads-novos',
  
  -- Additional Data
  source TEXT, -- 'manual', 'import', 'campaign', 'whatsapp', etc
  notes TEXT,
  tags TEXT[],
  
  -- Custom Fields (JSON for flexibility)
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, phone)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_id ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_column_id ON leads(column_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own leads
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own leads
CREATE POLICY "Users can create own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own leads
CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own leads
CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 3. TRIGGER FOR UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();


-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- Table 'leads' created successfully!
-- 
-- To add a test lead manually:
-- INSERT INTO leads (user_id, name, phone, column_id)
-- VALUES (auth.uid(), 'Test Lead', '+5511999999999', 'leads-novos');
