-- Setup Database V9 - Multi-Tenant Data Isolation

-- Add user_id columns to data tables if they don't exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.lead_categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.flows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS lead_categories_user_id_idx ON public.lead_categories(user_id);
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS flows_user_id_idx ON public.flows(user_id);

-- RLS Policies for Leads
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;

CREATE POLICY "Users can view own leads"
  ON public.leads FOR SELECT
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can create own leads"
  ON public.leads FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can delete own leads"
  ON public.leads FOR DELETE
  USING ( auth.uid() = user_id OR public.is_admin() );

-- RLS Policies for Lead Categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Users can create own categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.lead_categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.lead_categories;

CREATE POLICY "Users can view own categories"
  ON public.lead_categories FOR SELECT
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can create own categories"
  ON public.lead_categories FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own categories"
  ON public.lead_categories FOR UPDATE
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can delete own categories"
  ON public.lead_categories FOR DELETE
  USING ( auth.uid() = user_id OR public.is_admin() );

-- RLS Policies for Campaigns
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;

CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can create own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  USING ( auth.uid() = user_id OR public.is_admin() );

-- RLS Policies for Flows
DROP POLICY IF EXISTS "Users can view own flows" ON public.flows;
DROP POLICY IF EXISTS "Users can create own flows" ON public.flows;
DROP POLICY IF EXISTS "Users can update own flows" ON public.flows;
DROP POLICY IF EXISTS "Users can delete own flows" ON public.flows;

CREATE POLICY "Users can view own flows"
  ON public.flows FOR SELECT
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can create own flows"
  ON public.flows FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own flows"
  ON public.flows FOR UPDATE
  USING ( auth.uid() = user_id OR public.is_admin() );

CREATE POLICY "Users can delete own flows"
  ON public.flows FOR DELETE
  USING ( auth.uid() = user_id OR public.is_admin() );

COMMENT ON COLUMN public.leads.user_id IS 'Owner of this lead - isolates data per user';
COMMENT ON COLUMN public.campaigns.user_id IS 'Owner of this campaign - isolates data per user';
COMMENT ON COLUMN public.flows.user_id IS 'Owner of this flow - isolates data per user';
COMMENT ON COLUMN public.lead_categories.user_id IS 'Owner of this category - isolates data per user';
