
-- Setup Database V5 - Standardize Admin Policies

-- 1. Plans
-- Ensure admins can manage plans without recursion
drop policy if exists "Admins can manage plans" on public.plans;
create policy "Admins can manage plans"
  on public.plans for all
  using ( public.is_admin() );

-- 2. User Plans
-- This was likely the blocker for the User List in Admin Panel
drop policy if exists "Admins can view all user plans" on public.user_plans;
drop policy if exists "Admins can manage user plans" on public.user_plans;

create policy "Admins can view all user plans"
  on public.user_plans for select
  using ( public.is_admin() );

create policy "Admins can manage user plans"
  on public.user_plans for all
  using ( public.is_admin() );

-- 3. Lead Categories (Optional but good practice)
drop policy if exists "Admins can manage all categories" on public.lead_categories;
create policy "Admins can manage all categories"
  on public.lead_categories for all
  using ( public.is_admin() );

-- 4. Leads (Optional)
drop policy if exists "Admins can manage all leads" on public.leads;
create policy "Admins can manage all leads"
  on public.leads for all
  using ( public.is_admin() );

-- 5. Flows (Optional)
drop policy if exists "Admins can manage all flows" on public.flows;
create policy "Admins can manage all flows"
  on public.flows for all
  using ( public.is_admin() );

-- 6. Campaigns (Optional)
drop policy if exists "Admins can manage all campaigns" on public.campaigns;
create policy "Admins can manage all campaigns"
  on public.campaigns for all
  using ( public.is_admin() );
