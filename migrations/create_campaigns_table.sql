-- ==========================================
-- Campaigns Migration
-- ==========================================

-- FORCE RESET to ensure schema matches perfectly
DROP TABLE IF EXISTS campaigns CASCADE;

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Campaign Details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  flow_id UUID NOT NULL, -- Reference to specific flow (JSONB store, so no FK constraint enforced strictly, but good practice)
  category_id TEXT NOT NULL, -- Reference to Kanban column_id
  
  -- Scheduling
  status TEXT NOT NULL DEFAULT 'rascunho', -- agendada, em_andamento, concluida, pausada, rascunho
  scheduled_at TIMESTAMPTZ,
  
  -- Stats (JSONB for flexibility)
  stats JSONB DEFAULT '{"total": 0, "sent": 0, "delivered": 0, "read": 0}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own campaigns" ON campaigns;
CREATE POLICY "Users can create own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS campaigns_updated_at_trigger ON campaigns;
CREATE TRIGGER campaigns_updated_at_trigger
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at(); -- Reusing existing function
