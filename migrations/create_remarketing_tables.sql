-- Create Remarketing Sequences Table
CREATE TABLE remarketing_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('ativo', 'inativo', 'rascunho')) DEFAULT 'rascunho',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Remarketing Steps Table
CREATE TABLE remarketing_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES remarketing_sequences(id) ON DELETE CASCADE,
    flow_id UUID REFERENCES flows(id) ON DELETE SET NULL, -- Keep step but nullify flow if flow deleted
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    step_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create Remarketing Enrollments (Leads in a sequence)
CREATE TABLE remarketing_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    sequence_id UUID REFERENCES remarketing_sequences(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    current_step_order INTEGER DEFAULT 1,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(lead_id, sequence_id) -- A lead can only be in a sequence once at a time
);

-- Indexes for performance (especially the Cron query)
CREATE INDEX idx_remarketing_enrollments_next_execution ON remarketing_enrollments(next_execution_at) WHERE status = 'active';
CREATE INDEX idx_remarketing_steps_sequence_order ON remarketing_steps(sequence_id, step_order);

-- Enable RLS
ALTER TABLE remarketing_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE remarketing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE remarketing_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own sequences" ON remarketing_sequences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage steps of their sequences" ON remarketing_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM remarketing_sequences
            WHERE id = remarketing_steps.sequence_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage enrollments of their leads" ON remarketing_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leads
            WHERE id = remarketing_enrollments.lead_id
            AND user_id = auth.uid()
        )
    );
