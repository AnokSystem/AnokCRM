
-- Setup Database V3 - Fix Permissions

-- 1. Reset user_roles policies completely
drop policy if exists "Users can read own roles" on public.user_roles;
drop policy if exists "Admins can read all roles" on public.user_roles;
drop policy if exists "Admins can manage roles" on public.user_roles;

alter table public.user_roles enable row level security;

-- SIMPLIFIED POLICY: Users can read their own role (Critical for Login)
create policy "Users can read own roles"
  on public.user_roles for select
  using ( auth.uid() = user_id );

-- ADMIN POLICY: Use a non-recursive definition if possible, 
-- or rely on the fact that admins can read themselves via the first policy.
-- To allow admins to read OTHERS, we need a separate check.
-- To avoid infinite recursion, strict RLS often requires a "security definer" function, 
-- but for now let's try a direct check again but ensure it's distinct.

create policy "Admins can read all roles"
  on public.user_roles for select
  using (
    -- Check if the requesting user has an admin role
    auth.uid() in (
      select user_id from public.user_roles where role = 'admin'
    )
  );

create policy "Admins can manage roles"
  on public.user_roles for all
  using (
    auth.uid() in (
      select user_id from public.user_roles where role = 'admin'
    )
  );

-- 2. Ensure Profiles are readable
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    auth.uid() in (
      select user_id from public.user_roles where role = 'admin'
    )
  );
