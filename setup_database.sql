
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Policy: Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can delete profiles
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


-- USER ROLES
create table if not exists public.user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

-- Policy: Everyone can read their own roles
create policy "Users can read own roles"
  on public.user_roles for select
  using ( auth.uid() = user_id );

-- Policy: Admins can read all roles
create policy "Admins can read all roles"
  on public.user_roles for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can assign roles (insert/update/delete)
create policy "Admins can manage roles"
  on public.user_roles for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


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

-- Policy: Everyone can view plans
create policy "Everyone can view plans"
  on public.plans for select
  using ( true );

-- Policy: Admins can manage plans
create policy "Admins can manage plans"
  on public.plans for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


-- USER PLANS (Subscriptions)
create table if not exists public.user_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plan_id uuid references public.plans on delete set null,
  active_features text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_plans enable row level security;

-- Policy: Users can view their own plan
create policy "Users can view own plan"
  on public.user_plans for select
  using ( auth.uid() = user_id );

-- Policy: Admins can view all user plans
create policy "Admins can view all user plans"
  on public.user_plans for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can manage user plans
create policy "Admins can manage user plans"
  on public.user_plans for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- TRIGGER: Create Profile on Signup
-- Ensure the function exists
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Optional: Assign default 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger if it doesn't exist
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
