-- Add CRM features: Tasks, Proposals, Attachments

-- 1. Lead Tasks Table
CREATE TABLE IF NOT EXISTS public.lead_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Tasks
CREATE INDEX IF NOT EXISTS lead_tasks_lead_id_idx ON public.lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS lead_tasks_user_id_idx ON public.lead_tasks(user_id);

-- RLS for Tasks
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.lead_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks" ON public.lead_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.lead_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.lead_tasks
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Lead Proposals Table
CREATE TABLE IF NOT EXISTS public.lead_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT, -- Markdown or JSON content
    status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected
    amount NUMERIC(15, 2),
    currency TEXT DEFAULT 'BRL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Proposals
CREATE INDEX IF NOT EXISTS lead_proposals_lead_id_idx ON public.lead_proposals(lead_id);
CREATE INDEX IF NOT EXISTS lead_proposals_user_id_idx ON public.lead_proposals(user_id);

-- RLS for Proposals
ALTER TABLE public.lead_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals" ON public.lead_proposals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own proposals" ON public.lead_proposals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals" ON public.lead_proposals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals" ON public.lead_proposals
    FOR DELETE USING (auth.uid() = user_id);


-- 3. Lead Attachments Table
CREATE TABLE IF NOT EXISTS public.lead_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Attachments
CREATE INDEX IF NOT EXISTS lead_attachments_lead_id_idx ON public.lead_attachments(lead_id);
CREATE INDEX IF NOT EXISTS lead_attachments_user_id_idx ON public.lead_attachments(user_id);

-- RLS for Attachments
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments" ON public.lead_attachments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attachments" ON public.lead_attachments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments" ON public.lead_attachments
    FOR DELETE USING (auth.uid() = user_id);
