
-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- HELPER: Drop policy if exists
do $$
begin
    -- Profiles
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can view own profile') then
        drop policy "Users can view own profile" on public.profiles;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile') then
        drop policy "Users can update own profile" on public.profiles;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admins can view all profiles') then
        drop policy "Admins can view all profiles" on public.profiles;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admins can delete profiles') then
        drop policy "Admins can delete profiles" on public.profiles;
    end if;

    -- User Roles
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Users can read own roles') then
        drop policy "Users can read own roles" on public.user_roles;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Admins can read all roles') then
        drop policy "Admins can read all roles" on public.user_roles;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Admins can manage roles') then
        drop policy "Admins can manage roles" on public.user_roles;
    end if;
end $$;

-- ==========================================
-- 1. CORE AUTH TABLES
-- ==========================================

-- PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using ( auth.uid() = id );
create policy "Users can update own profile" on public.profiles for update using ( auth.uid() = id );
create policy "Admins can view all profiles" on public.profiles for select using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );
create policy "Admins can delete profiles" on public.profiles for delete using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );


-- USER ROLES
create table if not exists public.user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create policy "Users can read own roles" on public.user_roles for select using ( auth.uid() = user_id );
create policy "Admins can read all roles" on public.user_roles for select using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );
create policy "Admins can manage roles" on public.user_roles for all using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );


-- PLANS
create table if not exists public.plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  features text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.plans enable row level security;

-- Drop existing plan policies if necessary (simplified block for brevity, usually distinct names help)
drop policy if exists "Everyone can view plans" on public.plans;
drop policy if exists "Admins can manage plans" on public.plans;

create policy "Everyone can view plans" on public.plans for select using ( true );
create policy "Admins can manage plans" on public.plans for all using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );


-- USER PLANS
create table if not exists public.user_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plan_id uuid references public.plans on delete set null,
  active_features text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.user_plans enable row level security;

drop policy if exists "Users can view own plan" on public.user_plans;
drop policy if exists "Admins can view all user plans" on public.user_plans;
drop policy if exists "Admins can manage user plans" on public.user_plans;

create policy "Users can view own plan" on public.user_plans for select using ( auth.uid() = user_id );
create policy "Admins can view all user plans" on public.user_plans for select using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );
create policy "Admins can manage user plans" on public.user_plans for all using ( exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') );

-- ==========================================
-- 2. BUSINESS LOGIC TABLES (NEW)
-- ==========================================

-- LEAD CATEGORIES
create table if not exists public.lead_categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null, -- Owner
  name text not null,
  description text,
  color text default '#000000',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.lead_categories enable row level security;

drop policy if exists "Users can manage own categories" on public.lead_categories;
create policy "Users can manage own categories" on public.lead_categories for all using ( auth.uid() = user_id );


-- LEADS
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null, -- Owner
  category_id uuid references public.lead_categories on delete set null,
  name text not null,
  email text,
  phone text,
  status text default 'new',
  custom_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.leads enable row level security;

drop policy if exists "Users can manage own leads" on public.leads;
create policy "Users can manage own leads" on public.leads for all using ( auth.uid() = user_id );


-- FLOWS (Sequences/Automations)
create table if not exists public.flows (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.flows enable row level security;

drop policy if exists "Users can manage own flows" on public.flows;
create policy "Users can manage own flows" on public.flows for all using ( auth.uid() = user_id );


-- CAMPAIGNS
create table if not exists public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  flow_id uuid references public.flows on delete set null,
  name text not null,
  description text,
  status text check (status in ('draft', 'scheduled', 'running', 'completed', 'paused')) default 'draft',
  scheduled_at timestamp with time zone,
  stats jsonb default '{"sent": 0, "delivered": 0, "read": 0}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.campaigns enable row level security;

drop policy if exists "Users can manage own campaigns" on public.campaigns;
create policy "Users can manage own campaigns" on public.campaigns for all using ( auth.uid() = user_id );


-- ==========================================
-- 3. TRIGGERS
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Assign default 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger safety
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
