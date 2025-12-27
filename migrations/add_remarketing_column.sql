-- Add remarketing_id to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS remarketing_id UUID REFERENCES remarketing_sequences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_remarketing ON leads(remarketing_id);
